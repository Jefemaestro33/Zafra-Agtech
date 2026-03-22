# MEMORIA TÉCNICA — PROYECTO AGTECH NEXTIPAC

## Sistema de Monitoreo IoT + IA para Aguacate Hass

**Versión 0.4** — 21 de marzo de 2026
Guadalajara, Jalisco

---

## 1. RESUMEN EJECUTIVO

Se está desarrollando un sistema de agricultura inteligente que combina sensores IoT enterrados en el suelo, procesamiento de datos en la nube, machine learning, y un agente de IA (Claude) para optimizar riego, prevenir Phytophthora cinnamomi y monitorear el microbioma del suelo en huertas de aguacate Hass en Nextipac, Jalisco.

El sistema opera en 4 niveles: pipeline de datos (sensores → nube → base de datos), alertas automáticas con score de riesgo, análisis avanzado (firma hídrica + comparativo tratamiento/testigo + predicción de microbioma), y un sistema multi-agente donde scripts Python procesan los datos pesados y Claude genera diagnósticos accionables para agrónomos.

### Estado actual:
- Generador de datos sintéticos funcionando (416,592 registros, 6 meses, 8 nodos) — ✓ LISTO
- Schema SQL de 7 tablas + tabla predios + script de carga de datos — ✓ LISTO
- PostgreSQL en Railway con datos cargados (416,592 lecturas + 8 nodos + 24 tratamientos + 560 microbioma + 1 predio) — ✓ LISTO
- clima.py con backfill de Open-Meteo (2,160 registros reales de Nextipac, 3 meses dic 2025 - mar 2026) — ✓ LISTO
- alertas.py con Score Phytophthora v2 (7 factores, cruza suelo + clima, modo CLI --evaluar/--nodo/--resumen) — ✓ LISTO
- api.py con FastAPI (20 endpoints REST: predios, nodos, lecturas, firma, comparativo, clima, alertas, tratamientos, microbioma, health) — ✓ LISTO
- Dashboard React completo (6 vistas: Overview con mapa Leaflet, Nodo detalle con gráficas Recharts, Firma hídrica placeholder, Comparativo trat/testigo, Clima con datos reales, Alertas IA con placeholder LLM) — ✓ LISTO
- Selector de predio multi-huerta en dashboard — ✓ LISTO
- Escenarios de validación embebidos en los datos (Phytophthora, nodo offline, divergencia trat/testigo)
- Análisis competitivo completo: 8 plataformas evaluadas, ninguna compite directamente
- 5 funcionalidades de competidores identificadas para integración (clima, mapa, diagnóstico visual, huella hídrica, reportes WhatsApp)
- Hardware, laboratorio y deploy en producción pendientes de financiamiento (junio 2026)

### Modelo de negocio:
- Cobro: 30% del incremento de producción atribuible al sistema, medido contra parcela testigo
- Piloto: 4 hectáreas en Nextipac con 8 nodos (4 tratamiento + 4 testigo)
- Pipeline: 10 agricultores con 500+ hectáreas comprometidas para fase de validación
- Financiamiento: Fondo de inversión Universidad Panamericana, estimado junio 2026

---

## 2. HISTORIAL DE VERSIONES

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v0.1 | 21 mar 2026 | Generador de datos sintéticos con 5 escenarios de validación, estructura de proyecto definida |
| v0.2 | 21 mar 2026 | Análisis competitivo completo, 5 nuevas funcionalidades definidas (clima, mapa, diagnóstico visual, huella hídrica, reportes WhatsApp), schema SQL + script de carga de datos, score Phytophthora mejorado con datos climáticos |
| v0.3 | 21 mar 2026 | Cambio de arquitectura: Telegram → dashboard web + API REST. Diseño de endpoints y vistas |
| v0.4 | 21 mar 2026 | PostgreSQL en Railway cargado (416K lecturas), clima.py con backfill 3 meses datos reales Nextipac, alertas.py con score Phytophthora v2 implementado (7 factores), api.py con FastAPI (20 endpoints), dashboard React completo (6 vistas con mapa Leaflet + gráficas Recharts), tabla predios, selector multi-huerta |

---

## 3. ARQUITECTURA DEL SISTEMA (4 NIVELES)

### Nivel 1 — Pipeline de datos

| Componente | Función | Estado |
|------------|---------|--------|
| ESP32/TTGO T-Beam | Lee sensores cada 20 seg, agrega en buffer de 5 min, transmite por LoRa | Pendiente (firmware diseñado) |
| Gateway RAK con 4G | Recibe LoRa de todos los nodos, reenvía por internet al servidor | Pendiente (requiere hardware) |
| MQTT Broker (Mosquitto) | Recibe datos del gateway, los distribuye a los servicios | Pendiente de implementar |
| ingesta.py | Se suscribe a MQTT, valida rangos, detecta eventos de mojado, inserta en base de datos | Pendiente de implementar |
| clima.py | Consulta API Open-Meteo cada hora: temp ambiente, precipitación, humedad relativa, viento, radiación. Calcula ETo (Penman-Monteith FAO). Guarda en tabla clima. Modo --backfill descarga histórico | ✓ LISTO (v0.4) — 2,160 registros reales de Nextipac cargados |
| PostgreSQL (Railway) | Almacena series de tiempo de todos los sensores + datos climáticos | ✓ LISTO (v0.4) — 416,592 lecturas + 2,160 clima + 8 tablas |
| api.py (FastAPI) | API REST con 20 endpoints para dashboard web. CORS habilitado. Docs en /docs | ✓ LISTO (v0.4) |

### Nivel 2 — Alertas y reglas

| Componente | Función | Estado |
|------------|---------|--------|
| alertas.py | Evalúa reglas: score Phytophthora v2 (7 factores), alerta riego (h10<28%), sensor offline (>30min), batería baja (<3.3V). CLI: --evaluar, --nodo, --resumen. Genera eventos en tabla eventos con JSONB | ✓ LISTO (v0.4) |
| Score Phytophthora v2 | Puntuación 0-100 implementada: humedad suelo + temperatura + duración + precipitación acumulada + pronóstico de lluvia + humedad relativa ambiente. Cruza datos de suelo con tabla clima | ✓ LISTO (v0.4) |
| generar_resumen_nodo() | Función que produce dict completo para LLM/API: lectura, score desglosado, tendencia 24h, clima, alertas, microbioma | ✓ LISTO (v0.4) |
| Dashboard web React | Reemplaza Telegram como interfaz principal. 6 vistas con gráficas interactivas + mapa | ✓ LISTO (v0.4) |

### Nivel 3 — Firma hídrica + ML

| Componente | Función | Estado |
|------------|---------|--------|
| firma_hidrica.py | Calcula velocidad infiltración, τ de secado, breaking point dinámico | Pendiente de implementar |
| comparativo.py | CUSUM para detectar divergencias tratamiento vs testigo | Pendiente de implementar |
| modelo_microbioma.py | Random Forest: features de sensores + clima → predicción de estado microbiano | Pendiente de implementar |

### Nivel 4 — Sistema multi-agente (LLM)

| Componente | Función | Estado |
|------------|---------|--------|
| llm_consultor.py | Envía resúmenes de alertas a Claude, recibe diagnósticos accionables | Pendiente de implementar |
| 4 prompts especializados | Phytophthora, firma hídrica, bioinsumos, reporte semanal | Pendiente de escribir |
| Diagnóstico visual | Salvador manda foto de hoja al bot → Claude Vision + datos de sensores → diagnóstico integrado visual + contexto de suelo | Diseñado (v0.2) |
| Reporte simplificado agricultor | Resumen semanal sin tecnicismos, formato reenviable por WhatsApp | Diseñado (v0.2) |
| Fallback | Si API falla, envía alerta cruda sin procesar por LLM | Diseñado |

