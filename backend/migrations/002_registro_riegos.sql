-- ============================================================
-- MIGRACIÓN 002 — Registro de riegos + análisis foliar
-- Ejecutar: psql $DATABASE_URL -f backend/migrations/002_registro_riegos.sql
-- Seguro para correr múltiples veces (IF NOT EXISTS)
-- ============================================================

-- 1. Tabla de eventos de riego
CREATE TABLE IF NOT EXISTS riegos (
    id              SERIAL PRIMARY KEY,
    tiempo          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    predio_id       INTEGER REFERENCES predios(predio_id),
    metodo          VARCHAR(30),      -- 'gravedad', 'manguera', 'goteo', 'aspersion', 'lluvia_detectada'
    duracion_min    REAL,             -- minutos de riego
    volumen_litros  REAL,             -- litros totales (si se conoce)
    mm_estimados    REAL,             -- mm equivalentes
    zona            VARCHAR(50),      -- 'todo', 'bloque_1', 'bloque_2', etc.
    registrado_por  VARCHAR(50),      -- 'agronomo', 'productor', 'sistema' (auto-detectado)
    notas           TEXT
);

CREATE INDEX IF NOT EXISTS idx_riegos_predio_tiempo
    ON riegos (predio_id, tiempo DESC);

-- 2. Tabla de análisis foliar
CREATE TABLE IF NOT EXISTS analisis_foliar (
    id              SERIAL PRIMARY KEY,
    fecha_muestreo  DATE NOT NULL,
    predio_id       INTEGER REFERENCES predios(predio_id),
    parametro       VARCHAR(10) NOT NULL,  -- 'N', 'P', 'K', 'Ca', 'Mg', 'Fe', 'Zn', 'B', 'Mn', 'Cu'
    valor           REAL NOT NULL,
    unidad          VARCHAR(20),           -- 'ppm', '%', 'mg/kg'
    rango_min       REAL,                  -- Rango normal mínimo
    rango_max       REAL,                  -- Rango normal máximo
    estado          VARCHAR(20),           -- 'deficiente', 'normal', 'exceso'
    notas           TEXT
);

CREATE INDEX IF NOT EXISTS idx_foliar_predio_fecha
    ON analisis_foliar (predio_id, fecha_muestreo DESC);

-- 3. Agregar predio_id a nodos si no existe
ALTER TABLE nodos ADD COLUMN IF NOT EXISTS predio_id INTEGER REFERENCES predios(predio_id);

-- 4. Actualizar nodos existentes al predio 1 si no tienen predio
UPDATE nodos SET predio_id = 1 WHERE predio_id IS NULL;

-- 5. Tabla de historial de balance hídrico (para tracking)
CREATE TABLE IF NOT EXISTS balance_historico (
    id                  SERIAL PRIMARY KEY,
    tiempo              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    predio_id           INTEGER REFERENCES predios(predio_id),
    receta              VARCHAR(30),      -- 'REGAR', 'NO_REGAR', 'ESPERAR_LLUVIA', 'MONITOREAR'
    riego_mm            REAL,
    litros_por_arbol    REAL,
    vwc_promedio        REAL,
    fraccion_disponible REAL,
    eto_diario          REAL,
    lluvia_pronostico   REAL,
    mensaje_whatsapp    TEXT,
    enviado             BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_balance_predio_tiempo
    ON balance_historico (predio_id, tiempo DESC);

-- Verificación
SELECT 'riegos' as tabla, count(*) as filas FROM riegos
UNION ALL SELECT 'analisis_foliar', count(*) FROM analisis_foliar
UNION ALL SELECT 'balance_historico', count(*) FROM balance_historico;
