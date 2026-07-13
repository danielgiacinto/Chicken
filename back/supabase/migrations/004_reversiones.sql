-- Reversión de consumos: permite deshacer un picoteo hecho por error
-- Ejecutar en Supabase → SQL Editor

-- 1. Permitir el nuevo tipo 'reversion' en movimientos
ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_tipo_check;
ALTER TABLE movimientos
  ADD CONSTRAINT movimientos_tipo_check CHECK (tipo IN ('compra', 'consumo', 'reversion'));

-- 2. Marcar los consumos que ya fueron revertidos (evita revertir dos veces)
ALTER TABLE movimientos
  ADD COLUMN IF NOT EXISTS revertido BOOLEAN NOT NULL DEFAULT FALSE;
