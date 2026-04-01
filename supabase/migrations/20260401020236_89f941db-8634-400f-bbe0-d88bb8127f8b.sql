CREATE POLICY "Team owners can delete payments"
ON public.match_payments
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1
  FROM matches m
  JOIN teams t ON t.id = m.home_team_id
  WHERE m.id = match_payments.match_id AND t.owner_id = auth.uid()
));