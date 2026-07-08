-- Seed con datos del Excel actual

INSERT INTO configuracion (id, valor_menu, alias_chicken)
VALUES (1, 8550.00, 'viviana.teruel')
ON CONFLICT (id) DO NOTHING;

INSERT INTO integrantes (nombre, menus_comprados, menus_usados, ultimo_pedido) VALUES
  ('Dani', 100, 95, '2026-07-08'),
  ('Doko', 90, 90, '2026-07-08'),
  ('Maik', 67, 67, '2026-07-08'),
  ('Nahu', 100, 93, '2026-07-08'),
  ('Seba', 100, 98, '2026-07-08'),
  ('Yeti', 100, 100, '2026-07-08')
ON CONFLICT (nombre) DO NOTHING;
