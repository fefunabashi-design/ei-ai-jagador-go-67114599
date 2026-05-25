-- profiles: restringir INSERT/UPDATE a usuários autenticados (explícito)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- trial_blocklist: permitir que super admins gerenciem
CREATE POLICY "Super admin can insert blocklist"
ON public.trial_blocklist FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admin can update blocklist"
ON public.trial_blocklist FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admin can delete blocklist"
ON public.trial_blocklist FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Views públicas: forçar security_invoker para respeitar RLS do consumidor
ALTER VIEW public.public_players SET (security_invoker = on);
ALTER VIEW public.public_teams SET (security_invoker = on);
ALTER VIEW public.public_profiles SET (security_invoker = on);