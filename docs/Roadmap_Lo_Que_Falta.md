# ROADMAP — Lo que falta por construir

## AgTech Nextipac — Estado al 21 de marzo de 2026

---

## Resumen

En un día se construyó y deployó el sistema base completo. Lo que sigue es darle inteligencia (LLM, firma hídrica, CUSUM, ML) y pulir la experiencia para la demo ante la UP y para Salvador en campo.

**URL producción:** https://agtech-sistema-production.up.railway.app/
**Repo:** github.com/Jefemaestro33/agtech-sistema (privado)
**Auto-deploy:** cada push a main se deploya automáticamente

---

## Lo que ya está LISTO

| # | Componente | Estado |
|---|-----------|--------|
| 1 | Generador de datos sintéticos (416K registros, 5 escenarios) | ✓ |
| 2 | Schema SQL (7 tablas + tabla predios) | ✓ |
| 3 | PostgreSQL en Railway con datos cargados | ✓ |
| 4 | clima.py (Open-Meteo + ETo Penman-Monteith + 2,160 registros reales) | ✓ |
| 5 | alertas.py (Score Phytophthora v2, riego, offline, batería, modo CLI) | ✓ |
| 6 | api.py (FastAPI, 20 endpoints REST) | ✓ |
| 7 | Dashboard React (6 vistas + selector predio + mapa Leaflet + Recharts) | ✓ |
| 8 | Dockerfile multi-stage (Node build + Python serve) | ✓ |
| 9 | Deploy en Railway con URL pública | ✓ |
| 10 | GitHub repo + auto-deploy | ✓ |
| 11 | Análisis competitivo (8 plataformas) | ✓ |
| 12 | Memoria técnica v0.5 | ✓ |

---

## Lo que falta — ordenado por prioridad

### PRIORIDAD 1: llm_consultor.py (la siguiente sesión)

**Por qué es lo más importante:** La vista de Alertas IA ahorita muestra "Diagnóstico IA pendiente". Cuando esto funcione, cada alerta tiene un diagnóstico real de Claude con recomendaciones, dosis, timing, y referencia científica. Es lo que separa a este sistema de todo lo demás en el mercado.

**Prompt para Claude Code:**

```
Crea backend/llm_consultor.py

Este módulo toma resúmenes generados por alertas.py (función generar_resumen_nodo) 
y los envía a Claude API para obtener diagnósticos accionables.

Implementa:

1. SYSTEM PROMPTS — crea 6 archivos en backend/prompts/:

   phytophthora.txt: "Eres un agrónomo experto en aguacate Hass con especialización 
   en fitopatología de suelos tropicales. Contexto: Jalisco, México, andisoles 
   volcánicos. Revisa métricas IoT, compara con literatura sobre P. cinnamomi, 
   valida el score de riesgo, devuelve: DIAGNÓSTICO (2-3 oraciones qué pasa y por qué), 
   RECOMENDACIÓN 1 (acción concreta, cantidad, timing), RECOMENDACIÓN 2, 
   REFERENCIA (cita breve). Sé directo, el receptor es un agrónomo técnico."

   firma_hidrica.txt: para interpretar cambios en τ, velocidad infiltración, 
   estructura de suelo. Correlacionar con tratamientos aplicados.

   bioinsumos.txt: evaluar si condiciones actuales (humedad, temperatura, pronóstico 
   clima) son ideales para aplicar micorriza o Trichoderma. Considerar que lluvia 
   en 24h lava el inóculo.

   reporte_semanal.txt: resumir tendencias de la semana, comparar bloques, 
   sugerir acciones para la semana entrante. Tono: resumen ejecutivo para equipo técnico.

   diagnostico_visual.txt: recibe imagen de hoja/tallo + contexto de sensores. 
   Cruza diagnóstico visual con datos de suelo. Distingue causas de suelo 
   (anoxia, Phytophthora) de causas foliares (antracnosis, deficiencia).

   reporte_agricultor.txt: genera resumen simplificado SIN tecnicismos para 
   reenviar al productor por WhatsApp. Incluye: estado general, alertas en 
   lenguaje simple, próximas acciones.

2. Función consultar_llm(resumen, tipo_prompt) que:
   - Carga el prompt correspondiente
   - Envía resumen + prompt a Claude API (model: claude-sonnet-4-5-20250514)
   - max_tokens: 800
   - Retorna el diagnóstico como string
   - Retry con backoff exponencial (1s, 2s, 4s) si falla

3. Función consultar_llm_visual(imagen_base64, resumen, nodo_id) que:
   - Envía imagen + resumen a Claude con Vision
   - Usa prompt diagnostico_visual.txt
   - Retorna diagnóstico integrado visual + suelo

4. Función formatear_diagnostico(diagnostico, resumen) que estructura 
   la respuesta para guardar en la tabla eventos como JSONB

5. Función generar_reporte_semanal(conn, predio_id) que:
   - Consulta resúmenes de los últimos 7 días de todos los nodos
   - Genera reporte con LLM usando reporte_semanal.txt
   - Retorna reporte formateado

6. Función generar_reporte_agricultor(conn, predio_id) que:
   - Usa reporte_agricultor.txt para generar versión simplificada
   - Retorna texto listo para WhatsApp (corto, sin tecnicismos)

7. Fallback: si Claude no responde después de 3 intentos, retorna 
   "⚠️ Diagnóstico IA no disponible" + datos crudos del resumen

8. Modo CLI:
   - python llm_consultor.py --diagnostico 3 → genera diagnóstico para nodo 3
   - python llm_consultor.py --reporte-semanal → genera reporte semanal
   - python llm_consultor.py --reporte-agricultor → genera versión simplificada

9. Agrega endpoint a api.py:
   - POST /api/alertas/{id}/diagnostico → trigger diagnóstico LLM para un evento
   - POST /api/reportes/semanal → genera reporte semanal
   - POST /api/reportes/agricultor → genera reporte simplificado
   - POST /api/diagnostico/visual → recibe imagen + nodo_id → diagnóstico visual

10. Actualiza AlertasView.jsx para:
    - Mostrar el diagnóstico real del LLM en cada alerta (en vez del placeholder)
    - El botón "Generar diagnóstico" llama al endpoint POST
    - Loading state mientras Claude procesa
    - Los botones "Enviar a Salvador" y "Generar reporte" quedan funcionales 
      (por ahora copian al clipboard, después se conecta WhatsApp)

Usa ANTHROPIC_API_KEY del entorno. Corre --diagnostico 3 al terminar 
y muestra el diagnóstico que genera Claude para el nodo 3.
```

