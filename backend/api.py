"""
api.py — API REST para AgTech Sistema
FastAPI backend que sirve datos al dashboard React.

Uso:
  DATABASE_URL=postgresql://... uvicorn backend.api:app --reload --port 8000
  DATABASE_URL=postgresql://... python backend/api.py
"""
import os
import sys
import json
from datetime import datetime, timedelta
from contextlib import contextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import psycopg2
from psycopg2.extras import RealDictCursor

# Importar motor de alertas
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from alertas import (
    generar_resumen_nodo,
    calcular_score_phytophthora,
    evaluar_riego,
    evaluar_offline,
    evaluar_bateria,
    get_ultima_lectura,
    get_todos_nodos,
    get_tiempo_max_global,
)

# ============================================================
# APP
# ============================================================
app = FastAPI(
    title="AgTech Nextipac API",
    description="API REST para sistema de monitoreo IoT + IA para aguacate Hass",
    version="0.3",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.environ.get("DATABASE_URL", "")


# ============================================================
# DB HELPERS
# ============================================================
@contextmanager
def get_conn():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


def query(sql, params=None, one=False):
    """Execute query and return results as list of dicts."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
    if one:
        return dict(rows[0]) if rows else None
    return [dict(r) for r in rows]


def execute(sql, params=None):
    """Execute INSERT/UPDATE and commit."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()


def serialize(obj):
    """Convert datetimes and Decimals for JSON."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize(i) for i in obj]
    return obj


# ============================================================
# PYDANTIC MODELS (request bodies)
# ============================================================
class TratamientoCreate(BaseModel):
    nodo_id: int
    tipo: str
    producto: str
    cantidad: float
    unidad: str
    notas: Optional[str] = None


class MicrobiomaCreate(BaseModel):
    nodo_id: int
    profundidad: int = 15
    metodo: str
    target: str
    valor: float
    unidad: str
    notas: Optional[str] = None


# ============================================================
# PREDIOS
# ============================================================
@app.get("/api/predios")
def listar_predios():
    rows = query("SELECT * FROM predios ORDER BY predio_id")
    if not rows:
        return [
            {
                "predio_id": 1,
                "nombre": "Nextipac Piloto",
                "ubicacion": "Nextipac, Zapopan, Jalisco",
                "hectareas": 4.0,
                "tipo_suelo": "Andisol volcánico",
                "cultivo": "Aguacate Hass",
                "lat": 20.7005,
                "lon": -103.418,
            }
        ]
    return serialize(rows)


@app.get("/api/predios/{predio_id}/overview")
def overview_predio(predio_id: int):
    predio = query("SELECT * FROM predios WHERE predio_id = %s", (predio_id,), one=True)
    if not predio:
        raise HTTPException(404, f"Predio {predio_id} no encontrado")

    with get_conn() as conn:
        nodos = query(
            "SELECT * FROM nodos WHERE predio_id = %s ORDER BY nodo_id",
            (predio_id,),
        )
        tiempo_ref = get_tiempo_max_global(conn)

        nodos_info = []
        score_max = 0
        nodos_online = 0
        nodos_riego = 0

        for nodo in nodos:
            nid = nodo["nodo_id"]
            ultima = get_ultima_lectura(conn, nid)
            score, desglose = calcular_score_phytophthora(conn, nid)
            offline = evaluar_offline(conn, nid, tiempo_ref)
            riego = evaluar_riego(conn, nid)

            is_online = offline is None
            if is_online:
                nodos_online += 1
            if riego:
                nodos_riego += 1
            if score > score_max:
                score_max = score

            nodos_info.append(
                {
                    "nodo_id": nid,
                    "nombre": nodo["nombre"],
                    "rol": nodo["rol"],
                    "bloque": nodo["bloque"],
                    "lat": nodo.get("lat"),
                    "lon": nodo.get("lon"),
                    "online": is_online,
                    "score_phytophthora": score,
                    "nivel": desglose.get("nivel", "?"),
                    "ultima_lectura": serialize(dict(ultima)) if ultima else None,
                }
            )

        # ETo del día
        eto_dia = query(
            """
            SELECT COALESCE(SUM(eto), 0) as eto_total
            FROM clima
            WHERE tiempo >= (SELECT MAX(tiempo)::date FROM clima)
            """,
            one=True,
        )

    return {
        "predio": serialize(predio),
        "timestamp_referencia": str(tiempo_ref),
        "kpis": {
            "nodos_online": nodos_online,
            "nodos_total": len(nodos),
            "score_phytophthora_max": score_max,
            "nodos_necesitan_riego": nodos_riego,
            "eto_dia_mm": round(eto_dia["eto_total"], 2) if eto_dia else 0,
        },
        "nodos": nodos_info,
    }


# ============================================================
# NODOS
# ============================================================
@app.get("/api/predios/{predio_id}/nodos")
def listar_nodos_predio(predio_id: int):
    with get_conn() as conn:
        nodos = query(
            "SELECT * FROM nodos WHERE predio_id = %s ORDER BY nodo_id",
            (predio_id,),
        )
        if not nodos:
            raise HTTPException(404, f"No hay nodos para predio {predio_id}")

        tiempo_ref = get_tiempo_max_global(conn)
        result = []
        for nodo in nodos:
            nid = nodo["nodo_id"]
            ultima = get_ultima_lectura(conn, nid)
            score, desglose = calcular_score_phytophthora(conn, nid)
            offline = evaluar_offline(conn, nid, tiempo_ref)
            bat = evaluar_bateria(conn, nid)

            result.append(
                {
                    "nodo_id": nid,
                    "nombre": nodo["nombre"],
                    "rol": nodo["rol"],
                    "bloque": nodo["bloque"],
                    "lat": nodo.get("lat"),
                    "lon": nodo.get("lon"),
                    "online": offline is None,
                    "score_phytophthora": score,
                    "nivel": desglose.get("nivel"),
                    "bateria": float(ultima["bateria"]) if ultima and ultima["bateria"] else None,
                    "bateria_baja": bat is not None,
                    "ultima_lectura": serialize(dict(ultima)) if ultima else None,
                }
            )
    return result


@app.get("/api/nodos/{nodo_id}")
def detalle_nodo(nodo_id: int):
    with get_conn() as conn:
        resumen = generar_resumen_nodo(conn, nodo_id)
    if "error" in resumen:
        raise HTTPException(404, resumen["error"])
    return serialize(resumen)


@app.get("/api/nodos/{nodo_id}/lecturas")
def lecturas_nodo(
    nodo_id: int,
    desde: str = Query(None, description="Fecha inicio YYYY-MM-DD"),
    hasta: str = Query(None, description="Fecha fin YYYY-MM-DD"),
    intervalo: str = Query("5min", description="5min, 1h, o 1d"),
):
    # Defaults
    if not hasta:
        hasta_dt = datetime.now()
    else:
        hasta_dt = datetime.fromisoformat(hasta)
    if not desde:
        desde_dt = hasta_dt - timedelta(days=7)
    else:
        desde_dt = datetime.fromisoformat(desde)

    if intervalo == "5min":
        sql = """
            SELECT tiempo, h10_avg, h20_avg, h30_avg, t20, ec30, bateria, rssi
            FROM lecturas
            WHERE nodo_id = %s AND tiempo >= %s AND tiempo <= %s
            ORDER BY tiempo
        """
        rows = query(sql, (nodo_id, desde_dt, hasta_dt))
    elif intervalo == "1h":
        sql = """
            SELECT date_trunc('hour', tiempo) as tiempo,
                   ROUND(AVG(h10_avg)::numeric, 2) as h10_avg,
                   ROUND(AVG(h20_avg)::numeric, 2) as h20_avg,
                   ROUND(AVG(h30_avg)::numeric, 2) as h30_avg,
                   ROUND(AVG(t20)::numeric, 2) as t20,
                   ROUND(AVG(ec30)::numeric, 2) as ec30,
                   ROUND(AVG(bateria)::numeric, 2) as bateria,
                   ROUND(AVG(rssi)::numeric, 0) as rssi
            FROM lecturas
            WHERE nodo_id = %s AND tiempo >= %s AND tiempo <= %s
            GROUP BY date_trunc('hour', tiempo)
            ORDER BY tiempo
        """
        rows = query(sql, (nodo_id, desde_dt, hasta_dt))
    elif intervalo == "1d":
        sql = """
            SELECT date_trunc('day', tiempo) as tiempo,
                   ROUND(AVG(h10_avg)::numeric, 2) as h10_avg,
                   ROUND(AVG(h20_avg)::numeric, 2) as h20_avg,
                   ROUND(AVG(h30_avg)::numeric, 2) as h30_avg,
                   ROUND(AVG(t20)::numeric, 2) as t20,
                   ROUND(AVG(ec30)::numeric, 2) as ec30,
                   ROUND(AVG(bateria)::numeric, 2) as bateria,
                   ROUND(AVG(rssi)::numeric, 0) as rssi
            FROM lecturas
            WHERE nodo_id = %s AND tiempo >= %s AND tiempo <= %s
            GROUP BY date_trunc('day', tiempo)
            ORDER BY tiempo
        """
        rows = query(sql, (nodo_id, desde_dt, hasta_dt))
    else:
        raise HTTPException(400, f"Intervalo no soportado: {intervalo}. Usa 5min, 1h, o 1d")

    return {
        "nodo_id": nodo_id,
        "desde": str(desde_dt),
        "hasta": str(hasta_dt),
        "intervalo": intervalo,
        "total": len(rows),
        "datos": serialize(rows),
    }


# ============================================================
# FIRMA HÍDRICA
# ============================================================
@app.get("/api/predios/{predio_id}/firma")
def firma_predio(predio_id: int):
    rows = query(
        """
        SELECT f.* FROM firma_hidrica f
        JOIN nodos n ON f.nodo_id = n.nodo_id
        WHERE n.predio_id = %s
        ORDER BY f.evento_riego DESC
        LIMIT 50
        """,
        (predio_id,),
    )
    return serialize(rows)


@app.get("/api/nodos/{nodo_id}/firma")
def firma_nodo(nodo_id: int):
    rows = query(
        """
        SELECT * FROM firma_hidrica
        WHERE nodo_id = %s
        ORDER BY evento_riego DESC
        LIMIT 20
        """,
        (nodo_id,),
    )
    return serialize(rows)


# ============================================================
# COMPARATIVO
# ============================================================
@app.get("/api/predios/{predio_id}/comparativo")
def comparativo_predio(predio_id: int, dias: int = Query(30)):
    sql = """
        SELECT
            date_trunc('day', l.tiempo) as dia,
            n.bloque,
            n.rol,
            ROUND(AVG(l.h10_avg)::numeric, 2) as h10_avg,
            ROUND(AVG(l.h20_avg)::numeric, 2) as h20_avg,
            ROUND(AVG(l.h30_avg)::numeric, 2) as h30_avg,
            ROUND(AVG(l.t20)::numeric, 2) as t20,
            ROUND(AVG(l.ec30)::numeric, 2) as ec30
        FROM lecturas l
        JOIN nodos n ON l.nodo_id = n.nodo_id
        WHERE n.predio_id = %s
          AND l.tiempo >= (SELECT MAX(tiempo) FROM lecturas) - interval '%s days'
        GROUP BY dia, n.bloque, n.rol
        ORDER BY dia, n.bloque, n.rol
    """
    rows = query(sql, (predio_id, dias))

    # Agrupar por bloque y calcular deltas
    bloques = {}
    for r in rows:
        bloque = r["bloque"]
        dia = str(r["dia"])
        if bloque not in bloques:
            bloques[bloque] = {}
        if dia not in bloques[bloque]:
            bloques[bloque][dia] = {}
        bloques[bloque][dia][r["rol"]] = {
            "h10_avg": float(r["h10_avg"]) if r["h10_avg"] else None,
            "h20_avg": float(r["h20_avg"]) if r["h20_avg"] else None,
            "t20": float(r["t20"]) if r["t20"] else None,
        }

    resultado = []
    for bloque in sorted(bloques.keys()):
        dias_data = []
        for dia in sorted(bloques[bloque].keys()):
            d = bloques[bloque][dia]
            trat = d.get("tratamiento", {})
            test = d.get("testigo", {})
            delta_h10 = None
            if trat.get("h10_avg") is not None and test.get("h10_avg") is not None:
                delta_h10 = round(trat["h10_avg"] - test["h10_avg"], 2)
            dias_data.append(
                {
                    "dia": dia,
                    "tratamiento": trat,
                    "testigo": test,
                    "delta_h10": delta_h10,
                }
            )
        resultado.append({"bloque": bloque, "dias": dias_data})

    return resultado


# ============================================================
# CLIMA
# ============================================================
@app.get("/api/clima/actual")
def clima_actual():
    row = query(
        """
        SELECT tiempo, temp_ambiente, humedad_relativa, precipitacion,
               viento_vel, viento_dir, radiacion_solar, eto, precip_acum_7d
        FROM clima ORDER BY tiempo DESC LIMIT 1
        """,
        one=True,
    )
    if not row:
        raise HTTPException(404, "No hay datos de clima")

    # ETo del día
    eto_dia = query(
        """
        SELECT COALESCE(SUM(eto), 0) as total
        FROM clima WHERE tiempo >= %s::date
        """,
        (row["tiempo"],),
        one=True,
    )

    return {
        "ultima_lectura": serialize(row),
        "eto_dia_mm": round(float(eto_dia["total"]), 3) if eto_dia else 0,
    }


@app.get("/api/clima/historico")
def clima_historico(dias: int = Query(30)):
    rows = query(
        """
        SELECT tiempo, temp_ambiente, humedad_relativa, precipitacion,
               viento_vel, radiacion_solar, eto, precip_acum_7d
        FROM clima
        WHERE tiempo >= (SELECT MAX(tiempo) FROM clima) - interval '%s days'
        ORDER BY tiempo
        """,
        (dias,),
    )
    return {"dias": dias, "total": len(rows), "datos": serialize(rows)}


@app.get("/api/clima/pronostico")
def clima_pronostico():
    """Próximos 7 días. Usa datos futuros de la tabla si existen, si no intenta fetch live."""
    rows = query(
        """
        SELECT tiempo, temp_ambiente, humedad_relativa, precipitacion,
               viento_vel, radiacion_solar, eto
        FROM clima
        WHERE tiempo > (SELECT MAX(tiempo) FROM clima WHERE precipitacion IS NOT NULL)
        ORDER BY tiempo
        LIMIT 168
        """
    )

    if rows:
        return {"fuente": "tabla_clima", "total": len(rows), "datos": serialize(rows)}

    # Sin datos futuros, intentar fetch live
    try:
        from clima import fetch_clima_actual
        registros = fetch_clima_actual()
        # Filtrar solo futuros
        ahora = datetime.now().isoformat()
        futuros = [r for r in registros if r["tiempo"] > ahora]
        return {
            "fuente": "open-meteo_live",
            "total": len(futuros),
            "datos": futuros,
        }
    except Exception as e:
        return {
            "fuente": "no_disponible",
            "total": 0,
            "datos": [],
            "error": str(e),
        }


# ============================================================
# ALERTAS
# ============================================================
@app.get("/api/predios/{predio_id}/alertas")
def alertas_predio(predio_id: int, limit: int = Query(50)):
    rows = query(
        """
        SELECT e.id, e.tiempo, e.nodo_id, n.nombre, e.tipo, e.datos, e.procesado
        FROM eventos e
        JOIN nodos n ON e.nodo_id = n.nodo_id
        WHERE n.predio_id = %s
        ORDER BY e.tiempo DESC
        LIMIT %s
        """,
        (predio_id, limit),
    )
    return serialize(rows)


@app.get("/api/nodos/{nodo_id}/alertas")
def alertas_nodo(nodo_id: int, limit: int = Query(50)):
    rows = query(
        """
        SELECT id, tiempo, nodo_id, tipo, datos, procesado
        FROM eventos
        WHERE nodo_id = %s
        ORDER BY tiempo DESC
        LIMIT %s
        """,
        (nodo_id, limit),
    )
    return serialize(rows)


# ============================================================
# REGISTROS (POST)
# ============================================================
@app.post("/api/tratamientos")
def crear_tratamiento(t: TratamientoCreate):
    # Verificar nodo existe
    nodo = query("SELECT nodo_id FROM nodos WHERE nodo_id = %s", (t.nodo_id,), one=True)
    if not nodo:
        raise HTTPException(404, f"Nodo {t.nodo_id} no encontrado")

    execute(
        """
        INSERT INTO tratamientos (fecha, nodo_id, tipo, producto, cantidad, unidad, notas)
        VALUES (NOW(), %s, %s, %s, %s, %s, %s)
        """,
        (t.nodo_id, t.tipo, t.producto, t.cantidad, t.unidad, t.notas),
    )
    return {"status": "ok", "mensaje": f"Tratamiento registrado para nodo {t.nodo_id}"}


@app.post("/api/microbioma")
def crear_microbioma(m: MicrobiomaCreate):
    nodo = query("SELECT nodo_id FROM nodos WHERE nodo_id = %s", (m.nodo_id,), one=True)
    if not nodo:
        raise HTTPException(404, f"Nodo {m.nodo_id} no encontrado")

    # Capturar snapshot de sensores
    with get_conn() as conn:
        ultima = get_ultima_lectura(conn, m.nodo_id)

    h10 = float(ultima["h10_avg"]) if ultima and ultima["h10_avg"] else None
    h20 = float(ultima["h20_avg"]) if ultima and ultima["h20_avg"] else None
    h30 = float(ultima["h30_avg"]) if ultima and ultima["h30_avg"] else None
    t20 = float(ultima["t20"]) if ultima and ultima["t20"] else None
    ec30 = float(ultima["ec30"]) if ultima and ultima["ec30"] else None

    execute(
        """
        INSERT INTO microbioma
            (fecha_muestreo, nodo_id, profundidad, metodo, target, valor, unidad,
             h10_momento, h20_momento, h30_momento, t20_momento, ec30_momento, notas)
        VALUES (NOW(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            m.nodo_id, m.profundidad, m.metodo, m.target, m.valor, m.unidad,
            h10, h20, h30, t20, ec30, m.notas,
        ),
    )
    return {
        "status": "ok",
        "mensaje": f"Microbioma registrado para nodo {m.nodo_id}",
        "snapshot_sensores": {
            "h10": h10, "h20": h20, "h30": h30, "t20": t20, "ec30": ec30,
        },
    }


# ============================================================
# HEALTH
# ============================================================
@app.get("/api/health")
def health():
    try:
        row = query("SELECT COUNT(*) as n FROM lecturas", one=True)
        return {"status": "ok", "lecturas": row["n"]}
    except Exception as e:
        raise HTTPException(500, f"DB error: {e}")


# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.api:app", host="0.0.0.0", port=port, reload=True)
