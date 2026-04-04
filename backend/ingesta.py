"""
ingesta.py — Pipeline de ingesta de datos desde hardware real
Escucha MQTT (gateway RAK → Mosquitto), parsea paquetes binarios del
firmware ESP32, aplica calibración, inserta en PostgreSQL, y dispara
alertas + balance hídrico si corresponde.

Este es el módulo que CONECTA el hardware con el software.
Sin él, los datos del campo no llegan a la base de datos.

Flujo completo:
  ESP32 ──LoRa──→ Gateway RAK ──4G──→ MQTT Broker ──→ ingesta.py ──→ PostgreSQL
                                                                        │
                                                                        ├→ alertas.py (Score v3)
                                                                        ├→ balance_hidrico.py (receta riego)
                                                                        └→ whatsapp.py (si alerta crítica)

Paquete binario del firmware (23 bytes, little-endian):
  uint8   nodo_id          1 byte
  uint8   tipo             1 byte   (0=normal, 1=evento_mojado)
  uint32  timestamp        4 bytes  (millis/1000, gateway pone timestamp real)
  uint16  hum_10_avg       2 bytes  (VWC × 100)
  uint16  hum_20_avg       2 bytes
  uint16  hum_30_avg       2 bytes
  uint16  hum_10_min       2 bytes
  uint16  hum_10_max       2 bytes
  int16   temp_20          2 bytes  (°C × 100)
  uint16  ec_30            2 bytes  (dS/m × 100)
  uint16  bateria          2 bytes  (V × 100)
  int8    rssi             1 byte
  Total: 23 bytes

Modos:
  python ingesta.py                   Modo daemon (escucha MQTT continuamente)
  python ingesta.py --test            Genera paquete de prueba y lo procesa
  python ingesta.py --simular 3       Simula lectura del nodo 3 con valores aleatorios
  python ingesta.py --status          Muestra estado de conexión y últimas lecturas

Configuración (env vars):
  DATABASE_URL        PostgreSQL connection string
  MQTT_HOST           Broker MQTT (default: localhost)
  MQTT_PORT           Puerto MQTT (default: 1883)
  MQTT_USER           Usuario MQTT (opcional)
  MQTT_PASS           Password MQTT (opcional)
  MQTT_TOPIC          Topic base (default: agtech/nodos)
  MQTT_USE_TLS        1 para TLS (default: 0)
"""
import os
import sys
import struct
import json
import time
import logging
import argparse
from datetime import datetime, timezone
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from calibracion import corregir_lectura, get_calibracion

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [ingesta] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("ingesta")

