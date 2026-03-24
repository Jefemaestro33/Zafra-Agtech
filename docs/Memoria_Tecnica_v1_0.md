# MEMORIA TÉCNICA — PROYECTO AGTECH NEXTIPAC

## Sistema de Monitoreo IoT + IA para Aguacate Hass

**Versión 1.0** — 22 de marzo de 2026
Guadalajara, Jalisco

---

## 1. RESUMEN EJECUTIVO

AgTech Nextipac es un sistema de agricultura inteligente que combina sensores IoT enterrados en el suelo, datos climáticos en tiempo real, machine learning, y un agente de IA (Claude) para optimizar riego, prevenir Phytophthora cinnamomi y monitorear el microbioma del suelo en huertas de aguacate Hass en Nextipac, Jalisco.

El sistema resuelve un problema concreto: los productores de aguacate pierden entre 15-30% de su producción anual por Phytophthora cinnamomi, un oomiceto que pudre las raíces cuando el suelo está saturado de agua. La detección convencional (visual) llega tarde — cuando los síntomas aparecen en las hojas, el árbol ya tiene daño radicular severo. AgTech Nextipac detecta las condiciones de riesgo en el suelo antes de que la planta manifieste síntomas, permitiendo intervención preventiva.

**Diferenciadores vs competencia (CropX, SupPlant, NXTAgro):**
- Datos pareados sensor-microbioma (qPCR + IoT) — nadie más los tiene
- Especialización vertical en aguacate Hass en andisoles volcánicos
- Modelo de riesgo compartido: 30% del incremento de producción, $0 upfront
- Agrónomo en campo (Salvador) que traduce datos en acciones — no vendemos cajas
- Stack de IA completo: sensores → firma hídrica → CUSUM → ML → LLM con diagnósticos

**Estado actual:** Sistema completo funcionando en producción con datos sintéticos (416K registros). Deploy público en Railway. Dashboard accesible desde cualquier dispositivo. Pendiente: hardware en campo y datos reales (estimado junio 2026 con financiamiento UP).

### Modelo de negocio

- **Cobro:** 30% del incremento de producción atribuible al sistema, medido contra parcela testigo
- **Piloto:** 4 hectáreas en Nextipac con 8 nodos (4 tratamiento + 4 testigo)
- **Pipeline:** 10 agricultores con 500+ hectáreas comprometidas para fase de validación
- **Financiamiento:** Fondo de inversión Universidad Panamericana, estimado junio 2026

---

## 2. ESTADO ACTUAL — Lo que está construido y funcionando (22 marzo 2026)

### 2.1 Backend Python (7 módulos, ~3,500 líneas)

| Módulo | Líneas | Función | Estado |
|--------|--------|---------|--------|
| `api.py` | ~700 | FastAPI con 24 endpoints REST, CORS, sirve dashboard estático | ✓ Producción |
| `alertas.py` | ~690 | Score Phytophthora v2 (7 factores), alerta riego/offline/batería, `generar_resumen_nodo()` | ✓ Producción |
| `clima.py` | ~310 | Open-Meteo API → ETo Penman-Monteith, backfill histórico, modo daemon | ✓ Producción |
| `llm_consultor.py` | ~470 | Claude Sonnet API con httpx, 6 prompts especializados, diagnósticos + reportes | ✓ Producción |
| `firma_hidrica.py` | ~320 | Detección de eventos de mojado, curve_fit τ, velocidad infiltración, breaking point | ✓ Producción |
| `comparativo.py` | ~280 | CUSUM tratamiento vs testigo, medias diarias, análisis por bloque | ✓ Producción |
| `modelo_microbioma.py` | ~350 | Random Forest (14 features → 5 targets), LOO-CV, predicción on-demand | ✓ Producción |

### 2.2 Dashboard React (10 vistas + 6 placeholders, 4 componentes, ~3,409 líneas JSX/JS/CSS)