---

### PRIORIDAD 2: firma_hidrica.py

**Por qué:** La vista de Firma hídrica está con placeholder. Este algoritmo es core — es lo que ningún competidor tiene.

**Prompt para Claude Code:**

```
Crea backend/firma_hidrica.py

Se ejecuta sobre los datos sintéticos que ya están en PostgreSQL. 
Busca eventos de mojado (incrementos súbitos de humedad >3% VWC en h10) 
y calcula la firma hídrica de cada evento.

Implementa:

1. Función detectar_eventos_mojado(conn, nodo_id, dias=180) que:
   - Consulta lecturas donde h10 sube >3% VWC entre lecturas consecutivas
   - Retorna lista de timestamps de inicio de evento

2. Función calcular_firma(conn, nodo_id, evento_timestamp) que:
   - Consulta datos desde evento -30min hasta +48h
   - Calcula velocidad del frente de mojado:
     * Detecta tiempo de arribo a 10cm, 20cm, 30cm (donde dθ/dt > umbral)
     * vel_10_20 = 0.10m / (t_arribo_20 - t_arribo_10)
     * vel_20_30 = 0.10m / (t_arribo_30 - t_arribo_20)
   - Calcula curva de secado post-pico:
     * Identifica θ_pico por profundidad
     * Ajusta: θ(t) = θ_residual + amplitud * exp(-t/τ) con scipy.optimize.curve_fit
     * Extrae τ (constante de secado) por profundidad
   - Detecta breaking_point (donde la curva de secado cambia de pendiente)
   - Calcula delta_h_max = max(h10 - h30) durante evento
   - Guarda en tabla firma_hidrica

3. Función procesar_todas_firmas(conn, nodo_id) que procesa todos 
   los eventos de un nodo

4. Modo CLI:
   - python firma_hidrica.py --nodo 1 → procesa todas las firmas del nodo 1
   - python firma_hidrica.py --todos → procesa todos los nodos
   - python firma_hidrica.py --ultimo 3 → muestra la última firma del nodo 3

5. Agrega/actualiza endpoints en api.py para que sirva datos reales 
   de firma_hidrica

6. Actualiza FirmaView.jsx:
   - Mostrar datos reales en vez de placeholder
   - Gráfica de curva de secado del último evento (real vs ajuste exponencial)
   - Evolución de τ en el tiempo
   - KPIs con datos reales

Corre --todos al terminar. Debería calcular firmas para los ~30-40 
eventos de riego por nodo durante los 6 meses de datos sintéticos. 
Muestra la firma del nodo 3 durante el periodo de crisis (días 100-140) 
— τ debería ser más alto que el baseline.
```

---

### PRIORIDAD 3: comparativo.py (CUSUM)

