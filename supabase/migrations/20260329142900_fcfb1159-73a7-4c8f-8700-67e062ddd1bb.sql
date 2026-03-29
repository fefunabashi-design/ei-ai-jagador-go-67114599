
-- Teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  abbreviation TEXT,
  format TEXT DEFAULT '8x8',
  region TEXT,
  rating NUMERIC(3,1) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Owners can insert their own team" ON public.teams FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their own team" ON public.teams FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their own team" ON public.teams FOR DELETE USING (auth.uid() = owner_id);

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  position TEXT,
  jersey_number INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  matches INTEGER DEFAULT 0,
  rating NUMERIC(3,1) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players are viewable by everyone" ON public.players FOR SELECT USING (true);
CREATE POLICY "Team owners can insert players" ON public.players FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid()));
CREATE POLICY "Team owners can update players" ON public.players FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid()));
CREATE POLICY "Team owners can delete players" ON public.players FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid()));

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Matches/Challenges table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  home_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  away_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  location TEXT NOT NULL,
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  format TEXT NOT NULL DEFAULT '8x8',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'confirmed', 'completed', 'cancelled')),
  compatibility INTEGER,
  home_score INTEGER,
  away_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches are viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Team owners can create matches" ON public.matches FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.teams WHERE id = home_team_id AND owner_id = auth.uid()));
CREATE POLICY "Team owners can update their matches" ON public.matches FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.teams WHERE id = home_team_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teams WHERE id = away_team_id AND owner_id = auth.uid()));
CREATE POLICY "Team owners can delete their matches" ON public.matches FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.teams WHERE id = home_team_id AND owner_id = auth.uid()));

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