---

## 4. DATOS SINTÉTICOS — GENERADOR

### 4.1 Propósito

El generador crea 6 meses de datos realistas para desarrollar y probar el 100% del software sin hardware ni campo. Modela física real del suelo, no random noise.

### 4.2 Física modelada

| Fenómeno | Implementación |
|----------|---------------|
| Propagación vertical del riego | Humedad sube primero a 10cm, luego a 20cm (30-60 min delay), luego a 30cm (60-120 min delay) |
| Secado exponencial | θ(t) = θ_residual + amplitud × exp(-t/τ), con τ diferente por profundidad |
| Ciclo diurno de temperatura | Sinusoidal con pico a 3pm, amplitud 3.5°C a 20cm de profundidad |
| Ciclo estacional | Sinusoidal anual, más calor mayo-junio, más frío enero |
| Conductividad eléctrica | Correlacionada con humedad: más agua = más sales disueltas = más EC |
| Batería | Carga solar de día, descarga nocturna, descarga base constante |
| RSSI (señal LoRa) | Base -65 dBm con ruido gaussiano, peor para nodos más lejanos |

### 4.3 Escenarios de validación

| # | Escenario | Nodos afectados | Periodo | Qué debe detectar el sistema |
|---|-----------|----------------|---------|------------------------------|
| 1 | Riego normal | Todos | Todo el periodo | Ciclos de riego-secado con propagación vertical correcta |
| 2 | Divergencia trat/testigo | Tratamiento (1,3,5,7) vs testigo (2,4,6,8) | Gradual, visible mes 2-3 | CUSUM detecta cambio sostenido en τ de secado |
| 3 | Phytophthora | Nodo 3 (sobrerriego) | Días 100-140 (~abril) | Score > 75, h10 sostenida >45%, t20 en rango óptimo |
| 4 | Nodo offline | Nodo 5 | Días 75-76 (36 horas) | Alerta "sin datos >30 min" |
| 5 | Lluvia | Todos | Aleatorio, más frecuente mayo-junio | Eventos de mojado no programados, propagación uniforme |
| 6 | Microbioma divergente | Tratamiento vs testigo | Gradual | AMF y Trichoderma suben en tratamiento, Phytophthora baja |

### 4.4 Parámetros del suelo (andisol volcánico)

| Parámetro | Valor | Significado |
|-----------|-------|-------------|
| h_residual | 18.0% VWC | Suelo seco, planta en estrés |
| h_campo | 38.0% VWC | Capacidad de campo, suelo "ideal" |
| h_saturacion | 55.0% VWC | Saturado, riesgo de anoxia |
| h_breaking | 28.0% VWC | Punto de riego — debajo de esto, hay que regar |
| τ_10 base | 12.0 horas | Constante de secado a 10cm |
| τ_20 base | 16.0 horas | Constante de secado a 20cm |
| τ_30 base | 22.0 horas | Constante de secado a 30cm |

### 4.5 Volúmenes generados

| Archivo | Filas | Tamaño | Contenido |
|---------|-------|--------|-----------|
| lecturas.csv | 416,592 | 31 MB | Datos de sensores cada 5 min, 8 nodos, 6 meses |
| nodos.csv | 8 | <1 KB | Metadata: ID, nombre, rol, bloque, coordenadas |
| tratamientos.csv | 24 | 2.4 KB | Aplicaciones de micorriza y Trichoderma simuladas |
| microbioma.csv | 1,248 | 112 KB | qPCR quincenal (16S, AMF, Trichoderma, P. cinnamomi) + Solvita |

### 4.6 Verificación de escenarios

Resultados de la verificación automática al generar:

**Phytophthora (Nodo 3):**
- Antes (días 80-99): h10 promedio 19.1%, max 38.4%
- Crisis (días 100-140): h10 promedio 24.0%, max 53.7%, t20 25.7°C ← score debería disparar
- Después (días 141-160): h10 promedio 20.4%, vuelve a normal

**Divergencia tratamiento vs testigo (h10 promedio mensual):**
- Enero: Δ = -0.67% (casi iguales, baseline)
- Marzo: Δ = -0.70%
- Junio: Δ = -1.58% ← CUSUM debería detectar desde mes 2-3

**Nodo 5 offline:**
- Día 74: 288 registros (normal)
- Día 75: 0 registros (offline completo)
- Día 76: 144 registros (reconexión a mediodía)
- Día 77: 288 registros (normal)

---

## 5. ARQUITECTURA TÉCNICA — FASE DE DESARROLLO (pre-funding)

### 5.1 Stack actual

| Componente | Tecnología | Función | Costo |
|------------|------------|---------|-------|
| Base de datos | PostgreSQL en Railway | Almacena lecturas, nodos, tratamientos, microbioma, eventos, firma hídrica, clima, predios | ✓ LISTO — datos cargados, 8 tablas |
| API REST | FastAPI (api.py) | 20 endpoints para dashboard + integraciones. CORS, docs automáticos en /docs | ✓ LISTO — corriendo local, pendiente deploy Railway |
| Dashboard | React + Vite + Tailwind + Recharts + react-leaflet | 6 vistas: Overview, Nodo, Firma, Comparativo, Clima, Alertas IA | ✓ LISTO — corriendo local en localhost:5173 |
| Clima | clima.py + Open-Meteo API | Datos meteorológicos reales de Nextipac + ETo Penman-Monteith | ✓ LISTO — 2,160 registros backfill |
| Alertas | alertas.py | Score Phytophthora v2, riego, offline, batería | ✓ LISTO — CLI + funciones importables |
| IA | Claude API (Anthropic) | Diagnósticos accionables desde resúmenes de alertas | ~$0.45/mes — pendiente llm_consultor.py |
| Código | GitHub | Repo privado, auto-deploy a Railway | Pendiente crear repo |

> **FUTURO (producción, post-funding):** Migrar de Railway a un VPS propio (DigitalOcean $6/mes o Hetzner $4 EUR/mes) con Docker Compose. Railway en producción con 5 servicios 24/7 costaría $25-35 USD/mes; un VPS corre todo por $6 USD/mes. Además, Railway no soporta Mosquitto (MQTT) nativamente, no tiene TimescaleDB como addon, y no permite control de firewall ni TLS para protocolos no-HTTP. El código Python no cambia — solo cambia dónde corre. La migración es una tarde de trabajo. Análisis detallado con tabla de costos comparativa en la sección 16 "Railway vs Docker/VPS".

### 5.2 Stack de producción (post-funding)

| Componente | Tecnología | Cambio vs. desarrollo | Razón del cambio |
|------------|------------|----------------------|------------------|
| Servidor | VPS DigitalOcean/Hetzner ($6/mes) | Reemplaza Railway | Costo fijo, control total, Docker |
| Base de datos | TimescaleDB (Docker) | Reemplaza PostgreSQL básico | Hypertables optimizadas para series de tiempo, compresión automática, queries de ventana temporal 10-100× más rápidos |
| MQTT | Mosquitto con TLS (Docker) | Nuevo componente | Recibe datos reales del gateway RAK en campo |
| Dashboards | Grafana self-hosted (Docker) | Reemplaza Grafana Cloud | Sin límite de dashboards, datos privados |
| Backend | Python (Docker) | Mismo código, diferente deploy | Corre como servicio con restart automático |
| Seguridad | TLS, firewall, backups a S3 | Nuevo | Datos viajan por internet, requiere encriptación |

