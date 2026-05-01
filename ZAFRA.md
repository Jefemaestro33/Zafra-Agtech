# Zafra

**Monitoreamos huertas de aguacate para que los productores produzcan más.**

*Costo cero para el productor. Cobro solo si funciona.*

---

## 1. Qué es Zafra

Zafra instala sensores de suelo en huertas de aguacate Hass en Jalisco, México, y entrega recetas de riego + alertas de enfermedad vía WhatsApp en lenguaje del productor. Cobra **30% del incremento medible de rendimiento**. Si no hay incremento, $0. Punto.

El productor no paga nada por adelantado. No necesita entender la tecnología. No necesita comprar nada. Solo recibe un mensaje que dice "no riegues hoy, el suelo a 30 cm está al 38%; próximo riego sugerido jueves 7 AM, 25 litros por árbol durante 45 minutos." Y al final de la temporada, si produjo más, Zafra cobra su parte.

Estratégicamente, Zafra es un negocio de **datos agrícolas** disfrazado de servicio agronómico. Cada huerta onboardeada genera datos de suelo en tiempo real que no existen en ninguna base de datos mexicana. A escala, ese dataset habilita crédito agrícola, seguros paramétricos, inteligencia comercial y certificaciones de sostenibilidad — negocios de margen 10x superior al revenue share inicial. Pero eso es Fase 3. Hoy, Zafra es sensores + recetas + alertas + cobro solo si funciona.

---

## 2. El problema

### 2.1 El yield gap real

México es el primer productor mundial de aguacate: 2,761,327 toneladas en 253,043 hectáreas cosechadas en 2024 (SIAP), valor de 56,975 millones de pesos, exportaciones de USD 4B. Michoacán domina con 72.6% del volumen; Jalisco es segundo con 12.3% (~339,015 t en ~28,247 ha, rendimiento promedio ~12 t/ha).

El rendimiento promedio nacional es **10.9 t/ha**. Pero la literatura científica mexicana demuestra que el techo es mucho mayor:

| Referencia | Yield logrado | Condiciones |
|---|---|---|
| Salazar-García et al. 2009, *Terra Latinoamericana* (Nayarit, Hass temporal) | **28.2 t/ha** promedio 3 años | Fertilización sitio-específica optimizada |
| Israel promedio Hass 2022-2024 | 13-17.5 t/ha | Drip + fertigación + densidad alta |
| Perú industrial (USDA FAS 2025) | 12-20+ t/ha | Plantaciones nuevas con drip completo |
| Bedoya-Pareja et al. 2024, *Scientific Reports* (Colombia, Hass) | Baseline +20-30% | Precision irrigation |

Jalisco ya promedia ~12 t/ha — cerca del promedio israelí en Hass. Pero el productor mediano de Jalisco con manejo subóptimo de riego está dejando **20-30% de rendimiento sobre la mesa**, atribuible a riego no prescriptivo y pérdidas prevenibles por Phytophthora cinnamomi. Ese 20-30% es el gap explotable con el stack de Zafra, anclado a literatura peer-reviewed (Bedoya-Pareja 2024: +20-30% con riego prescriptivo; Ramírez-Gil 2020: 85-90% reducción de severidad de Phytophthora con manejo integrado).

El techo superior documentado por Salazar-García (28 t/ha) incluye fertilización sitio-específica integral que entra en Fase 2+ de Zafra. En Fase 1, el target operativo es **+20% de uplift** con riego prescriptivo + prevención de Phytophthora — al medio del rango conservador de la literatura.

### 2.2 Por qué la tecnología actual no cierra el gap

**(a) Costo prohibitivo upfront.** CropX: $600-$899 USD por sensor + $275/año suscripción. Arable Mark 3: $1,500+ hardware + $700-$1,200/año. Para una huerta de 20 ha, eso es $10-40K USD upfront que el productor no tiene.

**(b) Ininteligibilidad cultural.** Dashboards en inglés, conceptos importados (NDVI, ETo Penman-Monteith), recomendaciones que el productor siente como cuestionamiento a su experiencia de 20-30 años con el cultivo.

**(c) Desconfianza estructural.** El productor mexicano sabe — empíricamente — que cuando alguien con tecnología cara aparece en su huerta, normalmente lo está midiendo para extraer valor, no para crear valor compartido.

**(d) Vacío de financiamiento.** La FND fue **extinguida el 29 de mayo de 2023** (DOF). El programa Cosechando Soberanía (administración Sheinbaum, 8,500M MXN, créditos hasta 1.3M MXN al 8.5-9% APR) **excluye explícitamente al aguacate** — está orientado a maíz, frijol, arroz, trigo, café, leche y pesca. FIRA opera como segundo piso pero sirve principalmente a agroindustria grande. Más del 90% de los productores mexicanos no accede a financiamiento formal (Verqor/Yara Growth Ventures, 2023).

El cultivo de exportación más importante de México está en un **vacío de capital de trabajo y de tecnificación al mismo tiempo**, sin que el mercado ni el Estado lo cubra.

### 2.3 Lo que los drones y satélites no resuelven

