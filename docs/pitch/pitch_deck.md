# ZAFRA · Pitch Deck

**Audiencia:** Comité de inversión Universidad Panamericana
**Fecha objetivo:** 25 de mayo de 2026
**Duración estimada:** 15–20 min presentación + 10 min Q&A
**Ask:** $500,000 MXN para piloto Nextipac (12 meses)
**Founder:** Ernest Darell Zermeño

---

## Estructura del deck (11 slides)

| # | Slide | Tiempo |
|---|---|---|
| 1 | Cover | 30s |
| 2 | El problema | 90s |
| 3 | Por qué nadie lo ha resuelto | 90s |
| 4 | El insight algorítmico (no el insight de hardware) | 90s |
| 5 | ⭐ El modelo de negocio | **3 min** |
| 6 | Defensibilidad estructural vs incumbents | 90s |
| 7 | Línea Nopal — defensa de mediano plazo | 60s |
| 8 | Unit economics | 2 min |
| 9 | Piloto Nextipac | 90s |
| 10 | Equipo | 90s |
| 11 | Ask + cierre | 90s |

---

## SLIDE 1 — Cover

### Contenido visual
- **Logo Zafra** (centro)
- Tagline: *"Inteligencia agronómica con riesgo compartido para aguacate Hass mexicano"*
- Subtagline pequeño: *"Piloto activo · Nextipac, Jalisco · Mayo 2026"*
- Founder name + fecha del pitch en pie

### Speaker notes (verbal · 30s)
> *"Buenos días. Soy Ernest Zermeño y vengo a presentarles Zafra: una plataforma de agricultura inteligente para aguacate Hass que cobra solo cuando el productor gana. En los próximos 15 minutos les voy a mostrar el problema, el modelo de negocio que lo convierte en oportunidad, y por qué este equipo es el que lo va a ejecutar."*

---

## SLIDE 2 — El problema

### Contenido visual
- **Headline:** Phytophthora cinnamomi mata 15–30% de la producción anual de aguacate Hass en Jalisco
- 3 datos en cuadros grandes:
  - **$3.5B USD/año** — exportación de aguacate mexicano
  - **34%** — participación de México en producción mundial
  - **15–30%** — pérdida anual a Phytophthora
- Imagen pequeña: gráfico de yield gap (Jalisco 8–12 ton/ha vs Israel benchmark 20–25 ton/ha)
- Footer: *Fuentes: SAGARPA, APEAM, FAO*

### Speaker notes (verbal · 90s)
> *"México es el productor #1 mundial de aguacate. Jalisco es el #2 estado del país y el de mayor crecimiento. Pero hay un dato que casi nadie en finanzas conoce: entre el 15 y el 30% de la producción anual de aguacate Hass se pierde por un solo patógeno — Phytophthora cinnamomi, un oomiceto que pudre las raíces cuando el suelo se satura."*
>
> *"Esa pérdida representa hasta mil millones de dólares anuales en valor potencial que nunca llega a fruta. Y aquí está el dato más importante: el rendimiento promedio de Jalisco es de 8 a 12 toneladas por hectárea. El benchmark israelí es de 20 a 25. Hay un gap de 50 a 100% entre lo que se produce y lo que es técnicamente posible. La causa número uno de ese gap es Phytophthora más manejo ineficiente de riego."*

### Datos a tener listos para Q&A
- Pérdida absoluta anual estimada en Jalisco: ~$300–500M USD
- Productores afectados: virtualmente todos los predios de Hass en zonas con riego o lluvia abundante
- Detección convencional (visual) llega cuando el árbol ya tiene daño radicular severo

---

## SLIDE 3 — Por qué nadie lo ha resuelto

### Contenido visual
**Tabla comparativa de incumbents:**

| Player | Origen | Modelo | Por qué falla en México |
|---|---|---|---|
| CropX | Israel/NZ | Hardware + licencia anual ($500–2,000 USD/ha) | Capital upfront que el productor no tiene |
| SupPlant | Israel | Suscripción + dashboards | Productor de 55 años no abre dashboards |
| NXTAgro | México | Hardware + licencia anual | Sin agrónomo en campo, sin servicio post-venta |
| Kilimo | Argentina | SaaS satélite (sin hardware) | Light-touch; no aterriza al productor individual |

