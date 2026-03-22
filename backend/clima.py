"""
clima.py — Módulo de datos meteorológicos para AgTech Sistema
Consulta Open-Meteo API (gratuita, sin key) para Nextipac, Jalisco.
Calcula ETo (Penman-Monteith FAO simplificado) y precipitación acumulada 7d.

Modos:
  python clima.py --backfill   Descarga últimos 3 meses de datos históricos
  python clima.py              Modo daemon: consulta cada hora
"""
import os
import sys
import json
import time
import math
import argparse
import logging
from datetime import datetime, timedelta, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError

import psycopg2

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [clima] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("clima")

# ============================================================
# CONFIGURACIÓN
# ============================================================
LAT = 20.7005
LON = -103.418
TIMEZONE = "America/Mexico_City"
ALTITUD = 1560  # metros sobre nivel del mar, Nextipac

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
HOURLY_PARAMS = "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,shortwave_radiation"


def get_db_url():
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: Variable de entorno DATABASE_URL no definida.")
        print("Uso: DATABASE_URL=postgresql://... python clima.py [--backfill]")
        sys.exit(1)
    return url


# ============================================================
# OPEN-METEO API
# ============================================================
def _fetch_json(url):
    """Hace GET a una URL y retorna JSON parseado."""
    req = Request(url, headers={"User-Agent": "AgTech-Nextipac/0.2"})
    for intento in range(3):
        try:
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except URLError as e:
            log.warning(f"Intento {intento + 1} falló: {e}")
            if intento < 2:
                time.sleep(2 ** intento)
    raise RuntimeError(f"No se pudo conectar a {url} después de 3 intentos")


def fetch_clima_actual():
    """Consulta pronóstico/actual de Open-Meteo (últimas 24h + próximas 48h)."""
    url = (
        f"{FORECAST_URL}?"
        f"latitude={LAT}&longitude={LON}"
        f"&hourly={HOURLY_PARAMS}"
        f"&timezone={TIMEZONE}"
        f"&past_days=1"
    )
    data = _fetch_json(url)
    return _parsear_hourly(data)


def fetch_clima_historico(fecha_inicio, fecha_fin):
    """Consulta archivo histórico de Open-Meteo."""
    url = (
        f"{ARCHIVE_URL}?"
        f"latitude={LAT}&longitude={LON}"
        f"&hourly={HOURLY_PARAMS}"
        f"&timezone={TIMEZONE}"
        f"&start_date={fecha_inicio}"
        f"&end_date={fecha_fin}"
    )
    data = _fetch_json(url)
    return _parsear_hourly(data)


def _parsear_hourly(data):
    """Convierte respuesta de Open-Meteo en lista de dicts."""
    hourly = data.get("hourly", {})
    tiempos = hourly.get("time", [])
    registros = []
    for i, t in enumerate(tiempos):
        temp = hourly.get("temperature_2m", [None])[i]
        hr = hourly.get("relative_humidity_2m", [None])[i]
        precip = hourly.get("precipitation", [None])[i]
        viento = hourly.get("wind_speed_10m", [None])[i]
        viento_dir = hourly.get("wind_direction_10m", [None])[i]
        rad = hourly.get("shortwave_radiation", [None])[i]

        # Saltar si faltan datos críticos
        if temp is None or hr is None:
            continue

        # Convertir viento de km/h a m/s
        viento_ms = viento / 3.6 if viento is not None else None

        eto = calcular_eto(temp, hr, viento_ms, rad)

        registros.append({
            "tiempo": t,
            "temp_ambiente": temp,
            "humedad_relativa": hr,
            "precipitacion": precip if precip is not None else 0.0,
            "viento_vel": round(viento_ms, 2) if viento_ms is not None else None,
            "viento_dir": viento_dir,
            "radiacion_solar": rad,
            "eto": eto,
            "fuente": "open-meteo",
        })
    return registros


# ============================================================
# CÁLCULO DE ETo — Penman-Monteith simplificado FAO
# ============================================================
def calcular_eto(temp, hr, viento_ms, radiacion_wm2):
    """
    ETo horaria simplificada basada en FAO-56 Hargreaves.
    Para datos horarios sin temp_max/min, usamos la fórmula
    de radiación directa:
      ETo = 0.0036 * Rs * (temp + 17.8) / lambda
    donde Rs es radiación solar en MJ/m²/h.

    Retorna mm/hora.
    """
    if radiacion_wm2 is None or radiacion_wm2 <= 0:
        return 0.0

    # Convertir W/m² a MJ/m²/hora
    # 1 W/m² = 0.0036 MJ/m²/h
    rs_mj = radiacion_wm2 * 0.0036

    # Calor latente de vaporización (MJ/kg)
    lam = 2.501 - 0.002361 * temp

    # ETo por método de radiación simplificado
    # Coeficiente ajustado para zona subtropical
    eto = 0.0135 * rs_mj * (temp + 17.8) / lam

    # Ajuste por humedad relativa (reduce ETo con HR alta)
    if hr is not None and hr > 60:
        eto *= (1.0 - 0.003 * (hr - 60))

    # Ajuste por viento
    if viento_ms is not None and viento_ms > 0:
        eto *= (1.0 + 0.04 * min(viento_ms, 5.0))

    return round(max(0.0, eto), 4)