DJI Agras ha popularizado el dron agrícola en México (~2,200 pilotos, 1.8M ha tratadas). Pero el dron resuelve la *visibilidad* del cultivo (mapeo NDVI, fumigación), no la *intervención*. Phytophthora cinnamomi se manifiesta foliarmente cuando el daño radicular ya es severo. La señal preventiva está en el suelo: humedad multi-profundidad, conductividad eléctrica, temperatura. Un estudio reciente de UC Riverside (arXiv 2508.13379, 2024-2025) logró 75-86% de accuracy discriminando plantas sanas vs. PRR usando exactamente sensores de humedad y EC del suelo de bajo costo. La hipótesis técnica de Zafra tiene base científica validada.

---

## 3. La solución: el producto

### 3.1 Lo que cada huerta recibe

1. **Nodos sensores prestados y enterrados** — 2 por hectárea, propiedad de Zafra. El farmer nunca compra nada. Miden humedad volumétrica a tres profundidades (10, 20, 30 cm), conductividad eléctrica y temperatura del suelo, cada 5-15 minutos.
2. **Recetas de riego prescriptivas vía WhatsApp** — "no riegues hoy, el suelo a 30 cm está al 38%; próximo riego sugerido jueves 7 AM, 25 litros por árbol durante 45 minutos." Generadas por balance hídrico ETo × Kc, ajustado a humedad real medida.
3. **Alertas de riesgo de Phytophthora** — detección 72+ horas antes de síntomas foliares, con recomendación de tratamiento (Trichoderma, micorrizas, ventana sin riego).
4. **Reporte semanal del agrónomo** — visita campo, valida lecturas, ajusta calibración, diagnóstico humano.
5. **Atribución del uplift** — análisis estadístico entre parcelas tratadas y testigo. Base de cobro auditable.

**El productor NO recibe**: dashboards, jerga agronómica, qPCR del microbioma, datos de chip custom. Para el productor, Zafra es **sensores + recetas + alertas + cobro solo si funciona.**

### 3.2 Por qué $0 upfront es la única forma de entrar

El SaaS agrícola no funciona. La evidencia de la última década es contundente:

- **Kilimo** (Argentina, fundada 2014): vendió SaaS directo al farmer por años, su founder ha hablado públicamente de sobrevivir "several near-death moments" antes de pivotar a vender créditos volumétricos de agua a corporativos (Microsoft, Coca-Cola). En 2022 proyectaban facturar $2.5M (declaración de la COO en PuntoAPunto). Después de 10 años y $10.9M levantados, reconocieron que cobrar al farmer por ahorro de agua era "pedirle que pague para aumentar su riesgo."
- **CropX**, **SupPlant**, **Agrosmart**: todos terminaron vendiendo a agroindustria grande o corporativos, no al productor mediano.
- **Agrolend** (Brasil, la agtech mejor capitalizada de LatAm con ~$100M levantados): vende crédito, no tecnología. El farmer no paga por software.

El patrón es claro: **todos los que sobreviven terminan vendiendo a alguien que no es el farmer, o embebiendo la tech dentro de un producto financiero.**

Zafra entra por la única puerta que el productor mexicano tiene abierta: **riesgo cero.** Si no funciona, no paga. Si funciona, paga con dinero que no hubiera tenido. Es la misma lógica que las ESCOs (Energy Service Companies) que operan con "shared savings" en eficiencia energética desde hace 30 años.

### 3.3 El revenue share como mecanismo de entrada, no como modelo permanente

El revenue share 30% sobre uplift es la estrategia de **adquisición de cliente**, no el modelo de monetización de largo plazo. La transición natural es:

- **Fase 1 (hoy-2027):** Revenue share puro. Entra sin fricción, demuestra valor, construye confianza y datos.
- **Fase 2 (2027-2028):** Cuando ya hay 20-30 huertas con datos de un ciclo exitoso, ofrece al productor la opción de cuota fija anual (menor que lo que pagaría en revenue share). El farmer prefiere porque le sale más barato; Zafra gana previsibilidad.
- **Fase 3 (2028+):** Originación de crédito agrícola para insumos con scoring basado en datos propios de sensores + historial de producción + repago. Vehículo: SOFOM ENR. El revenue viene del spread financiero. El sensor es la condición de entrada al crédito, no el producto.

Esta transición replica exactamente la secuencia de Apollo Agriculture (Kenia, YC W18, ~$93M raised) pero adaptada al mercado mexicano donde la confianza es la barrera dominante y no hay infraestructura de mobile money.

### 3.4 Expansión por círculos de confianza

La información en el campo mexicano no viaja por marketing digital. Viaja en la asamblea ejidal, la cooperativa y la plaza del pueblo el domingo.

