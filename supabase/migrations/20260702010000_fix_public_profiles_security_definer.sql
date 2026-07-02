-- Fix: public_profiles has security_invoker = on (20260528191637), so it inherits the
-- profiles table's own-row-only SELECT policy ("Users can view their own profile",
-- auth.uid() = user_id). Any caller querying public_profiles for another user's
-- user_id gets zero rows back (avatar_url, display_name, etc. never returned), which is
-- why opponent/teammate avatars never render in OpponentDetails.tsx / Team.tsx.
--
-- Same class of bug already fixed for public_players / public_teams in
-- 20260620212559 and 20260620212927 via a SECURITY DEFINER function wrapped by a
-- security_invoker view. Applying the identical pattern here, restricted to the
-- same non-sensitive column list the view already exposed (user_id, display_name,
-- nickname, avatar_url, region) — no sensitive columns (cpf, phone, email,
-- birth_date, subscription/admin fields) are included.

CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  nickname text,
  avatar_url text,
  region text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, display_name, nickname, avatar_url, region
  FROM public.profiles;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO anon, authenticated;

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT * FROM public.get_public_profiles();

GRANT SELECT ON public.public_profiles TO anon, authenticated;
