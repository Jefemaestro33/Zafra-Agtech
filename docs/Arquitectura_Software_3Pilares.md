# Arquitectura de Software: Sistema de 3 Pilares
## Aguacate Hass — Nextipac, Jalisco

---

## Vista general del flujo de datos

```
CAMPO                              NUBE (VPS $6 USD/mes)                         EXTERNO
─────                              ──────────────────────                         ───────

ESP32/TTGO ──LoRa──→ Gateway RAK    
  (nodo)              con 4G/LTE    
                         │          
                     internet 4G    
                         │          
                         └──MQTT──→ Mosquitto (TLS)
                                      │
                                      ├──→ ingesta.py (valida + inserta)
                                      │       │
                                      │       ▼
                                      │    TimescaleDB (almacena)
                                      │       │
                                      │       ├──→ Grafana (dashboards)
                                      │       │
                                      │       └──→ Python backend (Niveles 2-3)
                                      │             │
                                      │             ├─ alertas.py
                                      │             ├─ firma_hidrica.py
                                      │             ├─ comparativo.py
                                      │             └─ modelo_microbioma.py
                                      │                   │
                                      │                   │ trigger: resumen en texto plano
                                      │                   ▼
                                      │             llm_consultor.py ──API──→ Claude / Gemini
                                      │                   │                   (Nivel 4)
                                      │                   │ respuesta procesada
                                      │                   ▼
                                      └──→ Telegram Bot ──→ Grupo "AgTech Equipo Campo"
                                                            (tú, Salvador, agrónomos)
                                                            Recibe: diagnóstico + recomendaciones
                                                            del LLM, no alertas crudas
```

---

## NIVEL 1: Pipeline de datos

### 1.1 Firmware ESP32 (C++ / Arduino)

El ESP32 del TTGO T-Beam hace 3 cosas: leer sensores, agregar datos, y transmitir por LoRa.

**Archivo:** `firmware/nodo_sensor.ino`

```
Responsabilidades:
├── Leer sensores cada 20 segundos
│   ├── 3 × humedad capacitiva (ADC con multiplexión por power pin)
│   ├── 1 × temperatura DS18B20 (OneWire)
│   └── 1 × conductividad eléctrica (ADC)
│
├── Agregar en buffer circular (15 lecturas = 5 minutos)
│   ├── Calcular: media, min, max por sensor
│   └── Detectar evento de mojado: si Δθ/Δt > umbral en sensor 10cm
│
├── Transmitir por LoRa cada 5 minutos
│   ├── Paquete normal: medias de 5 min (ahorra batería)
│   └── Paquete evento: datos crudos de 20 seg cuando detecta mojado
│
└── Deep sleep entre transmisiones para ahorrar batería
```

**Estructura del paquete LoRa (binario, ~30 bytes):**

```c
struct Paquete {
    uint8_t  nodo_id;          // 1 byte  - ID del nodo (1-8)
    uint8_t  tipo;             // 1 byte  - 0=normal, 1=evento_mojado
    uint32_t timestamp;        // 4 bytes - epoch seconds
    uint16_t hum_10_avg;       // 2 bytes - humedad 10cm × 100
    uint16_t hum_20_avg;       // 2 bytes - humedad 20cm × 100
    uint16_t hum_30_avg;       // 2 bytes - humedad 30cm × 100
    uint16_t hum_10_min;       // 2 bytes
    uint16_t hum_10_max;       // 2 bytes
    int16_t  temp_20;          // 2 bytes - temperatura × 100
    uint16_t ec_30;            // 2 bytes - conductividad × 100
    uint16_t bateria;          // 2 bytes - voltaje × 100
    int8_t   rssi;             // 1 byte  - señal LoRa
};
// Total: ~24 bytes por paquete normal
```

**¿Por qué binario y no JSON?** LoRa tiene payload máximo de ~250 bytes y entre menos datos envíes, menos tiempo de aire, menos consumo de batería, menos colisiones entre nodos.

**Librerías Arduino necesarias:**
- `LoRa.h` (Sandeep Mistry) — comunicación LoRa
- `OneWire.h` + `DallasTemperature.h` — DS18B20
- `ESP32 ADC` nativo — sensores capacitivos y EC
- `esp_sleep.h` — deep sleep
- `ArduinoOTA.h` o `HTTPUpdate.h` — actualización OTA

### 1.1.1 Actualización OTA (Over-The-Air)

En campo, abrir la caja del nodo para conectar un cable USB es impráctico (lluvia, lodo, sellar de nuevo contra humedad). Mejor: un botón físico en la caja que activa modo de actualización WiFi.

**Cómo funciona:**

```
Estado normal:
  ESP32 duerme → despierta → lee sensores → transmite LoRa → duerme
  (WiFi apagado, no consume batería extra)

El agrónomo llega a campo y necesita actualizar firmware:
  1. Prende hotspot en su celular (SSID y password fijos, configurados en el firmware)
  2. Presiona botón físico en la caja del nodo
  3. ESP32 enciende WiFi, se conecta al hotspot
  4. Descarga nuevo firmware desde URL predefinida (tu VPS o GitHub releases)
  5. Se actualiza en ~10 segundos
  6. Reinicia con nuevo firmware, vuelve a modo normal
```

**Implementación en el firmware:**

```cpp
#include <WiFi.h>
#include <HTTPUpdate.h>

// Pin del botón OTA (con pull-up interno)
#define BTN_OTA 39  // o el pin que uses

// Configuración del hotspot del agrónomo
const char* OTA_SSID = "AGTECH_OTA";
const char* OTA_PASS = "tu_password_ota";

// URL del firmware en tu VPS
const char* FIRMWARE_URL = "https://tu-vps.com/firmware/nodo_sensor.bin";
const char* FW_VERSION = "1.0.3";

void checkOTA() {
    // Solo si el botón está presionado al despertar
    pinMode(BTN_OTA, INPUT_PULLUP);
    if (digitalRead(BTN_OTA) == HIGH) return;  // no presionado, seguir normal
    
    // Encender LED para indicar modo OTA
    digitalWrite(LED_BUILTIN, HIGH);
    
    // Conectar al hotspot del agrónomo
    WiFi.begin(OTA_SSID, OTA_PASS);
    int intentos = 0;
    while (WiFi.status() != WL_CONNECTED && intentos < 30) {
        delay(500);
        intentos++;
    }
    
    if (WiFi.status() != WL_CONNECTED) {
        // No encontró hotspot, volver a modo normal
        digitalWrite(LED_BUILTIN, LOW);
        return;
    }
    
    // Descargar y aplicar actualización
    t_httpUpdate_return ret = httpUpdate.update(FIRMWARE_URL);
    
    // Si llegó aquí, falló (si tiene éxito, reinicia automáticamente)
    digitalWrite(LED_BUILTIN, LOW);
    WiFi.disconnect(true);
}

void setup() {
    checkOTA();  // Revisar OTA antes de cualquier otra cosa
    // ... resto del setup normal (LoRa, sensores, etc.)
}
```

