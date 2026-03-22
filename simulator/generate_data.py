"""
Generador de datos sintéticos — AgTech Sistema
Genera 6 meses de datos realistas para 8 nodos de sensores IoT
en aguacate Hass, Nextipac, Jalisco.

Física modelada:
- Propagación vertical del riego (10→20→30cm con delay)
- Secado exponencial con τ diferente por profundidad
- Ciclo diurno y estacional de temperatura
- EC correlacionada con humedad
- Batería con carga solar y descarga nocturna
- RSSI con ruido gaussiano

Escenarios de validación:
1. Riego normal (todos los nodos)
2. Divergencia tratamiento/testigo (gradual, meses 2-3)
3. Phytophthora en nodo 3 (días 100-140, sobrerriego)
4. Nodo 5 offline (días 75-76)
5. Lluvia aleatoria (más frecuente mayo-junio)
6. Microbioma divergente (tratamiento vs testigo)
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os

np.random.seed(42)

# ============================================================
# PARÁMETROS DEL SUELO (Andisol volcánico, Nextipac)
# ============================================================
H_RESIDUAL = 18.0    # % VWC suelo seco
H_CAMPO = 38.0       # % VWC capacidad de campo
H_SATURACION = 55.0  # % VWC saturado
H_BREAKING = 28.0    # % VWC punto de riego

TAU_10_BASE = 12.0   # horas, constante secado 10cm
TAU_20_BASE = 16.0   # horas, constante secado 20cm
TAU_30_BASE = 22.0   # horas, constante secado 30cm

# Delays de propagación vertical (minutos)
DELAY_10_20 = 45     # min para que el agua llegue de 10 a 20cm
DELAY_20_30 = 90     # min para que llegue de 20 a 30cm

# ============================================================
# CONFIGURACIÓN DE NODOS
# ============================================================
NODOS = [
    {"nodo_id": 1, "nombre": "B1-Tratamiento", "rol": "tratamiento", "bloque": 1,
     "lat": 20.7051, "lon": -103.5421, "arbol_id": "A-001"},
    {"nodo_id": 2, "nombre": "B1-Testigo",     "rol": "testigo",     "bloque": 1,
     "lat": 20.7053, "lon": -103.5419, "arbol_id": "A-015"},
    {"nodo_id": 3, "nombre": "B2-Tratamiento", "rol": "tratamiento", "bloque": 2,
     "lat": 20.7055, "lon": -103.5417, "arbol_id": "A-030"},
    {"nodo_id": 4, "nombre": "B2-Testigo",     "rol": "testigo",     "bloque": 2,
     "lat": 20.7057, "lon": -103.5415, "arbol_id": "A-045"},
    {"nodo_id": 5, "nombre": "B3-Tratamiento", "rol": "tratamiento", "bloque": 3,
     "lat": 20.7059, "lon": -103.5413, "arbol_id": "A-060"},
    {"nodo_id": 6, "nombre": "B3-Testigo",     "rol": "testigo",     "bloque": 3,
     "lat": 20.7061, "lon": -103.5411, "arbol_id": "A-075"},
    {"nodo_id": 7, "nombre": "B4-Tratamiento", "rol": "tratamiento", "bloque": 4,
     "lat": 20.7063, "lon": -103.5409, "arbol_id": "A-090"},
    {"nodo_id": 8, "nombre": "B4-Testigo",     "rol": "testigo",     "bloque": 4,
     "lat": 20.7065, "lon": -103.5407, "arbol_id": "A-105"},
]

# ============================================================
# FECHAS
# ============================================================
FECHA_INICIO = datetime(2026, 1, 1)
DIAS_TOTAL = 181  # 6 meses (ene-jun 2026)
INTERVALO_MIN = 5  # lecturas cada 5 minutos
LECTURAS_POR_DIA = 24 * 60 // INTERVALO_MIN  # 288

# ============================================================
# FUNCIONES DE FÍSICA
# ============================================================

def ciclo_diurno_temp(hora, dia_del_anio, profundidad_cm=20):
    """Temperatura del suelo con ciclo diurno y estacional."""
    # Base estacional: más calor mayo-junio, más frío enero
    temp_base = 20.0 + 4.0 * np.sin(2 * np.pi * (dia_del_anio - 80) / 365)
    # Ciclo diurno: pico a las 15h, amplitud depende de profundidad
    amplitud = 3.5 * np.exp(-profundidad_cm / 30.0)
    temp = temp_base + amplitud * np.sin(2 * np.pi * (hora - 9) / 24)
    return temp


def secado_exponencial(t_horas, h_pico, tau, h_residual=H_RESIDUAL):
    """Curva de secado: θ(t) = θ_residual + amplitud × exp(-t/τ)"""
    amplitud = h_pico - h_residual
    return h_residual + amplitud * np.exp(-t_horas / tau)


def generar_eventos_riego(n_dias, nodo_id, es_phytophthora=False):
    """Genera timestamps de riego para un nodo."""
    eventos = []
    for dia in range(n_dias):
        # Riego normal: cada 3-5 días, por la mañana (6-9am)
        if dia % np.random.randint(3, 6) == 0:
            hora_riego = 6 + np.random.random() * 3
            eventos.append(dia * 24 + hora_riego)

        # Escenario Phytophthora: nodo 3, días 100-140, riego excesivo diario
        if es_phytophthora and 100 <= dia <= 140:
            if dia % 1 == 0:  # riego diario
                hora_extra = 6 + np.random.random() * 2
                if not any(abs(e - (dia * 24 + hora_extra)) < 4 for e in eventos):
                    eventos.append(dia * 24 + hora_extra)
                # Segundo riego en la tarde algunos días
                if np.random.random() > 0.5:
                    eventos.append(dia * 24 + 16 + np.random.random() * 2)

    return sorted(eventos)


def generar_eventos_lluvia(n_dias):
    """Genera eventos de lluvia. Más frecuentes mayo-junio."""
    eventos = []
    for dia in range(n_dias):
        mes = (FECHA_INICIO + timedelta(days=dia)).month
        # Probabilidad de lluvia por mes
        prob_lluvia = {1: 0.05, 2: 0.05, 3: 0.08, 4: 0.12,
                       5: 0.25, 6: 0.30}
        prob = prob_lluvia.get(mes, 0.10)
        if np.random.random() < prob:
            hora = 14 + np.random.random() * 6  # lluvia tarde-noche
            intensidad = np.random.uniform(5, 25)  # mm
            eventos.append((dia * 24 + hora, intensidad))
    return eventos


def generar_lecturas_nodo(nodo, eventos_riego, eventos_lluvia):
    """Genera todas las lecturas de un nodo."""
    nodo_id = nodo["nodo_id"]
    es_tratamiento = nodo["rol"] == "tratamiento"
    total_lecturas = DIAS_TOTAL * LECTURAS_POR_DIA

    # Arrays de salida
    h10 = np.full(total_lecturas, H_RESIDUAL + 5.0)
    h20 = np.full(total_lecturas, H_RESIDUAL + 7.0)
    h30 = np.full(total_lecturas, H_RESIDUAL + 9.0)
    t20 = np.zeros(total_lecturas)
    ec30 = np.zeros(total_lecturas)
    bateria = np.zeros(total_lecturas)
    rssi_arr = np.zeros(total_lecturas)

    # Estado de humedad: tracking del secado
    h10_state = H_RESIDUAL + 5.0
    h20_state = H_RESIDUAL + 7.0
    h30_state = H_RESIDUAL + 9.0

    # Picos pendientes por propagación vertical
    pending_20 = []  # (timestep_arribo, h_pico)
    pending_30 = []

    # Tau ajustado para tratamiento (mejora gradual)
    tau_10 = TAU_10_BASE
    tau_20 = TAU_20_BASE
    tau_30 = TAU_30_BASE

    for i in range(total_lecturas):
        t_horas = i * INTERVALO_MIN / 60.0
        dia = i // LECTURAS_POR_DIA
        hora_del_dia = (i % LECTURAS_POR_DIA) * INTERVALO_MIN / 60.0
        dia_del_anio = (FECHA_INICIO + timedelta(days=dia)).timetuple().tm_yday

        # --- Divergencia tratamiento/testigo (escenario 2) ---
        if es_tratamiento and dia > 30:
            factor_mejora = min(0.15, (dia - 30) / 1000.0)
            tau_10 = TAU_10_BASE * (1 - factor_mejora)
            tau_20 = TAU_20_BASE * (1 - factor_mejora)
            tau_30 = TAU_30_BASE * (1 - factor_mejora)
        else:
            tau_10 = TAU_10_BASE
            tau_20 = TAU_20_BASE
            tau_30 = TAU_30_BASE

        # --- Temperatura con ciclo diurno y estacional ---
        t20[i] = ciclo_diurno_temp(hora_del_dia, dia_del_anio) + np.random.normal(0, 0.3)

        # --- Verificar si hay riego en este timestep ---
        for riego_h in eventos_riego:
            if abs(t_horas - riego_h) < INTERVALO_MIN / 60.0:
                # Riego: humedad sube a 10cm inmediatamente
                h_pico_10 = np.random.uniform(H_CAMPO, H_CAMPO + 8)
                h10_state = h_pico_10
                # Propagar a 20cm con delay
                step_arribo_20 = i + int(DELAY_10_20 / INTERVALO_MIN)
                h_pico_20 = h_pico_10 * np.random.uniform(0.88, 0.95)
                pending_20.append((step_arribo_20, h_pico_20))
                # Propagar a 30cm con delay
                step_arribo_30 = i + int(DELAY_20_30 / INTERVALO_MIN)
                h_pico_30 = h_pico_10 * np.random.uniform(0.78, 0.88)
                pending_30.append((step_arribo_30, h_pico_30))

        # --- Verificar si hay lluvia ---
        for lluvia_h, intensidad in eventos_lluvia:
            if abs(t_horas - lluvia_h) < INTERVALO_MIN / 60.0:
                h_incremento = intensidad * 0.6  # no toda la lluvia infiltra
                h10_state = min(H_SATURACION, h10_state + h_incremento)
                step_arribo_20 = i + int(DELAY_10_20 * 0.8 / INTERVALO_MIN)
                pending_20.append((step_arribo_20, min(H_SATURACION, h10_state * 0.92)))
                step_arribo_30 = i + int(DELAY_20_30 * 0.8 / INTERVALO_MIN)
                pending_30.append((step_arribo_30, min(H_SATURACION, h10_state * 0.82)))

        # --- Aplicar llegadas pendientes a 20cm y 30cm ---
        for arribo, pico in pending_20:
            if i == arribo:
                h20_state = max(h20_state, pico)
        for arribo, pico in pending_30:
            if i == arribo:
                h30_state = max(h30_state, pico)

        # --- Secado exponencial continuo ---
        dt = INTERVALO_MIN / 60.0
        h10_state = H_RESIDUAL + (h10_state - H_RESIDUAL) * np.exp(-dt / tau_10)
        h20_state = H_RESIDUAL + (h20_state - H_RESIDUAL) * np.exp(-dt / tau_20)
        h30_state = H_RESIDUAL + (h30_state - H_RESIDUAL) * np.exp(-dt / tau_30)

        # Clamp
        h10_state = np.clip(h10_state, H_RESIDUAL - 1, H_SATURACION + 2)
        h20_state = np.clip(h20_state, H_RESIDUAL - 1, H_SATURACION + 2)
        h30_state = np.clip(h30_state, H_RESIDUAL - 1, H_SATURACION + 2)

        h10[i] = h10_state + np.random.normal(0, 0.3)
        h20[i] = h20_state + np.random.normal(0, 0.25)
        h30[i] = h30_state + np.random.normal(0, 0.2)

        # --- EC correlacionada con humedad ---
        ec30[i] = 0.8 + (h30[i] - H_RESIDUAL) * 0.035 + np.random.normal(0, 0.05)
        ec30[i] = max(0.3, ec30[i])

        # --- Batería: carga solar de día, descarga de noche ---
        if 6 <= hora_del_dia <= 18:
            bat_base = 4.1 + 0.1 * np.sin(np.pi * (hora_del_dia - 6) / 12)
        else:
            bat_base = 4.0 - 0.003 * (hora_del_dia if hora_del_dia > 18 else hora_del_dia + 6)
        bateria[i] = bat_base + np.random.normal(0, 0.02)
        bateria[i] = np.clip(bateria[i], 3.3, 4.25)

        # --- RSSI ---
        rssi_base = -65 - (nodo_id - 1) * 2  # nodos más lejanos, peor señal
        rssi_arr[i] = rssi_base + np.random.normal(0, 3)

    # Limpiar pending lists
    pending_20.clear()
    pending_30.clear()

    # --- Escenario 4: Nodo 5 offline (días 75-76) ---
    offline_mask = np.ones(total_lecturas, dtype=bool)
    if nodo_id == 5:
        for i in range(total_lecturas):
            dia = i // LECTURAS_POR_DIA
            hora = (i % LECTURAS_POR_DIA) * INTERVALO_MIN / 60.0
            # Día 75 completo offline, día 76 reconexión a mediodía
            if dia == 75 or (dia == 76 and hora < 12):
                offline_mask[i] = False

    # Construir timestamps
    timestamps = []
    for i in range(total_lecturas):
        ts = FECHA_INICIO + timedelta(minutes=i * INTERVALO_MIN)
        timestamps.append(ts)

    # Crear DataFrame
    df = pd.DataFrame({
        "tiempo": timestamps,
        "nodo_id": nodo_id,
        "tipo": "normal",
        "h10_avg": np.round(h10, 2),
        "h20_avg": np.round(h20, 2),
        "h30_avg": np.round(h30, 2),
        "h10_min": np.round(h10 - np.random.uniform(0.5, 1.5, total_lecturas), 2),
        "h10_max": np.round(h10 + np.random.uniform(0.5, 1.5, total_lecturas), 2),
        "t20": np.round(t20, 2),
        "ec30": np.round(ec30, 2),
        "bateria": np.round(bateria, 2),
        "rssi": np.round(rssi_arr).astype(int),
    })

    # Aplicar offline mask
    df = df[offline_mask].reset_index(drop=True)

    return df


def generar_tratamientos():
    """Genera registro de aplicaciones de bioinsumos (solo nodos tratamiento)."""
    registros = []
    nodos_trat = [1, 3, 5, 7]

    for nodo_id in nodos_trat:
        # Micorriza: 3 aplicaciones (feb, mar, may)
        for mes, dia in [(2, 5), (3, 15), (5, 10)]:
            fecha = datetime(2026, mes, dia, 8, 0)
            registros.append({
                "fecha": fecha,
                "nodo_id": nodo_id,
                "tipo": "micorriza",
                "producto": "Rhizophagus intraradices",
                "cantidad": 50.0,
                "unidad": "g/arbol",
                "notas": f"Aplicación en drench, suelo húmedo"
            })

        # Trichoderma: 3 aplicaciones (ene, mar, may)
        for mes, dia in [(1, 20), (3, 25), (5, 20)]:
            fecha = datetime(2026, mes, dia, 9, 0)
            registros.append({
                "fecha": fecha,
                "nodo_id": nodo_id,
                "tipo": "trichoderma",
                "producto": "Trichoderma harzianum 2e8 UFC/g",
                "cantidad": 30.0,
                "unidad": "g/arbol",
                "notas": f"Drench al pie del árbol"
            })

    return pd.DataFrame(registros)


def generar_microbioma(lecturas_df):
    """Genera datos de qPCR quincenal pareados con sensores."""
    registros = []
    targets = [
        ("16S_universal", "qPCR", "copias/g"),
        ("AMF", "qPCR", "copias/g"),
        ("trichoderma", "qPCR", "copias/g"),
        ("phytophthora", "qPCR", "copias/g"),
        ("respiracion", "solvita", "mg_CO2"),
    ]

    for nodo in NODOS:
        nodo_id = nodo["nodo_id"]
        es_tratamiento = nodo["rol"] == "tratamiento"

        # Muestreo quincenal: cada 13 días aprox
        for dia in range(7, DIAS_TOTAL, 13):
            fecha = FECHA_INICIO + timedelta(days=dia, hours=10)
            fraccion_tiempo = dia / DIAS_TOTAL

            # Snapshot del sensor al momento del muestreo
            nodo_lecturas = lecturas_df[lecturas_df["nodo_id"] == nodo_id]
            fecha_str = fecha.strftime("%Y-%m-%d")
            dia_lecturas = nodo_lecturas[
                nodo_lecturas["tiempo"].dt.strftime("%Y-%m-%d") == fecha_str
            ]
            if len(dia_lecturas) == 0:
                continue
            snapshot = dia_lecturas.iloc[len(dia_lecturas) // 2]

            for target, metodo, unidad in targets:
                if target == "16S_universal":
                    base = 1e7
                    if es_tratamiento:
                        valor = base * (1 + 0.3 * fraccion_tiempo) + np.random.normal(0, base * 0.1)
                    else:
                        valor = base + np.random.normal(0, base * 0.1)

                elif target == "AMF":
                    base = 5e4
                    if es_tratamiento:
                        valor = base * (1 + 0.8 * fraccion_tiempo) + np.random.normal(0, base * 0.15)
                    else:
                        valor = base * (1 + 0.1 * fraccion_tiempo) + np.random.normal(0, base * 0.15)

                elif target == "trichoderma":
                    base = 2e4
                    if es_tratamiento:
                        valor = base * (1 + 1.2 * fraccion_tiempo) + np.random.normal(0, base * 0.2)
                    else:
                        valor = base + np.random.normal(0, base * 0.2)

                elif target == "phytophthora":
                    base = 1e4
                    if es_tratamiento:
                        valor = base * (1 - 0.4 * fraccion_tiempo) + np.random.normal(0, base * 0.15)
                    else:
                        # Nodo 3 testigo vecino: sube durante crisis
                        if nodo_id == 4 and 100 <= dia <= 160:
                            valor = base * 1.5 + np.random.normal(0, base * 0.2)
                        else:
                            valor = base * (1 + 0.1 * fraccion_tiempo) + np.random.normal(0, base * 0.15)
                    # Nodo 3 tratamiento: sube durante Phytophthora
                    if nodo_id == 3 and 100 <= dia <= 160:
                        valor = base * (2.0 + fraccion_tiempo) + np.random.normal(0, base * 0.3)

                elif target == "respiracion":
                    base = 35.0
                    if es_tratamiento:
                        valor = base * (1 + 0.25 * fraccion_tiempo) + np.random.normal(0, 3)
                    else:
                        valor = base + np.random.normal(0, 3)

                valor = max(0, valor)

                registros.append({
                    "fecha_muestreo": fecha,
                    "nodo_id": nodo_id,
                    "profundidad": 15,
                    "metodo": metodo,
                    "target": target,
                    "valor": round(valor, 2),
                    "unidad": unidad,
                    "h10_momento": round(float(snapshot["h10_avg"]), 2),
                    "h20_momento": round(float(snapshot["h20_avg"]), 2),
                    "h30_momento": round(float(snapshot["h30_avg"]), 2),
                    "t20_momento": round(float(snapshot["t20"]), 2),
                    "ec30_momento": round(float(snapshot["ec30"]), 2),
                    "notas": None,
                })

    return pd.DataFrame(registros)


# ============================================================
# MAIN
# ============================================================
def main():
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(data_dir, exist_ok=True)

    # Eventos globales de lluvia
    eventos_lluvia = generar_eventos_lluvia(DIAS_TOTAL)
    print(f"Eventos de lluvia generados: {len(eventos_lluvia)}")

    # Generar lecturas por nodo
    all_lecturas = []
    for nodo in NODOS:
        nodo_id = nodo["nodo_id"]
        es_phyto = (nodo_id == 3)  # Escenario 3: Phytophthora en nodo 3
        eventos_riego = generar_eventos_riego(DIAS_TOTAL, nodo_id, es_phytophthora=es_phyto)
        print(f"Nodo {nodo_id} ({nodo['nombre']}): {len(eventos_riego)} eventos de riego")

        df = generar_lecturas_nodo(nodo, eventos_riego, eventos_lluvia)
        all_lecturas.append(df)
        print(f"  -> {len(df)} lecturas generadas")

    lecturas_df = pd.concat(all_lecturas, ignore_index=True)
    lecturas_df = lecturas_df.sort_values(["tiempo", "nodo_id"]).reset_index(drop=True)
    print(f"\nTotal lecturas: {len(lecturas_df):,}")

    # Guardar lecturas
    lecturas_path = os.path.join(data_dir, "lecturas.csv")
    lecturas_df.to_csv(lecturas_path, index=False)
    print(f"Guardado: {lecturas_path} ({os.path.getsize(lecturas_path) / 1e6:.1f} MB)")

    # Guardar nodos
    nodos_df = pd.DataFrame(NODOS)
    nodos_df["fecha_instalacion"] = "2026-01-01"
    nodos_df["notas"] = None
    nodos_path = os.path.join(data_dir, "nodos.csv")
    nodos_df.to_csv(nodos_path, index=False)
    print(f"Guardado: {nodos_path}")

    # Guardar tratamientos
    trat_df = generar_tratamientos()
    trat_path = os.path.join(data_dir, "tratamientos.csv")
    trat_df.to_csv(trat_path, index=False)
    print(f"Guardado: {trat_path} ({len(trat_df)} filas)")

    # Guardar microbioma
    print("\nGenerando datos de microbioma (pareados con sensores)...")
    micro_df = generar_microbioma(lecturas_df)
    micro_path = os.path.join(data_dir, "microbioma.csv")
    micro_df.to_csv(micro_path, index=False)
    print(f"Guardado: {micro_path} ({len(micro_df)} filas)")

    # ============================================================
    # VERIFICACIÓN DE ESCENARIOS
    # ============================================================
    print("\n" + "=" * 60)
    print("VERIFICACIÓN DE ESCENARIOS")
    print("=" * 60)

    # Escenario 3: Phytophthora nodo 3
    n3 = lecturas_df[lecturas_df["nodo_id"] == 3].copy()
    n3["dia"] = (n3["tiempo"] - FECHA_INICIO).dt.days
    antes = n3[(n3["dia"] >= 80) & (n3["dia"] < 100)]
    crisis = n3[(n3["dia"] >= 100) & (n3["dia"] <= 140)]
    despues = n3[(n3["dia"] > 140) & (n3["dia"] <= 160)]
    print(f"\nPhytophthora (Nodo 3):")
    print(f"  Antes  (días 80-99):  h10 prom={antes['h10_avg'].mean():.1f}%, max={antes['h10_avg'].max():.1f}%")
    print(f"  Crisis (días 100-140): h10 prom={crisis['h10_avg'].mean():.1f}%, max={crisis['h10_avg'].max():.1f}%, t20={crisis['t20'].mean():.1f}°C")
    print(f"  Después(días 141-160): h10 prom={despues['h10_avg'].mean():.1f}%")

    # Escenario 2: Divergencia
    print(f"\nDivergencia tratamiento vs testigo (h10 promedio mensual):")
    lecturas_df_copy = lecturas_df.copy()
    lecturas_df_copy["mes"] = lecturas_df_copy["tiempo"].dt.month
    for mes in [1, 3, 6]:
        mes_data = lecturas_df_copy[lecturas_df_copy["mes"] == mes]
        trat_ids = [n["nodo_id"] for n in NODOS if n["rol"] == "tratamiento"]
        test_ids = [n["nodo_id"] for n in NODOS if n["rol"] == "testigo"]
        h10_trat = mes_data[mes_data["nodo_id"].isin(trat_ids)]["h10_avg"].mean()
        h10_test = mes_data[mes_data["nodo_id"].isin(test_ids)]["h10_avg"].mean()
        nombre_mes = {1: "Enero", 3: "Marzo", 6: "Junio"}[mes]
        print(f"  {nombre_mes}: Δ = {h10_trat - h10_test:.2f}%")

    # Escenario 4: Nodo 5 offline
    n5 = lecturas_df[lecturas_df["nodo_id"] == 5].copy()
    n5["dia"] = (n5["tiempo"] - FECHA_INICIO).dt.days
    print(f"\nNodo 5 offline:")
    for d in [74, 75, 76, 77]:
        count = len(n5[n5["dia"] == d])
        print(f"  Día {d}: {count} registros {'(OFFLINE)' if count == 0 else ''}")

    print(f"\nRango de fechas: {lecturas_df['tiempo'].min()} → {lecturas_df['tiempo'].max()}")
    print(f"\nGeneración completada exitosamente.")


if __name__ == "__main__":
    main()
