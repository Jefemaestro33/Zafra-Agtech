"""
Cargador de datos — AgTech Sistema
Crea las 7 tablas desde schema.sql y carga los 4 CSVs en PostgreSQL.
Uso: python load_data.py [DATABASE_URL]
Si no se pasa DATABASE_URL, lee la variable de entorno DATABASE_URL.
"""
import os
import sys
import time
import psycopg2
from psycopg2.extras import execute_values
import csv
from datetime import datetime

# ============================================================
# CONFIGURACIÓN
# ============================================================
def get_db_url():
    if len(sys.argv) > 1:
        return sys.argv[1]
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: Pasa DATABASE_URL como argumento o variable de entorno.")
        print("Uso: python load_data.py postgresql://user:pass@host:port/db")
        sys.exit(1)
    return url


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
SQL_DIR = os.path.join(BASE_DIR, "..", "sql")


# ============================================================
# FUNCIONES
# ============================================================
def ejecutar_schema(conn):
    """Ejecuta schema.sql para crear las 7 tablas."""
    schema_path = os.path.join(SQL_DIR, "schema.sql")
    with open(schema_path, "r") as f:
        sql = f.read()
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print("Schema ejecutado: 7 tablas creadas.")


def contar_filas(conn, tabla):
    with conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {tabla}")
        return cur.fetchone()[0]


def cargar_nodos(conn):
    """Carga nodos.csv en la tabla nodos."""
    path = os.path.join(DATA_DIR, "nodos.csv")
    with open(path, "r") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    sql = """INSERT INTO nodos (nodo_id, nombre, rol, bloque, lat, lon, arbol_id, fecha_instalacion, notas)
             VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"""

    with conn.cursor() as cur:
        for r in rows:
            cur.execute(sql, (
                int(r["nodo_id"]), r["nombre"], r["rol"], int(r["bloque"]),
                float(r["lat"]), float(r["lon"]), r["arbol_id"],
                r["fecha_instalacion"],
                r["notas"] if r["notas"] and r["notas"] != "" else None
            ))
    conn.commit()
    count = contar_filas(conn, "nodos")
    print(f"  nodos: {count} filas cargadas")


def cargar_lecturas(conn):
    """Carga lecturas.csv en la tabla lecturas usando COPY para velocidad."""
    path = os.path.join(DATA_DIR, "lecturas.csv")

    # Contar líneas para progress
    with open(path, "r") as f:
        total = sum(1 for _ in f) - 1  # menos header
    print(f"  lecturas: cargando {total:,} filas...")

    # Usar COPY para máxima velocidad
    with conn.cursor() as cur:
        with open(path, "r") as f:
            next(f)  # skip header
            cur.copy_expert(
                """COPY lecturas (tiempo, nodo_id, tipo, h10_avg, h20_avg, h30_avg,
                   h10_min, h10_max, t20, ec30, bateria, rssi)
                   FROM STDIN WITH CSV""",
                f
            )
    conn.commit()
    count = contar_filas(conn, "lecturas")
    print(f"  lecturas: {count:,} filas cargadas")


def cargar_tratamientos(conn):
    """Carga tratamientos.csv."""
    path = os.path.join(DATA_DIR, "tratamientos.csv")
    with open(path, "r") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    sql = """INSERT INTO tratamientos (fecha, nodo_id, tipo, producto, cantidad, unidad, notas)
             VALUES (%s, %s, %s, %s, %s, %s, %s)"""

    with conn.cursor() as cur:
        for r in rows:
            cur.execute(sql, (
                r["fecha"], int(r["nodo_id"]), r["tipo"], r["producto"],
                float(r["cantidad"]), r["unidad"],
                r["notas"] if r["notas"] and r["notas"] != "" else None
            ))
    conn.commit()
    count = contar_filas(conn, "tratamientos")
    print(f"  tratamientos: {count} filas cargadas")


def cargar_microbioma(conn):
    """Carga microbioma.csv."""
    path = os.path.join(DATA_DIR, "microbioma.csv")
    with open(path, "r") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    sql = """INSERT INTO microbioma
             (fecha_muestreo, nodo_id, profundidad, metodo, target, valor, unidad,
              h10_momento, h20_momento, h30_momento, t20_momento, ec30_momento, notas)
             VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""

    with conn.cursor() as cur:
        for r in rows:
            notas = r.get("notas", "")
            cur.execute(sql, (
                r["fecha_muestreo"], int(r["nodo_id"]), int(r["profundidad"]),
                r["metodo"], r["target"], float(r["valor"]), r["unidad"],
                float(r["h10_momento"]), float(r["h20_momento"]), float(r["h30_momento"]),
                float(r["t20_momento"]), float(r["ec30_momento"]),
                notas if notas and notas != "" else None
            ))
    conn.commit()
    count = contar_filas(conn, "microbioma")
    print(f"  microbioma: {count} filas cargadas")


def verificar(conn):
    """Verificación rápida post-carga."""
    print("\n" + "=" * 50)
    print("VERIFICACIÓN POST-CARGA")
    print("=" * 50)

    tablas = ["nodos", "lecturas", "tratamientos", "microbioma", "eventos", "firma_hidrica", "clima"]
    for tabla in tablas:
        count = contar_filas(conn, tabla)
        print(f"  {tabla}: {count:,} filas")

    # Rango de fechas
    with conn.cursor() as cur:
        cur.execute("SELECT MIN(tiempo), MAX(tiempo) FROM lecturas")
        min_t, max_t = cur.fetchone()
        print(f"\n  Rango lecturas: {min_t} → {max_t}")

    # h10 promedio por nodo
    with conn.cursor() as cur:
        cur.execute("""
            SELECT l.nodo_id, n.nombre, n.rol,
                   ROUND(AVG(l.h10_avg)::numeric, 2) as h10_prom
            FROM lecturas l JOIN nodos n ON l.nodo_id = n.nodo_id
            GROUP BY l.nodo_id, n.nombre, n.rol
            ORDER BY l.nodo_id
        """)
        print(f"\n  h10_avg promedio por nodo:")
        for row in cur.fetchall():
            print(f"    Nodo {row[0]} ({row[2]:12s}): {row[3]}%")


# ============================================================
# MAIN
# ============================================================
def main():
    db_url = get_db_url()
    print(f"Conectando a PostgreSQL...")
    print(f"  Host: {db_url.split('@')[1].split('/')[0] if '@' in db_url else 'local'}")

    conn = psycopg2.connect(db_url)
    conn.autocommit = False

    try:
        t0 = time.time()

        # 1. Crear tablas
        print("\n[1/5] Ejecutando schema.sql...")
        ejecutar_schema(conn)

        # 2. Cargar datos
        print("\n[2/5] Cargando datos...")
        cargar_nodos(conn)
        cargar_tratamientos(conn)
        cargar_microbioma(conn)

        print("\n[3/5] Cargando lecturas (esto toma ~30-60 seg)...")
        t1 = time.time()
        cargar_lecturas(conn)
        print(f"  Tiempo de carga lecturas: {time.time() - t1:.1f}s")

        # 3. Verificar
        print("\n[4/5] Verificando...")
        verificar(conn)

        elapsed = time.time() - t0
        print(f"\n[5/5] Completado en {elapsed:.1f} segundos.")

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
