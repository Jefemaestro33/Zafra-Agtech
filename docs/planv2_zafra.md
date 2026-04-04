# PLAN v2 ZAFRA — Mejoras Tecnicas para Maximizar Rendimiento

## Modificaciones al Sistema AgTech Basadas en Analisis Profundo del Codigo

**Version 1.0** — 3 de abril de 2026
Guadalajara, Jalisco

**Objetivo:** Convertir el sistema de "monitor con alertas" a "prescriptor de riego y manejo" — maximizando el incremento real en toneladas de aguacate por hectarea.

---

## INDICE DE PRIORIDADES

| Prioridad | Modulo | Impacto en rendimiento | Esfuerzo |
|-----------|--------|----------------------|----------|
| **P0** | Protocolo de calibracion en campo | CRITICO — sin esto todo lo demas falla | 1-2 dias campo |
| **P1** | Score Phytophthora v3 | ALTO — previene 50-80% de episodios | 4-6h codigo |
| **P2** | Balance hidrico prescriptivo (modulo nuevo) | MUY ALTO — 60% del impacto total | 8-12h codigo |
| **P3** | Registro de riegos y tratamientos | ALTO — cierra el ciclo de datos | 3-4h codigo |
| **P4** | Pipeline WhatsApp | ALTO — canal de entrega real | 4-6h codigo |
| **P5** | Mejoras firma hidrica | MEDIO — precision en investigacion | 4-6h codigo |
| **P6** | Mejoras CUSUM | MEDIO — mejor demostracion de ROI | 3-4h codigo |
| **P7** | Mejoras Claude AI | MEDIO — mejores recomendaciones | 2-3h codigo |
| **P8** | Reposicionamiento modelo microbioma | BAJO — honestidad cientifica | 2h documentacion |

---

# FASE 0: PROTOCOLO DE CALIBRACION EN CAMPO (antes de confiar en cualquier dato)

## 0.1 Por que esto es critico

Los sensores capacitivos miden permitividad dielectrica y la convierten a % VWC usando una ecuacion de calibracion generica (tipo Topp). **En andisoles volcanicos con alofana, la calibracion generica tiene error de 5-15% VWC.** Esto significa que cuando el sensor dice 45% (alerta de saturacion), el suelo real podria estar en 35% (perfectamente seguro) o en 55% (ya danado).

Sin calibracion in situ, todo el Score Phytophthora opera sobre numeros incorrectos.

## 0.2 Protocolo de calibracion gravimetrica

**Material necesario:** Barrena, bolsas ziplock, balanza de precision (0.1g), estufa de laboratorio (105°C).

**Procedimiento (primer dia de instalacion de sensores):**

```
Para cada profundidad (10cm, 20cm, 30cm):
  1. Instalar sensor
  2. Tomar muestra de suelo ADYACENTE al sensor (cilindro de 5cm diametro)
  3. Registrar lectura del sensor (VWC_sensor)
  4. Pesar muestra humeda (M_humedo)
  5. Secar en estufa 105°C por 24 horas
  6. Pesar muestra seca (M_seco)
  7. Calcular VWC_real = (M_humedo - M_seco) / Volumen_cilindro × 100

Repetir en 3 condiciones:
  a) Suelo seco (antes de regar, 3+ dias sin agua)
  b) Capacidad de campo (24h despues de riego abundante)
  c) Saturacion (inmediatamente despues de riego, charcos visibles)

Esto da 9 puntos de calibracion por profundidad (3 condiciones × 3 replicas).
```

**Resultado:** Ecuacion de correccion lineal por profundidad:

```python
VWC_real = a × VWC_sensor + b

# Ejemplo (valores hipoteticos para andisol):
# a = 1.15, b = -3.2  →  Sensor dice 40%, real es 42.8%
# a = 0.85, b = +5.0  →  Sensor dice 45%, real es 43.25%
```

## 0.3 Calibracion de umbrales de Phytophthora

Con los datos gravimetricos, determinar:

| Umbral | Metodo de medicion | Valor a registrar |
|--------|-------------------|-------------------|
| **VWC_saturacion** | Regar hasta charcos, leer sensor inmediatamente | VWC donde el suelo esta visualmente saturado |
| **VWC_capacidad_campo** | 24h despues de saturacion, sin lluvia | VWC cuando el drenaje gravitacional termino |
| **VWC_punto_marchitez** | Suelo seco, hojas empezando a caer | VWC minimo antes de estres hidrico |
| **VWC_punto_riego** | Entre CC y PM, ~60% del agua util agotada | VWC donde deberia iniciarse el riego |

Estos valores reemplazan los hardcodeados en `alertas.py`:

```python
# ACTUAL (generico):
UMBRAL_RIEGO = 28.0
# Factor h10: if h10 > 45: pts = 15

# DESPUES DE CALIBRACION (especifico para Nextipac):
UMBRAL_RIEGO = VWC_punto_riego  # del protocolo
UMBRAL_SATURACION = VWC_saturacion  # del protocolo
UMBRAL_MODERADO = VWC_capacidad_campo + 2  # ligeramente arriba de CC
```

## 0.4 Correccion por temperatura

Los sensores capacitivos derivan con temperatura. Medir el coeficiente:

```
Procedimiento:
  1. En suelo seco estable (sin regar 5 dias)
  2. Registrar lecturas cada 5 min durante 48h
  3. Calcular correlacion entre h10 y t20
  4. Obtener coeficiente α: Δh10 / Δt20 (tipico: 0.1-0.3% VWC/°C)

Correccion:
  h10_corregido = h10_raw - α × (t20 - t20_referencia)
  donde t20_referencia = promedio de t20 durante calibracion
```

