"""
firma_hidrica.py — Cálculo de firma hídrica por evento de riego
Detecta eventos de mojado en datos de sensores, calcula velocidad de
infiltración, constante de secado (τ), y breaking point dinámico.

CLI:
  python firma_hidrica.py --nodo 1       Procesa todas las firmas del nodo 1
  python firma_hidrica.py --todos        Procesa todos los nodos
  python firma_hidrica.py --ultimo 3     Muestra última firma del nodo 3
  python firma_hidrica.py --detectar 1   Solo detecta eventos (debug)
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

try:
    from scipy.optimize import curve_fit
except ImportError:
    curve_fit = None
    print("WARNING: scipy no instalado. curve_fit no disponible, tau será NULL.")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [firma] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("firma")

DATABASE_URL = os.environ.get("DATABASE_URL", "")


def _py(val):
    """Convert numpy types to Python native for psycopg2."""
    if val is None:
        return None
    if isinstance(val, (np.floating, np.float64, np.float32)):
        return float(val)
    if isinstance(val, (np.integer, np.int64, np.int32)):
        return int(val)
    return val

# ============================================================
# DB
# ============================================================
@contextmanager
def get_conn():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


# ============================================================
# 1. DETECTAR EVENTOS DE MOJADO
# ============================================================
def detectar_eventos_mojado(conn, nodo_id, dias=180, umbral_delta=3.0):
    """
    Busca incrementos súbitos de h10 entre lecturas consecutivas (5 min).
    Filtra eventos separados por al menos 6 horas.
    """
    sql = """
        SELECT tiempo, h10_avg, h20_avg, h30_avg
        FROM lecturas
        WHERE nodo_id = %s
          AND tiempo >= (SELECT MAX(tiempo) FROM lecturas) - interval '%s days'
        ORDER BY tiempo
    """
    with conn.cursor() as cur:
        cur.execute(sql, (nodo_id, dias))
        rows = cur.fetchall()

    if len(rows) < 2:
        return []

    eventos = []
    ultimo_evento = None

    for i in range(1, len(rows)):
        t_prev, h10_prev, h20_prev, h30_prev = rows[i - 1]
        t_curr, h10_curr, h20_curr, h30_curr = rows[i]

        if h10_prev is None or h10_curr is None:
            continue

        delta = h10_curr - h10_prev

        if delta >= umbral_delta:
            # Filtrar: al menos 6 horas desde último evento
            if ultimo_evento and (t_curr - ultimo_evento).total_seconds() < 6 * 3600:
                continue

            eventos.append({
                "tiempo": t_curr,
                "h10_pre": round(h10_prev, 2),
                "h10_post": round(h10_curr, 2),
                "delta": round(delta, 2),
            })
            ultimo_evento = t_curr

    return eventos


# ============================================================
# 2. CALCULAR FIRMA HÍDRICA
# ============================================================
def _modelo_secado(t, h_residual, amplitud, tau):
    """h(t) = h_residual + amplitud * exp(-t / tau)"""
    return h_residual + amplitud * np.exp(-t / tau)


def calcular_firma(conn, nodo_id, evento_timestamp):
    """
    Calcula firma hídrica para un evento de riego específico.
    Ventana: evento -30min hasta +48h (o siguiente evento).
    """
    t_inicio = evento_timestamp - timedelta(minutes=30)
    t_fin = evento_timestamp + timedelta(hours=48)

    sql = """
        SELECT tiempo, h10_avg, h20_avg, h30_avg
        FROM lecturas
        WHERE nodo_id = %s AND tiempo >= %s AND tiempo <= %s
        ORDER BY tiempo
    """
    with conn.cursor() as cur:
        cur.execute(sql, (nodo_id, t_inicio, t_fin))
        rows = cur.fetchall()

    if len(rows) < 20:
        log.warning(f"Nodo {nodo_id} evento {evento_timestamp}: solo {len(rows)} lecturas, insuficiente")
        return None

    tiempos = [r[0] for r in rows]
    h10 = np.array([r[1] if r[1] is not None else np.nan for r in rows])
    h20 = np.array([r[2] if r[2] is not None else np.nan for r in rows])
    h30 = np.array([r[3] if r[3] is not None else np.nan for r in rows])

    # Índice del evento (lectura más cercana al timestamp)
    idx_evento = 0
    for i, t in enumerate(tiempos):
        if t >= evento_timestamp:
            idx_evento = i
            break

    # Valores pre-evento
    h10_pre = h10[max(0, idx_evento - 1)]
    h20_pre = h20[max(0, idx_evento - 1)]
    h30_pre = h30[max(0, idx_evento - 1)]

    # ---- VELOCIDAD DE INFILTRACIÓN ----
    umbral_arribo = 2.0  # % VWC de incremento para considerar "arribo"

    def detectar_arribo(h_series, h_pre, desde_idx):
        for i in range(desde_idx, len(h_series)):
            if not np.isnan(h_series[i]) and not np.isnan(h_pre):
                if h_series[i] - h_pre > umbral_arribo:
                    return i
        return None

    idx_arribo_10 = detectar_arribo(h10, h10_pre, idx_evento)
    idx_arribo_20 = detectar_arribo(h20, h20_pre, idx_evento)
    idx_arribo_30 = detectar_arribo(h30, h30_pre, idx_evento)

    vel_10_20 = None
    vel_20_30 = None

    if idx_arribo_10 is not None and idx_arribo_20 is not None:
        dt_min = (tiempos[idx_arribo_20] - tiempos[idx_arribo_10]).total_seconds() / 60.0
        dt_min = max(dt_min, 5.0)  # mínimo 5 min (resolución de datos)
        vel_10_20 = round(0.10 / dt_min, 6)  # m/min

    if idx_arribo_20 is not None and idx_arribo_30 is not None:
        dt_min = (tiempos[idx_arribo_30] - tiempos[idx_arribo_20]).total_seconds() / 60.0
        dt_min = max(dt_min, 5.0)
        vel_20_30 = round(0.10 / dt_min, 6)

    # ---- PICOS ----
    # Buscar pico en ventana post-evento (primeras 6 horas)
    idx_fin_pico = min(len(h10), idx_evento + 72)  # 72 lecturas = 6 horas
    h10_pico = float(np.nanmax(h10[idx_evento:idx_fin_pico])) if idx_evento < len(h10) else None
    h30_pico = float(np.nanmax(h30[idx_evento:idx_fin_pico])) if idx_evento < len(h30) else None

    # delta_h_max = max(h10 - h30) durante evento
    h_diff = h10[idx_evento:idx_fin_pico] - h30[idx_evento:idx_fin_pico]
    h_diff_clean = h_diff[~np.isnan(h_diff)]
    delta_h_max = float(np.max(h_diff_clean)) if len(h_diff_clean) > 0 else None

    # ---- CURVA DE SECADO (tau) ----
    def calcular_tau(h_series, tiempos_list, idx_evento):
        if curve_fit is None:
            return None

        # Encontrar índice del pico
        idx_fin_busqueda = min(len(h_series), idx_evento + 72)
        segmento_pico = h_series[idx_evento:idx_fin_busqueda]
        if len(segmento_pico) == 0 or np.all(np.isnan(segmento_pico)):
            return None

        idx_pico_rel = np.nanargmax(segmento_pico)
        idx_pico = idx_evento + idx_pico_rel

        # Datos de secado: desde pico hasta fin de ventana
        h_secado = h_series[idx_pico:]
        t_secado_dt = [tiempos_list[j] for j in range(idx_pico, len(tiempos_list))]

        if len(h_secado) < 10:
            return None

        # Filtrar NaN
        mask = ~np.isnan(h_secado)
        h_clean = h_secado[mask]
        t_clean = np.array([(t_secado_dt[j] - t_secado_dt[0]).total_seconds() / 3600.0
                            for j in range(len(t_secado_dt))])[mask]

        if len(h_clean) < 10:
            return None

        h_residual_est = float(np.min(h_clean[-20:])) if len(h_clean) > 20 else float(np.min(h_clean))
        amplitud_est = float(h_clean[0]) - h_residual_est
        if amplitud_est < 1.0:
            return None  # no hay secado significativo

        try:
            popt, _ = curve_fit(
                _modelo_secado, t_clean, h_clean,
                p0=[h_residual_est, amplitud_est, 12.0],
                bounds=([0, 0, 0.5], [60, 50, 200]),
                maxfev=5000,
            )
            tau = round(popt[2], 2)
            if tau < 0.5 or tau > 200:
                return None
            return tau
        except Exception:
            return None

    tau_10 = calcular_tau(h10, tiempos, idx_evento)
    tau_20 = calcular_tau(h20, tiempos, idx_evento)
    tau_30 = calcular_tau(h30, tiempos, idx_evento)

    # ---- BREAKING POINT ----
    breaking_point_10 = None
    tiempo_drenaje_10 = None

    if h10_pico is not None:
        idx_fin_busqueda = min(len(h10), idx_evento + 72)
        idx_pico = idx_evento + np.nanargmax(h10[idx_evento:idx_fin_busqueda])

        h_post = h10[idx_pico:]
        if len(h_post) > 10:
            # Segunda derivada numérica
            d2h = np.diff(h_post, n=2)
            d2h_clean = d2h[~np.isnan(d2h)]

            if len(d2h_clean) > 5:
                # Buscar cambio de signo (negativo → positivo = breaking point)
                for j in range(1, len(d2h_clean)):
                    if d2h_clean[j - 1] < 0 and d2h_clean[j] >= 0:
                        # El breaking point es el VWC en ese índice
                        bp_idx = idx_pico + j + 2  # +2 por el doble diff
                        if bp_idx < len(h10) and not np.isnan(h10[bp_idx]):
                            breaking_point_10 = round(float(h10[bp_idx]), 2)
                            # Tiempo desde pico hasta breaking point
                            dt = (tiempos[bp_idx] - tiempos[idx_pico]).total_seconds() / 3600.0
                            tiempo_drenaje_10 = round(dt, 2)
                        break

    # ---- INSERT ----
    firma = {
        "nodo_id": nodo_id,
        "evento_riego": evento_timestamp,
        "vel_10_20": _py(vel_10_20),
        "vel_20_30": _py(vel_20_30),
        "tau_10": _py(tau_10),
        "tau_20": _py(tau_20),
        "tau_30": _py(tau_30),
        "h10_pico": _py(round(h10_pico, 2)) if h10_pico is not None else None,
        "h30_pico": _py(round(h30_pico, 2)) if h30_pico is not None else None,
        "breaking_point_10": _py(breaking_point_10),
        "tiempo_drenaje_10": _py(tiempo_drenaje_10),
        "delta_h_max": _py(round(delta_h_max, 2)) if delta_h_max is not None else None,
    }

    sql = """
        INSERT INTO firma_hidrica
            (nodo_id, evento_riego, vel_10_20, vel_20_30, tau_10, tau_20, tau_30,
             h10_pico, h30_pico, breaking_point_10, tiempo_drenaje_10, delta_h_max)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    with conn.cursor() as cur:
        cur.execute(sql, (
            firma["nodo_id"], firma["evento_riego"],
            firma["vel_10_20"], firma["vel_20_30"],
            firma["tau_10"], firma["tau_20"], firma["tau_30"],
            firma["h10_pico"], firma["h30_pico"],
            firma["breaking_point_10"], firma["tiempo_drenaje_10"],
            firma["delta_h_max"],
        ))
    conn.commit()

    return firma


