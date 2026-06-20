DROP POLICY IF EXISTS "Authenticated can view players basic info" ON public.players;

CREATE OR REPLACE FUNCTION public.get_public_players()
RETURNS TABLE (
  id uuid, team_id uuid, user_id uuid, name text, "position" text,
  jersey_number integer, goals integer, matches integer, rating numeric,
  created_at timestamptz, updated_at timestamptz, nickname text,
  birth_date date, region text, last_name text, display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, team_id, user_id, name, "position", jersey_number, goals, matches, rating,
         created_at, updated_at, nickname, birth_date, region, last_name, display_name
  FROM public.players;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_players() TO anon, authenticated;

DROP VIEW IF EXISTS public.public_players;
CREATE VIEW public.public_players
WITH (security_invoker = on) AS
SELECT * FROM public.get_public_players();
GRANT SELECT ON public.public_players TO anon, authenticated;

DROP VIEW IF EXISTS public.public_players_unrestricted;
CREATE VIEW public.public_players_unrestricted
WITH (security_invoker = on) AS
SELECT * FROM public.get_public_players();
GRANT SELECT ON public.public_players_unrestricted TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_teams()
RETURNS TABLE (
  id uuid, name text, abbreviation text, logo_url text, region text, format text,
  rating numeric, categoria text, sub_categoria text, gender text, estilo text,
  play_days text[], play_time_start text, play_time_end text, war_cry text,
  foundation_date date, founder_name text, instagram text, field_name text,
  field_address text, addr_uf text, addr_cidade text, addr_bairro text,
  addr_rua text, addr_numero text, addr_cep text, owner_id uuid,
  created_at timestamptz, has_field boolean, coach_name text, play_schedule jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, abbreviation, logo_url, region, format, rating, categoria,
         sub_categoria, gender, estilo, play_days, play_time_start, play_time_end,
         war_cry, foundation_date, founder_name, instagram, field_name,
         field_address, addr_uf, addr_cidade, addr_bairro, addr_rua, addr_numero,
         addr_cep, owner_id, created_at, has_field, coach_name, play_schedule
  FROM public.teams;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_teams() TO anon, authenticated;

DROP VIEW IF EXISTS public.public_teams;
CREATE VIEW public.public_teams
WITH (security_invoker = on) AS
SELECT * FROM public.get_public_teams();
GRANT SELECT ON public.public_teams TO anon, authenticated;