## 0.5 Donde se implementa

**Nuevo archivo:** `backend/calibracion.py`

```python
# Configuracion de calibracion por predio
# Estos valores se actualizan despues del protocolo de campo

CALIBRACION = {
    "nextipac": {
        # Correccion lineal por profundidad: VWC_real = a * VWC_sensor + b
        "h10": {"a": 1.0, "b": 0.0},  # DEFAULT: sin correccion
        "h20": {"a": 1.0, "b": 0.0},
        "h30": {"a": 1.0, "b": 0.0},

        # Coeficiente de temperatura (VWC/°C)
        "alpha_temp": 0.0,  # DEFAULT: sin correccion
        "t20_referencia": 22.0,

        # Umbrales calibrados (% VWC REAL, no sensor)
        "vwc_saturacion": 55.0,   # DEFAULT: literatura
        "vwc_capacidad_campo": 38.0,
        "vwc_punto_riego": 28.0,
        "vwc_marchitez": 18.0,

        # Profundidad de agua util (mm) entre CC y PM
        # Se calcula: (CC - PM) / 100 × profundidad_raiz_mm
        "agua_util_mm": 60.0,  # DEFAULT: estimacion para 30cm de raiz
    }
}

def corregir_lectura(h_raw, t20, profundidad, predio="nextipac"):
    """Aplica calibracion gravimetrica + correccion por temperatura."""
    cal = CALIBRACION[predio]
    prof_key = f"h{profundidad}"

    # Correccion lineal
    h_cal = cal[prof_key]["a"] * h_raw + cal[prof_key]["b"]

    # Correccion por temperatura
    h_corr = h_cal - cal["alpha_temp"] * (t20 - cal["t20_referencia"])

    return round(h_corr, 2)
```

**Impacto:** `alertas.py`, `firma_hidrica.py`, `comparativo.py` y `modelo_microbioma.py` llaman a `corregir_lectura()` antes de cualquier calculo. Los umbrales del Score Phytophthora se leen de la configuracion en vez de estar hardcodeados.

---

# FASE 1: SCORE PHYTOPHTHORA v3

## 1.1 Cambios respecto a v2

### Cambio 1: Factor de interaccion saturacion × temperatura

**Problema:** El score actual es aditivo lineal. h10>45 + t20 en [22-28] = 15+20 = 35 pts. Pero biologicamente, la combinacion es multiplicativamente peor (zoosporas se liberan exponencialmente mas rapido en agua caliente).

**Solucion:** Agregar un multiplicador cuando coinciden saturacion Y temperatura optima.

```python
# NUEVO — despues de calcular todos los factores individuales:

# Factor de interaccion: saturacion + temperatura optima
es_saturado = (h10 > UMBRAL_SATURACION) or (h20 > UMBRAL_SATURACION)
es_temp_optima = 22 <= t20 <= 28

if es_saturado and es_temp_optima:
    # Multiplicar subtotal por 1.3 (30% mas peligroso cuando coinciden)
    score = int(score * 1.3)

score = min(score, 100)
```

**Justificacion:** Hardham & Blackman (2018): "Zoospore release is exponentially increased when saturated conditions coincide with temperatures in the 22-28°C range, as both mycelial growth and sporangium formation are simultaneously optimized."

### Cambio 2: Ponderar h20 mas que h10

**Problema:** h10 y h20 tienen el mismo peso (15 pts). Pero la zona radicular activa de aguacate maduro esta entre 15-40cm. Saturacion a 20cm es mas peligrosa que a 10cm.

**Solucion:**

```python
# ANTES:
# h10 > 45: 15 pts
# h20 > 45: 15 pts

# DESPUES:
# h10 > saturacion: 10 pts  (reducido — zona superficial)
# h20 > saturacion: 20 pts  (aumentado — zona radicular)
```

### Cambio 3: Integrar tau como Factor 8

**Problema:** Un nodo con tau=8h (buen drenaje) y uno con tau=25h (drenaje lento) tienen el mismo score si su VWC instantaneo es igual. Pero el de tau alto es mucho mas peligroso porque la saturacion va a durar mas.

**Solucion:**

```python
# Factor 8: Constante de secado (estructura del suelo)
ultimo_tau = get_ultimo_tau(conn, nodo_id)  # de firma_hidrica
if ultimo_tau is not None:
    if ultimo_tau > 24:
        pts = 10   # Drenaje muy lento — suelo comprometido
    elif ultimo_tau > 18:
        pts = 5    # Drenaje lento — precaucion
    else:
        pts = 0    # Drenaje normal
    desglose["tau_estructura"] = {
        "valor": ultimo_tau,
        "puntos": pts,
        "umbral": ">24h=10, >18h=5"
    }
    score += pts
```

### Cambio 4: Factor de saturacion dual (ambas profundidades)

**Problema:** h10 saturado pero h20 seco = riesgo moderado. Ambos saturados = riesgo alto. Esto no se captura con factores independientes.

**Solucion:**

```python
# Factor 9: Saturacion dual
if h10 > UMBRAL_SATURACION and h20 > UMBRAL_SATURACION:
    pts = 10  # Ambas profundidades saturadas — columna de agua completa
    desglose["saturacion_dual"] = {
        "valor": f"h10={h10:.1f}, h20={h20:.1f}",
        "puntos": pts,
        "umbral": "ambos > saturacion"
    }
    score += pts
```

### Resumen: Score Phytophthora v3 (10 factores)