- **Primer círculo (0-5,000 ha):** Red directa de Salvador — compañeros de la UAG, contactos de SADER Jalisco, productores que lo conocen personalmente. No hay problema de atribución porque la relación es previa al negocio. Don Pancho no disputa el 30% porque Salvador lo conoce, le instaló los sensores con sus manos, y le ha mandado las recetas todo el año.
- **Segundo círculo (5,000-20,000 ha):** El compadre de Don Pancho que vio los resultados en la huerta de al lado y preguntó "¿qué le pusiste a tus árboles?" Llega pre-vendido.
- **Tercer círculo (20,000+ ha):** El productor que no conoce a Salvador pero escuchó en APEAJAL o en la Expo AgroAlimentaria que hay un sistema dando resultados. A este sí le importa el contrato formal y la transparencia del cálculo. Pero para cuando llegamos a este círculo ya tenemos datos, metodología probada, y probablemente un caso publicado con la UdeG o INIFAP.

Es el mismo playbook de Compartamos Banco en microcrédito, Grameen Bank en Bangladesh, y Apollo en Kenia: confianza primero, formalización después.

---

## 4. Unit economics verificados

### 4.1 Costos de hardware por hectárea (precios de mercado 2025-2026)

**Nodo sensor (2 por hectárea):**

| Componente | Precio retail | Precio volumen (100+) |
|---|---|---|
| TTGO T-Beam ESP32 + LoRa 915MHz | $18-25 | $12-18 |
| 3x sondas capacitivas humedad (10/20/30cm) | $9-24 | $6-15 |
| Sensor EC (TDS meter analógico) | $5-12 | $3-8 |
| Sensor temperatura suelo (DS18B20 waterproof) | $2-4 | $1-3 |
| Batería LiPo 3.7V 6000mAh + regulador | $8-15 | $5-10 |
| PCB custom + casing IP67 + conectores | $10-25 | $5-12 |
| Ensamble + flashing firmware | $5-10 | $3-5 |
| **Total por nodo** | **$57-115** | **$35-71** |

**Gateway LoRaWAN (1 por cada 50-100 ha):**

| Modelo | Precio |
|---|---|
| RAK7268V2 indoor (8 canales, sin LTE) | $139 |
| RAK7268CV2 indoor (con LTE) | $232 |
| RAK7289V2 outdoor (8-16 canales, sin LTE) | $372 |
| RAK7289CV2 outdoor (con LTE) | $525 |

**Costo hardware por hectárea según escala:**

| Ha por gateway | Gateway/ha | Nodos/ha (2 × $35-71) | **Total/ha** |
|---|---|---|---|
| 4 ha (mínimo) | $131 | $70-142 | **$201-273** |
| 10 ha | $52 | $70-142 | **$122-194** |
| 20 ha | $26 | $70-142 | **$96-168** |
| 50 ha | $10 | $70-142 | **$80-152** |

### 4.2 Revenue por hectárea (dos escenarios)

**Base: 20 ha, 10 t/ha, $1.50 USD/kg precio al productor (rango 2024-2025: $1.05-$3.36)**

| Escenario | Uplift | Ton adicionales/ha | Valor adicional/ha | Zafra (30%) | Productor (70%) |
|---|---|---|---|---|---|
| Conservador | +10% | 1 t/ha | $1,500 | **$450/ha/año** | $1,050/ha/año |
| Target | +20% | 2 t/ha | $3,000 | **$900/ha/año** | $2,100/ha/año |

**Payback del hardware: 1-3 meses** del ciclo anual incluso en escenario conservador.

### 4.3 Predio típico (20 ha), dos escenarios

| Concepto | Conservador (+10%) | Target (+20%) |
|---|---|---|
| Producción adicional anual | +20 t | +40 t |
| Valor adicional anual | $30,000 USD | $60,000 USD |
| **Zafra (30%)** | **$9,000 USD** | **$18,000 USD** |
| Productor (70%) | $21,000 USD | $42,000 USD |
| Hardware total (año 1) | ~$2,500-4,000 | ~$2,500-4,000 |
| Operativo anual | ~$1,500-2,000 | ~$1,500-2,000 |
| **Margen bruto año 1** | **~60-70%** | **~75-85%** |

### 4.4 Costo operacional pre-payroll (10 productores, ~200 ha)

| Concepto | Costo anual |
|---|---|
| Hardware amortizado (400 nodos + 4 gateways) | ~$5,000-7,000 |
| Visitas Salvador (1/mes × 10 predios) | $6,000-12,000 |
| Cloud (Railway) | $300-600 |
| Claude API | $54 |
| WhatsApp Business API | $600-1,200 |
| Conectividad celular gateways | $1,200-2,400 |
| Lab calibración local | $2,000-5,000 |
| Imprevistos | $5,000-10,000 |
| **Total pre-payroll** | **$20,000-38,000** |
| Revenue proyectado (10 × $18K) | $180,000 |
| **Margen bruto pre-payroll** | **~80-89%** |

**Estado de validación:** estos son targets derivados de literatura peer-reviewed, no resultados medidos. El uplift real se medirá por primera vez en el **ciclo 2026-2027 del piloto Nextipac**. Hoy: 0 LOI firmadas, 0 ingresos cobrados.

---

## 5. Arquitectura técnica

### 5.1 Hardware en campo

