#ifndef OTA_H
#define OTA_H

#include <WiFi.h>
#include <HTTPUpdate.h>
#include "config.h"

// ============================================================
// Parpadeo de LED para feedback visual
// ============================================================
void parpadearOTA(int veces, int duracion_ms) {
    for (int i = 0; i < veces; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(duracion_ms);
        digitalWrite(LED_PIN, LOW);
        delay(duracion_ms);
    }
}

// ============================================================
// checkOTA() — Llamar al inicio de setup(), antes de todo
//
// Si el reed switch está activado (imán pegado a la caja):
// 1. Enciende LED fijo → modo OTA
// 2. Conecta al hotspot del agrónomo
// 3. Descarga firmware nuevo desde URL
// 4. Si exitoso → reinicia automáticamente
// 5. Si falla → apaga LED, continúa operación normal
// ============================================================
void checkOTA() {
    // Configurar pin del reed switch
    pinMode(BTN_OTA_PIN, INPUT_PULLUP);
    pinMode(LED_PIN, OUTPUT);

    // Si el botón NO está presionado, salir inmediatamente
    if (digitalRead(BTN_OTA_PIN) == HIGH) {
        return;
    }

    // ---- MODO OTA ACTIVADO ----
    Serial.println("[OTA] Reed switch activado — entrando en modo OTA");

    // LED fijo para indicar modo OTA
    digitalWrite(LED_PIN, HIGH);

    // Conectar al hotspot del agrónomo
    Serial.printf("[OTA] Conectando a %s...\n", OTA_SSID);
    WiFi.begin(OTA_SSID, OTA_PASS);

    unsigned long inicio = millis();
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");

        // Timeout — no encontró hotspot
        if (millis() - inicio > OTA_TIMEOUT_MS) {
            Serial.println("\n[OTA] Timeout — hotspot no encontrado");
            // Parpadeo lento 3 veces = falló
            parpadearOTA(3, 500);
            digitalWrite(LED_PIN, LOW);
            WiFi.disconnect(true);
            WiFi.mode(WIFI_OFF);
            return;
        }
    }

    Serial.printf("\n[OTA] Conectado! IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[OTA] Descargando firmware desde %s\n", FW_URL);
    Serial.printf("[OTA] Versión actual: %s\n", FW_VERSION);

    // Intentar descargar y aplicar actualización
    WiFiClient client;
    t_httpUpdate_return ret = httpUpdate.update(client, FW_URL);

    // Si llegó aquí, la actualización falló
    // (si tiene éxito, reinicia automáticamente y nunca llega aquí)
    switch (ret) {
        case HTTP_UPDATE_FAILED:
            Serial.printf("[OTA] Error (%d): %s\n",
                httpUpdate.getLastError(),
                httpUpdate.getLastErrorString().c_str());
            break;

        case HTTP_UPDATE_NO_UPDATES:
            Serial.println("[OTA] Sin actualizaciones disponibles");
            break;

        case HTTP_UPDATE_OK:
            // No debería llegar aquí — reinicia automáticamente
            Serial.println("[OTA] Actualización exitosa — reiniciando...");
            // Parpadeo rápido 3 veces = éxito
            parpadearOTA(3, 100);
            ESP.restart();
            break;
    }

    // Falló — parpadeo lento y continuar operación normal
    parpadearOTA(3, 500);
    digitalWrite(LED_PIN, LOW);
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);
    Serial.println("[OTA] Continuando operación normal");
}

#endif
