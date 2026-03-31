-- Migration 001: Add indexes and foreign key constraints
-- Run with: psql $DATABASE_URL -f backend/migrations/001_indexes_and_constraints.sql
--
-- Purpose: Improve query performance on commonly filtered columns
-- and enforce referential integrity between tables.

-- ============================================================
-- INDEXES
-- ============================================================

-- lecturas: most queried table, always filtered by nodo_id + tiempo
CREATE INDEX IF NOT EXISTS idx_lecturas_nodo_tiempo ON lecturas (nodo_id, tiempo DESC);
CREATE INDEX IF NOT EXISTS idx_lecturas_tiempo ON lecturas (tiempo DESC);

-- firma_hidrica: queried by nodo_id, ordered by evento_riego
CREATE INDEX IF NOT EXISTS idx_firma_hidrica_nodo ON firma_hidrica (nodo_id);
CREATE INDEX IF NOT EXISTS idx_firma_hidrica_evento ON firma_hidrica (nodo_id, evento_riego DESC);

-- clima: always ordered by tiempo
CREATE INDEX IF NOT EXISTS idx_clima_tiempo ON clima (tiempo DESC);

-- eventos: filtered by tipo and nodo_id
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos (tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_nodo ON eventos (nodo_id);
CREATE INDEX IF NOT EXISTS idx_eventos_tiempo ON eventos (tiempo DESC);

-- microbioma: filtered by nodo_id
CREATE INDEX IF NOT EXISTS idx_microbioma_nodo ON microbioma (nodo_id);


-- ============================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================
-- Wrapped in DO blocks to handle "already exists" gracefully.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lecturas_nodo'
    ) THEN
        ALTER TABLE lecturas ADD CONSTRAINT fk_lecturas_nodo
            FOREIGN KEY (nodo_id) REFERENCES nodos(nodo_id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_firma_hidrica_nodo'
    ) THEN
        ALTER TABLE firma_hidrica ADD CONSTRAINT fk_firma_hidrica_nodo
            FOREIGN KEY (nodo_id) REFERENCES nodos(nodo_id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_microbioma_nodo'
    ) THEN
        ALTER TABLE microbioma ADD CONSTRAINT fk_microbioma_nodo
            FOREIGN KEY (nodo_id) REFERENCES nodos(nodo_id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_eventos_nodo'
    ) THEN
        ALTER TABLE eventos ADD CONSTRAINT fk_eventos_nodo
            FOREIGN KEY (nodo_id) REFERENCES nodos(nodo_id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tratamientos_nodo'
    ) THEN
        ALTER TABLE tratamientos ADD CONSTRAINT fk_tratamientos_nodo
            FOREIGN KEY (nodo_id) REFERENCES nodos(nodo_id) ON DELETE CASCADE;
    END IF;
END $$;
