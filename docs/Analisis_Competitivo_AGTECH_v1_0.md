# ANÁLISIS COMPETITIVO — AGTECH NEXTIPAC

## Sistema de Monitoreo IoT + IA para Aguacate Hass vs. Competencia

**Versión 1.0** — 21 de marzo de 2026
Guadalajara, Jalisco

---

## 1. RESUMEN

Se identificaron 8 plataformas agtech relevantes que operan o podrían operar en el mercado mexicano de aguacate. Ninguna ofrece la combinación de monitoreo de suelo + análisis de microbioma + IA generativa + agrónomo en campo que define al sistema AgTech Nextipac. El competidor más cercano es CropX (Israel), que comparte la base de sensores de suelo + IA, pero difiere fundamentalmente en modelo de negocio, profundidad de análisis, y presencia en campo.

La principal ventaja competitiva del sistema es doble: (1) la correlación sensor-microbioma — datos pareados de qPCR con lecturas IoT durante 18 meses en andisoles volcánicos de Jalisco, una barrera de entrada basada en tiempo y datos que ningún competidor puede replicar sin repetir la inversión equivalente — y (2) el modelo de servicio completo con agrónomo que pisa la huerta, vs. competidores que venden cajas y software sin acompañamiento técnico.

---

## 2. MAPA DE COMPETIDORES

### 2.1 Categoría: Software puro (sin sensores físicos) — NO COMPITEN

Estas plataformas usan imágenes satelitales, drones, o fotos del celular. No tienen sensores enterrados en el suelo. Para aguacate con problemas de Phytophthora en la raíz, no sirven: cuando los síntomas llegan a la hoja y el NDVI los detecta, el árbol ya está comprometido.

| Plataforma | País | Qué hace | Por qué no compite |
|------------|------|----------|-------------------|
| OneSoil | Bielorrusia | NDVI satelital gratis, suma térmica, tasa variable | Software puro, sin sensores de suelo. Resolución 10m/pixel. Útil para maíz/soya extensivos, no para 4ha de aguacate |
| SIMA | Argentina | Monitoreo de plagas con geolocalización, scouting, imágenes satelitales | Enfocado en registro manual de plagas y malezas. No mide suelo. Presente en México pero para cultivos extensivos |
| Climate FieldView | EE.UU. (Bayer) | Análisis de rendimiento, pronóstico climático, mapas de siembra | Diseñado para agricultura extensiva de gran escala (maíz, soya). No tiene componente de suelo ni microbioma |
| Plantix | Alemania | Diagnóstico de plagas por foto del celular con IA | No soporta aguacate adecuadamente (usuarios lo reportan en reviews). Solo diagnóstico foliar, no de suelo |
| Agrio | Israel | Diagnóstico de enfermedades por foto con IA | Similar a Plantix. Pobre desempeño en frutales tropicales. Confunde especies en reviews |

### 2.2 Categoría: IoT genérico con sensores — COMPETENCIA PARCIAL

Empresas que sí usan sensores de suelo pero con enfoque generalista (cualquier cultivo, sin especialización).

| Plataforma | País | Qué hace | Diferencia con nosotros |
|------------|------|----------|------------------------|
| NXTAgro | México (Zapopan) | Sensores IoT de suelo, app móvil, alertas en tiempo real | Generalista: berries, tomate, cualquier cultivo. Sin microbioma, sin firma hídrica, sin IA generativa. Modelo: hardware + licencia anual. Se posicionan como "primera empresa mexicana de agtech IoT". Podrían ser proveedores de hardware en el futuro, no competidores directos |
| SensaCultivo | España | Estación agroclimática + sensores de suelo + app | Incluye cálculo de huella hídrica e integral térmica. Sin presencia en México. Sin microbioma ni IA |
| Plantae | España | Sondas de humedad + conductividad + app | Enfocado en riego de precisión puro. Sin inteligencia predictiva. Sin microbioma. Tiene caso de éxito en aguacate pero solo optimización de riego |

### 2.3 Categoría: IoT avanzado con IA — COMPETIDORES REALES

| Plataforma | País | Qué hace | Nivel de amenaza |
|------------|------|----------|-----------------|
| CropX | Israel/NZ | Sensores de suelo + IA + imágenes satelitales + predicción de enfermedades | ALTO — competidor más cercano en tecnología |
| SupPlant | Israel | Sensores en planta (tallo, hoja, fruto) + IA + recomendaciones de riego | MEDIO — enfoque complementario, no idéntico. Opera en aguacate mexicano |

