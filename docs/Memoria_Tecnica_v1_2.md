# MEMORIA TECNICA — PROYECTO AGTECH

## Plataforma de Agricultura Inteligente para Mexico

**Version 2.0** — 3 de abril de 2026
Guadalajara, Jalisco

---

## 1. RESUMEN EJECUTIVO

AgTech es una plataforma de agricultura inteligente diseñada para servir a agricultores de todo Mexico. Combina sensores IoT enterrados en el suelo, datos climaticos en tiempo real, machine learning, y un agente de IA (Claude) para optimizar riego, prevenir Phytophthora cinnamomi y monitorear el microbioma del suelo. El primer piloto se realizara en una huerta de aguacate Hass en Nextipac, Jalisco, con el objetivo de expandir a otros cultivos y regiones del pais tras la validacion en campo.

El sistema resuelve un problema concreto: los productores de aguacate pierden entre 15-30% de su produccion anual por Phytophthora cinnamomi, un oomiceto que pudre las raices cuando el suelo esta saturado de agua. La deteccion convencional (visual) llega tarde — cuando los sintomas aparecen en las hojas, el arbol ya tiene dano radicular severo. AgTech detecta las condiciones de riesgo en el suelo antes de que la planta manifieste sintomas, permitiendo intervencion preventiva.

**Diferenciadores vs competencia (CropX, SupPlant, NXTAgro):**
- Datos pareados sensor-microbioma (qPCR + IoT) — nadie mas los tiene
- Especializacion vertical en aguacate Hass en andisoles volcanicos
- Modelo de riesgo compartido: 30% del incremento de produccion, $0 upfront
- Agronomo en campo (Salvador) que traduce datos en acciones — no vendemos cajas
- Stack de IA completo: sensores → firma hidrica → CUSUM → ML → LLM con diagnosticos
- Balance hidrico prescriptivo: recetas de riego con litros/arbol y timing exacto
- Pipeline WhatsApp listo para produccion

**Estado actual (v2.0 — 3 abril 2026):** Sistema completo funcionando en produccion con datos sinteticos (416K registros) + 11 alertas realistas. Deploy publico en Railway. Landing page publica, dashboard dark premium con autenticacion JWT (4 usuarios, 3 roles), sidebar colapsable, 14 vistas funcionales + 5 placeholders, consultor interactivo con Claude, sistema de alertas con desglose visual y diagnosticos IA, exportacion CSV, CRUD de predios, y PWA instalable.

**Novedades v2.0:**
- Score Phytophthora v3 (10 factores con interacciones multiplicativas)
- Modulo de balance hidrico prescriptivo (recetas de riego: litros, hora, frecuencia)
- Modulo de calibracion gravimetrica (correccion por temperatura, umbrales por predio)
- Pipeline WhatsApp completo (Meta Cloud API, cronjobs diarios/horarios/semanales)
- Firma hidrica v2 (filtro mediana anti-ruido, correccion temp, modelo biexponencial)
- CUSUM v2 (tracking de EC, nombres legibles, tamano del efecto)
- LLM v2 (contexto acumulativo, historial tratamientos, integracion balance hidrico)
- SQL: tablas riegos, analisis_foliar, balance_historico
- API: 8 endpoints nuevos (balance, riegos, analisis foliar)

Pendiente: hardware en campo y datos reales (estimado junio 2026 con financiamiento UP).

### Modelo de negocio

- **Cobro:** 30% del incremento de produccion atribuible al sistema, medido contra parcela testigo
- **Piloto:** 4 hectareas en Nextipac con 8 nodos (4 tratamiento + 4 testigo)
- **Pipeline:** 10 agricultores con 500+ hectareas comprometidas para fase de validacion
- **Expansion:** Tras validar el piloto, escalar a otros cultivos y regiones de Mexico
- **Financiamiento:** Fondo de inversion Universidad Panamericana, estimado junio 2026

---

## 2. ESTADO ACTUAL — Lo que esta construido y funcionando (30 marzo 2026)

### 2.1 Backend Python (13 modulos, ~6,500+ lineas)

