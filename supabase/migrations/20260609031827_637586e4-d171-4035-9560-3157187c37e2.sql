CREATE OR REPLACE FUNCTION public.can_access_match_realtime(_match_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN _match_id IS NULL THEN false ELSE EXISTS (
    SELECT 1
    FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    LEFT JOIN public.match_summons s ON s.match_id = m.id
      AND s.player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
    LEFT JOIN public.players ph ON ph.team_id = m.home_team_id AND ph.user_id = auth.uid()
    LEFT JOIN public.players pa ON pa.team_id = m.away_team_id AND pa.user_id = auth.uid()
    WHERE m.id = _match_id
      AND auth.uid() IS NOT NULL
      AND (
        th.owner_id = auth.uid()
        OR ta.owner_id = auth.uid()
        OR s.id IS NOT NULL
        OR ph.id IS NOT NULL
        OR pa.id IS NOT NULL
      )
  ) END;
$function$;