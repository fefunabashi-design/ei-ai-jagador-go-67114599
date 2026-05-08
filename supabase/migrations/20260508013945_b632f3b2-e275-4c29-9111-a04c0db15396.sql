
-- ============ Helper: is team member (owner OR linked player) ============
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.players p WHERE p.team_id = _team_id AND p.user_id = _user_id
  );
$$;

-- ============ PROFILES ============
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Public view exposing only safe fields (non-sensitive) for everyone
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT user_id, display_name, nickname, avatar_url, region
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ============ PLAYERS ============
DROP POLICY IF EXISTS "Authenticated users can view players" ON public.players;
CREATE POLICY "Team owner or self can view players"
  ON public.players FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = players.team_id AND t.owner_id = auth.uid())
    OR players.user_id = auth.uid()
    OR public.is_team_member(players.team_id, auth.uid())
  );

-- ============ TEAMS ============
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;
-- Full row visible to owner and members
CREATE POLICY "Team members can view full team"
  ON public.teams FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.is_team_member(id, auth.uid()));

-- Public-safe view for browsing teams (challenges, search)
CREATE OR REPLACE VIEW public.public_teams
WITH (security_invoker = true) AS
SELECT id, name, abbreviation, logo_url, region, format, rating, categoria,
       play_days, play_time_start, play_time_end, war_cry, foundation_date,
       founder_name, instagram, field_name, owner_id, created_at
FROM public.teams;

GRANT SELECT ON public.public_teams TO anon, authenticated;

-- ============ MENSALIDADE_CONFIG ============
DROP POLICY IF EXISTS "Config viewable by everyone" ON public.mensalidade_config;
CREATE POLICY "Team members can view mensalidade config"
  ON public.mensalidade_config FOR SELECT TO authenticated
  USING (public.is_team_member(team_id, auth.uid()));

-- ============ STORAGE: remove redundant permissive policies ============
DROP POLICY IF EXISTS "Auth users can delete team logos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can update team logos" ON storage.objects;

-- ============ REVOKE anon EXECUTE on SECURITY DEFINER functions ============
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_lineup_on_confirm() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_summon_team_players() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
