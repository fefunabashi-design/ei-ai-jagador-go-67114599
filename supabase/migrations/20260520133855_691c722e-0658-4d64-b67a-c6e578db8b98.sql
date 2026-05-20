UPDATE public.profiles
SET subscription_expires_at = trial_started_at + INTERVAL '30 days',
    subscription_status = 'trialing'
WHERE trial_started_at IS NOT NULL
  AND subscription_status IN ('trialing','expired')
  AND (trial_started_at + INTERVAL '30 days') > now();