**Frase grande al final de la slide:**
> *"Los players actuales son ricos que nunca han pisado el campo. Su economía depende de cobrar antes de demostrar resultados. Eso elimina automáticamente al 95% del mercado mexicano de aguacate."*

### Speaker notes (verbal · 90s)
> *"Antes de mostrarles nuestra solución, déjenme explicarles por qué nadie ha cerrado este gap a pesar de décadas de empresas tratando. CropX, SupPlant, NXTAgro, Kilimo — todas tienen tecnología buena. Todas fracasan en México por la misma razón estructural: cobran antes de demostrar."*
>
> *"CropX cobra entre 500 y 2,000 dólares por hectárea, upfront. Un productor mexicano de 20 hectáreas necesita 40 mil dólares en caja para apostarle a una promesa de un vendedor extranjero. No los tiene. SupPlant opera con dashboards en israelí — el productor de 55 años en Nextipac no abre dashboards, ni en Israel ni en México."*
>
> *"Los players actuales son ricos que nunca han pisado el campo mexicano. Su economía depende de cobrar antes de demostrar resultados. Eso es exactamente lo que elimina al 95% del mercado mexicano de aguacate. Y ese 95% es donde está nuestra oportunidad."*

---

## SLIDE 4 — El insight algorítmico (no el insight de hardware)

### Contenido visual
- **Headline:** El diferencial técnico no está en los sensores. Está en lo que el sistema decide con esos datos.
- **Diagrama central:** Sensores estándar → Score Phytophthora v3 → Receta accionable WhatsApp
- **Caja a la derecha:** Score Phytophthora v3
  - 10 factores con interacciones multiplicativas
  - **Predictivo, no reactivo**
  - Detecta condiciones de esporulación >72h antes del síntoma foliar
  - Calibrado contra literatura agronómica + datos sintéticos validados
  - Próximo: calibración con datos reales del piloto Nextipac
- **Footer:** *"Cualquier ingeniero con una tarde libre puede armar el hardware. La diferencia está en el algoritmo y en cómo se entrega."*

### Speaker notes (verbal · 90s)
> *"Un punto importante para que el comité no se distraiga con la parte equivocada del producto: el hardware es trivial. Sensores de humedad multi-profundidad, temperatura, conductividad eléctrica, un microcontrolador LoRa, un gateway. Es commodity. Cualquier ingeniero competente puede armarlo en una tarde. Y es exactamente lo que ya tienen CropX, SupPlant y NXTAgro."*
>
> *"La diferencia técnica real de Zafra está en el algoritmo: el Score Phytophthora versión 3. Diez factores ambientales con interacciones multiplicativas que detectan las condiciones de esporulación del patógeno más de 72 horas antes de que aparezca cualquier síntoma en las hojas del árbol. Y esa diferencia importa porque cuando aparece el síntoma foliar, el árbol ya está comprometido — la intervención llega tarde."*
>
> *"Con Zafra, la intervención llega temprano, y se entrega por WhatsApp en lenguaje del productor: 'no riegues hasta el jueves', 'aplica Trichoderma esta ventana de tres días'. No dashboards. WhatsApp. Eso es lo que el productor mexicano de 55 años sí lee."*

---

## SLIDE 5 — ⭐ EL MODELO DE NEGOCIO

### Contenido visual
**Esta es LA slide del pitch. Visualmente debe ser la más fuerte.**

- **Headline gigante:** Revenue-share 30%. $0 upfront. Cobramos solo si funcionamos.
- **Tres cajas centrales:**
  - **🟢 Para el productor:** $0 cuesta entrar · Si no hay incremento, paga $0 · Si hay incremento, paga 30% de lo adicional · Riesgo: cero
  - **🔵 Para Zafra:** Solo cobramos cuando funcionamos · Cobro auditado por CUSUM estadístico · Alineación de incentivos al 100%
  - **⚖️ Auditoría:** Análisis CUSUM (Cumulative Sum Control Chart) · Divergencia >4σ sostenida >2 semanas vs parcela testigo · Auditable, transparente, no disputable
