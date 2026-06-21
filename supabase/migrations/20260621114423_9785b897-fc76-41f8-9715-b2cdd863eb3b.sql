CREATE OR REPLACE FUNCTION public.is_trial_blocked(_email text, _team_name text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.trial_blocklist b
    WHERE (_team_name IS NOT NULL AND length(trim(_team_name)) > 0
           AND b.team_name_normalized = public.normalize_team_name(_team_name))
       OR (_email IS NOT NULL AND length(trim(_email)) > 0
           AND public.normalize_email(_email) = ANY(b.emails))
  );
$function$;