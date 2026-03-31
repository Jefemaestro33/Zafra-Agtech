# AgTech Sistema

Plataforma de agricultura inteligente diseñada para servir a agricultores de todo México. Combina sensores IoT enterrados en el suelo, datos climáticos en tiempo real, machine learning para predicción de microbioma, y un agente de IA (Claude) que genera diagnósticos accionables para agrónomos.

**Piloto:** La primera implementación se realizará en una huerta de aguacate Hass en Nextipac, Jalisco. Una vez validado el sistema en campo, el objetivo es expandir la plataforma a otros cultivos y regiones del país.

## Stack

| Capa | Tecnología |
|------|------------|
| Base de datos | PostgreSQL (Railway) / TimescaleDB (producción) |
| Backend API | Python + FastAPI (20 endpoints REST) |
| Motor de alertas | Score Phytophthora v2 (7 factores, cruza suelo + clima) |
| Clima | Open-Meteo API + ETo Penman-Monteith FAO |
| Dashboard | React + Vite + Tailwind CSS v4 + Recharts + react-leaflet |
| IA | Claude API (Anthropic) para diagnósticos con razonamiento causal |
| Hardware (futuro) | ESP32/TTGO T-Beam + LoRa + Gateway RAK con 4G |

## Quick Start

### 1. Generar datos sintéticos

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
python simulator/generate_data.py
```

Genera 416,592 lecturas de 8 nodos de sensores (6 meses) con 5 escenarios de validación: Phytophthora, nodo offline, divergencia tratamiento/testigo, lluvia, microbioma divergente.

### 2. Cargar en PostgreSQL

```bash
python simulator/load_data.py $DATABASE_URL
```

Crea las 8 tablas del schema y carga los 4 CSVs. Tarda ~30 segundos para 416K filas.

### 3. Backfill de datos climáticos

```bash
DATABASE_URL=$DATABASE_URL python backend/clima.py --backfill
```

Descarga 3 meses de datos meteorológicos reales de Nextipac desde Open-Meteo (gratis, sin API key).

### 4. Levantar API

```bash
DATABASE_URL=$DATABASE_URL uvicorn backend.api:app --reload --port 8000
```

Documentación Swagger en http://localhost:8000/docs

### 5. Levantar dashboard

```bash
cd dashboard && npm install && npm run dev
```

Dashboard en http://localhost:5173 (proxy automático a la API en :8000).

## Arquitectura (4 niveles)

```
Nivel 1 — Pipeline de datos
  ESP32 → LoRa → Gateway 4G → MQTT → ingesta.py → PostgreSQL
  clima.py → Open-Meteo API → tabla clima + ETo

Nivel 2 — Alertas y reglas
  alertas.py → Score Phytophthora v2 (0-100)
             → Alerta riego, offline, batería
             → Eventos en tabla eventos (JSONB)

Nivel 3 — Análisis avanzado
  firma_hidrica.py → τ secado, velocidad infiltración, breaking point
  comparativo.py   → CUSUM tratamiento vs testigo
  modelo_microbioma.py → Random Forest (14 features → qPCR)

Nivel 4 — Sistema multi-agente
  Agente 1 (Python) → comprime 172K lecturas/día en resumen de 200 palabras
  Agente 2 (Claude)  → diagnóstico causal + 2 recomendaciones + referencia científica
  api.py (FastAPI)   → 20 endpoints REST para dashboard web
```

## Documentación

- [Memoria Técnica v0.4](docs/memoria_tecnica_v0.4.md) — arquitectura completa, algoritmos, plan de construcción
- [Análisis Competitivo](docs/Analisis_Competitivo_AGTECH_v1_0.md) — 8 competidores evaluados
- [Arquitectura de Software](docs/Arquitectura_Software_3Pilares.md) — diseño detallado de los 3 pilares

## Estado del proyecto

| Componente | Estado |
|------------|--------|
| Datos sintéticos (416K registros) | ✓ Listo |
| PostgreSQL en Railway | ✓ Listo |
| clima.py + backfill 3 meses | ✓ Listo |
| alertas.py + Score Phytophthora v2 | ✓ Listo |
| api.py (FastAPI, 20 endpoints) | ✓ Listo |
| Dashboard React (6 vistas) | ✓ Listo |
| firma_hidrica.py | Pendiente |
| comparativo.py (CUSUM) | Pendiente |
| llm_consultor.py (Claude API) | Pendiente |
| modelo_microbioma.py (Random Forest) | Pendiente |
| Deploy en Railway | Pendiente |
| Hardware + campo | Pendiente (financiamiento junio 2026) |

## Licencia

Privado. Universidad Panamericana / AgTech Sistema.