# ============================================================
# 3. PROCESAR TODAS LAS FIRMAS
# ============================================================
def procesar_todas_firmas(conn, nodo_id=None):
    """Detecta eventos y calcula firmas para uno o todos los nodos."""
    # Limpiar tabla antes de insertar (idempotente)
    with conn.cursor() as cur:
        if nodo_id:
            cur.execute("DELETE FROM firma_hidrica WHERE nodo_id = %s", (nodo_id,))
            log.info(f"Limpiado firmas existentes del nodo {nodo_id}")
        else:
            cur.execute("TRUNCATE TABLE firma_hidrica")
            log.info("Limpiada tabla firma_hidrica completa")
    conn.commit()

    # Obtener nodos a procesar
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        if nodo_id:
            cur.execute("SELECT nodo_id, nombre FROM nodos WHERE nodo_id = %s", (nodo_id,))
        else:
            cur.execute("SELECT nodo_id, nombre FROM nodos ORDER BY nodo_id")
        nodos = cur.fetchall()

    total_firmas = 0
    for nodo in nodos:
        nid = nodo["nodo_id"]
        nombre = nodo["nombre"]

        eventos = detectar_eventos_mojado(conn, nid)
        log.info(f"Nodo {nid} ({nombre}): {len(eventos)} eventos detectados, procesando...")

        firmas_ok = 0
        firmas_fail = 0
        for evento in eventos:
            try:
                firma = calcular_firma(conn, nid, evento["tiempo"])
                if firma:
                    firmas_ok += 1
                else:
                    firmas_fail += 1
            except Exception as e:
                log.warning(f"  Evento {evento['tiempo']}: error — {e}")
                conn.rollback()
                firmas_fail += 1

        log.info(f"Nodo {nid}: {firmas_ok} firmas calculadas de {len(eventos)} eventos"
                 + (f" ({firmas_fail} fallidos)" if firmas_fail else ""))
        total_firmas += firmas_ok

    log.info(f"Total: {total_firmas} firmas calculadas")
    return total_firmas


