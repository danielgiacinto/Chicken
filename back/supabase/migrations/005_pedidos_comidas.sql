-- Catálogo de comidas, pedidos diarios y contacto WhatsApp
-- Ejecutar en Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS comidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'reservado', 'cancelado')),
  mensaje TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  integrante_id UUID NOT NULL REFERENCES integrantes(id) ON DELETE CASCADE,
  comida_id UUID NOT NULL REFERENCES comidas(id),
  UNIQUE (pedido_id, integrante_id)
);

CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_comidas_activo ON comidas(activo);

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS contacto_wpp_nombre TEXT NOT NULL DEFAULT 'David Chicken';

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS contacto_wpp_numero TEXT NOT NULL DEFAULT '5493513034351';

UPDATE configuracion
SET
  contacto_wpp_nombre = COALESCE(contacto_wpp_nombre, 'David Chicken'),
  contacto_wpp_numero = COALESCE(contacto_wpp_numero, '5493513034351')
WHERE id = 1;