### 5.3 Estructura del código

```
agtech-sistema/
│
├── simulator/
│   ├── generate_data.py          ← Generador de datos sintéticos (LISTO v0.1)
│   └── load_data.py              ← Carga CSVs en PostgreSQL (LISTO v0.2)
│
├── data/                          ← CSVs generados (LISTO v0.1)
│   ├── lecturas.csv               ← 416,592 filas, 31 MB
│   ├── nodos.csv                  ← 8 filas
│   ├── tratamientos.csv           ← 24 filas
│   └── microbioma.csv             ← 1,248 filas
│
├── sql/
│   ├── schema.sql                 ← Esquema de 7 tablas (LISTO v0.2 — incluye tabla clima)
│   └── seed.sql                   ← Carga CSVs en base de datos (LISTO v0.2 — integrado en load_data.py)
│
├── backend/
│   ├── requirements.txt           ← Dependencias Python (PENDIENTE)
│   ├── config.py                  ← Credenciales, umbrales, API keys (PENDIENTE)
│   ├── ingesta.py                 ← MQTT → validación → PostgreSQL (PENDIENTE)
│   ├── clima.py                   ← Open-Meteo API → tabla clima + ETo Penman-Monteith (LISTO v0.4 — backfill 3 meses)
│   ├── alertas.py                 ← Score Phytophthora v2 (7 factores), riego, offline, batería, CLI (LISTO v0.4)
│   ├── api.py                     ← FastAPI REST API, 20 endpoints, CORS, docs en /docs (LISTO v0.4)
│   ├── firma_hidrica.py           ← Velocidad infiltración, τ secado, breaking point dinámico (PENDIENTE)
│   ├── comparativo.py             ← CUSUM tratamiento vs testigo + huella hídrica (PENDIENTE)
│   ├── modelo_microbioma.py       ← Random Forest sensor+clima→microbioma (PENDIENTE)
│   ├── llm_consultor.py           ← Resúmenes → Claude API → diagnósticos + Claude Vision para fotos (PENDIENTE)
│   ├── prompts/
│   │   ├── phytophthora.txt       ← System prompt alertas Phytophthora (PENDIENTE)
│   │   ├── firma_hidrica.txt      ← System prompt análisis firma hídrica (PENDIENTE)
│   │   ├── reporte_semanal.txt    ← System prompt reporte semanal (PENDIENTE)
│   │   ├── bioinsumos.txt         ← System prompt timing bioinsumos con pronóstico clima (PENDIENTE)
│   │   ├── diagnostico_visual.txt ← System prompt foto de hoja + contexto sensores (PENDIENTE — v0.2)
│   │   └── reporte_agricultor.txt ← System prompt reporte simplificado para agricultor (PENDIENTE — v0.2)
│   └── utils/
│       ├── db.py                  ← Conexión y helpers PostgreSQL (PENDIENTE)
│       └── calibracion.py         ← Curvas de calibración sensores (PENDIENTE)
│
├── dashboard/                     ← Dashboard web React (LISTO v0.4 — reemplaza Grafana)
│   ├── package.json
│   ├── vite.config.js             ← Proxy /api/* → localhost:8000
│   ├── src/
│   │   ├── App.jsx                ← Layout: topbar + tabs + routing
│   │   ├── hooks/useApi.js        ← Hook fetch genérico
│   │   ├── components/            ← KpiCard, ScoreBadge, Loading, EmptyState
│   │   └── views/
│   │       ├── OverviewView.jsx   ← 4 KPIs + mapa Leaflet + tabla nodos
│   │       ├── NodoView.jsx       ← 6 métricas + 3 gráficas Recharts + desglose score
│   │       ├── FirmaView.jsx      ← Placeholder (pendiente firma_hidrica.py)
│   │       ├── ComparativoView.jsx ← Línea trat vs testigo por bloque
│   │       ├── ClimaView.jsx      ← KPIs clima + precip+temp + ETo (datos reales)
│   │       └── AlertasView.jsx    ← Lista alertas + placeholder diagnóstico IA
│   └── index.html
│
├── firmware/                      ← Se escribe pre-funding, se flashea post-funding
│   ├── nodo_sensor/
│   │   ├── nodo_sensor.ino        ← Código ESP32: sensores + LoRa + deep sleep (PENDIENTE)
│   │   ├── config.h               ← IDs, pines, umbrales, credenciales OTA (PENDIENTE)
│   │   └── ota.h                  ← Actualización Over-The-Air por WiFi (PENDIENTE)
│   └── releases/
│       └── (binarios .bin para OTA, post-compilación)
│
├── docker/                        ← Se usa post-funding cuando se migre a VPS
│   ├── docker-compose.yml         ← Mosquitto + TimescaleDB + Grafana + backend (PENDIENTE)
│   └── mosquitto/
│       └── config/
│
└── docs/
    ├── README.md                  ← (PENDIENTE)
    ├── arquitectura.md            ← Documento de arquitectura completo (EXISTENTE)
    └── memoria_tecnica.md         ← Este documento
```

---

## 6. ESQUEMA DE BASE DE DATOS

8 tablas (7 originales + predios). En desarrollo se usa PostgreSQL estándar. En producción se migra a TimescaleDB para las optimizaciones de series de tiempo (hypertables, compresión, continuous aggregates).

### 6.1 Tablas

| Tabla | Filas estimadas (piloto 18 meses) | Función |
|-------|-----------------------------------|---------|
| lecturas | ~15 millones | Datos de sensores cada 5 min, 8 nodos |
| nodos | 8 | Metadata: ubicación, rol, bloque |
| tratamientos | ~50-100 | Registro de bioinsumos aplicados |
| microbioma | ~3,000-5,000 | Resultados de qPCR y Solvita |
| eventos | ~500-1,000 | Eventos detectados: mojado, offline, alertas |
| firma_hidrica | ~200-400 | Firma calculada por cada evento de riego |
| clima | ~13,000 (1 registro/hora × 18 meses) | Datos meteorológicos de Open-Meteo: temp ambiente, precipitación, humedad relativa, viento, radiación solar, ETo calculada. **Actualmente: 2,160 registros reales cargados** |
| predios | 1 (piloto) | Metadata de predios: nombre, ubicación, hectáreas, tipo suelo, coordenadas. **Creada en v0.4** |

### 6.2 Columnas principales — lecturas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| tiempo | TIMESTAMPTZ | Timestamp de la lectura |
| nodo_id | SMALLINT | ID del nodo (1-8) |
| tipo | VARCHAR(10) | 'normal' o 'evento' |
| h10_avg | REAL | Humedad 10cm promedio (% VWC) |
| h20_avg | REAL | Humedad 20cm promedio |
| h30_avg | REAL | Humedad 30cm promedio |
| h10_min | REAL | Humedad 10cm mínima en ventana de 5 min |
| h10_max | REAL | Humedad 10cm máxima en ventana de 5 min |
| t20 | REAL | Temperatura a 20cm (°C) |
| ec30 | REAL | Conductividad eléctrica a 30cm (dS/m) |
| bateria | REAL | Voltaje de batería (V) |
| rssi | SMALLINT | Intensidad señal LoRa (dBm) |

> **FUTURO (TimescaleDB):** Convertir `lecturas` a hypertable con `SELECT create_hypertable('lecturas', 'tiempo')`. Esto particiona automáticamente por tiempo, comprime datos viejos (>30 días) automáticamente, y acelera queries como `WHERE tiempo > NOW() - INTERVAL '24 hours'` de segundos a milisegundos con millones de filas.

