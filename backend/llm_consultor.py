"""
llm_consultor.py — Agente 2: Consultor Experto LLM
Toma resúmenes del motor de alertas y genera diagnósticos accionables
usando Claude API (Anthropic).

CLI:
  python llm_consultor.py --diagnostico 3          Diagnóstico del nodo 3
  python llm_consultor.py --evento 42              Diagnostica evento #42 y guarda en DB
  python llm_consultor.py --reporte-semanal        Reporte semanal (predio 1)
  python llm_consultor.py --reporte-agricultor     Versión WhatsApp (predio 1)
"""
import os
import sys
import json
import time
import re
import argparse
import logging
from datetime import datetime, timedelta
from contextlib import contextmanager
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

# Importar motor de alertas (mismo directorio)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from alertas import (
    generar_resumen_nodo,
    calcular_score_phytophthora,
    get_todos_nodos,
    get_tiempo_max_global,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [llm] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("llm")

DATABASE_URL = os.environ.get("DATABASE_URL", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
MODEL = "claude-sonnet-4-5"
PROMPTS_DIR = Path(__file__).parent / "prompts"


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
# 1. CARGAR PROMPTS
# ============================================================
def cargar_prompt(tipo):
    """Carga backend/prompts/{tipo}.txt"""
    path = PROMPTS_DIR / f"{tipo}.txt"
    if not path.exists():
        log.warning(f"Prompt no encontrado: {path}")
        return f"Eres un agrónomo experto en aguacate Hass. Analiza los datos y da recomendaciones."
    return path.read_text(encoding="utf-8").strip()


# ============================================================
# 2. CONVERTIR RESUMEN A TEXTO
# ============================================================
def convertir_resumen_a_texto(resumen):
    """Convierte el dict de generar_resumen_nodo() en texto plano para el LLM."""
    lines = []

    lines.append(f"=== NODO {resumen['nodo_id']} — {resumen['nombre']} ===")
    lines.append(f"Rol: {resumen['rol']} | Bloque: {resumen['bloque']}")
    lines.append(f"Evaluación: {resumen['timestamp_evaluacion']}")

    # Última lectura
    u = resumen.get("ultima_lectura")
    if u:
        lines.append(f"\nÚLTIMA LECTURA ({u.get('tiempo', '?')}):")
        lines.append(f"  Humedad 10cm: {u.get('h10_avg', '?')}% VWC")
        lines.append(f"  Humedad 20cm: {u.get('h20_avg', '?')}% VWC")
        lines.append(f"  Humedad 30cm: {u.get('h30_avg', '?')}% VWC")
        lines.append(f"  Temperatura 20cm: {u.get('t20', '?')}°C")
        lines.append(f"  EC 30cm: {u.get('ec30', '?')} dS/m")
        lines.append(f"  Batería: {u.get('bateria', '?')}V")
        lines.append(f"  RSSI: {u.get('rssi', '?')} dBm")

    # Score Phytophthora
    sc = resumen.get("score_phytophthora", {})
    lines.append(f"\nSCORE PHYTOPHTHORA: {sc.get('score', '?')}/100 — {sc.get('nivel', '?')}")
    desglose = sc.get("desglose", {})
    for key in ["humedad_10cm", "humedad_20cm", "temperatura_20cm",
                 "horas_humedo", "precip_7d", "pronostico_48h", "hr_ambiente_48h"]:
        d = desglose.get(key)
        if d:
            lines.append(f"  {key}: {d['valor']} → +{d['puntos']} pts ({d['umbral']})")

    # Tendencia 24h
    t = resumen.get("tendencia_24h")
    if t:
        lines.append(f"\nTENDENCIA 24H:")
        lines.append(f"  h10 cambio: {t.get('h10_cambio', '?')}%")
        lines.append(f"  h10 promedio: {t.get('h10_promedio_24h', '?')}% (min {t.get('h10_min_24h', '?')}%, max {t.get('h10_max_24h', '?')}%)")
        lines.append(f"  t20 cambio: {t.get('t20_cambio', '?')}°C")

    # Clima
    c = resumen.get("clima")
    if c:
        lines.append(f"\nCLIMA (últimas 24h):")
        lines.append(f"  Temp ambiente promedio: {c.get('temp_prom', '?')}°C")
        lines.append(f"  HR promedio: {c.get('hr_prom', '?')}%")
        lines.append(f"  Precipitación 24h: {c.get('precip_24h', '?')} mm")
        lines.append(f"  Precipitación acumulada 7d: {c.get('precip_acum_7d', '?')} mm")

    # Alertas activas
    alertas = resumen.get("alertas", [])
    if alertas:
        lines.append(f"\nALERTAS ACTIVAS:")
        for a in alertas:
            lines.append(f"  - {a['tipo']}: {json.dumps(a['datos'], default=str)}")
    else:
        lines.append(f"\nALERTAS ACTIVAS: ninguna")

    # Microbioma
    micro = resumen.get("microbioma_reciente", [])
    if micro:
        lines.append(f"\nMICROBIOMA RECIENTE:")
        for m in micro:
            lines.append(f"  {m['target']}: {m['valor']} {m['unidad']} ({m['fecha']})")

    return "\n".join(lines)


# ============================================================
# 3. CONSULTAR LLM
# ============================================================
def _call_anthropic_api(system_prompt, messages, max_tokens=800):
    """Llama a la API de Anthropic directamente con httpx (más confiable que el SDK)."""
    import httpx
    response = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
        json={
            "model": MODEL,
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": messages,
        },
        timeout=60.0,
    )
    response.raise_for_status()
    data = response.json()
    return data["content"][0]["text"]


