"""
alertas.py — Motor de reglas del sistema AgTech
Evalúa cada nodo contra umbrales, calcula Score Phytophthora v2,
y guarda eventos en la tabla eventos.

Modos CLI:
  python alertas.py --evaluar          Evaluar todos los nodos, tabla de scores
  python alertas.py --nodo 3           Resumen completo del nodo 3 con desglose
  python alertas.py --resumen 3        Dict de resumen para LLM / API (debug)
"""
import os
import sys
import json
import argparse
import logging
from datetime import datetime, timedelta

import psycopg2
from psycopg2.extras import RealDictCursor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [alertas] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("alertas")

# ============================================================
# CONFIGURACIÓN
# ============================================================
UMBRAL_RIEGO = 28.0          # % VWC — debajo de esto, necesita riego
UMBRAL_BATERIA = 3.3         # V
UMBRAL_OFFLINE_MIN = 30      # minutos sin datos
LECTURAS_CONSECUTIVAS_RIEGO = 2  # lecturas bajo umbral para alertar


def get_conn():
    url = os.environ.get("DATABASE_URL")
    if not url:
        if len(sys.argv) > 1 and sys.argv[1].startswith("postgresql://"):
            url = sys.argv[1]
        else:
            print("ERROR: DATABASE_URL no definida.")
            sys.exit(1)
    return psycopg2.connect(url)


# ============================================================
# QUERIES AUXILIARES
# ============================================================
def get_ultimas_lecturas(conn, nodo_id, horas=72):
    """Últimas N horas de lecturas de un nodo."""
    sql = """
        SELECT tiempo, h10_avg, h20_avg, h30_avg, t20, ec30, bateria, rssi
        FROM lecturas
        WHERE nodo_id = %s AND tiempo >= (SELECT MAX(tiempo) FROM lecturas) - interval '%s hours'
        ORDER BY tiempo DESC
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, (nodo_id, horas))
        return cur.fetchall()


def get_ultima_lectura(conn, nodo_id):
    """Última lectura de un nodo."""
    sql = """
        SELECT tiempo, h10_avg, h20_avg, h30_avg, t20, ec30, bateria, rssi
        FROM lecturas WHERE nodo_id = %s
        ORDER BY tiempo DESC LIMIT 1
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, (nodo_id,))
        return cur.fetchone()


def get_tiempo_max_global(conn):
    """Timestamp más reciente en toda la tabla lecturas."""
    with conn.cursor() as cur:
        cur.execute("SELECT MAX(tiempo) FROM lecturas")
        return cur.fetchone()[0]


def get_info_nodo(conn, nodo_id):
    """Metadata del nodo."""
    sql = "SELECT * FROM nodos WHERE nodo_id = %s"
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, (nodo_id,))
        return cur.fetchone()


def get_todos_nodos(conn):
    """Lista de todos los nodos."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM nodos ORDER BY nodo_id")
        return cur.fetchall()


def get_clima_reciente(conn, horas=48):
    """Datos climáticos de las últimas N horas."""
    sql = """
        SELECT tiempo, temp_ambiente, humedad_relativa, precipitacion,
               viento_vel, radiacion_solar, eto, precip_acum_7d
        FROM clima
        WHERE tiempo >= (SELECT MAX(tiempo) FROM clima) - interval '%s hours'
        ORDER BY tiempo DESC
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, (horas,))
        return cur.fetchall()


def get_precip_acum_7d(conn):
    """Precipitación acumulada últimos 7 días desde tabla clima."""
    sql = """
        SELECT COALESCE(SUM(precipitacion), 0)
        FROM clima
        WHERE tiempo >= (SELECT MAX(tiempo) FROM clima) - interval '7 days'
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchone()[0]


def get_pronostico_lluvia_48h(conn):
    """Precipitación esperada en próximas 48h (registros futuros si existen)."""
    sql = """
        SELECT COALESCE(SUM(precipitacion), 0)
        FROM clima
        WHERE tiempo > (SELECT MAX(tiempo) FROM clima)
          AND tiempo <= (SELECT MAX(tiempo) FROM clima) + interval '48 hours'
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchone()[0]


