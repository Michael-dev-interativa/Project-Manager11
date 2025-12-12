-- Adds 'origem' column to Atividade to mark creation source
ALTER TABLE public."Atividade"
ADD COLUMN IF NOT EXISTS origem TEXT;

-- Optional: index for frequent filtering
CREATE INDEX IF NOT EXISTS idx_atividade_origem ON public."Atividade" (origem);
