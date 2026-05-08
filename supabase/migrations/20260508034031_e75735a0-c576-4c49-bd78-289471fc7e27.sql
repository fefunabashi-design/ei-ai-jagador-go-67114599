
-- Normalization helpers
CREATE OR REPLACE FUNCTION public.normalize_team_name(_name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(regexp_replace(translate(coalesce(_name,''),
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'), '\s+', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.normalize_email(_email text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(trim(coalesce(_email,'')));
$$;

-- Blocklist table
CREATE TABLE public.trial_blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name_normalized text NOT NULL,
  emails text[] NOT NULL DEFAULT '{}',
  source_team_id uuid,
  source_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trial_blocklist_team ON public.trial_blocklist(team_name_normalized);
CREATE INDEX idx_trial_blocklist_emails ON public.trial_blocklist USING GIN(emails);

ALTER TABLE public.trial_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can view blocklist"
ON public.trial_blocklist FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Check function (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_trial_blocked(_email text, _team_name text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trial_blocklist b
    WHERE public.normalize_email(_email) = ANY(b.emails)
       OR (_team_name IS NOT NULL
           AND b.team_name_normalized = public.normalize_team_name(_team_name))
  );
$$;

-- Register fingerprint when a team is created/updated
CREATE OR REPLACE FUNCTION public.register_trial_fingerprint()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_email text;
  emails_arr text[];
BEGIN
  SELECT au.email INTO owner_email FROM auth.users au WHERE au.id = NEW.owner_id;

  emails_arr := ARRAY(
    SELECT DISTINCT public.normalize_email(e)
    FROM unnest(ARRAY[owner_email, NEW.admin_email, NEW.president_email, NEW.email]) AS e
    WHERE e IS NOT NULL AND length(trim(e)) > 0
  );

  INSERT INTO public.trial_blocklist (team_name_normalized, emails, source_team_id, source_user_id)
  VALUES (public.normalize_team_name(NEW.name), emails_arr, NEW.id, NEW.owner_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER teams_register_trial_fingerprint
AFTER INSERT ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.register_trial_fingerprint();

-- Backfill existing teams so antigos clientes já contam para a blocklist
INSERT INTO public.trial_blocklist (team_name_normalized, emails, source_team_id, source_user_id)
SELECT
  public.normalize_team_name(t.name),
  ARRAY(
    SELECT DISTINCT public.normalize_email(e)
    FROM unnest(ARRAY[au.email, t.admin_email, t.president_email, t.email]) AS e
    WHERE e IS NOT NULL AND length(trim(e)) > 0
  ),
  t.id,
  t.owner_id
FROM public.teams t
LEFT JOIN auth.users au ON au.id = t.owner_id;