# ============================================================
# BASE DE DATOS
# ============================================================
def calcular_precip_acumulada_7d(conn, timestamp):
    """Suma precipitación de los últimos 7 días desde la tabla clima."""
    sql = """
        SELECT COALESCE(SUM(precipitacion), 0)
        FROM clima
        WHERE tiempo >= %s::timestamptz - interval '7 days'
          AND tiempo < %s::timestamptz
    """
    with conn.cursor() as cur:
        cur.execute(sql, (timestamp, timestamp))
        return round(cur.fetchone()[0], 2)


def insertar_clima(conn, registros):
    """Inserta registros en la tabla clima. Ignora duplicados por tiempo."""
    sql = """
        INSERT INTO clima
            (tiempo, temp_ambiente, humedad_relativa, precipitacion,
             viento_vel, viento_dir, radiacion_solar, eto, precip_acum_7d, fuente)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """
    insertados = 0
    with conn.cursor() as cur:
        for r in registros:
            precip_7d = calcular_precip_acumulada_7d(conn, r["tiempo"])
            try:
                cur.execute(sql, (
                    r["tiempo"], r["temp_ambiente"], r["humedad_relativa"],
                    r["precipitacion"], r["viento_vel"], r["viento_dir"],
                    r["radiacion_solar"], r["eto"], precip_7d, r["fuente"],
                ))
                insertados += 1
            except psycopg2.errors.UniqueViolation:
                conn.rollback()
                continue
    conn.commit()
    return insertados


