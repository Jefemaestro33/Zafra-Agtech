"""
alertas.py — Motor de reglas del sistema AgTech
Evalúa cada nodo contra umbrales, calcula Score Phytophthora v3,
y guarda eventos en la tabla eventos.

v3 (abril 2026): 10 factores, interacción saturación×temp, integra τ,
saturación dual, pesos calibrados, corrección gravimétrica.

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

from calibracion import corregir_lectura, get_calibracion, get_umbral

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [alertas] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("alertas")

# ============================================================
# CONFIGURACIÓN (fallbacks — se prefieren valores de calibracion.py)
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


def get_ultimo_tau(conn, nodo_id):
    """Obtiene el último tau_10 calculado para el nodo (de firma_hidrica)."""
    sql = """
        SELECT tau_10 FROM firma_hidrica
        WHERE nodo_id = %s AND tau_10 IS NOT NULL
        ORDER BY evento_riego DESC LIMIT 1
    """
    with conn.cursor() as cur:
        cur.execute(sql, (nodo_id,))
        row = cur.fetchone()
    return row[0] if row else None


def calcular_score_phytophthora(conn, nodo_id):
    """
    Score de riesgo Phytophthora cinnamomi v3 (0-100).
    10 factores + interacción multiplicativa.

    Cambios vs v2:
      - h20 pesa más que h10 (zona radicular)
      - Factor 8: τ estructura del suelo (integra firma hídrica)
      - Factor 9: saturación dual (ambas profundidades)
      - Factor 10: interacción saturación × temperatura (multiplicador ×1.3)
      - Umbrales desde calibracion.py (calibrados por predio)

    Retorna (score, desglose_dict).
    """
    ultima = get_ultima_lectura(conn, nodo_id)
    if not ultima:
        return 0, {"error": "sin lecturas"}

    cal = get_calibracion()

    # Aplicar corrección gravimétrica + temperatura
    t20_raw = ultima["t20"] or 0
    h10 = corregir_lectura(ultima["h10_avg"], t20_raw, 10) or 0
    h20 = corregir_lectura(ultima["h20_avg"], t20_raw, 20) or 0
    t20 = t20_raw

    umbral_sat = cal["vwc_saturacion"]
    umbral_mod = cal["vwc_capacidad_campo"] + 2  # ligeramente arriba de CC

    desglose = {}
    score = 0

    # Factor 1: Humedad 10cm (peso reducido — zona superficial)
    if h10 > umbral_sat:
        pts = 10
    elif h10 > umbral_mod:
        pts = 5
    else:
        pts = 0
    desglose["humedad_10cm"] = {"valor": round(h10, 2), "puntos": pts,
                                 "umbral": f">{umbral_sat:.0f}=10, >{umbral_mod:.0f}=5"}
    score += pts

    # Factor 2: Humedad 20cm (peso aumentado — zona radicular)
    if h20 > umbral_sat:
        pts = 20
    elif h20 > umbral_mod:
        pts = 10
    else:
        pts = 0
    desglose["humedad_20cm"] = {"valor": round(h20, 2), "puntos": pts,
                                 "umbral": f">{umbral_sat:.0f}=20, >{umbral_mod:.0f}=10"}
    score += pts

    # Factor 3: Temperatura suelo 20cm (óptimo P. cinnamomi)
    if 22 <= t20 <= 28:
        pts = 20
    elif 15 <= t20 < 22:
        pts = 10
    else:
        pts = 0
    desglose["temperatura_20cm"] = {"valor": round(t20, 2), "puntos": pts,
                                     "umbral": "22-28=20, 15-22=10"}
    score += pts

    # Factor 4: Horas húmedo continuas
    horas_humedo = calcular_horas_humedo(conn, nodo_id, umbral_vwc=umbral_mod)
    if horas_humedo > 72:
        pts = 15
    elif horas_humedo > 48:
        pts = 10
    elif horas_humedo > 24:
        pts = 5
    else:
        pts = 0
    desglose["horas_humedo"] = {"valor": horas_humedo, "puntos": pts,
                                 "umbral": ">72=15, >48=10, >24=5"}
    score += pts

    # Factor 5: Precipitación acumulada 7 días
    precip_7d = get_precip_acum_7d(conn)
    if precip_7d > 50:
        pts = 10
    elif precip_7d > 25:
        pts = 5
    else:
        pts = 0
    desglose["precip_7d"] = {"valor": round(precip_7d, 2), "puntos": pts,
                              "umbral": ">50=10, >25=5"}
    score += pts

    # Factor 6: Pronóstico lluvia 48h
    pronostico = get_pronostico_lluvia_48h(conn)
    if pronostico > 20:
        pts = 5
    else:
        pts = 0
    desglose["pronostico_48h"] = {"valor": round(pronostico, 2), "puntos": pts,
                                   "umbral": ">20mm=5"}
    score += pts

    # Factor 7: HR ambiente promedio 48h
    hr_48h = get_hr_promedio_48h(conn)
    if hr_48h > 80:
        pts = 5
    else:
        pts = 0
    desglose["hr_ambiente_48h"] = {"valor": round(hr_48h, 2), "puntos": pts,
                                    "umbral": ">80%=5"}
    score += pts

    # Factor 8 (NUEVO v3): τ estructura del suelo
    ultimo_tau = get_ultimo_tau(conn, nodo_id)
    tau_lento = cal.get("tau_lento", 24.0)
    tau_moderado = cal.get("tau_moderado", 18.0)
    if ultimo_tau is not None:
        if ultimo_tau > tau_lento:
            pts = 10
        elif ultimo_tau > tau_moderado:
            pts = 5
        else:
            pts = 0
        desglose["tau_estructura"] = {
            "valor": round(ultimo_tau, 2), "puntos": pts,
            "umbral": f">{tau_lento:.0f}h=10, >{tau_moderado:.0f}h=5"
        }
        score += pts
    else:
        desglose["tau_estructura"] = {"valor": None, "puntos": 0,
                                       "umbral": "sin datos de firma hídrica"}

    # Factor 9 (NUEVO v3): Saturación dual (ambas profundidades)
    if h10 > umbral_sat and h20 > umbral_sat:
        pts = 10
        desglose["saturacion_dual"] = {
            "valor": f"h10={h10:.1f}, h20={h20:.1f}", "puntos": pts,
            "umbral": f"ambos >{umbral_sat:.0f}"
        }
        score += pts
    else:
        desglose["saturacion_dual"] = {"valor": None, "puntos": 0,
                                        "umbral": f"ambos >{umbral_sat:.0f}"}

    # Factor 10 (NUEVO v3): Interacción saturación × temperatura
    es_saturado = (h10 > umbral_sat) or (h20 > umbral_sat)
    es_temp_optima = 22 <= t20 <= 28
    if es_saturado and es_temp_optima:
        bonus = int(score * 0.3)  # 30% bonus multiplicativo
        desglose["interaccion_sat_temp"] = {
            "valor": f"saturado={es_saturado}, temp_optima={es_temp_optima}",
            "puntos": bonus,
            "umbral": "×1.3 si saturación + 22-28°C"
        }
        score += bonus
    else:
        desglose["interaccion_sat_temp"] = {"valor": None, "puntos": 0,
                                             "umbral": "×1.3 si saturación + 22-28°C"}

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
    desglose["version"] = "v3"

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

    # Tratamientos recientes (NUEVO v2)
    tratamientos_recientes = []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT fecha, tipo, producto, cantidad, unidad
                FROM tratamientos WHERE nodo_id = %s
                ORDER BY fecha DESC LIMIT 5
            """, (nodo_id,))
            for t in cur.fetchall():
                tratamientos_recientes.append({
                    "fecha": str(t["fecha"]),
                    "tipo": t["tipo"],
                    "producto": t.get("producto"),
                    "cantidad": float(t["cantidad"]) if t.get("cantidad") else None,
                    "unidad": t.get("unidad"),
                })
    except Exception:
        pass

    # Balance hídrico (NUEVO v2)
    balance_info = None
    try:
        from balance_hidrico import calcular_balance
        balance_info = calcular_balance(conn, nodo_id)
    except Exception:
        pass

    # Diagnósticos previos (NUEVO v2)
    diagnosticos_previos = []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT tiempo, datos->'diagnostico_ia'->>'diagnostico' as dx
                FROM eventos
                WHERE nodo_id = %s AND procesado = TRUE
                  AND datos->'diagnostico_ia' IS NOT NULL
                ORDER BY tiempo DESC LIMIT 3
            """, (nodo_id,))
            for h in cur.fetchall():
                if h["dx"]:
                    diagnosticos_previos.append({
                        "fecha": str(h["tiempo"]),
                        "diagnostico": h["dx"],
                    })
    except Exception:
        pass

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
        "tratamientos_recientes": tratamientos_recientes,
        "balance_hidrico": balance_info,
        "diagnosticos_previos": diagnosticos_previos,
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