- **Nodos**: ESP32 / TTGO T-Beam con LoRa 915 MHz, deep sleep entre lecturas. Costo unitario: $35-71 USD a volumen.
- **Sensores**: humedad volumétrica multi-profundidad (10/20/30 cm), conductividad eléctrica, temperatura del suelo.
- **Gateway**: RAK7289CV2 outdoor LTE. Cobertura 5-15 km línea de vista.
- **Calibración**: protocolo gravimétrico in-situ por predio + corrección por temperatura. Crítico para andisoles volcánicos de Jalisco.

### 5.2 Pipeline de datos

```
Sensor → LoRa 915MHz → Gateway RAK → MQTT → ingesta.py
    → calibración gravimétrica + corrección T
    → PostgreSQL (Railway)
    → Score Phytophthora v3 + Balance hídrico + CUSUM
    → WhatsApp Meta Cloud API (alertas diarias/semanales)
```

### 5.3 Inteligencia operacional

- **Score Phytophthora v3** (~830 LOC): 10 factores con interacciones multiplicativas. Específico para P. cinnamomi en andisoles volcánicos.
- **Balance hídrico prescriptivo**: ETo Penman-Monteith FAO × Kc mensual del Hass → receta de riego en litros/árbol y ventana horaria.
- **Firma hídrica** (~580 LOC): detección automática de eventos de mojado, ajuste de τ (constante de infiltración), breaking point. Modelo biexponencial para andisoles con alofana.
- **CUSUM tratamiento vs testigo**: atribución estadística del uplift. Base de cobro auditable.
- **LLM Consultor**: Claude Sonnet con 6 prompts especializados. Costo: ~$0.45 USD/granja/mes.

### 5.4 Stack completo

| Capa | Tecnología | Estado |
|---|---|---|
| Base de datos | PostgreSQL 15 (Railway) | Producción |
| Backend API | Python 3.13 + FastAPI, 14 módulos, ~7,151 LOC | Producción |
| Dashboard agrónomo | React 19 + Vite 8 + Tailwind v4, ~5,944 LOC | Producción |
| WhatsApp | Meta Cloud API + cronjobs | Listo (pendiente token producción) |
| Clima | Open-Meteo API + ETo Penman-Monteith FAO | Producción |
| Firmware | ESP32/TTGO T-Beam + LoRa, ~540 LOC C++ | Listo para flashear |
| Deploy | Railway + Docker multi-stage | Producción |

**Total LOC en producción: ~12,000.** Construido por Ernest en 9 meses, solo (con dirección agronómica de Salvador).

### 5.5 Estado actual (sin maquillaje)

**Construido y funcionando:**
- Sistema completo en producción Railway
- 4 sensores instalados en piloto Nextipac, generando datos reales
- Pipeline de inteligencia completo, probado con datos sintéticos (420K registros)
- Pipeline ingesta hardware end-to-end listo

**Pendiente:**
- Cero LOI firmadas (pipeline 10 productores / ~500 ha es verbal vía red de Salvador)
- Cero ingresos cobrados
- Cero outreach enterprise (Mission Produce-Calavo, Boomitra, etc.)
- Calibración gravimétrica con suelo Nextipac real pendiente
- WhatsApp Business: número y token pendientes
- Constitución legal: sin SAPI
- Dominio propio: pendiente

---

## 6. Por qué nadie puede ser AI native desde el día uno en agricultura — y por qué eso es nuestra ventaja

### 6.1 El problema fundamental de datos

En software puro, ser AI native desde el día uno es posible porque los datos de entrenamiento ya existen: texto en internet (ChatGPT), código en GitHub (Cursor), documentos legales (Harvey), imágenes etiquetadas (Midjourney). Descargas el dataset, entrenas el modelo, lanzas el producto.

En agricultura de suelos, **los datos no existen.** No están en internet. No están en ningún servidor. Están enterrados literalmente en la tierra y nadie los ha sacado.

La literatura científica lo confirma de manera contundente:

- **Frontiers in AI (2024):** "La ausencia de datos históricos, la escasez de datos y la insuficiente disponibilidad de datos representan un desafío significativo en la adopción de tecnología AI para agricultura. La mayoría de los sistemas de AI necesitan datos históricos y en tiempo real sobre condición del suelo, crecimiento de cultivos, clima y otros parámetros relevantes." Los datos existentes "podrían no estar disponibles en forma integrada o centralizada por falta de cooperación entre sector público y privado."
- **Rest of World (marzo 2026):** "Los sistemas de AI construidos en Occidente frecuentemente fallan en dar cuenta de los contextos del Sur Global, incluyendo altos costos de internet, ancho de banda limitado, y falta de datos de entrenamiento etiquetados." La profesora Catherine Nakalembe (University of Maryland / NASA Harvest) advierte que "si estos sistemas no se adaptan, permanecen irrelevantes, potencialmente profundizando desigualdades existentes." Y Rikin Gandhi (CEO de Digital Green / FarmerChat) lo resume: "La agricultura es hiperlocal: tipo de suelo, lluvia, altitud, plagas y mercados varían de pueblo a pueblo. El aprendizaje del modelo debe mantenerse cerca de esas realidades."
- **MDPI Land (febrero 2026):** "Actualmente existe una brecha: la mayoría de los estudios de AI no contienen mediciones repetidas tomadas a lo largo de muchos años, y esto lleva a predicciones de baja precisión."
- **Embrapa / Sensors (2022):** A pesar de la proliferación de sensores, la cobertura geográfica ha sido "desigual, causando que ciertas áreas estén virtualmente desprovistas de datos útiles."
- **arXiv (2025, estudio India):** Los datasets agrícolas sufren de "desalineación temporal entre recolección de datos y ciclos de decisión agrícola, fragmentación espacial por ausencia de geocódigos comunes vinculando suelo, clima y rendimiento."

