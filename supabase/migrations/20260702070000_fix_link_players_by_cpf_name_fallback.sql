-- Fix: link_orphan_players_by_cpf() and link_player_to_profile_on_cpf_change()
-- (20260702050000) computed `name` as
--   NULLIF(TRIM(COALESCE(display_name,'') || ' ' || COALESCE(last_name,'')), '')
-- which evaluates to NULL when the linked profile has neither display_name nor
-- last_name set. players.name is NOT NULL, so linking to a nameless profile
-- raised a 23502 not-null-violation and aborted the INSERT/UPDATE that fired
-- the trigger.
--
-- Fix: wrap the computed name in the same COALESCE-preserve-current-value
-- pattern already used for `email` in this migration -- only overwrite `name`
-- when the computed value is non-empty, otherwise keep the player's existing
-- name. Triggers themselves are unchanged, only the function bodies.

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
        name         = COALESCE(
                         NULLIF(TRIM(COALESCE(NEW.display_name, '') || ' ' || COALESCE(NEW.last_name, '')), ''),
                         name
                       ),
        updated_at   = now()
  WHERE regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = v_cpf
    AND user_id IS NULL;

  RETURN NEW;
END;
$$;

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
        name         = COALESCE(
                         NULLIF(TRIM(COALESCE(v_profile.display_name, '') || ' ' || COALESCE(v_profile.last_name, '')), ''),
                         name
                       ),
        updated_at   = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_player_to_profile_on_cpf_change() FROM PUBLIC, anon, authenticated;