---

## 7. SENSORES Y HARDWARE (pendiente de compra)

### 7.1 Componentes por nodo

| Componente | Modelo | Función | Precio unit. MXN |
|------------|--------|---------|------------------|
| Microcontrolador | TTGO T-Beam (ESP32+LoRa+GPS) | Procesa, agrega y transmite | $955 |
| Humedad (×3) | Sensor capacitivo genérico | Mide VWC a 10, 20, 30 cm | $60 c/u |
| Temperatura | DS18B20 (OneWire) | Mide temp suelo a 20cm | $80 |
| Conductividad eléctrica | Sensor EC genérico | Mide EC a 30cm | $150 |
| Encapsulado | Tubo PVC + conectores IP68 | Protección contra agua y polvo | $200 |
| Energía | Baterías 18650 + panel solar | Alimentación autónoma | $250 |

### 7.2 Gateway

| Componente | Modelo | Función | Precio MXN |
|------------|--------|---------|------------|
| Gateway | RAK7268V2 (WisGate Edge Lite 2) | Recibe LoRa, reenvía por 4G al servidor | $5,000 |
| SIM | Plan M2M 500MB/mes | Datos celulares para el gateway | $80/mes |

### 7.3 Paquete LoRa

| Campo | Bytes | Descripción |
|-------|-------|-------------|
| nodo_id | 1 | ID del nodo (1-8) |
| tipo | 1 | 0=normal, 1=evento_mojado |
| timestamp | 4 | Epoch seconds |
| hum_10_avg | 2 | Humedad 10cm × 100 |
| hum_20_avg | 2 | Humedad 20cm × 100 |
| hum_30_avg | 2 | Humedad 30cm × 100 |
| hum_10_min | 2 | Min en ventana 5 min |
| hum_10_max | 2 | Max en ventana 5 min |
| temp_20 | 2 | Temperatura × 100 |
| ec_30 | 2 | EC × 100 |
| bateria | 2 | Voltaje × 100 |
| rssi | 1 | Señal LoRa |
| **Total** | **~24** | Binario, no JSON (LoRa max ~250 bytes) |

---

## 8. ALGORITMOS CLAVE

### 8.1 Score de Phytophthora v2 (0-100)

Basado en literatura: P. cinnamomi necesita suelo húmedo + temperatura 15-28°C para esporular. La v2 agrega datos climáticos para hacerlo predictivo (alertar antes de que pase, no después).

| Factor | Condición | Puntos |
|--------|-----------|--------|
| Humedad 10cm | >45% VWC | +15 |
| Humedad 10cm | >40% VWC | +8 |
| Humedad 20cm | >45% VWC | +15 |
| Humedad 20cm | >40% VWC | +8 |
| Temperatura suelo | 22-28°C (rango óptimo) | +20 |
| Temperatura suelo | 15-22°C | +10 |
| Temperatura suelo | <15°C | +0 |
| Horas húmedo continuas | >72h | +15 |
| Horas húmedo continuas | >48h | +10 |
| Horas húmedo continuas | >24h | +5 |
| Precipitación acumulada 7 días | >50mm | +10 |
| Precipitación acumulada 7 días | >25mm | +5 |
| Pronóstico de lluvia 48h | >20mm esperados | +5 |
| Humedad relativa ambiente | >80% promedio 48h | +5 |

Clasificación: 0-25 BAJO, 26-50 MODERADO, 51-75 ALTO, 76-100 CRÍTICO.

> **Mejora vs v1:** La v1 (sin clima) solo detectaba riesgo una vez que las condiciones ya existían en el suelo. La v2 anticipa: si hay humedad alta + pronóstico de 30mm de lluvia mañana + humedad relativa de 85%, el score sube ANTES del evento. Esto permite alertar "condiciones de riesgo en las próximas 48h" en vez de "ya tienes un problema".

### 8.2 Firma hídrica

Se calcula cada vez que se detecta un evento de mojado:

| Métrica | Cálculo | Para qué sirve |
|---------|---------|-----------------|
| vel_10_20 | 0.10m / (t_arribo_20 - t_arribo_10) | Velocidad del frente de mojado — indica macroporosidad |
| vel_20_30 | 0.10m / (t_arribo_30 - t_arribo_20) | Infiltración profunda |
| τ_10, τ_20, τ_30 | Ajuste exponencial con scipy.curve_fit | Constante de secado — indica estructura del suelo |
| breaking_point | Donde d²θ/dt² cambia de signo | Punto de riego óptimo |
| delta_h_max | max(h10 - h30) durante evento | Gradiente vertical — indica retención |

### 8.3 CUSUM (análisis comparativo)

Detecta cambio sostenido en la diferencia tratamiento - testigo.

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| Baseline | Primeros 28 días | Media y desviación estándar de referencia |
| Umbral (h) | 4 × std_baseline | Cuándo disparar alarma |
| Slack (k) | std_baseline / 2 | Filtro de ruido |

### 8.4 Random Forest (predicción microbioma)

| Aspecto | Detalle |
|---------|---------|
| Features (14) | h10_avg_7d, h20_avg_7d, h30_avg_7d, t20_avg_7d, ec30_avg_7d, dh10_dt_7d, h10×t20_7d, cv_h10_7d, gdd_acum_real, dias_ultimo_mojado, tau_10_ultimo, precipitacion_acum_7d, eto_acum_7d, hr_avg_7d |
| Targets | qPCR: copias/g de 16S, AMF, Trichoderma, P. cinnamomi; Solvita: mg CO2 |
| Modelo | sklearn RandomForestRegressor, n_estimators=100, max_depth=10 |
| Validación | Leave-One-Out temporal |
| Datos mínimos | 50 pares sensor-microbioma |
| Métrica objetivo | R² > 0.5 |

> **Mejora v0.2:** Se agregaron 3 features climáticos (precipitación acumulada, ETo acumulada, humedad relativa promedio) y se reemplazó gdd_acum estimado por gdd_acum_real calculado desde datos de Open-Meteo. El GDD real es más preciso que el estimado desde la temperatura del suelo a 20cm.

> **NOTA:** En la fase de desarrollo se entrena con datos sintéticos para demostrar que el pipeline funciona. El modelo real se entrena con datos de laboratorio reales a partir del mes 6 del piloto.

---

## 9. SISTEMA MULTI-AGENTE (Nivel 4)

### 9.1 Separación de responsabilidades

| Agente | Qué procesa | Dónde corre | Costo |
|--------|-------------|-------------|-------|
| Agente 1 — Calculador | 172,800 lecturas/día/nodo, firma hídrica, CUSUM, Random Forest | Python en servidor | $0 (incluido en hosting) |
| Agente 2 — Consultor LLM | 1-3 resúmenes/día en texto plano (~500 tokens in + ~400 out) | Claude API (Anthropic) | ~$0.45/mes |

El LLM nunca toca la base de datos de series temporales. El Agente 1 comprime horas de datos en ~200 palabras de resumen, y solo eso se envía al LLM.

### 9.2 Prompts especializados

