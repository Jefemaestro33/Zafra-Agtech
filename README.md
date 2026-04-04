# AgTech Sistema

Plataforma de agricultura inteligente diseñada para servir a agricultores de todo Mexico. Combina sensores IoT enterrados en el suelo, datos climaticos en tiempo real, machine learning para prediccion de microbioma, y un agente de IA (Claude) que genera diagnosticos accionables para agronomos.

**Piloto:** La primera implementacion se realizara en una huerta de aguacate Hass en Nextipac, Jalisco. Una vez validado el sistema en campo, el objetivo es expandir la plataforma a otros cultivos y regiones del pais.

## Stack

| Capa | Tecnologia |
|------|------------|
| Base de datos | PostgreSQL 15 (Railway) con indices + FK |
| Backend API | Python 3.13 + FastAPI (36 endpoints REST) |
| Autenticacion | JWT (2h) + bcrypt + rate limiting |
| Motor de alertas | Score Phytophthora v3 (10 factores, interacciones multiplicativas) |
| Balance hídrico | Recetas de riego prescriptivas (litros/árbol, hora, Kc mensual) |
| Calibración | Corrección gravimétrica + temperatura por predio |
| WhatsApp | Pipeline Meta Cloud API (cronjobs diarios/horarios/semanales) |
| Clima | Open-Meteo API + ETo Penman-Monteith FAO |
| ML | scikit-learn Random Forest (14 features → 5 targets microbioma) |
| Dashboard | React 19 + Vite 8 + Tailwind CSS v4 + Recharts + react-leaflet |
| IA | Claude Sonnet 4.5 (Anthropic) para diagnosticos con razonamiento causal |
| PWA | manifest.json + Service Worker |
| Hardware (futuro) | ESP32/TTGO T-Beam + LoRa + Gateway RAK con 4G |
| Deploy | Railway (Dockerfile multi-stage, auto-deploy) |

## Quick Start

