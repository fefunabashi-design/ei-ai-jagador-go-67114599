-- Fix SECURITY DEFINER view finding on public_players / public_players_unrestricted.
-- Recreate as security_invoker views exposing only non-sensitive columns, and add
-- a permissive SELECT RLS policy on players so opponent rows remain visible.

DROP VIEW IF EXISTS public.public_players;
DROP VIEW IF EXISTS public.public_players_unrestricted;

CREATE VIEW public.public_players
WITH (security_invoker = on) AS
SELECT
  id, team_id, user_id, name, "position", jersey_number,
  goals, matches, rating, created_at, updated_at,
  nickname, birth_date, region, last_name, display_name
FROM public.players;

GRANT SELECT ON public.public_players TO anon, authenticated;

CREATE VIEW public.public_players_unrestricted
WITH (security_invoker = on) AS
SELECT
  id, team_id, user_id, name, "position", jersey_number,
  goals, matches, rating, created_at, updated_at,
  nickname, birth_date, region, last_name, display_name
FROM public.players;

GRANT SELECT ON public.public_players_unrestricted TO anon, authenticated;

-- Permissive SELECT so any authenticated user can read player rows through the views.
-- Sensitive columns (email, cpf, phone) are NOT included in the views above.
DROP POLICY IF EXISTS "Authenticated can view players basic info" ON public.players;
CREATE POLICY "Authenticated can view players basic info"
ON public.players
FOR SELECT
TO authenticated
USING (true);