| Prompt | Trigger | Contenido del system prompt |
|--------|---------|----------------------------|
| phytophthora.txt | Score > 50 | Agrónomo experto en fitopatología, interpreta score + firma hídrica + qPCR + pronóstico climático, da 2 recomendaciones + referencia científica |
| firma_hidrica.txt | Cambio significativo en τ o velocidad infiltración | Interpreta cambios en estructura del suelo, correlaciona con tratamientos aplicados |
| bioinsumos.txt | Comando /aplicar o condiciones óptimas detectadas | Evalúa si las condiciones de humedad, temperatura, y pronóstico climático (sin lluvia próximas 24h) son ideales para aplicar micorriza o Trichoderma |
| reporte_semanal.txt | Lunes 7am automático | Resume tendencias de la semana, compara bloques, sugiere acciones para la semana entrante |
| diagnostico_visual.txt | Foto enviada al bot de Telegram | Recibe imagen + contexto de sensores del nodo más cercano. Cruza diagnóstico visual (hoja, tallo) con datos de suelo para diagnóstico integrado. Distingue entre causas de suelo (anoxia, Phytophthora) y causas foliares (antracnosis, deficiencia) |
| reporte_agricultor.txt | Semanal, automático o bajo demanda | Genera resumen simplificado SIN tecnicismos para que el agrónomo reenvíe al agricultor por WhatsApp. Incluye: consumo de agua, estado general, alertas en lenguaje simple, próximas acciones recomendadas |

### 9.3 Flujo de decisión

| Condición | Acción | Frecuencia LLM |
|-----------|--------|----------------|
| Score Phytophthora < 50 | Log normal, sin alerta | Nunca |
| Score Phytophthora 50-75 | Guardar evento → generar resumen → LLM → Telegram | Cada 12h |
| Score Phytophthora > 75 | Guardar evento → generar resumen → LLM → Telegram | Inmediato |
| CUSUM sin alarma | Resumen diario estándar (sin LLM) | Nunca |
| CUSUM con alarma | Resumen con contexto → LLM → Telegram | 1 vez |
| Reporte semanal | Resumen agregado → LLM → Telegram | 1/semana |

### 9.4 Fallback

Si la API de Claude no responde después de 3 intentos con backoff exponencial (1s, 2s, 4s), el sistema envía la alerta cruda con datos numéricos al grupo de Telegram. El agrónomo pierde la interpretación pero no pierde la alerta.

---

## 10. BOT DE TELEGRAM

### 10.1 Grupo y roles

| Nombre | Rol | Acceso |
|--------|-----|--------|
| Ernest (tú) | Admin | Todos los comandos + configuración de umbrales |
| Salvador | Agrónomo campo | Todos los comandos operativos |
| (Futuros agrónomos) | Agrónomo campo | Todos los comandos operativos |
| (Investigadores CUCBA) | Observador | Solo /estado, /nodo, /firma (lectura) |

### 10.2 Comandos

| Comando | Función | Ejemplo de respuesta |
|---------|---------|---------------------|
| /estado | Tabla resumen de todos los nodos | Humedad, temp, EC, batería, status online/offline por nodo |
| /nodo {id} | Detalle técnico últimas 24h | Tendencias, anomalías, min/max, eventos |
| /riesgo | Score Phytophthora de cada nodo | Score + factores contribuyentes + clasificación |
| /firma {id} | Última firma hídrica | τ por profundidad, velocidad infiltración, breaking point |
| /comparar | Diferencias tratamiento vs testigo | Δ por bloque, estado CUSUM, tendencia |
| /regar | Qué nodos necesitan riego | Nodos debajo de breaking point, urgencia (bajo/medio/alto) |
| /aplicar | Condiciones para bioinsumos | ¿Humedad y temp son ideales para aplicar micorriza/Trichoderma hoy? |
| /registrar | Registrar tratamiento aplicado | Tipo, cantidad, nodo, notas |
| /lab | Registrar resultado de laboratorio | qPCR, Solvita, fisicoquímico |
| /reporte {semana} | Reporte semanal | PDF o texto largo con análisis integral |

### 10.3 Mensajes automáticos

| Mensaje | Horario | Contenido |
|---------|---------|-----------|
| Resumen diario | 7:00 AM | Estado de nodos, quién necesita riego, score Phytophthora si >25, divergencias |
| Reporte semanal | Lunes 8:00 AM | Tendencias de τ, comparativo trat/testigo, próximos muestreos, recomendaciones |
| Alerta inmediata | Cuando ocurre | Score Phytophthora >75, nodo offline >30 min, batería <3.3V |

### 10.4 Formato de alertas con LLM

Antes (solo Nivel 2):
```
⚠️ Nodo 3: riesgo Phytophthora ALTO (score 85).
h10=48% VWC ×72h, T20=24°C. Considerar reducir riego.
```

Después (con Nivel 4 — LLM):
```
🔴 ALERTA — Bloque 2, Nodo 3
Score Phytophthora: 85/100

DIAGNÓSTICO: Humedad sostenida a 48% VWC por 72h con
temperatura óptima de 24°C. Caída del 62% en velocidad
de infiltración sugiere saturación de macroporos. qPCR
mostró incremento de 2.1× en P. cinnamomi.

RECOMENDACIÓN 1: Suspender riego 72h mínimo. Permitir
que h10 baje a 30% VWC antes de reanudar.

RECOMENDACIÓN 2: Aplicar Trichoderma harzianum 2×10⁸
UFC/árbol en drench cuando h10 esté en 30-40% VWC.

REF: Ramírez-Gil et al. (2018), Scientia Horticulturae.

Diagnóstico generado por IA. Verificar en campo.
```

---

## 11. INFRAESTRUCTURA ACTUAL Y FUTURA

### 11.1 Servicios en desarrollo

| Servicio | Detalle | Estado | Costo |
|----------|---------|--------|-------|
| GitHub | Repo privado agtech-sistema | Pendiente de crear | Gratis |
| Railway PostgreSQL | 8 tablas, 416K lecturas + 2,160 clima + 560 microbioma | ✓ LISTO | Gratis (trial $5 USD) |
| FastAPI backend | api.py con 20 endpoints, CORS, docs en /docs | ✓ LISTO (local) — pendiente deploy Railway | Gratis |
| Dashboard React | 6 vistas, mapa Leaflet, gráficas Recharts, Tailwind CSS | ✓ LISTO (local :5173) — pendiente deploy Railway | Gratis |
| Anthropic API | Claude Sonnet para llm_consultor.py | Activa (créditos de Bloomhost) | ~$0.01/consulta |

> **FUTURO (producción):** Railway → VPS propio con Docker Compose. El motivo principal es costo: Railway cobra ~$0.01/hora por servicio activo, un daemon de Python corriendo 24/7 cuesta ~$7/mes solo en compute. Un VPS de $6/mes corre PostgreSQL + Mosquitto + Grafana + 5 scripts de Python, todo junto, ilimitado.

### 11.2 Variables de entorno (Railway)

| Variable | Uso |
|----------|-----|
| DATABASE_URL | PostgreSQL connection string |
| ANTHROPIC_API_KEY | Claude API para llm_consultor.py |
| TELEGRAM_BOT_TOKEN | Bot de Telegram |
| TELEGRAM_GROUP_ID | ID del grupo "AgTech - Equipo Campo" |

> **FUTURO (VPS):** Las mismas variables van en un archivo `.env` que Docker Compose lee automáticamente. Se agrega: MQTT_HOST, MQTT_PORT, MQTT_USER, MQTT_PASS para Mosquitto.

### 11.3 Costos mensuales

**Desarrollo (pre-funding):**

| Concepto | Costo |
|----------|-------|
| Todo | $0 (free tiers + créditos existentes) |

**Producción (post-funding, 1 predio piloto):**