| Modulo | Lineas | Funcion | Estado |
|--------|--------|---------|--------|
| `api.py` | ~1,200 | FastAPI con 44+ endpoints REST (CRUD predios, balance hidrico, riegos, foliar, export CSV, auth, config alertas), CORS configurable, rate limiting, sirve dashboard estatico | Produccion |
| `alertas.py` | ~750 | Score Phytophthora **v3** (10 factores + interaccion multiplicativa), alerta riego/offline/bateria, `generar_resumen_nodo()` con contexto acumulativo (tratamientos, balance, diagnosticos previos) | Produccion |
| `balance_hidrico.py` | ~280 | **NUEVO v2.** Balance hidrico prescriptivo: ETo × Kc → deficit → receta de riego (mm, litros/arbol, hora). Mensajes WhatsApp formateados | Produccion |
| `calibracion.py` | ~100 | **NUEVO v2.** Configuracion de calibracion gravimetrica por predio, correccion por temperatura, umbrales calibrados | Produccion |
| `whatsapp.py` | ~220 | **NUEVO v2.** Pipeline Meta Cloud API: cronjobs diarios (receta 6AM), horarios (alertas criticas), semanales (reporte productor) | Listo (pendiente env vars) |
| `clima.py` | ~310 | Open-Meteo API → ETo Penman-Monteith, backfill historico, modo daemon | Produccion |
| `llm_consultor.py` | ~530 | Claude Sonnet API con httpx, 6 prompts especializados, diagnosticos + reportes, **v2: contexto acumulativo + historial tratamientos + balance hidrico** | Produccion |
| `firma_hidrica.py` | ~500 | Deteccion de eventos de mojado, curve_fit τ, velocidad infiltracion, breaking point. **v2: filtro mediana anti-ruido, correccion temperatura, modelo biexponencial para andisoles** | Produccion |
| `comparativo.py` | ~420 | CUSUM tratamiento vs testigo, medias diarias, analisis por bloque. **v2: tracking EC, nombres legibles, efecto tamano** | Produccion |
| `modelo_microbioma.py` | ~410 | Random Forest (14 features → 5 targets), 5-Fold CV, prediccion on-demand. **v2: disclaimer datos sinteticos, plan reentrenamiento** | Produccion |
| `auth.py` | ~170 | Autenticacion JWT (2h expiracion), usuarios desde env vars, bcrypt, rate limiting | Produccion |
| `db.py` | ~45 | Modulo compartido de conexion a PostgreSQL (get_conn, query, execute) | Produccion |
| `config_alertas.py` | ~70 | Configuracion personalizable de umbrales de alerta (JSON) | Produccion |

### 2.2 Dashboard React (20 vistas, 5 componentes base, ~6,600 lineas JSX/JS/CSS)

| Vista | Ruta | Contenido | Estado |
|-------|------|-----------|--------|
| Landing | (sin auth) | Pagina publica con hero, estadisticas, 6 feature cards, modelo de negocio, CTA | Funcional |
| Login | (sin auth) | Formulario con validacion, eye toggle, shake animation en error, rate limiting | Funcional |
| Predio | `/predio` | Info del predio editable (inline edit + confirm modal) + selector de predio + agronomos asignados + notas (localStorage) + estado del sistema | Funcional |
| Overview | `/` | 4 KPIs + mapa Leaflet satelital (Esri) centrado en coordenadas del predio + 8 nodos coloreados por score + tabla clickeable con colores semanticos | Funcional |
| Nodo detalle | `/nodo/:id` | 6 metricas + 3 graficas Recharts (humedad 3 prof. con gradientes SVG, temp+EC, h10 7d) + desglose score | Funcional |
| Firma hidrica | `/firma` | 3 KPIs + grafica evolucion τ10 por nodo (trat vs testigo, solidas vs punteadas) + tabla historial 654 firmas | Funcional |
| Comparativo | `/comparativo` | Selector periodo (7/14/30/90/180d) + LineChart trat vs testigo por bloque + CUSUM (S+/S-) + badge divergencia | Funcional |
| Clima | `/clima` | 4 KPIs datos reales Nextipac (Open-Meteo) + barras precipitacion + linea temp + area ETo con gradiente | Funcional |
| Alertas | `/alertas` | 3 sub-rutas (todas/destacadas/borradas). Alertas colapsables con: desglose visual del score (barras por factor), boton "Explicame esta alerta" (logica paso a paso con semaforo), timeline del evento, sparkline h10 ultimas 48h, diagnostico IA (Claude Sonnet), reporte para agricultor, enviar a agronomos asignados (clipboard), destacar con razon (modal), mover a papelera/restaurar | Funcional |
| Consultor | `/consultor` | Chat interactivo con IA. Selector de seccion (Overview/Nodo/Firma/Comparativo/Clima) como botones toggle. Inyecta datos reales del predio como contexto. Historial de mensajes con bubbles (usuario/IA). Boton limpiar chat | Funcional |
| Gestionar predios | `/admin/predios` | Vista unificada con 3 tabs: Editar predio (campos inline editables con lat/lon), Posicionar nodos (mapa interactivo), Nuevo predio (formulario completo) | Funcional |
| Exportar datos | `/exportar` | Descarga CSV de lecturas (periodo configurable 7/30/90/180d), alertas y firma hidrica | Funcional |
| Config alertas | `/config/alertas` | Umbrales personalizables del Score Phytophthora | Funcional |
| Config notificaciones | `/config/notificaciones` | Configuracion de canales de notificacion | Funcional |
| Config integraciones | `/config/integraciones` | API keys, webhooks | Funcional |
| Config respaldos | `/config/respaldos` | Respaldos de base de datos | Funcional |
| Placeholders | varias | Vista con badge "Proximamente" para: Agronomos, Usuarios, Historial, Contabilidad, Finanzas | Placeholder |

