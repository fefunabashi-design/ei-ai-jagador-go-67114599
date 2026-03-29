
-- Tabela de escalação (lineup)
CREATE TABLE public.match_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  position text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, player_id)
);

ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lineups viewable by everyone" ON public.match_lineups FOR SELECT TO public USING (true);

CREATE POLICY "Team owners can insert lineups" ON public.match_lineups FOR INSERT TO public
WITH CHECK (EXISTS (
  SELECT 1 FROM public.matches m JOIN public.teams t ON t.id = m.home_team_id
  WHERE m.id = match_lineups.match_id AND t.owner_id = auth.uid()
));

CREATE POLICY "Team owners can update lineups" ON public.match_lineups FOR UPDATE TO public
USING (EXISTS (
  SELECT 1 FROM public.matches m JOIN public.teams t ON t.id = m.home_team_id
  WHERE m.id = match_lineups.match_id AND t.owner_id = auth.uid()
));

CREATE POLICY "Team owners can delete lineups" ON public.match_lineups FOR DELETE TO public
USING (EXISTS (
  SELECT 1 FROM public.matches m JOIN public.teams t ON t.id = m.home_team_id
  WHERE m.id = match_lineups.match_id AND t.owner_id = auth.uid()
));

-- Tabela de convocação (summons)
CREATE TABLE public.match_summons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  position text,
  status text NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, player_id)
);

ALTER TABLE public.match_summons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Summons viewable by everyone" ON public.match_summons FOR SELECT TO public USING (true);

CREATE POLICY "Team owners can insert summons" ON public.match_summons FOR INSERT TO public
WITH CHECK (EXISTS (
  SELECT 1 FROM public.matches m JOIN public.teams t ON t.id = m.home_team_id
  WHERE m.id = match_summons.match_id AND t.owner_id = auth.uid()
));

CREATE POLICY "Team owners can update summons" ON public.match_summons FOR UPDATE TO public
USING (EXISTS (
  SELECT 1 FROM public.matches m JOIN public.teams t ON t.id = m.home_team_id
  WHERE m.id = match_summons.match_id AND t.owner_id = auth.uid()
));

CREATE POLICY "Players can update their own summons" ON public.match_summons FOR UPDATE TO public
USING (EXISTS (
  SELECT 1 FROM public.players p WHERE p.id = match_summons.player_id AND p.user_id = auth.uid()
));

CREATE POLICY "Team owners can delete summons" ON public.match_summons FOR DELETE TO public
USING (EXISTS (
  SELECT 1 FROM public.matches m JOIN public.teams t ON t.id = m.home_team_id
  WHERE m.id = match_summons.match_id AND t.owner_id = auth.uid()
));
