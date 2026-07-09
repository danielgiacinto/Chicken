-- Seed con datos del Excel actual

INSERT INTO configuracion (id, valor_menu, alias_chicken)
VALUES (1, 8550.00, 'viviana.teruel')
ON CONFLICT (id) DO NOTHING;

INSERT INTO integrantes (nombre, menus_comprados, menus_usados, ultimo_pedido) VALUES
  ('Dani', 80, 73, '2026-07-08'),
  ('Doko', 100, 95, '2026-07-08'),
  ('Maik', 67, 67, '2026-07-08'),
  ('Nahu', 100, 93, '2026-07-08'),
  ('Seba', 80, 76, '2026-07-08'),
  ('Yeti', 80, 76, '2026-07-08')
ON CONFLICT (nombre) DO NOTHING;
