
-- 1. Profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- 2. has_admin_access function
CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.subscription_status IN ('trialing','active')
      AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > now())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_admin_access(uuid) FROM anon;

-- 3. is_super_admin helper
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.is_super_admin = true
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;

-- 4. admin_subscriptions table
CREATE TABLE IF NOT EXISTS public.admin_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 29.90,
  pix_txid text,
  proof_url text,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  period_start timestamptz,
  period_end timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscriptions"
ON public.admin_subscriptions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users insert own subscription"
ON public.admin_subscriptions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Super admin updates subscriptions"
ON public.admin_subscriptions FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 5. Tighten teams INSERT to require admin access
DROP POLICY IF EXISTS "Owners can insert their own team" ON public.teams;
CREATE POLICY "PRO owners can insert their own team"
ON public.teams FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id AND public.has_admin_access(auth.uid()));

-- 6. Tighten players INSERT to require admin access (team owner)
DROP POLICY IF EXISTS "Team owners can insert players" ON public.players;
CREATE POLICY "PRO team owners can insert players"
ON public.players FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams WHERE teams.id = players.team_id AND teams.owner_id = auth.uid())
  AND public.has_admin_access(auth.uid())
);

-- 7. Storage bucket payment-proofs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users read own proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "Super admin reads all proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND public.is_super_admin(auth.uid()));