def consultar_llm(texto_resumen, tipo_prompt="phytophthora"):
    """
    Envía resumen a Claude API. Retry 3x con backoff.
    Retorna texto del diagnóstico o fallback si falla.
    """
    if not ANTHROPIC_API_KEY:
        log.warning("ANTHROPIC_API_KEY no configurada, retornando fallback")
        return f"⚠️ DIAGNÓSTICO IA NO DISPONIBLE (API key no configurada)\n\n{texto_resumen}"

    system_prompt = cargar_prompt(tipo_prompt)

    for intento in range(3):
        try:
            return _call_anthropic_api(
                system_prompt,
                [{"role": "user", "content": texto_resumen}],
            )
        except Exception as e:
            log.warning(f"LLM intento {intento + 1} falló: {e}")
            if intento < 2:
                time.sleep(2 ** intento)

    log.error("LLM no disponible después de 3 intentos")
    return f"⚠️ DIAGNÓSTICO IA NO DISPONIBLE\n\n{texto_resumen}"


# ============================================================
# 4. CONSULTAR LLM VISUAL
# ============================================================
def consultar_llm_visual(imagen_base64, texto_resumen, tipo_prompt="diagnostico_visual"):
    """Envía imagen + texto a Claude Vision."""
    if not ANTHROPIC_API_KEY:
        return f"⚠️ DIAGNÓSTICO VISUAL NO DISPONIBLE (API key no configurada)\n\n{texto_resumen}"

    system_prompt = cargar_prompt(tipo_prompt)

    media_type = "image/jpeg"
    if imagen_base64.startswith("iVBOR"):
        media_type = "image/png"

    messages = [{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": imagen_base64,
                },
            },
            {"type": "text", "text": texto_resumen},
        ],
    }]

    for intento in range(3):
        try:
            return _call_anthropic_api(system_prompt, messages)
        except Exception as e:
            log.warning(f"LLM visual intento {intento + 1} falló: {e}")
            if intento < 2:
                time.sleep(2 ** intento)

    return f"⚠️ DIAGNÓSTICO VISUAL NO DISPONIBLE\n\n{texto_resumen}"


# ============================================================
# 5. PARSEAR DIAGNÓSTICO
# ============================================================
def parsear_diagnostico(respuesta_llm):
    """Parsea secciones del diagnóstico. Retorna dict."""
    result = {}

    # Support both "DIAGNÓSTICO:" and "## DIAGNÓSTICO:" (markdown) formats
    # The (?:#+ *)? prefix handles optional markdown headers
    H = r"(?:#+ *)?"  # optional markdown header prefix
    patterns = [
        ("diagnostico", H + r"DIAGN[ÓO]STICO(?:\s*INTEGRADO)?:?\s*\n(.+?)(?=\n(?:#|RECOMENDACI|S[ÍI]NTOMAS|DATOS DE SUELO|CONDICIONES|VENTANA)|$)"),
        ("sintomas", H + r"S[ÍI]NTOMAS OBSERVADOS:?\s*\n(.+?)(?=\n(?:#|DATOS|DIAGN)|$)"),
        ("datos_suelo", H + r"DATOS DE SUELO:?\s*\n(.+?)(?=\n(?:#|DIAGN|RECOMEND)|$)"),
        ("recomendacion_1", H + r"RECOMENDACI[ÓO]N 1:?\s*\n(.+?)(?=\n(?:#|RECOMENDACI[ÓO]N 2|REFERENCIA)|$)"),
        ("recomendacion_2", H + r"RECOMENDACI[ÓO]N 2:?\s*\n(.+?)(?=\n(?:#|REFERENCIA)|$)"),
        ("recomendacion", H + r"RECOMENDACI[ÓO]N:?\s*\n(.+?)(?=\n(?:#|REFERENCIA)|$)"),
        ("referencia", H + r"REFERENCIA:?\s*\n(.+?)$"),
        ("condiciones", H + r"CONDICIONES ACTUALES:?\s*\n(.+?)(?=\n(?:#|VENTANA|DOSIS)|$)"),
        ("ventana", H + r"VENTANA [ÓO]PTIMA:?\s*\n(.+?)(?=\n(?:#|DOSIS|REFERENCIA)|$)"),
        ("dosis", H + r"DOSIS RECOMENDADA:?\s*\n(.+?)(?=\n(?:#|REFERENCIA)|$)"),
        ("estado_general", H + r"ESTADO GENERAL:?\s*\n(.+?)(?=\n(?:#|POR BLOQUE|ALERTAS)|$)"),
    ]

    for key, pattern in patterns:
        match = re.search(pattern, respuesta_llm, re.DOTALL | re.IGNORECASE)
        if match:
            result[key] = match.group(1).strip()

    if not result:
        result["raw"] = respuesta_llm

    return result