# ============================================================
# CONFIGURACIÓN
# ============================================================
DATABASE_URL = os.environ.get("DATABASE_URL", "")
MQTT_HOST = os.environ.get("MQTT_HOST", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
MQTT_USER = os.environ.get("MQTT_USER", "")
MQTT_PASS = os.environ.get("MQTT_PASS", "")
MQTT_TOPIC = os.environ.get("MQTT_TOPIC", "agtech/nodos/#")
MQTT_USE_TLS = os.environ.get("MQTT_USE_TLS", "0") == "1"

# Estructura del paquete binario (debe coincidir con firmware)
# < = little-endian, B=uint8, I=uint32, H=uint16, h=int16, b=int8
PACKET_FORMAT = "<BBIHHHHHhHHb"
PACKET_SIZE = struct.calcsize(PACKET_FORMAT)  # 23 bytes

# Validación de rangos
VALID_RANGES = {
    "h10_avg": (0, 100),     # % VWC
    "h20_avg": (0, 100),
    "h30_avg": (0, 100),
    "t20":     (-10, 60),    # °C
    "ec30":    (0, 20),      # dS/m
    "bateria": (0, 5),       # V
    "rssi":    (-130, 0),    # dBm
}

# Contadores de estadísticas
stats = {
    "paquetes_recibidos": 0,
    "paquetes_validos": 0,
    "paquetes_invalidos": 0,
    "paquetes_fuera_rango": 0,
    "inserciones_ok": 0,
    "errores_db": 0,
    "alertas_disparadas": 0,
    "inicio": datetime.now().isoformat(),
}


@contextmanager
def get_conn():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


# ============================================================
# 1. PARSEAR PAQUETE BINARIO
# ============================================================
def parsear_paquete(payload_bytes):
    """
    Parsea paquete binario del firmware ESP32.
    Retorna dict con valores en unidades reales (no ×100).
    Retorna None si el paquete es inválido.
    """
    if len(payload_bytes) != PACKET_SIZE:
        log.warning(f"Paquete con tamaño incorrecto: {len(payload_bytes)} bytes "
                    f"(esperado {PACKET_SIZE})")
        stats["paquetes_invalidos"] += 1
        return None

    try:
        fields = struct.unpack(PACKET_FORMAT, payload_bytes)
    except struct.error as e:
        log.warning(f"Error parseando paquete: {e}")
        stats["paquetes_invalidos"] += 1
        return None

    (nodo_id, tipo, timestamp_fw,
     h10_avg, h20_avg, h30_avg, h10_min, h10_max,
     temp_20, ec_30, bateria, rssi) = fields

    # Convertir de ×100 a unidades reales
    lectura = {
        "nodo_id":  nodo_id,
        "tipo":     "evento_mojado" if tipo == 1 else "normal",
        "tiempo":   datetime.now(timezone.utc),  # Gateway timestamp (no confiamos en millis del ESP32)
        "h10_avg":  h10_avg / 100.0,
        "h20_avg":  h20_avg / 100.0,
        "h30_avg":  h30_avg / 100.0,
        "h10_min":  h10_min / 100.0,
        "h10_max":  h10_max / 100.0,
        "t20":      temp_20 / 100.0,
        "ec30":     ec_30 / 100.0,
        "bateria":  bateria / 100.0,
        "rssi":     rssi,
    }

    return lectura


# ============================================================
# 2. VALIDAR LECTURA
# ============================================================
def validar_lectura(lectura):
    """
    Valida que los valores estén en rangos razonables.
    Retorna (es_valida, lista_warnings).
    """
    warnings = []

    # Validar nodo_id
    if lectura["nodo_id"] < 1 or lectura["nodo_id"] > 100:
        warnings.append(f"nodo_id fuera de rango: {lectura['nodo_id']}")
        return False, warnings

    # Validar rangos
    for campo, (vmin, vmax) in VALID_RANGES.items():
        valor = lectura.get(campo)
        if valor is not None and (valor < vmin or valor > vmax):
            warnings.append(f"{campo}={valor} fuera de rango [{vmin}, {vmax}]")

    # Temperatura -99 es marca de error del firmware (DS18B20 desconectado)
    if lectura["t20"] < -90:
        lectura["t20"] = None
        warnings.append("t20=-99: sensor DS18B20 desconectado")

    if warnings:
        stats["paquetes_fuera_rango"] += 1
        for w in warnings:
            log.warning(f"Nodo {lectura['nodo_id']}: {w}")

    # Es válida si no hay errores críticos (nodo_id OK)
    return True, warnings


# ============================================================
# 3. APLICAR CALIBRACIÓN
# ============================================================
def calibrar_lectura(lectura, predio="nextipac"):
    """Aplica corrección gravimétrica + temperatura a la lectura."""
    t20 = lectura.get("t20")

    lectura["h10_avg_raw"] = lectura["h10_avg"]
    lectura["h20_avg_raw"] = lectura["h20_avg"]
    lectura["h30_avg_raw"] = lectura["h30_avg"]

    lectura["h10_avg"] = corregir_lectura(lectura["h10_avg"], t20, 10, predio)
    lectura["h20_avg"] = corregir_lectura(lectura["h20_avg"], t20, 20, predio)
    lectura["h30_avg"] = corregir_lectura(lectura["h30_avg"], t20, 30, predio)

    # También corregir min/max de h10
    lectura["h10_min"] = corregir_lectura(lectura["h10_min"], t20, 10, predio)
    lectura["h10_max"] = corregir_lectura(lectura["h10_max"], t20, 10, predio)

    return lectura


# ============================================================
# 4. INSERTAR EN BASE DE DATOS
# ============================================================
def insertar_lectura(conn, lectura):
    """Inserta lectura calibrada en tabla lecturas."""
    sql = """
        INSERT INTO lecturas
            (tiempo, nodo_id, tipo, h10_avg, h20_avg, h30_avg,
             h10_min, h10_max, t20, ec30, bateria, rssi)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (
                lectura["tiempo"],
                lectura["nodo_id"],
                lectura["tipo"],
                lectura["h10_avg"],
                lectura["h20_avg"],
                lectura["h30_avg"],
                lectura["h10_min"],
                lectura["h10_max"],
                lectura["t20"],
                lectura["ec30"],
                lectura["bateria"],
                lectura["rssi"],
            ))
        conn.commit()
        stats["inserciones_ok"] += 1
        return True
    except Exception as e:
        conn.rollback()
        log.error(f"Error insertando lectura: {e}")
        stats["errores_db"] += 1
        return False


# ============================================================
# 5. POST-INSERCIÓN: EVALUAR ALERTAS
# ============================================================
def evaluar_post_insercion(conn, lectura):
    """
    Después de insertar, evalúa si hay que disparar alertas.
    Se ejecuta cada lectura, pero solo actúa si hay riesgo.
    """
    try:
        from alertas import calcular_score_phytophthora, guardar_evento

        nodo_id = lectura["nodo_id"]
        score, desglose = calcular_score_phytophthora(conn, nodo_id)

        if score >= 51:  # ALTO o CRÍTICO
            log.warning(f"Nodo {nodo_id}: Score Phytophthora {score}/100 — {desglose.get('nivel')}")
            guardar_evento(conn, nodo_id, "alerta_phytophthora", desglose)
            stats["alertas_disparadas"] += 1

            # Si es CRÍTICO, enviar WhatsApp inmediato
            if score >= 76:
                try:
                    from whatsapp import enviar_a_agronomo
                    msg = (
                        f"ALERTA CRITICA — Nodo {nodo_id}\n"
                        f"Score Phytophthora: {score}/100\n"
                        f"h10={lectura['h10_avg']:.1f}% h20={lectura['h20_avg']:.1f}% "
                        f"t20={lectura['t20']:.1f}°C\n"
                        f"Revisar dashboard inmediatamente."
                    )
                    enviar_a_agronomo(msg)
                except Exception as e:
                    log.warning(f"No se pudo enviar WhatsApp: {e}")

        # Evento de mojado → registrar como riego auto-detectado
        if lectura["tipo"] == "evento_mojado":
            try:
                # Verificar si hay precipitación reciente (lluvia vs riego)
                from alertas import get_clima_reciente
                clima = get_clima_reciente(conn, horas=2)
                precip_2h = sum(r.get("precipitacion", 0) or 0 for r in clima) if clima else 0

                origen = "lluvia_detectada" if precip_2h > 5 else "riego_detectado"
                log.info(f"Nodo {nodo_id}: evento mojado — clasificado como '{origen}' "
                         f"(precip 2h = {precip_2h:.1f}mm)")

                # Intentar registrar en tabla riegos
                try:
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO riegos (predio_id, metodo, registrado_por, notas)
                            VALUES (
                                (SELECT predio_id FROM nodos WHERE nodo_id = %s),
                                %s, 'sistema',
                                %s
                            )
                        """, (
                            nodo_id,
                            origen,
                            f"Auto-detectado por nodo {nodo_id}, "
                            f"delta h10 > umbral, precip_2h={precip_2h:.1f}mm",
                        ))
                    conn.commit()
                except Exception:
                    conn.rollback()  # Tabla riegos podría no existir aún

            except Exception as e:
                log.debug(f"No se pudo clasificar evento mojado: {e}")

    except Exception as e:
        log.error(f"Error en evaluación post-inserción: {e}")


