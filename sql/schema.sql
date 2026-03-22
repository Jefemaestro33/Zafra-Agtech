-- ============================================================
-- SCHEMA — AgTech Sistema
-- 6 tablas para el sistema de monitoreo IoT + IA
-- Compatible con PostgreSQL estándar (Railway)
-- FUTURO: agregar create_hypertable() cuando se migre a TimescaleDB
-- ============================================================

-- Limpiar si existen (útil para desarrollo)
DROP TABLE IF EXISTS firma_hidrica CASCADE;
DROP TABLE IF EXISTS eventos CASCADE;
DROP TABLE IF EXISTS microbioma CASCADE;
DROP TABLE IF EXISTS tratamientos CASCADE;
DROP TABLE IF EXISTS lecturas CASCADE;
DROP TABLE IF EXISTS nodos CASCADE;

-- ============================================================
-- 1. NODOS — Metadata de cada sensor
-- ============================================================
CREATE TABLE nodos (
    nodo_id       SMALLINT PRIMARY KEY,
    nombre        VARCHAR(50) NOT NULL,
    rol           VARCHAR(20) NOT NULL,    -- 'tratamiento' o 'testigo'
    bloque        SMALLINT NOT NULL,
    lat           REAL,
    lon           REAL,
    arbol_id      VARCHAR(20),
    fecha_instalacion DATE,
    notas         TEXT
);

-- ============================================================
-- 2. LECTURAS — Datos de sensores (tabla principal, la más grande)
-- ============================================================
CREATE TABLE lecturas (
    tiempo        TIMESTAMPTZ NOT NULL,
    nodo_id       SMALLINT NOT NULL REFERENCES nodos(nodo_id),
    tipo          VARCHAR(10) DEFAULT 'normal',
    h10_avg       REAL,
    h20_avg       REAL,
    h30_avg       REAL,
    h10_min       REAL,
    h10_max       REAL,
    t20           REAL,
    ec30          REAL,
    bateria       REAL,
    rssi          SMALLINT
);

-- Índice principal: consultas por nodo + tiempo (el más usado en Grafana)
CREATE INDEX idx_lecturas_nodo_tiempo ON lecturas (nodo_id, tiempo DESC);

-- Índice por tiempo solo (para queries globales tipo "últimas 24h todos los nodos")
CREATE INDEX idx_lecturas_tiempo ON lecturas (tiempo DESC);

-- FUTURO (TimescaleDB): descomentar esta línea para convertir en hypertable
-- SELECT create_hypertable('lecturas', 'tiempo');
-- Esto particiona automáticamente por tiempo y acelera queries 10-100×

-- ============================================================
-- 3. TRATAMIENTOS — Registro de bioinsumos aplicados
-- ============================================================
CREATE TABLE tratamientos (
    id            SERIAL PRIMARY KEY,
    fecha         TIMESTAMPTZ NOT NULL,
    nodo_id       SMALLINT REFERENCES nodos(nodo_id),
    tipo          VARCHAR(50),     -- 'micorriza', 'trichoderma', 'mulch', 'riego'
    producto      VARCHAR(100),
    cantidad      REAL,
    unidad        VARCHAR(20),
    notas         TEXT
);

-- ============================================================
-- 4. MICROBIOMA — Resultados de laboratorio
-- ============================================================
CREATE TABLE microbioma (
    id              SERIAL PRIMARY KEY,
    fecha_muestreo  TIMESTAMPTZ NOT NULL,
    nodo_id         SMALLINT REFERENCES nodos(nodo_id),
    profundidad     SMALLINT,        -- cm
    metodo          VARCHAR(20),     -- 'qPCR', '16S', 'ITS', 'solvita'
    target          VARCHAR(50),     -- '16S_universal', 'AMF', 'trichoderma', 'phytophthora'
    valor           REAL,
    unidad          VARCHAR(30),
    h10_momento     REAL,
    h20_momento     REAL,
    h30_momento     REAL,
    t20_momento     REAL,
    ec30_momento    REAL,
    notas           TEXT
);

-- ============================================================
-- 5. EVENTOS — Eventos detectados automáticamente
-- ============================================================
CREATE TABLE eventos (
    id            SERIAL PRIMARY KEY,
    tiempo        TIMESTAMPTZ NOT NULL,
    nodo_id       SMALLINT REFERENCES nodos(nodo_id),
    tipo          VARCHAR(30),     -- 'mojado', 'secado', 'alerta_phytophthora', 'offline', 'bateria'
    datos         JSONB,
    procesado     BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_eventos_nodo_tiempo ON eventos (nodo_id, tiempo DESC);
CREATE INDEX idx_eventos_tipo ON eventos (tipo);

-- ============================================================
-- 6. FIRMA_HIDRICA — Calculada por evento de riego
-- ============================================================
CREATE TABLE firma_hidrica (
    id                 SERIAL PRIMARY KEY,
    nodo_id            SMALLINT REFERENCES nodos(nodo_id),
    evento_riego       TIMESTAMPTZ NOT NULL,
    vel_10_20          REAL,     -- velocidad infiltración 10→20cm (m/min)
    vel_20_30          REAL,
    tau_10             REAL,     -- constante de secado 10cm (horas)
    tau_20             REAL,
    tau_30             REAL,
    h10_pico           REAL,
    h30_pico           REAL,
    breaking_point_10  REAL,
    tiempo_drenaje_10  REAL,     -- horas hasta breaking point
    delta_h_max        REAL      -- max(h10-h30) durante evento
);

CREATE INDEX idx_firma_nodo ON firma_hidrica (nodo_id, evento_riego DESC);

-- ============================================================
-- 7. CLIMA — Datos meteorológicos de Open-Meteo API
-- ============================================================
CREATE TABLE clima (
    tiempo              TIMESTAMPTZ NOT NULL,
    temp_ambiente       REAL,       -- °C temperatura del aire
    humedad_relativa    REAL,       -- % HR
    precipitacion       REAL,       -- mm en la última hora
    viento_vel          REAL,       -- m/s velocidad del viento
    viento_dir          REAL,       -- grados dirección del viento
    radiacion_solar     REAL,       -- W/m² radiación solar global
    eto                 REAL,       -- mm/h evapotranspiración de referencia (Penman-Monteith)
    precip_acum_7d      REAL,       -- mm precipitación acumulada últimos 7 días
    fuente              VARCHAR(20) DEFAULT 'open-meteo'
);

CREATE INDEX idx_clima_tiempo ON clima (tiempo DESC);

-- FUTURO (TimescaleDB): descomentar para hypertable
-- SELECT create_hypertable('clima', 'tiempo');

-- ============================================================
-- Verificación
-- ============================================================
SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns c 
        WHERE c.table_name = t.table_name AND c.table_schema = 'public') as columnas
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
