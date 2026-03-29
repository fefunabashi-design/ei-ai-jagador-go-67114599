
CREATE POLICY "Players can insert their own lineup on confirm"
ON public.match_lineups
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.id = match_lineups.player_id
      AND p.user_id = auth.uid()
  )
);