---

## 3. ANÁLISIS DETALLADO — CROPX (competidor principal)

### 3.1 Lo que CropX tiene

- Sensores de suelo con diseño en espiral: humedad, temperatura, EC a múltiples profundidades
- Protocolos LoRaWAN, 3G, 4G, y transmisión vía satélite
- Integración de datos de suelo + imágenes satelitales + pronóstico meteorológico + maquinaria agrícola
- IA y machine learning para recomendaciones de riego, predicción de enfermedades, gestión de nutrientes
- Extrapolación entre sensores: cobertura estimada con ~1 sensor por cada 10-12 hectáreas
- Presencia en México a través de distribuidores (Rieggo, respaldado por Rotoplas; Durman; Blasstech)
- Casos de éxito publicados: 70% más rendimiento en caña, 30% menos agua en pastos, 15% ahorro fertilizantes

### 3.2 Lo que CropX NO tiene (y nosotros sí)

| Capacidad | CropX | AgTech Nextipac |
|-----------|-------|-----------------|
| Monitoreo de microbioma (qPCR) | No | Sí — qPCR quincenal pareado con sensores |
| Firma hídrica (τ, velocidad infiltración, breaking point dinámico) | No — solo recomienda "regar más/menos" | Sí — calcula τ por profundidad, velocidad de infiltración, breaking point dinámico por evento |
| Análisis comparativo CUSUM tratamiento/testigo | No | Sí — detecta divergencias sostenidas entre parcelas tratadas y control |
| Modelo predictivo sensor → microbioma | No | Sí — Random Forest que predice estado microbiano desde datos de sensores |
| IA generativa para diagnósticos (LLM) | No — reglas estadísticas | Sí — Claude genera diagnósticos con razonamiento causal, recomendaciones con dosis, y referencia científica |
| Diagnóstico visual integrado con datos de suelo | No | Sí (diseñado) — foto de hoja + datos de sensores → Claude Vision → diagnóstico integrado |
| Especialización en aguacate Hass | No — generalista (todos los cultivos) | Sí — prompts, umbrales, modelos y protocolos específicos para aguacate en andisoles volcánicos |
| Densidad de sensores | 1 por 10-12 ha | 2 por hectárea — resolución suficiente para comparativo A/B intra-huerta |
| **Agrónomo en campo** | **No — vende cajas y software, el agricultor se las arregla solo** | **Sí — Salvador pisa la huerta, interpreta datos, aplica bioinsumos, genera confianza** |

### 3.3 Lo que CropX tiene y nosotros no (aún)

| Capacidad | CropX | AgTech Nextipac | Plan |
|-----------|-------|-----------------|------|
| Datos climáticos integrados | Sí | ✓ LISTO (v0.4) | clima.py con Open-Meteo API |
| Imágenes satelitales (NDVI) | Sí | No | Post-piloto. 4ha = ~40 pixeles, resolución insuficiente |
| Conexión a maquinaria agrícola | Sí | No | No prioritario. En Nextipac se riega con manguera/gravedad |
| Automatización de riego | Sí | No | No prioritario. Infraestructura de riego en Nextipac no lo permite |
| Red global de distribuidores | Sí | No | Modelo directo con agrónomos propios por ahora |
| Extrapolación entre sensores | Sí (IA propia) | No necesario | Con 2 sensores/ha no hay gap de cobertura |

---

## 4. ANÁLISIS DETALLADO — SUPPLANT (segundo competidor)

### 4.1 Lo que SupPlant tiene

- Sensores en la planta (no en el suelo): tallo, hoja, fruto
- Opera en México: Michoacán, Jalisco, Colima, Nayarit, Sinaloa
- Resultados publicados: 37% reducción de agua en limón, 28% más rendimiento
- Algoritmos de estrés hídrico basados en datos fisiológicos de la planta directamente
- Integración con ClimaCell (inteligencia meteorológica)
- Monitoreo cada 30 minutos con acceso a gráficos, planes de riego, datos climáticos

### 4.2 Diferencia fundamental

SupPlant mide la planta. Nosotros medimos el suelo y el microbioma.

Son enfoques complementarios, no sustitutos. SupPlant detecta estrés hídrico cuando la planta ya lo está sufriendo (reactivo). Nosotros detectamos las condiciones del suelo que van a causar estrés antes de que la planta lo manifieste (predictivo). SupPlant no puede detectar Phytophthora en el suelo; nosotros no podemos medir diámetro de fruto.