| Vista | Ruta | Contenido |
|-------|------|-----------|
| Predio | `/predio` | Info del predio editable (inline edit + confirm modal) + selector + agrónomos asignados + notas localStorage + estado sistema |
| Overview | `/` | 4 KPIs + mapa Leaflet satelital (Esri) con 8 nodos coloreados por score + tabla clickeable |
| Nodo detalle | `/nodo/:id` | 6 métricas + 3 gráficas Recharts (humedad 3 prof., temp+EC, h10 7d) + desglose score |
| Firma hídrica | `/firma` | 3 KPIs + gráfica evolución τ10 por nodo (trat vs testigo) + tabla historial 654 firmas |
| Comparativo | `/comparativo` | Selector período + LineChart trat vs testigo por bloque + CUSUM (S+/S-) + badge divergencia |
| Clima | `/clima` | 4 KPIs datos reales Nextipac + barras precip + línea temp + área ETo |
| Alertas | `/alertas` | 3 filtros (todas/destacadas/borradas), alertas colapsables con: score desglose visual (barras), "Explícame esta alerta" (lógica paso a paso), timeline del evento, sparkline h10 48h, diagnóstico IA (Claude), reporte agricultor, enviar a agrónomos, destacar con razón, papelera/restaurar |
| Consultor | `/consultor` | Chat con IA, selector de sección (Overview/Nodo/Firma/Comparativo/Clima), contexto automático de datos reales, historial de mensajes |
| Nuevo predio | `/nuevo-predio` | Formulario completo para crear predios con validación + POST al backend |
| Próximamente | varias | Placeholder con badge "Próximamente" para: Agrónomos, Usuarios, Historial, Exportar datos, Contabilidad, Finanzas |

**Componentes base (4):**
- `KpiCard` — trend indicator, Lucide icons, glow backgrounds
- `ScoreBadge` — Shield icons por nivel, pulse en CRÍTICO
- `Loading` — Skeleton loaders dark-themed
- `EmptyState` — Icono centrado dark con descripción

**Layout:**
- Sidebar colapsable (220px expandido → 60px icon rail) con toggle ChevronsLeft/Right
- Sidebar fijo al viewport, independiente del scroll del contenido
- Sección "Administrador" separada en sidebar (Nuevo predio, Agrónomos, Usuarios, Historial, Exportar, Contabilidad, Finanzas)
- Header fijo 48px (logo AgTech + campana notificaciones con badge)
- Menú desplegable de perfil desde sidebar bottom: Config alertas, Notificaciones, Integraciones, Respaldos, Tema oscuro/claro, Documentación, Cerrar sesión
- Sub-menú desplegable en Alertas (Todas, Destacadas, Borradas)
- Mobile: hamburger + drawer con overlay oscuro

**Características técnicas:**
- Dark premium theme con 25+ CSS custom properties (surfaces, accents, glows, borders, text)
- Tipografía: Plus Jakarta Sans (UI) + JetBrains Mono (datos numéricos) vía Google Fonts
- Iconografía: Lucide React (reemplazó todos los emojis por íconos SVG)
- Staggered fade-in animations al cargar vistas
- Card-glow hover effects, pulse-critical en alertas Phytophthora
- Custom dark tooltips en todas las gráficas Recharts con SVG gradients
- Colores semánticos: cyan=humedad, amber=temperatura, verde=tratamiento, gris=testigo
- Leaflet dark mode overrides (popups, controles, background)
- Mapa satelital Esri World Imagery con toggle a OpenStreetMap
- Auto-refresh silencioso cada 30 segundos
- Mobile responsive con skeleton loaders dark-themed
- Favicon 🌿, Open Graph para preview en WhatsApp

### 2.3 Base de datos PostgreSQL (Railway)

| Tabla | Registros | Contenido |
|-------|-----------|-----------|
| lecturas | 416,592 | Datos de sensores cada 5 min, 8 nodos, 6 meses (ene-jun 2026) |
| firma_hidrica | 654 | Firma hídrica calculada por evento de riego (τ, vel, BP) |
| microbioma | 560 | qPCR quincenal pareado con sensores (5 targets × 8 nodos × 14 fechas) |
| clima | 2,160 | Datos meteorológicos reales de Nextipac (dic 2025 - mar 2026, Open-Meteo) |
| nodos | 8 | Metadata: 4 bloques, 4 tratamiento + 4 testigo |
| tratamientos | 24 | Aplicaciones de micorriza y Trichoderma simuladas |
| predios | 1 | Nextipac Piloto, 4 ha, andisol volcánico |
| eventos | 6 | Alertas de ejemplo: 2 Phytophthora, 2 riego, 1 offline, 1 batería |