| # | Factor | Peso max | Cambio vs v2 |
|---|--------|----------|--------------|
| 1 | Humedad 10cm | 10 pts | Reducido de 15 (superficial, menos critico) |
| 2 | Humedad 20cm | 20 pts | Aumentado de 15 (zona radicular) |
| 3 | Temperatura suelo 20cm | 20 pts | Sin cambio |
| 4 | Horas humedo continuas | 15 pts | Sin cambio |
| 5 | Precipitacion acumulada 7d | 10 pts | Sin cambio |
| 6 | Pronostico lluvia 48h | 5 pts | Sin cambio |
| 7 | HR ambiente 48h | 5 pts | Sin cambio |
| 8 | **tau estructura del suelo (NUEVO)** | **10 pts** | **Nuevo — integra firma hidrica** |
| 9 | **Saturacion dual (NUEVO)** | **10 pts** | **Nuevo — ambas profundidades** |
| 10 | **Interaccion saturacion×temp (NUEVO)** | **×1.3** | **Nuevo — multiplicador** |
| | **Maximo teorico** | **~130 → cap 100** | |

### Donde se implementa

**Archivo:** `backend/alertas.py` — funcion `calcular_score_phytophthora()`

**Dependencia nueva:** Necesita acceso a `firma_hidrica` (ultimo tau del nodo).

```python
def get_ultimo_tau(conn, nodo_id):
    """Obtiene el ultimo tau_10 calculado para el nodo."""
    sql = """
        SELECT tau_10 FROM firma_hidrica
        WHERE nodo_id = %s AND tau_10 IS NOT NULL
        ORDER BY evento_riego DESC LIMIT 1
    """
    with conn.cursor() as cur:
        cur.execute(sql, (nodo_id,))
        row = cur.fetchone()
    return row[0] if row else None
```

---

# FASE 2: BALANCE HIDRICO PRESCRIPTIVO (modulo nuevo)

## 2.1 Por que esto es la mejora mas importante

Actualmente el sistema dice: "no riegues hoy" o "necesita riego". Esto es **reactivo**.

Un sistema **prescriptivo** dice: "riega 18mm manana a las 6am. No riegues hasta el jueves." Esto es dramaticamente mas util para el productor.

Ya tienes todos los ingredientes:
- ETo horario calculado en `clima.py` (Penman-Monteith)
- Humedad del suelo en tiempo real a 3 profundidades
- Precipitacion real y pronosticada

Solo falta conectarlos.

## 2.2 El modelo de balance hidrico

```
Balance diario:

  Agua_disponible(t) = Agua_disponible(t-1) + Riego + Lluvia - ETo × Kc - Drenaje

Donde:
  - Agua_disponible = (VWC_actual - VWC_marchitez) × profundidad_raiz
  - ETo = evapotranspiracion de referencia (ya calculada en clima.py)
  - Kc = coeficiente de cultivo para aguacate (0.6-0.85 segun fenologia)
  - Drenaje = exceso sobre capacidad de campo (lo que se pierde por gravedad)

Decision de riego:
  Si Agua_disponible < 40% del Agua_util_total → RECOMENDAR RIEGO
  Cantidad = (Capacidad_campo - VWC_actual) × profundidad_raiz × area
  Cuando = manana temprano (6-8am) si no hay lluvia pronosticada

Decision de NO riego:
  Si VWC_actual > VWC_capacidad_campo → NO REGAR (exceso)
  Si Pronostico_lluvia_24h > 10mm → ESPERAR lluvia
  Si VWC_actual > 60% del Agua_util → NO URGENTE
```

## 2.3 Coeficiente de cultivo (Kc) para aguacate Hass

| Mes | Fenologia | Kc | Fuente |
|-----|-----------|------|--------|
| Ene-Feb | Reposo relativo / inicio floracion | 0.60 | FAO-56, Carr 2013 |
| Mar-Abr | Floracion plena / cuajado | 0.70 | Requiere mas agua para fruto |
| May-Jun | Desarrollo de fruto | 0.80 | Fase de maximo consumo |
| Jul-Ago | Llenado de fruto | 0.85 | Pico de demanda hidrica |
| Sep-Oct | Maduracion | 0.75 | Demanda empieza a bajar |
| Nov-Dic | Post-cosecha / reposo | 0.60 | Minimo consumo |

## 2.4 Implementacion

**Nuevo archivo:** `backend/balance_hidrico.py`