**Componentes base (5):**
- `KpiCard` — trend indicator opcional, Lucide icons, glow backgrounds por color, hover lift
- `ScoreBadge` — Shield icons por nivel (ShieldCheck/Shield/ShieldAlert/ShieldX), pulse animation en CRITICO
- `Loading` — Skeleton loaders dark-themed (KPIs + chart + tabla)
- `EmptyState` — Contenedor dark con icono centrado (Lucide o string) + titulo + descripcion
- `ErrorBoundary` — Captura errores de render en componentes hijos, muestra mensaje con boton "Reintentar"

**Layout:**
- Sidebar colapsable (220px expandido → 60px icon rail) con toggle ChevronsLeft/Right
- Sidebar y header fijos al viewport (position: fixed), independientes del scroll del contenido principal
- Main content con margin-top (48px header) y margin-left dinamico segun estado del sidebar
- Seccion "Administrador" separada visualmente en sidebar con divider + titulo uppercase
- Header fijo 48px con logo AgTech (Leaf icon + texto) + campana de notificaciones con badge contador
- Perfil de usuario al fondo del sidebar (mt-auto) con boton que despliega menu hacia arriba
- Menu desplegable de perfil con secciones: Configuracion (alertas, notificaciones, integraciones, respaldos), Preferencias (documentacion), Cerrar sesion
- Sub-menu desplegable en Alertas: Todas, Destacadas, Borradas (papelera)
- Mobile: boton hamburger/X en header, sidebar como drawer con overlay oscuro
- Code splitting con React.lazy() + Suspense para todas las vistas

**PWA (Progressive Web App):**
- `manifest.json` con nombre, colores, iconos para instalacion como app nativa
- Service Worker con cache strategy: network-first para assets, skip para /api/ y /assets/ (cache busting via hash)
- Instalable desde Chrome/Safari en dispositivos moviles

**Autenticacion:**
- JWT con expiracion de 2 horas
- 4 usuarios con 3 roles: admin (ernest), agronomo (salvador), observador (carloslp, invitado)
- Usuarios configurables via env vars (AUTH_USERS JSON o AUTH_USER_N/AUTH_PASS_N)
- Rate limiting: 5 intentos fallidos por usuario bloquean login por 5 minutos
- Persistencia de sesion en localStorage con validacion al recargar

**Seguridad:**
- CORS configurable via ALLOWED_ORIGINS env var (no wildcard en produccion)
- JWT_SECRET desde env var (fallback dev con warning)
- Validacion de columnas SQL contra whitelist en endpoints de escritura
- Validacion de formato de fecha en parametros de query
- API key de Anthropic validada lazily (no crashea si no esta configurada)
- Parsing de respuestas LLM con try-except y fallback a texto raw

**Sistema de diseno (dark premium theme):**
- 25+ CSS custom properties organizadas por categoria (surfaces, borders, texto, acentos, dims, glows)
- Tipografia: Plus Jakarta Sans (UI) + JetBrains Mono (datos numericos) via Google Fonts
- Iconografia: Lucide React v0.577 — todos los iconos SVG
- Animaciones: staggered fade-in, card-glow hover, pulse-critical
- Colores semanticos consistentes: cyan = humedad, amber = temperatura, naranja = EC, verde = tratamiento/positivo, gris = testigo, rojo = alerta/peligro, violet = tiempo

### 2.3 Base de datos PostgreSQL (Railway)

| Tabla | Registros | Contenido |
|-------|-----------|-----------|
| lecturas | 416,592 | Datos de sensores cada 5 min, 8 nodos, 6 meses (ene-jun 2026) — sinteticos |
| firma_hidrica | 654 | Firma hidrica calculada por evento de riego (τ, vel, BP) |
| microbioma | 560 | qPCR quincenal pareado con sensores (5 targets x 8 nodos x 14 fechas) |
| clima | 2,160 | Datos meteorologicos reales de Nextipac (dic 2025 - mar 2026, Open-Meteo) |
| nodos | 8 | Metadata: 4 bloques, 4 tratamiento + 4 testigo |
| tratamientos | 24 | Aplicaciones de micorriza y Trichoderma simuladas |
| predios | 2 | Aguacate JP (Nextipac, 4 ha, andisol volcanico) + Huerta Los Pinos |
| eventos | 11 | Alertas realistas: 4 Phytophthora (CRITICO/ALTO/MODERADO), 3 riego, 1 offline, 2 bateria, 1 divergencia CUSUM |