**Por qué:** La vista Comparativo muestra datos pero sin la detección de divergencia CUSUM. Es lo que demuestra científicamente que el tratamiento funciona.

**Prompt para Claude Code:**

```
Crea backend/comparativo.py

Implementa el análisis CUSUM para detectar divergencias sostenidas 
entre nodos de tratamiento y testigo.

1. Función calcular_medias_diarias(conn, predio_id, dias=180) que:
   - Para cada bloque, calcula media diaria de h10, h20, h30, t20, ec30
   - Agrupa por rol (tratamiento vs testigo)
   - Retorna DataFrame con día, bloque, rol, métricas

2. Función cusum(diferencias, umbral_h=None) que:
   - Input: array de (valor_tratamiento - valor_testigo) diarios
   - Baseline: primeros 28 días
   - Calcula S+ y S- acumulados
   - Umbral h = 4 × std_baseline
   - Slack k = std_baseline / 2
   - Retorna alarmas con día, tipo (incremento/decremento), magnitud

3. Función analizar_bloques(conn, predio_id) que:
   - Corre CUSUM por cada bloque para h10, tau_10 (si hay firmas), ec30
   - Retorna estado por bloque: normal/divergencia, desde cuándo, magnitud

4. Modo CLI:
   - python comparativo.py --analizar → muestra estado CUSUM de todos los bloques
   - python comparativo.py --bloque 2 → detalle del bloque 2

5. Actualiza endpoint /api/predios/{id}/comparativo para incluir 
   resultado CUSUM (divergencia sí/no, desde cuándo)

6. Actualiza ComparativoView.jsx:
   - Mostrar badge "Divergencia detectada" o "Normal" por bloque
   - Gráfica de CUSUM acumulado con línea de umbral
   - Delta diario con highlighting de la zona de divergencia

Corre --analizar al terminar. El Bloque 2 debería mostrar divergencia 
por el escenario de sobrerriego en el nodo 3.
```

---

### PRIORIDAD 4: modelo_microbioma.py (Random Forest)

**Por qué:** Demuestra que el pipeline de ML funciona. El modelo real se entrena con datos de laboratorio, pero el pipeline con datos sintéticos se puede enseñar en la demo.

**Prompt para Claude Code:**

```
Crea backend/modelo_microbioma.py

Entrena un Random Forest que predice estado microbiano desde datos 
de sensores + clima.

1. Función preparar_features(conn, nodo_id, fecha_muestreo) que:
   - Calcula 14 features para una fecha dada:
     h10_avg_7d, h20_avg_7d, h30_avg_7d, t20_avg_7d, ec30_avg_7d,
     dh10_dt_7d (tasa cambio h10), h10_x_t20_7d (interacción),
     cv_h10_7d (coef variación), gdd_acum_real (de tabla clima),
     dias_ultimo_mojado, tau_10_ultimo (de tabla firma_hidrica si existe),
     precipitacion_acum_7d, eto_acum_7d, hr_avg_7d (de tabla clima)

2. Función preparar_dataset(conn) que:
   - Para cada registro en tabla microbioma, calcula features desde sensores
   - Retorna X (features) e y (valor de qPCR por target)

3. Función entrenar_modelo(X, y, target_name) que:
   - RandomForestRegressor(n_estimators=100, max_depth=10)
   - Validación Leave-One-Out temporal
   - Retorna modelo, R², MAE, feature_importance

4. Función predecir_actual(conn, nodo_id, modelo) que:
   - Calcula features actuales del nodo
   - Predice estado microbiano estimado

5. Modo CLI:
   - python modelo_microbioma.py --entrenar → entrena modelos para cada target
   - python modelo_microbioma.py --predecir 3 → predice estado actual del nodo 3
   - python modelo_microbioma.py --importancia → muestra feature importance

6. Nota en el output: "Modelo entrenado con datos sintéticos — NO válido 
   para predicciones reales. Se reentrena con datos de laboratorio a partir 
   del mes 6 del piloto."

Corre --entrenar y muestra R² por target. Con datos sintéticos el R² 
debería ser alto (>0.7) porque los datos sintéticos tienen la correlación 
embebida por diseño. Eso está bien para la demo.
```

---

### PRIORIDAD 5: Firmware ESP32

**Por qué:** No lo puedes flashear sin hardware, pero tener el código listo demuestra que el día que llegue el dinero solo falta comprar y flashear.

**Prompt para Claude Code:**