```python
"""
balance_hidrico.py — Programacion de riego prescriptiva
Combina: ETo (clima.py) + VWC (lecturas) + calibracion → receta de riego

CLI:
  python balance_hidrico.py --receta 1     Receta de riego para predio 1
  python balance_hidrico.py --balance 3    Balance hidrico del nodo 3
"""

from calibracion import CALIBRACION, corregir_lectura

# Kc mensual para aguacate Hass (Jalisco)
KC_AGUACATE = {
    1: 0.60, 2: 0.60, 3: 0.70, 4: 0.70,
    5: 0.80, 6: 0.80, 7: 0.85, 8: 0.85,
    9: 0.75, 10: 0.75, 11: 0.60, 12: 0.60,
}

def calcular_balance(conn, nodo_id, predio="nextipac"):
    """
    Calcula balance hidrico actual y genera receta de riego.
    Retorna dict con: estado, deficit_mm, receta, proxima_fecha_riego.
    """
    cal = CALIBRACION[predio]

    # 1. Obtener VWC actual (corregido)
    ultima = get_ultima_lectura(conn, nodo_id)
    h10 = corregir_lectura(ultima["h10_avg"], ultima["t20"], 10, predio)
    h20 = corregir_lectura(ultima["h20_avg"], ultima["t20"], 20, predio)
    h30 = corregir_lectura(ultima["h30_avg"], ultima["t20"], 30, predio)

    # 2. Calcular agua disponible actual (mm)
    # Promedio ponderado de las 3 profundidades (0-30cm de raiz)
    vwc_promedio = (h10 * 0.3 + h20 * 0.4 + h30 * 0.3)  # h20 pesa mas (zona radicular)
    agua_actual = (vwc_promedio - cal["vwc_marchitez"]) / 100 * 300  # mm en 30cm
    agua_util_total = cal["agua_util_mm"]  # mm entre CC y PM
    fraccion_disponible = agua_actual / agua_util_total if agua_util_total > 0 else 0

    # 3. Obtener ETo acumulado y pronostico
    eto_hoy = get_eto_acumulado_hoy(conn)  # mm
    eto_manana = get_eto_pronostico_manana(conn)  # mm
    lluvia_pronostico_48h = get_pronostico_lluvia_48h(conn)  # mm

    # 4. Kc del mes actual
    mes = datetime.now().month
    kc = KC_AGUACATE[mes]
    etc_manana = eto_manana * kc  # ETc = consumo real del aguacate manana

    # 5. Decision de riego
    resultado = {
        "nodo_id": nodo_id,
        "vwc_promedio": round(vwc_promedio, 1),
        "agua_disponible_mm": round(agua_actual, 1),
        "fraccion_disponible": round(fraccion_disponible, 2),
        "eto_hoy_mm": round(eto_hoy, 1),
        "etc_manana_mm": round(etc_manana, 1),
        "lluvia_pronostico_48h": round(lluvia_pronostico_48h, 1),
        "kc": kc,
    }

    # Regla 1: Suelo sobre capacidad de campo → NO REGAR
    if vwc_promedio > cal["vwc_capacidad_campo"]:
        resultado["receta"] = "NO REGAR"
        resultado["razon"] = (
            f"Suelo a {vwc_promedio:.0f}% VWC, arriba de capacidad de campo "
            f"({cal['vwc_capacidad_campo']}%). Riesgo de saturacion."
        )
        resultado["urgencia"] = "ninguna"
        # Estimar cuando regar
        exceso = vwc_promedio - cal["vwc_punto_riego"]
        dias_espera = exceso / (etc_manana if etc_manana > 0 else 2.0)
        resultado["proxima_revision"] = f"en {max(1, int(dias_espera))} dias"
        return resultado

    # Regla 2: Lluvia pronosticada significativa → ESPERAR
    if lluvia_pronostico_48h > 10:
        resultado["receta"] = "ESPERAR LLUVIA"
        resultado["razon"] = (
            f"Pronostico de {lluvia_pronostico_48h:.0f}mm en proximas 48h. "
            f"Si llueve, no sera necesario regar."
        )
        resultado["urgencia"] = "baja"
        return resultado

    # Regla 3: Agua disponible < 40% → REGAR
    if fraccion_disponible < 0.40:
        deficit_mm = (cal["vwc_capacidad_campo"] - vwc_promedio) / 100 * 300
        resultado["receta"] = f"REGAR {deficit_mm:.0f}mm"
        resultado["cuando"] = "manana 6:00-8:00 AM"
        resultado["razon"] = (
            f"Agua util al {fraccion_disponible*100:.0f}%. "
            f"Necesita {deficit_mm:.0f}mm para llegar a capacidad de campo."
        )
        resultado["urgencia"] = "alta" if fraccion_disponible < 0.25 else "media"
        # Convertir mm a litros por arbol (asumiendo 6m × 6m de marco)
        litros_arbol = deficit_mm * 36  # 36 m2 por arbol × mm → litros
        resultado["litros_por_arbol"] = round(litros_arbol, 0)
        return resultado

    # Regla 4: Agua disponible 40-60% → MONITOREAR
    resultado["receta"] = "NO REGAR AUN"
    dias_hasta_riego = (fraccion_disponible - 0.40) * agua_util_total / (etc_manana if etc_manana > 0 else 2.0)
    resultado["razon"] = (
        f"Agua util al {fraccion_disponible*100:.0f}%. "
        f"Consumo estimado manana: {etc_manana:.1f}mm. "
        f"Regar en ~{max(1, int(dias_hasta_riego))} dias si no llueve."
    )
    resultado["urgencia"] = "ninguna"
    resultado["proxima_revision"] = f"en {max(1, int(dias_hasta_riego))} dias"

    return resultado


def generar_receta_whatsapp(resultado):
    """Convierte el resultado del balance en mensaje para WhatsApp."""
    r = resultado
    if r["receta"].startswith("REGAR"):
        return (
            f"Riego para manana:\n"
            f"Aplicar {r.get('litros_por_arbol', '?')} litros por arbol "
            f"entre 6 y 8 de la manana.\n"
            f"Razon: el suelo tiene {r['fraccion_disponible']*100:.0f}% "
            f"de agua disponible.\n"
            f"No volver a regar hasta nueva indicacion."
        )
    elif r["receta"] == "ESPERAR LLUVIA":
        return (
            f"No regar por ahora.\n"
            f"Se esperan {r['lluvia_pronostico_48h']:.0f}mm de lluvia "
            f"en las proximas 48 horas.\n"
            f"Si llueve bien, no sera necesario regar."
        )
    elif r["receta"] == "NO REGAR":
        return (
            f"No regar.\n"
            f"El suelo todavia tiene suficiente agua "
            f"({r['vwc_promedio']:.0f}% humedad).\n"
            f"Revisar {r.get('proxima_revision', 'en 2-3 dias')}."
        )
    else:
        return (
            f"Riego no urgente.\n"
            f"Suelo al {r['fraccion_disponible']*100:.0f}% de agua disponible.\n"
            f"Proximo riego estimado {r.get('proxima_revision', 'en 2-3 dias')} "
            f"si no llueve."
        )
```