# ============================================================
# 6. PROCESAR LECTURA COMPLETA
# ============================================================
def procesar_paquete(payload_bytes, predio="nextipac"):
    """
    Pipeline completo: parsear → validar → calibrar → insertar → evaluar.
    Retorna la lectura procesada o None si falló.
    """
    stats["paquetes_recibidos"] += 1

    # Parsear
    lectura = parsear_paquete(payload_bytes)
    if not lectura:
        return None

    # Validar
    es_valida, warnings = validar_lectura(lectura)
    if not es_valida:
        return None

    # Calibrar
    lectura = calibrar_lectura(lectura, predio)

    log.info(
        f"Nodo {lectura['nodo_id']:>2} [{lectura['tipo']:>14}] "
        f"h10={lectura['h10_avg']:5.1f}% h20={lectura['h20_avg']:5.1f}% "
        f"h30={lectura['h30_avg']:5.1f}% t20={lectura['t20'] or 0:5.1f}°C "
        f"ec={lectura['ec30']:5.2f} bat={lectura['bateria']:4.2f}V "
        f"rssi={lectura['rssi']}dBm"
    )

    # Insertar
    with get_conn() as conn:
        ok = insertar_lectura(conn, lectura)
        if ok:
            stats["paquetes_validos"] += 1
            evaluar_post_insercion(conn, lectura)

    return lectura


