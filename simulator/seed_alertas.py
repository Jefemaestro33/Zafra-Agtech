"""
seed_alertas.py — Inserta alertas de ejemplo en la tabla eventos.

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

# 1. Verificar estructura de la tabla eventos
print("=== Estructura de la tabla eventos ===")
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'eventos'
    ORDER BY ordinal_position
""")
for row in cur.fetchall():
    print(f"  {row['column_name']:20s} {row['data_type']}")

# 2. Insertar alertas de ejemplo
alertas = [
    {
        "nodo_id": 3,
        "tiempo_expr": "NOW() - INTERVAL '2 hours'",
        "tipo": "alerta_phytophthora",
        "datos": {
            "score_total": 85,
            "nivel": "CRÍTICO",
            "humedad_10cm": {"valor": 48.2, "puntos": 20},
            "humedad_20cm": {"valor": 44.7, "puntos": 20},
            "temperatura_20cm": {"valor": 24.3, "puntos": 30},
            "horas_humedo": {"valor": 72, "puntos": 15},
        },
    },
    {
        "nodo_id": 5,
        "tiempo_expr": "NOW() - INTERVAL '6 hours'",
        "tipo": "alerta_phytophthora",
        "datos": {
            "score_total": 62,
            "nivel": "ALTO",
            "humedad_10cm": {"valor": 42.1, "puntos": 10},
            "humedad_20cm": {"valor": 41.3, "puntos": 10},
            "temperatura_20cm": {"valor": 23.8, "puntos": 30},
            "horas_humedo": {"valor": 36, "puntos": 10},
        },
    },
    {
        "nodo_id": 1,
        "tiempo_expr": "NOW() - INTERVAL '4 hours'",
        "tipo": "necesita_riego",
        "datos": {
            "h10_actual": 22.3,
            "breaking_point": 25.0,
            "lecturas_bajo_bp": 4,
            "ultimo_riego_hace": "3 días",
        },
    },
    {
        "nodo_id": 7,
        "tiempo_expr": "NOW() - INTERVAL '45 minutes'",
        "tipo": "offline",
        "datos": {
            "ultimo_dato": "2026-03-23T17:15:00Z",
            "minutos_sin_datos": 45,
            "ultimo_rssi": -89,
            "posible_causa": "batería o cobertura",
        },
    },
    {
        "nodo_id": 6,
        "tiempo_expr": "NOW() - INTERVAL '1 hour'",
        "tipo": "bateria_baja",
        "datos": {
            "voltaje": 3.21,
            "umbral": 3.3,
            "tendencia": "bajando",
            "estimado_restante": "~2 días",
        },
    },
    {
        "nodo_id": 2,
        "tiempo_expr": "NOW() - INTERVAL '8 hours'",
        "tipo": "necesita_riego",
        "datos": {
            "h10_actual": 23.8,
            "breaking_point": 26.0,
            "lecturas_bajo_bp": 3,
            "ultimo_riego_hace": "2 días",
        },
    },
]

print(f"\n=== Insertando {len(alertas)} alertas de ejemplo ===")
for a in alertas:
    cur.execute(
        f"INSERT INTO eventos (tiempo, nodo_id, tipo, datos, procesado) "
        f"VALUES ({a['tiempo_expr']}, %s, %s, %s, FALSE)",
        (a["nodo_id"], a["tipo"], json.dumps(a["datos"])),
    )
    print(f"  ✓ {a['tipo']:25s} — Nodo {a['nodo_id']}")

conn.commit()

# 3. Verificar
print("\n=== Verificación: últimos eventos ===")
cur.execute("SELECT id, tiempo, nodo_id, tipo FROM eventos ORDER BY tiempo DESC LIMIT 10")
for row in cur.fetchall():
    print(f"  id={row['id']:4d}  {str(row['tiempo'])[:19]}  nodo={row['nodo_id']}  tipo={row['tipo']}")

cur.close()
conn.close()
print("\n✓ Listo. 6 alertas insertadas correctamente.")