**Indices y constraints** (migration 001):
- Indices en `(nodo_id, tiempo DESC)` para lecturas, firma_hidrica, clima, eventos, microbioma
- Foreign keys con ON DELETE CASCADE de todas las tablas hacia nodos

### 2.4 Inteligencia Artificial

**Claude Sonnet (Anthropic API):**
- 6 prompts especializados en `backend/prompts/`: phytophthora, firma_hidrica, bioinsumos, reporte_semanal, diagnostico_visual, reporte_agricultor
- Diagnosticos con formato: DIAGNOSTICO → RECOMENDACION 1 → RECOMENDACION 2 → REFERENCIA
- Integrado en 2 vistas del dashboard:
  - Alertas: genera diagnosticos por alerta individual (POST `/api/alertas/{id}/diagnostico`)
  - Consultor: chat interactivo con contexto automatico de la seccion seleccionada
- Retry 3x con backoff exponencial, validacion de respuesta, fallback si API no responde
- Parsing de secciones con regex + fallback a texto raw si el formato varia
- Costo estimado: ~$0.45 USD/mes (60 consultas x ~500 tokens)

**Random Forest (scikit-learn):**
- 14 features: snapshot (5) + ventana 7d (7) + firma hidrica (2)
- 5 targets: 16S_universal, AMF, trichoderma, phytophthora, respiracion
- 5-Fold Cross-Validation (migrado desde LOO-CV para mejor rendimiento)
- Feature dominante: `tau_10_ultimo` (35-52% importancia)

### 2.5 Firmware ESP32 (~540 lineas C++)

| Archivo | Lineas | Funcion |
|---------|--------|---------|
| `config.h` | 90 | Pines TTGO T-Beam, LoRa 915MHz, calibracion, OTA |
| `ota.h` | 105 | Actualizacion WiFi con reed switch magnetico |
| `nodo_sensor.ino` | ~345 | Flujo: 15 lecturas/5min → paquete binario 23 bytes → LoRa TX con retry (3 intentos, backoff exponencial) → deep sleep |

Listo para flashear cuando llegue el hardware. Solo cambiar `NODO_ID` por nodo.

### 2.6 Infraestructura

| Servicio | Estado | URL/Detalle |
|----------|--------|-------------|
| Railway PostgreSQL | Produccion | 8 tablas, 420K+ registros, indices y FK |
| Railway App (API + Dashboard) | Produccion | https://agtech-sistema-production.up.railway.app/ |
| GitHub repo | Privado | Jefemaestro33/agtech-sistema, auto-deploy en cada push |
| Dockerfile | Multi-stage | Node 20 (build React) + Python 3.13 (serve FastAPI) |
| PWA | Instalable | manifest.json + service worker |

---

## 3. ARQUITECTURA TECNICA

```
CAMPO (futuro)                    NUBE (Railway, actual)
--------------                    ---------------------

ESP32/TTGO --LoRa---→ Gateway RAK
  (nodo)               con 4G/LTE
  retry 3x                |
                      internet 4G
                           |
                           └--MQTT--→ [futuro] Mosquitto
                                        |
                                        ▼
                      ┌─────────────────────────────────────┐
                      │         PostgreSQL (Railway)         │
                      │  lecturas | nodos | microbioma       │
                      │  clima | firma_hidrica | eventos     │
                      │  tratamientos | predios              │
                      │  + indices + foreign keys            │
                      └──────────────┬──────────────────────┘
                                     |
                ┌────────────────────┼────────────────────┐
                |                    |                    |
                ▼                    ▼                    ▼
       ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
       │  alertas.py  │    │  clima.py    │    │ firma_hidrica│
       │  Score Phyto │    │  Open-Meteo  │    │ τ, vel, BP   │
       │  v2 (0-100)  │    │  + ETo FAO   │    │              │
       └──────┬──────┘    └──────────────┘    └──────────────┘
              |
              ├──→ comparativo.py (CUSUM por bloque)
              |
              ├──→ modelo_microbioma.py (Random Forest 5-Fold)
              |
              └──→ llm_consultor.py ──API──→ Claude Sonnet
                          |                  (6 prompts)
                          ▼
                ┌──────────────────┐
                │   api.py         │
                │   FastAPI        │
                │   36 endpoints   │
                │   JWT auth       │
                │   rate limiting  │
                │   CSV export     │
                └────────┬─────────┘
                         |
                         ▼
                ┌──────────────────────────────────────┐
                │   Landing page (publica)             │
                │   ─────────────────────              │
                │   Dashboard React + Vite (auth)      │
                │   20 vistas (14 funcionales)         │
                │   Sidebar colapsable                 │
                │   Dark premium theme                 │
                │   Mapa Leaflet + Recharts            │
                │   Consultor (chat con Claude)        │
                │   Export CSV                         │
                │   PWA instalable                     │
                │   ErrorBoundary + lazy loading       │
                └──────────────────────────────────────┘
                         |
                         ▼
                Agronomos asignados (Salvador)
                + Agricultor (via WhatsApp — pendiente)
```

