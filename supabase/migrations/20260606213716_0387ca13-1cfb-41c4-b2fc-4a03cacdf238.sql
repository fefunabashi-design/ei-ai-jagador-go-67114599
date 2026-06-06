DROP VIEW IF EXISTS public.public_players;
CREATE VIEW public.public_players AS
SELECT id, team_id, user_id, name, nickname, last_name, display_name, position, jersey_number, goals, matches, rating, region, created_at, updated_at
FROM public.players;
ALTER VIEW public.public_players SET (security_invoker = off);
REVOKE ALL ON public.public_players FROM anon;
GRANT SELECT ON public.public_players TO authenticated;