
-- 1) match_summons: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Summons viewable by everyone" ON public.match_summons;
CREATE POLICY "Summons viewable by authenticated"
ON public.match_summons
FOR SELECT
TO authenticated
USING (true);

-- 2) mensalidade_config: add DELETE policy for team owners
CREATE POLICY "Team owners can delete config"
ON public.mensalidade_config
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.teams t
  WHERE t.id = mensalidade_config.team_id AND t.owner_id = auth.uid()
));

-- 3) profiles: prevent privilege escalation via trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow super admins to change anything
  IF public.is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
     OR NEW.is_pro IS DISTINCT FROM OLD.is_pro
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Não é permitido alterar campos privilegiados do perfil';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
