-- Remove triggers and functions related to summons
DROP TRIGGER IF EXISTS trg_auto_summon_team_players ON public.matches;
DROP TRIGGER IF EXISTS trg_auto_summon_on_match_create ON public.matches;
DROP TRIGGER IF EXISTS trg_auto_lineup_on_confirm ON public.match_summons;
DROP FUNCTION IF EXISTS public.auto_summon_team_players() CASCADE;
DROP FUNCTION IF EXISTS public.auto_lineup_on_confirm() CASCADE;

-- Remove from realtime publication if present
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables
             WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='match_summons') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.match_summons';
  END IF;
END $$;

-- Recreate can_access_match_realtime without match_summons join
CREATE OR REPLACE FUNCTION public.can_access_match_realtime(_match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _match_id IS NULL THEN false ELSE EXISTS (
    SELECT 1 FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    LEFT JOIN public.players ph ON ph.team_id = m.home_team_id AND ph.user_id = auth.uid()
    LEFT JOIN public.players pa ON pa.team_id = m.away_team_id AND pa.user_id = auth.uid()
    WHERE m.id = _match_id AND auth.uid() IS NOT NULL
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid()
           OR ph.id IS NOT NULL OR pa.id IS NOT NULL)
  ) END;
$$;

-- Drop the summons table entirely
DROP TABLE IF EXISTS public.match_summons CASCADE;