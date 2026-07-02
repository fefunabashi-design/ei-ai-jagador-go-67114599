-- Fix: trg_link_orphan_players_by_cpf (20260702050000) only fired on
-- AFTER INSERT ON public.profiles, covering just one of the two legitimate
-- ways a profile's cpf gets populated:
--   1) Signup with CPF already typed in -> handle_new_user() INSERTs the
--      profile with cpf already set (src/pages/Auth.tsx passes cpf in
--      auth.signUp options.data when the user provides it at signup).
--   2) Signup without CPF, cpf added/edited later on the profile screen
--      (src/pages/Profile.tsx) -> UPDATE public.profiles SET cpf = ...
-- Path 2 never fired the trigger, so an orphan player (players.user_id IS
-- NULL) never got linked when the matching user added their CPF after the
-- fact via profile edit instead of at signup.
--
-- Fix: widen the trigger to also fire on UPDATE OF cpf. No change to the
-- function body -- link_orphan_players_by_cpf() already guards correctly
-- for this event: it matches on NEW.cpf AND players.user_id IS NULL, so a
-- cpf edit that doesn't match any orphan player is a zero-row UPDATE with
-- no side effect, and a player already linked elsewhere is never touched
-- (user_id IS NULL excludes it).

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

DROP TRIGGER IF EXISTS trg_link_orphan_players_by_cpf ON public.profiles;
CREATE TRIGGER trg_link_orphan_players_by_cpf
AFTER INSERT OR UPDATE OF cpf ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.link_orphan_players_by_cpf();
