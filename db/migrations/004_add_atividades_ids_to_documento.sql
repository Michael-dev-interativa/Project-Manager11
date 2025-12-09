-- Adiciona a coluna atividades_ids na tabela Documento
ALTER TABLE public."Documento"
ADD COLUMN atividades_ids integer[] DEFAULT ARRAY[]::integer[];