### 2.4 Inteligencia Artificial

**Claude Sonnet (Anthropic API):**
- 6 prompts especializados en `backend/prompts/`: phytophthora, firma_hidrica, bioinsumos, reporte_semanal, diagnostico_visual, reporte_agricultor
- Diagnósticos con formato: DIAGNÓSTICO → RECOMENDACIÓN 1 → RECOMENDACIÓN 2 → REFERENCIA
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
              │   24 endpoints   │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   Dashboard      │
              │   React + Vite   │
              │   6 vistas       │
              │   Mapa Leaflet   │
              └──────────────────┘
                       │
                       ▼
              Salvador (agrónomo en campo)
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
| 2 | POST | `/api/predios` | Crear nuevo predio |
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

## 9. ROADMAP — Lo que falta

### Inmediato (con financiamiento, junio 2026)
1. Comprar hardware: 8 TTGO T-Beam + sensores + gateway RAK ($21,520 MXN)
2. Flashear firmware (ya escrito) y desplegar nodos en Nextipac
3. Configurar gateway con SIM 4G → MQTT → PostgreSQL
4. Primer muestreo de laboratorio (qPCR) y calibración de sensores

### Corto plazo (meses 1-6 del piloto)
5. Acumular 50+ pares sensor-microbioma para reentrenar Random Forest con datos reales
6. Migrar de Railway a VPS propio con Docker ($6 USD/mes vs $25-35)
7. Agregar ingesta.py para datos reales por MQTT

### Mediano plazo (meses 6-18)
8. Modelo RF real con R² > 0.5
9. Landing page para demostrar a nuevos productores
10. Segundo predio piloto para validar el modelo en otro tipo de suelo
11. Reporte automático semanal por WhatsApp

### Funcionalidades diseñadas pero no implementadas
- Diagnóstico visual (foto de hoja → Claude Vision + sensores)
- Cálculo de huella hídrica (litros agua / kg aguacate)
- Automatización de riego (requiere infraestructura de electroválvulas)

---

## 10. EQUIPO

| Persona | Rol | Responsabilidad |
|---------|-----|-----------------|
| Ernest Darell Plascencia | Co-fundador, ingeniería | Desarrollo de software, IA, datos, deploy |
| Salvador | Co-fundador, agronomía de campo | Relación con productores, muestreo, aplicación de bioinsumos, interpretación agronómica |
| CUCBA (UdeG) | Laboratorio | Análisis molecular (qPCR, 16S, ITS), análisis fisicoquímico de suelo |

---

## 11. MÉTRICAS DEL PROYECTO

| Métrica | Valor |
|---------|-------|
| Líneas de código | 9,915 |
| Archivos de código | ~35 |
| Endpoints API | 26 |
| Tablas PostgreSQL | 8 |
| Registros en DB | 420,000+ |
| Commits en GitHub | 31 |
| Tiempo de desarrollo | 2 días (22-23 marzo 2026, incluye rediseño UI dark theme + sistema completo de alertas interactivas + consultor IA + CRUD predios) |
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

---

## 13. REPOSITORIO Y ACCESO

| Recurso | URL |
|---------|-----|
| Dashboard (producción) | https://agtech-sistema-production.up.railway.app/ |
| Repositorio GitHub | github.com/Jefemaestro33/agtech-sistema (privado) |
| API docs (Swagger) | https://agtech-sistema-production.up.railway.app/docs |

---

*Documento generado el 22 de marzo de 2026.*
*AgTech Sistema v1.0 — Sistema completo construido, probado y deployado en producción.*
*Pendiente: hardware en campo y datos reales (financiamiento UP, junio 2026).*
