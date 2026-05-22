CREATE TABLE IF NOT EXISTS public.team_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id)
);

ALTER TABLE public.team_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own team favorites"
ON public.team_favorites
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can add own team favorites"
ON public.team_favorites
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own team favorites"
ON public.team_favorites
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS team_favorites_user_id_idx ON public.team_favorites (user_id);
CREATE INDEX IF NOT EXISTS team_favorites_team_id_idx ON public.team_favorites (team_id);