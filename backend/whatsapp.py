"""
whatsapp.py — Envío de mensajes via Meta Cloud API (WhatsApp Business)

Requiere env vars:
  WHATSAPP_TOKEN=<token de Meta Business>
  WHATSAPP_PHONE_ID=<phone number ID>
  AGRONOMO_PHONE=521XXXXXXXXXX
  PRODUCTOR_PHONE=521XXXXXXXXXX

CLI:
  python whatsapp.py --test "Mensaje de prueba"
  python whatsapp.py --alerta-diaria 1          Envía receta de riego del predio 1
  python whatsapp.py --reporte-semanal 1         Envía reporte semanal del predio 1
"""
import os
import sys
import json
import argparse
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [whatsapp] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("whatsapp")

TOKEN = os.environ.get("WHATSAPP_TOKEN", "")
PHONE_ID = os.environ.get("WHATSAPP_PHONE_ID", "")
AGRONOMO_PHONE = os.environ.get("AGRONOMO_PHONE", "")
PRODUCTOR_PHONE = os.environ.get("PRODUCTOR_PHONE", "")

API_URL = f"https://graph.facebook.com/v19.0/{PHONE_ID}/messages" if PHONE_ID else ""


def _is_configured():
    return bool(TOKEN and PHONE_ID)


def enviar_mensaje(telefono, mensaje):
    """
    Envía mensaje de texto por WhatsApp Business Cloud API.
    Retorna True si se envió, False si falló o no está configurado.
    """
    if not _is_configured():
        log.warning("WhatsApp no configurado (faltan WHATSAPP_TOKEN / WHATSAPP_PHONE_ID)")
        log.info(f"Mensaje que se habría enviado a {telefono[-4:] if telefono else '????'}:\n{mensaje[:200]}")
        return False

    try:
        import httpx
    except ImportError:
        log.error("httpx no instalado. pip install httpx")
        return False

    try:
        response = httpx.post(
            API_URL,
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "messaging_product": "whatsapp",
                "to": telefono,
                "type": "text",
                "text": {"body": mensaje[:4096]},
            },
            timeout=30,
        )

        if response.status_code == 200:
            log.info(f"WhatsApp enviado a ...{telefono[-4:]}")
            return True
        else:
            log.error(f"WhatsApp falló: {response.status_code} {response.text[:300]}")
            return False

    except Exception as e:
        log.error(f"Error enviando WhatsApp: {e}")
        return False


def enviar_a_agronomo(mensaje):
    """Envía mensaje al agrónomo."""
    if not AGRONOMO_PHONE:
        log.warning("AGRONOMO_PHONE no configurado")
        return False
    return enviar_mensaje(AGRONOMO_PHONE, mensaje)


def enviar_a_productor(mensaje):
    """Envía mensaje al productor."""
    if not PRODUCTOR_PHONE:
        log.warning("PRODUCTOR_PHONE no configurado")
        return False
    return enviar_mensaje(PRODUCTOR_PHONE, mensaje)


def enviar_a_equipo(mensaje):
    """Envía mensaje al agrónomo y al productor."""
    r1 = enviar_a_agronomo(mensaje)
    r2 = enviar_a_productor(mensaje)
    return r1 or r2


# ============================================================
# CRONJOBS
# ============================================================
def cronjob_alerta_diaria(predio_id=1):
    """
    Cronjob diario (6:00 AM): genera receta de riego y la envía.
    Ejecutar con: python whatsapp.py --alerta-diaria 1
    """
    import psycopg2
    from balance_hidrico import resumen_predio, generar_receta_predio_whatsapp

    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        log.error("DATABASE_URL no configurada")
        return

    conn = psycopg2.connect(db_url)
    try:
        resumen = resumen_predio(conn, predio_id)
        mensaje = generar_receta_predio_whatsapp(resumen)
        log.info(f"Receta generada: {resumen['receta_consolidada']}")
        log.info(f"Mensaje:\n{mensaje}")

        # Enviar al equipo
        enviar_a_equipo(mensaje)

        # Guardar en historial
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO balance_historico
                        (predio_id, receta, riego_mm, litros_por_arbol,
                         vwc_promedio, fraccion_disponible, mensaje_whatsapp, enviado)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    predio_id,
                    resumen["receta_consolidada"],
                    resumen["riego_mm_recomendado"],
                    resumen["litros_por_arbol_recomendado"],
                    None,  # promedio se calcula por nodo
                    None,
                    mensaje,
                    _is_configured(),
                ))
            conn.commit()
        except Exception as e:
            log.warning(f"No se pudo guardar historial: {e}")
            conn.rollback()

    finally:
        conn.close()


