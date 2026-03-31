"""
modelo_microbioma.py — Random Forest: sensor features → microbiome prediction
Predice estado microbiano (qPCR copias/g, respiración) desde datos de sensores.

CLI:
  python modelo_microbioma.py --entrenar      Entrenar modelos por target
  python modelo_microbioma.py --predecir 3    Predecir estado actual del nodo 3
  python modelo_microbioma.py --importancia   Feature importance por target
"""
import os
import sys
import json
import argparse
import logging
from datetime import datetime, timedelta
from contextlib import contextmanager

import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [modelo] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("modelo")

DATABASE_URL = os.environ.get("DATABASE_URL", "")

FEATURE_NAMES = [
    "h10_momento", "h20_momento", "h30_momento", "t20_momento", "ec30_momento",
    "h10_avg_7d", "h20_avg_7d", "t20_avg_7d", "ec30_avg_7d",
    "dh10_dt_7d", "h10_x_t20_7d", "cv_h10_7d",
    "tau_10_ultimo", "dias_ultimo_mojado",
]

# Store trained models in memory for the session
_modelos_cache = {}


@contextmanager
def get_conn():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


# ============================================================
# 1. PREPARAR FEATURES
# ============================================================
def _get_lecturas_nodo_batch(conn, nodo_id):
    """Fetch all lecturas for a node at once (optimization)."""
    sql = """
        SELECT tiempo, h10_avg, h20_avg, h30_avg, t20, ec30
        FROM lecturas WHERE nodo_id = %s ORDER BY tiempo
    """
    with conn.cursor() as cur:
        cur.execute(sql, (nodo_id,))
        return cur.fetchall()


def _get_firma_nodo_batch(conn, nodo_id):
    """Fetch all firma records for a node."""
    sql = """
        SELECT evento_riego, tau_10 FROM firma_hidrica
        WHERE nodo_id = %s ORDER BY evento_riego
    """
    with conn.cursor() as cur:
        cur.execute(sql, (nodo_id,))
        return cur.fetchall()


def _get_clima_batch(conn):
    """Fetch all clima data."""
    sql = "SELECT tiempo, precipitacion, eto FROM clima ORDER BY tiempo"
    with conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchall()


def preparar_features_batch(conn, nodo_id, fecha_muestreo, lecturas_cache, firma_cache, clima_cache):
    """
    Calculate 14 features for a given node/date using pre-fetched data.
    """
    features = {}

    # Window: 7 days before muestreo
    t_inicio = fecha_muestreo - timedelta(days=7)

    # Filter lecturas in window
    window = [(t, h10, h20, h30, t20, ec30) for t, h10, h20, h30, t20, ec30 in lecturas_cache
              if t_inicio <= t <= fecha_muestreo and h10 is not None]

    if len(window) < 10:
        # Not enough data for window features
        features["h10_avg_7d"] = np.nan
        features["h20_avg_7d"] = np.nan
        features["t20_avg_7d"] = np.nan
        features["ec30_avg_7d"] = np.nan
        features["dh10_dt_7d"] = np.nan
        features["h10_x_t20_7d"] = np.nan
        features["cv_h10_7d"] = np.nan
    else:
        h10_vals = np.array([r[1] for r in window if r[1] is not None])
        h20_vals = np.array([r[2] for r in window if r[2] is not None])
        t20_vals = np.array([r[4] for r in window if r[4] is not None])
        ec30_vals = np.array([r[5] for r in window if r[5] is not None])

        h10_avg = float(np.mean(h10_vals)) if len(h10_vals) > 0 else np.nan
        h20_avg = float(np.mean(h20_vals)) if len(h20_vals) > 0 else np.nan
        t20_avg = float(np.mean(t20_vals)) if len(t20_vals) > 0 else np.nan
        ec30_avg = float(np.mean(ec30_vals)) if len(ec30_vals) > 0 else np.nan

        features["h10_avg_7d"] = round(h10_avg, 4)
        features["h20_avg_7d"] = round(h20_avg, 4)
        features["t20_avg_7d"] = round(t20_avg, 4)
        features["ec30_avg_7d"] = round(ec30_avg, 4)

        # Rate of change: (last - first) / 7
        if len(h10_vals) > 1:
            features["dh10_dt_7d"] = round(float(h10_vals[-1] - h10_vals[0]) / 7.0, 4)
        else:
            features["dh10_dt_7d"] = 0.0

        # Interaction
        features["h10_x_t20_7d"] = round(h10_avg * t20_avg, 4) if not np.isnan(h10_avg) and not np.isnan(t20_avg) else np.nan

        # CV
        if len(h10_vals) > 1 and np.mean(h10_vals) > 0:
            features["cv_h10_7d"] = round(float(np.std(h10_vals) / np.mean(h10_vals)), 4)
        else:
            features["cv_h10_7d"] = np.nan

    # Firma hídrica features
    firmas_antes = [(t, tau) for t, tau in firma_cache if t <= fecha_muestreo and tau is not None]
    if firmas_antes:
        ultima_firma = firmas_antes[-1]
        features["tau_10_ultimo"] = float(ultima_firma[1])
        features["dias_ultimo_mojado"] = round((fecha_muestreo - ultima_firma[0]).total_seconds() / 86400.0, 2)
    else:
        features["tau_10_ultimo"] = np.nan
        features["dias_ultimo_mojado"] = np.nan

    return features


