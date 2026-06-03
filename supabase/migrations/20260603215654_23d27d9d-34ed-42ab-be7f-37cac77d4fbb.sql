CREATE OR REPLACE FUNCTION public.can_access_match_realtime(_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    LEFT JOIN public.teams t ON t.id = m.home_team_id
    LEFT JOIN public.match_summons s ON s.match_id = m.id
      AND s.player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
    WHERE m.id = _match_id
      AND (t.owner_id = auth.uid() OR s.id IS NOT NULL)
  );
$function$;