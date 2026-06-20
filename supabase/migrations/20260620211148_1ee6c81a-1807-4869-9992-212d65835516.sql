DROP VIEW IF EXISTS public.public_players CASCADE;

CREATE VIEW public.public_players
WITH (security_invoker = off) AS
SELECT * FROM public.players;

GRANT SELECT ON public.public_players TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_players_unrestricted
WITH (security_invoker = off) AS
SELECT * FROM public.players;

GRANT SELECT ON public.public_players_unrestricted TO anon, authenticated;