En México específicamente: INEGI tiene ~1 perfil edafológico por cada 250 km² (Serie II, estáticos 2000-2010). El dataset nacional más reciente (Arroyo-Cruz et al. 2025, *European Journal of Soil Science*) compiló ~4,000 muestras de todo el país — snapshots puntuales sin series de tiempo. SoilGrids global (ISRIC) tiene México drásticamente subrepresentado. En "datos de suelo agrícola mexicano en serie temporal continua con IoT pareado a producción", **hay esencialmente cero actores operando.**

No puedes entrenar un modelo de predicción de Phytophthora en andisoles volcánicos de Jalisco porque no hay un dataset de humedad × EC × temperatura × brote/no-brote × rendimiento a nivel parcela. No existe.

### 6.2 La secuencia obligatoria: sensores primero, AI después

La secuencia correcta — y la única posible — es:

1. **Despliegas sensores** → generas datos crudos por primera vez
2. **Acumulas ciclos** → 1-2 años de series de tiempo con resultados de producción
3. **Entrenas modelos** → ML supervisado con datos propietarios reales
4. **Te vuelves AI native** → el modelo predice mejor que cualquier regla o agrónomo humano

Cualquiera que diga ser "AI native" en precision agriculture de campo en mercados emergentes desde el día uno está usando datos satelitales genéricos (que no capturan lo que pasa bajo tierra) o mintiendo.

**Esto es exactamente el moat de Zafra.** Cada huerta que onboardeamos genera un dataset que ninguna base de datos pública ni privada en México tiene. En 3 años, con 500 huertas y múltiples ciclos, nuestros modelos de predicción serán imposibles de alcanzar por cualquier competidor que empiece después — porque tendremos 3 años de ventaja en datos que solo se pueden generar con sensores en campo, no descargándolos de internet.

El que llega primero a generar los datos, gana. No hay atajo.

### 6.3 Dónde está Zafra hoy en esa secuencia

**Hoy (AI-assisted):** Reglas determinísticas (Score Phytophthora v3: si humedad > X y temperatura > Y y EC > Z → alerta) + Claude API para reportes en lenguaje natural a $0.45/granja/mes. No es AI native. Es AI-assisted con infraestructura de generación de datos.

**Con 50 huertas y 1 año de datos:** Modelos supervisados (Random Forest, XGBoost) entrenados con datos reales de uplift/no-uplift, brote/no-brote. Mejora la predicción sobre reglas, pero todavía se podría operar sin el modelo.

**Con 500 huertas y 3 años de datos (AI native):** Modelo propietario que predice yield, enfermedad y timing de riego mejor que cualquier agrónomo humano — porque procesa 500 huertas × 2 nodos × lecturas cada 5 minutos × 3 años de historial. El modelo ES el producto. Sin él, los datos crudos no valen nada. Ahí somos AI native — y nadie puede copiarnos sin los datos.

---

## 7. Roadmap

### 7.1 Ventajas competitivas que se profundizan con el tiempo

**Hardware propio (horizonte 2028+):** Zafra participa en el **IEEE SSCS PICO Open-Source Chipathon 2026** (track Sensors), diseñando "Nopal-Sense" — un chip ASIC dedicado para sensado de suelo agrícola con consumo ultra-bajo. Esto no es producto presente; el piloto y los primeros deployments operan con componentes comerciales. Pero a escala (100+ productores), el costo marginal del nodo se vuelve la restricción de margen. Un ASIC custom en proceso 130nm puede reducir el costo del nodo de $35-71 a $5-15 USD en volumen — convirtiendo el deployment en commodity. Financiado por el programa IEEE, sin impacto al balance operativo.

**Ciencia de suelos (horizonte 2027+):** Convenio en desarrollo con CUCBA-UdeG para estudios pareados sensor + microbioma en tipos de suelo representativos. A mediano plazo esto produce modelos predictivos por tipo de suelo que ningún competidor puede replicar sin años de datos. Financiado por academia/grants (CONAHCYT, FAO GSP, INIFAP), sin costo al balance.

**Ag-fintech (horizonte 2028+):** Originación de crédito agrícola con scoring basado en datos propios de sensores + historial de producción + repago. SOFOM ENR. El modelo está validado por Agrolend (Brasil, ~$100M raised, Serie C) y Apollo Agriculture (Kenia, ~$93M raised, YC W18). La diferencia: Zafra tendría datos de suelo de primera mano que ni Agrolend ni Apollo tienen — ellos evalúan riesgo con satélite + buró; nosotros con sensores enterrados en la parcela.