def get_hr_promedio_48h(conn):
    """Humedad relativa ambiente promedio últimas 48h."""
    sql = """
        SELECT COALESCE(AVG(humedad_relativa), 0)
        FROM clima
        WHERE tiempo >= (SELECT MAX(tiempo) FROM clima) - interval '48 hours'
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchone()[0]


# ============================================================
# SCORE PHYTOPHTHORA v2 (0-100)
# ============================================================
def calcular_horas_humedo(conn, nodo_id, umbral_vwc=40.0):
    """
    Calcula horas continuas con h10_avg > umbral, contando hacia atrás
    desde la última lectura.
    """
    sql = """
        SELECT tiempo, h10_avg FROM lecturas
        WHERE nodo_id = %s
        ORDER BY tiempo DESC
        LIMIT 1000
    """
    with conn.cursor() as cur:
        cur.execute(sql, (nodo_id,))
        rows = cur.fetchall()

    if not rows:
        return 0.0

    horas = 0.0
    for i, (tiempo, h10) in enumerate(rows):
        if h10 is None or h10 < umbral_vwc:
            break
        if i > 0:
            dt = (rows[i - 1][0] - tiempo).total_seconds() / 3600.0
            horas += dt
        elif i == 0:
            horas += 5.0 / 60.0  # primera lectura = 5 min

    return round(horas, 2)


def calcular_score_phytophthora(conn, nodo_id):
    """
    Score de riesgo Phytophthora cinnamomi (0-100).
    Retorna (score, desglose_dict).
    """
    ultima = get_ultima_lectura(conn, nodo_id)
    if not ultima:
        return 0, {"error": "sin lecturas"}

    h10 = ultima["h10_avg"] or 0
    h20 = ultima["h20_avg"] or 0
    t20 = ultima["t20"] or 0

    desglose = {}
    score = 0

    # Factor 1: Humedad 10cm
    if h10 > 45:
        pts = 15
    elif h10 > 40:
        pts = 8
    else:
        pts = 0
    desglose["humedad_10cm"] = {"valor": round(h10, 2), "puntos": pts, "umbral": ">45=15, >40=8"}
    score += pts

    # Factor 2: Humedad 20cm
    if h20 > 45:
        pts = 15
    elif h20 > 40:
        pts = 8
    else:
        pts = 0
    desglose["humedad_20cm"] = {"valor": round(h20, 2), "puntos": pts, "umbral": ">45=15, >40=8"}
    score += pts

    # Factor 3: Temperatura suelo 20cm
    if 22 <= t20 <= 28:
        pts = 20
    elif 15 <= t20 < 22:
        pts = 10
    else:
        pts = 0
    desglose["temperatura_20cm"] = {"valor": round(t20, 2), "puntos": pts, "umbral": "22-28=20, 15-22=10"}
    score += pts

    # Factor 4: Horas húmedo continuas
    horas_humedo = calcular_horas_humedo(conn, nodo_id)
    if horas_humedo > 72:
        pts = 15
    elif horas_humedo > 48:
        pts = 10
    elif horas_humedo > 24:
        pts = 5
    else:
        pts = 0
    desglose["horas_humedo"] = {"valor": horas_humedo, "puntos": pts, "umbral": ">72=15, >48=10, >24=5"}
    score += pts

    # Factor 5: Precipitación acumulada 7 días
    precip_7d = get_precip_acum_7d(conn)
    if precip_7d > 50:
        pts = 10
    elif precip_7d > 25:
        pts = 5
    else:
        pts = 0
    desglose["precip_7d"] = {"valor": round(precip_7d, 2), "puntos": pts, "umbral": ">50=10, >25=5"}
    score += pts

    # Factor 6: Pronóstico lluvia 48h
    pronostico = get_pronostico_lluvia_48h(conn)
    if pronostico > 20:
        pts = 5
    else:
        pts = 0
    desglose["pronostico_48h"] = {"valor": round(pronostico, 2), "puntos": pts, "umbral": ">20mm=5"}
    score += pts

    # Factor 7: HR ambiente promedio 48h
    hr_48h = get_hr_promedio_48h(conn)
    if hr_48h > 80:
        pts = 5
    else:
        pts = 0
    desglose["hr_ambiente_48h"] = {"valor": round(hr_48h, 2), "puntos": pts, "umbral": ">80%=5"}
    score += pts

    score = min(score, 100)

    # Clasificación
    if score >= 76:
        nivel = "CRÍTICO"
    elif score >= 51:
        nivel = "ALTO"
    elif score >= 26:
        nivel = "MODERADO"
    else:
        nivel = "BAJO"

    desglose["score_total"] = score
    desglose["nivel"] = nivel

    return score, desglose


# ============================================================
# ALERTAS: RIEGO, OFFLINE, BATERÍA
# ============================================================
def evaluar_riego(conn, nodo_id):
    """
    Si h10_avg < UMBRAL_RIEGO por más de LECTURAS_CONSECUTIVAS_RIEGO
    lecturas seguidas, genera alerta.
    Retorna (necesita_riego: bool, urgencia: str, datos: dict) o None.
    """
    sql = """
        SELECT tiempo, h10_avg FROM lecturas
        WHERE nodo_id = %s ORDER BY tiempo DESC
        LIMIT %s
    """
    with conn.cursor() as cur:
        cur.execute(sql, (nodo_id, LECTURAS_CONSECUTIVAS_RIEGO + 3))
        rows = cur.fetchall()

    if len(rows) < LECTURAS_CONSECUTIVAS_RIEGO:
        return None

    consecutivas_bajo = 0
    h10_values = []
    for tiempo, h10 in rows:
        if h10 is not None and h10 < UMBRAL_RIEGO:
            consecutivas_bajo += 1
            h10_values.append(h10)
        else:
            break

    if consecutivas_bajo < LECTURAS_CONSECUTIVAS_RIEGO:
        return None

    h10_prom = sum(h10_values) / len(h10_values)
    if h10_prom < 20:
        urgencia = "alto"
    elif h10_prom < 24:
        urgencia = "medio"
    else:
        urgencia = "bajo"

    return {
        "necesita_riego": True,
        "urgencia": urgencia,
        "h10_promedio": round(h10_prom, 2),
        "lecturas_bajo_umbral": consecutivas_bajo,
        "umbral": UMBRAL_RIEGO,
    }


def evaluar_offline(conn, nodo_id, tiempo_referencia):
    """
    Si un nodo no tiene lecturas en los últimos UMBRAL_OFFLINE_MIN minutos.
    """
    ultima = get_ultima_lectura(conn, nodo_id)
    if not ultima:
        return {"offline": True, "ultima_lectura": None, "minutos_sin_datos": None}

    delta = tiempo_referencia - ultima["tiempo"]
    minutos = delta.total_seconds() / 60.0

    if minutos > UMBRAL_OFFLINE_MIN:
        return {
            "offline": True,
            "ultima_lectura": str(ultima["tiempo"]),
            "minutos_sin_datos": round(minutos, 1),
            "ultimo_rssi": ultima["rssi"],
            "ultima_bateria": float(ultima["bateria"]) if ultima["bateria"] else None,
        }
    return None


def evaluar_bateria(conn, nodo_id):
    """Si batería < UMBRAL_BATERIA."""
    ultima = get_ultima_lectura(conn, nodo_id)
    if not ultima or ultima["bateria"] is None:
        return None

    if ultima["bateria"] < UMBRAL_BATERIA:
        return {
            "bateria_baja": True,
            "voltaje": float(ultima["bateria"]),
            "umbral": UMBRAL_BATERIA,
            "tiempo": str(ultima["tiempo"]),
        }
    return None


# ============================================================
# RESUMEN COMPLETO DE NODO (para LLM / API / dashboard)
# ============================================================
def generar_resumen_nodo(conn, nodo_id):
    """
    Produce dict con estado completo del nodo:
    - Info del nodo, última lectura, score Phytophthora desglosado
    - Horas húmedo, tendencia 24h, datos clima
    - Alertas activas
    """
    info = get_info_nodo(conn, nodo_id)
    if not info:
        return {"error": f"Nodo {nodo_id} no existe"}

    ultima = get_ultima_lectura(conn, nodo_id)
    score, desglose = calcular_score_phytophthora(conn, nodo_id)

    # Tendencia 24h
    lecturas_24h = get_ultimas_lecturas(conn, nodo_id, horas=24)
    if lecturas_24h and len(lecturas_24h) > 1:
        h10_inicio = lecturas_24h[-1]["h10_avg"]
        h10_fin = lecturas_24h[0]["h10_avg"]
        t20_inicio = lecturas_24h[-1]["t20"]
        t20_fin = lecturas_24h[0]["t20"]
        tendencia_24h = {
            "h10_cambio": round(h10_fin - h10_inicio, 2) if h10_inicio and h10_fin else None,
            "t20_cambio": round(t20_fin - t20_inicio, 2) if t20_inicio and t20_fin else None,
            "h10_promedio_24h": round(
                sum(r["h10_avg"] for r in lecturas_24h if r["h10_avg"]) / len(lecturas_24h), 2
            ),
            "h10_max_24h": round(max(r["h10_avg"] for r in lecturas_24h if r["h10_avg"]), 2),
            "h10_min_24h": round(min(r["h10_avg"] for r in lecturas_24h if r["h10_avg"]), 2),
            "registros_24h": len(lecturas_24h),
        }
    else:
        tendencia_24h = None

    # Clima
    clima_reciente = get_clima_reciente(conn, horas=24)
    clima_resumen = None
    if clima_reciente:
        temps = [r["temp_ambiente"] for r in clima_reciente if r["temp_ambiente"] is not None]
        hrs = [r["humedad_relativa"] for r in clima_reciente if r["humedad_relativa"] is not None]
        precips = [r["precipitacion"] for r in clima_reciente if r["precipitacion"] is not None]
        clima_resumen = {
            "temp_prom": round(sum(temps) / len(temps), 1) if temps else None,
            "hr_prom": round(sum(hrs) / len(hrs), 1) if hrs else None,
            "precip_24h": round(sum(precips), 1) if precips else 0,
            "precip_acum_7d": round(get_precip_acum_7d(conn), 1),
            "registros_clima": len(clima_reciente),
        }

    # Alertas activas
    alertas = []
    riego = evaluar_riego(conn, nodo_id)
    if riego:
        alertas.append({"tipo": "necesita_riego", "datos": riego})

    tiempo_ref = get_tiempo_max_global(conn)
    offline = evaluar_offline(conn, nodo_id, tiempo_ref)
    if offline:
        alertas.append({"tipo": "offline", "datos": offline})

    bat = evaluar_bateria(conn, nodo_id)
    if bat:
        alertas.append({"tipo": "bateria_baja", "datos": bat})

    # Último microbioma
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT fecha_muestreo, target, valor, unidad
            FROM microbioma WHERE nodo_id = %s
            ORDER BY fecha_muestreo DESC LIMIT 5
        """, (nodo_id,))
        microbioma_reciente = cur.fetchall()

    resumen = {
        "nodo_id": nodo_id,
        "nombre": info["nombre"],
        "rol": info["rol"],
        "bloque": info["bloque"],
        "timestamp_evaluacion": str(datetime.now()),
        "ultima_lectura": {
            "tiempo": str(ultima["tiempo"]) if ultima else None,
            "h10_avg": float(ultima["h10_avg"]) if ultima and ultima["h10_avg"] else None,
            "h20_avg": float(ultima["h20_avg"]) if ultima and ultima["h20_avg"] else None,
            "h30_avg": float(ultima["h30_avg"]) if ultima and ultima["h30_avg"] else None,
            "t20": float(ultima["t20"]) if ultima and ultima["t20"] else None,
            "ec30": float(ultima["ec30"]) if ultima and ultima["ec30"] else None,
            "bateria": float(ultima["bateria"]) if ultima and ultima["bateria"] else None,
            "rssi": int(ultima["rssi"]) if ultima and ultima["rssi"] else None,
        } if ultima else None,
        "score_phytophthora": {
            "score": score,
            "nivel": desglose.get("nivel", "?"),
            "desglose": desglose,
        },
        "tendencia_24h": tendencia_24h,
        "clima": clima_resumen,
        "alertas": alertas,
        "microbioma_reciente": [
            {
                "fecha": str(m["fecha_muestreo"]),
                "target": m["target"],
                "valor": float(m["valor"]),
                "unidad": m["unidad"],
            }
            for m in microbioma_reciente
        ] if microbioma_reciente else [],
    }

    return resumen