---

## 4. STACK TECNOLOGICO

| Capa | Tecnologia | Version |
|------|------------|---------|
| Base de datos | PostgreSQL | 15 (Railway) |
| Backend API | Python + FastAPI | 3.13 / >=0.115 |
| Autenticacion | JWT (python-jose) + bcrypt | 2h expiracion |
| Motor alertas | Python (psycopg2) | >=2.9 |
| Clima | Open-Meteo API + httpx | Gratuita |
| ML | scikit-learn (Random Forest) | >=1.5 |
| Ajuste curvas | scipy (curve_fit) | >=1.14 |
| Calculos | numpy + pandas | >=2.0 / >=2.2 |
| IA generativa | Claude Sonnet 4.5 (Anthropic) | httpx directo |
| Dashboard | React + Vite | 19 / 8 |
| Estilos | Tailwind CSS | 4 |
| Graficas | Recharts | 2 |
| Mapa | react-leaflet + Leaflet | 5 / 1.9 |
| Tiles | Esri World Imagery + OpenStreetMap | — |
| Iconos | lucide-react | 0.577 |
| Fonts | Plus Jakarta Sans + JetBrains Mono | Google Fonts |
| Firmware | C++ (Arduino / ESP32) | — |
| Hardware | TTGO T-Beam v1.1 (ESP32 + SX1276) | — |
| Radio | LoRa 915 MHz | SF7, BW125k |
| Deploy | Railway (Dockerfile multi-stage) | — |
| PWA | manifest.json + Service Worker | — |
| Repo | GitHub (privado, auto-deploy) | — |

---

## 5. ENDPOINTS API (36 total)

| # | Metodo | Endpoint | Funcion |
|---|--------|----------|---------|
| 1 | POST | `/api/auth/login` | Login con rate limiting (5 intentos/5 min) |
| 2 | GET | `/api/auth/me` | Verificar token JWT |
| 3 | GET | `/api/predios` | Lista de predios |
| 4 | POST | `/api/predios` | Crear nuevo predio |
| 5 | PUT | `/api/predios/{id}` | Actualizar campos del predio (con validacion de columnas) |
| 6 | GET | `/api/predios/{id}/overview` | 4 KPIs + 8 nodos con score |
| 7 | GET | `/api/predios/{id}/nodos` | Nodos con status, score, bateria |
| 8 | GET | `/api/predios/{id}/firma` | Firmas hidricas de todos los nodos |
| 9 | GET | `/api/predios/{id}/comparativo` | Media diaria trat vs testigo + CUSUM |
| 10 | POST | `/api/predios/{id}/cusum` | Analisis CUSUM detallado |
| 11 | GET | `/api/predios/{id}/alertas` | Eventos/alertas recientes |
| 12 | GET | `/api/nodos/{id}` | Detalle completo: score desglosado, tendencia, clima, microbioma |
| 13 | GET | `/api/nodos/{id}/lecturas` | Serie de tiempo (5min, 1h, 1d) con validacion de fechas |
| 14 | PUT | `/api/nodos/{id}` | Actualizar coordenadas/nombre del nodo |
| 15 | GET | `/api/nodos/{id}/firma` | Ultimas 20 firmas de un nodo |
| 16 | GET | `/api/nodos/{id}/alertas` | Alertas de un nodo |
| 17 | GET | `/api/clima/actual` | Ultima lectura + ETo del dia |
| 18 | GET | `/api/clima/historico` | Serie clima (configurable dias) |
| 19 | GET | `/api/clima/pronostico` | Proximos 7 dias |
| 20 | GET | `/api/microbioma/nodo/{id}` | Ultimos registros de lab |
| 21 | GET | `/api/microbioma/modelo` | Metricas del modelo ML (R2, MAE, features) |
| 22 | POST | `/api/microbioma/predecir/{id}` | Prediccion ML del microbioma |
| 23 | POST | `/api/alertas/{id}/diagnostico` | Genera diagnostico IA con Claude |
| 24 | POST | `/api/reportes/semanal` | Reporte tecnico semanal |
| 25 | POST | `/api/reportes/agricultor` | Reporte WhatsApp para agricultor |
| 26 | POST | `/api/diagnostico/visual` | Foto + sensores → Claude Vision |
| 27 | POST | `/api/tratamientos` | Registrar aplicacion de bioinsumo |
| 28 | POST | `/api/microbioma` | Registrar qPCR con snapshot sensores |
| 29 | GET | `/api/config/alertas` | Obtener configuracion de alertas |
| 30 | PUT | `/api/config/alertas/{section}` | Actualizar umbrales de alerta |
| 31 | POST | `/api/config/alertas/reset` | Resetear configuracion a defaults |
| 32 | GET | `/api/export/lecturas` | Exportar lecturas como CSV (periodo configurable) |
| 33 | GET | `/api/export/alertas` | Exportar alertas como CSV |
| 34 | GET | `/api/export/firma` | Exportar firma hidrica como CSV |
| 35 | GET | `/api/health` | Status del sistema |
| 36 | GET | `/{path}` | Serve React SPA (cualquier ruta no-API) |

