ALTER TABLE public.resultats
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE public.resultats
SET created_at = NOW()
WHERE created_at IS NULL;

ALTER TABLE public.resultats
  ALTER COLUMN created_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_resultats_user_created_at
  ON public.resultats (user_id, created_at DESC);
