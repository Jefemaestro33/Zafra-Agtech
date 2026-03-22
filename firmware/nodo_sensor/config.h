#ifndef CONFIG_H
#define CONFIG_H

// ============================================================
// IDENTIFICACIÓN DEL NODO — CAMBIAR POR NODO
// ============================================================
#define NODO_ID          1        // ID único (1-8)

// ============================================================
// PINES — TTGO T-Beam v1.1
// ============================================================
// LoRa (SX1276)
#define LORA_SCK         5
#define LORA_MISO        19
#define LORA_MOSI        27
#define LORA_CS          18
#define LORA_RST         23
#define LORA_DIO0        26

// Sensores de humedad (ADC, multiplexados por power pin)
#define HUM_10_PIN       36       // ADC1_CH0 — humedad 10cm
#define HUM_20_PIN       39       // ADC1_CH3 — humedad 20cm
#define HUM_30_PIN       34       // ADC1_CH6 — humedad 30cm
#define HUM_POWER_PIN    25       // Pin que enciende los sensores (ahorra energía)

// Temperatura DS18B20
#define DS18B20_PIN      14       // OneWire data

// Conductividad eléctrica
#define EC_PIN           35       // ADC1_CH7
#define EC_POWER_PIN     13       // Pin que enciende sensor EC

// Botón OTA (reed switch — se activa con imán)
#define BTN_OTA_PIN      15       // INPUT_PULLUP, activo LOW

// LED de status
#define LED_PIN          4        // LED integrado del T-Beam

// Batería
#define BAT_PIN          32       // ADC para voltaje batería (divisor resistivo)

// ============================================================
// CONFIGURACIÓN LoRa
// ============================================================
#define LORA_FREQ        915E6    // 915 MHz para México
#define LORA_SF          7        // Spreading factor (7-12, menor = más rápido)
#define LORA_BW          125E3    // Bandwidth 125 kHz
#define LORA_TX_POWER    17       // dBm (max 20)
#define LORA_SYNC_WORD   0x34     // Sync word para nuestra red

// ============================================================
// TIEMPOS
// ============================================================
#define LECTURA_INTERVALO_MS    20000    // 20 segundos entre lecturas
#define LECTURAS_POR_VENTANA    15       // 15 lecturas = 5 minutos
#define DEEP_SLEEP_US           280000000ULL // ~4min 40s de sleep (+ ~20s de lectura+tx = 5 min)

// ============================================================
// UMBRALES
// ============================================================
#define UMBRAL_MOJADO    3.0      // % VWC de incremento para detectar evento de mojado
#define BAT_MIN_V        3.3      // Voltaje mínimo de batería para alerta

// ============================================================
// CALIBRACIÓN DE SENSORES
// ============================================================
// Sensores capacitivos: mapear ADC (0-4095) a %VWC
// Calibrar en campo: sumergir en agua (100%) y al aire (0%)
#define HUM_ADC_SECO     3200     // Valor ADC en aire seco (~0% VWC)
#define HUM_ADC_AGUA     1400     // Valor ADC en agua saturada (~100% VWC)

// EC: mapear ADC a dS/m (calibrar con solución estándar)
#define EC_ADC_CERO      0        // ADC en agua destilada
#define EC_ADC_REF       2000     // ADC en solución de referencia
#define EC_REF_DSM       1.413    // dS/m de la solución de referencia

// Batería: divisor resistivo
#define BAT_FACTOR       2.0      // Factor del divisor resistivo
#define BAT_ADC_REF      3.3      // Voltaje de referencia ADC

// ============================================================
// OTA
// ============================================================
#define OTA_SSID         "AGTECH_OTA"
#define OTA_PASS         "nextipac2026"
#define OTA_TIMEOUT_MS   30000    // 30 segundos para encontrar hotspot
#define FW_URL           "https://tu-vps.com/firmware/nodo_sensor.bin"
#define FW_VERSION       "1.0.0"

#endif
