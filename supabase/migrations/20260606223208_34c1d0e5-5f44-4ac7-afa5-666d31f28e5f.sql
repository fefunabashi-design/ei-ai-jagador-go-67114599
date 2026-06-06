DROP POLICY IF EXISTS "Team owners can delete their matches" ON public.matches;
CREATE POLICY "Team owners can delete their matches"
ON public.matches FOR DELETE
USING (
  EXISTS (SELECT 1 FROM teams WHERE teams.id = matches.home_team_id AND teams.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM teams WHERE teams.id = matches.away_team_id AND teams.owner_id = auth.uid())
);