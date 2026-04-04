"""
calibracion.py — Configuración de calibración por predio
Contiene: coeficientes de corrección gravimétrica, corrección por temperatura,
umbrales calibrados de VWC, y parámetros hídricos del suelo.

INSTRUCCIONES PARA CALIBRACIÓN EN CAMPO:
  1. Instalar sensores
  2. Tomar muestras gravimétricas adyacentes (seco, CC, saturado)
  3. Calcular VWC_real = (M_húmedo - M_seco) / Vol_cilindro × 100
  4. Ajustar a, b por profundidad: VWC_real = a × VWC_sensor + b
  5. Medir coeficiente de temperatura α en 48h de suelo seco estable
  6. Actualizar CALIBRACION["nextipac"] con valores reales
"""

# ============================================================
# CONFIGURACIÓN POR PREDIO
# ============================================================
# Cada predio tiene su propia calibración porque los suelos varían.
# Los valores DEFAULT son de literatura para andisoles volcánicos.
# Se reemplazan con datos de campo del protocolo gravimétrico.

CALIBRACION = {
    "nextipac": {
        # --- Corrección lineal por profundidad ---
        # VWC_real = a × VWC_sensor + b
        # DEFAULT: sin corrección (a=1.0, b=0.0)
        # Actualizar con protocolo gravimétrico en campo
        "h10": {"a": 1.0, "b": 0.0},
        "h20": {"a": 1.0, "b": 0.0},
        "h30": {"a": 1.0, "b": 0.0},

        # --- Coeficiente de temperatura ---
        # Sensores capacitivos derivan ~0.1-0.3 %VWC por °C
        # Medir en campo: 48h suelo seco estable, correlación h10 vs t20
        "alpha_temp": 0.0,       # DEFAULT: sin corrección
        "t20_referencia": 22.0,  # °C de referencia durante calibración

        # --- Umbrales de VWC calibrados (% VWC REAL) ---
        # Estos son los valores más importantes del sistema.
        # Determinan cuándo se disparan alertas y recetas de riego.
        "vwc_saturacion": 55.0,        # Suelo visiblemente saturado (charcos)
        "vwc_capacidad_campo": 38.0,   # 24h después de saturación, sin lluvia
        "vwc_punto_riego": 28.0,       # Iniciar riego (60% agua útil agotada)
        "vwc_marchitez": 18.0,         # Hojas empiezan a caer

        # --- Parámetros hídricos ---
        # Agua útil = (CC - PM) / 100 × profundidad_raíz_mm
        # DEFAULT: (38 - 18) / 100 × 300mm = 60mm
        "agua_util_mm": 60.0,
        "profundidad_raiz_mm": 300,  # Zona radicular activa aguacate maduro

        # --- Umbrales de alerta originales (se mantienen como fallback) ---
        "umbral_riego_legacy": 28.0,
        "umbral_bateria": 3.3,
        "umbral_offline_min": 30,

        # --- Tau umbrales (firma hídrica) ---
        "tau_lento": 24.0,    # horas — drenaje muy lento, suelo comprometido
        "tau_moderado": 18.0, # horas — drenaje lento, precaución
    },
}

# Predio por defecto
DEFAULT_PREDIO = "nextipac"


# ============================================================
# FUNCIONES DE CORRECCIÓN
# ============================================================
def get_calibracion(predio=None):
    """Retorna configuración de calibración del predio."""
    predio = predio or DEFAULT_PREDIO
    return CALIBRACION.get(predio, CALIBRACION[DEFAULT_PREDIO])


def corregir_lectura(h_raw, t20, profundidad, predio=None):
    """
    Aplica calibración gravimétrica + corrección por temperatura.

    Args:
        h_raw: lectura cruda del sensor (% VWC)
        t20: temperatura del suelo a 20cm (°C)
        profundidad: 10, 20, o 30 (cm)
        predio: ID del predio (default: nextipac)

    Returns:
        VWC corregido (float)
    """
    if h_raw is None:
        return None

    cal = get_calibracion(predio)
    prof_key = f"h{profundidad}"

    if prof_key not in cal:
        return h_raw

    # Paso 1: Corrección lineal (gravimétrica)
    a = cal[prof_key]["a"]
    b = cal[prof_key]["b"]
    h_cal = a * h_raw + b

    # Paso 2: Correcci��n por temperatura
    if t20 is not None and cal["alpha_temp"] != 0:
        h_corr = h_cal - cal["alpha_temp"] * (t20 - cal["t20_referencia"])
    else:
        h_corr = h_cal

    return round(h_corr, 2)


def corregir_lecturas_dict(lectura_dict, predio=None):
    """
    Corrige un dict de lectura completo (como viene de get_ultima_lectura).
    Retorna nuevo dict con valores corregidos.
    """
    if not lectura_dict:
        return lectura_dict

    t20 = lectura_dict.get("t20")
    resultado = dict(lectura_dict)

    for prof in [10, 20, 30]:
        key = f"h{prof}_avg"
        if key in resultado and resultado[key] is not None:
            resultado[key] = corregir_lectura(resultado[key], t20, prof, predio)

    return resultado


def get_umbral(nombre, predio=None):
    """Retorna un umbral calibrado por nombre."""
    cal = get_calibracion(predio)
    return cal.get(nombre)
