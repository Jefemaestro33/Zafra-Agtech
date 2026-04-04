"""
balance_hidrico.py — Programación de riego prescriptiva
Combina: ETo (clima.py) + VWC (lecturas) + calibración → receta de riego.

En vez de "no riegues hoy", genera: "riega 540 litros/árbol mañana a las 6am".

CLI:
  python balance_hidrico.py --receta 1      Receta de riego para predio 1
  python balance_hidrico.py --nodo 3        Balance hídrico del nodo 3
  python balance_hidrico.py --resumen 1     Resumen de todos los nodos del predio
"""
import os
import sys
import json
import argparse
import logging
from datetime import datetime, timedelta
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

from calibracion import corregir_lectura, get_calibracion

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [balance] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("balance")

DATABASE_URL = os.environ.get("DATABASE_URL", "")

# ============================================================
# Kc MENSUAL — Coeficiente de cultivo para aguacate Hass
# Fuente: FAO-56, Carr 2013, ajustado para Jalisco
# ============================================================
KC_AGUACATE = {
    1: 0.60, 2: 0.60,   # Ene-Feb: reposo / inicio floración
    3: 0.70, 4: 0.70,   # Mar-Abr: floración plena / cuajado
    5: 0.80, 6: 0.80,   # May-Jun: desarrollo de fruto
    7: 0.85, 8: 0.85,   # Jul-Ago: llenado de fruto (pico demanda)
    9: 0.75, 10: 0.75,  # Sep-Oct: maduración
    11: 0.60, 12: 0.60, # Nov-Dic: post-cosecha / reposo
}

# Marco de plantación típico (m × m) para calcular litros/árbol
MARCO_PLANTACION_M2 = 36  # 6m × 6m


@contextmanager
def get_conn():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


# ============================================================
# QUERIES
# ============================================================
def get_ultima_lectura(conn, nodo_id):
    sql = """
        SELECT tiempo, h10_avg, h20_avg, h30_avg, t20, ec30, bateria
        FROM lecturas WHERE nodo_id = %s
        ORDER BY tiempo DESC LIMIT 1
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, (nodo_id,))
        return cur.fetchone()


def get_nodos_predio(conn, predio_id=1):
    sql = """
        SELECT nodo_id, nombre, rol, bloque FROM nodos
        WHERE predio_id = %s OR %s IS NULL
        ORDER BY nodo_id
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, (predio_id, predio_id))
        return cur.fetchall()


def get_eto_acumulado_hoy(conn):
    """ETo acumulado del día actual (mm)."""
    sql = """
        SELECT COALESCE(SUM(eto), 0)
        FROM clima
        WHERE tiempo::date = (SELECT MAX(tiempo)::date FROM clima)
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        return float(cur.fetchone()[0])


def get_eto_promedio_diario(conn, dias=7):
    """ETo promedio diario de los últimos N días (mm/día)."""
    sql = """
        SELECT COALESCE(SUM(eto) / GREATEST(COUNT(DISTINCT tiempo::date), 1), 0)
        FROM clima
        WHERE tiempo >= (SELECT MAX(tiempo) FROM clima) - interval '%s days'
    """
    with conn.cursor() as cur:
        cur.execute(sql, (dias,))
        return float(cur.fetchone()[0])


def get_pronostico_lluvia_48h(conn):
    """Precipitación esperada en próximas 48h."""
    sql = """
        SELECT COALESCE(SUM(precipitacion), 0)
        FROM clima
        WHERE tiempo > (SELECT MAX(tiempo) FROM clima)
          AND tiempo <= (SELECT MAX(tiempo) FROM clima) + interval '48 hours'
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        return float(cur.fetchone()[0])