En un escenario ideal, un agricultor grande tendría ambos sistemas. En la práctica, para los productores de Nextipac, el problema #1 es Phytophthora y manejo de riego — ambos son problemas de suelo, no de planta.

Ninguno de los dos (CropX ni SupPlant) manda un agrónomo a la huerta. Venden tecnología, no servicio. El agricultor mexicano promedio no sabe interpretar un dashboard — necesita a alguien que le diga "no riegues hoy, aplica Trichoderma el jueves, y la próxima semana muestreamos suelo".

---

## 5. COMPARACIÓN DE MODELOS DE NEGOCIO

| Aspecto | CropX | NXTAgro | SupPlant | AgTech Nextipac |
|---------|-------|---------|----------|-----------------|
| Modelo de cobro | Hardware + licencia anual | Hardware + licencia anual | Suscripción | 30% del incremento de producción medido contra testigo |
| El agricultor paga si no hay resultados | Sí | Sí | Sí | No |
| Barrera de entrada para el productor | Alta ($$$) | Media ($$) | Media ($$) | Cero — no paga hasta ver resultados |
| Riesgo para la empresa | Bajo | Bajo | Bajo | Alto — si no hay incremento, ingreso es $0 |
| Alineación de incentivos | Baja — cobran igual funcione o no | Baja | Baja | Total — solo ganan si el agricultor gana |
| Confianza del agricultor mexicano | Baja — "empresa extranjera vendiendo cajas" | Media — mexicana pero tech capitalina | Baja — israelí | Alta — agrónomo local, no cobra hasta demostrar |
| **Agrónomo en campo** | **No** | **No** | **No** | **Sí — Salvador visita la huerta** |
| Escalabilidad del ingreso | Lineal con # de clientes | Lineal | Lineal | Exponencial — mismo costo fijo, ingreso crece con producción |

### 5.1 Por qué el modelo de riesgo compartido + agrónomo en campo funciona

El productor promedio de aguacate en Jalisco es orgulloso, confía en su conocimiento empírico de décadas, y ha visto múltiples empresas tech prometer resultados y desaparecer después del primer cobro. La barrera #1 no es tecnológica sino de confianza.

El modelo elimina esta barrera en dos niveles:

**Nivel económico (30% del incremento):**
- El agricultor no invierte ni un peso hasta ver resultados medidos contra su propia parcela testigo
- Si el sistema no funciona, el agricultor no pierde nada y la empresa absorbe el costo
- Si funciona, 30% del incremento es un precio justo: el agricultor se queda con 70% de producción que no habría tenido

**Nivel humano (agrónomo en campo):**
- Salvador habla su idioma, viene de campo, genera confianza personal
- No es un call center ni un chatbot — es alguien que pisa la huerta, toca el suelo, ve los árboles
- El agrónomo traduce los datos del dashboard en acciones concretas: "no riegues hoy", "aplica esto el jueves"
- CropX y SupPlant venden una caja y un login. Nosotros vendemos un servicio completo

El financiamiento de la Universidad Panamericana cubre el periodo de demostración (hardware + laboratorio + operación del primer año) hasta que los primeros cortes de producción generen ingreso.

---

## 6. VENTAJAS COMPETITIVAS ÚNICAS

### 6.1 Barrera de datos (la más importante)

El modelo entrenado con 18 meses de datos pareados sensor-microbioma en andisoles volcánicos del Eje Neovolcánico Transversal no es replicable sin la inversión equivalente en tiempo y laboratorio. CropX podría copiar el hardware en 6 meses, pero no puede copiar los datos. Cada mes que pasa con sensores en campo, la barrera crece.

### 6.2 Especialización vertical

CropX, NXTAgro, y SupPlant son plataformas horizontales que sirven para cualquier cultivo. El sistema AgTech está diseñado exclusivamente para aguacate Hass en suelos volcánicos:
- Umbrales de Phytophthora calibrados para P. cinnamomi en andisol
- Prompts de IA con conocimiento específico de fenología del aguacate
- Protocolos de muestreo de microbioma específicos para rizosfera de Persea americana
- Parámetros de firma hídrica calibrados para la estructura de suelo de Nextipac

### 6.3 Agrónomo en campo (nadie más lo tiene)

Todos los competidores venden tecnología: hardware, software, dashboards. Ninguno manda a alguien a la huerta. El agricultor mexicano pequeño-mediano (4-50 ha) no tiene la formación ni el interés para interpretar gráficas de humedad volumétrica o scores de Phytophthora. Necesita un traductor humano.

