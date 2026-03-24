# MEMORIA TÉCNICA — PROYECTO AGTECH

## Sistema de Monitoreo IoT + IA para Aguacate Hass

**Versión 1.1** — 23 de marzo de 2026
Guadalajara, Jalisco

---

## 1. RESUMEN EJECUTIVO

AgTech es un sistema de agricultura inteligente que combina sensores IoT enterrados en el suelo, datos climáticos en tiempo real, machine learning, y un agente de IA (Claude) para optimizar riego, prevenir Phytophthora cinnamomi y monitorear el microbioma del suelo en huertas de aguacate Hass en Nextipac, Jalisco.

El sistema resuelve un problema concreto: los productores de aguacate pierden entre 15-30% de su producción anual por Phytophthora cinnamomi, un oomiceto que pudre las raíces cuando el suelo está saturado de agua. La detección convencional (visual) llega tarde — cuando los síntomas aparecen en las hojas, el árbol ya tiene daño radicular severo. AgTech detecta las condiciones de riesgo en el suelo antes de que la planta manifieste síntomas, permitiendo intervención preventiva.

**Diferenciadores vs competencia (CropX, SupPlant, NXTAgro):**
- Datos pareados sensor-microbioma (qPCR + IoT) — nadie más los tiene
- Especialización vertical en aguacate Hass en andisoles volcánicos
- Modelo de riesgo compartido: 30% del incremento de producción, $0 upfront
- Agrónomo en campo (Salvador) que traduce datos en acciones — no vendemos cajas
- Stack de IA completo: sensores → firma hídrica → CUSUM → ML → LLM con diagnósticos

**Estado actual:** Sistema completo funcionando en producción con datos sintéticos (416K registros) + 6 alertas de ejemplo. Deploy público en Railway. Dashboard dark premium accesible desde cualquier dispositivo con sidebar colapsable, 10 vistas funcionales + 6 placeholders, consultor IA interactivo, sistema de alertas con desglose visual y diagnósticos Claude, y CRUD completo de predios. Pendiente: hardware en campo y datos reales (estimado junio 2026 con financiamiento UP).

### Modelo de negocio

- **Cobro:** 30% del incremento de producción atribuible al sistema, medido contra parcela testigo
- **Piloto:** 4 hectáreas en Nextipac con 8 nodos (4 tratamiento + 4 testigo)
- **Pipeline:** 10 agricultores con 500+ hectáreas comprometidas para fase de validación
- **Financiamiento:** Fondo de inversión Universidad Panamericana, estimado junio 2026

---

## 2. ESTADO ACTUAL — Lo que está construido y funcionando (23 marzo 2026)

### 2.1 Backend Python (7 módulos, ~3,500 líneas)

| Módulo | Líneas | Función | Estado |
|--------|--------|---------|--------|
| `api.py` | ~750 | FastAPI con 26 endpoints REST (incluyendo CRUD de predios), CORS, sirve dashboard estático | ✓ Producción |
| `alertas.py` | ~690 | Score Phytophthora v2 (7 factores), alerta riego/offline/batería, `generar_resumen_nodo()` | ✓ Producción |
| `clima.py` | ~310 | Open-Meteo API → ETo Penman-Monteith, backfill histórico, modo daemon | ✓ Producción |
| `llm_consultor.py` | ~470 | Claude Sonnet API con httpx, 6 prompts especializados, diagnósticos + reportes | ✓ Producción |
| `firma_hidrica.py` | ~320 | Detección de eventos de mojado, curve_fit τ, velocidad infiltración, breaking point | ✓ Producción |
| `comparativo.py` | ~280 | CUSUM tratamiento vs testigo, medias diarias, análisis por bloque | ✓ Producción |
| `modelo_microbioma.py` | ~350 | Random Forest (14 features → 5 targets), LOO-CV, predicción on-demand | ✓ Producción |

### 2.2 Dashboard React (10 vistas funcionales + 6 placeholders, 4 componentes base, ~3,409 líneas JSX/JS/CSS)