# ============================================================
# 7. MQTT CLIENT
# ============================================================
def iniciar_mqtt():
    """
    Inicia cliente MQTT que escucha mensajes del gateway.
    El gateway RAK publica en: agtech/nodos/{nodo_id}/datos

    Requiere: pip install paho-mqtt
    """
    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        log.error("paho-mqtt no instalado. Ejecutar: pip install paho-mqtt")
        sys.exit(1)

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            log.info(f"Conectado a MQTT broker {MQTT_HOST}:{MQTT_PORT}")
            client.subscribe(MQTT_TOPIC)
            log.info(f"Suscrito a: {MQTT_TOPIC}")
        else:
            log.error(f"Error conectando a MQTT: rc={rc}")

    def on_message(client, userdata, msg):
        log.debug(f"MQTT [{msg.topic}] — {len(msg.payload)} bytes")

        # El payload puede ser binario (directo del gateway) o JSON
        payload = msg.payload

        # Si el gateway envuelve en JSON, extraer el payload binario
        if payload[:1] == b'{':
            try:
                data = json.loads(payload)
                # Buscar el payload binario en el JSON
                if "data" in data:
                    import base64
                    payload = base64.b64decode(data["data"])
                elif "payload" in data:
                    import base64
                    payload = base64.b64decode(data["payload"])
                else:
                    log.warning(f"JSON sin campo 'data' o 'payload': {list(data.keys())}")
                    return
            except (json.JSONDecodeError, Exception) as e:
                log.warning(f"Error procesando JSON del gateway: {e}")
                return

        # Procesar paquete binario
        procesar_paquete(payload)

    def on_disconnect(client, userdata, rc):
        if rc != 0:
            log.warning(f"Desconectado de MQTT (rc={rc}), reintentando...")

    # Crear cliente
    client = mqtt.Client(client_id="agtech-ingesta", clean_session=True)

    if MQTT_USER:
        client.username_pw_set(MQTT_USER, MQTT_PASS)

    if MQTT_USE_TLS:
        client.tls_set()

    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    # Reconexión automática
    client.reconnect_delay_set(min_delay=1, max_delay=60)

    log.info(f"Conectando a MQTT {MQTT_HOST}:{MQTT_PORT} (TLS={'sí' if MQTT_USE_TLS else 'no'})...")
    try:
        client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    except Exception as e:
        log.error(f"No se pudo conectar a MQTT: {e}")
        log.info("Verificar que el broker MQTT esté corriendo y sea accesible.")
        sys.exit(1)

    # Loop forever (bloqueante, con reconexión automática)
    log.info("Ingesta iniciada — esperando paquetes de sensores...")
    try:
        client.loop_forever()
    except KeyboardInterrupt:
        log.info("Detenido por usuario")
        client.disconnect()