# ============================================================
# UTILIDADES CLI
# ============================================================
def imprimir_ultima_firma(conn, nodo_id):
    """Imprime la última firma calculada del nodo."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM firma_hidrica
            WHERE nodo_id = %s
            ORDER BY evento_riego DESC LIMIT 1
        """, (nodo_id,))
        firma = cur.fetchone()

    if not firma:
        print(f"No hay firmas para nodo {nodo_id}")
        return

    print(f"\n{'=' * 60}")
    print(f"ÚLTIMA FIRMA HÍDRICA — Nodo {nodo_id}")
    print(f"{'=' * 60}")
    print(f"  Evento de riego: {firma['evento_riego']}")
    print(f"  Vel. infiltración 10→20cm: {firma['vel_10_20']} m/min" if firma['vel_10_20'] else "  Vel. infiltración 10→20cm: —")
    print(f"  Vel. infiltración 20→30cm: {firma['vel_20_30']} m/min" if firma['vel_20_30'] else "  Vel. infiltración 20→30cm: —")
    print(f"  τ secado 10cm: {firma['tau_10']} h" if firma['tau_10'] else "  τ secado 10cm: —")
    print(f"  τ secado 20cm: {firma['tau_20']} h" if firma['tau_20'] else "  τ secado 20cm: —")
    print(f"  τ secado 30cm: {firma['tau_30']} h" if firma['tau_30'] else "  τ secado 30cm: —")
    print(f"  h10 pico: {firma['h10_pico']}% VWC" if firma['h10_pico'] else "  h10 pico: —")
    print(f"  h30 pico: {firma['h30_pico']}% VWC" if firma['h30_pico'] else "  h30 pico: —")
    print(f"  Breaking point 10cm: {firma['breaking_point_10']}% VWC" if firma['breaking_point_10'] else "  Breaking point 10cm: —")
    print(f"  Tiempo drenaje 10cm: {firma['tiempo_drenaje_10']} h" if firma['tiempo_drenaje_10'] else "  Tiempo drenaje 10cm: —")
    print(f"  Δh max (h10-h30): {firma['delta_h_max']}%" if firma['delta_h_max'] else "  Δh max: —")


