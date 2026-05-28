
-- 1) Fix mutable search_path on the 2 remaining functions
CREATE OR REPLACE FUNCTION public.normalize_team_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT lower(regexp_replace(translate(coalesce(_name,''),
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'), '\s+', '', 'g'));
$function$;

CREATE OR REPLACE FUNCTION public.normalize_email(_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT lower(trim(coalesce(_email,'')));
$function$;

-- 2) Revoke EXECUTE on trigger-only SECURITY DEFINER functions (triggers run as table owner)
REVOKE ALL ON FUNCTION public.auto_lineup_on_confirm() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_summon_team_players() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.register_trial_fingerprint() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;

-- 3) is_trial_blocked is only called by edge functions with service_role
REVOKE ALL ON FUNCTION public.is_trial_blocked(text, text) FROM PUBLIC, anon, authenticated;

-- 4) RLS helpers: revoke from anon; keep EXECUTE for authenticated (needed by RLS policies)
REVOKE ALL ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_admin_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
