-- Reset completo: vuelve al estado inicial del Excel
-- Ejecutar en Supabase → SQL Editor cuando quieras empezar de cero

-- 1. Borrar historial de movimientos
DELETE FROM movimientos;

-- 2. Permitir saldo individual negativo
ALTER TABLE integrantes DROP CONSTRAINT IF EXISTS chk_saldo_no_negativo;

-- 3. Borrar integrantes y volver a insertar (los UUID cambian, no importa sin movimientos)
DELETE FROM integrantes;

INSERT INTO integrantes (nombre, menus_comprados, menus_usados, ultimo_pedido) VALUES
  ('Dani', 80, 73, '2026-07-08'),
  ('Doko', 100, 95, '2026-07-08'),
  ('Maik', 67, 67, '2026-07-08'),
  ('Nahu', 100, 93, '2026-07-08'),
  ('Seba', 80, 76, '2026-07-08'),
  ('Yeti', 80, 76, '2026-07-08');

-- Totales: comprados 507 | usados 480 | saldo 27
INSERT INTO configuracion (id, valor_menu, alias_chicken)
VALUES (1, 8550.00, 'viviana.teruel')
ON CONFLICT (id) DO UPDATE SET
  valor_menu = EXCLUDED.valor_menu,
  alias_chicken = EXCLUDED.alias_chicken;
