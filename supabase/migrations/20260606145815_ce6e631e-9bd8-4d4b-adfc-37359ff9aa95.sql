ALTER VIEW public.public_teams SET (security_invoker = off);
GRANT SELECT ON public.public_teams TO authenticated, anon;