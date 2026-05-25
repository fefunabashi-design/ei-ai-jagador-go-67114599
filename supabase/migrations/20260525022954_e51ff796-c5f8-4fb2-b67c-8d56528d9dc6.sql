CREATE TABLE public.match_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  name text NOT NULL,
  invited_by uuid NOT NULL,
  inviter_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.match_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests viewable by everyone"
ON public.match_guests FOR SELECT
USING (true);

CREATE POLICY "Authenticated can invite guests"
ON public.match_guests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Inviter or team owner can delete guests"
ON public.match_guests FOR DELETE
TO authenticated
USING (
  auth.uid() = invited_by
  OR EXISTS (
    SELECT 1 FROM public.matches m
    JOIN public.teams t ON t.id = m.home_team_id
    WHERE m.id = match_guests.match_id AND t.owner_id = auth.uid()
  )
);

CREATE INDEX idx_match_guests_match ON public.match_guests(match_id);