DROP POLICY IF EXISTS "Team owners can update their matches" ON public.matches;
CREATE POLICY "Team owners can update their matches"
ON public.matches
FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = matches.home_team_id AND teams.owner_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = matches.away_team_id AND teams.owner_id = auth.uid()))
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = matches.home_team_id AND teams.owner_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = matches.away_team_id AND teams.owner_id = auth.uid()))
);