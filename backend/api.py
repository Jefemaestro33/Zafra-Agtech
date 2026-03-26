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

from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
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
from comparativo import analizar_bloques as cusum_analizar_bloques
from modelo_microbioma import entrenar_todos as microbioma_entrenar, predecir_actual as microbioma_predecir, _modelos_cache as microbioma_cache
from llm_consultor import (
    diagnosticar_evento,
    generar_reporte_semanal,
    generar_reporte_agricultor,
    convertir_resumen_a_texto,
    consultar_llm_visual,
    parsear_diagnostico,
)
from auth import (
    autenticar_usuario,
    crear_token,
    verificar_token,
    LoginRequest,
    TokenResponse,
)
from config_alertas import (
    get_config as get_alert_config_data,
    update_config as update_alert_config,
    reset_config as reset_alert_config,
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


class DiagnosticoVisualRequest(BaseModel):
    imagen_base64: str
    nodo_id: int


# ============================================================
# AUTH
# ============================================================
@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = autenticar_usuario(req.usuario, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    token = crear_token(user["usuario"], user["rol"])
    return TokenResponse(
        token=token,
        usuario=user["usuario"],
        nombre=user["nombre"],
        rol=user["rol"],
        iniciales=user["iniciales"],
    )


@app.get("/api/auth/me")
def auth_me(user: dict = Depends(verificar_token)):
    return user


# ============================================================
# CONFIG ALERTAS
# ============================================================
@app.get("/api/config/alertas")
def config_alertas_get():
    return get_alert_config_data()


@app.put("/api/config/alertas/{section}")
def config_alertas_update(section: str, datos: dict):
    try:
        return update_alert_config(section, datos)
    except KeyError as e:
        raise HTTPException(400, str(e))


@app.post("/api/config/alertas/reset")
def config_alertas_reset():
    return reset_alert_config()


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
                "lat": 20.759661,
                "lon": -103.511879,
            }
        ]
    return serialize(rows)


@app.post("/api/predios")
def crear_predio(datos: dict):
    """Crea un nuevo predio."""
    required = ["nombre", "cultivo", "hectareas", "municipio"]
    for field in required:
        if field not in datos or not str(datos[field]).strip():
            return JSONResponse(status_code=400, content={"error": f"Campo obligatorio: {field}"})

    campos = ["nombre", "cultivo", "tipo_suelo", "hectareas", "municipio", "fecha_instalacion", "lat", "lon"]
    values_dict = {k: datos.get(k) for k in campos if k in datos}

    cols = ", ".join(values_dict.keys())
    placeholders = ", ".join(["%s"] * len(values_dict))
    values = list(values_dict.values())

    with get_conn() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    f"INSERT INTO predios ({cols}) VALUES ({placeholders}) RETURNING predio_id",
                    values,
                )
                predio_id = cur.fetchone()[0]
                conn.commit()
                return {"ok": True, "predio_id": predio_id, "nombre": datos["nombre"]}
            except Exception as e:
                conn.rollback()
                return JSONResponse(status_code=500, content={"error": str(e)})


@app.put("/api/predios/{predio_id}")
def actualizar_predio(predio_id: int, datos: dict):
    """Actualiza campos editables del predio."""
    campos_permitidos = ["nombre", "cultivo", "tipo_suelo", "hectareas", "municipio", "fecha_instalacion"]

    updates = {k: v for k, v in datos.items() if k in campos_permitidos}
    if not updates:
        raise HTTPException(400, "No se proporcionaron campos válidos")

    set_clause = ", ".join([f"{k} = %s" for k in updates.keys()])
    values = list(updates.values()) + [predio_id]

    try:
        execute(f"UPDATE predios SET {set_clause} WHERE predio_id = %s", values)
        return {"ok": True, "updated": updates}
    except Exception as e:
        raise HTTPException(500, f"Error al actualizar: {e}")


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

    # Add CUSUM analysis
    try:
        with get_conn() as conn2:
            cusum_results = cusum_analizar_bloques(conn2, predio_id, dias)
        cusum_by_bloque = {r["bloque"]: r for r in cusum_results}
        for item in resultado:
            cr = cusum_by_bloque.get(item["bloque"])
            if cr:
                item["cusum"] = {
                    "estado": cr["estado"],
                    "desde_dia": cr["desde_dia"],
                    "tipo": cr["tipo"],
                    "magnitud": cr["magnitud"],
                    "total_alarmas": cr["total_alarmas"],
                    "s_pos": cr["cusum_h10"]["s_pos"],
                    "s_neg": cr["cusum_h10"]["s_neg"],
                    "umbral_h": cr["cusum_h10"]["umbral_h"],
                    "alarmas": cr["cusum_h10"]["alarmas"],
                }
    except Exception as e:
        pass  # CUSUM is optional, don't break the endpoint

    return resultado


