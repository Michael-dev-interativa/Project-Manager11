-- Migration: Criação da tabela DataCadastro
-- Executar no psql ou ferramenta de migrations

CREATE TABLE IF NOT EXISTS public."DataCadastro" (
    id SERIAL PRIMARY KEY,
    empreendimento_id INTEGER NOT NULL,
    ordem INTEGER NOT NULL,
    documento_id INTEGER NOT NULL,
    datas JSONB NOT NULL,
    CONSTRAINT fk_datacadastro_empreendimento FOREIGN KEY (empreendimento_id) REFERENCES public."Empreendimento"(id),
    CONSTRAINT fk_datacadastro_documento FOREIGN KEY (documento_id) REFERENCES public."Documento"(id)
);

CREATE INDEX IF NOT EXISTS idx_datacadastro_empreendimento_id ON public."DataCadastro" (empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_datacadastro_documento_id ON public."DataCadastro" (documento_id);