### 7.2 Fases temporales

**Q2-Q4 2026:** Piloto Nextipac activo. Calibración gravimétrica con suelo real. Conversión de pipeline verbal a LOIs firmadas. Primeros 3-5 productores onboardeados post-validación. Hardware deployment a 50-80 nodos. WhatsApp Business activo. Constitución SAPI.

**2027:** Primer ciclo CUSUM completo con datos reales. Expansión geográfica a Michoacán. Diversificación de cultivos (limón persa, mango, agave, café). 20-50 productores. Primer deal enterprise (Mission Produce-Calavo Scope 3 baseline).

**2028+:** 100+ productores, ~5,000 ha. Inicio de originación de crédito (SOFOM ENR). Nopal-Sense en producción si Chipathon exitoso. Modelos microbioma transferibles desplegados. Observatorio comercial de suelos agrícolas mexicanos consolidado.

---

## 8. Mercado y timing

### 8.1 Por qué ahora

1. **FND extinguida 2023 + Cosechando Soberanía excluye aguacate:** vacío crediticio estructural en el cultivo de exportación más importante de México.
2. **Mission Produce + Calavo merger** ($430M, Calavo shareholders approved April 28 2026, cierre esperado ~agosto 2026): entidad combinada con una posición dominante en el flujo MX-US de aguacate necesitará datos Scope 3 para regulación ESG (CSRD EU, SEC Climate Rule, California SB-253). Ventana ideal para ser el data layer.
3. **Verra VM0042 (2024):** aprueba MRV remoto satelital para carbono de suelo cropland. Ground truth IoT se vuelve cuello de botella — Boomitra ya registró 3.03M créditos en pastizales del norte de México.
4. **Descartes Underwriting abrió oficina en México (octubre 2024):** seguros paramétricos agrícolas buscan datos de suelo verificados para triggers más finos que NDVI satelital.
5. **Costo de AI colapsó:** agronomía personalizada viable a ~$0.45 USD/granja/mes con LLMs.

### 8.2 Mercados downstream

| Comprador potencial | Producto | Magnitud estimada |
|---|---|---|
| Mission Produce + Calavo (post-merger) | ESG Scope 3 baseline supply shed Jalisco | $100K-$1M + MRV recurrente |
| Boomitra | Ground truth MRV carbono cropland (Verra VM0042) | $30K-$150K/año licensing |
| Yara, Nutrien, ICL | Calibración regional fórmulas fertilizante | $30K-$250K/estudio |
| Munich Re, Swiss Re, Descartes Underwriting | Ground truth seguros paramétricos | $20K-$200K licensing |
| Mercado de seguros agrícolas México | (USD 552M 2024 → $865M 2033, CAGR 4.6%) | |
| Carbono voluntario agrícola | (USD 36M 2024 → $648M 2034, CAGR 31.9%) | |

---

## 9. Competitive landscape

### 9.1 Competidores directos e indirectos

| Compañía | Modelo | Capital | Diferencia con Zafra |
|---|---|---|---|
| **ProducePay** (US/MX) | Trade finance pre-harvest, hasta $5M/grower, 60 commodities incl. aguacate | ~$136-250M | Sin sensores, sin agronomía. Capa financiera post-cosecha. Co-existencia viable. |
| **Verqor** (México) | Crédito cashless para insumos, 48 hrs, granos/hortalizas | $7.5M | Sin sensores. Sin foco aguacate. Modelo tasa-interés. Competidor potencial en Fase 3 ag-fintech. |
| **NXTAgro** (CDMX) | IoT sensores + SaaS, foco berries | Sin fondeo VC | Hardware SaaS upfront, no revenue share. Sin foco aguacate. |
| **Apollo Agriculture** (Kenia, YC W18) | Bundle: inputs + crédito + seguro + asesoría vía SMS, ~$170/loan maíz | ~$93M | África row crops. Sin ground sensors. Comparable de modelo bundled, no de revenue share. |
| **Agrolend** (Brasil) | Banco digital agro, crédito sin garantías físicas | ~$100M | Brasil only. Lending puro sin datos de campo propios. La mejor agtech de LatAm hoy. |
| **Kilimo** (Argentina) | Gestión riego + créditos volumétricos agua para corporativos | $10.9M | SaaS directo al farmer no funcionó; founder habló públicamente de "near-death moments"; pivoteó a cobrar a corporativos. Proyectaban $2.5M en facturación 2022 después de 8 años. |

### 9.2 Diferenciación real

Nadie hace simultáneamente: sensores de suelo ground-truth + inteligencia agronómica prescriptiva + revenue share $0 upfront + foco aguacate Hass mexicano. Cada competidor tiene un solo eje (financiero, hardware SaaS, o consultoría). La integración es lo difícil de replicar.