Salvador es ese traductor: un agrónomo con experiencia en campo que interpreta los datos del sistema y los convierte en instrucciones claras. "No riegues hoy porque va a llover mañana", "Aplica Trichoderma el jueves porque la humedad va a estar ideal", "El nodo 3 muestra saturación, vamos a revisar el drenaje".

Este componente humano es el que cierra la venta con el productor escéptico. No compra una caja ni un login — compra el servicio de Salvador respaldado por tecnología.

### 6.4 Stack de IA completo (nadie más lo tiene)

| Capa | Función | Competidores que la tienen |
|------|---------|---------------------------|
| Sensores IoT + base de datos | Datos en tiempo real | CropX, NXTAgro, SupPlant, Plantae |
| Reglas y alertas | Score de riesgo, umbrales | CropX, NXTAgro |
| Firma hídrica + CUSUM | Análisis avanzado de dinámica de suelo | Nadie |
| ML predictivo (sensor → microbioma) | Predecir biología desde física | Nadie |
| LLM generativo (Claude) | Diagnósticos en lenguaje natural con dosis, timing, y citas | Nadie |
| Diagnóstico visual + datos de suelo | Foto de hoja + contexto de sensores → diagnóstico integrado | Nadie |
| **Agrónomo en campo** | **Traduce datos en acciones, genera confianza** | **Nadie** |

---

## 7. FUNCIONALIDADES DE COMPETIDORES INTEGRADAS AL SISTEMA

| # | Funcionalidad | Inspiración | Estado | Semana |
|---|---------------|-------------|--------|--------|
| 1 | Datos climáticos en tiempo real + ETo | CropX, SupPlant | ✓ LISTO | clima.py v0.4 |
| 2 | Mapa georreferenciado de nodos | CropX, SIMA | ✓ LISTO | react-leaflet v0.4 |
| 3 | Diagnóstico visual integrado (foto + sensores) | Plantix, Agrio | Pendiente | Semana 7-8 |
| 4 | Cálculo de huella hídrica | SensaCultivo | Pendiente | Post-piloto |
| 5 | Reporte simplificado para agricultor | SensaCultivo, NXTAgro | Pendiente | Semana 9-10 |

### Funcionalidades descartadas

| Funcionalidad | Quién la tiene | Por qué no |
|---------------|----------------|------------|
| NDVI satelital | OneSoil, CropX | 4ha = ~40 pixeles. Resolución insuficiente. Útil en 40+ ha |
| Drones | Mapsens, Visual | Caro, requiere licencia. No aporta más que los sensores para el piloto |
| Automatización de riego | CropX, SupPlant | En Nextipac no hay electroválvulas. Quitarle control al agricultor es contraproducente |
| Sensores en planta | SupPlant | Hardware diferente, enfoque complementario. Posible alianza futura |

---

## 8. POSICIONAMIENTO ESTRATÉGICO

| Dimensión | CropX | SupPlant | NXTAgro | AgTech Nextipac |
|-----------|-------|----------|---------|-----------------|
| Profundidad de análisis | Media (sensores + reglas + ML básico) | Media (sensores en planta + algoritmos) | Baja (sensores + dashboard) | Alta (sensores + firma hídrica + CUSUM + microbioma + LLM) |
| Especialización | Horizontal (todos los cultivos) | Semi-vertical (frutales tropicales) | Horizontal | Vertical (aguacate Hass en andisoles) |
| Presencia en México | Distribuidores (Rieggo/Rotoplas) | Operación directa en 5 estados | Operación directa (Zapopan) | Operación directa (Nextipac, Jalisco) |
| Modelo de cobro | Hardware + licencia | Suscripción | Hardware + licencia | 30% del incremento (riesgo compartido) |
| **Agrónomo en campo** | **No** | **No** | **No** | **Sí** |
| Barrera de entrada | Capital y red global | Capital y propiedad intelectual | Primera empresa mexicana | Datos pareados sensor-microbioma 18 meses + relación con productor |
| Debilidad principal | No especializado, caro, sin acompañamiento | Mide planta no suelo, no predice Phytophthora | Sin IA ni análisis avanzado | Sin track record comercial, modelo de ingreso arriesgado |

---

Documento generado el 21 de marzo de 2026.
Fuentes: sitios web oficiales de cada competidor, Google Play Store (reviews), artículos de InfoAgro México, Expansión, distribuidores mexicanos.