### 1. Generar datos sinteticos

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
python simulator/generate_data.py
```

Genera 416,592 lecturas de 8 nodos de sensores (6 meses) con 5 escenarios de validacion.

### 2. Cargar en PostgreSQL

```bash
python simulator/load_data.py $DATABASE_URL
python simulator/seed_alertas.py  # 11 alertas realistas
```

### 3. Aplicar indices y foreign keys

```bash
psql $DATABASE_URL -f backend/migrations/001_indexes_and_constraints.sql
```

### 4. Backfill de datos climaticos

```bash
DATABASE_URL=$DATABASE_URL python backend/clima.py --backfill
```

### 5. Levantar API

```bash
JWT_SECRET=dev-secret DATABASE_URL=$DATABASE_URL uvicorn backend.api:app --reload --port 8000
```

Documentacion Swagger en http://localhost:8000/docs

### 6. Levantar dashboard

```bash
cd dashboard && npm install && npm run dev
```

Dashboard en http://localhost:5173

## Documentacion

- [Memoria Tecnica v1.2](docs/Memoria_Tecnica_v1_2.md) — arquitectura completa, algoritmos, estado actual
- [Analisis Competitivo](docs/Analisis_Competitivo_AGTECH_v1_0.md) — 8 competidores evaluados
- [Arquitectura de Software](docs/Arquitectura_Software_3Pilares.md) — diseno detallado de los 3 pilares
- [Presupuesto Piloto](docs/Presupuesto_Piloto_Nextipac.xlsx) — costos desglosados
- [Roadmap](docs/Roadmap_Lo_Que_Falta.md) — plan de trabajo detallado

## Estado del proyecto

| Componente | Estado |
|------------|--------|
| Backend Python (13 modulos, 44+ endpoints, ~6,500+ LOC) | Listo |
| Dashboard React (14 vistas funcionales + landing, ~6,600 LOC) | Listo |
| Autenticacion JWT (4 usuarios, 3 roles, rate limiting) | Listo |
| Landing page publica | Listo |
| PWA (instalable como app) | Listo |
| Exportacion CSV (lecturas, alertas, firma) | Listo |
| PostgreSQL en Railway (8 tablas, 420K+ registros, indices + FK) | Listo |
| 11 alertas realistas con contexto narrativo | Listo |
| Score Phytophthora v3 (10 factores + interacciones) | Listo |
| Balance hídrico prescriptivo (Kc, ETo, recetas) | Listo |
| Calibración gravimétrica + corrección temperatura | Listo |
| Pipeline WhatsApp (Meta Cloud API + cronjobs) | Listo (pendiente env vars) |
| Firma hidrica (tau, vel, BP) | Listo |
| CUSUM tratamiento vs testigo | Listo |
| Random Forest microbioma (5-Fold CV) | Listo |
| Consultor con Claude (6 prompts, chat interactivo) | Listo |
| Firmware ESP32 con retry LoRa | Listo |
| Error boundaries + lazy loading + code splitting | Listo |
| Seguridad (CORS, SQL validation, response validation) | Listo |
| Pipeline WhatsApp (codigo completo, Meta Cloud API) | Listo (pendiente numero + token) |
| Dominio propio + correo con dominio | Pendiente |
| Hardware + campo | Pendiente (financiamiento junio 2026) |
| Gestion de agronomos y usuarios | Pendiente |
| Historial de actividad | Pendiente |
| Tema claro | Pendiente |

---

## NOTA PARA CLAUDE CODE (leer en cada sesion)

**IMPORTANTE: Este README debe actualizarse al final de cada sesion de trabajo con los cambios realizados.**

### Que falta por hacer (mapa de trabajo pendiente)

**Prioridad alta — Necesario para el piloto:**
1. **Pipeline WhatsApp** — Cronjob alertas.py cada hora → diagnostico Claude → mensaje Twilio/Meta al agricultor y agronomo. Bloqueado por: numero de WhatsApp Business.
2. **Dominio propio** — Comprar dominio (ej. agtech.mx), configurar DNS en Railway, ALLOWED_ORIGINS.
3. **Correo con dominio** — Google Workspace o Zoho para comunicacion profesional.
4. **Env vars en Railway para produccion** — JWT_SECRET real, DEFAULT_ADMIN_PASS/DEFAULT_AGRO_PASS reales, ALLOWED_ORIGINS con dominio.

**Prioridad media — Robustece la plataforma:**
5. **Gestion de agronomos** — Vista para agregar, quitar y asignar agronomos a predios (placeholder existe).
6. **Gestion de usuarios** — Mover usuarios de env vars a DB, CRUD desde el dashboard.
7. **Historial de actividad** — Audit log: quien hizo que y cuando.
8. **Backups automaticos** — pg_dump diario a S3 o similar.
9. **Tema claro** — CSS variables ya soportan theming, solo falta toggle + segundo set de colores.

**Prioridad baja — Nice to have:**
10. **Notificaciones push** — Browser push cuando hay alerta critica (campana ya existe en UI).
11. **Contabilidad/Finanzas** — Tracking costos operativos y 30% revenue share (placeholders existen).
12. **Migrar Railway → VPS** — Reducir costo de $25-35 USD/mes a ~$6 USD/mes.
13. **Aviso de privacidad** — Requisito legal Mexico (LFPDPPP).

### Contexto tecnico para la siguiente sesion
- Railway CLI esta linkeado al proyecto (workspace: jefemaestro33)
- DB publica: `railway variables --json` para obtener DATABASE_PUBLIC_URL
- Deploy es automatico en cada push a main
- Coordenadas reales del predio: 20.75957, -103.51187 (Nextipac)
- Usuarios: ernest (admin), salvador (agronomo), carloslp (observador), invitado (observador)
- Service worker: no cachea /assets/ (cache busting por hash de Vite)

## Licencia

Privado. Universidad Panamericana / AgTech Sistema.
