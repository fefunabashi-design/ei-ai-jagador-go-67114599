
-- Add presence confirmation fields to match_lineups
ALTER TABLE public.match_lineups
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS absence_reason text;

-- Ensure unique row per (match, player) so we can upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_lineups_match_player_unique'
  ) THEN
    ALTER TABLE public.match_lineups
      ADD CONSTRAINT match_lineups_match_player_unique UNIQUE (match_id, player_id);
  END IF;
END $$;

-- Validation trigger: status & absence_reason values + reason only when absent
CREATE OR REPLACE FUNCTION public.validate_match_lineup_presence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('confirmed','absent') THEN
    RAISE EXCEPTION 'status inválido: %', NEW.status;
  END IF;
  IF NEW.absence_reason IS NOT NULL
     AND NEW.absence_reason NOT IN ('machucado','viagem','trabalho') THEN
    RAISE EXCEPTION 'absence_reason inválido: %', NEW.absence_reason;
  END IF;
  IF NEW.status = 'confirmed' THEN
    NEW.absence_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_match_lineup_presence ON public.match_lineups;
CREATE TRIGGER trg_validate_match_lineup_presence
  BEFORE INSERT OR UPDATE ON public.match_lineups
  FOR EACH ROW EXECUTE FUNCTION public.validate_match_lineup_presence();

-- Allow players to update/delete their own lineup row
DROP POLICY IF EXISTS "Players can update their own lineup" ON public.match_lineups;
CREATE POLICY "Players can update their own lineup"
  ON public.match_lineups FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = match_lineups.player_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = match_lineups.player_id AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Players can delete their own lineup" ON public.match_lineups;
CREATE POLICY "Players can delete their own lineup"
  ON public.match_lineups FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = match_lineups.player_id AND p.user_id = auth.uid()
  ));

-- Enable realtime
ALTER TABLE public.match_lineups REPLICA IDENTITY FULL;
ALTER TABLE public.match_guests REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_lineups;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_guests;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
