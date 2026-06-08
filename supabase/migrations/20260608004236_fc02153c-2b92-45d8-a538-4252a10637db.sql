DROP VIEW IF EXISTS public.public_players;
CREATE VIEW public.public_players AS
SELECT id, team_id, user_id, name, nickname, last_name, display_name,
  "position", jersey_number, goals, matches, rating, region, birth_date,
  created_at, updated_at
FROM public.players;

GRANT SELECT ON public.public_players TO anon, authenticated;