-- Adiciona o campo documento_id na tabela atividades
ALTER TABLE atividades ADD COLUMN documento_id VARCHAR(255);

-- Opcional: cria índice para facilitar buscas
CREATE INDEX idx_atividade_documento_id ON atividades(documento_id);