## 2.5 Integracion con el sistema

**API endpoint nuevo:** `GET /api/balance/{nodo_id}` — retorna receta de riego

**Dashboard:** Nueva seccion en Overview o en vista de Nodo Detalle:
- KPI: "Proximo riego: jueves 6am, 540 litros/arbol"
- Barra visual: agua disponible vs agua util total (como una barra de bateria)

**WhatsApp:** `generar_receta_whatsapp()` se integra en el cronjob de alertas diario

**Impacto estimado:** Este modulo solo podria generar el **60% del incremento total** de rendimiento. Pasar de riego por intuicion a riego por balance hidrico esta documentado en la literatura como 10-20% de mejora en aguacate (Silber et al., 2019; Schaffer et al., 2013).

---

# FASE 3: REGISTRO DE RIEGOS Y TRATAMIENTOS

## 3.1 Por que es necesario

Sin registrar CUANDO y CUANTO se rego, no puedes:
- Cerrar el balance hidrico (necesitas Riego como input)
- Distinguir un evento de riego de un evento de lluvia en firma_hidrica
- Correlacionar tratamientos con resultados en CUSUM
- Generar registros de trazabilidad para exportacion

## 3.2 Schema SQL nuevo

**Migracion:** `backend/migrations/002_registro_riegos.sql`

```sql
-- Tabla de eventos de riego (separada de tratamientos biologicos)
CREATE TABLE IF NOT EXISTS riegos (
    id              SERIAL PRIMARY KEY,
    tiempo          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    predio_id       INTEGER REFERENCES predios(predio_id),
    metodo          VARCHAR(30),      -- 'gravedad', 'manguera', 'goteo', 'aspersion', 'lluvia'
    duracion_min    REAL,             -- minutos de riego
    volumen_litros  REAL,             -- litros totales (si se conoce)
    mm_estimados    REAL,             -- mm equivalentes
    zona            VARCHAR(50),      -- 'todo', 'bloque_1', 'bloque_2', etc.
    registrado_por  VARCHAR(50),      -- 'agronomo', 'productor', 'sensor' (auto-detectado)
    notas           TEXT
);

CREATE INDEX idx_riegos_predio_tiempo ON riegos (predio_id, tiempo DESC);

-- Agregar columna predio_id a nodos si no existe
ALTER TABLE nodos ADD COLUMN IF NOT EXISTS predio_id INTEGER REFERENCES predios(predio_id);
```

## 3.3 API endpoints nuevos

```
POST /api/riegos
  Body: { predio_id, metodo, duracion_min, volumen_litros, zona, notas }
  Uso: El agronomo registra riego desde el dashboard o desde un form rapido en movil

GET /api/riegos?predio_id=1&dias=30
  Uso: Historial de riegos para balance hidrico y reportes

POST /api/tratamientos
  Body: { nodo_id, tipo, producto, cantidad, unidad, notas }
  Uso: Registrar aplicacion de Trichoderma, AMF, etc.
```

## 3.4 Auto-deteccion de riego desde sensores

Ademas del registro manual, el sistema puede inferir riegos automaticamente:

```python
def detectar_riego_vs_lluvia(conn, nodo_id, evento_timestamp):
    """
    Distingue un evento de mojado causado por riego vs lluvia.
    Usa: precipitacion en clima + patron de mojado.
    """
    # Obtener precipitacion en las 2 horas alrededor del evento
    precip = get_precipitacion_ventana(conn, evento_timestamp, horas=2)

    if precip > 5.0:
        return "lluvia"  # Hay precipitacion registrada
    else:
        return "riego"   # Sin lluvia → fue riego manual

    # FUTURO: tambien verificar si el patron es uniforme (riego)
    # vs. puntual (lluvia intensa)
```

## 3.5 Dashboard: form rapido de registro

**Vista:** Widget en sidebar o boton flotante en mobile:

```
+--REGISTRAR RIEGO---------+
|                           |
| Fecha: [hoy]  Hora: [07] |
| Metodo: [Manguera ▼]     |
| Duracion: [___] min      |
| Zona: [Todo el predio ▼] |
|                           |
| [Guardar]                 |
+---------------------------+
```

Esto debe ser RAPIDO — 3 taps en movil. Si es complicado, el agronomo no lo usara.

---

# FASE 4: PIPELINE WHATSAPP

## 4.1 Arquitectura

```
Cronjob (cada hora):
  alertas.py → evalua todos los nodos
      │
      ├─ Si hay alerta CRITICA o ALTA:
      │    llm_consultor.py → diagnostico
      │    → WhatsApp INMEDIATO al agronomo
      │
      └─ Si hay receta de riego nueva:
           balance_hidrico.py → receta
           → WhatsApp al agronomo + productor

Cronjob (diario, 6:00 AM):
  balance_hidrico.py → receta del dia
  → WhatsApp al agronomo + productor
  Mensaje tipo: "Buenos dias. Hoy no regar, el suelo tiene
  suficiente agua (38%). Proximo riego estimado: jueves."

Cronjob (semanal, lunes 7:00 AM):
  llm_consultor.py → reporte_agricultor
  → WhatsApp al productor
  Mensaje tipo: "Reporte semanal de tu huerta: [5 oraciones max]"
```

## 4.2 Implementacion con Meta Cloud API

