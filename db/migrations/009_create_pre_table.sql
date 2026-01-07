-- Migration: Criar tabela PRE (Planilha de Registro de Emails, Atas e Documentos)
CREATE TABLE IF NOT EXISTS public."PRE" (
    id SERIAL PRIMARY KEY,
    empreendimento_id INTEGER REFERENCES public."Empreendimento"(id) ON DELETE CASCADE,
    item VARCHAR(50),
    data DATE,
    de TEXT,
    descritiva TEXT,
    localizacao TEXT,
    assunto TEXT,
    comentario TEXT,
    status VARCHAR(50),
    resposta TEXT,
    imagens JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pre_empreendimento_id ON public."PRE" (empreendimento_id);
