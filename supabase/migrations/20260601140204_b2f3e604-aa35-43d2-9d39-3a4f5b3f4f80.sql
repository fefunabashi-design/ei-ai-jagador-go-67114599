-- Allow clients to verify match access from the app before subscribing to Realtime channels
GRANT EXECUTE ON FUNCTION public.can_access_match_realtime(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_match_realtime(uuid) FROM anon, public;