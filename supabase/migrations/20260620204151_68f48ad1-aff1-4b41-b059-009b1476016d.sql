DROP VIEW IF EXISTS public.public_teams;
CREATE VIEW public.public_teams
WITH (security_invoker = on) AS
SELECT
  id, name, abbreviation, logo_url, region, format, rating,
  categoria, sub_categoria, gender, estilo, play_days,
  play_time_start, play_time_end, war_cry, foundation_date,
  founder_name, instagram, field_name, field_address,
  addr_uf, addr_cidade, addr_bairro, addr_rua, addr_numero, addr_cep,
  owner_id, created_at, has_field, coach_name, play_schedule,
  phone, admin_name, admin_phone
FROM public.teams;

GRANT SELECT ON public.public_teams TO anon, authenticated;

-- Allow signed-in users to view team data through the view (team profile info
-- is intended to be discoverable so opponents can find and contact them).
CREATE POLICY "Authenticated users can view teams"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (true);