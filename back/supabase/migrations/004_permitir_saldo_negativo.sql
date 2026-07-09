-- Permite saldo individual negativo mientras el total del equipo sea positivo
ALTER TABLE integrantes DROP CONSTRAINT IF EXISTS chk_saldo_no_negativo;