def imprimir_eventos(conn, nodo_id):
    """Imprime eventos detectados sin calcular firmas."""
    eventos = detectar_eventos_mojado(conn, nodo_id)
    print(f"\nEventos de mojado detectados — Nodo {nodo_id}: {len(eventos)}")
    print(f"{'Tiempo':30s}  {'h10 pre':>8}  {'h10 post':>9}  {'Δ':>6}")
    print("-" * 60)
    for e in eventos:
        print(f"{str(e['tiempo']):30s}  {e['h10_pre']:>8.2f}  {e['h10_post']:>9.2f}  {e['delta']:>+6.2f}")


# ============================================================
# CLI
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="AgTech Firma Hídrica")
    parser.add_argument("--nodo", type=int, help="Procesar firmas de un nodo")
    parser.add_argument("--todos", action="store_true", help="Procesar todos los nodos")
    parser.add_argument("--ultimo", type=int, metavar="NODO_ID", help="Última firma de un nodo")
    parser.add_argument("--detectar", type=int, metavar="NODO_ID", help="Solo detectar eventos (debug)")
    args = parser.parse_args()

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no configurada")
        sys.exit(1)

    with get_conn() as conn:
        if args.nodo is not None:
            procesar_todas_firmas(conn, nodo_id=args.nodo)
            # Mostrar primeras 3
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM firma_hidrica WHERE nodo_id = %s
                    ORDER BY evento_riego LIMIT 3
                """, (args.nodo,))
                firmas = cur.fetchall()
            print(f"\nPrimeras {len(firmas)} firmas del nodo {args.nodo}:")
            for f in firmas:
                print(f"  {f['evento_riego']}  vel={f['vel_10_20']}  τ10={f['tau_10']}  τ20={f['tau_20']}  BP={f['breaking_point_10']}")

        elif args.todos:
            procesar_todas_firmas(conn)

        elif args.ultimo is not None:
            imprimir_ultima_firma(conn, args.ultimo)

        elif args.detectar is not None:
            imprimir_eventos(conn, args.detectar)

        else:
            parser.print_help()


if __name__ == "__main__":
    main()