# ============================================================
# GUARDAR EVENTOS
# ============================================================
def guardar_evento(conn, nodo_id, tipo, datos):
    """Inserta evento en la tabla eventos."""
    sql = """
        INSERT INTO eventos (tiempo, nodo_id, tipo, datos, procesado)
        VALUES (NOW(), %s, %s, %s, FALSE)
    """
    with conn.cursor() as cur:
        cur.execute(sql, (nodo_id, tipo, json.dumps(datos, default=str)))
    conn.commit()


# ============================================================
# CORRER ALERTAS (todos los nodos)
# ============================================================
def correr_alertas(conn):
    """Evalúa todos los nodos y retorna lista de eventos nuevos."""
    nodos = get_todos_nodos(conn)
    tiempo_ref = get_tiempo_max_global(conn)
    eventos_nuevos = []

    for nodo in nodos:
        nid = nodo["nodo_id"]

        # Score Phytophthora
        score, desglose = calcular_score_phytophthora(conn, nid)
        if score >= 51:  # ALTO o CRÍTICO
            evento = {
                "tipo": "alerta_phytophthora",
                "nodo_id": nid,
                "datos": desglose,
            }
            guardar_evento(conn, nid, "alerta_phytophthora", desglose)
            eventos_nuevos.append(evento)

        # Riego
        riego = evaluar_riego(conn, nid)
        if riego:
            guardar_evento(conn, nid, "necesita_riego", riego)
            eventos_nuevos.append({"tipo": "necesita_riego", "nodo_id": nid, "datos": riego})

        # Offline
        offline = evaluar_offline(conn, nid, tiempo_ref)
        if offline:
            guardar_evento(conn, nid, "offline", offline)
            eventos_nuevos.append({"tipo": "offline", "nodo_id": nid, "datos": offline})

        # Batería
        bat = evaluar_bateria(conn, nid)
        if bat:
            guardar_evento(conn, nid, "bateria_baja", bat)
            eventos_nuevos.append({"tipo": "bateria_baja", "nodo_id": nid, "datos": bat})

    return eventos_nuevos