```
Crea firmware/nodo_sensor/nodo_sensor.ino

Firmware para ESP32 TTGO T-Beam. Código en C++ (Arduino).

Implementa:
- Lectura de 3 sensores capacitivos de humedad (ADC, pines configurables)
- Lectura de DS18B20 (OneWire) para temperatura
- Lectura de sensor EC (ADC)
- Buffer circular de 15 lecturas (5 minutos a 20 seg/lectura)
- Cálculo de media, min, max por sensor en la ventana de 5 min
- Detección de evento de mojado: si Δh10/Δt > 3% VWC entre ventanas
- Transmisión por LoRa cada 5 minutos (paquete binario ~24 bytes)
- Deep sleep entre transmisiones
- LED de status

Crea firmware/nodo_sensor/config.h con:
- NODO_ID (1-8)
- Pines de sensores
- Frecuencia LoRa (915 MHz para México)
- Spreading factor, bandwidth
- Umbrales de detección de mojado
- SSID y password para OTA

Crea firmware/nodo_sensor/ota.h con:
- Lógica de actualización Over-The-Air
- Botón físico (reed switch) activa modo WiFi
- Conecta a hotspot del agrónomo
- Descarga firmware desde URL predefinida
- Timeout de 30 segundos si no encuentra hotspot

Todo configurable desde config.h. Comentarios en español.
No necesita compilar ahorita (no tenemos el hardware), pero el código 
debe estar completo y listo para flashear.
```

---

### PRIORIDAD 6: Pulido para demo

**Cosas menores pero importantes para la presentación ante la UP:**

```
Mejoras de UX para la demo:

1. Dashboard: agregar auto-refresh cada 30 segundos (como Bloomhost)

2. Overview: que el mapa use tiles satelitales en vez de OpenStreetMap 
   estándar (se ve más impresionante para demo). Usar Esri World Imagery 
   tile layer que es gratis.

3. Alertas IA: cuando se genera un diagnóstico con LLM, que se guarde 
   en la tabla eventos y se muestre persistido (no solo en memoria)

4. Nodo detalle: agregar sparkline mini-gráficas en los KPI cards 
   (tendencia 24h en miniatura)

5. Loading states: skeleton loaders en vez de spinners genéricos

6. Mobile responsive: verificar que todo se vea bien en iPhone 
   (Salvador lo va a ver desde su teléfono en campo)

7. Favicon + título de pestaña "AgTech Nextipac" 

8. Meta tags para que cuando Salvador comparta la URL por WhatsApp 
   se vea preview bonito (og:title, og:description, og:image)
```

---

### NO prioritario (post-piloto)

| Funcionalidad | Cuándo |
|---------------|--------|
| Notificaciones push WhatsApp (alertas críticas) | Cuando se resuelva la API de Meta o se use Twilio |
| Huella hídrica (litros agua / kg aguacate) | Cuando haya datos de producción real |
| NDVI satelital | Cuando escales a 40+ hectáreas |
| Automatización de riego | Cuando el productor tenga infraestructura de electroválvulas |
| Rol agricultor (vista simplificada) | Cuando haya más de 3 predios |
| Docker Compose para VPS | Cuando migres de Railway a producción |
| Sensores en planta (dendrometría) | Posible alianza con SupPlant |

---

## Orden de ejecución recomendado

| Sesión | Qué se construye | Resultado visible |
|--------|------------------|-------------------|
| Siguiente | llm_consultor.py + 6 prompts + endpoints + UI | Alertas IA con diagnósticos reales de Claude. Salvador ve recomendaciones con dosis y timing |
| +1 | firma_hidrica.py + endpoints + UI | Vista Firma hídrica con curvas de secado reales, τ calculado, breaking point |
| +2 | comparativo.py (CUSUM) + endpoints + UI | Vista Comparativo con detección de divergencia por bloque |
| +3 | modelo_microbioma.py | Random Forest entrenado (demo), predicciones de estado microbiano |
| +4 | Firmware ESP32 | Código listo para flashear cuando llegue hardware |
| +5 | Pulido demo + mobile | Listo para presentar ante UP y Salvador |

---

## Para la demo ante la UP (mayo)

Esto es lo que abres frente al comité:

1. **Overview** — mapa satelital de Nextipac con 8 nodos coloreados. "Esto es la huerta en tiempo real."
2. **Click en nodo 3** — "Este nodo detectó condiciones de riesgo para Phytophthora."
3. **Alertas IA** — diagnóstico de Claude con recomendaciones. "La IA analizó 72 horas de datos y generó esto."
4. **Firma hídrica** — curvas de secado. "Así medimos si la estructura del suelo está mejorando."
5. **Comparativo** — CUSUM. "Así demostramos científicamente que nuestro tratamiento funciona vs. el testigo."
6. **Clima** — datos reales de Nextipac. "Integramos pronóstico meteorológico para anticipar riesgos."

No hay slides. Es el sistema corriendo en vivo.

---

Documento generado el 21 de marzo de 2026.
