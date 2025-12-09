-- Adiciona a coluna documento_id na tabela atividades
ALTER TABLE atividades ADD COLUMN documento_id INTEGER REFERENCES documentos(id_documento);