def get_ultimo_riego(conn, predio_id=1):
    """Fecha y datos del último riego registrado."""
    sql = """
        SELECT tiempo, metodo, volumen_litros, mm_estimados, zona
        FROM riegos
        WHERE predio_id = %s
        ORDER BY tiempo DESC LIMIT 1
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        try:
            cur.execute(sql, (predio_id,))
            return cur.fetchone()
        except psycopg2.errors.UndefinedTable:
            # Tabla riegos aún no existe
            conn.rollback()
            return None


# ============================================================
# CÁLCULO DE BALANCE
# ============================================================
def calcular_balance(conn, nodo_id, predio="nextipac"):
    """
    Calcula balance hídrico actual y genera receta de riego.

    Retorna dict con:
      - estado del suelo (VWC promedio, fracción disponible)
      - datos climáticos (ETo, lluvia pronosticada)
      - receta de riego (qué hacer, cuándo, cuántos litros)
    """
    cal = get_calibracion(predio)

    # 1. Obtener VWC actual (corregido)
    ultima = get_ultima_lectura(conn, nodo_id)
    if not ultima:
        return {"error": f"Sin lecturas para nodo {nodo_id}"}

    t20 = ultima["t20"] or 22.0
    h10 = corregir_lectura(ultima["h10_avg"], t20, 10, predio) or 0
    h20 = corregir_lectura(ultima["h20_avg"], t20, 20, predio) or 0
    h30 = corregir_lectura(ultima["h30_avg"], t20, 30, predio) or 0

    # 2. VWC promedio ponderado (h20 pesa más — zona radicular)
    vwc_promedio = h10 * 0.3 + h20 * 0.4 + h30 * 0.3

    # 3. Agua disponible en mm
    vwc_pm = cal["vwc_marchitez"]
    vwc_cc = cal["vwc_capacidad_campo"]
    prof_mm = cal["profundidad_raiz_mm"]

    agua_actual = max(0, (vwc_promedio - vwc_pm) / 100 * prof_mm)
    agua_util_total = cal["agua_util_mm"]
    fraccion = agua_actual / agua_util_total if agua_util_total > 0 else 0
    fraccion = min(max(fraccion, 0), 1.5)  # cap at 150% (sobre CC)

    # 4. Clima
    eto_hoy = get_eto_acumulado_hoy(conn)
    eto_diario = get_eto_promedio_diario(conn)
    lluvia_48h = get_pronostico_lluvia_48h(conn)

    mes = datetime.now().month
    kc = KC_AGUACATE[mes]
    etc_diario = eto_diario * kc  # ETc = consumo real del aguacate

    # 5. Último riego
    ultimo_riego = get_ultimo_riego(conn)

    resultado = {
        "nodo_id": nodo_id,
        "timestamp": str(datetime.now()),
        "h10_corregido": round(h10, 1),
        "h20_corregido": round(h20, 1),
        "h30_corregido": round(h30, 1),
        "vwc_promedio": round(vwc_promedio, 1),
        "agua_disponible_mm": round(agua_actual, 1),
        "agua_util_total_mm": round(agua_util_total, 1),
        "fraccion_disponible": round(fraccion, 2),
        "eto_hoy_mm": round(eto_hoy, 1),
        "eto_diario_promedio_mm": round(eto_diario, 1),
        "etc_diario_mm": round(etc_diario, 1),
        "kc": kc,
        "mes": mes,
        "lluvia_pronostico_48h_mm": round(lluvia_48h, 1),
        "ultimo_riego": str(ultimo_riego["tiempo"]) if ultimo_riego else None,
        "umbrales": {
            "saturacion": cal["vwc_saturacion"],
            "capacidad_campo": vwc_cc,
            "punto_riego": cal["vwc_punto_riego"],
            "marchitez": vwc_pm,
        },
    }

    # ============================================================
    # DECISIÓN DE RIEGO
    # ============================================================

    # Regla 1: Suelo sobre capacidad de campo → NO REGAR
    if vwc_promedio > vwc_cc:
        exceso_sobre_pr = vwc_promedio - cal["vwc_punto_riego"]
        dias_espera = exceso_sobre_pr / (etc_diario if etc_diario > 0 else 2.0)
        resultado["receta"] = "NO_REGAR"
        resultado["razon"] = (
            f"Suelo a {vwc_promedio:.0f}% VWC, arriba de capacidad de campo "
            f"({vwc_cc:.0f}%). Riesgo de saturación si se riega."
        )
        resultado["urgencia"] = "ninguna"
        resultado["proxima_revision_dias"] = max(1, int(dias_espera))
        return resultado

    # Regla 2: Lluvia pronosticada significativa → ESPERAR
    if lluvia_48h > 10 and fraccion > 0.30:
        resultado["receta"] = "ESPERAR_LLUVIA"
        resultado["razon"] = (
            f"Pronóstico de {lluvia_48h:.0f}mm en próximas 48h. "
            f"Suelo al {fraccion*100:.0f}% — puede esperar."
        )
        resultado["urgencia"] = "baja"
        return resultado

    # Regla 3: Agua disponible < 40% → REGAR
    if fraccion < 0.40:
        deficit_mm = (vwc_cc - vwc_promedio) / 100 * prof_mm
        deficit_mm = max(deficit_mm, 0)
        litros_arbol = deficit_mm * MARCO_PLANTACION_M2
        resultado["receta"] = "REGAR"
        resultado["riego_mm"] = round(deficit_mm, 0)
        resultado["litros_por_arbol"] = round(litros_arbol, 0)
        resultado["cuando"] = "mañana 6:00-8:00 AM"
        resultado["razon"] = (
            f"Agua útil al {fraccion*100:.0f}%. "
            f"Necesita {deficit_mm:.0f}mm para llegar a capacidad de campo. "
            f"Equivale a ~{litros_arbol:.0f} litros por árbol."
        )
        resultado["urgencia"] = "alta" if fraccion < 0.25 else "media"
        return resultado

    # Regla 4: Agua disponible 40-60% → MONITOREAR
    dias_hasta_riego = (fraccion - 0.40) * agua_util_total / (etc_diario if etc_diario > 0 else 2.0)
    resultado["receta"] = "MONITOREAR"
    resultado["razon"] = (
        f"Agua útil al {fraccion*100:.0f}%. "
        f"Consumo diario estimado: {etc_diario:.1f}mm. "
        f"Regar en ~{max(1, int(dias_hasta_riego))} días si no llueve."
    )
    resultado["urgencia"] = "ninguna"
    resultado["proxima_revision_dias"] = max(1, int(dias_hasta_riego))
    return resultado


# ============================================================
# RESUMEN DE PREDIO
# ============================================================
def resumen_predio(conn, predio_id=1, predio="nextipac"):
    """Balance hídrico de todos los nodos del predio."""
    nodos = get_nodos_predio(conn, predio_id)
    if not nodos:
        nodos = get_nodos_predio(conn, None)

    resultados = []
    for nodo in nodos:
        balance = calcular_balance(conn, nodo["nodo_id"], predio)
        balance["nombre"] = nodo["nombre"]
        balance["rol"] = nodo["rol"]
        resultados.append(balance)

    # Receta consolidada (el nodo más seco determina la urgencia)
    recetas = [r for r in resultados if "receta" in r]
    if any(r["receta"] == "REGAR" for r in recetas):
        urgentes = [r for r in recetas if r["receta"] == "REGAR"]
        consolidado = "REGAR"
        mm_max = max(r.get("riego_mm", 0) for r in urgentes)
        litros_max = max(r.get("litros_por_arbol", 0) for r in urgentes)
    elif any(r["receta"] == "ESPERAR_LLUVIA" for r in recetas):
        consolidado = "ESPERAR_LLUVIA"
        mm_max = 0
        litros_max = 0
    else:
        consolidado = "NO_REGAR"
        mm_max = 0
        litros_max = 0

    return {
        "predio_id": predio_id,
        "timestamp": str(datetime.now()),
        "nodos": resultados,
        "receta_consolidada": consolidado,
        "riego_mm_recomendado": mm_max,
        "litros_por_arbol_recomendado": litros_max,
    }


# ============================================================
# MENSAJES WHATSAPP
# ============================================================
def generar_receta_whatsapp(resultado):
    """Convierte resultado del balance en mensaje para WhatsApp (max 5 líneas)."""
    r = resultado
    if "error" in r:
        return f"Error: {r['error']}"

    receta = r.get("receta", "MONITOREAR")

    if receta == "REGAR":
        return (
            f"Riego para mañana:\n"
            f"Aplicar {r.get('litros_por_arbol', '?')} litros por árbol "
            f"entre 6 y 8 de la mañana.\n"
            f"El suelo tiene {r['fraccion_disponible']*100:.0f}% de agua disponible.\n"
            f"No volver a regar hasta nueva indicación."
        )
    elif receta == "ESPERAR_LLUVIA":
        return (
            f"No regar por ahora.\n"
            f"Se esperan {r['lluvia_pronostico_48h_mm']:.0f}mm de lluvia "
            f"en las próximas 48 horas.\n"
            f"Si llueve bien, no será necesario regar."
        )
    elif receta == "NO_REGAR":
        dias = r.get("proxima_revision_dias", 2)
        return (
            f"No regar.\n"
            f"El suelo todavía tiene suficiente agua "
            f"({r['vwc_promedio']:.0f}% humedad).\n"
            f"Revisar en {dias} días."
        )
    else:  # MONITOREAR
        dias = r.get("proxima_revision_dias", 2)
        return (
            f"Riego no urgente.\n"
            f"Suelo al {r['fraccion_disponible']*100:.0f}% de agua disponible.\n"
            f"Próximo riego estimado en {dias} días si no llueve."
        )


def generar_receta_predio_whatsapp(resumen):
    """Mensaje consolidado para todo el predio."""
    r = resumen
    receta = r["receta_consolidada"]

    if receta == "REGAR":
        return (
            f"Buenos días. Receta de riego:\n"
            f"Aplicar ~{r['litros_por_arbol_recomendado']} litros/árbol "
            f"mañana entre 6 y 8 AM.\n"
            f"No regar de nuevo hasta nueva indicación."
        )
    elif receta == "ESPERAR_LLUVIA":
        return "Buenos días. No regar hoy — se espera lluvia en las próximas 48h."
    else:
        return "Buenos días. No regar hoy. El suelo tiene suficiente agua."


# ============================================================
# CLI
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="AgTech Balance Hídrico — Receta de riego")
    parser.add_argument("--receta", type=int, metavar="PREDIO_ID",
                        help="Receta consolidada del predio")
    parser.add_argument("--nodo", type=int, metavar="NODO_ID",
                        help="Balance hídrico de un nodo")
    parser.add_argument("--resumen", type=int, metavar="PREDIO_ID",
                        help="Resumen de todos los nodos")
    args = parser.parse_args()

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no configurada")
        sys.exit(1)

    with get_conn() as conn:
        if args.nodo is not None:
            resultado = calcular_balance(conn, args.nodo)
            print(json.dumps(resultado, indent=2, default=str, ensure_ascii=False))
            print(f"\n--- MENSAJE WHATSAPP ---\n{generar_receta_whatsapp(resultado)}")

        elif args.receta is not None or args.resumen is not None:
            predio_id = args.receta or args.resumen
            resumen = resumen_predio(conn, predio_id)
            print(json.dumps(resumen, indent=2, default=str, ensure_ascii=False))
            print(f"\n--- MENSAJE WHATSAPP ---\n{generar_receta_predio_whatsapp(resumen)}")

        else:
            parser.print_help()


if __name__ == "__main__":
    main()
