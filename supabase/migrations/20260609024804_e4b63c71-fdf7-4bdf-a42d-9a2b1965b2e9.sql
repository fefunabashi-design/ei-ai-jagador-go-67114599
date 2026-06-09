UPDATE public.profiles
SET subscription_expires_at = now() + interval '30 days',
    subscription_status = 'trialing'
WHERE user_id = '68133df4-71ee-4e62-9aee-8b1ac4ca435c';