- **Footer:** *"El productor se queda con 70% de producción que no habría tenido sin Zafra. Nosotros nos quedamos con 30%. Nadie pierde."*

### Speaker notes (verbal · 3 min — la slide más larga)
> *"Aquí es donde Zafra deja de ser un proyecto de tecnología agtech y se vuelve un negocio. Esta es la slide más importante del pitch."*
>
> *"Nuestro modelo es revenue-share del 30% del incremento de producción medido contra una parcela testigo. Cero pesos upfront para el productor. Cobramos únicamente si funcionamos."*
>
> *"Para el productor, el cálculo mental es trivial: no le cuesta nada entrar. Si no hay mejora medible, no paga nada. Si hay mejora, paga el 30% de algo que no habría tenido sin nosotros, y se queda con el 70% restante. Su riesgo financiero es exactamente cero. Esto cruza la línea psicológica de 'voy a probar' que ningún otro player puede ofrecer."*
>
> *"Para nosotros, el cálculo es igual de claro: solo ganamos cuando el productor gana. La alineación de incentivos es perfecta — no hay forma de que cobremos sin entregar valor real medible."*
>
> *"Y aquí está la pieza que hace todo defendible: el cobro está auditado por CUSUM, Cumulative Sum Control Chart. Es un análisis estadístico que detecta divergencias sostenidas entre parcelas tratadas y parcelas control. Umbral científico: divergencia mayor a 4 sigmas sostenida más de 2 semanas. Eso significa que el cobro no es subjetivo, no se discute, no depende de nuestra palabra. Es un número estadísticamente derivado que el productor puede verificar en tiempo real desde su teléfono. Auditable, transparente, no disputable."*
>
> *"Esto no es marketing. Es el corazón del negocio. Si el comité solo se acuerda de una sola cosa de este pitch, quiero que sea ésta: Zafra es el único agtech que cobra solo cuando el productor gana, validado por estadística que el productor puede ver en tiempo real."*

### Anticipated Q&A
- *"¿Qué pasa si el productor no quiere pagar después del incremento?"* → Contrato firmado upfront que vincula los pagos al CUSUM auditado, con cláusula de arbitraje. Auditoría estadística no se disputa.
- *"¿Cómo manejan el riesgo de que la primera cosecha sea mala por clima?"* → CUSUM compara TRATAMIENTO vs TESTIGO en la misma huerta — el clima afecta a ambos por igual, así que la divergencia mide el efecto Zafra, no el efecto clima.

---

## SLIDE 6 — Defensibilidad estructural vs incumbents

### Contenido visual
**Tabla de defensibilidad:**

| Player | Por qué NO puede copiar el modelo |
|---|---|
| **CropX** | Su valuación se sostiene en venta de hardware + SaaS. Pivotear canibaliza recurring revenue. **Sus inversores no se lo permiten.** |
| **SupPlant** | Misma estructura. Empresa public-ish, accountability a shareholders, no puede asumir riesgo post-resultados. |
| **NXTAgro** | Capital limitado, no aguanta 12–18 meses sin ingresos por productor. |
| **Kilimo** | Modelo deliberadamente light-touch. Revenue-share requiere agrónomo en campo, lo cual rompe su tesis. |

**Frase de cierre grande:**
> *"Los competidores que técnicamente podrían replicar este modelo, estructuralmente no lo van a hacer. Esto no es ventaja temporal. Es defensa permanente."*

