DROP POLICY IF EXISTS "Guests viewable by everyone" ON public.match_guests;
CREATE POLICY "Match participants can view guests"
ON public.match_guests
FOR SELECT
TO authenticated
USING (public.can_access_match_realtime(match_id));