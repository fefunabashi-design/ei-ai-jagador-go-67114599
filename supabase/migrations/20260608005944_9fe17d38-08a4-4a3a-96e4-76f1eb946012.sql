
-- 1) matches SELECT: restrict to authenticated
DROP POLICY IF EXISTS "Matches are viewable by everyone" ON public.matches;
CREATE POLICY "Matches are viewable by authenticated users"
ON public.matches
FOR SELECT
TO authenticated
USING (true);

-- 2) profiles: defense-in-depth - revoke UPDATE on privileged columns
REVOKE UPDATE (is_super_admin, is_pro, subscription_status, subscription_expires_at, role, trial_started_at, user_id)
  ON public.profiles FROM authenticated, anon;
