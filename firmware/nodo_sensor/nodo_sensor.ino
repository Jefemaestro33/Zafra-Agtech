/*
 * ============================================================
 * AgTech Nextipac — Nodo Sensor ESP32/TTGO T-Beam
 * ============================================================
 * Lee 3 sensores de humedad (10, 20, 30 cm), temperatura (DS18B20),
 * y conductividad eléctrica. Transmite por LoRa cada 5 minutos.
 * Deep sleep entre transmisiones para ahorrar batería.
 *
 * Flujo: wake → leer sensores × 15 (5 min) → empaquetar → TX LoRa → sleep
 *
 * Hardware: TTGO T-Beam v1.1 (ESP32 + SX1276 + GPS + OLED)
 * Frecuencia: 915 MHz (México, región 2)
 * Versión: 1.0.0
 * ============================================================
 */

#include <SPI.h>
#include <LoRa.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "config.h"
#include "ota.h"

// ============================================================
// ESTRUCTURA DEL PAQUETE LoRa (~24 bytes, binario)
// ============================================================
struct __attribute__((packed)) Paquete {
    uint8_t  nodo_id;          // 1 byte
    uint8_t  tipo;             // 1 byte  — 0=normal, 1=evento_mojado
    uint32_t timestamp;        // 4 bytes — millis()/1000 (gateway pone timestamp real)
    uint16_t hum_10_avg;       // 2 bytes — humedad 10cm × 100
    uint16_t hum_20_avg;       // 2 bytes
    uint16_t hum_30_avg;       // 2 bytes
    uint16_t hum_10_min;       // 2 bytes
    uint16_t hum_10_max;       // 2 bytes
    int16_t  temp_20;          // 2 bytes — temperatura × 100
    uint16_t ec_30;            // 2 bytes — EC × 100
    uint16_t bateria;          // 2 bytes — voltaje × 100
    int8_t   rssi;             // 1 byte  — RSSI del último TX
};
// Total: 23 bytes

// ============================================================
// VARIABLES RTC — Sobreviven deep sleep
// ============================================================
RTC_DATA_ATTR float h10_promedio_anterior = -1.0;  // Para detectar mojado
RTC_DATA_ATTR uint32_t boot_count = 0;

// ============================================================
// SENSORES
// ============================================================
OneWire oneWire(DS18B20_PIN);
DallasTemperature ds18b20(&oneWire);

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

// Parpadear LED para feedback visual
void parpadearLED(int veces, int duracion_ms) {
    for (int i = 0; i < veces; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(duracion_ms);
        digitalWrite(LED_PIN, LOW);
        if (i < veces - 1) delay(duracion_ms);
    }
}

// Leer ADC con promedio de 10 muestras (reduce ruido)
uint16_t leerADCPromedio(int pin) {
    uint32_t suma = 0;
    for (int i = 0; i < 10; i++) {
        suma += analogRead(pin);
        delayMicroseconds(500);
    }
    return (uint16_t)(suma / 10);
}

// Convertir ADC a %VWC (humedad volumétrica)
// Los sensores capacitivos dan valor BAJO en agua y ALTO en aire
float leerHumedad(int pin) {
    uint16_t adc = leerADCPromedio(pin);

    // Mapeo lineal: ADC seco (alto) → 0%, ADC agua (bajo) → 100%
    float vwc = (float)(HUM_ADC_SECO - adc) / (float)(HUM_ADC_SECO - HUM_ADC_AGUA) * 100.0;

    // Clamp a rango razonable
    if (vwc < 0.0) vwc = 0.0;
    if (vwc > 100.0) vwc = 100.0;

    return vwc;
}

// Leer conductividad eléctrica (dS/m)
float leerEC() {
    uint16_t adc = leerADCPromedio(EC_PIN);

    // Mapeo lineal: 0 ADC → 0 dS/m, EC_ADC_REF → EC_REF_DSM
    if (adc <= EC_ADC_CERO) return 0.0;
    float ec = (float)(adc - EC_ADC_CERO) / (float)(EC_ADC_REF - EC_ADC_CERO) * EC_REF_DSM;

    if (ec < 0.0) ec = 0.0;
    if (ec > 20.0) ec = 20.0;

    return ec;
}

// Leer voltaje de batería (divisor resistivo)
float leerBateria() {
    uint16_t adc = leerADCPromedio(BAT_PIN);
    float voltaje = (float)adc / 4095.0 * BAT_ADC_REF * BAT_FACTOR;
    return voltaje;
}

