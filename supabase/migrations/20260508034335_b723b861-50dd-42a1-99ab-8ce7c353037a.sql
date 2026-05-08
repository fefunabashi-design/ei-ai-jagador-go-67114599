
CREATE OR REPLACE FUNCTION public.is_trial_blocked(_email text, _team_name text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _team_name IS NULL OR length(trim(_team_name)) = 0 THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.trial_blocklist b
      WHERE b.team_name_normalized = public.normalize_team_name(_team_name)
    )
  END;
$$;