### Speaker notes (verbal · 90s)
> *"La pregunta natural que el comité tiene en este momento es: 'OK, el modelo es brillante. ¿Por qué CropX o SupPlant no lo copian mañana?'."*
>
> *"La respuesta es que ninguno de ellos puede pivotear sin destruir su propio negocio. CropX y SupPlant tienen valuaciones construidas sobre recurring revenue por hardware más SaaS subscription. Si pivotean a revenue-share, canibalizan sus métricas SaaS, decepcionan a sus inversores, rompen su tesis de salida. Sus boards no se lo permiten."*
>
> *"NXTAgro es mexicano pero opera con capital limitado — no aguanta 12 a 18 meses sin ingresos por productor mientras valida casa por casa. Y Kilimo eligió deliberadamente no tener hardware. Pivotear a revenue-share con agrónomo en campo rompería su tesis entera."*
>
> *"Conclusión: somos el único player que puede ofrecer este modelo en este mercado, y los que técnicamente podrían — estructuralmente no lo van a hacer. Esto no es ventaja temporal de ser primeros. Es defensa permanente de posición."*

---

## SLIDE 7 — Línea Nopal · Defensa de mediano plazo

### Contenido visual
- **Headline:** Para 18–36 meses: línea de chips Nopal
- **Subtitle:** No es el producto. Es el acelerador del moat.
- **Dos cajas paralelas:**
  - **Nopal-Demo** — Chip de patrones reacción-difusión. Sometido al shuttle Skywater TTSKY26a (TinyTapeout). Fabricación en proceso. Silicio físico noviembre 2026. Demuestra capacidad RTL → tape-out → silicon.
  - **Nopal-Sense** — Agricultural Sensor Co-Processor. **IEEE SSCS PICO Chipathon 2026, track Sensors.** Mentoría semanal por experto IEEE en silicon design. Phase 3 (formal design review) julio. Tape-out septiembre.
- **3 bullets de impacto:**
  - Reduce costo operacional al escalar (inferencia local, no cloud)
  - Resiliencia offline (decisiones críticas sin dependencia de 4G)
  - Materializa el moat algorítmico en hardware difícil de replicar

### Speaker notes (verbal · 60s — máximo)
> *"Para cerrar el tema de defensibilidad, una pieza más. Aparte del moat estructural del modelo de negocio, estamos construyendo en paralelo una segunda capa de defensa en silicio, bajo el nombre Nopal."*
>
> *"No es el producto Zafra — el producto sigue siendo lo que ya les expliqué. Es un acelerador del moat para los próximos 18 a 36 meses. Hoy estamos en dos pipelines de fabricación: uno en TinyTapeout que llega físicamente en noviembre, y otro en el SSCS PICO Chipathon de IEEE bajo mentoría semanal de un experto en silicon design."*
>
> *"Lo que esto significa: cuando escalemos a cientos de productores, la inferencia del Score Phytophthora va a vivir en hardware local en vez de en la nube. Menor costo operacional, resiliencia offline, y un moat algorítmico que un competidor no puede replicar copiando código. Es la única respuesta creíble a '¿qué pasa si CropX se pone serio en México en 2028?' que cualquier founder agtech mexicano puede dar hoy."*

---

## SLIDE 8 — Unit economics

### Contenido visual
**Tabla principal — predio típico de 20 ha · 10 ton/ha · $1.50 USD/kg:**

| Escenario de mejora | Producción adicional | Valor adicional anual | Zafra (30%) | Productor (70%) |
|---|---|---|---|---|
| Conservador (10%) | 20 ton | $30,000 USD | **$9,000** | $21,000 |
| **Base (20%)** | 40 ton | $60,000 USD | **$18,000** | $42,000 |
| Optimista (30%) | 60 ton | $90,000 USD | **$27,000** | $63,000 |

**Caja inferior — escala del pipeline:**
- **Pipeline actual:** 10 productores comprometidos · ~500 ha agregadas
- **Año 1 (post-piloto, escenario base):** 10 productores × $18K = **$180K USD recurrente**
- **Costo operacional anual:** $30–50K USD
- **Margen bruto en steady state:** 70–80%
- **Ruta a $1M USD ARR:** ~55 productores (~$55M MXN ingresos en pesos)