// Transmitir paquete por LoRa con retry (3 intentos, backoff exponencial)
// Si todos fallan, el paquete se pierde (futuro: guardar en RTC memory)
void transmitirPaquete(Paquete* paq) {
    const int MAX_RETRIES = 3;
    const int RETRY_DELAYS_MS[] = {500, 1000, 2000};

    for (int intento = 0; intento < MAX_RETRIES; intento++) {
        LoRa.beginPacket();
        LoRa.write((uint8_t*)paq, sizeof(Paquete));
        int result = LoRa.endPacket();

        if (result == 1) {
            // TX success
            paq->rssi = (int8_t)LoRa.packetRssi();
            if (intento > 0) {
                Serial.printf("[LORA] TX OK after %d retries\n", intento);
            }
            return;
        }

        Serial.printf("[LORA] TX failed (attempt %d/%d)\n", intento + 1, MAX_RETRIES);
        if (intento < MAX_RETRIES - 1) {
            delay(RETRY_DELAYS_MS[intento]);
        }
    }

    Serial.println("[LORA] TX failed after all retries — packet lost");
    // TODO: store failed packet in RTC memory to retry on next wake cycle
}

// Entrar en deep sleep
void entrarDeepSleep(uint64_t tiempo_us) {
    Serial.printf("[SLEEP] Durmiendo %llu us (~%.0f s)\n", tiempo_us, tiempo_us / 1000000.0);
    Serial.flush();

    // Apagar todo para mínimo consumo
    LoRa.sleep();
    digitalWrite(HUM_POWER_PIN, LOW);
    digitalWrite(EC_POWER_PIN, LOW);
    digitalWrite(LED_PIN, LOW);

    esp_sleep_enable_timer_wakeup(tiempo_us);
    esp_deep_sleep_start();
}