# ============================================================
# 6. DIAGNOSTICAR EVENTO
# ============================================================
def diagnosticar_evento(conn, evento_id):
    """
    Busca evento en DB, genera resumen del nodo, envía a LLM,
    guarda diagnóstico en eventos.datos y marca procesado=TRUE.
    """
    # Buscar evento
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM eventos WHERE id = %s", (evento_id,))
        evento = cur.fetchone()

    if not evento:
        return {"error": f"Evento {evento_id} no encontrado"}

    nodo_id = evento["nodo_id"]
    tipo_evento = evento["tipo"]

    # Generar resumen del nodo
    resumen = generar_resumen_nodo(conn, nodo_id)
    texto = convertir_resumen_a_texto(resumen)

    # Determinar prompt según tipo de evento
    prompt_map = {
        "alerta_phytophthora": "phytophthora",
        "necesita_riego": "bioinsumos",
        "offline": "phytophthora",
        "bateria_baja": "phytophthora",
    }
    tipo_prompt = prompt_map.get(tipo_evento, "phytophthora")

    # Consultar LLM
    log.info(f"Diagnosticando evento {evento_id} (tipo: {tipo_evento}, nodo: {nodo_id}, prompt: {tipo_prompt})")
    respuesta = consultar_llm(texto, tipo_prompt=tipo_prompt)
    diagnostico = parsear_diagnostico(respuesta)
    diagnostico["timestamp"] = datetime.now().isoformat()
    diagnostico["modelo"] = MODEL
    diagnostico["raw_response"] = respuesta

    # Guardar en DB: merge con datos existentes
    datos_existentes = evento["datos"] if isinstance(evento["datos"], dict) else {}
    datos_existentes["diagnostico_ia"] = diagnostico

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE eventos SET datos = %s, procesado = TRUE WHERE id = %s",
            (json.dumps(datos_existentes, default=str), evento_id),
        )
    conn.commit()

    log.info(f"Evento {evento_id} diagnosticado y guardado")
    return diagnostico


# ============================================================
# 7. REPORTE SEMANAL
# ============================================================
def generar_reporte_semanal(conn, predio_id=1):
    """Genera reporte semanal agregado de todos los nodos del predio."""
    nodos = get_todos_nodos(conn)
    nodos_predio = [n for n in nodos if n.get("predio_id") == predio_id]
    if not nodos_predio:
        nodos_predio = nodos  # fallback

    lines = []
    lines.append("=== REPORTE SEMANAL — AgTech Nextipac ===")
    lines.append(f"Período: últimos 7 días")
    lines.append(f"Nodos: {len(nodos_predio)}\n")

    for nodo in nodos_predio:
        nid = nodo["nodo_id"]
        resumen = generar_resumen_nodo(conn, nid)
        score = resumen.get("score_phytophthora", {}).get("score", 0)
        nivel = resumen.get("score_phytophthora", {}).get("nivel", "?")
        u = resumen.get("ultima_lectura", {})

        lines.append(f"Nodo {nid} ({nodo['nombre']}, {nodo['rol']}):")
        lines.append(f"  Score Phytophthora: {score}/100 ({nivel})")
        if u:
            lines.append(f"  h10={u.get('h10_avg', '?')}% h20={u.get('h20_avg', '?')}% t20={u.get('t20', '?')}°C bat={u.get('bateria', '?')}V")

        alertas = resumen.get("alertas", [])
        if alertas:
            for a in alertas:
                lines.append(f"  ALERTA: {a['tipo']}")
        lines.append("")

    # Eventos de la semana
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT tipo, COUNT(*) as n FROM eventos
            WHERE tiempo >= NOW() - interval '7 days'
            GROUP BY tipo ORDER BY n DESC
        """)
        eventos_semana = cur.fetchall()

    if eventos_semana:
        lines.append("EVENTOS ESTA SEMANA:")
        for e in eventos_semana:
            lines.append(f"  {e['tipo']}: {e['n']}")

    # Clima
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT ROUND(AVG(temp_ambiente)::numeric, 1) as temp,
                   ROUND(SUM(precipitacion)::numeric, 1) as precip,
                   ROUND(AVG(humedad_relativa)::numeric, 1) as hr
            FROM clima
            WHERE tiempo >= (SELECT MAX(tiempo) FROM clima) - interval '7 days'
        """)
        clima = cur.fetchone()

    if clima and clima["temp"]:
        lines.append(f"\nCLIMA SEMANA: temp={clima['temp']}°C, precip={clima['precip']}mm, HR={clima['hr']}%")

    texto = "\n".join(lines)
    return consultar_llm(texto, tipo_prompt="reporte_semanal")