def insertar_clima_batch(conn, registros):
    """
    Inserción en batch para backfill. Más rápido que uno por uno.
    Calcula precip_acum_7d con una pasada sobre los propios datos.
    """
    # Primero insertar sin precip_acum_7d, luego actualizar
    sql_insert = """
        INSERT INTO clima
            (tiempo, temp_ambiente, humedad_relativa, precipitacion,
             viento_vel, viento_dir, radiacion_solar, eto, precip_acum_7d, fuente)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    insertados = 0
    with conn.cursor() as cur:
        for r in registros:
            try:
                cur.execute(sql_insert, (
                    r["tiempo"], r["temp_ambiente"], r["humedad_relativa"],
                    r["precipitacion"], r["viento_vel"], r["viento_dir"],
                    r["radiacion_solar"], r["eto"], 0.0, r["fuente"],
                ))
                insertados += 1
            except psycopg2.errors.UniqueViolation:
                conn.rollback()
    conn.commit()

    # Actualizar precip_acum_7d con window function
    sql_update = """
        UPDATE clima SET precip_acum_7d = sub.acum
        FROM (
            SELECT tiempo,
                   COALESCE(SUM(precipitacion) OVER (
                       ORDER BY tiempo
                       RANGE BETWEEN interval '7 days' PRECEDING AND interval '1 second' PRECEDING
                   ), 0) as acum
            FROM clima
        ) sub
        WHERE clima.tiempo = sub.tiempo
    """
    with conn.cursor() as cur:
        cur.execute(sql_update)
    conn.commit()

    return insertados


# ============================================================
# MODO BACKFILL
# ============================================================
def backfill(conn, meses=3):
    """Descarga datos históricos de los últimos N meses."""
    hoy = datetime.now()
    fecha_fin = (hoy - timedelta(days=1)).strftime("%Y-%m-%d")
    fecha_inicio = (hoy - timedelta(days=meses * 30)).strftime("%Y-%m-%d")

    log.info(f"Backfill: {fecha_inicio} → {fecha_fin}")
    log.info(f"Coordenadas: {LAT}, {LON} (Nextipac, Jalisco)")

    # Descargar en chunks de 30 días (límite de la API archive)
    total_insertados = 0
    inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d")
    fin = datetime.strptime(fecha_fin, "%Y-%m-%d")

    while inicio < fin:
        chunk_fin = min(inicio + timedelta(days=29), fin)
        f1 = inicio.strftime("%Y-%m-%d")
        f2 = chunk_fin.strftime("%Y-%m-%d")

        log.info(f"  Descargando {f1} → {f2}...")
        registros = fetch_clima_historico(f1, f2)
        log.info(f"  {len(registros)} registros obtenidos")

        if registros:
            insertados = insertar_clima_batch(conn, registros)
            total_insertados += insertados
            log.info(f"  {insertados} insertados")

        inicio = chunk_fin + timedelta(days=1)
        time.sleep(0.5)  # rate limit cortesía

    return total_insertados


# ============================================================
# MODO DAEMON
# ============================================================
def daemon(conn):
    """Consulta Open-Meteo cada hora e inserta datos nuevos."""
    log.info("Modo daemon iniciado. Consultando cada hora.")
    while True:
        try:
            registros = fetch_clima_actual()
            if registros:
                insertados = insertar_clima(conn, registros)
                log.info(f"Ciclo completado: {insertados} registros nuevos de {len(registros)} obtenidos")
            else:
                log.warning("No se obtuvieron registros de la API")
        except Exception as e:
            log.error(f"Error en ciclo: {e}")

        # Dormir 1 hora
        time.sleep(3600)


# ============================================================
# ESTADÍSTICAS
# ============================================================
def mostrar_stats(conn):
    """Muestra estadísticas de la tabla clima."""
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM clima")
    total = cur.fetchone()[0]

    cur.execute("SELECT MIN(tiempo), MAX(tiempo) FROM clima")
    min_t, max_t = cur.fetchone()

    print(f"\n{'=' * 60}")
    print(f"ESTADÍSTICAS TABLA CLIMA")
    print(f"{'=' * 60}")
    print(f"  Total registros:  {total:,}")
    print(f"  Rango:            {min_t} → {max_t}")

    if total == 0:
        return

    # Stats del último mes
    cur.execute("""
        SELECT
            ROUND(AVG(temp_ambiente)::numeric, 1) as temp_prom,
            ROUND(MIN(temp_ambiente)::numeric, 1) as temp_min,
            ROUND(MAX(temp_ambiente)::numeric, 1) as temp_max,
            ROUND(SUM(precipitacion)::numeric, 1) as precip_total,
            ROUND(AVG(eto)::numeric, 4) as eto_prom,
            ROUND(AVG(humedad_relativa)::numeric, 1) as hr_prom,
            ROUND(AVG(viento_vel)::numeric, 2) as viento_prom,
            COUNT(*) as registros
        FROM clima
        WHERE tiempo >= (SELECT MAX(tiempo) FROM clima) - interval '30 days'
    """)
    r = cur.fetchone()
    print(f"\n  Último mes:")
    print(f"    Temperatura:  {r[0]}°C promedio (min {r[1]}°C, max {r[2]}°C)")
    print(f"    Precipitación total: {r[3]} mm")
    print(f"    ETo promedio: {r[4]} mm/h")
    print(f"    Humedad relativa: {r[5]}%")
    print(f"    Viento promedio: {r[6]} m/s")
    print(f"    Registros: {r[7]:,}")

    # Muestra de datos recientes
    cur.execute("""
        SELECT tiempo, temp_ambiente, humedad_relativa, precipitacion, eto, precip_acum_7d
        FROM clima
        ORDER BY tiempo DESC
        LIMIT 5
    """)
    print(f"\n  Últimos 5 registros:")
    print(f"  {'Tiempo':25s}  {'Temp':>5}  {'HR%':>4}  {'Precip':>6}  {'ETo':>6}  {'P7d':>6}")
    print(f"  {'-' * 60}")
    for r in cur.fetchall():
        print(f"  {str(r[0]):25s}  {r[1]:>5.1f}  {r[2]:>4.0f}  {r[3]:>6.1f}  {r[4]:>6.4f}  {r[5]:>6.1f}")

    cur.close()


# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="AgTech Clima — Open-Meteo → PostgreSQL")
    parser.add_argument("--backfill", action="store_true", help="Descargar últimos 3 meses de datos históricos")
    parser.add_argument("--meses", type=int, default=3, help="Meses de backfill (default: 3)")
    parser.add_argument("--stats", action="store_true", help="Mostrar estadísticas")
    args = parser.parse_args()

    db_url = get_db_url()
    conn = psycopg2.connect(db_url)

    try:
        if args.backfill:
            total = backfill(conn, meses=args.meses)
            log.info(f"Backfill completado: {total:,} registros insertados")
            mostrar_stats(conn)
        elif args.stats:
            mostrar_stats(conn)
        else:
            daemon(conn)
    except KeyboardInterrupt:
        log.info("Detenido por el usuario.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