**Nuevo archivo:** `backend/whatsapp.py`

```python
"""
whatsapp.py — Envio de mensajes via Meta Cloud API (WhatsApp Business)

Requiere:
  WHATSAPP_TOKEN=<token de Meta Business>
  WHATSAPP_PHONE_ID=<phone number ID>
  AGRONOMO_PHONE=521XXXXXXXXXX
  PRODUCTOR_PHONE=521XXXXXXXXXX
"""
import os
import httpx
import logging

log = logging.getLogger("whatsapp")

TOKEN = os.environ.get("WHATSAPP_TOKEN", "")
PHONE_ID = os.environ.get("WHATSAPP_PHONE_ID", "")
API_URL = f"https://graph.facebook.com/v19.0/{PHONE_ID}/messages"


def enviar_mensaje(telefono, mensaje):
    """Envia mensaje de texto por WhatsApp."""
    if not TOKEN or not PHONE_ID:
        log.warning("WhatsApp no configurado, mensaje no enviado")
        return False

    response = httpx.post(
        API_URL,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
        json={
            "messaging_product": "whatsapp",
            "to": telefono,
            "type": "text",
            "text": {"body": mensaje[:4096]},  # limite WhatsApp
        },
        timeout=30,
    )

    if response.status_code == 200:
        log.info(f"WhatsApp enviado a {telefono[-4:]}")
        return True
    else:
        log.error(f"WhatsApp fallo: {response.status_code} {response.text[:200]}")
        return False
```

## 4.3 Prioridad

Este pipeline es **mas importante que cualquier mejora algoritmica**. Todas las mejoras del mundo no sirven si el productor no recibe el mensaje. El dashboard es para el equipo tecnico; WhatsApp es el producto real.

---

# FASE 5: MEJORAS FIRMA HIDRICA

## 5.1 Filtro anti-ruido

**Problema:** Sensores capacitivos reales tienen spikes por temperatura, contacto con raices, y ruido electrico.

**Solucion:** Filtro de mediana movil antes de detectar eventos.

```python
def filtrar_mediana(valores, ventana=7):
    """Filtro de mediana movil (ventana de 7 lecturas = 35 min)."""
    import numpy as np
    resultado = np.copy(valores)
    half = ventana // 2
    for i in range(half, len(valores) - half):
        resultado[i] = np.nanmedian(valores[i - half:i + half + 1])
    return resultado
```

**Donde:** En `detectar_eventos_mojado()`, aplicar `filtrar_mediana(h10_array)` antes de calcular deltas.

## 5.2 Correccion por temperatura

**Problema:** Ciclo diurno de temperatura causa cambios aparentes de 1-2% VWC que generan falsos eventos.

**Solucion:** Usar `corregir_lectura()` de `calibracion.py` antes de procesar.

```python
# En detectar_eventos_mojado():
# ANTES:
h10_curr = rows[i][1]  # h10_avg crudo

# DESPUES:
h10_curr = corregir_lectura(rows[i][1], rows[i][4], 10)  # h10 corregido por temp
```

## 5.3 Modelo biexponencial (opcional, para investigacion)

**Para probar durante el piloto (no critico para produccion):**

```python
def _modelo_secado_biexp(t, h_residual, a1, tau1, a2, tau2):
    """Biexponencial: fase rapida (gravitacional) + fase lenta (capilar)."""
    return h_residual + a1 * np.exp(-t / tau1) + a2 * np.exp(-t / tau2)

# Usar si R2 de biexp > R2 de monoexp + 0.05
# tau1 = drenaje gravitacional (tipico 2-6h en andisol)
# tau2 = retencion capilar (tipico 20-60h en andisol con alofana)
```

**Valor:** Si funciona, permite separar el drenaje rapido (que puedes mejorar con aireacion) del lento (propiedad intrinseca de la alofana). Esto es publicable.

---

# FASE 6: MEJORAS CUSUM

## 6.1 Mas variables a trackear

**Agregar al analisis comparativo:**

```python
# En calcular_medias_diarias(), agregar:
# - delta_ec30: cambios en conductividad (actividad microbiana)
# - delta_t20: cambios en inercia termica (indica diferente contenido de agua)

# Y en analizar_bloques():
cusum_ec30 = cusum(deltas_ec30) if ec_valid > 35 else None
```

## 6.2 Renombrar tipos de divergencia

**Problema:** "incremento" y "decremento" no comunican que significan agronomicamente.

```python
# ANTES:
alarmas.append({"tipo": "incremento", ...})
alarmas.append({"tipo": "decremento", ...})

# DESPUES:
if variable == "delta_h10":
    if tipo == "incremento":
        tipo_legible = "tratamiento_retiene_mas_agua"  # podria ser malo
    else:
        tipo_legible = "tratamiento_drena_mejor"  # probablemente bueno

elif variable == "delta_tau":
    if tipo == "incremento":
        tipo_legible = "tratamiento_seca_mas_lento"  # posible compactacion
    else:
        tipo_legible = "tratamiento_seca_mas_rapido"  # mejor estructura
```

## 6.3 Reporte de tamano del efecto

**Agregar al resultado de cada bloque:**

```python
# Despues de detectar divergencia, calcular magnitude practica:
if alarmas:
    # Promedio de delta post-divergencia
    idx_primera_alarma = alarmas[0]["dia"]
    deltas_post = [d for d in diferencias[idx_primera_alarma:] if not np.isnan(d)]
    efecto_promedio = np.mean(deltas_post) if deltas_post else 0

    resultado["efecto_promedio_vwc"] = round(efecto_promedio, 2)
    resultado["interpretacion"] = (
        f"En promedio, las parcelas de tratamiento tienen "
        f"{abs(efecto_promedio):.1f}% VWC "
        f"{'menos' if efecto_promedio < 0 else 'mas'} que testigo. "
        f"{'Esto sugiere mejor drenaje (positivo).' if efecto_promedio < 0 else 'Monitorear.'}"
    )
```

