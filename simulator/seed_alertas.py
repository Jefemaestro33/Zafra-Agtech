"""
seed_alertas.py — Inserta alertas realistas en la tabla eventos.

Uso:
  DATABASE_URL=postgresql://... python simulator/seed_alertas.py
"""
import os
import sys
import json
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no configurada.")
    print("Uso: DATABASE_URL=postgresql://... python simulator/seed_alertas.py")
    sys.exit(1)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

# Limpiar eventos anteriores
cur.execute("DELETE FROM eventos")
conn.commit()
print("Eventos anteriores eliminados.")

alertas = [
    # --- Phytophthora: episodio de lluvias prolongadas en nodo 3 (sobrerriego) ---
    {
        "nodo_id": 3,
        "tiempo_expr": "(SELECT MAX(tiempo) FROM lecturas) - INTERVAL '14 hours 23 minutes'",
        "tipo": "alerta_phytophthora",
        "datos": {
            "score_total": 78,
            "nivel": "CRITICO",
            "desglose": {
                "humedad_10cm": {"valor": 47.6, "puntos": 15, "umbral": ">45% VWC"},
                "humedad_20cm": {"valor": 46.1, "puntos": 15, "umbral": ">45% VWC"},
                "temperatura_20cm": {"valor": 23.8, "puntos": 20, "umbral": "22-28°C rango óptimo P. cinnamomi"},
                "horas_humedo": {"valor": 58, "puntos": 10, "umbral": ">48h continuas"},
                "precip_7d": {"valor": 67.3, "puntos": 10, "umbral": ">50mm acumulados"},
                "pronostico_48h": {"valor": 22.0, "puntos": 5, "umbral": ">20mm pronosticados"},
                "hr_ambiente_48h": {"valor": 84.2, "puntos": 5, "umbral": ">80% HR promedio"},
            },
            "contexto": "Tres días consecutivos de lluvia con suelo ya saturado por riego del lunes. Nodo en zona baja del bloque 2 con drenaje deficiente.",
        },
    },
    {
        "nodo_id": 3,
        "tiempo_expr": "(SELECT MAX(tiempo) FROM lecturas) - INTERVAL '3 days 7 hours'",
        "tipo": "alerta_phytophthora",
        "datos": {
            "score_total": 63,
            "nivel": "ALTO",
            "desglose": {
                "humedad_10cm": {"valor": 43.2, "puntos": 8, "umbral": ">40% VWC"},
                "humedad_20cm": {"valor": 45.8, "puntos": 15, "umbral": ">45% VWC"},
                "temperatura_20cm": {"valor": 24.1, "puntos": 20, "umbral": "22-28°C"},
                "horas_humedo": {"valor": 31, "puntos": 5, "umbral": ">24h continuas"},
                "precip_7d": {"valor": 38.5, "puntos": 5, "umbral": ">25mm acumulados"},
                "pronostico_48h": {"valor": 15.0, "puntos": 0, "umbral": "<20mm"},
                "hr_ambiente_48h": {"valor": 82.7, "puntos": 5, "umbral": ">80% HR"},
            },
            "contexto": "Inicio del episodio de lluvias. Humedad subiendo en profundidad antes que en superficie.",
        },
    },
    # --- Phytophthora moderado en nodo 5 (post-lluvia) ---
    {
        "nodo_id": 5,
        "tiempo_expr": "(SELECT MAX(tiempo) FROM lecturas) - INTERVAL '1 day 19 hours'",
        "tipo": "alerta_phytophthora",
        "datos": {
            "score_total": 53,
            "nivel": "ALTO",
            "desglose": {
                "humedad_10cm": {"valor": 41.4, "puntos": 8, "umbral": ">40% VWC"},
                "humedad_20cm": {"valor": 42.7, "puntos": 8, "umbral": ">40% VWC"},
                "temperatura_20cm": {"valor": 22.9, "puntos": 20, "umbral": "22-28°C"},
                "horas_humedo": {"valor": 26, "puntos": 5, "umbral": ">24h continuas"},
                "precip_7d": {"valor": 52.1, "puntos": 10, "umbral": ">50mm acumulados"},
                "pronostico_48h": {"valor": 3.0, "puntos": 0, "umbral": "<20mm"},
                "hr_ambiente_48h": {"valor": 76.4, "puntos": 0, "umbral": "<80% HR"},
            },
            "contexto": "Score subió por acumulación de precipitación semanal. Suelo drenando normalmente, monitorear las próximas 24h.",
        },
    },
    # --- Riego necesario en nodo 1 (zona alta, seca más rápido) ---
    {
        "nodo_id": 1,
        "tiempo_expr": "(SELECT MAX(tiempo) FROM lecturas) - INTERVAL '6 hours 42 minutes'",
        "tipo": "necesita_riego",
        "datos": {
            "h10_actual": 21.8,
            "h20_actual": 26.3,
            "breaking_point": 25.0,
            "lecturas_bajo_bp": 7,
            "horas_bajo_bp": 8.3,
            "tau_10_ultimo": 24.6,
            "ultimo_riego_hace": "3 días 14 horas",
            "recomendacion": "Regar antes del mediodía, el suelo a 10cm está por debajo del breaking point desde las 22:00 de ayer.",
        },
    },
    {
        "nodo_id": 1,
        "tiempo_expr": "(SELECT MAX(tiempo) FROM lecturas) - INTERVAL '4 days 11 hours'",
        "tipo": "necesita_riego",
        "datos": {
            "h10_actual": 22.4,
            "h20_actual": 27.1,
            "breaking_point": 25.0,
            "lecturas_bajo_bp": 5,
            "horas_bajo_bp": 6.1,
            "tau_10_ultimo": 25.2,
            "ultimo_riego_hace": "3 días 8 horas",
            "recomendacion": "Patrón recurrente: nodo 1 seca más rápido que los demás (zona alta, mayor exposición solar). Considerar ajustar frecuencia de riego.",
        },
    },
    # --- Riego necesario en nodo 2 ---
    {
        "nodo_id": 2,
        "tiempo_expr": "(SELECT MAX(tiempo) FROM lecturas) - INTERVAL '1 day 3 hours'",
        "tipo": "necesita_riego",
        "datos": {
            "h10_actual": 23.1,
            "h20_actual": 28.4,
            "breaking_point": 26.0,
            "lecturas_bajo_bp": 4,
            "horas_bajo_bp": 4.8,
            "tau_10_ultimo": 29.1,
            "ultimo_riego_hace": "2 días 19 horas",
            "recomendacion": "Humedad descendiendo gradualmente. Regar en las próximas 12 horas.",
        },
    },
    # --- Nodo offline (7, problema de señal LoRa) ---
    {
        "nodo_id": 7,
        "tiempo_expr": "(SELECT MAX(tiempo) FROM lecturas) - INTERVAL '2 hours 17 minutes'",
        "tipo": "offline",
        "datos": {
            "ultimo_dato": "hace 2h 17min",
            "minutos_sin_datos": 137,
            "ultimo_rssi": -91,
            "ultimo_bateria": 3.68,
            "posible_causa": "RSSI bajo (-91 dBm). Probable obstrucción de línea de vista con el gateway. Última batería normal (3.68V).",
            "historial": "Este nodo ha reportado RSSI < -85 en el 30% de las lecturas del último mes.",
        },
    },
    # --- Batería baja nodo 6 ---
    {
        "nodo_id": 6,
        "tiempo_expr": "(SELECT MAX(tiempo) FROM lecturas) - INTERVAL '5 hours 33 minutes'",
        "tipo": "bateria_baja",
        "datos": {
            "voltaje_actual": 3.24,
            "voltaje_24h_antes": 3.31,
            "umbral_critico": 3.2,
            "tasa_descarga": 0.029,
            "estimado_restante": "~2.4 días al ritmo actual",
            "recomendacion": "Reemplazar batería en la próxima visita a campo. Si baja de 3.2V las lecturas de sensores pierden precisión.",
        },
    },
    # --- Batería baja nodo 8 (menos urgente) ---
    {
        "nodo_id": 8,
        "tiempo_expr": "(SELECT MAX(tiempo) FROM lecturas) - INTERVAL '1 day 8 hours'",
        "tipo": "bateria_baja",
        "datos": {
            "voltaje_actual": 3.29,
            "voltaje_24h_antes": 3.34,
            "umbral_critico": 3.2,
            "tasa_descarga": 0.021,
            "estimado_restante": "~4.3 días al ritmo actual",
            "recomendacion": "Monitorear. Aún tiene margen pero la tendencia es descendente.",
        },
    },
    # --- Phytophthora moderado nodo 4 (resuelto) ---
    {
        "nodo_id": 4,
        "tiempo_expr": "(SELECT MAX(tiempo) FROM lecturas) - INTERVAL '5 days 2 hours'",
        "tipo": "alerta_phytophthora",
        "datos": {
            "score_total": 41,
            "nivel": "MODERADO",
            "desglose": {
                "humedad_10cm": {"valor": 38.7, "puntos": 0, "umbral": "<40% OK"},
                "humedad_20cm": {"valor": 41.2, "puntos": 8, "umbral": ">40% VWC"},
                "temperatura_20cm": {"valor": 25.3, "puntos": 20, "umbral": "22-28°C"},
                "horas_humedo": {"valor": 18, "puntos": 0, "umbral": "<24h OK"},
                "precip_7d": {"valor": 28.4, "puntos": 5, "umbral": ">25mm acumulados"},
                "pronostico_48h": {"valor": 8.0, "puntos": 0, "umbral": "<20mm"},
                "hr_ambiente_48h": {"valor": 83.1, "puntos": 5, "umbral": ">80% HR"},
            },
            "contexto": "Score elevado solo por temperatura en rango óptimo + precipitación acumulada. Sin saturación de suelo. Riesgo manejable.",
        },
    },
    # --- Divergencia CUSUM detectada ---
    {
        "nodo_id": 3,
        "tiempo_expr": "(SELECT MAX(tiempo) FROM lecturas) - INTERVAL '6 days 4 hours'",
        "tipo": "divergencia_cusum",
        "datos": {
            "bloque": 2,
            "variable": "h10_avg",
            "s_pos": 47.3,
            "umbral_h": 19.2,
            "dias_desde_alarma": 12,
            "delta_promedio": 4.7,
            "interpretacion": "El nodo 3 (tratamiento) mantiene humedad consistentemente más alta que el nodo 4 (testigo) del mismo bloque. Delta promedio de 4.7% VWC en los últimos 12 días. Compatible con efecto de sobrerriego.",
        },
    },
]

print(f"\n=== Insertando {len(alertas)} alertas ===")
for a in alertas:
    cur.execute(
        f"INSERT INTO eventos (tiempo, nodo_id, tipo, datos, procesado) "
        f"VALUES ({a['tiempo_expr']}, %s, %s, %s, FALSE)",
        (a["nodo_id"], a["tipo"], json.dumps(a["datos"], ensure_ascii=False)),
    )
    print(f"  + {a['tipo']:25s} — Nodo {a['nodo_id']} ({a['datos'].get('nivel', a['datos'].get('estimado_restante', ''))}) ")

conn.commit()

# Verificar
print("\n=== Verificacion ===")
cur.execute("SELECT id, tiempo, nodo_id, tipo FROM eventos ORDER BY tiempo DESC LIMIT 15")
for row in cur.fetchall():
    print(f"  id={row['id']:4d}  {str(row['tiempo'])[:19]}  nodo={row['nodo_id']}  tipo={row['tipo']}")

cur.close()
conn.close()
print(f"\n+ Listo. {len(alertas)} alertas insertadas.")
