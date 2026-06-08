
DROP POLICY IF EXISTS "Photo posts viewable by everyone" ON public.photo_posts;
DROP POLICY IF EXISTS "Resenha posts viewable by everyone" ON public.resenha_posts;
DROP POLICY IF EXISTS "Resenha comments viewable by everyone" ON public.resenha_comments;
DROP POLICY IF EXISTS "Reactions viewable by everyone" ON public.resenha_reactions;

-- match_summons: extend to away team owners and scope to authenticated
DROP POLICY IF EXISTS "Team owners can insert summons" ON public.match_summons;
DROP POLICY IF EXISTS "Team owners can update summons" ON public.match_summons;
DROP POLICY IF EXISTS "Team owners can delete summons" ON public.match_summons;
DROP POLICY IF EXISTS "Players can update their own summons" ON public.match_summons;

CREATE POLICY "Team owners can insert summons"
  ON public.match_summons FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    WHERE m.id = match_summons.match_id
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid())
  ));

CREATE POLICY "Team owners can update summons"
  ON public.match_summons FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    WHERE m.id = match_summons.match_id
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid())
  ));

CREATE POLICY "Team owners can delete summons"
  ON public.match_summons FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    WHERE m.id = match_summons.match_id
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid())
  ));

CREATE POLICY "Players can update their own summons"
  ON public.match_summons FOR UPDATE TO authenticated
  USING (player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()))
  WITH CHECK (player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()));

-- match_payments: extend to away team owners
DROP POLICY IF EXISTS "Team owners can manage payments" ON public.match_payments;
DROP POLICY IF EXISTS "Team owners can update payments" ON public.match_payments;
DROP POLICY IF EXISTS "Team owners can delete payments" ON public.match_payments;

CREATE POLICY "Team owners can manage payments"
  ON public.match_payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    WHERE m.id = match_payments.match_id
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid())
  ));

CREATE POLICY "Team owners can update payments"
  ON public.match_payments FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    WHERE m.id = match_payments.match_id
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid())
  ));

CREATE POLICY "Team owners can delete payments"
  ON public.match_payments FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    WHERE m.id = match_payments.match_id
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid())
  ));