**Detalles prácticos:**
- El botón va en el exterior de la caja IP67, puede ser un interruptor magnético (reed switch) que se activa con un imán, así no necesitas ni abrir ni perforar
- El SSID y password del hotspot son iguales para todos los nodos, el agrónomo solo necesita recordar uno
- Subir el `.bin` compilado a tu VPS: `scp firmware.bin tu-vps:/var/www/firmware/nodo_sensor.bin`
- Versionar los binarios para saber qué nodo tiene qué versión

### 1.2 Gateway LoRa → MQTT

**Gateway comercial con 4G/LTE (recomendado).**

Las huertas son entornos hostiles: calor extremo, polvo, sin WiFi, y riesgo de robo. Un gateway comercial con SIM card celular hace el sistema 100% independiente del internet del agricultor.

**Hardware recomendado:** RAK7268V2 (WisGate Edge Lite 2) o similar con slot para SIM 4G/LTE. Costo: $150-250 USD. También existen opciones como Dragino LPS8N con 4G.

```
Responsabilidades del gateway:
├── Recibir paquetes LoRaWAN de todos los nodos
├── Decodificar mediante ChirpStack (integrado o en la nube)
├── Reenviar datos por 4G/LTE al servidor en la nube
└── Publicar en MQTT del VPS remoto
```

**SIM card:** Usar un plan de datos M2M/IoT. Con datos agregados cada 5 minutos, 8 nodos generan ~30KB/hora. Un plan de 500MB/mes (~$50-100 MXN) sobra. Proveedores en México: Telcel M2M, AT&T IoT, o Hologram (global, sin contrato).

**Tema MQTT:** `agtech/nodos/{nodo_id}/datos`

**Payload JSON que publica el gateway:**
```json
{
    "nodo_id": 1,
    "tipo": "normal",
    "timestamp": 1709500800,
    "humedad": {
        "h10_avg": 32.45,
        "h20_avg": 35.12,
        "h30_avg": 38.90,
        "h10_min": 31.20,
        "h10_max": 33.70
    },
    "temperatura": { "t20": 22.30 },
    "ec": { "ec30": 1.45 },
    "bateria": 3.85,
    "rssi": -67
}
```

**¿Por qué no un ESP32 casero como gateway?** Funciona para prototipo, pero en campo real un gateway comercial tiene: carcasa IP67 (agua y polvo), antena profesional con mejor alcance, watchdog que reinicia solo si se cuelga, y slot para SIM sin adaptadores. La diferencia de costo ($150 USD vs. $30 del ESP32) se paga sola la primera vez que no tienes que ir a Nextipac a reiniciar el gateway a las 2am.

### 1.3 Servidor en la nube (VPS) — No Raspberry Pi en campo

**Cambio crítico de arquitectura:** los datos NO se quedan en campo. El gateway con 4G envía todo directamente a un VPS en la nube. Si se roban el gateway o se funde, pierdes hardware de $200 USD pero no tus datos. Si pusieras una Raspberry Pi en la huerta, un robo o un corte de luz prolongado te cuesta meses de datos irrecuperables.

**VPS recomendado:** DigitalOcean ($6 USD/mes, 1GB RAM, 25GB SSD) o Hetzner ($4 EUR/mes). Para empezar con 4-8 nodos sobra. Cuando escales a más parcelas, subes de plan.

**La Raspberry Pi se queda en tu casa/oficina** como entorno de desarrollo y pruebas, no en campo.

**Todo corre en Docker Compose en el VPS:**

**Archivo:** `docker-compose.yml`

```yaml
version: '3.8'
services:

  mosquitto:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
      - "8883:8883"   # MQTT con TLS (obligatorio: datos viajan por internet)
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data

  timescaledb:
    image: timescale/timescaledb:latest-pg15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: agtech
      POSTGRES_PASSWORD: tu_password_seguro_aqui
      POSTGRES_DB: agtech_db
    volumes:
      - ./timescaledb/data:/var/lib/postgresql/data

  ingesta:
    build: ./backend
    depends_on:
      - mosquitto
      - timescaledb
    environment:
      MQTT_HOST: mosquitto
      DB_HOST: timescaledb
    restart: always

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - ./grafana/data:/var/lib/grafana
```

**Para levantar todo:** `docker-compose up -d`

