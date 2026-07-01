
CREATE OR REPLACE FUNCTION public.sync_player_identity_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name
     OR NEW.last_name IS DISTINCT FROM OLD.last_name
     OR NEW.nickname IS DISTINCT FROM OLD.nickname THEN
    UPDATE public.players
      SET display_name = NEW.display_name,
          last_name    = NEW.last_name,
          nickname     = NEW.nickname,
          name         = NULLIF(TRIM(COALESCE(NEW.display_name,'') || ' ' || COALESCE(NEW.last_name,'')), ''),
          updated_at   = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_player_identity_from_profile ON public.profiles;
CREATE TRIGGER trg_sync_player_identity_from_profile
AFTER UPDATE OF display_name, last_name, nickname ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_player_identity_from_profile();

-- Backfill
UPDATE public.players p
  SET display_name = pr.display_name,
      last_name    = pr.last_name,
      nickname     = pr.nickname,
      name         = COALESCE(NULLIF(TRIM(COALESCE(pr.display_name,'') || ' ' || COALESCE(pr.last_name,'')), ''), p.name),
      updated_at   = now()
FROM public.profiles pr
WHERE pr.user_id = p.user_id
  AND (p.display_name IS DISTINCT FROM pr.display_name
    OR p.last_name    IS DISTINCT FROM pr.last_name
    OR p.nickname     IS DISTINCT FROM pr.nickname);