Además: el modelo de revenue share $0 upfront es **estructuralmente inmune a copia por incumbentes**. CropX/SupPlant operan en SaaS recurring revenue; pivotear a revenue share canibaliza sus métricas. ProducePay opera en trade finance; pivotear requiere capacidad agronómica que no tienen. Verqor opera en lending regulado; pivotear rompe su economía de prestamista. Solo un nuevo entrante puede competir — y construir las 5 capacidades que Zafra integra (hardware IoT, AI/ML, agronomía de campo, diseño de silicio, relación rural mexicana) toma años.

---

## 10. Riesgos honestos

### 10.1 Riesgos operativos

- **Atribución del uplift es comercialmente frágil.** CUSUM es matemáticamente válido pero el productor puede disputar ("llovió bien, no fue tu aparato"). Mitigación: en el primer círculo de confianza (red de Salvador) no habrá disputas; la formalización rigurosa es para el tercer círculo.
- **Ciclo agrícola lento.** Aguacate Hass cosecha anual; validar uplift toma 12 meses mínimo.
- **El 30% puede ser mucho para cerrar los primeros deals.** Dispuestos a empezar en 15-20% si es necesario. El primer deal importa más que el margen del primer deal.
- **Revenue share no tiene precedentes claros en agtech global.** Lo más cercano son las ESCOs en eficiencia energética, que operan con "shared savings" desde hace 30 años. El modelo es de entrada, no permanente — la transición a cuota fija y crédito es el plan.

### 10.2 Riesgo de seguridad

El crimen organizado opera en zonas aguacateras de Jalisco y Michoacán. Extorsión documentada de $1-3 MXN/kg exportado; en diciembre 2025 el gobierno desplegó 1,680 soldados (Plan Paricutín) en zonas productoras.

Mitigación: operación exclusiva en Jalisco (menor intensidad vs. Michoacán), equipo local con red comunitaria establecida, y perfil operativo de bajo impacto (sensores de suelo enterrados, no infraestructura visible). Nuestro cofundador agrónomo es de la región, trabaja en SADER Jalisco, y su familia produce en la zona. No somos una empresa extranjera mandando ingenieros a zona de conflicto — somos locales operando en nuestra propia comunidad. Ese riesgo de seguridad es también **barrera de entrada**: cualquier competidor de Silicon Valley o Tel Aviv que analice el mercado mexicano de aguacate va a ver los headlines y decidir no entrar.

### 10.3 Riesgos de equipo

- **Dos cofounders de 23 años, pre-revenue.** Experiencia gerencial limitada. Mitigación: profundidad técnica demostrada (12,000 LOC en producción construidos por Ernest en 9 meses) + dominio agronómico de campo (Salvador operó 2,000 cabezas en Zacatecas a los 22 años) + relación de 20 años.
- **Bus factor.** Si Salvador se va, el modelo de círculos de confianza se debilita. Mitigación: equity 50/50, roles complementarios sin overlap, lección aprendida del cofounder conflict anterior de Ernest, y plan de promotores locales que repliquen la relación de Salvador en cada zona.

### 10.4 Riesgos de mercado

- **Precio del aguacate volátil** (rango 2024-2025: $1.05-$3.36 USD/kg). Una caída de 50% en precios reduce el revenue share proporcionalmente.
- **Concentración post-merger Mission/Calavo** puede deprimir precios al productor.
- **Riesgo climático:** sequía meganacional 2024-2025 ha estresado huertos de Jalisco.
- **Regulatorio fintech (Fase 3):** SOFOM ENR requiere capital + tiempo. No relevante hasta 2028+.

---

## 11. Equipo

### Ernest Darell Zermeño Plascencia — Cofounder técnico

23 años. Doble licenciatura concurrente: Administración y Dirección Empresarial (Universidad Panamericana, 8° semestre, graduación diciembre 2026) + Biología (Universidad de Guadalajara). Sole author de manuscrito en revisión en *BMC Genomics* sobre CRISPR en microglía. Tesis compitiendo en el **Premio Nacional de Economía Banamex 2026**.

Diseñador de silicio open-source: **Nopal-Sense** en IEEE SSCS PICO Chipathon 2026 (track Sensors), mentoría semanal IEEE.

Stack que construyó solo para Zafra: Python + FastAPI + PostgreSQL + React + Tailwind + ESP32/LoRa firmware + MQTT + Random Forest + Claude API + WhatsApp Meta Cloud API + Docker + Railway. ~12,000 LOC en 9 meses.

Antecedentes: cofundador de emprendimiento previo en encriptación homomórfica, cerrado por conflicto de cofounder — lecciones duras sobre formación de equipo. Opera zLab Studio (desarrollo de software a medida, Guadalajara).

### Salvador — Cofounder agronómico

23 años. Ingeniero Agrónomo, Universidad Autónoma de Guadalajara. Farm-raised en rancho diversificado familiar (maíz, frijol, calabaza, agave, ganado). Operó como director técnico un rancho de **2,000 cabezas en Zacatecas** a los 22 años. Trabaja en **SADER Jalisco**, opera su propio rancho, y construye la red de productores del piloto Zafra vía su cohorte UAG.

El acceso institucional vía SADER conecta con CONAGUA, INIFAP, programas estatales de specialty crop. Salvador no es agrónomo de aula — es operador con manos en tierra, credibilidad gremial real, y red de confianza con productores que no se compra.

