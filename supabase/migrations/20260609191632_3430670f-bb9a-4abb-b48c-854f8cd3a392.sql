DROP POLICY IF EXISTS "Team owner can accept open match" ON public.matches;

CREATE POLICY "Team owner can accept open match"
ON public.matches
FOR UPDATE
TO authenticated
USING (
  away_team_id IS NULL
  AND status = 'open'
  AND EXISTS (SELECT 1 FROM public.teams t WHERE t.owner_id = auth.uid())
)
WITH CHECK (
  status IN ('open','confirmed')
  AND away_team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = matches.away_team_id AND t.owner_id = auth.uid()
  )
  AND home_score IS NULL
  AND away_score IS NULL
);