# ============================================================
# CLI: IMPRIMIR TABLA DE SCORES
# ============================================================
def imprimir_evaluacion(conn):
    """Imprime tabla con scores de todos los nodos."""
    nodos = get_todos_nodos(conn)
    tiempo_ref = get_tiempo_max_global(conn)

    print()
    print("=" * 100)
    print("EVALUACIÓN DE ALERTAS — AgTech Nextipac")
    print(f"Tiempo de referencia: {tiempo_ref}")
    print("=" * 100)

    # Header
    print(f"{'Nodo':>4}  {'Nombre':20s}  {'Rol':12s}  {'h10%':>5}  {'h20%':>5}  "
          f"{'t20°C':>5}  {'Bat V':>5}  {'Score':>5}  {'Nivel':8s}  {'Alertas'}")
    print("-" * 100)

    for nodo in nodos:
        nid = nodo["nodo_id"]
        ultima = get_ultima_lectura(conn, nid)
        score, desglose = calcular_score_phytophthora(conn, nid)

        # Alertas activas
        alertas_txt = []
        riego = evaluar_riego(conn, nid)
        if riego:
            alertas_txt.append(f"RIEGO({riego['urgencia']})")

        offline = evaluar_offline(conn, nid, tiempo_ref)
        if offline:
            alertas_txt.append(f"OFFLINE({offline['minutos_sin_datos']:.0f}min)")

        bat = evaluar_bateria(conn, nid)
        if bat:
            alertas_txt.append(f"BAT({bat['voltaje']:.2f}V)")

        h10 = f"{ultima['h10_avg']:.1f}" if ultima and ultima['h10_avg'] else "---"
        h20 = f"{ultima['h20_avg']:.1f}" if ultima and ultima['h20_avg'] else "---"
        t20 = f"{ultima['t20']:.1f}" if ultima and ultima['t20'] else "---"
        bat_v = f"{ultima['bateria']:.2f}" if ultima and ultima['bateria'] else "---"
        alertas_str = ", ".join(alertas_txt) if alertas_txt else "OK"

        nivel = desglose.get("nivel", "?")
        nivel_color = nivel

        print(f"{nid:>4}  {nodo['nombre']:20s}  {nodo['rol']:12s}  "
              f"{h10:>5}  {h20:>5}  {t20:>5}  {bat_v:>5}  "
              f"{score:>5}  {nivel_color:8s}  {alertas_str}")

    # Eventos guardados
    print()
    eventos = correr_alertas(conn)
    print(f"\nEventos generados: {len(eventos)}")
    for e in eventos:
        print(f"  [{e['tipo']:25s}] Nodo {e['nodo_id']}: {json.dumps(e['datos'], default=str)[:80]}...")


