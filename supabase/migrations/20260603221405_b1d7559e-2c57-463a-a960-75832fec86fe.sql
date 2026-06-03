
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.match_chat_messages;
CREATE POLICY "Match participants can send messages"
ON public.match_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.can_access_match_realtime(match_id));

DROP POLICY IF EXISTS "Players can insert their own lineup on confirm" ON public.match_lineups;
CREATE POLICY "Players can insert their own lineup on confirm"
ON public.match_lineups
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.players p WHERE p.id = match_lineups.player_id AND p.user_id = auth.uid())
  AND public.can_access_match_realtime(match_id)
);
