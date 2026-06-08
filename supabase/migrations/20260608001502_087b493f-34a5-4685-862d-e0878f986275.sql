
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS away_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS home_finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS away_finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS home_reported_home_score int,
  ADD COLUMN IF NOT EXISTS home_reported_away_score int,
  ADD COLUMN IF NOT EXISTS away_reported_home_score int,
  ADD COLUMN IF NOT EXISTS away_reported_away_score int;

-- Backfill: partidas com status 'completed' viram 'confirmed' com finalização de ambos os lados
UPDATE public.matches
SET
  home_finalized_at = COALESCE(home_finalized_at, updated_at),
  away_finalized_at = COALESCE(away_finalized_at, updated_at),
  home_reported_home_score = COALESCE(home_reported_home_score, home_score),
  home_reported_away_score = COALESCE(home_reported_away_score, away_score),
  away_reported_home_score = COALESCE(away_reported_home_score, home_score),
  away_reported_away_score = COALESCE(away_reported_away_score, away_score),
  status = 'confirmed'
WHERE status = 'completed';