# ============================================================
# 8. REPORTE AGRICULTOR
# ============================================================
def generar_reporte_agricultor(conn, predio_id=1):
    """Genera versión corta para WhatsApp."""
    nodos = get_todos_nodos(conn)
    nodos_predio = [n for n in nodos if n.get("predio_id") == predio_id]
    if not nodos_predio:
        nodos_predio = nodos

    lines = []
    lines.append("Datos de la huerta esta semana:")

    scores = []
    alertas_count = 0
    for nodo in nodos_predio:
        resumen = generar_resumen_nodo(conn, nodo["nodo_id"])
        score = resumen.get("score_phytophthora", {}).get("score", 0)
        scores.append(score)
        alertas_count += len(resumen.get("alertas", []))
        u = resumen.get("ultima_lectura", {})
        lines.append(f"Nodo {nodo['nodo_id']}: humedad={u.get('h10_avg', '?')}%, temp={u.get('t20', '?')}°C, score={score}")

    max_score = max(scores) if scores else 0
    lines.append(f"\nScore máximo: {max_score}/100")
    lines.append(f"Alertas activas: {alertas_count}")

    texto = "\n".join(lines)
    return consultar_llm(texto, tipo_prompt="reporte_agricultor")


# ============================================================
# CLI
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="AgTech LLM Consultor — Diagnósticos con Claude")
    parser.add_argument("--diagnostico", type=int, metavar="NODO_ID",
                        help="Genera diagnóstico del nodo y lo imprime")
    parser.add_argument("--evento", type=int, metavar="EVENTO_ID",
                        help="Diagnostica evento y guarda en DB")
    parser.add_argument("--reporte-semanal", action="store_true",
                        help="Genera reporte semanal")
    parser.add_argument("--reporte-agricultor", action="store_true",
                        help="Genera reporte para WhatsApp")
    args = parser.parse_args()

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no configurada")
        sys.exit(1)

    with get_conn() as conn:
        if args.diagnostico is not None:
            nodo_id = args.diagnostico
            log.info(f"Generando diagnóstico para nodo {nodo_id}...")
            resumen = generar_resumen_nodo(conn, nodo_id)
            if "error" in resumen:
                print(f"Error: {resumen['error']}")
                sys.exit(1)
            texto = convertir_resumen_a_texto(resumen)
            print("=" * 60)
            print("RESUMEN ENVIADO AL LLM:")
            print("=" * 60)
            print(texto)
            print("\n" + "=" * 60)
            print("DIAGNÓSTICO IA:")
            print("=" * 60)
            respuesta = consultar_llm(texto, tipo_prompt="phytophthora")
            print(respuesta)
            print("\n" + "=" * 60)
            print("PARSEADO:")
            print("=" * 60)
            print(json.dumps(parsear_diagnostico(respuesta), indent=2, ensure_ascii=False))

        elif args.evento is not None:
            diagnostico = diagnosticar_evento(conn, args.evento)
            print(json.dumps(diagnostico, indent=2, default=str, ensure_ascii=False))

        elif args.reporte_semanal:
            log.info("Generando reporte semanal...")
            reporte = generar_reporte_semanal(conn)
            print(reporte)

        elif args.reporte_agricultor:
            log.info("Generando reporte para agricultor...")
            reporte = generar_reporte_agricultor(conn)
            print(reporte)

        else:
            parser.print_help()


if __name__ == "__main__":
    main()
