-- Migration: Add empreendimento_id column to Atividade
-- Run in psql as a user with ALTER TABLE privileges

-- Add column if it doesn't exist
ALTER TABLE public."Atividade" ADD COLUMN IF NOT EXISTS empreendimento_id INTEGER;

-- Optional: add FK constraint to Empreendimento table if it exists
-- Only run if the Empreendimento table exists and id is an integer primary key
-- ALTER TABLE public."Atividade"
--   ADD CONSTRAINT fk_atividade_empreendimento FOREIGN KEY (empreendimento_id) REFERENCES public."Empreendimento"(id);

-- Optional: Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_atividade_empreendimento_id ON public."Atividade" (empreendimento_id);

-- NOTE: If you want to fill existing rows with a default value, run an UPDATE below.
-- UPDATE public."Atividade" SET empreendimento_id = <some_id> WHERE empreendimento_id IS NULL;
