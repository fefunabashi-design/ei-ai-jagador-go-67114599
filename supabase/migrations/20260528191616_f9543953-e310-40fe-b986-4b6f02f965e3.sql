-- 1) Restrict match_summons SELECT to team owner or the summoned player
DROP POLICY IF EXISTS "Summons viewable by authenticated" ON public.match_summons;
DROP POLICY IF EXISTS "Summons viewable by everyone" ON public.match_summons;

CREATE POLICY "Summons viewable by team owner or summoned player"
ON public.match_summons
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.matches m
    JOIN public.teams t ON t.id = m.home_team_id
    WHERE m.id = match_summons.match_id
      AND t.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.id = match_summons.player_id
      AND p.user_id = auth.uid()
  )
);

-- 2) Set public_teams view to security_invoker so RLS of caller applies
ALTER VIEW public.public_teams SET (security_invoker = on);