| Vista | Ruta | Contenido | Estado |
|-------|------|-----------|--------|
| Predio | `/predio` | Info del predio editable (inline edit + confirm modal) + selector de predio + agrónomos asignados + notas (localStorage) + estado del sistema | ✓ Funcional |
| Overview | `/` | 4 KPIs + mapa Leaflet satelital (Esri) con 8 nodos coloreados por score + tabla clickeable con colores semánticos | ✓ Funcional |
| Nodo detalle | `/nodo/:id` | 6 métricas + 3 gráficas Recharts (humedad 3 prof. con gradientes SVG, temp+EC, h10 7d) + desglose score | ✓ Funcional |
| Firma hídrica | `/firma` | 3 KPIs + gráfica evolución τ10 por nodo (trat vs testigo, sólidas vs punteadas) + tabla historial 654 firmas | ✓ Funcional |
| Comparativo | `/comparativo` | Selector período (7/14/30/90/180d) + LineChart trat vs testigo por bloque + CUSUM (S+/S-) + badge divergencia | ✓ Funcional |
| Clima | `/clima` | 4 KPIs datos reales Nextipac (Open-Meteo) + barras precipitación + línea temp + área ETo con gradiente | ✓ Funcional |
| Alertas | `/alertas` | 3 sub-rutas (todas/destacadas/borradas). Alertas colapsables con: desglose visual del score (barras por factor), botón "Explícame esta alerta" (lógica paso a paso con semáforo), timeline del evento, sparkline h10 últimas 48h, diagnóstico IA (Claude Sonnet), reporte para agricultor, enviar a agrónomos asignados (clipboard), destacar con razón (modal), mover a papelera/restaurar | ✓ Funcional |
| Consultor | `/consultor` | Chat interactivo con IA. Selector de sección (Overview/Nodo/Firma/Comparativo/Clima) como botones toggle. Inyecta datos reales del predio como contexto. Historial de mensajes con bubbles (usuario/IA). Botón limpiar chat | ✓ Funcional |
| Nuevo predio | `/nuevo-predio` | Formulario completo con 8 campos (nombre, cultivo, tipo suelo, hectáreas, ubicación, fecha instalación, lat, lon), validación inline, POST al backend, banner de éxito/error, botón "Ir al predio" | ✓ Funcional |
| Placeholders | varias | Vista con badge "Próximamente" para: Agrónomos, Usuarios, Historial, Exportar datos, Contabilidad, Finanzas | Placeholder |

**Componentes base (4):**
- `KpiCard` — trend indicator opcional, Lucide icons o emojis, glow backgrounds por color, hover lift
- `ScoreBadge` — Shield icons por nivel (ShieldCheck/Shield/ShieldAlert/ShieldX), pulse animation en CRÍTICO
- `Loading` — Skeleton loaders dark-themed (KPIs + chart + tabla)
- `EmptyState` — Contenedor dark con icono centrado (Lucide o string) + título + descripción

**Layout:**
- Sidebar colapsable (220px expandido → 60px icon rail) con toggle ChevronsLeft/Right
- Sidebar y header fijos al viewport (position: fixed), independientes del scroll del contenido principal
- Main content con margin-top (48px header) y margin-left dinámico según estado del sidebar
- Sección "Administrador" separada visualmente en sidebar con divider + título uppercase (Nuevo predio, Agrónomos, Usuarios, Historial, Exportar, Contabilidad, Finanzas)
- Header fijo 48px con logo AgTech (Leaf icon + texto) + campana de notificaciones con badge contador
- Perfil de usuario al fondo del sidebar (mt-auto) con botón que despliega menú hacia arriba
- Menú desplegable de perfil con secciones: Configuración (alertas, notificaciones, integraciones, respaldos), Preferencias (tema oscuro/claro, documentación), Cerrar sesión
- Sub-menú desplegable en Alertas: Todas, Destacadas (★), Borradas (papelera)
- Mobile: botón hamburger/X en header, sidebar como drawer con overlay oscuro

