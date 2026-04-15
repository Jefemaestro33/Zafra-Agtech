# ZAFRA · One Pager

**Plataforma de agricultura inteligente para aguacate Hass mexicano · Modelo revenue-share · Piloto activo en Nextipac, Jalisco**

---

## El problema

*Phytophthora cinnamomi* mata **15–30% de la producción anual de aguacate Hass** en Jalisco. Los productores pierden producción que ningún player tecnológico actual puede recuperar: CropX y SupPlant cobran $500–2,000 USD/ha **upfront**, requieren capital que el productor mexicano no tiene, y operan con dashboards que un productor de 55 años no abre. El mercado de exportación de aguacate ($3.5B USD/año, 34% mundial) tiene un gap de rendimiento del 50–100% vs benchmarks internacionales — gap que **nadie ha cerrado** porque los players actuales no entienden la economía rural mexicana.

## La solución

**Zafra detecta condiciones de Phytophthora 72+ horas antes de que aparezca síntoma foliar** usando un algoritmo predictivo propietario (Score Phytophthora v3, 10 factores con interacciones multiplicativas) sobre instrumentación IoT estándar (sensores de humedad multi-profundidad, temperatura, EC, gateway LoRa). El sistema convierte datos crudos en **recetas accionables enviadas por WhatsApp**: "no riegues hasta el jueves", "aplica Trichoderma esta ventana". El insight técnico no está en los sensores — está en lo que el sistema **decide** con esos datos.

## El modelo de negocio (lo que cambia el juego)

**Revenue-share 30% del incremento medido vs parcela testigo. $0 upfront para el productor.** Cobramos **solo si funcionamos**, validado por análisis CUSUM estadístico (divergencia >4σ sostenida >2 semanas entre parcelas tratadas y control). Auditable, transparente, no disputable. **Estructuralmente inmune a copia por incumbents**: CropX/SupPlant no pueden pivotear a este modelo sin canibalizar su recurring revenue y romper su tesis de inversión. Es la única respuesta que cierra el gap de adopción del 95% del mercado mexicano de aguacate.

## Unit economics

| Predio típico (20 ha · 10 ton/ha · $1.50/kg) | Mejora 20% |
|---|---|
| Producción adicional | 40 ton |
| Valor adicional anual | $60K USD |
| Zafra (30%) | **$18K USD** |
| Productor (70%) | $42K USD |

**Pipeline:** 10 productores comprometidos, ~500 ha agregadas. **Conservador 10 × $18K = $180K USD/año recurrente** post primer ciclo. Costo operacional: $30–50K/año. **Margen bruto: 70–80%.**

## Tracción · Piloto Nextipac

Piloto operacional de **12 meses en 4 hectáreas con 8 nodos** (4 tratamiento + 4 testigo), arrancando mayo 2026. Datos pareados sensor-microbioma (qPCR quincenal) calibrando el Score v3 con muestras reales de andisol volcánico. Métrica de validación: divergencia CUSUM >10% al cierre del ciclo.

## Equipo

**Founder técnico-científico**: Estudiante de Admin (UP, octavo semestre) + Biología (UdG). Sole author en BMC Genomics (Q1) sobre aplicaciones CRISPR en microglia. Diseñador autodidacta de silicio open-source: dos chips activos en TinyTapeout y IEEE SSCS PICO Chipathon (track Sensors). **Co-founder agrónomo**: Salvador, presencia diaria en campo, relación directa con productores.

## Defensa de mediano plazo

Línea de chips **Nopal** en desarrollo paralelo: Nopal-Demo (TinyTapeout TTSKY26a, fab nov 2026) + Nopal-Sense (IEEE SSCS PICO Chipathon 2026, mentoría semanal por experto IEEE en silicon design). Materializa el algoritmo en hardware dedicado para escalamiento >100 productores. **No es el producto — es el moat de mediano plazo.**

## Ask

**$500K MXN** para ejecutar el piloto Nextipac en 12 meses. Hitos verificables: deployment de hardware (mayo), primera muestra qPCR (junio), calibración inicial (agosto), divergencia CUSUM medible (octubre), reporte de validación (mayo 2027).

---

**Ernest Darell Zermeño** · Founder · Guadalajara, Jalisco · *contact: [tu email]*