---

# FASE 7: MEJORAS CLAUDE AI

## 7.1 Contexto acumulativo

**Problema:** Cada consulta a Claude es independiente. No ve el historial de diagnosticos previos.

**Solucion:** Agregar ultimos 3 diagnosticos al contexto.

```python
def consultar_llm_con_contexto(conn, texto_resumen, nodo_id, tipo_prompt="phytophthora"):
    """Agrega historial de diagnosticos previos al contexto."""

    # Obtener ultimos 3 diagnosticos del nodo
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT tiempo, datos->'diagnostico_ia'->>'diagnostico' as dx
            FROM eventos
            WHERE nodo_id = %s AND procesado = TRUE
              AND datos->'diagnostico_ia' IS NOT NULL
            ORDER BY tiempo DESC LIMIT 3
        """, (nodo_id,))
        historico = cur.fetchall()

    if historico:
        contexto_extra = "\n\nHISTORIAL DE DIAGNOSTICOS PREVIOS:\n"
        for h in reversed(historico):
            contexto_extra += f"  [{h['tiempo']}]: {h['dx'][:150]}\n"
        texto_resumen += contexto_extra

    return consultar_llm(texto_resumen, tipo_prompt)
```

## 7.2 Historial de tratamientos en contexto

```python
# Agregar a convertir_resumen_a_texto():

# Ultimos tratamientos aplicados
with conn.cursor(cursor_factory=RealDictCursor) as cur:
    cur.execute("""
        SELECT fecha, tipo, producto, cantidad, unidad
        FROM tratamientos WHERE nodo_id = %s
        ORDER BY fecha DESC LIMIT 5
    """, (nodo_id,))
    tratamientos = cur.fetchall()

if tratamientos:
    lines.append("\nTRATAMIENTOS RECIENTES:")
    for t in tratamientos:
        lines.append(f"  {t['fecha']}: {t['tipo']} - {t['producto']} "
                     f"({t['cantidad']} {t['unidad']})")
```

Esto permite que Claude diga: "La ultima aplicacion de Trichoderma fue hace 14 dias. Dado que la humedad actual es ideal, recomiendo reaplicar esta semana."

## 7.3 Balance hidrico en el prompt de bioinsumos

```python
# Agregar al contexto de bioinsumos.txt:
# NUEVO: Incluir resultado del balance hidrico para que Claude
# considere si se va a regar pronto (lo cual podria lavar el inoculo)

balance = calcular_balance(conn, nodo_id)
if balance:
    lines.append(f"\nBALANCE HIDRICO:")
    lines.append(f"  Receta actual: {balance['receta']}")
    lines.append(f"  Fraccion disponible: {balance['fraccion_disponible']*100:.0f}%")
    if balance.get('proxima_revision'):
        lines.append(f"  Proximo riego estimado: {balance['proxima_revision']}")
```

Esto evita que Claude recomiende aplicar Trichoderma hoy si el sistema va a recomendar regar manana (lo cual lavaria el inoculo).

## 7.4 Verificacion de recomendaciones

**Agregar al prompt de phytophthora.txt:**

```
IMPORTANTE: Solo cita referencias que existan. Si no estas seguro de una
referencia especifica, di "literatura general sobre P. cinnamomi" en vez
de inventar un paper.
```

---

# FASE 8: REPOSICIONAMIENTO DEL MODELO MICROBIOMA

## 8.1 Cambio de narrativa

**Antes:** "Nuestro modelo de ML predice el microbioma del suelo en tiempo real."
**Despues:** "Estamos construyendo el primer dataset pareado sensor-microbioma en andisoles volcanicos de Jalisco. El modelo predictivo se entrena y valida con datos reales del piloto."

## 8.2 Cambios en el codigo

```python
# En modelo_microbioma.py, agregar disclaimer al output:

DISCLAIMER = """
NOTA: Este modelo esta entrenado con datos sinteticos.
Los resultados son INDICATIVOS, no predictivos.
El modelo se reentrenara con datos reales de laboratorio
a partir del mes 6 del piloto.
R² con datos sinteticos no es transferible a datos reales.
"""
```

## 8.3 Plan para datos reales

| Mes del piloto | Muestras qPCR acumuladas | Accion |
|---------------|--------------------------|--------|
| 1-3 | 0-12 | Solo recolectar. No entrenar modelo |
| 4-6 | 12-24 | Analisis exploratorio. Correlaciones simples (Pearson) |
| 7-9 | 24-36 | Primer modelo simple (regresion lineal, 3-5 features) |
| 10-12 | 36-48 | Comparar lineal vs RF. Publicar resultados |
| 13-18 | 48-72 | Modelo final con validacion cruzada robusta |

**Recomendacion para el paper:** Publicar el DATASET como contribucion principal, no el modelo. Un dataset pareado de 18 meses es la IP real. El modelo puede mejorar con el tiempo; los datos son unicos.

---

# FASE 9: ANALISIS FOLIAR (complemento de bajo costo)

## 9.1 Por que

Los sensores miden agua y temperatura. No miden nutrientes. Pero las deficiencias de boro (B) y zinc (Zn) pueden reducir el cuajado de fruta en 10-20%. Un analisis foliar semestral ($30-50 USD) puede detectar esto y resolverlo con una aplicacion foliar de $10/ha.

