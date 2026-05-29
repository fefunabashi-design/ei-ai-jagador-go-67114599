
-- Fix broken unique constraint on mensalidade_config and add per-month support
ALTER TABLE public.mensalidade_config DROP CONSTRAINT IF EXISTS mensalidade_config_ano_key;

ALTER TABLE public.mensalidade_config
  ADD COLUMN IF NOT EXISTS mes integer CHECK (mes IS NULL OR (mes BETWEEN 1 AND 12));

-- Unique per team+year+month (NULL mes = default for the whole year)
CREATE UNIQUE INDEX IF NOT EXISTS mensalidade_config_team_ano_mes_uidx
  ON public.mensalidade_config (team_id, ano, mes) NULLS NOT DISTINCT;
