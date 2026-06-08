DROP POLICY IF EXISTS "Match events viewable by everyone" ON public.match_events;

CREATE POLICY "Authenticated can view match events"
ON public.match_events
FOR SELECT
TO authenticated
USING (public.can_access_match_realtime(match_id));