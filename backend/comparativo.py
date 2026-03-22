"""
comparativo.py — Análisis CUSUM tratamiento vs testigo
Detecta divergencias sostenidas entre pares de nodos (tratamiento/testigo)
en cada bloque usando CUSUM (Cumulative Sum Control Chart).

CLI:
  python comparativo.py --analizar       Estado CUSUM de todos los bloques
  python comparativo.py --bloque 2       Detalle del bloque 2
  python comparativo.py --exportar       CSV de deltas diarios (debug)
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
    format="%(asctime)s [cusum] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("cusum")

DATABASE_URL = os.environ.get("DATABASE_URL", "")


@contextmanager
def get_conn():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


# ============================================================
# 1. MEDIAS DIARIAS POR BLOQUE
# ============================================================
def calcular_medias_diarias(conn, predio_id=1, dias=180):
    """
    Para cada bloque, calcula media diaria de h10 por rol.
    Retorna {bloque: [{dia, trat_h10, test_h10, delta_h10, ...}, ...]}
    """
    sql = """
        SELECT
            date_trunc('day', l.tiempo)::date as dia,
            n.bloque,
            n.rol,
            n.nodo_id,
            ROUND(AVG(l.h10_avg)::numeric, 4) as h10,
            ROUND(AVG(l.h20_avg)::numeric, 4) as h20,
            ROUND(AVG(l.h30_avg)::numeric, 4) as h30,
            ROUND(AVG(l.t20)::numeric, 4) as t20,
            ROUND(AVG(l.ec30)::numeric, 4) as ec30
        FROM lecturas l
        JOIN nodos n ON l.nodo_id = n.nodo_id
        WHERE n.predio_id = %s
          AND l.tiempo >= (SELECT MAX(tiempo) FROM lecturas) - interval '%s days'
        GROUP BY dia, n.bloque, n.rol, n.nodo_id
        ORDER BY dia, n.bloque
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, (predio_id, dias))
        rows = cur.fetchall()

    # Tau semanal por nodo (promedio de tau_10 por semana)
    tau_sql = """
        SELECT
            n.nodo_id, n.bloque, n.rol,
            date_trunc('week', f.evento_riego)::date as semana,
            ROUND(AVG(f.tau_10)::numeric, 2) as tau_10
        FROM firma_hidrica f
        JOIN nodos n ON f.nodo_id = n.nodo_id
        WHERE n.predio_id = %s
        GROUP BY n.nodo_id, n.bloque, n.rol, semana
        ORDER BY semana
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(tau_sql, (predio_id,))
        tau_rows = cur.fetchall()

    # Index tau by (bloque, rol, semana)
    tau_index = {}
    for r in tau_rows:
        key = (r["bloque"], r["rol"], str(r["semana"]))
        tau_index[key] = float(r["tau_10"])

    # Group by bloque
    bloques = {}
    temp = {}  # {(bloque, dia): {tratamiento: {...}, testigo: {...}}}

    for r in rows:
        bloque = r["bloque"]
        dia = str(r["dia"])
        rol = r["rol"]

        if bloque not in temp:
            temp[bloque] = {}
        if dia not in temp[bloque]:
            temp[bloque][dia] = {}

        temp[bloque][dia][rol] = {
            "h10": float(r["h10"]),
            "h20": float(r["h20"]),
            "h30": float(r["h30"]),
            "t20": float(r["t20"]),
            "ec30": float(r["ec30"]),
        }

    for bloque in sorted(temp.keys()):
        dias_data = []
        for dia in sorted(temp[bloque].keys()):
            d = temp[bloque][dia]
            trat = d.get("tratamiento", {})
            test = d.get("testigo", {})

            delta_h10 = None
            if trat.get("h10") is not None and test.get("h10") is not None:
                delta_h10 = round(trat["h10"] - test["h10"], 4)

            # Tau: find the week this day belongs to
            # Monday of the week
            dia_dt = datetime.strptime(dia, "%Y-%m-%d")
            semana_key = str((dia_dt - timedelta(days=dia_dt.weekday())).date())
            trat_tau = tau_index.get((bloque, "tratamiento", semana_key))
            test_tau = tau_index.get((bloque, "testigo", semana_key))
            delta_tau = None
            if trat_tau is not None and test_tau is not None:
                delta_tau = round(trat_tau - test_tau, 2)

            dias_data.append({
                "dia": dia,
                "trat_h10": trat.get("h10"),
                "test_h10": test.get("h10"),
                "delta_h10": delta_h10,
                "trat_tau10": trat_tau,
                "test_tau10": test_tau,
                "delta_tau10": delta_tau,
            })

        bloques[bloque] = dias_data

    return bloques


# ============================================================
# 2. CUSUM
# ============================================================
def cusum(diferencias, dias_baseline=28):
    """
    CUSUM sobre serie de diferencias (tratamiento - testigo).
    Retorna {s_pos, s_neg, umbral_h, media_baseline, std_baseline, alarmas}.
    """
    arr = np.array(diferencias, dtype=float)

    # Filtrar NaN
    valid = ~np.isnan(arr)
    if valid.sum() < dias_baseline + 5:
        return {
            "s_pos": [], "s_neg": [], "umbral_h": 0,
            "media_baseline": 0, "std_baseline": 0, "alarmas": [],
        }

    # Baseline
    baseline = arr[:dias_baseline]
    baseline_clean = baseline[~np.isnan(baseline)]

    if len(baseline_clean) < 10:
        return {
            "s_pos": [], "s_neg": [], "umbral_h": 0,
            "media_baseline": 0, "std_baseline": 0, "alarmas": [],
        }

    media = float(np.mean(baseline_clean))
    std = float(np.std(baseline_clean))

    if std < 0.01:
        return {
            "s_pos": [0.0] * len(arr), "s_neg": [0.0] * len(arr),
            "umbral_h": 0, "media_baseline": media, "std_baseline": std,
            "alarmas": [],
        }

    k = std / 2.0  # slack
    h = 4.0 * std  # umbral

    s_pos = np.zeros(len(arr))
    s_neg = np.zeros(len(arr))
    alarmas = []

    for i in range(1, len(arr)):
        val = arr[i] if not np.isnan(arr[i]) else media  # fill NaN with baseline
        s_pos[i] = max(0, s_pos[i - 1] + (val - media) - k)
        s_neg[i] = max(0, s_neg[i - 1] - (val - media) - k)

        if s_pos[i] > h and (not alarmas or alarmas[-1]["tipo"] != "incremento" or i - alarmas[-1]["dia"] > 7):
            alarmas.append({
                "dia": int(i),
                "tipo": "incremento",
                "magnitud": round(float(s_pos[i]), 4),
            })
        elif s_neg[i] > h and (not alarmas or alarmas[-1]["tipo"] != "decremento" or i - alarmas[-1]["dia"] > 7):
            alarmas.append({
                "dia": int(i),
                "tipo": "decremento",
                "magnitud": round(float(s_neg[i]), 4),
            })

    return {
        "s_pos": [round(float(x), 4) for x in s_pos],
        "s_neg": [round(float(x), 4) for x in s_neg],
        "umbral_h": round(h, 4),
        "media_baseline": round(media, 4),
        "std_baseline": round(std, 4),
        "alarmas": alarmas,
    }


# ============================================================
# 3. ANALIZAR BLOQUES
# ============================================================
def analizar_bloques(conn, predio_id=1, dias=180):
    """Corre CUSUM sobre delta_h10 y delta_tau10 de cada bloque."""
    medias = calcular_medias_diarias(conn, predio_id, dias)
    resultados = []

    for bloque in sorted(medias.keys()):
        dias_data = medias[bloque]
        deltas_h10 = [d["delta_h10"] if d["delta_h10"] is not None else float("nan") for d in dias_data]
        deltas_tau = [d["delta_tau10"] if d["delta_tau10"] is not None else float("nan") for d in dias_data]
        dias_labels = [d["dia"] for d in dias_data]

        cusum_h10 = cusum(deltas_h10)

        # CUSUM tau solo si hay suficientes datos no-NaN
        tau_valid = sum(1 for d in deltas_tau if not np.isnan(d))
        cusum_tau10 = cusum(deltas_tau) if tau_valid > 35 else None

        # Estado
        alarmas_h10 = cusum_h10["alarmas"]
        estado = "normal"
        desde_dia = None
        magnitud = None
        tipo = None

        if alarmas_h10:
            primera = alarmas_h10[0]
            estado = "divergencia"
            desde_dia = dias_labels[primera["dia"]] if primera["dia"] < len(dias_labels) else f"día {primera['dia']}"
            magnitud = primera["magnitud"]
            tipo = primera["tipo"]

        resultados.append({
            "bloque": bloque,
            "estado": estado,
            "desde_dia": desde_dia,
            "magnitud": magnitud,
            "tipo": tipo,
            "total_alarmas": len(alarmas_h10),
            "cusum_h10": cusum_h10,
            "cusum_tau10": cusum_tau10,
            "dias": dias_labels,
            "deltas_h10": [round(d, 4) if not np.isnan(d) else None for d in deltas_h10],
        })

    return resultados


# ============================================================
# CLI
# ============================================================
def imprimir_analisis(conn, predio_id=1):
    resultados = analizar_bloques(conn, predio_id)

    print()
    print("=" * 80)
    print("ANÁLISIS CUSUM — AgTech Nextipac")
    print("=" * 80)
    print(f"{'Bloque':>6}  {'Estado':15s}  {'Desde':12s}  {'Tipo':12s}  {'Magnitud':>10}  {'Alarmas':>7}  {'Umbral h':>10}  {'μ baseline':>10}  {'σ baseline':>10}")
    print("-" * 105)

    for r in resultados:
        c = r["cusum_h10"]
        print(f"{r['bloque']:>6}  {r['estado']:15s}  "
              f"{r['desde_dia'] or '—':12s}  "
              f"{r['tipo'] or '—':12s}  "
              f"{r['magnitud'] or 0:>10.4f}  "
              f"{r['total_alarmas']:>7}  "
              f"{c['umbral_h']:>10.4f}  "
              f"{c['media_baseline']:>10.4f}  "
              f"{c['std_baseline']:>10.4f}")

    print()
    for r in resultados:
        if r["estado"] == "divergencia":
            print(f"  ** BLOQUE {r['bloque']}: divergencia tipo '{r['tipo']}' detectada desde {r['desde_dia']}")
            print(f"     {r['total_alarmas']} alarmas, magnitud máxima {r['magnitud']:.4f}")
            print(f"     baseline: μ={r['cusum_h10']['media_baseline']:.4f}, σ={r['cusum_h10']['std_baseline']:.4f}, h={r['cusum_h10']['umbral_h']:.4f}")


def imprimir_bloque(conn, bloque_id, predio_id=1):
    resultados = analizar_bloques(conn, predio_id)
    bloque = next((r for r in resultados if r["bloque"] == bloque_id), None)
    if not bloque:
        print(f"Bloque {bloque_id} no encontrado")
        return

    c = bloque["cusum_h10"]
    print()
    print("=" * 70)
    print(f"CUSUM DETALLE — Bloque {bloque_id}")
    print("=" * 70)
    print(f"Estado: {bloque['estado']}")
    print(f"Baseline (primeros 28 días): μ={c['media_baseline']:.4f}, σ={c['std_baseline']:.4f}")
    print(f"Umbral h: {c['umbral_h']:.4f}, slack k: {c['std_baseline']/2:.4f}")
    print(f"Alarmas: {bloque['total_alarmas']}")

    if bloque["cusum_h10"]["alarmas"]:
        print(f"\nAlarmas detectadas:")
        for a in bloque["cusum_h10"]["alarmas"]:
            dia_label = bloque["dias"][a["dia"]] if a["dia"] < len(bloque["dias"]) else f"día {a['dia']}"
            print(f"  Día {a['dia']} ({dia_label}): {a['tipo']}, magnitud={a['magnitud']:.4f}")

    # Primeros y últimos deltas
    print(f"\nDeltas h10 (primeros 10 días):")
    for i, d in enumerate(bloque["deltas_h10"][:10]):
        s_p = c["s_pos"][i] if i < len(c["s_pos"]) else 0
        s_n = c["s_neg"][i] if i < len(c["s_neg"]) else 0
        flag = " ← ALARMA" if s_p > c["umbral_h"] or s_n > c["umbral_h"] else ""
        print(f"  {bloque['dias'][i]}  Δ={d if d is not None else 'NaN':>8}  S+={s_p:>8.4f}  S-={s_n:>8.4f}{flag}")

    if len(bloque["deltas_h10"]) > 10:
        print(f"\nDeltas h10 (últimos 10 días):")
        start = len(bloque["deltas_h10"]) - 10
        for i in range(start, len(bloque["deltas_h10"])):
            s_p = c["s_pos"][i] if i < len(c["s_pos"]) else 0
            s_n = c["s_neg"][i] if i < len(c["s_neg"]) else 0
            flag = " ← ALARMA" if s_p > c["umbral_h"] or s_n > c["umbral_h"] else ""
            d = bloque["deltas_h10"][i]
            print(f"  {bloque['dias'][i]}  Δ={d if d is not None else 'NaN':>8}  S+={s_p:>8.4f}  S-={s_n:>8.4f}{flag}")

    # Tau CUSUM
    if bloque["cusum_tau10"]:
        ct = bloque["cusum_tau10"]
        print(f"\nCUSUM τ10: umbral={ct['umbral_h']:.2f}, alarmas={len(ct['alarmas'])}")
        for a in ct["alarmas"][:5]:
            print(f"  Día {a['dia']}: {a['tipo']}, magnitud={a['magnitud']:.2f}")


def exportar_csv(conn, predio_id=1):
    medias = calcular_medias_diarias(conn, predio_id)
    print("bloque,dia,trat_h10,test_h10,delta_h10,trat_tau10,test_tau10,delta_tau10")
    for bloque in sorted(medias.keys()):
        for d in medias[bloque]:
            print(f"{bloque},{d['dia']},{d['trat_h10']},{d['test_h10']},{d['delta_h10']},"
                  f"{d['trat_tau10']},{d['test_tau10']},{d['delta_tau10']}")


def main():
    parser = argparse.ArgumentParser(description="AgTech Comparativo — Análisis CUSUM")
    parser.add_argument("--analizar", action="store_true", help="Estado CUSUM de todos los bloques")
    parser.add_argument("--bloque", type=int, help="Detalle de un bloque")
    parser.add_argument("--exportar", action="store_true", help="CSV de deltas diarios")
    args = parser.parse_args()

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no configurada")
        sys.exit(1)

    with get_conn() as conn:
        if args.analizar:
            imprimir_analisis(conn)
        elif args.bloque is not None:
            imprimir_bloque(conn, args.bloque)
        elif args.exportar:
            exportar_csv(conn)
        else:
            parser.print_help()


if __name__ == "__main__":
    main()