### Speaker notes (verbal · 2 min)
> *"Vamos a los números concretos. Tomemos el caso típico de un predio mediano de 20 hectáreas, rindiendo 10 toneladas por hectárea, vendiéndose a precio farm-gate de un dólar cincuenta el kilo. Esa es la base."*
>
> *"En el escenario base de mejora del 20% — que es conservador para un sistema que ataca pérdidas del 15 al 30% — el productor genera 40 toneladas adicionales al año. Eso son 60 mil dólares de valor adicional. Nuestra parte: 18 mil dólares por productor por año. La parte del productor: 42 mil dólares de ingreso que no habría tenido sin nosotros."*
>
> *"Tenemos un pipeline comprometido de 10 productores con aproximadamente 500 hectáreas. Si validamos el piloto y los activamos en el año uno, eso representa 180 mil dólares recurrentes anuales. Nuestro costo operacional es de 30 a 50 mil dólares al año — Salvador, hardware, qPCR de calibración, plataforma. Margen bruto en estado estable: entre 70 y 80%."*
>
> *"La ruta a un millón de dólares de ingresos recurrentes anuales es de aproximadamente 55 productores activos. Es objetivo escalable de mediano plazo, no especulativo."*

---

## SLIDE 9 — Piloto Nextipac

### Contenido visual
- **Headline:** Piloto operacional · 12 meses · Validación científica del modelo
- **Mapa pequeño:** Coordenadas reales 20.75957, -103.51187 (Nextipac, Jalisco)
- **Specs del piloto:**
  - 4 hectáreas de aguacate Hass
  - **8 nodos** (4 tratamiento + 4 testigo, bloques pareados)
  - Lecturas cada 5 minutos: humedad multi-profundidad, temperatura, EC
  - **qPCR quincenal pareado** (microbioma del suelo)
  - Datos climáticos reales vía Open-Meteo
  - **Métrica de validación:** divergencia CUSUM >10% al cierre del ciclo
- **Timeline:**
  - Mayo 2026: deployment de hardware
  - Junio: primera muestra qPCR
  - Agosto: primera calibración del Score con datos reales
  - Octubre: primera divergencia CUSUM medible
  - Mayo 2027: reporte de validación final

### Speaker notes (verbal · 90s)
> *"El piloto está diseñado como un experimento agronómico riguroso, no como un demo de tecnología. Cuatro hectáreas reales en Nextipac, Jalisco. Ocho nodos de sensores divididos en cuatro tratamiento y cuatro testigo, en bloques pareados — esa es la arquitectura experimental que hace que el CUSUM sea científicamente válido."*
>
> *"Cada cinco minutos, los nodos miden humedad a tres profundidades, temperatura del suelo, y conductividad eléctrica. Cada dos semanas, tomamos muestras pareadas de qPCR para medir el microbioma del suelo — Trichoderma, Phytophthora, hongos micorrízicos. Eso nos da el conjunto de datos pareados sensor-microbioma que ningún competidor tiene en andisoles volcánicos."*
>
> *"La métrica de éxito está definida desde el día uno: divergencia CUSUM mayor al 10% entre tratamiento y testigo al cierre del ciclo. Si lo logramos, el modelo de negocio se valida automáticamente y los 10 productores comprometidos del pipeline se activan."*

---

## SLIDE 10 — Equipo

### Contenido visual

**Founder técnico-científico — Ernest Darell Zermeño**
- Estudiante de Administración y Dirección Empresarial · Universidad Panamericana (octavo semestre, graduación dic 2026)
- Estudiante de Biología · Universidad de Guadalajara
- **Sole author** · BMC Genomics (Q1, factor de impacto 4.0) · Aplicaciones de CRISPR en microglia · *Aceptado con minor revisions*
- Diseñador autodidacta de silicio open-source · 2 chips end-to-end en pipelines (TinyTapeout + IEEE SSCS PICO Chipathon track Sensors)
- Líder técnico del repositorio Zafra-Agtech (~14 módulos backend, ~7,000 LOC)

**Co-founder agrónomo — Salvador**
- Presencia diaria en campo en Nextipac
- Relación directa con productores
- Validación agronómica de protocolos en suelo real