def cronjob_alertas_criticas(predio_id=1):
    """
    Cronjob horario: si hay alerta CRÍTICA o ALTA, envía diagnóstico.
    Ejecutar con: cron cada hora → python whatsapp.py --alertas-criticas 1
    """
    import psycopg2
    from psycopg2.extras import RealDictCursor

    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        log.error("DATABASE_URL no configurada")
        return

    conn = psycopg2.connect(db_url)
    try:
        # Importar después para evitar circular imports
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from alertas import get_todos_nodos, calcular_score_phytophthora

        nodos = get_todos_nodos(conn)
        alertas_criticas = []

        for nodo in nodos:
            nid = nodo["nodo_id"]
            score, desglose = calcular_score_phytophthora(conn, nid)
            if score >= 51:  # ALTO o CRÍTICO
                alertas_criticas.append({
                    "nodo_id": nid,
                    "nombre": nodo["nombre"],
                    "score": score,
                    "nivel": desglose.get("nivel", "?"),
                })

        if alertas_criticas:
            lineas = [f"⚠ ALERTA — {len(alertas_criticas)} nodo(s) con riesgo:"]
            for a in alertas_criticas:
                lineas.append(
                    f"  Nodo {a['nodo_id']} ({a['nombre']}): "
                    f"Score {a['score']}/100 — {a['nivel']}"
                )
            lineas.append("\nRevisar dashboard para detalles.")
            mensaje = "\n".join(lineas)

            log.info(f"Alertas críticas: {len(alertas_criticas)}")
            enviar_a_agronomo(mensaje)
        else:
            log.info("Sin alertas críticas")

    finally:
        conn.close()


def cronjob_reporte_semanal(predio_id=1):
    """
    Cronjob semanal (lunes 7:00 AM): genera reporte para el productor.
    """
    import psycopg2

    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        log.error("DATABASE_URL no configurada")
        return

    conn = psycopg2.connect(db_url)
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from llm_consultor import generar_reporte_agricultor
        reporte = generar_reporte_agricultor(conn, predio_id)
        log.info(f"Reporte semanal generado ({len(reporte)} chars)")
        enviar_a_equipo(reporte)
    finally:
        conn.close()


# ============================================================
# CLI
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="AgTech WhatsApp — Pipeline de mensajes")
    parser.add_argument("--test", type=str, help="Enviar mensaje de prueba")
    parser.add_argument("--alerta-diaria", type=int, metavar="PREDIO_ID",
                        help="Cronjob: receta de riego diaria")
    parser.add_argument("--alertas-criticas", type=int, metavar="PREDIO_ID",
                        help="Cronjob: alertas de score alto")
    parser.add_argument("--reporte-semanal", type=int, metavar="PREDIO_ID",
                        help="Cronjob: reporte semanal para productor")
    args = parser.parse_args()

    if args.test:
        print(f"Configurado: {_is_configured()}")
        print(f"Enviando a agrónomo: {AGRONOMO_PHONE or '(no configurado)'}")
        enviar_a_agronomo(args.test)

    elif args.alerta_diaria is not None:
        cronjob_alerta_diaria(args.alerta_diaria)

    elif args.alertas_criticas is not None:
        cronjob_alertas_criticas(args.alertas_criticas)

    elif args.reporte_semanal is not None:
        cronjob_reporte_semanal(args.reporte_semanal)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