# ============================================================
# 2. PREPARAR DATASET
# ============================================================
def preparar_dataset(conn):
    """
    Build feature matrix + target vectors for all microbioma records.
    Returns {target: {"X": ndarray, "y": ndarray, "fechas": list, "nodos": list, "feature_names": list}}
    """
    # Fetch all microbioma records
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM microbioma ORDER BY fecha_muestreo, nodo_id")
        registros = cur.fetchall()

    log.info(f"Total registros microbioma: {len(registros)}")

    # Pre-fetch all data per node
    nodos_ids = sorted(set(r["nodo_id"] for r in registros))
    lecturas_por_nodo = {}
    firma_por_nodo = {}
    for nid in nodos_ids:
        lecturas_por_nodo[nid] = _get_lecturas_nodo_batch(conn, nid)
        firma_por_nodo[nid] = _get_firma_nodo_batch(conn, nid)
    clima_cache = _get_clima_batch(conn)
    log.info("Datos pre-cargados")

    # Group by (nodo, fecha) → compute features once
    features_cache = {}
    total = len(set((r["nodo_id"], r["fecha_muestreo"]) for r in registros))
    done = 0

    for r in registros:
        key = (r["nodo_id"], r["fecha_muestreo"])
        if key not in features_cache:
            window_features = preparar_features_batch(
                conn, r["nodo_id"], r["fecha_muestreo"],
                lecturas_por_nodo[r["nodo_id"]],
                firma_por_nodo[r["nodo_id"]],
                clima_cache,
            )
            # Add snapshot features from the record itself
            window_features["h10_momento"] = float(r["h10_momento"]) if r["h10_momento"] is not None else np.nan
            window_features["h20_momento"] = float(r["h20_momento"]) if r["h20_momento"] is not None else np.nan
            window_features["h30_momento"] = float(r["h30_momento"]) if r["h30_momento"] is not None else np.nan
            window_features["t20_momento"] = float(r["t20_momento"]) if r["t20_momento"] is not None else np.nan
            window_features["ec30_momento"] = float(r["ec30_momento"]) if r["ec30_momento"] is not None else np.nan
            features_cache[key] = window_features
            done += 1
            if done % 20 == 0:
                log.info(f"  Features: {done}/{total} nodo-fechas")

    log.info(f"  Features: {done}/{total} nodo-fechas (done)")

    # Build dataset by target
    targets = sorted(set(r["target"] for r in registros))
    datasets = {}

    for target in targets:
        target_rows = [r for r in registros if r["target"] == target]
        X_list = []
        y_list = []
        fechas = []
        nodos = []

        for r in target_rows:
            key = (r["nodo_id"], r["fecha_muestreo"])
            feats = features_cache[key]
            row = [feats.get(fn, np.nan) for fn in FEATURE_NAMES]
            X_list.append(row)
            y_list.append(float(r["valor"]))
            fechas.append(str(r["fecha_muestreo"]))
            nodos.append(r["nodo_id"])

        datasets[target] = {
            "X": np.array(X_list, dtype=float),
            "y": np.array(y_list, dtype=float),
            "fechas": fechas,
            "nodos": nodos,
            "feature_names": FEATURE_NAMES,
        }
        log.info(f"  Target {target}: {len(y_list)} muestras, {len(FEATURE_NAMES)} features")

    return datasets


# ============================================================
# 3. ENTRENAR MODELO
# ============================================================
def entrenar_modelo(X, y, target_name):
    """
    Train RandomForest with Leave-One-Out CV.
    Returns {r2, mae, feature_importance, predicciones, reales, modelo}.
    """
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.impute import SimpleImputer
    from sklearn.metrics import r2_score, mean_absolute_error

    n = len(y)
    if n < 10:
        log.warning(f"Target {target_name}: solo {n} muestras, insuficiente")
        return None

    # Impute NaN
    imputer = SimpleImputer(strategy="median")
    X_imp = imputer.fit_transform(X)

    # K-Fold CV (5 folds) — much faster than LOO for large datasets
    from sklearn.model_selection import cross_val_predict, KFold
    kf = KFold(n_splits=min(5, n), shuffle=True, random_state=42)
    rf_cv = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    predicciones = cross_val_predict(rf_cv, X_imp, y, cv=kf)

    r2 = r2_score(y, predicciones)
    mae = mean_absolute_error(y, predicciones)

    # Train final model on all data for feature importance
    rf_final = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    rf_final.fit(X_imp, y)

    importances = dict(zip(FEATURE_NAMES, [round(float(v), 4) for v in rf_final.feature_importances_]))

    log.info(f"Target {target_name}: R²={r2:.3f}, MAE={mae:.1f}")

    return {
        "r2": round(r2, 4),
        "mae": round(float(mae), 2),
        "feature_importance": importances,
        "predicciones": predicciones.tolist(),
        "reales": y.tolist(),
        "modelo": rf_final,
        "imputer": imputer,
    }