### Speaker notes (verbal · 90s)
> *"El equipo tiene una composición que probablemente no han visto en otros pitches agtech. Soy estudiante de admin en UP en mi octavo semestre, simultáneamente estudiante de biología en UdG. Mi formación científica está respaldada por un paper publicado como sole author en BMC Genomics, una revista Q1 indexada en PubMed con factor de impacto cuatro, sobre aplicaciones de CRISPR en microglia. Eso es prueba documentada de que puedo ejecutar un proyecto científico complejo de principio a fin."*
>
> *"El stack técnico de Zafra lo construí yo: backend en Python, dashboard en React, algoritmos del Score Phytophthora, pipeline de WhatsApp, base de datos PostgreSQL. Y aprendí silicon design por mi cuenta para llevar el algoritmo a hardware dedicado en el futuro."*
>
> *"Mi co-founder Salvador es agrónomo con presencia diaria en Nextipac. Él habla el idioma de los productores, conoce el campo personalmente, y es el puente que convierte nuestros datos en relaciones humanas reales. Esa es la combinación: yo construyo y publico, Salvador siembra confianza y opera. Ningún equipo agtech mexicano que conozco tiene esa intersección."*

---

## SLIDE 11 — Ask + cierre

### Contenido visual
- **Ask gigante en el centro:** $500,000 MXN
- **Subtitle:** Para ejecutar el piloto Nextipac de 12 meses
- **Desglose del uso (tabla):**

| Rubro | % aproximado |
|---|---|
| Hardware (sensores, TTGO, gateway, sondas) | 30% |
| Operación (Salvador, viajes, deployment) | 25% |
| Lab (qPCR de microbioma, calibración gravimétrica) | 20% |
| Plataforma (Railway, dominio, herramientas) | 10% |
| Legal (registro marca Nopal IMPI, consulta IP, contratos) | 10% |
| Reserva (5% imprevistos) | 5% |

- **Hitos verificables (timeline):**
  - Mayo: hardware desplegado
  - Junio: primera muestra qPCR
  - Agosto: primera calibración del Score con datos reales
  - Octubre: primera divergencia CUSUM medible
  - Mayo 2027: reporte de validación + activación de pipeline de 10 productores

- **Frase de cierre:**
> *"Si el comité solo se acuerda de una cosa de este pitch: Zafra es el único agtech que cobra solo cuando el productor gana, y los demás estructuralmente no pueden copiarlo."*

### Speaker notes (verbal · 90s)
> *"Para cerrar: lo que les pedimos son 500 mil pesos para ejecutar el piloto Nextipac en doce meses. El uso está desglosado: 30% en hardware, 25% en operación con Salvador en campo, 20% en laboratorio para los qPCR del microbioma, 10% en plataforma, 10% en costos legales que protegen la propiedad intelectual del proyecto, y un 5% de reserva."*
>
> *"Los hitos son verificables y mes a mes: hardware en mayo, primera qPCR en junio, primera calibración real en agosto, primera divergencia CUSUM medible en octubre, reporte final de validación en mayo del año que viene. Si en mayo de 2027 tenemos divergencia CUSUM positiva, los 10 productores comprometidos del pipeline se activan automáticamente y empezamos a generar ingresos recurrentes."*
>
> *"Si solo se acuerdan de una sola cosa de los próximos 20 minutos, quiero que sea ésta: Zafra es el único agtech que cobra solo cuando el productor gana, validado estadísticamente y estructuralmente inmune a copia por incumbents. El hardware es trivial. El insight cultural es lo que cambia el juego, y el modelo de negocio es donde vive la defensa permanente. Gracias."*

---

## Anticipated Q&A — preparación

### Sobre el modelo de negocio
1. **¿Qué pasa si el productor no quiere pagar después de medir el incremento?**
   → Contrato firmado upfront, vinculado al CUSUM auditado. Cláusula de arbitraje en derecho mexicano. CUSUM no es disputable porque es estadístico, transparente, calculable por el productor en tiempo real.

2. **¿Cómo manejan el riesgo de mala cosecha por clima?**
   → CUSUM compara TRATAMIENTO vs TESTIGO en la misma huerta. El clima afecta a ambas parcelas por igual. La divergencia mide el efecto Zafra, no el efecto clima.