| Concepto | Costo mensual |
|----------|---------------|
| VPS | $120 MXN (~$6 USD) |
| SIM M2M gateway | $80 MXN |
| Dominio + SSL | $15 MXN |
| API LLM | $10 MXN (~$0.45 USD) |
| **Total** | **$225 MXN/mes (~$11 USD)** |

**Producción escalada (532 predios, meta a 5 años):**

| Concepto | Costo mensual |
|----------|---------------|
| VPS (mismo) | $120 MXN |
| SIMs (532) | $510,720 MXN/año = $42,560/mes |
| Agrónomos (9) | $126,000/mes |
| Mantenimiento hardware | $133,000/mes |
| Lab verificación | $221,667/mes |
| API LLM | $120 MXN |
| **Total** | **~$525,000 MXN/mes** |

---

## 12. PRESUPUESTO DEL PILOTO

### 12.1 Opción Completa (8 nodos, 18 meses)

| Categoría | Subtotal MXN | Subtotal USD |
|-----------|-------------|-------------|
| Hardware (inversión única) | $21,520 | $1,076 |
| Infraestructura (18 meses) | $4,050 | $202 |
| Laboratorio molecular | $372,960 | $18,648 |
| Laboratorio fisicoquímico | $83,600 | $4,180 |
| **TOTAL** | **$482,130** | **$24,107** |

### 12.2 Opción Económica (4 nodos, 18 meses)

| Categoría | Subtotal MXN | Subtotal USD |
|-----------|-------------|-------------|
| Hardware (inversión única) | $13,760 | $688 |
| Infraestructura (18 meses) | $4,050 | $202 |
| Laboratorio molecular | $155,520 | $7,776 |
| Laboratorio fisicoquímico | $31,800 | $1,590 |
| **TOTAL** | **$205,130** | **$10,257** |

### 12.3 Costo por predio nuevo (después del entrenamiento)

| Tipo de suelo | Costo MXN | Incluye |
|---------------|-----------|---------|
| Mismo tipo (modelo ya entrenado) | ~$35,400 | Hardware + fisicoquímico básico + infra año 1 |
| Suelo diferente (nuevo modelo) | ~$55,400-65,400 | Hardware + qPCR calibración + secuenciación + fisicoquímico |

---

## 13. PLAN DE CONSTRUCCIÓN PRE-FUNDING

### Semanas 1-2 (21 marzo - 4 abril)

| # | Tarea | Estado |
|---|-------|--------|
| 1 | Generador de datos sintéticos | ✓ LISTO |
| 2 | Schema SQL (7 tablas, incluye clima) | ✓ LISTO |
| 3 | Script de carga de datos (load_data.py) | ✓ LISTO |
| 4 | Análisis competitivo completo | ✓ LISTO |
| 5 | Crear repo en GitHub | Pendiente |
| 6 | Crear proyecto Railway con PostgreSQL | ✓ LISTO (v0.4) |
| 7 | Cargar CSVs en Railway con load_data.py | ✓ LISTO (v0.4) — 416,592 lecturas en 29.6s |
| 8 | ingesta.py adaptado para modo replay (sin MQTT) | Pendiente |

### Semanas 3-4 (5 - 18 abril)

| # | Tarea | Estado |
|---|-------|--------|
| 9 | Dashboard web React: Overview con 4 KPIs + tabla nodos | ✓ LISTO (v0.4) — reemplaza Grafana |
| 10 | Dashboard web: Nodo detalle con 3 gráficas Recharts | ✓ LISTO (v0.4) |
| 11 | Dashboard web: Comparativo tratamiento vs testigo | ✓ LISTO (v0.4) |
| 12 | clima.py: Open-Meteo API + ETo Penman-Monteith + tabla clima + backfill 3 meses | ✓ LISTO (v0.4) — 2,160 registros reales |
| 13 | Dashboard web: vista Clima con datos reales Nextipac | ✓ LISTO (v0.4) |
| 14 | Mapa Leaflet de nodos, color por score Phytophthora, click → detalle | ✓ LISTO (v0.4) |
| 15 | alertas.py con score Phytophthora v2 (7 factores, cruza suelo + clima) | ✓ LISTO (v0.4) |
| 16 | api.py con FastAPI: 20 endpoints REST para dashboard | ✓ LISTO (v0.4) |
| 17 | Dashboard web: vista Alertas IA con placeholder para diagnóstico LLM | ✓ LISTO (v0.4) |
| 18 | Deploy backend + dashboard en Railway como URL pública | Pendiente |

### Semanas 5-6 (19 abril - 2 mayo)

| # | Tarea | Estado |
|---|-------|--------|
| 19 | firma_hidrica.py con datos sintéticos | Pendiente |
| 20 | comparativo.py (CUSUM) | Pendiente |
| 21 | Dashboard firma hídrica (placeholder en React, se activa cuando existan datos) | ✓ LISTO (v0.4) |
| 22 | Dashboard comparativo (gráfica trat vs testigo por bloque, selector días) | ✓ LISTO (v0.4) |
| 23 | Endpoints API: /firma, /comparativo, /clima/pronostico | ✓ LISTO (v0.4) |
| 24 | Alertas de breaking point dinámico | Pendiente |

### Semanas 7-8 (3 - 16 mayo)

| # | Tarea | Estado |
|---|-------|--------|
| 25 | llm_consultor.py conectado a Claude API | Pendiente |
| 26 | 6 prompts especializados (phytophthora, firma, bioinsumos, semanal, visual, agricultor) | Pendiente |
| 27 | Pipeline completo: alerta → LLM → dashboard Alertas IA | Pendiente |
| 28 | Diagnóstico visual: foto en dashboard → Claude Vision + datos sensores → diagnóstico integrado | Pendiente |
| 29 | Fallback si API falla | Pendiente |
| 30 | Reporte semanal automático con IA | Pendiente |
| 31 | Comandos Telegram: /registrar, /lab, /reporte | Pendiente |

### Semanas 9-10 (17 - 31 mayo)

| # | Tarea | Estado |
|---|-------|--------|
| 32 | modelo_microbioma.py con Random Forest (datos sintéticos, 14 features con clima) | Pendiente |
| 33 | Firmware ESP32 completo (nodo_sensor.ino + config.h + ota.h) | Pendiente |
| 34 | Template de reporte simplificado para agricultor (formato WhatsApp) | Pendiente |
| 35 | Diseño de cálculo de huella hídrica (litros agua / kg aguacate) | Pendiente |
| 36 | Demo en vivo preparada y ensayada | Pendiente |
| 37 | Repo Git limpio, README, documentación | Pendiente |
| 38 | Preparar docker-compose.yml para producción | Pendiente |
| 39 | Memoria técnica actualizada a versión final | Pendiente |

---

## 14. DEPENDENCIAS

### 14.1 Python (backend)

```
psycopg2-binary    # conexión PostgreSQL
numpy              # cálculos numéricos
scipy              # curve_fit para firma hídrica
pandas             # manejo de datos y CSVs
scikit-learn       # Random Forest
fastapi            # API REST para dashboard (LISTO v0.4)
uvicorn            # servidor ASGI para FastAPI (LISTO v0.4)
anthropic          # API de Claude para llm_consultor.py
```

> **FUTURO (producción):** Se agrega `paho-mqtt` (cliente MQTT para ingesta.py real) cuando haya gateway en campo.

### 14.2 Dashboard (React)

```
react + react-dom       # UI framework
react-router-dom        # routing entre vistas
recharts                # gráficas (AreaChart, LineChart, ComposedChart)
react-leaflet + leaflet # mapa interactivo con OpenStreetMap
tailwindcss v4          # estilos CSS utility-first
vite                    # bundler + dev server con proxy
```