## 9.2 Protocolo

```
Frecuencia: 2 veces al ano (febrero pre-floracion, agosto llenado de fruto)
Muestras: 30 hojas de la generacion actual, de 10 arboles del predio
Laboratorio: Cualquier lab de analisis agricola certificado en GDL
Parametros: N, P, K, Ca, Mg, Fe, Zn, B, Mn, Cu

Costo estimado: $50 USD × 2 = $100 USD/ano
```

## 9.3 Integracion

**Tabla nueva (opcional):**

```sql
CREATE TABLE IF NOT EXISTS analisis_foliar (
    id              SERIAL PRIMARY KEY,
    fecha_muestreo  DATE NOT NULL,
    predio_id       INTEGER REFERENCES predios(predio_id),
    parametro       VARCHAR(10),   -- 'N', 'P', 'K', 'B', 'Zn', etc.
    valor           REAL,
    unidad          VARCHAR(20),   -- 'ppm', '%', 'mg/kg'
    rango_normal    VARCHAR(30),   -- '50-100 ppm'
    estado          VARCHAR(20),   -- 'deficiente', 'normal', 'exceso'
    notas           TEXT
);
```

**En el prompt de Claude:** Agregar resultados de analisis foliar al contexto para que las recomendaciones incluyan nutricion, no solo manejo hidrico.

---

# RESUMEN DE IMPLEMENTACION

## Orden de desarrollo recomendado

```
SEMANA 1-2 (Pre-piloto, critico):
  [x] calibracion.py — modulo de calibracion
  [x] balance_hidrico.py — prescripcion de riego
  [x] SQL migracion — tabla riegos
  [x] API endpoints — registro de riegos

SEMANA 3 (Pre-piloto):
  [x] alertas.py — Score Phytophthora v3 (10 factores)
  [x] whatsapp.py — pipeline de envio
  [x] Cronjobs — alertas horarias + receta diaria

SEMANA 4 (Primera semana de campo):
  [x] Protocolo de calibracion gravimetrica in situ
  [x] Actualizar CALIBRACION con valores reales
  [x] Validar que alertas y balance funcionan con datos reales

SEMANA 5-6 (Primeros datos reales):
  [x] firma_hidrica.py — filtro mediana + correccion temperatura
  [x] comparativo.py — mas variables + efecto tamano
  [x] llm_consultor.py — contexto acumulativo + tratamientos
  [x] Dashboard — widget de balance hidrico + form de riego

MES 3+ (Con datos acumulados):
  [x] Firma hidrica biexponencial (probar vs monoexponencial)
  [x] Analisis foliar (primera muestra)
  [x] Modelo microbioma — analisis exploratorio (no entrenar aun)

MES 6+ (Datos suficientes):
  [x] Recalibrar umbrales de Score con 6 meses de datos reales
  [x] Modelo microbioma — primer modelo simple (lineal)
  [x] Publicar resultados parciales
```

## Archivos nuevos

| Archivo | Funcion | Prioridad |
|---------|---------|-----------|
| `backend/calibracion.py` | Configuracion de calibracion por predio | P0 |
| `backend/balance_hidrico.py` | Balance hidrico + receta de riego prescriptiva | P2 |
| `backend/whatsapp.py` | Envio de mensajes via Meta Cloud API | P4 |
| `backend/migrations/002_registro_riegos.sql` | Tabla de riegos | P3 |

## Archivos modificados

| Archivo | Cambios | Prioridad |
|---------|---------|-----------|
| `backend/alertas.py` | Score v3: 10 factores, interaccion, tau, calibracion | P1 |
| `backend/firma_hidrica.py` | Filtro mediana, correccion temp, biexponencial opcional | P5 |
| `backend/comparativo.py` | Mas variables, tipos legibles, efecto tamano | P6 |
| `backend/llm_consultor.py` | Contexto acumulativo, historial tratamientos, balance | P7 |
| `backend/modelo_microbioma.py` | Disclaimer, plan de reentrenamiento | P8 |
| `backend/api.py` | Endpoints: balance, riegos, tratamientos | P2-P3 |
| `sql/schema.sql` | Tablas: riegos, analisis_foliar | P3 |

## Impacto estimado en rendimiento (acumulativo)

| Mejora | Incremento adicional | Acumulado |
|--------|---------------------|-----------|
| Sistema actual (v1) | 7-15% | 7-15% |
| + Calibracion de sensores (P0) | +3-5% (menos falsos positivos/negativos) | 10-20% |
| + Balance hidrico prescriptivo (P2) | +5-8% (riego optimizado con receta) | 15-28% |
| + Score v3 con interacciones (P1) | +2-3% (deteccion mas precisa) | 17-31% |
| + WhatsApp pipeline (P4) | +2-5% (el productor ACTUA) | 19-36% |
| + Analisis foliar (P9) | +2-5% (corrige deficiencias nutricionales) | 21-41% |
| **Escenario realista con todo implementado** | | **15-25%** |

**Nota:** Los rangos se solapan y no son simplemente aditivos. El escenario realista considera que algunas mejoras se cancelan parcialmente entre si y que el productor no ejecuta 100% de las recomendaciones.

---

**Documento generado el 3 de abril de 2026.**
Basado en revision linea por linea de: alertas.py (688 LOC), firma_hidrica.py (458 LOC), comparativo.py (389 LOC), modelo_microbioma.py (405 LOC), llm_consultor.py (492 LOC), clima.py (407 LOC), generate_data.py (514 LOC), schema.sql (184 LOC).