3. **¿Cómo escalan a 100+ productores sin clonar a Salvador?**
   → Año 1: Salvador opera. Año 2: documentamos sus protocolos y entrenamos al primer agrónomo adicional. Año 3+: modelo de region managers con agrónomos certificados Zafra. La operación se vuelve replicable, no exclusiva.

4. **¿Qué pasa si CropX baja precios a $0 upfront para responder?**
   → Estructuralmente no pueden sin canibalizar su recurring revenue (ver Slide 6). Pero si lo intentan, nuestro moat secundario son los datos calibrados (18+ meses pareados sensor-qPCR) que ellos no tienen y no pueden generar más rápido sin invertir el mismo tiempo.

### Sobre la tecnología
5. **¿Qué pasa si el modelo del Score Phytophthora no funciona en datos reales?**
   → Es un riesgo real y por eso el piloto tiene 12 meses con muestras qPCR pareadas — exactamente para refinar el modelo con datos reales. La arquitectura del sistema es modular: si el modelo necesita ajuste, se ajusta sin tocar el resto del stack.

6. **¿Por qué no usar simplemente FPGA en vez de un chip custom?**
   → Para el piloto y los primeros 50 productores, todo corre en software en la nube — no necesitamos chip ni FPGA. El chip Nopal-Sense es para el mediano plazo cuando escalemos. FPGA tendría ventaja en velocidad de iteración pero mayor costo unitario y consumo. ASIC custom es el endgame natural.

7. **¿Qué pasa con las afirmaciones del paper de BMC Genomics? ¿Es verificable?**
   → Sí, indexado en PubMed, DOI público, peer-reviewed. Puedo compartir el link directo si lo solicitan.

### Sobre la organización
8. **¿Qué pasa si te aceptan a un PhD en USA?**
   → Estructura prevista: Salvador asume operación diaria. Yo permanezco como founder técnico-científico, posiblemente desde la institución académica. La empresa está diseñada para ser ejecutable sin presencia diaria del founder técnico desde el día uno.

9. **¿Por qué ahora? ¿Por qué este momento?**
   → Tres factores convergen en 2026: (a) las suspensiones USDA a Michoacán empujan inversión a Jalisco, (b) escasez de agua hace que la eficiencia hídrica sea decisión de supervivencia, (c) la generación de productores que construyó las huertas en los 90s está empezando a entregarlas a sus hijos, que sí abren WhatsApp.

10. **¿Qué retorno espera UP de esta inversión?**
    → A definir según el formato preferido por UP: equity, revenue-share, milestones de revisión, o combinación. Recomendación: estructurar como inversión semilla con derecho preferencial de coinversión en rondas futuras + reconocimiento institucional como respaldador del primer agtech de Universidad Panamericana.

---

## Notas operacionales para preparación

- **Diseño visual:** las slides deben tener mucho whitespace, fuente sans-serif limpia (Inter, Roboto, Helvetica), paleta dark premium (la misma del dashboard Zafra-Agtech) — consistencia de marca visible.
- **Slide 5 (modelo de negocio) debe ser visualmente la más impactante** del deck. Es el clímax narrativo. Diséñala con peso visual.
- **Slide 7 (chips Nopal) debe ser deliberadamente más sobria** que la 5 — no robarle protagonismo al modelo de negocio.
- **Imprime el One Pager** y déjalo como leave-behind al final del pitch. Esa hoja es lo que el comité va a llevarse para releer en privado.
- **Lleva el repo de Zafra-Agtech abierto en una pestaña de tu laptop** durante el Q&A — si alguien pregunta algo técnico verificable, lo abres y se lo enseñas en pantalla. Eso convierte cualquier escepticismo en confirmación instantánea.
- **Practica el verbal completo del deck en voz alta al menos 5 veces antes del 25 de mayo.** El verbal del cierre (Slide 11) en particular debe quedar memorizado palabra por palabra — no improvisado.

---

*Documento preparado para pitch del 25 de mayo de 2026 · Universidad Panamericana · Comité de Inversión*