# ============================================================
# 8. MODO HTTP (alternativa a MQTT)
# ============================================================
def iniciar_http_receiver():
    """
    Alternativa a MQTT: endpoint HTTP que recibe paquetes del gateway.
    Útil si el gateway no soporta MQTT nativo (envía HTTP POST).

    El gateway RAK puede configurarse para enviar HTTP POST con el payload.
    """
    from fastapi import FastAPI, Request
    import uvicorn

    receiver = FastAPI(title="AgTech Ingesta HTTP")

    @receiver.post("/ingesta")
    async def recibir_paquete(request: Request):
        body = await request.body()

        # Si es JSON, extraer payload
        if body[:1] == b'{':
            data = json.loads(body)
            import base64
            if "data" in data:
                body = base64.b64decode(data["data"])
            elif "payload" in data:
                body = base64.b64decode(data["payload"])

        lectura = procesar_paquete(body)
        if lectura:
            return {"status": "ok", "nodo_id": lectura["nodo_id"]}
        return {"status": "error", "detail": "paquete inválido"}

    @receiver.get("/ingesta/status")
    async def status():
        return stats

    port = int(os.environ.get("INGESTA_PORT", "8001"))
    log.info(f"Iniciando receptor HTTP en puerto {port}")
    uvicorn.run(receiver, host="0.0.0.0", port=port)


# ============================================================
# 9. UTILIDADES DE PRUEBA
# ============================================================
def generar_paquete_prueba(nodo_id=1, tipo=0, h10=35.0, h20=38.0, h30=40.0,
                           t20=24.0, ec=0.85, bat=3.8, rssi=-65):
    """Genera un paquete binario de prueba (para testing sin hardware)."""
    return struct.pack(
        PACKET_FORMAT,
        nodo_id,
        tipo,
        0,  # timestamp (ignorado, usamos datetime.now)
        int(h10 * 100),
        int(h20 * 100),
        int(h30 * 100),
        int((h10 - 2) * 100),  # h10_min
        int((h10 + 2) * 100),  # h10_max
        int(t20 * 100),
        int(ec * 100),
        int(bat * 100),
        rssi,
    )


def test_pipeline():
    """Genera paquete de prueba y lo procesa completo."""
    log.info("=== TEST DE PIPELINE ===")
    log.info(f"Tamaño de paquete esperado: {PACKET_SIZE} bytes")
    log.info(f"Database: {'configurada' if DATABASE_URL else 'NO CONFIGURADA'}")

    # Paquete normal
    paq = generar_paquete_prueba(nodo_id=1, h10=35.0, h20=38.0, h30=40.0, t20=24.5)
    log.info(f"Paquete generado: {len(paq)} bytes = {paq.hex()}")

    lectura = parsear_paquete(paq)
    if lectura:
        log.info(f"Parseado OK: {json.dumps({k: v for k, v in lectura.items() if k != 'tiempo'}, default=str)}")

        lectura = calibrar_lectura(lectura)
        log.info(f"Calibrado OK: h10={lectura['h10_avg']:.1f}% h20={lectura['h20_avg']:.1f}%")

        if DATABASE_URL:
            with get_conn() as conn:
                ok = insertar_lectura(conn, lectura)
                log.info(f"Inserción: {'OK' if ok else 'FALLÓ'}")
        else:
            log.warning("DATABASE_URL no configurada — no se insertó")
    else:
        log.error("Error parseando paquete de prueba")

    # Paquete de evento mojado
    paq2 = generar_paquete_prueba(nodo_id=3, tipo=1, h10=48.0, h20=50.0, t20=25.0)
    log.info(f"\nPaquete evento mojado: {len(paq2)} bytes")
    lectura2 = parsear_paquete(paq2)
    if lectura2:
        log.info(f"Tipo: {lectura2['tipo']}, h10={lectura2['h10_avg']:.1f}%")

    log.info(f"\nEstadísticas: {json.dumps(stats, indent=2)}")


