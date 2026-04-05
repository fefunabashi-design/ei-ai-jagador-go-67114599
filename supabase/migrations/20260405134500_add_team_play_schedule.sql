ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS play_days text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS play_time_start text,
  ADD COLUMN IF NOT EXISTS play_time_end text;
