CREATE POLICY "Team owner can accept open match"
ON public.matches
FOR UPDATE
TO authenticated
USING (
  away_team_id IS NULL
  AND EXISTS (SELECT 1 FROM public.teams t WHERE t.owner_id = auth.uid())
)
WITH CHECK (
  away_team_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = away_team_id AND t.owner_id = auth.uid())
);