def simular_nodo(nodo_id):
    """Simula una lectura de un nodo con valores semi-aleatorios."""
    import random
    h10 = random.uniform(25, 50)
    h20 = h10 + random.uniform(-3, 5)
    h30 = h20 + random.uniform(-2, 4)
    t20 = random.uniform(18, 28)
    ec = random.uniform(0.3, 1.5)
    bat = random.uniform(3.3, 4.1)
    rssi = random.randint(-90, -50)
    tipo = 1 if random.random() < 0.1 else 0  # 10% chance de evento mojado

    paq = generar_paquete_prueba(nodo_id, tipo, h10, h20, h30, t20, ec, bat, rssi)
    log.info(f"Simulando nodo {nodo_id}...")
    resultado = procesar_paquete(paq)
    if resultado:
        log.info("Procesado OK")
    return resultado


def mostrar_status():
    """Muestra estado del sistema de ingesta."""
    print("\n=== ESTADO DEL SISTEMA DE INGESTA ===")
    print(f"MQTT: {MQTT_HOST}:{MQTT_PORT} (TLS={'sí' if MQTT_USE_TLS else 'no'})")
    print(f"Topic: {MQTT_TOPIC}")
    print(f"Database: {'configurada' if DATABASE_URL else 'NO CONFIGURADA'}")
    print(f"Tamaño paquete: {PACKET_SIZE} bytes")
    print(f"Estadísticas: {json.dumps(stats, indent=2)}")

    if DATABASE_URL:
        try:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    # Total lecturas
                    cur.execute("SELECT COUNT(*) FROM lecturas")
                    total = cur.fetchone()[0]
                    # Última lectura
                    cur.execute("SELECT MAX(tiempo) FROM lecturas")
                    ultima = cur.fetchone()[0]
                    # Nodos activos (última lectura < 30 min)
                    cur.execute("""
                        SELECT COUNT(DISTINCT nodo_id) FROM lecturas
                        WHERE tiempo > NOW() - interval '30 minutes'
                    """)
                    activos = cur.fetchone()[0]

                print(f"\nBase de datos:")
                print(f"  Total lecturas: {total:,}")
                print(f"  Última lectura: {ultima}")
                print(f"  Nodos activos (30 min): {activos}")
        except Exception as e:
            print(f"  Error conectando a DB: {e}")


# ============================================================
# CLI
# ============================================================
def main():
    parser = argparse.ArgumentParser(
        description="AgTech Ingesta — Pipeline de datos hardware → PostgreSQL")
    parser.add_argument("--test", action="store_true",
                        help="Ejecutar test del pipeline con paquete de prueba")
    parser.add_argument("--simular", type=int, metavar="NODO_ID",
                        help="Simular una lectura de un nodo")
    parser.add_argument("--status", action="store_true",
                        help="Mostrar estado del sistema")
    parser.add_argument("--http", action="store_true",
                        help="Iniciar receptor HTTP (alternativa a MQTT)")
    parser.add_argument("--mqtt", action="store_true", default=True,
                        help="Iniciar daemon MQTT (default)")
    args = parser.parse_args()

    if args.test:
        test_pipeline()
    elif args.simular is not None:
        if not DATABASE_URL:
            print("ERROR: DATABASE_URL no configurada")
            sys.exit(1)
        simular_nodo(args.simular)
    elif args.status:
        mostrar_status()
    elif args.http:
        if not DATABASE_URL:
            print("ERROR: DATABASE_URL no configurada")
            sys.exit(1)
        iniciar_http_receiver()
    else:
        if not DATABASE_URL:
            print("ERROR: DATABASE_URL no configurada")
            sys.exit(1)
        iniciar_mqtt()


if __name__ == "__main__":
    main()