@app.post("/api/predios/{predio_id}/cusum")
def cusum_predio(predio_id: int, dias: int = Query(180)):
    with get_conn() as conn:
        resultados = cusum_analizar_bloques(conn, predio_id, dias)
    return {
        "bloques": [
            {
                "bloque": r["bloque"],
                "estado": r["estado"],
                "desde_dia": r["desde_dia"],
                "tipo": r["tipo"],
                "magnitud": r["magnitud"],
                "total_alarmas": r["total_alarmas"],
                "cusum_h10": {
                    "s_pos": r["cusum_h10"]["s_pos"],
                    "s_neg": r["cusum_h10"]["s_neg"],
                    "umbral_h": r["cusum_h10"]["umbral_h"],
                    "media_baseline": r["cusum_h10"]["media_baseline"],
                    "alarmas": r["cusum_h10"]["alarmas"],
                },
            }
            for r in resultados
        ]
    }


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
# MICROBIOMA (GET + predicción)
# ============================================================
@app.get("/api/microbioma/nodo/{nodo_id}")
def microbioma_nodo(nodo_id: int, limit: int = Query(20)):
    rows = query(
        """
        SELECT fecha_muestreo, target, valor, unidad, metodo,
               h10_momento, t20_momento, ec30_momento
        FROM microbioma WHERE nodo_id = %s
        ORDER BY fecha_muestreo DESC, target
        LIMIT %s
        """,
        (nodo_id, limit),
    )
    return serialize(rows)


@app.post("/api/microbioma/predecir/{nodo_id}")
def microbioma_predecir_endpoint(nodo_id: int):
    with get_conn() as conn:
        if not microbioma_cache:
            microbioma_entrenar(conn)
        resultado = microbioma_predecir(conn, nodo_id, microbioma_cache)
    if "error" in resultado:
        raise HTTPException(404, resultado["error"])
    return resultado


@app.get("/api/microbioma/modelo")
def microbioma_modelo_info():
    if not microbioma_cache:
        with get_conn() as conn:
            microbioma_entrenar(conn)
    return {
        target: {
            "r2": m["r2"],
            "mae": m["mae"],
            "feature_importance": m["feature_importance"],
        }
        for target, m in microbioma_cache.items()
        if m is not None
    }


# ============================================================
# LLM DIAGNÓSTICOS
# ============================================================
@app.post("/api/alertas/{evento_id}/diagnostico")
def diagnosticar_evento_endpoint(evento_id: int):
    with get_conn() as conn:
        diagnostico = diagnosticar_evento(conn, evento_id)
    if "error" in diagnostico:
        raise HTTPException(404, diagnostico["error"])
    return {"diagnostico": diagnostico, "evento_id": evento_id}


@app.post("/api/reportes/semanal")
def reporte_semanal_endpoint(predio_id: int = Query(1)):
    with get_conn() as conn:
        reporte = generar_reporte_semanal(conn, predio_id)
    return {"reporte": reporte}


@app.post("/api/reportes/agricultor")
def reporte_agricultor_endpoint(predio_id: int = Query(1)):
    with get_conn() as conn:
        reporte = generar_reporte_agricultor(conn, predio_id)
    return {"reporte": reporte}


@app.post("/api/diagnostico/visual")
def diagnostico_visual_endpoint(req: DiagnosticoVisualRequest):
    with get_conn() as conn:
        resumen = generar_resumen_nodo(conn, req.nodo_id)
    if "error" in resumen:
        raise HTTPException(404, resumen["error"])
    texto = convertir_resumen_a_texto(resumen)
    respuesta = consultar_llm_visual(req.imagen_base64, texto)
    diagnostico = parsear_diagnostico(respuesta)
    return {"diagnostico": diagnostico, "nodo_id": req.nodo_id}


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
# STATIC FILES (dashboard React build)
# ============================================================
# Try relative to backend/ (local dev), then relative to /app (Docker)
STATIC_DIR = Path(__file__).parent.parent / "dashboard" / "dist"
if not STATIC_DIR.is_dir():
    STATIC_DIR = Path("/app/dashboard/dist")
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{path:path}")
    def serve_spa(path: str):
        """Serve React SPA — any non-API route returns index.html."""
        file = STATIC_DIR / path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(STATIC_DIR / "index.html")


# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=True)