Documentacion Swagger automatica en `/docs`.

---

## 6. MODELOS Y ALGORITMOS

### 6.1 Score Phytophthora v2 (0-100)

Basado en literatura: P. cinnamomi necesita suelo humedo + temperatura 15-28C para esporular. La v2 cruza datos de suelo con clima para ser predictivo.

| Factor | Condicion | Puntos |
|--------|-----------|--------|
| Humedad 10cm | >45% VWC | +15 |
| Humedad 10cm | >40% VWC | +8 |
| Humedad 20cm | >45% VWC | +15 |
| Humedad 20cm | >40% VWC | +8 |
| Temperatura suelo | 22-28C (rango optimo) | +20 |
| Temperatura suelo | 15-22C | +10 |
| Horas humedo continuas | >72h | +15 |
| Horas humedo continuas | >48h | +10 |
| Horas humedo continuas | >24h | +5 |
| Precipitacion acumulada 7d | >50mm | +10 |
| Precipitacion acumulada 7d | >25mm | +5 |
| Pronostico lluvia 48h | >20mm | +5 |
| HR ambiente promedio 48h | >80% | +5 |

Clasificacion: 0-25 BAJO, 26-50 MODERADO, 51-75 ALTO, 76-100 CRITICO.

El dashboard muestra este score de 3 formas interactivas:
1. **Desglose visual** — barras horizontales por factor con color semantico (rojo/ambar/verde) y puntos aportados
2. **"Explicame esta alerta"** — explicacion paso a paso en lenguaje natural con semaforo por factor y razonamiento causal
3. **Timeline** — cronologia del evento mostrando como se acumularon las condiciones de riesgo

### 6.2 Firma hidrica

Se calcula automaticamente para cada evento de mojado detectado (Δh10 > 3% VWC en 5 minutos):

| Metrica | Calculo | Significado |
|---------|---------|-------------|
| vel_10_20 | 0.10m / (t_arribo_20 - t_arribo_10) | Velocidad del frente de mojado — macroporosidad |
| vel_20_30 | 0.10m / (t_arribo_30 - t_arribo_20) | Infiltracion profunda |
| τ_10, τ_20, τ_30 | curve_fit exponencial (scipy) | Constante de secado — estructura del suelo |
| breaking_point | Cambio de signo en d2h/dt2 | Punto optimo de riego |
| delta_h_max | max(h10 - h30) durante evento | Gradiente vertical — retencion |

### 6.3 CUSUM (deteccion de divergencia)

| Parametro | Valor | Descripcion |
|-----------|-------|-------------|
| Baseline | Primeros 28 dias | Media y σ de referencia |
| Umbral (h) | 4 x σ_baseline | Cuando disparar alarma |
| Slack (k) | σ_baseline / 2 | Filtro de ruido |

Se corre sobre la serie diaria de Δ(tratamiento - testigo) para h10 y τ10.

### 6.4 Random Forest (prediccion microbioma)

| Aspecto | Detalle |
|---------|---------|
| Features (14) | h10/h20/h30/t20/ec30 momento + h10/h20/t20/ec30 avg 7d + dh10_dt + h10xt20 + cv_h10 + tau_10_ultimo + dias_ultimo_mojado |
| Targets (5) | 16S_universal, AMF, trichoderma, phytophthora, respiracion |
| Modelo | RandomForestRegressor(n_estimators=100, max_depth=10) |
| Validacion | 5-Fold Cross-Validation (shuffle, random_state=42) |
| Imputacion | SimpleImputer(strategy="median") para NaN |

### 6.5 LLM Consultor (Claude Sonnet)

| Prompt | Trigger | Output |
|--------|---------|--------|
| phytophthora.txt | Score > 50 o manual | DIAGNOSTICO + 2 RECOMENDACIONES + REFERENCIA |
| firma_hidrica.txt | Cambio en τ | Interpretacion fisica + recomendaciones |
| bioinsumos.txt | Evaluacion de timing | CONDICIONES + VENTANA OPTIMA + DOSIS |
| reporte_semanal.txt | Lunes automatico | Resumen ejecutivo 300 palabras |
| diagnostico_visual.txt | Foto de hoja | Cruce visual + sensores → diagnostico integrado |
| reporte_agricultor.txt | Bajo demanda | Mensaje WhatsApp 5 oraciones sin tecnicismos |

El **Consultor** (chat interactivo) inyecta datos reales de la seccion seleccionada como contexto y permite preguntas libres.