**Seguridad obligatoria (datos viajan por internet):**
- MQTT con TLS (puerto 8883, certificados Let's Encrypt)
- Mosquitto con usuario/contraseña para el gateway
- PostgreSQL solo accesible desde localhost (no exponer puerto 5432)
- Grafana detrás de nginx con HTTPS
- Firewall: solo puertos 8883, 443, y SSH
- Backups diarios automáticos: cron con `pg_dump` a un bucket S3 o similar ($1 USD/mes)

### 1.4 Esquema de base de datos (TimescaleDB/PostgreSQL)

**Archivo:** `sql/schema.sql`

```sql
-- Tabla principal de lecturas de sensores
CREATE TABLE lecturas (
    tiempo        TIMESTAMPTZ NOT NULL,
    nodo_id       SMALLINT NOT NULL,
    tipo          VARCHAR(10) DEFAULT 'normal',  -- 'normal' o 'evento'
    h10_avg       REAL,    -- humedad 10cm promedio (% VWC)
    h20_avg       REAL,    -- humedad 20cm promedio
    h30_avg       REAL,    -- humedad 30cm promedio
    h10_min       REAL,
    h10_max       REAL,
    t20           REAL,    -- temperatura 20cm (°C)
    ec30          REAL,    -- conductividad eléctrica 30cm (dS/m)
    bateria       REAL,    -- voltaje batería
    rssi          SMALLINT -- señal LoRa
);

-- Convertir a hypertable (optimización TimescaleDB para series de tiempo)
SELECT create_hypertable('lecturas', 'tiempo');

-- Índice para consultas por nodo
CREATE INDEX idx_lecturas_nodo ON lecturas (nodo_id, tiempo DESC);

-- Metadata de nodos
CREATE TABLE nodos (
    nodo_id       SMALLINT PRIMARY KEY,
    nombre        VARCHAR(50),
    rol           VARCHAR(20),  -- 'tratamiento' o 'testigo'
    bloque        SMALLINT,
    lat           REAL,
    lon           REAL,
    arbol_id      VARCHAR(20),
    fecha_instalacion DATE,
    notas         TEXT
);

-- Registro de tratamientos aplicados
CREATE TABLE tratamientos (
    id            SERIAL PRIMARY KEY,
    fecha         TIMESTAMPTZ NOT NULL,
    nodo_id       SMALLINT REFERENCES nodos(nodo_id),
    tipo          VARCHAR(50),  -- 'micorriza', 'trichoderma', 'mulch', 'riego'
    producto      VARCHAR(100),
    cantidad      REAL,
    unidad        VARCHAR(20),
    notas         TEXT
);

-- Resultados de laboratorio (microbioma)
CREATE TABLE microbioma (
    id            SERIAL PRIMARY KEY,
    fecha_muestreo TIMESTAMPTZ NOT NULL,
    nodo_id       SMALLINT REFERENCES nodos(nodo_id),
    profundidad   SMALLINT,     -- cm
    metodo        VARCHAR(20),  -- 'qPCR', '16S', 'ITS', 'solvita'
    target        VARCHAR(50),  -- '16S_universal', 'AMF', 'trichoderma', 'phytophthora'
    valor         REAL,         -- copias/g para qPCR, índice Shannon para 16S, mg CO2 para solvita
    unidad        VARCHAR(30),
    -- Snapshot del sensor al momento del muestreo
    h10_momento   REAL,
    h20_momento   REAL,
    h30_momento   REAL,
    t20_momento   REAL,
    ec30_momento  REAL,
    notas         TEXT
);

-- Eventos detectados automáticamente
CREATE TABLE eventos (
    id            SERIAL PRIMARY KEY,
    tiempo        TIMESTAMPTZ NOT NULL,
    nodo_id       SMALLINT REFERENCES nodos(nodo_id),
    tipo          VARCHAR(30),  -- 'mojado', 'secado_completo', 'alerta_phytophthora', etc.
    datos         JSONB,        -- detalles del evento (flexible)
    procesado     BOOLEAN DEFAULT FALSE
);

-- Firma hídrica calculada por evento de riego
CREATE TABLE firma_hidrica (
    id            SERIAL PRIMARY KEY,
    nodo_id       SMALLINT REFERENCES nodos(nodo_id),
    evento_riego  TIMESTAMPTZ NOT NULL,  -- cuándo se detectó el riego
    vel_10_20     REAL,    -- velocidad infiltración 10→20cm (m/min)
    vel_20_30     REAL,    -- velocidad infiltración 20→30cm
    tau_10        REAL,    -- constante de secado 10cm (horas)
    tau_20        REAL,    -- constante de secado 20cm
    tau_30        REAL,    -- constante de secado 30cm
    h10_pico      REAL,    -- humedad máxima alcanzada a 10cm
    h30_pico      REAL,    -- humedad máxima alcanzada a 30cm
    breaking_point_10  REAL,  -- VWC del punto de quiebre a 10cm
    tiempo_drenaje_10  REAL,  -- horas hasta breaking point a 10cm
    delta_h_max   REAL     -- diferencia máxima h10-h30 durante evento
);
```

### 1.5 Script de ingesta en Python (reemplaza Node-RED)

Node-RED es visual y rápido para prototipar, pero para un proyecto de este nivel se vuelve difícil de versionar en Git, depurar, y mantener. Mejor tener todo el backend en un solo lenguaje: Python.

**Archivo:** `backend/ingesta.py`

Este script corre como servicio Docker (siempre encendido), se suscribe a MQTT, valida datos e inserta en TimescaleDB.

```python
"""
Servicio de ingesta MQTT → TimescaleDB
Corre como daemon dentro de Docker (restart: always)
"""
import json
import logging
import paho.mqtt.client as mqtt
import psycopg2
from psycopg2.extras import execute_values
from config import MQTT_HOST, MQTT_PORT, MQTT_USER, MQTT_PASS, DB_DSN

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingesta")

# --- Validación ---
RANGOS = {
    "h10_avg": (0, 100), "h20_avg": (0, 100), "h30_avg": (0, 100),
    "t20": (-10, 60), "ec30": (0, 20), "bateria": (2.5, 4.5)
}

def validar(datos):
    """Retorna True si todos los valores están en rango razonable"""
    checks = {
        "h10_avg": datos["humedad"]["h10_avg"],
        "h20_avg": datos["humedad"]["h20_avg"],
        "h30_avg": datos["humedad"]["h30_avg"],
        "t20": datos["temperatura"]["t20"],
        "ec30": datos["ec"]["ec30"],
        "bateria": datos["bateria"],
    }
    for campo, valor in checks.items():
        lo, hi = RANGOS[campo]
        if valor < lo or valor > hi:
            logger.warning(f"Nodo {datos['nodo_id']}: {campo}={valor} fuera de rango [{lo},{hi}]")
            return False
    return True

# --- Detección de evento de mojado ---
ultimas_lecturas = {}  # nodo_id → última h10

def detectar_evento_mojado(datos):
    """Detecta incremento súbito en humedad a 10cm"""
    nid = datos["nodo_id"]
    h10 = datos["humedad"]["h10_avg"]
    
    if nid in ultimas_lecturas:
        delta = h10 - ultimas_lecturas[nid]
        if delta > 3.0:  # >3% VWC de incremento entre lecturas de 5 min
            return {"tipo": "mojado", "delta": delta, "h10_pre": ultimas_lecturas[nid], "h10_post": h10}
    
    ultimas_lecturas[nid] = h10
    return None

# --- Inserción en base de datos ---
def insertar_lectura(conn, datos):
    sql = """INSERT INTO lecturas 
        (tiempo, nodo_id, tipo, h10_avg, h20_avg, h30_avg,
         h10_min, h10_max, t20, ec30, bateria, rssi)
        VALUES (to_timestamp(%s), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    
    with conn.cursor() as cur:
        cur.execute(sql, (
            datos["timestamp"], datos["nodo_id"], datos["tipo"],
            datos["humedad"]["h10_avg"], datos["humedad"]["h20_avg"], datos["humedad"]["h30_avg"],
            datos["humedad"]["h10_min"], datos["humedad"]["h10_max"],
            datos["temperatura"]["t20"], datos["ec"]["ec30"],
            datos["bateria"], datos["rssi"]
        ))
    conn.commit()

def insertar_evento(conn, datos, evento):
    sql = """INSERT INTO eventos (tiempo, nodo_id, tipo, datos) 
             VALUES (to_timestamp(%s), %s, %s, %s)"""
    with conn.cursor() as cur:
        cur.execute(sql, (datos["timestamp"], datos["nodo_id"], evento["tipo"], json.dumps(evento)))
    conn.commit()

# --- Callbacks MQTT ---
def on_connect(client, userdata, flags, rc):
    logger.info(f"Conectado a MQTT (rc={rc})")
    client.subscribe("agtech/nodos/+/datos")

def on_message(client, userdata, msg):
    try:
        datos = json.loads(msg.payload)
        
        if not validar(datos):
            return
        
        conn = userdata["db_conn"]
        insertar_lectura(conn, datos)
        logger.info(f"Nodo {datos['nodo_id']}: h10={datos['humedad']['h10_avg']:.1f} "
                     f"h20={datos['humedad']['h20_avg']:.1f} t20={datos['temperatura']['t20']:.1f}")
        
        evento = detectar_evento_mojado(datos)
        if evento:
            insertar_evento(conn, datos, evento)
            logger.info(f"EVENTO MOJADO Nodo {datos['nodo_id']}: Δh10={evento['delta']:.1f}%")
    
    except Exception as e:
        logger.error(f"Error procesando mensaje: {e}")

# --- Main ---
def main():
    conn = psycopg2.connect(DB_DSN)
    
    client = mqtt.Client(userdata={"db_conn": conn})
    client.username_pw_set(MQTT_USER, MQTT_PASS)
    # client.tls_set()  # Descomentar cuando configures TLS
    client.on_connect = on_connect
    client.on_message = on_message
    
    client.connect(MQTT_HOST, MQTT_PORT)
    logger.info("Servicio de ingesta iniciado")
    client.loop_forever()

if __name__ == "__main__":
    main()
```

**Ventajas sobre Node-RED:**
- Todo versionable en Git (no flujos JSON visuales)
- Testeable con pytest
- Un solo lenguaje para todo el backend
- Fácil de agregar lógica compleja (detección de eventos, transformaciones)
- Depurable con logging estándar

---

## NIVEL 2: Alertas y reglas

### 2.1 Script Python de alertas

**Archivo:** `backend/alertas.py`

Este script corre como servicio (cron cada 5 minutos o daemon), consulta la base de datos y genera alertas.

```
Responsabilidades:
├── Cada 5 minutos, consultar últimas lecturas por nodo
├── Evaluar reglas de alerta:
│   ├── REGAR: h10 < breaking_point por >2 lecturas consecutivas
│   ├── RIESGO PHYTOPHTHORA: score basado en humedad + temperatura + duración
│   ├── DRENAJE LENTO: tiempo post-riego > 2× baseline
│   ├── SENSOR OFFLINE: sin datos en >30 minutos
│   └── BATERÍA BAJA: voltaje < 3.3V
├── Si hay alerta nueva, guardar en tabla eventos
└── Enviar notificación por Telegram
```

**Sistema de puntuación Phytophthora (0-100):**

```python
def calcular_riesgo_phytophthora(h10, h20, h30, t20, horas_humedo):
    """
    Calcula score de riesgo de Phytophthora cinnamomi (0-100)
    Basado en literatura: esporulación requiere suelo húmedo + T > 15°C
    """
    score = 0
    
    # Humedad alta en zona de raíces (0-40 puntos)
    if h10 > 45:
        score += 20
    elif h10 > 40:
        score += 10
    
    if h20 > 45:
        score += 20
    elif h20 > 40:
        score += 10
    
    # Temperatura en rango óptimo para Phytophthora (0-30 puntos)
    if 22 <= t20 <= 28:
        score += 30  # rango óptimo
    elif 15 <= t20 < 22:
        score += 15  # puede esporular pero más lento
    elif t20 < 15:
        score += 0   # no esporula
    
    # Duración de condiciones húmedas (0-30 puntos)
    if horas_humedo > 72:
        score += 30
    elif horas_humedo > 48:
        score += 20
    elif horas_humedo > 24:
        score += 10
    
    return min(score, 100)

# Clasificación:
# 0-25:  BAJO      → Sin acción
# 26-50: MODERADO  → Monitorear, considerar reducir riego
# 51-75: ALTO      → Reducir riego, considerar aplicar Trichoderma
# 76-100: CRÍTICO  → Suspender riego, aplicar Trichoderma urgente
```

### 2.2 Bot de Telegram para el equipo técnico

**Archivo:** `backend/telegram_bot.py`

Este bot es una herramienta interna para tus agrónomos en campo (tú, Salvador, y el equipo que vaya creciendo). El agricultor NO recibe alertas directas — tus agrónomos interpretan los datos y le dan instrucciones claras al productor.

**Grupo de Telegram:** Crear grupo "AgTech - Equipo Campo" con todos los agrónomos.

```
Responsabilidades:
├── Alertas automáticas al grupo (lenguaje técnico, sin simplificar):
│   ├── "Nodo 3: h10=47% VWC ×52h, T20=24°C, score Phyto 72/100.
│   │    τ₁₀ subió 30% vs baseline. Revisar drenaje, considerar Trichoderma."
│   ├── "Nodo 1: breaking point cruzado a 10cm. Programar riego."
│   ├── "Divergencia CUSUM detectada Bloque 2: τ tratamiento +2.1h vs testigo."
│   └── "Nodo 5 offline hace 45 min. Último RSSI: -89. Posible batería."
│
├── Comandos disponibles para agrónomos:
│   ├── /estado          → tabla resumen de todos los nodos (humedad, temp, EC, batería)
│   ├── /nodo {id}       → detalle técnico: últimas 24h, tendencias, anomalías
│   ├── /riesgo          → score Phytophthora de cada nodo + factores contribuyentes
│   ├── /firma {id}      → última firma hídrica: τ, velocidad infiltración, breaking point
│   ├── /comparar        → diferencias tratamiento vs testigo por bloque
│   ├── /regar           → qué nodos necesitan riego y urgencia (bajo/medio/alto)
│   ├── /aplicar         → condiciones actuales para bioinsumos (¿es buen día para micorrizas?)
│   ├── /registrar       → registrar tratamiento aplicado (tipo, cantidad, nodo, notas)
│   ├── /lab             → registrar resultado de laboratorio (qPCR, Solvita, etc.)
│   └── /reporte {semana}→ generar reporte semanal PDF para el agricultor
│
├── Resumen diario automático a las 7am:
│   ├── Estado de cada nodo (online/offline, batería)
│   ├── Nodos que necesitan riego hoy
│   ├── Score Phytophthora si alguno > 25
│   └── Divergencias tratamiento-testigo si las hay
│
└── Reporte semanal automático (lunes 8am):
    ├── Resumen de firma hídrica: cómo evolucionó τ en la semana
    ├── Comparativo tratamiento vs testigo
    ├── Próximos muestreos de laboratorio programados
    └── Recomendaciones de acción para la semana
```

**¿Por qué Telegram y no una app?** Es gratis, funciona en cualquier teléfono, los agrónomos ya lo usan, soporta grupos y bots sin costo, y no necesitas desarrollar ni mantener una app. El agricultor recibe indicaciones directas de tu agrónomo en persona o por WhatsApp, no del sistema. Cuando escales, el bot puede evolucionar a una app interna del equipo.

**Librería:** `python-telegram-bot`

**Niveles de acceso por rol (configurar en config.py):**
- **Admin** (tú): todos los comandos + configuración de umbrales
- **Agrónomo campo** (Salvador, equipo): todos los comandos operativos
- **Observador** (investigadores CUCBA, asesores): solo /estado, /nodo, /firma (lectura)

---

## NIVEL 3: Firma hídrica + Machine Learning

### 3.1 Cálculo de firma hídrica

**Archivo:** `backend/firma_hidrica.py`

Se ejecuta cada vez que se detecta un evento de mojado (trigger desde Node-RED o como cronjob que revisa la tabla de eventos).

```
Flujo:
├── Input: evento de mojado detectado en nodo X a tiempo T
│
├── Consultar datos de alta resolución (20 seg) del evento
│   └── Ventana: desde T-30min hasta T+48h (o hasta siguiente evento)
│
├── Calcular velocidad del frente de mojado:
│   ├── Detectar tiempo de arribo a cada profundidad
│   │   (primer momento donde dθ/dt > umbral)
│   ├── vel_10_20 = 0.10m / (t_arribo_20 - t_arribo_10)
│   └── vel_20_30 = 0.10m / (t_arribo_30 - t_arribo_20)
│
├── Calcular curva de secado (post-pico):
│   ├── Identificar θ_pico por profundidad
│   ├── Ajustar: θ(t) = θ_fc × exp(-t/τ) + θ_residual
│   │   └── scipy.optimize.curve_fit()
│   ├── Extraer τ (constante de secado) por profundidad
│   └── Detectar breaking_point (donde d²θ/dt² cambia de signo)
│
├── Calcular métricas derivadas:
│   ├── delta_h_max = max(h10 - h30) durante evento
│   ├── tiempo_drenaje = horas desde pico hasta breaking_point
│   └── amplitud = θ_pico - θ_pre_riego
│
└── Guardar en tabla firma_hidrica
```

**Librerías Python:**
- `scipy.optimize.curve_fit` — ajuste exponencial
- `numpy` — cálculos numéricos
- `pandas` — manejo de series de tiempo

### 3.2 Análisis comparativo (Nodo Testigo)

**Archivo:** `backend/comparativo.py`

Se ejecuta como cronjob diario y semanal.

```
Diario:
├── Para cada bloque (o par tratamiento-testigo):
│   ├── Calcular media diaria de h10, h20, h30, t20, ec30
│   ├── Calcular diferencia: Δ = tratamiento - testigo
│   ├── Aplicar CUSUM sobre la serie de Δ
│   │   └── Si CUSUM cruza umbral → guardar alerta de divergencia
│   └── Guardar en tabla comparativo_diario
│
Semanal:
├── Comparar últimas firmas hídricas entre pares:
│   ├── ¿τ del tratamiento está cambiando vs. testigo?
│   ├── ¿Velocidad de infiltración diverge?
│   └── ¿Breaking point se mueve?
├── Generar reporte semanal en Telegram
└── Si hay datos de microbioma nuevos, actualizar correlaciones
```

**CUSUM simplificado:**

```python
def cusum(diferencias, umbral_h=None):
    """
    Detecta cambio sostenido en la serie de diferencias
    tratamiento - testigo.
    
    diferencias: array de (valor_tratamiento - valor_testigo) diarios
    umbral_h: si None, se calcula como 4 × desviación estándar del baseline
    """
    media_baseline = np.mean(diferencias[:28])  # primeros 28 días = línea base
    std_baseline = np.std(diferencias[:28])
    
    if umbral_h is None:
        umbral_h = 4 * std_baseline
    
    k = std_baseline / 2  # slack parameter
    
    s_pos = np.zeros(len(diferencias))  # detecta incremento
    s_neg = np.zeros(len(diferencias))  # detecta decremento
    alarmas = []
    
    for i in range(1, len(diferencias)):
        s_pos[i] = max(0, s_pos[i-1] + (diferencias[i] - media_baseline) - k)
        s_neg[i] = max(0, s_neg[i-1] - (diferencias[i] - media_baseline) - k)
        
        if s_pos[i] > umbral_h or s_neg[i] > umbral_h:
            alarmas.append({
                'dia': i,
                'tipo': 'incremento' if s_pos[i] > umbral_h else 'decremento',
                'magnitud': s_pos[i] if s_pos[i] > umbral_h else s_neg[i]
            })
    
    return alarmas
```

### 3.3 Modelo predictivo microbioma-sensores

**Archivo:** `backend/modelo_microbioma.py`

Este se desarrolla gradualmente conforme acumulas datos pareados (sensor + laboratorio).

```
Fase 1 — Recolección (meses 1-6):
├── Cada vez que se sube resultado de laboratorio a tabla microbioma,
│   el sistema automáticamente registra el snapshot de sensores
└── Acumular mínimo 50 pares (sensor, microbioma)

Fase 2 — Entrenamiento (meses 6-9):
├── Features de entrada (calculadas desde sensores):
│   ├── h10_avg_7d      — media de humedad 10cm últimos 7 días
│   ├── h20_avg_7d
│   ├── h30_avg_7d
│   ├── t20_avg_7d      — media temperatura últimos 7 días
│   ├── ec30_avg_7d
│   ├── dh10_dt_7d      — tasa de cambio promedio de humedad 10cm
│   ├── h10_x_t20_7d    — interacción humedad × temperatura
│   ├── cv_h10_7d       — coeficiente de variación humedad 10cm
│   ├── gdd_acum        — grados-día acumulados (base 10°C)
│   ├── dias_ultimo_mojado — días desde último evento de riego
│   └── tau_10_ultimo   — última constante de secado calculada
│
├── Target (variable a predecir):
│   ├── qPCR: copias/g de cada target (16S, AMF, Trichoderma, Phytophthora)
│   └── Solvita: mg CO2 (respiración)
│
├── Modelo: Random Forest (sklearn)
│   ├── Ventaja: robusto con pocos datos, interpretable, no necesita GPU
│   ├── Hiperparámetros iniciales: n_estimators=100, max_depth=10
│   └── Validación: Leave-One-Out temporal (entrena con todo menos 1 fecha)
│
└── Métricas: R², MAE, feature importance

Fase 3 — Predicción (mes 9+):
├── Cada día, correr modelo con features actuales de sensores
├── Predecir estado microbiano estimado
├── Si condiciones son óptimas para aplicar bioinsumo → alerta
└── Registrar predicción para comparar con siguiente lab real
```

**Librería principal:** `scikit-learn` (Random Forest). Si después quieres LSTM para predicción temporal, usa `tensorflow-lite` (corre en Raspberry Pi).

---

## NIVEL 4: Sistema Multi-Agente (El Combo Matemático + LLM)

### 4.1 Separación de responsabilidades (Separation of Concerns)

El Nivel 4 introduce un patrón de dos agentes con responsabilidades radicalmente distintas. El principio es simple: la matemática pesada se hace localmente en el VPS (barato, predecible, sin latencia), y la interpretación experta se delega a un LLM externo (flexible, contextual, actualizado con literatura).

**Agente 1 — El Calculador Local (scripts Python en VPS)**

Los scripts de los Niveles 2 y 3 (`alertas.py`, `firma_hidrica.py`, `comparativo.py`, `modelo_microbioma.py`) procesan las ~172,800 lecturas diarias por nodo (1 lectura/20 seg × 86,400 seg/día × 2 por agregación). Cuando detectan una anomalía o superan un umbral de riesgo, NO envían la alerta directamente al bot de Telegram. En su lugar, generan un **payload de resumen en texto plano** que condensa horas o días de datos en un párrafo de ~200 palabras.

```python
# Ejemplo de payload generado por el Agente 1
resumen = {
    "timestamp": "2026-07-15T14:30:00Z",
    "tipo": "alerta_phytophthora",
    "prioridad": "alta",
    "contexto": (
        "Bloque 2, Nodo 3 (tratamiento), Aguacate Hass 8 años, andisol volcánico.\n"
        "Últimas 72 horas:\n"
        "- Humedad 10cm: promedio 48.2% VWC (baseline: 32%), máximo 52.1%\n"
        "- Humedad 20cm: promedio 44.7% VWC (baseline: 35%)\n"
        "- Temperatura 20cm: promedio 24.3°C, rango 21.8-26.1°C\n"
        "- EC 30cm: 1.8 dS/m (estable)\n"
        "- Score Phytophthora: 85/100 (crítico)\n"
        "- Velocidad infiltración 10→20cm: 0.003 m/min (baseline: 0.008, caída del 62%)\n"
        "- τ secado 10cm: 18.2h (baseline: 12.4h, incremento 47%)\n"
        "- CUSUM: divergencia positiva desde hace 5 días vs. testigo (Nodo 4)\n"
        "- Último qPCR (hace 8 días): Trichoderma 2.3×10⁴ copias/g, "
        "P. cinnamomi 8.7×10³ copias/g (subió 2.1× vs. muestreo anterior)\n"
        "- Fenología actual: cuajado de fruto (fase crítica)\n"
        "- Último tratamiento: Trichoderma aplicado hace 6 semanas\n"
        "- Precipitación acumulada últimos 7 días: 85mm (dato manual)"
    )
}
```

El Agente 1 es determinista, reproducible, y cuesta $0 en APIs externas. Procesa millones de datos sin problema. Su output es un resumen comprimido de la situación.

**Agente 2 — El Consultor Experto (LLM API)**

**Archivo:** `backend/llm_consultor.py`

Este script toma el resumen del Agente 1 y hace un request a la API de un LLM (Claude o Gemini), inyectando un system prompt especializado en agronomía de aguacate. El LLM aporta lo que los scripts matemáticos no pueden: razonamiento contextual, cruce con literatura científica, y recomendaciones accionables en lenguaje natural.

```python
"""
Agente 2: Consultor Experto LLM
Toma resúmenes del Agente 1 y genera diagnósticos accionables.
"""
import anthropic  # pip install anthropic
import json
from config import ANTHROPIC_API_KEY

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """Eres un agrónomo experto en aguacate Hass (Persea americana Mill.) 
con especialización en fitopatología de suelos tropicales y subtropicales. 
Tu contexto operativo es Jalisco, México, en suelos volcánicos (andisoles).

Tu trabajo:
1. Revisar las métricas de sensores IoT que te proporcionan.
2. Compararlas con la literatura científica sobre Phytophthora cinnamomi, 
   dinámica hídrica en andisoles, y microbiología del suelo en aguacate.
3. Validar matemáticamente la alerta: ¿los números justifican el nivel de riesgo asignado?
4. Devolver exactamente 2 recomendaciones orgánicas y accionables que un agrónomo de campo 
   pueda ejecutar en las próximas 24-48 horas.
5. Si los datos de firma hídrica sugieren cambios en la estructura del suelo 
   (τ, velocidad infiltración), explicar qué está pasando físicamente.
6. Citar la referencia científica más relevante cuando hagas una afirmación técnica.

Formato de respuesta:
- DIAGNÓSTICO: 2-3 oraciones explicando qué está pasando y por qué.
- RECOMENDACIÓN 1: acción concreta, cantidad si aplica, timing.
- RECOMENDACIÓN 2: acción concreta, cantidad si aplica, timing.
- REFERENCIA: cita breve de la literatura que respalda tu diagnóstico.

Sé directo. El receptor es un agrónomo técnico, no un agricultor. 
Usa unidades SI y terminología técnica sin simplificar."""


def consultar_llm(resumen: dict) -> str:
    """
    Envía el resumen del Agente 1 al LLM y retorna el diagnóstico procesado.
    """
    mensaje_usuario = (
        f"Tipo de alerta: {resumen['tipo']}\n"
        f"Prioridad: {resumen['prioridad']}\n"
        f"Timestamp: {resumen['timestamp']}\n\n"
        f"Datos del sistema:\n{resumen['contexto']}"
    )
    
    response = client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=800,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": mensaje_usuario}
        ]
    )
    
    return response.content[0].text


def formatear_para_telegram(diagnostico: str, resumen: dict) -> str:
    """
    Formatea la respuesta del LLM para envío por Telegram.
    Agrega emojis y estructura visual para lectura rápida en móvil.
    """
    nodo = resumen.get("nodo_id", "?")
    bloque = resumen.get("bloque", "?")
    score = resumen.get("score_phytophthora", "?")
    prioridad = resumen.get("prioridad", "media")
    
    emoji_prioridad = {"baja": "🟢", "media": "🟡", "alta": "🟠", "critica": "🔴"}
    emoji = emoji_prioridad.get(prioridad, "⚪")
    
    mensaje = (
        f"{emoji} *ALERTA — Bloque {bloque}, Nodo {nodo}*\n"
        f"Score Phytophthora: *{score}/100*\n"
        f"{'━' * 30}\n\n"
        f"{diagnostico}\n\n"
        f"{'━' * 30}\n"
        f"_Diagnóstico generado por IA a partir de {resumen.get('horas_datos', '?')}h "
        f"de datos continuos de sensores. Verificar en campo antes de actuar._"
    )
    
    return mensaje
```

### 4.2 Flujo completo del sistema multi-agente

```
Cada 5 minutos (alertas.py):
│
├── Score Phytophthora < 50 → log normal, no acción
│
├── Score Phytophthora 50-75 → guardar en tabla eventos
│   └── Cada 12h: generar resumen → llm_consultor.py → Telegram (prioridad media)
│
└── Score Phytophthora > 75 → guardar en tabla eventos
    └── Inmediato: generar resumen → llm_consultor.py → Telegram (prioridad alta)

Diario (comparativo.py, 6:00 AM):
│
├── CUSUM sin alarma → resumen diario estándar por Telegram (sin LLM)
│
└── CUSUM con alarma (divergencia detectada) →
    └── Generar resumen con contexto de divergencia → llm_consultor.py → Telegram

Semanal (lunes 7:00 AM):
│
└── Reporte integral de todos los bloques →
    └── Resumen agregado → llm_consultor.py → Telegram (análisis de tendencias)
```

### 4.3 Formato de salida: cómo se ve el mensaje en Telegram

El agrónomo recibe en su teléfono un mensaje como este:

```
🔴 *ALERTA — Bloque 2, Nodo 3*
Score Phytophthora: *85/100*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*DIAGNÓSTICO:* Las condiciones de humedad sostenida a 48% VWC
por 72h combinadas con temperatura óptima de 24°C en la zona
radicular crean un ambiente favorable para la esporulación
de P. cinnamomi. La caída del 62% en velocidad de infiltración
y el incremento del 47% en τ sugieren saturación de macroporos
y posible inicio de condiciones anóxicas en los primeros 20cm.
El último qPCR mostró un incremento de 2.1× en inóculo del
patógeno, consistente con las condiciones hídricas observadas.

*RECOMENDACIÓN 1:* Suspender riego por mínimo 72h. En fase de
cuajado, el árbol tolera estrés moderado (hasta -0.8 MPa de
potencial hídrico) sin abscisión significativa de fruto. Permitir
que h10 baje a 30% VWC antes de reanudar con pulsos cortos.

*RECOMENDACIÓN 2:* Aplicar Trichoderma harzianum (dosis 2×10⁸
UFC/árbol) en drench al suelo en las próximas 48h, una vez que
h10 baje del 40% VWC. Aplicar en suelo húmedo pero no saturado
(30-40% VWC) para maximizar colonización. La última aplicación
fue hace 6 semanas, ya fuera de ventana de protección.

*REF:* Ramírez-Gil et al. (2018), Scientia Horticulturae:
correlación P<0.001 entre humedad acumulada e inóculo de
P. cinnamomi en aguacate cv. Hass.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Diagnóstico generado por IA a partir de 72h de datos continuos
de sensores. Verificar en campo antes de actuar._
```

Comparación con lo que el bot enviaba antes (solo Nivel 2):

```
⚠️ Nodo 3: riesgo Phytophthora ALTO (score 85).
h10=48% VWC ×72h, T20=24°C. Considerar reducir riego.
```

La diferencia es clara: el agrónomo ya no recibe datos crudos que tiene que interpretar él mismo, sino un diagnóstico completo con razonamiento causal, recomendaciones cuantificadas (dosis, timing, umbrales), y respaldo bibliográfico.

### 4.4 Consideraciones de costos y eficiencia (FinOps)

Esta arquitectura es deliberadamente económica porque respeta un principio clave: **el LLM nunca toca la base de datos de series temporales.**

Si le pasaras las 172,800 lecturas diarias de un solo nodo directamente al LLM, estarías gastando ~50,000 tokens de input por consulta. Con 8 nodos y consultas cada hora, eso serían ~9.6 millones de tokens/día — prohibitivo en costo y absurdo en utilidad (el LLM no es bueno procesando tablas numéricas masivas).

En su lugar, la arquitectura funciona así:

| Componente | Qué procesa | Costo |
|---|---|---|
| Agente 1 (Python/VPS) | 172,800 lecturas/día/nodo, cálculos de firma hídrica, CUSUM, Random Forest | $0 (ya incluido en el VPS de $6/mes) |
| Agente 2 (LLM API) | 1-3 resúmenes/día en texto plano (~500 tokens input + ~400 tokens output) | ~$0.01-0.05 USD/día |

**Costo mensual estimado del LLM:**

Con Claude Sonnet a precios actuales (~$3/M tokens input, ~$15/M tokens output):
- 2 consultas diarias × 30 días = 60 consultas/mes
- 60 × 500 tokens input = 30,000 tokens input → $0.09
- 60 × 400 tokens output = 24,000 tokens output → $0.36
- **Total: ~$0.45 USD/mes**

Incluso si triplicas la frecuencia de consultas o usas un modelo más potente, el costo se mantiene por debajo de $5 USD/mes. El 99.99% del procesamiento es local y gratuito. El LLM solo se invoca cuando hay algo relevante que interpretar.

**Fallback si la API no está disponible:** si el request al LLM falla (timeout, error de red, cuota excedida), el sistema cae al comportamiento del Nivel 2: envía la alerta cruda con datos numéricos al grupo de Telegram. El agrónomo pierde la interpretación pero no pierde la alerta. El `llm_consultor.py` incluye retry con backoff exponencial y logging de fallos.

```python
def consultar_con_fallback(resumen: dict) -> str:
    """Intenta consultar LLM, si falla retorna alerta cruda."""
    for intento in range(3):
        try:
            return consultar_llm(resumen)
        except Exception as e:
            logging.warning(f"LLM intento {intento+1} falló: {e}")
            time.sleep(2 ** intento)  # backoff: 1s, 2s, 4s
    
    # Fallback: alerta cruda sin LLM
    logging.error("LLM no disponible, enviando alerta cruda")
    return f"⚠️ ALERTA SIN PROCESAR (LLM offline)\n\n{resumen['contexto']}"
```

---

## Estructura de carpetas del proyecto

```
agtech-sistema/
│
├── firmware/
│   ├── nodo_sensor/
│   │   ├── nodo_sensor.ino        ← código ESP32 del nodo
│   │   ├── config.h               ← IDs, pines, umbrales, credenciales OTA
│   │   └── ota.h                  ← lógica de actualización Over-The-Air
│   └── releases/                  ← binarios compilados (.bin) para OTA
│       └── nodo_sensor_v1.0.3.bin
│
├── docker/
│   ├── docker-compose.yml         ← levanta todos los servicios en el VPS
│   ├── mosquitto/
│   │   └── config/
│   │       ├── mosquitto.conf
│   │       └── passwd             ← usuarios MQTT
│   ├── timescaledb/
│   └── grafana/
│
├── sql/
│   └── schema.sql                 ← esquema de base de datos
│
├── backend/
│   ├── Dockerfile                 ← para correr ingesta como servicio Docker
│   ├── requirements.txt           ← dependencias Python
│   ├── config.py                  ← credenciales, umbrales, parámetros, API keys
│   ├── ingesta.py                 ← MQTT → validación → TimescaleDB
│   ├── alertas.py                 ← Nivel 2: sistema de reglas
│   ├── telegram_bot.py            ← notificaciones al equipo
│   ├── firma_hidrica.py           ← Nivel 3: cálculo de firma
│   ├── comparativo.py             ← Nivel 3: análisis A/B (CUSUM)
│   ├── modelo_microbioma.py       ← Nivel 3: ML predicción microbioma
│   ├── llm_consultor.py           ← Nivel 4: consulta API de LLM
│   ├── prompts/
│   │   ├── phytophthora.txt       ← system prompt para alertas de Phytophthora
│   │   ├── firma_hidrica.txt      ← system prompt para análisis de firma hídrica
│   │   ├── reporte_semanal.txt    ← system prompt para reporte semanal
│   │   └── bioinsumos.txt         ← system prompt para timing de bioinsumos
│   └── utils/
│       ├── db.py                  ← conexión a TimescaleDB
│       └── calibracion.py         ← curvas de calibración de sensores
│
├── grafana/
│   └── dashboards/
│       ├── overview.json          ← dashboard general
│       ├── nodo_detalle.json      ← detalle por nodo
│       ├── firma_hidrica.json     ← visualización de firma
│       └── comparativo.json       ← tratamiento vs. testigo
│
├── notebooks/                     ← para exploración y análisis (local, no en VPS)
│   ├── 01_calibracion.ipynb
│   ├── 02_firma_hidrica.ipynb
│   ├── 03_comparativo.ipynb
│   └── 04_modelo_microbioma.ipynb
│
└── docs/
    ├── Opciones_Despliegue.md
    └── README.md
```

---

## Orden de construcción recomendado

### Etapa 1: Que los datos fluyan (semanas 1-2)

```
1. Contratar VPS (DigitalOcean $6/mes o similar)
2. Levantar Docker Compose en el VPS (Mosquitto + TimescaleDB + Grafana)
3. Configurar seguridad: TLS en Mosquitto, firewall, usuarios MQTT
4. Armar 1 nodo de prueba (firmware/nodo_sensor.ino)
5. Configurar gateway RAK con SIM 4G, apuntando al MQTT del VPS
6. Implementar ingesta.py y desplegarlo como servicio Docker
7. Verificar que los datos aparecen en TimescaleDB
8. Configurar dashboard básico en Grafana (1 gráfica por sensor)
```

**Test de validación:** pon el nodo en un vaso de agua. Deberías ver la humedad subir en Grafana desde tu casa en <5 minutos.

### Etapa 2: Que avise cosas útiles (semanas 3-4)

```
1. Crear bot de Telegram + grupo "AgTech - Equipo Campo"
2. Configurar roles (admin, agrónomo, observador)
3. Implementar alertas.py con regla más simple: sensor offline
4. Agregar alerta de batería baja
5. Agregar alerta de riego (breaking point estático por ahora)
6. Agregar score de Phytophthora
7. Implementar comandos: /estado, /nodo, /riesgo, /regar
8. Agregar /registrar y /lab para que agrónomos suban datos desde campo
9. Programar cron para que corra cada 5 minutos
10. Programar resumen diario a las 7am + reporte semanal lunes 8am
```

**Test de validación:** desconecta un nodo. En <30 minutos debería llegar alerta al grupo de Telegram con datos técnicos del fallo.

### Etapa 3: Que entienda el suelo (meses 2-3)

```
1. Implementar detección de eventos de mojado en ingesta.py
2. Implementar firma_hidrica.py (velocidad infiltración + curva secado)
3. Dashboard de firma hídrica en Grafana
4. Reemplazar breaking point estático por el calculado dinámicamente
5. Implementar comparativo.py (CUSUM entre pares)
6. Dashboard comparativo en Grafana
```

**Test de validación:** riega un árbol. El sistema debería detectar el evento, calcular velocidad de infiltración, y mostrar la curva de secado.

### Etapa 4: Que aprenda biología (meses 4-12)

```
1. Cada vez que hagas muestreo de lab, subir datos a tabla microbioma
   (puede ser manual por ahora, después un form en Telegram)
2. Acumular 50+ pares
3. Explorar correlaciones en Jupyter notebooks
4. Entrenar primer Random Forest
5. Si R² > 0.5, desplegarlo como predicción diaria
6. Agregar alertas de timing óptimo de bioinsumos
```

**Test de validación:** el modelo debería poder decir "basado en las condiciones de los últimos 7 días, la actividad microbiana estimada es X" y cuando compares con el lab real, estar dentro del ±30%.

### Etapa 5: Que diagnostique como experto (mes 6+)

```
1. Crear cuenta en Anthropic API (o Google AI Studio para Gemini)
2. Implementar llm_consultor.py con system prompt de Phytophthora
3. Conectar alertas.py → llm_consultor.py → telegram_bot.py
4. Probar con alertas reales: verificar que el diagnóstico es coherente
5. Crear prompts especializados adicionales (firma hídrica, bioinsumos, reporte semanal)
6. Implementar fallback: si la API falla, enviar alerta cruda
7. Monitorear costo mensual de tokens (debería ser <$1 USD/mes)
```

**Test de validación:** provoca una alerta de Phytophthora (riego excesivo en un nodo). El mensaje de Telegram debería incluir diagnóstico causal, 2 recomendaciones accionables con dosis, y una referencia científica relevante.

---

## Dependencias Python (requirements.txt)

```
paho-mqtt          # cliente MQTT para ingesta.py
psycopg2-binary    # conexión PostgreSQL/TimescaleDB
numpy              # cálculos numéricos
scipy              # curve_fit para firma hídrica
pandas             # manejo de datos
scikit-learn       # Random Forest
python-telegram-bot # bot de Telegram
schedule           # programar tareas periódicas
anthropic          # API de Claude para llm_consultor.py (Nivel 4)
```

---

## Queries útiles para Grafana

```sql
-- Últimas 24h de humedad de todos los nodos
SELECT tiempo, nodo_id, h10_avg, h20_avg, h30_avg
FROM lecturas
WHERE tiempo > NOW() - INTERVAL '24 hours'
ORDER BY tiempo;

-- Comparación tratamiento vs testigo (medias diarias)
SELECT 
    date_trunc('day', l.tiempo) as dia,
    n.rol,
    AVG(l.h10_avg) as h10_media,
    AVG(l.h20_avg) as h20_media,
    AVG(l.t20) as t20_media
FROM lecturas l
JOIN nodos n ON l.nodo_id = n.nodo_id
WHERE l.tiempo > NOW() - INTERVAL '30 days'
GROUP BY dia, n.rol
ORDER BY dia;

-- Evolución de firma hídrica por nodo
SELECT 
    evento_riego,
    nodo_id,
    vel_10_20,
    tau_10,
    tau_20,
    breaking_point_10
FROM firma_hidrica
WHERE nodo_id = 1
ORDER BY evento_riego DESC
LIMIT 20;

-- Score de riesgo Phytophthora actual
SELECT 
    nodo_id,
    h10_avg as humedad_10cm,
    h20_avg as humedad_20cm,
    t20 as temperatura,
    CASE 
        WHEN h10_avg > 45 AND t20 BETWEEN 22 AND 28 THEN 'CRÍTICO'
        WHEN h10_avg > 40 AND t20 > 15 THEN 'ALTO'
        WHEN h10_avg > 35 THEN 'MODERADO'
        ELSE 'BAJO'
    END as riesgo
FROM lecturas l
WHERE tiempo = (SELECT MAX(tiempo) FROM lecturas WHERE nodo_id = l.nodo_id);
```

---

## Notas sobre infraestructura

### VPS en la nube
- **Plan mínimo:** 1 vCPU, 1GB RAM, 25GB SSD ($5-6 USD/mes). Suficiente para 8 nodos.
- **Escalar:** Cuando tengas 20+ nodos o múltiples parcelas, sube a 2GB RAM ($12/mes).
- **Backup:** Cron diario `pg_dump agtech_db | gzip > backup_$(date +%Y%m%d).sql.gz` + subir a S3 o Google Drive.
- **Monitoreo:** Instalar Portainer (web UI para Docker) para ver estado de servicios remotamente.
- **Dominio:** Opcional pero útil: `dashboard.tuempresa.com` apuntando al VPS con Let's Encrypt.

### Gateway en campo
- **Alimentación:** Panel solar + batería si no hay electricidad cerca. El RAK7268 consume ~5W.
- **Ubicación:** Punto alto con línea de vista a los nodos. Poste de 3m o techo de bodega.
- **Antena:** La antena incluida del RAK cubre ~2km en línea de vista. Para 4 hectáreas sobra.
- **SIM:** Plan M2M de 500MB/mes. Monitorear consumo el primer mes y ajustar.
- **Seguridad física:** Caja con candado. Si se roban el gateway, pierdes $200 USD de hardware pero cero datos.

### Raspberry Pi (uso en oficina, no en campo)
- Úsala como entorno de desarrollo: probar firmware antes de subir OTA, correr notebooks de análisis, probar cambios al backend antes de deployar al VPS.
- NO la pongas en la huerta.
