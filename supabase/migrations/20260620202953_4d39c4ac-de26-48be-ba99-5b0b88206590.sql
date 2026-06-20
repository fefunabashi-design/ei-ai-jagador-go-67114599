DROP VIEW IF EXISTS public.public_teams;

CREATE OR REPLACE VIEW public.public_teams WITH (security_invoker = false) AS
SELECT id,
    name,
    abbreviation,
    logo_url,
    region,
    format,
    rating,
    categoria,
    sub_categoria,
    gender,
    estilo,
    play_days,
    play_time_start,
    play_time_end,
    war_cry,
    foundation_date,
    founder_name,
    instagram,
    field_name,
    field_address,
    addr_uf,
    addr_cidade,
    addr_bairro,
    addr_rua,
    addr_numero,
    addr_cep,
    owner_id,
    created_at,
    has_field,
    coach_name,
    play_schedule
   FROM teams;

GRANT SELECT ON public.public_teams TO anon;
GRANT SELECT ON public.public_teams TO authenticated;
GRANT ALL ON public.public_teams TO service_role;