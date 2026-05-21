ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS president_phone text,
  ADD COLUMN IF NOT EXISTS coach_phone text,
  ADD COLUMN IF NOT EXISTS coach_email text,
  ADD COLUMN IF NOT EXISTS assistant_coach_name text,
  ADD COLUMN IF NOT EXISTS assistant_coach_phone text,
  ADD COLUMN IF NOT EXISTS assistant_coach_email text;