### Por qué este team

- **Mejores amigos desde los 3 años** — 20 años de relación. Equity 50/50. Cero riesgo de fractura tipo emprendimiento previo.
- **Combinación correcta para agtech**: ingeniero biotech/silicio/full-stack + ingeniero agrónomo farm-raised con SADER.
- **Bilingües ambos** (español + inglés C1).
- **23 años × 2**: 20-30 años de runway productivo por delante.

---

## 12. Capital ask

- **Universidad Panamericana**: $500,000 MXN para 12 meses de piloto Nextipac (hardware deployment + operación + constitución SAPI + IP).
- **YC Summer 2026** (alternativa o complementario): $500K USD. Use of funds: hardware deployment a 50 granjas + 1 hire ML/CTO + 1 hire BD enterprise + operacional 12 meses.

---

## 13. La visión de largo plazo

Zafra empieza monitoreando huertas de aguacate en Jalisco. Pero el activo real que construimos es el **dataset de suelos agrícolas más completo de México** — datos que hoy no tiene INEGI, SIAP, FIRA, ni ningún actor privado. México tiene aproximadamente 1 perfil edafológico por cada 250 km² (INEGI Serie II), todos estáticos. Zafra genera series de tiempo continuas con IoT.

A escala, ese dataset habilita:

- **Crédito agrícola** con scoring que ningún banco puede replicar (datos de suelo + producción + repago en la misma plataforma). Agrolend lo hace en Brasil sin sensores propios y ya levantó $100M.
- **Seguros paramétricos** con triggers calibrados por datos reales, no por modelos satelitales aproximados. Descartes Underwriting ya abrió oficina en México.
- **Certificación de carbono y huella hídrica** con ground truth verificable. Boomitra ya emitió 3.03M créditos en México bajo Verra VM0042.
- **Inteligencia comercial** para traders de commodities, empresas de insumos, y compradores como Mission Produce-Calavo.

El crédito es el caballo de Troya para construir el dataset. El dataset es la joya de la corona.

---

## 14. Fuentes

**AI y datos agrícolas — por qué no se puede ser AI native desde el día uno:**
- Frontiers in AI (2024), "AI can empower agriculture for global food security: challenges and prospects in developing nations"
- Rest of World (marzo 2026), "AI models from Western tech giants fail in overseas agricultural settings"
- MDPI Land (febrero 2026), "Benefits and Challenges of Artificial Intelligence in Soil Science"
- Embrapa / Sensors (2022), "Data Fusion in Agriculture: Resolving Ambiguities and Closing Data Gaps"
- arXiv (2025), "Unlocking AI's Potential in Agriculture: The Critical Role of Data" (estudio India)
- Bioresources and Bioprocessing (2023), "AI and machine learning for soil analysis"

**Datos México:**
- SIAP Panorama Agroalimentario 2025 — Aguacate (vía blogagricultura.com)
- DOF Decreto extinción FND 29-mayo-2023
- Cosechando Soberanía — Expansión, Programas para el Bienestar
- FIRA Programa Institucional 2025-2030

**Yield Hass — literatura primaria:**
- Salazar-García et al. 2009, *Terra Latinoamericana*, fertilización sitio-específica Hass Nayarit
- Bedoya-Pareja et al. 2024, *Scientific Reports*, precision irrigation Hass Colombia
- USDA FAS GAIN Peruvian Avocado Exports 2025

**Phytophthora cinnamomi:**
- Téliz-Ortiz et al. 2022, *Revista Mexicana de Ciencias Agrícolas*
- Ramírez-Gil et al. 2020, *Crop Protection*
- arXiv 2508.13379 (UC Riverside 2024-2025) — detección PRR con sensores bajo costo
- UC IPM Avocado Phytophthora Root Rot guide

**Competidores y funding:**
- Apollo Agriculture (Crunchbase, TechCrunch, GSMA)
- Agrolend (StartSe, AgFunderNews, Fintech Global)
- Verqor (AgFunderNews, Latam Fintech Hub)
- ProducePay (TechCrunch, IFC, Perishable News)
- Kilimo (Tenacious Ventures, Wade Institute, PuntoAPunto, AmericaEconomía)

**Mercados:**
- Crop insurance México: USD 552M → $865M 2033 (IMARC)
- Voluntary ag carbon credit: USD 36M → $648M 2034 (GMI)
- Smallholder finance gap global: USD 170B/año (CSIS/World Bank)
- Mission Produce + Calavo merger: SEC 8-K, GlobeNewswire

**Hardware/IoT:**
- Makerfabs LoRa Soil Moisture Sensor V3 (Tindie, Makerfabs.com)
- RAK Wireless WisGate Edge (store.rakwireless.com)
- IEEE SSCS PICO Open-Source Chipathon 2026

**Seguridad:**
- Plan Paricutín diciembre 2025 (El Financiero)
- Extorsión aguacate (Milenio, El Universal)

---

*Documento interno · Ernest Darell Zermeño Plascencia y Salvador · Guadalajara, Jalisco · Actualizado 30 de abril de 2026*
