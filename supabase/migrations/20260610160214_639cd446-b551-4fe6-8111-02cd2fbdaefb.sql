
-- Restrict policies to authenticated role only

-- match_payments SELECT
DROP POLICY IF EXISTS "Team owner or player can view payments" ON public.match_payments;
CREATE POLICY "Team owner or player can view payments" ON public.match_payments
FOR SELECT TO authenticated
USING (
  (EXISTS (SELECT 1 FROM matches m
    LEFT JOIN teams th ON th.id = m.home_team_id
    LEFT JOIN teams ta ON ta.id = m.away_team_id
    WHERE m.id = match_payments.match_id
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid())))
  OR (EXISTS (SELECT 1 FROM players p
    WHERE p.id = match_payments.player_id AND p.user_id = auth.uid()))
);

-- matches
DROP POLICY IF EXISTS "Team owners can create matches" ON public.matches;
CREATE POLICY "Team owners can create matches" ON public.matches
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM teams WHERE teams.id = matches.home_team_id AND teams.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Team owners can delete their matches" ON public.matches;
CREATE POLICY "Team owners can delete their matches" ON public.matches
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM teams WHERE teams.id = matches.home_team_id AND teams.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM teams WHERE teams.id = matches.away_team_id AND teams.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Team owners can update their matches" ON public.matches;
CREATE POLICY "Team owners can update their matches" ON public.matches
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM teams WHERE teams.id = matches.home_team_id AND teams.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM teams WHERE teams.id = matches.away_team_id AND teams.owner_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM teams WHERE teams.id = matches.home_team_id AND teams.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM teams WHERE teams.id = matches.away_team_id AND teams.owner_id = auth.uid())
);

-- players
DROP POLICY IF EXISTS "Team owners can delete players" ON public.players;
CREATE POLICY "Team owners can delete players" ON public.players
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Team owners can update players" ON public.players;
CREATE POLICY "Team owners can update players" ON public.players
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.owner_id = auth.uid()));

-- teams
DROP POLICY IF EXISTS "Owners can delete their own team" ON public.teams;
CREATE POLICY "Owners can delete their own team" ON public.teams
FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their own team" ON public.teams;
CREATE POLICY "Owners can update their own team" ON public.teams
FOR UPDATE TO authenticated
USING (auth.uid() = owner_id);
