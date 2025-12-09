-- Adiciona o campo subdisciplinas (JSON) na tabela PlanejamentoDocumento
ALTER TABLE public."PlanejamentoDocumento"
ADD COLUMN subdisciplinas JSON;