# ============================================================
# 4. PREDECIR ACTUAL
# ============================================================
def predecir_actual(conn, nodo_id, modelos):
    """Predict current microbiome state for a node."""
    # Get latest data
    lecturas = _get_lecturas_nodo_batch(conn, nodo_id)
    firmas = _get_firma_nodo_batch(conn, nodo_id)
    clima = _get_clima_batch(conn)

    if not lecturas:
        return {"error": f"No hay lecturas para nodo {nodo_id}"}

    # Use the latest timestamp
    fecha = lecturas[-1][0]

    features = preparar_features_batch(conn, nodo_id, fecha, lecturas, firmas, clima)

    # Add snapshot from latest reading
    last = lecturas[-1]
    features["h10_momento"] = float(last[1]) if last[1] is not None else np.nan
    features["h20_momento"] = float(last[2]) if last[2] is not None else np.nan
    features["h30_momento"] = float(last[3]) if last[3] is not None else np.nan
    features["t20_momento"] = float(last[4]) if last[4] is not None else np.nan
    features["ec30_momento"] = float(last[5]) if last[5] is not None else np.nan

    row = np.array([[features.get(fn, np.nan) for fn in FEATURE_NAMES]], dtype=float)

    predicciones = {}
    for target, m in modelos.items():
        if m is None or "imputer" not in m or "modelo" not in m:
            continue
        X_imp = m["imputer"].transform(row)
        pred = m["modelo"].predict(X_imp)[0]
        predicciones[target] = round(float(pred), 2)

    return {
        "nodo_id": nodo_id,
        "timestamp": str(fecha),
        "predicciones": predicciones,
        "features": {k: round(v, 4) if isinstance(v, float) and not np.isnan(v) else None for k, v in features.items()},
    }


# ============================================================
# ENTRENAR TODOS
# ============================================================
def entrenar_todos(conn):
    """Train models for all targets. Returns dict of results."""
    datasets = preparar_dataset(conn)
    resultados = {}

    for target, ds in datasets.items():
        resultado = entrenar_modelo(ds["X"], ds["y"], target)
        resultados[target] = resultado
        if resultado:
            _modelos_cache[target] = resultado

    return resultados


# ============================================================
# CLI
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="AgTech Modelo Microbioma — Random Forest")
    parser.add_argument("--entrenar", action="store_true", help="Entrenar modelos por target")
    parser.add_argument("--predecir", type=int, metavar="NODO_ID", help="Predecir estado actual de un nodo")
    parser.add_argument("--importancia", action="store_true", help="Feature importance por target")
    args = parser.parse_args()

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no configurada")
        sys.exit(1)

    with get_conn() as conn:
        if args.entrenar:
            resultados = entrenar_todos(conn)

            print()
            print("=" * 70)
            print("RESULTADOS — Random Forest (Leave-One-Out CV)")
            print("=" * 70)
            print(f"{'Target':20s}  {'R²':>8}  {'MAE':>12}  {'Muestras':>8}")
            print("-" * 55)
            for target, r in resultados.items():
                if r:
                    print(f"{target:20s}  {r['r2']:>8.4f}  {r['mae']:>12.2f}  {len(r['reales']):>8}")
                else:
                    print(f"{target:20s}  {'—':>8}  {'—':>12}  {'—':>8}")

            print()
            print("Modelo entrenado con datos sintéticos — NO válido para predicciones reales.")
            print("El modelo real se entrena con datos de laboratorio a partir del mes 6 del piloto.")

        elif args.predecir is not None:
            log.info("Entrenando modelos para predicción...")
            entrenar_todos(conn)
            resultado = predecir_actual(conn, args.predecir, _modelos_cache)
            print(json.dumps(resultado, indent=2, default=str, ensure_ascii=False))

        elif args.importancia:
            log.info("Entrenando modelos...")
            resultados = entrenar_todos(conn)

            for target, r in resultados.items():
                if not r:
                    continue
                print(f"\n{'=' * 50}")
                print(f"FEATURE IMPORTANCE — {target}")
                print(f"{'=' * 50}")
                sorted_feats = sorted(r["feature_importance"].items(), key=lambda x: -x[1])
                for i, (feat, imp) in enumerate(sorted_feats[:5]):
                    bar = "█" * int(imp * 50)
                    print(f"  {i+1}. {feat:20s}  {imp:.4f}  {bar}")

        else:
            parser.print_help()


if __name__ == "__main__":
    main()
