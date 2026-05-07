-- Phase B: extra columns for teams and players to match UI
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS play_days text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS play_time_start text,
  ADD COLUMN IF NOT EXISTS play_time_end text,
  ADD COLUMN IF NOT EXISTS mobile text;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS email text;

-- Auto summon trigger (idempotent)
DROP TRIGGER IF EXISTS trg_auto_summon_team_players ON public.matches;
CREATE TRIGGER trg_auto_summon_team_players
AFTER INSERT ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.auto_summon_team_players();

-- Auto lineup on confirm (idempotent)
DROP TRIGGER IF EXISTS trg_auto_lineup_on_confirm ON public.match_summons;
CREATE TRIGGER trg_auto_lineup_on_confirm
AFTER UPDATE ON public.match_summons
FOR EACH ROW EXECUTE FUNCTION public.auto_lineup_on_confirm();

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_teams_updated_at ON public.teams;
CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_players_updated_at ON public.players;
CREATE TRIGGER trg_players_updated_at BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_matches_updated_at ON public.matches;
CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();