---

## 7. RESULTADOS OBTENIDOS (datos sinteticos)

### 7.1 Firma hidrica
- **654 firmas** calculadas exitosamente (0 fallos) para 8 nodos
- Nodo 3 (sobrerriego): 117 firmas vs ~75 en nodos normales
- τ10 promedio: 28-33 horas, consistente con andisoles volcanicos
- Velocidad infiltracion: ~0.0024 m/min

### 7.2 CUSUM
- **Bloque 2** (Nodo 3 vs Nodo 4): divergencia masiva detectada
  - S+ maximo: 204 (umbral: 19) — 10x por encima del umbral
  - 12 alarmas desde febrero 2026
  - Consistente con escenario de sobrerriego del nodo 3
- Otros bloques: divergencias menores (1-11 alarmas)

### 7.3 Machine Learning
| Target | R2 (5-Fold CV) | MAE |
|--------|----------------|-----|
| 16S_universal | 0.336 | 981,680 copias/g |
| AMF | 0.383 | 8,815 copias/g |
| trichoderma | 0.344 | 5,290 copias/g |
| phytophthora | 0.238 | 2,403 copias/g |
| respiracion | 0.173 | 3.19 mg CO2 |

Feature dominante: `tau_10_ultimo` (35-52% importancia), validando que la dinamica hidrica del suelo predice la biologia del microbioma.

> **Nota:** R2 de 0.17-0.38 con datos sinteticos y CV estricto. Con datos reales y mas muestras (>50 pares), se espera R2 > 0.5.

### 7.4 LLM Diagnosticos
Ejemplo real de diagnostico generado por Claude para Nodo 3:

> **DIAGNOSTICO:** Situacion estabilizada post-tratamiento. VWC 10cm (33.76%) dentro del rango optimo para andisoles. El ratio Trichoderma:Phytophthora de 6.3:1 indica supresividad biologica funcional.
>
> **RECOMENDACION 1:** Mantener regimen hidrico actual. Si t20 supera 24C, reducir frecuencia de riego 15-20%.
>
> **RECOMENDACION 2:** Aplicacion foliar de fosfitos (K2HPO3) a 2.5-3.0 mL/L en las proximas 72h.
>
> **REFERENCIA:** Hardham, A.R. (2005). "Phytophthora cinnamomi." Molecular Plant Pathology 6(6):589-604.

---

## 8. PRESUPUESTO

Detalle completo en `docs/Presupuesto_Piloto_Nextipac.xlsx`.

| Concepto | Opcion completa (8 nodos, 18 meses) | Opcion economica (4 nodos) |
|----------|--------------------------------------|---------------------------|
| Hardware | $21,520 MXN | $13,760 MXN |
| Infraestructura | $4,050 MXN | $4,050 MXN |
| Lab molecular | $372,960 MXN | $155,520 MXN |
| Lab fisicoquimico | $83,600 MXN | $31,800 MXN |
| **TOTAL** | **$482,130 MXN ($24,107 USD)** | **$205,130 MXN ($10,257 USD)** |

**Costos de operacion mensual (produccion):** ~$225 MXN/mes (~$11 USD) — VPS + SIM + SSL + API LLM.

---

## 9. ROADMAP

### Completado (22-30 marzo 2026)
- Sistema completo de backend: 10 modulos Python, 36 endpoints, 8 tablas con indices y FK
- Dashboard React dark premium: 14 vistas funcionales + 5 placeholders + landing page
- Autenticacion JWT con 4 usuarios, 3 roles, rate limiting, expiracion 2h
- Sidebar colapsable con icon rail + menu de perfil con configuracion
- Sistema de alertas interactivo: desglose visual, explicame, timeline, sparklines, destacar/borrar
- 11 alertas realistas con contexto narrativo y datos de campo
- Consultor con chat por seccion
- Gestion de predios unificada (editar + posicionar nodos + crear nuevo)
- Exportacion CSV de lecturas, alertas y firma hidrica
- Configuracion personalizable de umbrales de alerta
- CRUD de predios con coordenadas editables
- Firmware ESP32 con retry LoRa (3 intentos, backoff exponencial)
- Deploy en Railway con auto-deploy desde GitHub
- PWA instalable (manifest.json + service worker)
- Landing page publica con hero, features, stats, modelo de negocio
- Error boundaries + lazy loading (code splitting)
- Modulo compartido de DB (db.py)
- Migration SQL con indices y foreign keys
- Dependencias pineadas en requirements.txt
- Seguridad: CORS configurable, SQL column validation, response validation

### Pendiente — Dashboard
- Gestion de agronomos (agregar, quitar, asignar a predios)
- Gestion de usuarios (accesos, roles)
- Historial de actividad (quien hizo que y cuando)
- Contabilidad y Finanzas (tracking de costos operativos)
- Tema claro (toggle, actualmente solo dark)

