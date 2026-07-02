-- Auto-link orphan players (players.user_id IS NULL) to profiles by matching CPF.
-- Complements trg_sync_player_identity_from_profile (20260701203950), which only
-- propagates name fields once a player is already linked. Neither handle_new_user()
-- nor sync_player_identity_from_profile() is modified by this migration.
--
-- Two directions are covered, since either row can be created first:
--   1) Admin creates the player row first (cpf set, user_id NULL), the player later
--      signs up -> profiles INSERT fires link_orphan_players_by_cpf().
--   2) The player already has a profile, the admin adds/edits the player's cpf
--      afterwards -> players UPDATE OF cpf fires link_player_to_profile_on_cpf_change().
--
-- Note on `email`: handle_new_user() does not populate profiles.email on INSERT
-- (see 20260528030542), so a freshly created profile has email IS NULL. Both
-- functions below use COALESCE(source.email, target's current email) so a NULL
-- profile email never blanks out an email the team admin already typed into the
-- player row. display_name/last_name/nickname/name are still copied unconditionally,
-- matching the precedent already set by sync_player_identity_from_profile().

CREATE OR REPLACE FUNCTION public.link_orphan_players_by_cpf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf text;
BEGIN
  v_cpf := regexp_replace(COALESCE(NEW.cpf, ''), '\D', '', 'g');
  IF v_cpf = '' THEN
    RETURN NEW;
  END IF;

  UPDATE public.players
    SET user_id      = NEW.user_id,
        display_name = NEW.display_name,
        last_name    = NEW.last_name,
        nickname     = NEW.nickname,
        email        = COALESCE(NEW.email, email),
        name         = NULLIF(TRIM(COALESCE(NEW.display_name, '') || ' ' || COALESCE(NEW.last_name, '')), ''),
        updated_at   = now()
  WHERE regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = v_cpf
    AND user_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_orphan_players_by_cpf ON public.profiles;
CREATE TRIGGER trg_link_orphan_players_by_cpf
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.link_orphan_players_by_cpf();

REVOKE EXECUTE ON FUNCTION public.link_orphan_players_by_cpf() FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public.link_player_to_profile_on_cpf_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf     text;
  v_profile RECORD;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_cpf := regexp_replace(COALESCE(NEW.cpf, ''), '\D', '', 'g');
  IF v_cpf = '' THEN
    RETURN NEW;
  END IF;

  SELECT p.user_id, p.display_name, p.last_name, p.nickname, p.email
    INTO v_profile
    FROM public.profiles p
   WHERE regexp_replace(COALESCE(p.cpf, ''), '\D', '', 'g') = v_cpf
   LIMIT 1;

  IF v_profile.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.players
    SET user_id      = v_profile.user_id,
        display_name = v_profile.display_name,
        last_name    = v_profile.last_name,
        nickname     = v_profile.nickname,
        email        = COALESCE(v_profile.email, email),
        name         = NULLIF(TRIM(COALESCE(v_profile.display_name, '') || ' ' || COALESCE(v_profile.last_name, '')), ''),
        updated_at   = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_player_to_profile_on_cpf_change ON public.players;
CREATE TRIGGER trg_link_player_to_profile_on_cpf_change
AFTER UPDATE OF cpf ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.link_player_to_profile_on_cpf_change();

REVOKE EXECUTE ON FUNCTION public.link_player_to_profile_on_cpf_change() FROM PUBLIC, anon, authenticated;
