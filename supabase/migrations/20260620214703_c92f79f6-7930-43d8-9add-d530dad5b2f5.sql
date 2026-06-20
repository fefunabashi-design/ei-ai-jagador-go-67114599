
-- Revoke anon/PUBLIC EXECUTE on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.get_public_players() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_public_teams() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_players() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_teams() TO authenticated;

-- Remove anon SELECT on the views that wrap those functions
REVOKE SELECT ON public.public_players FROM anon;
REVOKE SELECT ON public.public_players_unrestricted FROM anon;
REVOKE SELECT ON public.public_teams FROM anon;