### Pendiente — Pipeline WhatsApp (cuando se tenga numero)
- Cronjob que corra alertas.py cada hora
- Si score > umbral: generar diagnostico con Claude automaticamente
- Enviar mensaje por WhatsApp (Twilio/Meta Business API) al agricultor y agronomo
- Reporte semanal automatico los lunes

### Inmediato — Hardware (con financiamiento, junio 2026)
1. Comprar hardware: 8 TTGO T-Beam + sensores + gateway RAK ($21,520 MXN)
2. Flashear firmware (ya escrito) y desplegar nodos en Nextipac
3. Configurar gateway con SIM 4G → MQTT → PostgreSQL
4. Implementar ingesta.py para datos reales por MQTT
5. Primer muestreo de laboratorio (qPCR) y calibracion de sensores

### Corto plazo (meses 1-6 del piloto)
6. Acumular 50+ pares sensor-microbioma para reentrenar Random Forest con datos reales
7. Migrar de Railway a VPS propio con Docker ($6 USD/mes vs $25-35)
8. Pipeline automatico: alertas → diagnostico Claude → notificacion WhatsApp/email/dashboard
9. Correr alertas.py como cronjob contra datos reales
10. Dominio propio + correo con dominio

### Mediano plazo (meses 6-18)
11. Modelo RF real con R2 > 0.5
12. Segundo predio piloto para validar el modelo en otro tipo de suelo
13. Reporte automatico semanal por WhatsApp
14. Aviso de privacidad / Terms of service

### Funcionalidades disenadas pero no implementadas
- Diagnostico visual (foto de hoja → Claude Vision + datos de sensores)
- Calculo de huella hidrica (litros agua / kg aguacate)
- Automatizacion de riego (requiere infraestructura de electrovalvulas)

---

## 10. EQUIPO

| Persona | Rol | Responsabilidad |
|---------|-----|-----------------|
| Ernest Darell Plascencia | Co-fundador, ingenieria | Desarrollo de software, IA, datos, deploy, administrador del sistema |
| Salvador Jayat | Co-fundador, agronomia de campo | Relacion con productores, muestreo, aplicacion de bioinsumos, interpretacion agronomica |
| CUCBA (UdeG) | Laboratorio | Analisis molecular (qPCR, 16S, ITS), analisis fisicoquimico de suelo |

---

## 11. METRICAS DEL PROYECTO

| Metrica | Valor |
|---------|-------|
| Lineas de codigo (Python) | ~4,220 |
| Lineas de codigo (React/JS/CSS) | ~6,600 |
| Lineas de codigo (C++ firmware) | ~540 |
| Lineas de codigo (SQL migrations) | ~84 |
| **Total lineas de codigo** | **~11,450** |
| Archivos de codigo | 45 |
| Endpoints API | 36 |
| Vistas dashboard | 14 funcionales + 5 placeholders + landing |
| Componentes base | 5 |
| Tablas PostgreSQL | 8 |
| Registros en DB | 420,000+ |
| Alertas en produccion | 11 |
| Usuarios del sistema | 4 (3 roles) |
| Commits en GitHub | 71+ |
| Costo de desarrollo | $0 (herramientas gratuitas + Claude Code) |
| Costo operativo mensual | ~$11 USD |

---

## 12. DOCUMENTOS COMPLEMENTARIOS

| Documento | Archivo |
|-----------|---------|
| Analisis competitivo (8 plataformas) | `docs/Analisis_Competitivo_AGTECH_v1_0.md` |
| Arquitectura de software detallada | `docs/Arquitectura_Software_3Pilares.md` |
| Guia tecnica de laboratorio | `docs/Analisis_Laboratorio_Guia_Tecnica.md.pdf` |
| Proyeccion financiera y mercado | `docs/Analisis_Mercado_Proyeccion_Financiera.md.pdf` |
| Presupuesto del piloto | `docs/Presupuesto_Piloto_Nextipac.xlsx` |
| Roadmap detallado | `docs/Roadmap_Lo_Que_Falta.md` |

---

## 13. REPOSITORIO Y ACCESO

| Recurso | URL |
|---------|-----|
| Landing page (publica) | https://agtech-sistema-production.up.railway.app/ |
| Dashboard (requiere login) | https://agtech-sistema-production.up.railway.app/ (login) |
| API docs (Swagger) | https://agtech-sistema-production.up.railway.app/docs |
| Repositorio GitHub | github.com/Jefemaestro33/agtech-sistema (privado) |

---

*Documento actualizado el 30 de marzo de 2026.*
*AgTech v1.2 — Plataforma completa con landing page, autenticacion, PWA, export CSV, alertas realistas, y seguridad reforzada.*
*Pendiente: hardware en campo, datos reales, y pipeline WhatsApp (financiamiento UP, junio 2026).*
