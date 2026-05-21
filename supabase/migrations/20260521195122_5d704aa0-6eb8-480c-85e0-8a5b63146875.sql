CREATE OR REPLACE VIEW public.public_teams AS
SELECT id, name, abbreviation, logo_url, region, format, rating, categoria, sub_categoria, gender, estilo, play_days, play_time_start, play_time_end, war_cry, foundation_date, founder_name, instagram, field_name, addr_uf, addr_cidade, addr_bairro, addr_rua, addr_numero, addr_cep, owner_id, created_at, has_field
FROM public.teams;