def imprimir_nodo_detalle(conn, nodo_id):
    """Imprime resumen detallado de un nodo con desglose del score."""
    info = get_info_nodo(conn, nodo_id)
    if not info:
        print(f"Nodo {nodo_id} no encontrado.")
        return

    ultima = get_ultima_lectura(conn, nodo_id)
    score, desglose = calcular_score_phytophthora(conn, nodo_id)

    print()
    print("=" * 60)
    print(f"NODO {nodo_id} — {info['nombre']} ({info['rol']}, bloque {info['bloque']})")
    print("=" * 60)

    if ultima:
        print(f"\n  Última lectura: {ultima['tiempo']}")
        print(f"  h10_avg:  {ultima['h10_avg']:.2f}% VWC")
        print(f"  h20_avg:  {ultima['h20_avg']:.2f}% VWC")
        print(f"  h30_avg:  {ultima['h30_avg']:.2f}% VWC")
        print(f"  t20:      {ultima['t20']:.2f}°C")
        print(f"  ec30:     {ultima['ec30']:.2f} dS/m")
        print(f"  batería:  {ultima['bateria']:.2f}V")
        print(f"  RSSI:     {ultima['rssi']} dBm")
    else:
        print("\n  SIN LECTURAS")

    print(f"\n  SCORE PHYTOPHTHORA: {score}/100 — {desglose.get('nivel', '?')}")
    print(f"  {'Factor':25s}  {'Valor':>8}  {'Puntos':>6}  Umbral")
    print(f"  {'-' * 60}")
    for key in ["humedad_10cm", "humedad_20cm", "temperatura_20cm",
                 "horas_humedo", "precip_7d", "pronostico_48h", "hr_ambiente_48h"]:
        if key in desglose:
            d = desglose[key]
            print(f"  {key:25s}  {d['valor']:>8}  {d['puntos']:>6}  {d['umbral']}")

    # Alertas
    tiempo_ref = get_tiempo_max_global(conn)
    print(f"\n  ALERTAS:")
    riego = evaluar_riego(conn, nodo_id)
    if riego:
        print(f"    RIEGO: urgencia={riego['urgencia']}, h10_prom={riego['h10_promedio']}%")
    offline = evaluar_offline(conn, nodo_id, tiempo_ref)
    if offline:
        print(f"    OFFLINE: {offline['minutos_sin_datos']} min sin datos")
    bat = evaluar_bateria(conn, nodo_id)
    if bat:
        print(f"    BATERÍA BAJA: {bat['voltaje']}V")
    if not riego and not offline and not bat:
        print(f"    Ninguna")


# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="AgTech Alertas — Motor de reglas")
    parser.add_argument("--evaluar", action="store_true", help="Evaluar todos los nodos")
    parser.add_argument("--nodo", type=int, help="Detalle de un nodo con desglose de score")
    parser.add_argument("--resumen", type=int, help="Dict de resumen para LLM/API (JSON)")
    args = parser.parse_args()

    conn = get_conn()

    try:
        if args.evaluar:
            imprimir_evaluacion(conn)
        elif args.nodo is not None:
            imprimir_nodo_detalle(conn, args.nodo)
        elif args.resumen is not None:
            resumen = generar_resumen_nodo(conn, args.resumen)
            print(json.dumps(resumen, indent=2, default=str, ensure_ascii=False))
        else:
            parser.print_help()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