// ============================================================
// SETUP — Todo el trabajo se hace aquí + deep sleep
// ============================================================
void setup() {
    // ---- OTA primero (antes de cualquier otra cosa) ----
    checkOTA();

    // ---- Serial para debug ----
    Serial.begin(115200);
    delay(100);
    boot_count++;
    Serial.printf("\n[AGTECH] Nodo %d — Boot #%u — FW %s\n", NODO_ID, boot_count, FW_VERSION);

    // ---- Configurar pines ----
    pinMode(LED_PIN, OUTPUT);
    pinMode(HUM_POWER_PIN, OUTPUT);
    pinMode(EC_POWER_PIN, OUTPUT);
    digitalWrite(HUM_POWER_PIN, LOW);
    digitalWrite(EC_POWER_PIN, LOW);

    // Flash corto — arranque OK
    parpadearLED(1, 100);

    // ---- Inicializar LoRa ----
    SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
    LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);

    if (!LoRa.begin(LORA_FREQ)) {
        Serial.println("[ERROR] LoRa init falló!");
        // Parpadear rápido y entrar en deep sleep largo
        parpadearLED(10, 50);
        entrarDeepSleep(600000000ULL);  // 10 minutos
    }

    LoRa.setSpreadingFactor(LORA_SF);
    LoRa.setSignalBandwidth(LORA_BW);
    LoRa.setTxPower(LORA_TX_POWER);
    LoRa.setSyncWord(LORA_SYNC_WORD);
    Serial.printf("[LoRa] OK — %u MHz, SF%d, BW%.0f kHz\n",
        (uint32_t)(LORA_FREQ / 1E6), LORA_SF, LORA_BW / 1E3);

    // ---- Inicializar DS18B20 ----
    ds18b20.begin();
    Serial.printf("[DS18B20] %d sensores encontrados\n", ds18b20.getDeviceCount());

    // ---- Verificar batería ----
    float bat = leerBateria();
    Serial.printf("[BAT] %.2fV\n", bat);
    if (bat < BAT_MIN_V && bat > 1.0) {  // >1.0 para evitar falso positivo sin batería
        Serial.println("[BAT] Batería baja — deep sleep 30 min");
        parpadearLED(5, 200);
        entrarDeepSleep(1800000000ULL);  // 30 minutos
    }

    // ============================================================
    // LECTURA DE SENSORES — Buffer de 15 lecturas (5 minutos)
    // ============================================================
    Serial.println("[SENSOR] Iniciando lecturas...");

    // Encender sensores
    digitalWrite(HUM_POWER_PIN, HIGH);
    digitalWrite(EC_POWER_PIN, HIGH);
    delay(100);  // Estabilización

    // Buffers
    float h10_buf[LECTURAS_POR_VENTANA];
    float h20_buf[LECTURAS_POR_VENTANA];
    float h30_buf[LECTURAS_POR_VENTANA];
    float t20_buf[LECTURAS_POR_VENTANA];
    float ec_buf[LECTURAS_POR_VENTANA];

    for (int i = 0; i < LECTURAS_POR_VENTANA; i++) {
        // Leer humedad
        h10_buf[i] = leerHumedad(HUM_10_PIN);
        h20_buf[i] = leerHumedad(HUM_20_PIN);
        h30_buf[i] = leerHumedad(HUM_30_PIN);

        // Leer temperatura
        ds18b20.requestTemperatures();
        t20_buf[i] = ds18b20.getTempCByIndex(0);
        if (t20_buf[i] == DEVICE_DISCONNECTED_C) {
            t20_buf[i] = -99.0;  // Marca de error
        }

        // Leer EC
        ec_buf[i] = leerEC();

        Serial.printf("  [%02d/%d] h10=%.1f h20=%.1f h30=%.1f t20=%.1f ec=%.2f\n",
            i + 1, LECTURAS_POR_VENTANA,
            h10_buf[i], h20_buf[i], h30_buf[i], t20_buf[i], ec_buf[i]);

        // Esperar intervalo (excepto en la última lectura)
        if (i < LECTURAS_POR_VENTANA - 1) {
            delay(LECTURA_INTERVALO_MS);
        }
    }

    // Apagar sensores
    digitalWrite(HUM_POWER_PIN, LOW);
    digitalWrite(EC_POWER_PIN, LOW);

    // ============================================================
    // CALCULAR ESTADÍSTICAS
    // ============================================================
    float h10_sum = 0, h20_sum = 0, h30_sum = 0, t20_sum = 0, ec_sum = 0;
    float h10_min = 999, h10_max = -999;
    int t20_count = 0;

    for (int i = 0; i < LECTURAS_POR_VENTANA; i++) {
        h10_sum += h10_buf[i];
        h20_sum += h20_buf[i];
        h30_sum += h30_buf[i];
        ec_sum += ec_buf[i];

        if (h10_buf[i] < h10_min) h10_min = h10_buf[i];
        if (h10_buf[i] > h10_max) h10_max = h10_buf[i];

        if (t20_buf[i] > -90.0) {  // Ignorar lecturas de error
            t20_sum += t20_buf[i];
            t20_count++;
        }
    }

    float h10_avg = h10_sum / LECTURAS_POR_VENTANA;
    float h20_avg = h20_sum / LECTURAS_POR_VENTANA;
    float h30_avg = h30_sum / LECTURAS_POR_VENTANA;
    float t20_avg = (t20_count > 0) ? t20_sum / t20_count : -99.0;
    float ec_avg = ec_sum / LECTURAS_POR_VENTANA;
    float bat_v = leerBateria();

    Serial.printf("[STATS] h10=%.1f (%.1f-%.1f) h20=%.1f h30=%.1f t20=%.1f ec=%.2f bat=%.2f\n",
        h10_avg, h10_min, h10_max, h20_avg, h30_avg, t20_avg, ec_avg, bat_v);

    // ============================================================
    // DETECTAR EVENTO DE MOJADO
    // ============================================================
    uint8_t tipo_paquete = 0;  // 0 = normal
    if (h10_promedio_anterior >= 0) {
        float delta = h10_avg - h10_promedio_anterior;
        if (delta > UMBRAL_MOJADO) {
            tipo_paquete = 1;  // Evento de mojado
            Serial.printf("[MOJADO] Detectado! delta=%.1f%% (anterior=%.1f, actual=%.1f)\n",
                delta, h10_promedio_anterior, h10_avg);
        }
    }
    h10_promedio_anterior = h10_avg;  // Guardar para próximo ciclo (sobrevive deep sleep)

    // ============================================================
    // EMPAQUETAR Y TRANSMITIR
    // ============================================================
    Paquete paq;
    paq.nodo_id    = NODO_ID;
    paq.tipo       = tipo_paquete;
    paq.timestamp  = (uint32_t)(millis() / 1000);
    paq.hum_10_avg = (uint16_t)(h10_avg * 100);
    paq.hum_20_avg = (uint16_t)(h20_avg * 100);
    paq.hum_30_avg = (uint16_t)(h30_avg * 100);
    paq.hum_10_min = (uint16_t)(h10_min * 100);
    paq.hum_10_max = (uint16_t)(h10_max * 100);
    paq.temp_20    = (int16_t)(t20_avg * 100);
    paq.ec_30      = (uint16_t)(ec_avg * 100);
    paq.bateria    = (uint16_t)(bat_v * 100);
    paq.rssi       = 0;  // Se actualiza después del TX

    Serial.printf("[TX] Enviando paquete — %d bytes, tipo=%s\n",
        sizeof(Paquete), tipo_paquete ? "MOJADO" : "normal");

    transmitirPaquete(&paq);

    Serial.printf("[TX] Enviado! RSSI=%d\n", paq.rssi);

    // Flash doble — transmisión OK
    parpadearLED(2, 50);

    // ============================================================
    // DEEP SLEEP
    // ============================================================
    entrarDeepSleep(DEEP_SLEEP_US);
}

// ============================================================
// LOOP — No se usa. Todo se hace en setup() + deep sleep.
// ============================================================
void loop() {
    // Nunca llega aquí — deep sleep reinicia desde setup()
}