**Sistema de diseño (dark premium theme):**
- 25+ CSS custom properties en `index.css` organizadas por categoría:
  - Surfaces: `--color-surface-0` (fondo más oscuro #0a0c10) hasta `--color-surface-4` (#262b3a)
  - Borders: `--color-border` (#2a2f40), `--color-border-light` (#353b50)
  - Texto: `--color-text-primary` (#f0f2f5), `--color-text-secondary` (#9ca3b4), `--color-text-muted` (#5c6378)
  - Acentos: green (#10b981), amber (#f59e0b), red (#ef4444), cyan (#22d3ee), blue (#3b82f6), violet (#8b5cf6)
  - Dims (backgrounds oscuros): green-dim (#065f46), amber-dim (#78350f), red-dim (#7f1d1d), etc.
  - Glows (backgrounds sutiles semi-transparentes): glow-green (rgba 12%), glow-red, glow-amber, glow-cyan
- Tipografía: Plus Jakarta Sans (UI) + JetBrains Mono (datos numéricos, font-mono) vía Google Fonts
- Iconografía: Lucide React v0.577 — todos los emojis originales reemplazados por íconos SVG
- Animaciones: staggered fade-in (`animate-in` + `stagger-1` a `stagger-6`), card-glow hover (translateY + box-shadow), pulse-critical (2.5s ease-in-out infinite para alertas Phytophthora)
- Custom dark tooltips en todas las gráficas Recharts con componente CustomTooltip reutilizable
- SVG `<linearGradient>` en todos los area charts (humedad, ETo, sparklines)
- Colores semánticos consistentes: cyan = humedad, amber = temperatura, naranja = EC, verde = tratamiento/positivo, gris = testigo, rojo = alerta/peligro, violet = tiempo
- Leaflet dark mode overrides en CSS global: popups, tip, controles zoom, background del contenedor
- Recharts dark overrides: tooltip background, grid lines, axis text con CSS global

### 2.3 Base de datos PostgreSQL (Railway)

| Tabla | Registros | Contenido |
|-------|-----------|-----------|
| lecturas | 416,592 | Datos de sensores cada 5 min, 8 nodos, 6 meses (ene-jun 2026) — sintéticos |
| firma_hidrica | 654 | Firma hídrica calculada por evento de riego (τ, vel, BP) |
| microbioma | 560 | qPCR quincenal pareado con sensores (5 targets × 8 nodos × 14 fechas) |
| clima | 2,160 | Datos meteorológicos reales de Nextipac (dic 2025 - mar 2026, Open-Meteo) |
| nodos | 8 | Metadata: 4 bloques, 4 tratamiento + 4 testigo |
| tratamientos | 24 | Aplicaciones de micorriza y Trichoderma simuladas |
| predios | 1+ | Nextipac Piloto, 4 ha, andisol volcánico (editable, con columnas municipio + fecha_instalacion) |
| eventos | 6 | Alertas de ejemplo: 2 Phytophthora (CRÍTICO + ALTO), 2 riego, 1 offline, 1 batería |

### 2.4 Inteligencia Artificial

**Claude Sonnet (Anthropic API):**
- 6 prompts especializados en `backend/prompts/`: phytophthora, firma_hidrica, bioinsumos, reporte_semanal, diagnostico_visual, reporte_agricultor
- Diagnósticos con formato: DIAGNÓSTICO → RECOMENDACIÓN 1 → RECOMENDACIÓN 2 → REFERENCIA
- Integrado en 2 vistas del dashboard:
  - Alertas: genera diagnósticos por alerta individual (POST `/api/alertas/{id}/diagnostico`)
  - Consultor: chat interactivo con contexto automático de la sección seleccionada
- Retry 3× con backoff exponencial, fallback si API no responde
- Costo estimado: ~$0.45 USD/mes (60 consultas × ~500 tokens)

**Random Forest (scikit-learn):**
- 14 features: snapshot (5) + ventana 7d (7) + firma hídrica (2)
- 5 targets: 16S_universal, AMF, trichoderma, phytophthora, respiracion
- Leave-One-Out CV sobre 112 muestras por target
- Feature dominante: `tau_10_ultimo` (35-52% importancia)

### 2.5 Firmware ESP32 (521 líneas C++)

| Archivo | Líneas | Función |
|---------|--------|---------|
| `config.h` | 90 | Pines TTGO T-Beam, LoRa 915MHz, calibración, OTA |
| `ota.h` | 105 | Actualización WiFi con reed switch magnético |
| `nodo_sensor.ino` | 326 | Flujo: 15 lecturas/5min → paquete binario 23 bytes → LoRa TX → deep sleep |

Listo para flashear cuando llegue el hardware. Solo cambiar `NODO_ID` por nodo.

### 2.6 Infraestructura

| Servicio | Estado | URL/Detalle |
|----------|--------|-------------|
| Railway PostgreSQL | ✓ Producción | 8 tablas, 420K+ registros |
| Railway App (API + Dashboard) | ✓ Producción | https://agtech-sistema-production.up.railway.app/ |
| GitHub repo | ✓ Privado | Jefemaestro33/agtech-sistema, auto-deploy en cada push |
| Dockerfile | ✓ Multi-stage | Node 20 (build React) + Python 3.13 (serve FastAPI) |

---

## 3. ARQUITECTURA TÉCNICA

```
CAMPO (futuro)                    NUBE (Railway, actual)
──────────────                    ─────────────────────

ESP32/TTGO ──LoRa──→ Gateway RAK
  (nodo)              con 4G/LTE
                         │
                     internet 4G
                         │
                         └──MQTT──→ [futuro] Mosquitto
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │         PostgreSQL (Railway)         │
                    │  lecturas │ nodos │ microbioma       │
                    │  clima │ firma_hidrica │ eventos     │
                    │  tratamientos │ predios              │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
     ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
     │  alertas.py  │    │  clima.py    │    │ firma_hidrica│
     │  Score Phyto │    │  Open-Meteo  │    │ τ, vel, BP   │
     │  v2 (0-100)  │    │  + ETo FAO   │    │              │
     └──────┬──────┘    └──────────────┘    └──────────────┘
            │
            ├──→ comparativo.py (CUSUM por bloque)
            │
            ├──→ modelo_microbioma.py (Random Forest)
            │
            └──→ llm_consultor.py ──API──→ Claude Sonnet
                        │                  (6 prompts)
                        ▼
              ┌──────────────────┐
              │   api.py         │
              │   FastAPI        │
              │   26 endpoints   │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────────────────┐
              │   Dashboard React + Vite     │
              │   10 vistas + 6 placeholders │
              │   Sidebar colapsable         │
              │   Dark premium theme         │
              │   Mapa Leaflet + Recharts    │
              │   Consultor IA (chat)        │
              └──────────────────────────────┘
                       │
                       ▼
              Agrónomos asignados (Salvador)
              + Agricultor (vía WhatsApp)
```

---

## 4. STACK TECNOLÓGICO

| Capa | Tecnología | Versión |
|------|------------|---------|
| Base de datos | PostgreSQL | 15 (Railway) |
| Backend API | Python + FastAPI | 3.13 / 0.135 |
| Motor alertas | Python (psycopg2) | — |
| Clima | Open-Meteo API + httpx | Gratuita |
| ML | scikit-learn (Random Forest) | 1.8 |
| Ajuste curvas | scipy (curve_fit) | 1.17 |
| Cálculos | numpy + pandas | 2.4 / 3.0 |
| IA generativa | Claude Sonnet 4.5 (Anthropic) | httpx directo |
| Dashboard | React + Vite | 19 / 8 |
| Estilos | Tailwind CSS | 4 |
| Gráficas | Recharts | 2 |
| Mapa | react-leaflet + Leaflet | 5 / 1.9 |
| Tiles | Esri World Imagery + OpenStreetMap | — |
| Iconos | lucide-react | 0.577 |
| Fonts | Plus Jakarta Sans + JetBrains Mono | Google Fonts |
| Firmware | C++ (Arduino / ESP32) | — |
| Hardware | TTGO T-Beam v1.1 (ESP32 + SX1276) | — |
| Radio | LoRa 915 MHz | SF7, BW125k |
| Deploy | Railway (Dockerfile multi-stage) | — |
| Repo | GitHub (privado, auto-deploy) | — |

---

## 5. ENDPOINTS API (26 total)

| # | Método | Endpoint | Función |
|---|--------|----------|---------|
| 1 | GET | `/api/predios` | Lista de predios |
| 2 | POST | `/api/predios` | Crear nuevo predio (nombre, cultivo, tipo_suelo, hectareas, municipio, fecha_instalacion, lat, lon) |
| 3 | PUT | `/api/predios/{id}` | Actualizar campos del predio (nombre, cultivo, tipo_suelo, hectareas, municipio, fecha_instalacion) |
| 4 | GET | `/api/predios/{id}/overview` | 4 KPIs + 8 nodos con score |
| 5 | GET | `/api/predios/{id}/nodos` | Nodos con status, score, batería |
| 6 | GET | `/api/predios/{id}/firma` | Firmas hídricas de todos los nodos |
| 7 | GET | `/api/predios/{id}/comparativo` | Media diaria trat vs testigo + CUSUM |
| 8 | POST | `/api/predios/{id}/cusum` | Análisis CUSUM detallado |
| 9 | GET | `/api/predios/{id}/alertas` | Eventos/alertas recientes |
| 10 | GET | `/api/nodos/{id}` | Detalle completo: score desglosado, tendencia, clima, microbioma |
| 11 | GET | `/api/nodos/{id}/lecturas` | Serie de tiempo (5min, 1h, 1d) |
| 12 | GET | `/api/nodos/{id}/firma` | Últimas 20 firmas de un nodo |
| 13 | GET | `/api/nodos/{id}/alertas` | Alertas de un nodo |
| 14 | GET | `/api/clima/actual` | Última lectura + ETo del día |
| 15 | GET | `/api/clima/historico` | Serie clima (configurable días) |
| 16 | GET | `/api/clima/pronostico` | Próximos 7 días |
| 17 | GET | `/api/microbioma/nodo/{id}` | Últimos registros de lab |
| 18 | GET | `/api/microbioma/modelo` | Métricas del modelo ML (R², MAE, features) |
| 19 | POST | `/api/microbioma/predecir/{id}` | Predicción ML del microbioma |
| 20 | POST | `/api/alertas/{id}/diagnostico` | Genera diagnóstico IA con Claude |
| 21 | POST | `/api/reportes/semanal` | Reporte técnico semanal |
| 22 | POST | `/api/reportes/agricultor` | Reporte WhatsApp para agricultor |
| 23 | POST | `/api/diagnostico/visual` | Foto + sensores → Claude Vision |
| 24 | POST | `/api/tratamientos` | Registrar aplicación de bioinsumo |
| 25 | POST | `/api/microbioma` | Registrar qPCR con snapshot sensores |
| 26 | GET | `/api/health` | Status del sistema |

Documentación Swagger automática en `/docs`.

---

## 6. MODELOS Y ALGORITMOS

### 6.1 Score Phytophthora v2 (0-100)

Basado en literatura: P. cinnamomi necesita suelo húmedo + temperatura 15-28°C para esporular. La v2 cruza datos de suelo con clima para ser predictivo.

| Factor | Condición | Puntos |
|--------|-----------|--------|
| Humedad 10cm | >45% VWC | +15 |
| Humedad 10cm | >40% VWC | +8 |
| Humedad 20cm | >45% VWC | +15 |
| Humedad 20cm | >40% VWC | +8 |
| Temperatura suelo | 22-28°C (rango óptimo) | +20 |
| Temperatura suelo | 15-22°C | +10 |
| Horas húmedo continuas | >72h | +15 |
| Horas húmedo continuas | >48h | +10 |
| Horas húmedo continuas | >24h | +5 |
| Precipitación acumulada 7d | >50mm | +10 |
| Precipitación acumulada 7d | >25mm | +5 |
| Pronóstico lluvia 48h | >20mm | +5 |
| HR ambiente promedio 48h | >80% | +5 |

Clasificación: 0-25 BAJO, 26-50 MODERADO, 51-75 ALTO, 76-100 CRÍTICO.

El dashboard muestra este score de 3 formas interactivas:
1. **Desglose visual** — barras horizontales por factor con color semántico (rojo/ámbar/verde) y puntos aportados
2. **"Explícame esta alerta"** — explicación paso a paso en lenguaje natural con semáforo por factor y razonamiento causal
3. **Timeline** — cronología del evento mostrando cómo se acumularon las condiciones de riesgo

### 6.2 Firma hídrica

Se calcula automáticamente para cada evento de mojado detectado (Δh10 > 3% VWC en 5 minutos):

| Métrica | Cálculo | Significado |
|---------|---------|-------------|
| vel_10_20 | 0.10m / (t_arribo_20 - t_arribo_10) | Velocidad del frente de mojado — macroporosidad |
| vel_20_30 | 0.10m / (t_arribo_30 - t_arribo_20) | Infiltración profunda |
| τ_10, τ_20, τ_30 | curve_fit exponencial (scipy) | Constante de secado — estructura del suelo |
| breaking_point | Cambio de signo en d²h/dt² | Punto óptimo de riego |
| delta_h_max | max(h10 - h30) durante evento | Gradiente vertical — retención |

### 6.3 CUSUM (detección de divergencia)

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| Baseline | Primeros 28 días | Media y σ de referencia |
| Umbral (h) | 4 × σ_baseline | Cuándo disparar alarma |
| Slack (k) | σ_baseline / 2 | Filtro de ruido |

Se corre sobre la serie diaria de Δ(tratamiento - testigo) para h10 y τ10.

### 6.4 Random Forest (predicción microbioma)

| Aspecto | Detalle |
|---------|---------|
| Features (14) | h10/h20/h30/t20/ec30 momento + h10/h20/t20/ec30 avg 7d + dh10_dt + h10×t20 + cv_h10 + tau_10_ultimo + dias_ultimo_mojado |
| Targets (5) | 16S_universal, AMF, trichoderma, phytophthora, respiracion |
| Modelo | RandomForestRegressor(n_estimators=100, max_depth=10) |
| Validación | Leave-One-Out (112 muestras por target) |
| Imputación | SimpleImputer(strategy="median") para NaN |

### 6.5 LLM Consultor (Claude Sonnet)

| Prompt | Trigger | Output |
|--------|---------|--------|
| phytophthora.txt | Score > 50 o manual | DIAGNÓSTICO + 2 RECOMENDACIONES + REFERENCIA |
| firma_hidrica.txt | Cambio en τ | Interpretación física + recomendaciones |
| bioinsumos.txt | Evaluación de timing | CONDICIONES + VENTANA ÓPTIMA + DOSIS |
| reporte_semanal.txt | Lunes automático | Resumen ejecutivo 300 palabras |
| diagnostico_visual.txt | Foto de hoja | Cruce visual + sensores → diagnóstico integrado |
| reporte_agricultor.txt | Bajo demanda | Mensaje WhatsApp 5 oraciones sin tecnicismos |

Adicionalmente, el **Consultor IA** (chat interactivo) inyecta datos reales de la sección seleccionada como contexto y permite preguntas libres.

---

## 7. RESULTADOS OBTENIDOS (datos sintéticos)

### 7.1 Firma hídrica
- **654 firmas** calculadas exitosamente (0 fallos) para 8 nodos
- Nodo 3 (sobrerriego): 117 firmas vs ~75 en nodos normales
- τ10 promedio: 28-33 horas, consistente con andisoles volcánicos
- Velocidad infiltración: ~0.0024 m/min

### 7.2 CUSUM
- **Bloque 2** (Nodo 3 vs Nodo 4): divergencia masiva detectada
  - S+ máximo: 204 (umbral: 19) — 10× por encima del umbral
  - 12 alarmas desde febrero 2026
  - Consistente con escenario de sobrerriego del nodo 3
- Otros bloques: divergencias menores (1-11 alarmas)

### 7.3 Machine Learning
| Target | R² (LOO-CV) | MAE |
|--------|-------------|-----|
| 16S_universal | 0.336 | 981,680 copias/g |
| AMF | 0.383 | 8,815 copias/g |
| trichoderma | 0.344 | 5,290 copias/g |
| phytophthora | 0.238 | 2,403 copias/g |
| respiracion | 0.173 | 3.19 mg CO₂ |

Feature dominante: `tau_10_ultimo` (35-52% importancia), validando que la dinámica hídrica del suelo predice la biología del microbioma.

> **Nota:** R² de 0.17-0.38 con datos sintéticos y LOO-CV estricto. Con datos reales y más muestras (>50 pares), se espera R² > 0.5.

### 7.4 LLM Diagnósticos
Ejemplo real de diagnóstico generado por Claude para Nodo 3:

> **DIAGNÓSTICO:** Situación estabilizada post-tratamiento. VWC 10cm (33.76%) dentro del rango óptimo para andisoles. El ratio Trichoderma:Phytophthora de 6.3:1 indica supresividad biológica funcional.
>
> **RECOMENDACIÓN 1:** Mantener régimen hídrico actual. Si t20 supera 24°C, reducir frecuencia de riego 15-20%.
>
> **RECOMENDACIÓN 2:** Aplicación foliar de fosfitos (K₂HPO₃) a 2.5-3.0 mL/L en las próximas 72h.
>
> **REFERENCIA:** Hardham, A.R. (2005). "Phytophthora cinnamomi." Molecular Plant Pathology 6(6):589-604.

---

## 8. PRESUPUESTO

Detalle completo en `docs/Presupuesto_Piloto_Nextipac.xlsx`.

| Concepto | Opción completa (8 nodos, 18 meses) | Opción económica (4 nodos) |
|----------|--------------------------------------|---------------------------|
| Hardware | $21,520 MXN | $13,760 MXN |
| Infraestructura | $4,050 MXN | $4,050 MXN |
| Lab molecular | $372,960 MXN | $155,520 MXN |
| Lab fisicoquímico | $83,600 MXN | $31,800 MXN |
| **TOTAL** | **$482,130 MXN ($24,107 USD)** | **$205,130 MXN ($10,257 USD)** |

**Costos de operación mensual (producción):** ~$225 MXN/mes (~$11 USD) — VPS + SIM + SSL + API LLM.

---

## 9. ROADMAP

### ✅ Completado (22-23 marzo 2026)
- Sistema completo de backend: 7 módulos Python, 26 endpoints, 8 tablas
- Dashboard React dark premium: 10 vistas funcionales + 6 placeholders
- Sidebar colapsable con icon rail + menú de perfil
- Sistema de alertas interactivo: desglose visual, explícame, timeline, sparklines, destacar/borrar
- Consultor IA con chat por sección
- CRUD de predios (crear, editar, notas)
- Firmware ESP32 listo para flashear
- Deploy en Railway con auto-deploy desde GitHub

### 🔧 Próximo — Dashboard (secciones placeholder por construir)
- Gestión de agrónomos (agregar, quitar, asignar a predios)
- Gestión de usuarios (accesos, roles: admin/agrónomo/observador)
- Historial de actividad (quién hizo qué y cuándo)
- Exportar datos (CSV de lecturas/alertas, PDF de reportes)
- Contabilidad y Finanzas (tracking de costos operativos)
- Configuración de alertas (umbrales personalizables)
- Configuración de notificaciones (email, WhatsApp, canales)
- Integraciones (API Keys, webhooks, Telegram bot)
- Respaldos de base de datos
- Autenticación de usuarios (login, roles, permisos)
- Tema claro (toggle, actualmente solo dark)

### 🚀 Inmediato — Hardware (con financiamiento, junio 2026)
1. Comprar hardware: 8 TTGO T-Beam + sensores + gateway RAK ($21,520 MXN)
2. Flashear firmware (ya escrito) y desplegar nodos en Nextipac
3. Configurar gateway con SIM 4G → MQTT → PostgreSQL
4. Implementar ingesta.py para datos reales por MQTT
5. Primer muestreo de laboratorio (qPCR) y calibración de sensores

### 📊 Corto plazo (meses 1-6 del piloto)
6. Acumular 50+ pares sensor-microbioma para reentrenar Random Forest con datos reales
7. Migrar de Railway a VPS propio con Docker ($6 USD/mes vs $25-35)
8. Pipeline automático: alertas → diagnóstico Claude → notificación WhatsApp/email/dashboard
9. Correr alertas.py como cronjob contra datos reales

### 🌱 Mediano plazo (meses 6-18)
10. Modelo RF real con R² > 0.5
11. Landing page para demostrar a nuevos productores
12. Segundo predio piloto para validar el modelo en otro tipo de suelo
13. Reporte automático semanal por WhatsApp

### 💡 Funcionalidades diseñadas pero no implementadas
- Diagnóstico visual (foto de hoja → Claude Vision + datos de sensores)
- Cálculo de huella hídrica (litros agua / kg aguacate)
- Automatización de riego (requiere infraestructura de electroválvulas)

---

## 10. EQUIPO

| Persona | Rol | Responsabilidad |
|---------|-----|-----------------|
| Ernest Darell Plascencia | Co-fundador, ingeniería | Desarrollo de software, IA, datos, deploy, administrador del sistema |
| Salvador Jayat | Co-fundador, agronomía de campo | Relación con productores, muestreo, aplicación de bioinsumos, interpretación agronómica |
| CUCBA (UdeG) | Laboratorio | Análisis molecular (qPCR, 16S, ITS), análisis fisicoquímico de suelo |

---

## 11. MÉTRICAS DEL PROYECTO

| Métrica | Valor |
|---------|-------|
| Líneas de código | ~9,915 |
| Archivos de código | ~35 |
| Endpoints API | 26 |
| Vistas dashboard | 10 funcionales + 6 placeholders |
| Tablas PostgreSQL | 8 |
| Registros en DB | 420,000+ |
| Commits en GitHub | 31+ |
| Tiempo de desarrollo | 2 días (22-23 marzo 2026) |
| Costo de desarrollo | $0 (herramientas gratuitas + Claude Code) |
| Costo operativo mensual | ~$11 USD |

---

## 12. DOCUMENTOS COMPLEMENTARIOS

| Documento | Archivo |
|-----------|---------|
| Análisis competitivo (8 plataformas) | `docs/Analisis_Competitivo_AGTECH_v1_0.md` |
| Arquitectura de software detallada | `docs/Arquitectura_Software_3Pilares.md` |
| Guía técnica de laboratorio | `docs/Analisis_Laboratorio_Guia_Tecnica.md.pdf` |
| Proyección financiera y mercado | `docs/Analisis_Mercado_Proyeccion_Financiera.md.pdf` |
| Presupuesto del piloto | `docs/Presupuesto_Piloto_Nextipac.xlsx` |
| Guía de estilo frontend | `docs/FRONTEND_STYLE_GUIDE.md` |

---

## 13. REPOSITORIO Y ACCESO

| Recurso | URL |
|---------|-----|
| Dashboard (producción) | https://agtech-sistema-production.up.railway.app/ |
| Repositorio GitHub | github.com/Jefemaestro33/agtech-sistema (privado) |
| API docs (Swagger) | https://agtech-sistema-production.up.railway.app/docs |

---

*Documento actualizado el 23 de marzo de 2026.*
*AgTech v1.1 — Sistema completo con dashboard dark premium, alertas interactivas, consultor IA, y CRUD de predios.*
*Pendiente: hardware en campo y datos reales (financiamiento UP, junio 2026).*
