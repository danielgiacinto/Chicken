-- Schema inicial: integrantes, movimientos, configuracion

CREATE TABLE IF NOT EXISTS integrantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  menus_comprados INTEGER NOT NULL DEFAULT 0 CHECK (menus_comprados >= 0),
  menus_usados INTEGER NOT NULL DEFAULT 0 CHECK (menus_usados >= 0),
  ultimo_pedido DATE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_saldo_no_negativo CHECK (menus_comprados >= menus_usados)
);

CREATE TABLE IF NOT EXISTS movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrante_id UUID NOT NULL REFERENCES integrantes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'consumo')),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nota TEXT
);

CREATE TABLE IF NOT EXISTS configuracion (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  valor_menu NUMERIC(12, 2) NOT NULL DEFAULT 8550.00,
  alias_chicken TEXT NOT NULL DEFAULT 'viviana.teruel'
);

CREATE INDEX IF NOT EXISTS idx_movimientos_integrante ON movimientos(integrante_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha DESC);
