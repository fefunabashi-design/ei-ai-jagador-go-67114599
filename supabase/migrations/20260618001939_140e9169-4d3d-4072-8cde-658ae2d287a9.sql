
-- 1. Fix SECURITY DEFINER views: switch to security_invoker so RLS applies per caller
ALTER VIEW public.public_players SET (security_invoker = on);

-- 2. Recreate public_teams without PII columns (phone, admin_name, admin_phone)
DROP VIEW IF EXISTS public.public_teams;
CREATE VIEW public.public_teams
WITH (security_invoker = on) AS
SELECT
  id, name, abbreviation, logo_url, region, format, rating,
  categoria, sub_categoria, gender, estilo,
  play_days, play_time_start, play_time_end, war_cry,
  foundation_date, founder_name, instagram,
  field_name, field_address, addr_uf, addr_cidade, addr_bairro,
  addr_rua, addr_numero, addr_cep, owner_id, created_at,
  has_field, coach_name, play_schedule
FROM public.teams;

GRANT SELECT ON public.public_teams TO authenticated, anon;
GRANT SELECT ON public.public_players TO authenticated, anon;

-- 3. Add INSERT (broadcast) policies on realtime.messages mirroring SELECT scoping
CREATE POLICY "Authenticated can send realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() = ('user:'::text || (auth.uid())::text))
  OR (
    (realtime.topic() ~~ 'team:%'::text)
    AND public.is_team_member(
      (substring(realtime.topic(), 'team:(.*)'::text))::uuid,
      auth.uid()
    )
  )
  OR (
    (realtime.topic() ~~ 'chat:%'::text)
    AND public.can_access_match_realtime(
      (NULLIF(split_part(realtime.topic(), ':'::text, 2), ''::text))::uuid
    )
  )
  OR (
    (
      (realtime.topic() ~~ 'match:%'::text)
      OR (realtime.topic() ~~ 'lineup:%'::text)
      OR (realtime.topic() ~~ 'summon:%'::text)
    )
    AND public.can_access_match_realtime(
      (NULLIF(split_part(realtime.topic(), ':'::text, 2), ''::text))::uuid
    )
  )
);

-- 4. Revoke default PUBLIC/anon execute on SECURITY DEFINER helpers; grant only where needed
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_admin_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_match_realtime(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_trial_blocked(text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_match_realtime(uuid) TO authenticated;
-- is_trial_blocked stays service_role/postgres only
