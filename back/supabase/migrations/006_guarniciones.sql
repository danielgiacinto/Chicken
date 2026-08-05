-- Separar platos y guarniciones
-- Ejecutar en Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS guarniciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pedido_items
  ADD COLUMN IF NOT EXISTS guarnicion_id UUID REFERENCES guarniciones(id);

-- Guarniciones limpias
INSERT INTO guarniciones (nombre, activo)
VALUES
  ('ensalada', TRUE),
  ('arroz', TRUE),
  ('pure', TRUE),
  ('papas', TRUE)
ON CONFLICT (nombre) DO UPDATE SET activo = TRUE;

-- Platos principales limpios
INSERT INTO comidas (nombre, activo)
VALUES
  ('1/4 de pollo', TRUE),
  ('Bife de pechuga', TRUE),
  ('Hamburguesa', TRUE),
  ('Milanesa de carne', TRUE),
  ('Milanesa de pollo', TRUE),
  ('Napo de pollo', TRUE),
  ('Napo de vaca', TRUE)
ON CONFLICT (nombre) DO UPDATE SET activo = TRUE;

-- Desactivar compuestos actuales (no se borran por historial)
UPDATE comidas
SET activo = FALSE
WHERE nombre IN (
  '1/4 de pollo con ensalada',
  'Bife de pechuga con arroz',
  'Hamburguesa con arroz y huevo',
  'Milanesa de carne con ensalada',
  'Milanesa de carne con pure',
  'Milanesa de pollo con pure',
  'Napo de pollo con pure',
  'Napo de vaca con ensalada',
  'Napo de vaca con papas',
  'Napo de vaca con pure',
  'Napo pollo con ensalada',
  'Napo pollo con papa'
)
OR nombre ILIKE '% con %';
