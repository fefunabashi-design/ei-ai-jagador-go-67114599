
DROP POLICY IF EXISTS "Team owner or player can view payments" ON public.match_payments;
CREATE POLICY "Team owner or player can view payments" ON public.match_payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    WHERE m.id = match_payments.match_id
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = match_payments.player_id AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Summons viewable by team owner or summoned player" ON public.match_summons;
CREATE POLICY "Summons viewable by team owner or summoned player" ON public.match_summons
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    WHERE m.id = match_summons.match_id
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = match_summons.player_id AND p.user_id = auth.uid()
  )
);