---

## 15. QUERIES ÚTILES PARA GRAFANA

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
    AVG(l.t20) as t20_media
FROM lecturas l
JOIN nodos n ON l.nodo_id = n.nodo_id
WHERE l.tiempo > NOW() - INTERVAL '30 days'
GROUP BY dia, n.rol
ORDER BY dia;

-- Score de riesgo Phytophthora (simplificado)
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

-- Evolución de firma hídrica
SELECT evento_riego, nodo_id, vel_10_20, tau_10, tau_20, breaking_point_10
FROM firma_hidrica
WHERE nodo_id = 1
ORDER BY evento_riego DESC LIMIT 20;
```

---

## 16. API REST — ENDPOINTS (v0.4)

20 endpoints implementados en `backend/api.py` (FastAPI):

| Grupo | Método | Endpoint | Función |
|-------|--------|----------|---------|
| Predios | GET | /api/predios | Lista de predios |
| | GET | /api/predios/{id}/overview | 4 KPIs + lista nodos con score |
| Nodos | GET | /api/predios/{id}/nodos | Lista nodos con status, score, batería |
| | GET | /api/nodos/{id} | Detalle completo: score desglosado, tendencia 24h, clima, microbioma |
| | GET | /api/nodos/{id}/lecturas?intervalo=5min\|1h\|1d | Serie de tiempo con agregación |
| Firma | GET | /api/predios/{id}/firma | Últimas firmas hídricas de todos los nodos |
| | GET | /api/nodos/{id}/firma | Últimas 20 firmas de un nodo |
| Comparativo | GET | /api/predios/{id}/comparativo?dias=30 | Media diaria trat vs testigo por bloque |
| Clima | GET | /api/clima/actual | Última lectura + ETo del día |
| | GET | /api/clima/historico?dias=30 | Serie de tiempo de clima |
| | GET | /api/clima/pronostico | Próximos 7 días |
| Alertas | GET | /api/predios/{id}/alertas | Eventos recientes con JSONB |
| | GET | /api/nodos/{id}/alertas | Alertas de un nodo |
| Registros | POST | /api/tratamientos | Registrar aplicación de bioinsumo |
| | POST | /api/microbioma | Registrar qPCR con snapshot automático de sensores |
| Sistema | GET | /api/health | Status + conteo lecturas |
| | GET | /docs | Documentación Swagger automática |

---

## 17. DASHBOARD WEB — STACK Y VISTAS (v0.4)

### 17.1 Stack tecnológico

| Tecnología | Versión | Función |
|------------|---------|---------|
| React | 19 | UI framework |
| Vite | 8 | Bundler + dev server + proxy |
| Tailwind CSS | 4 | Estilos utility-first |
| Recharts | 2 | Gráficas (AreaChart, LineChart, ComposedChart) |
| react-leaflet + Leaflet | 5/1.9 | Mapa interactivo con OpenStreetMap |
| react-router-dom | 7 | Routing entre 6 vistas |

### 17.2 Vistas implementadas

| Vista | Ruta | Contenido |
|-------|------|-----------|
| Overview | / | 4 KPIs + mapa Leaflet con 8 nodos coloreados por score (verde/amarillo/naranja/rojo) + tabla de nodos clickeable |
| Nodo detalle | /nodo/:id | 6 metric cards + AreaChart humedad 3 profundidades 24h + LineChart temp+EC 24h + AreaChart h10 7 días + desglose score Phytophthora |
| Firma hídrica | /firma | 3 KPIs placeholder + mensaje "pendiente firma_hidrica.py" |
| Comparativo | /comparativo | LineChart trat vs testigo por bloque + selector 7/14/30/90 días + delta promedio |
| Clima | /clima | 4 KPIs (datos reales Nextipac) + ComposedChart precip+temp + AreaChart ETo |
| Alertas IA | /alertas | 3 KPIs + lista de alertas con border coloreado + placeholder diagnóstico LLM + botones disabled "Enviar a Salvador" y "Generar reporte" |

### 17.3 Proxy de desarrollo

Vite redirige `/api/*` a FastAPI en `localhost:8000` vía `vite.config.js`:
```js
server: { proxy: { '/api': { target: 'http://localhost:8000' } } }
```

### 17.4 Producción

Para producción: `npm run build` genera estáticos en `dist/`. Se sirven desde el mismo servidor FastAPI con `app.mount("/", StaticFiles(...))` o desde Railway static hosting. Mismo dominio, sin CORS.

---

## 18. NOTAS TÉCNICAS IMPORTANTES

### PostgreSQL vs TimescaleDB
PostgreSQL estándar funciona perfecto para el volumen de desarrollo (416K filas). En producción con datos reales (15M+ filas/año), TimescaleDB agrega: hypertables que particionan automáticamente por tiempo, compresión 10-20× para datos viejos, continuous aggregates para queries rápidos sobre promedios diarios/semanales, y políticas de retención automáticas.

### Railway vs Docker/VPS — Decisión de infraestructura

**Decisión: Railway para desarrollo (pre-funding), Docker en VPS para producción (post-funding).**

**Por qué Railway ahora (marzo-junio 2026):**
Railway permite deployar con un push, tiene free tier generoso, SSL automático, y logs integrados. Para las 10 semanas de desarrollo pre-funding donde todo el código se prueba con datos sintéticos, es la opción correcta. No hay razón para aprender Docker antes de necesitarlo.

**Por qué migrar a Docker/VPS cuando llegue el hardware (junio 2026):**

Razón 1 — Costo. En producción se necesitan al menos 5 servicios corriendo 24/7: PostgreSQL/TimescaleDB, Mosquitto, ingesta.py, alertas.py, y el bot de Telegram. En Railway cada servicio activo cuesta ~$5-7 USD/mes = $25-35 USD/mes total. Un VPS de DigitalOcean con 1GB RAM corre los 5 juntos por $6 USD/mes. Con 8 nodos generando datos cada 5 minutos la diferencia se mantiene porque el cuello de botella es RAM, no compute, y 1GB sobra.

Razón 2 — Mosquitto (MQTT). El gateway RAK con 4G publica datos por MQTT. Se necesita un broker MQTT corriendo permanentemente escuchando en puerto 8883 con TLS. Railway no está diseñado para servicios que escuchan en puertos custom con protocolos que no son HTTP. Se pueden hacer workarounds con WebSockets pero es pelear contra la plataforma.

Razón 3 — TimescaleDB. Railway ofrece PostgreSQL estándar, que funciona para 416K filas de demo. En producción con 15 millones de filas al año (8 nodos × 288 lecturas/día × 365 días), se necesitan hypertables, compresión automática de datos viejos, y continuous aggregates para que Grafana no tarde 10 segundos en cargar. TimescaleDB es una extensión de PostgreSQL que no existe como addon de Railway. En Docker es una imagen que se jala con una línea: `image: timescale/timescaledb:latest-pg15`.

Razón 4 — Control de red y seguridad. En producción se necesita firewall configurado (solo puertos 8883, 443, SSH), certificados TLS para MQTT, y PostgreSQL accesible solo desde localhost. Railway abstrae todo eso, lo cual es bueno para desarrollo pero malo para seguridad de datos que viajan por internet desde un campo en Nextipac.

**La migración es simple.** Docker Compose es un archivo YAML que dice "levanta estos 5 servicios con estas configuraciones". El código Python no cambia ni una línea — solo cambia dónde corre. La migración es: rentar VPS ($6/mes), copiar código, escribir docker-compose.yml, correr `docker-compose up -d`, apuntar el gateway al nuevo servidor. Una tarde de trabajo.

**Comparación de costos directa:**

| Concepto | Railway (5 servicios 24/7) | VPS + Docker |
|----------|---------------------------|-------------|
| Compute | ~$25-35 USD/mes | $6 USD/mes (fijo) |
| PostgreSQL/TimescaleDB | Incluido (sin TimescaleDB) | Incluido (con TimescaleDB) |
| Mosquitto | No soportado nativamente | Incluido |
| Grafana | Grafana Cloud free (3 dashboards) | Self-hosted ilimitado |
| TLS/Certificados | Automático (solo HTTP) | Let's Encrypt (gratis, todos los protocolos) |
| Firewall | No configurable | Control total |
| Backups | Manual | Cron + pg_dump + S3 ($1/mes) |
| **Total** | **~$25-35 USD/mes** | **~$7 USD/mes** |

### Datos sintéticos vs datos reales
Los datos sintéticos modelan la física correctamente pero no capturan la variabilidad real del campo. El modelo de Random Forest entrenado con datos sintéticos NO es válido para predicciones reales — solo demuestra que el pipeline funciona. El modelo real necesita mínimo 50 pares de datos sensor-microbioma de laboratorio.

### Seguridad (producción)
En desarrollo, todo es local o con free tiers. En producción: MQTT con TLS obligatorio (datos viajan por internet), PostgreSQL solo accesible desde localhost, Grafana detrás de nginx con HTTPS, firewall con solo puertos 8883/443/SSH abiertos, backups diarios con pg_dump a S3.

### Calibración de sensores
Los sensores capacitivos de humedad necesitan una curva de calibración específica para el tipo de suelo. En las primeras 6-8 semanas del piloto se hacen muestreos gravimétricos semanales (pesar suelo húmedo → secar → pesar seco → calcular VWC real) y se comparan con la lectura del sensor para generar la ecuación de calibración. Sin esto, los % VWC que reporta el sensor son aproximados.

---

## 19. FUNCIONALIDADES INTEGRADAS DESDE ANÁLISIS COMPETITIVO (v0.2)

Se identificaron 8 plataformas agtech relevantes (CropX, SupPlant, NXTAgro, OneSoil, SIMA, Climate FieldView, Plantix, Agrio). Ninguna compite directamente con el sistema completo. El análisis completo está en el documento separado `Analisis_Competitivo_AGTECH_v1_0.md`.

De la competencia se integraron 5 funcionalidades al sistema:

### 19.1 Datos climáticos en tiempo real — ✓ IMPLEMENTADO (v0.4)

| Aspecto | Detalle |
|---------|---------|
| Inspiración | CropX, SupPlant, Climate FieldView |
| Implementación | clima.py consulta Open-Meteo API cada hora por coordenadas GPS de Nextipac |
| Datos | Temperatura ambiente, precipitación, humedad relativa, viento, radiación solar, pronóstico 7 días |
| Cálculo derivado | ETo (evapotranspiración) con ecuación Penman-Monteith FAO |
| Impacto en score Phytophthora | v2 incluye precipitación acumulada + pronóstico de lluvia + humedad relativa → score predictivo |
| Impacto en /regar | "Nodo 3 necesita riego PERO va a llover 15mm mañana, espera" |
| Impacto en /aplicar | "No aplicar Trichoderma hoy, pronóstico de lluvia fuerte mañana lava el inóculo" |
| Impacto en Random Forest | 3 features nuevos: precipitación_acum_7d, eto_acum_7d, hr_avg_7d |
| Costo | $0 (Open-Meteo es gratuita, sin API key) |

### 19.2 Mapa georreferenciado de nodos — ✓ IMPLEMENTADO (v0.4)

| Aspecto | Detalle |
|---------|---------|
| Inspiración | CropX, SIMA, NXTAgro |
| Implementación | react-leaflet + OpenStreetMap en dashboard React (reemplaza Grafana GeoMap) |
| Funcionalidad | 8 nodos como CircleMarker sobre mapa, coloreados por score Phytophthora (verde <25/amarillo 25-50/naranja 50-75/rojo >75). Click → navega a Nodo detalle |
| Impacto en demo | Cualquier evaluador no técnico entiende el sistema en 2 segundos |
| Impacto operativo | Agrónomo en campo sabe exactamente a qué árbol ir |
| Costo | $0 |

### 19.3 Diagnóstico visual integrado — PRIORIDAD MEDIA (semana 7-8)

| Aspecto | Detalle |
|---------|---------|
| Inspiración | Plantix, Agrio (concepto — ambos funcionan mal para aguacate) |
| Implementación | Extensión de llm_consultor.py con Claude Vision |
| Funcionalidad | Salvador manda foto de hoja al bot de Telegram → sistema la envía a Claude Vision junto con datos de sensores del nodo más cercano → diagnóstico integrado visual + contexto de suelo |
| Diferenciador | Nadie hace este cruce. Plantix diagnostica solo por foto. Nosotros: foto + 72h de datos de sensores |
| Ejemplo | "Mancha en hoja + h10=48% ×72h + score Phyto 72 = consistente con anoxia radicular, no antracnosis" |
| Costo | ~$0.01 por consulta adicional |

### 19.4 Cálculo de huella hídrica — PRIORIDAD BAJA (post-piloto)

| Aspecto | Detalle |
|---------|---------|
| Inspiración | SensaCultivo |
| Implementación | Cálculo derivado: agua entrada (riego + lluvia) - agua perdida (ETo + drenaje profundo estimado por sensor 30cm) |
| Resultado | Litros de agua por kg de aguacate producido |
| Para quién | No le importa al agricultor de Nextipac. Sí le importa al exportador que necesita certificaciones de sustentabilidad (Europa, Whole Foods) |
| Costo | $0 (datos ya disponibles) |

### 19.5 Reporte simplificado para agricultor vía WhatsApp — PRIORIDAD BAJA (semana 9-10 diseño, post-piloto envío)

| Aspecto | Detalle |
|---------|---------|
| Inspiración | SensaCultivo, NXTAgro |
| Implementación | Prompt reporte_agricultor.txt genera resumen semanal sin tecnicismos que el agrónomo reenvía por WhatsApp |
| Formato | "Esta semana tu huerta consumió X litros, la producción va bien, no hay riesgos, la próxima aplicación conviene el jueves" |
| Envío real por WhatsApp | Post-piloto. Ahorita el agrónomo lo reenvía manualmente |

### 19.6 Funcionalidades descartadas

| Funcionalidad | Quién la tiene | Por qué no |
|---------------|----------------|------------|
| NDVI satelital | OneSoil, CropX | 4ha = ~40 pixeles. Resolución insuficiente. Útil en 40+ ha |
| Drones | Mapsens, Visual | Caro, requiere licencia. No aporta más que los sensores de suelo para el piloto |
| Automatización de riego | CropX, SupPlant | En Nextipac no hay infraestructura de electroválvulas. Quitarle control al agricultor es contraproducente en fase de confianza |
| Sensores en planta | SupPlant | Hardware diferente, enfoque complementario. Posible alianza futura |

---

Documento generado el 21 de marzo de 2026.
AgTech Sistema v0.4 — PostgreSQL cargado + clima real + alertas implementadas + API REST 20 endpoints + dashboard React 6 vistas.
Documentos complementarios: Analisis_Competitivo_AGTECH_v1_0.md, Arquitectura_Software_3Pilares.md
