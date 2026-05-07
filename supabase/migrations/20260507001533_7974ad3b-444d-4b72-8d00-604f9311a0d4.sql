
-- ================== photo_posts ==================
CREATE TABLE IF NOT EXISTS public.photo_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('partida','vaquinha')),
  event_title TEXT NOT NULL,
  match_id UUID,
  photo_url TEXT NOT NULL,
  comment TEXT,
  author_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.photo_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Photo posts viewable by everyone" ON public.photo_posts;
CREATE POLICY "Photo posts viewable by everyone" ON public.photo_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can publish their own photo posts" ON public.photo_posts;
CREATE POLICY "Authenticated users can publish their own photo posts" ON public.photo_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Author or team owner can update photo posts" ON public.photo_posts;
CREATE POLICY "Author or team owner can update photo posts" ON public.photo_posts FOR UPDATE TO authenticated USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = photo_posts.team_id AND t.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Author or team owner can delete photo posts" ON public.photo_posts;
CREATE POLICY "Author or team owner can delete photo posts" ON public.photo_posts FOR DELETE TO authenticated USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = photo_posts.team_id AND t.owner_id = auth.uid())
);
DROP TRIGGER IF EXISTS trg_photo_posts_updated ON public.photo_posts;
CREATE TRIGGER trg_photo_posts_updated BEFORE UPDATE ON public.photo_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================== resenha_posts ==================
CREATE TABLE IF NOT EXISTS public.resenha_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID,
  author_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  match_id UUID,
  match_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.resenha_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Resenha posts viewable by everyone" ON public.resenha_posts;
CREATE POLICY "Resenha posts viewable by everyone" ON public.resenha_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can create their own resenha posts" ON public.resenha_posts;
CREATE POLICY "Authenticated users can create their own resenha posts" ON public.resenha_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Author can update their own resenha posts" ON public.resenha_posts;
CREATE POLICY "Author can update their own resenha posts" ON public.resenha_posts FOR UPDATE TO authenticated USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Author or team owner can delete resenha posts" ON public.resenha_posts;
CREATE POLICY "Author or team owner can delete resenha posts" ON public.resenha_posts FOR DELETE TO authenticated USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = resenha_posts.team_id AND t.owner_id = auth.uid())
);

-- ================== resenha_reactions ==================
CREATE TABLE IF NOT EXISTS public.resenha_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.resenha_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like','dislike')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.resenha_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reactions viewable by everyone" ON public.resenha_reactions;
CREATE POLICY "Reactions viewable by everyone" ON public.resenha_reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage their own reactions insert" ON public.resenha_reactions;
CREATE POLICY "Users manage their own reactions insert" ON public.resenha_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage their own reactions update" ON public.resenha_reactions;
CREATE POLICY "Users manage their own reactions update" ON public.resenha_reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage their own reactions delete" ON public.resenha_reactions;
CREATE POLICY "Users manage their own reactions delete" ON public.resenha_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ================== resenha_comments ==================
CREATE TABLE IF NOT EXISTS public.resenha_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.resenha_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.resenha_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Resenha comments viewable by everyone" ON public.resenha_comments;
CREATE POLICY "Resenha comments viewable by everyone" ON public.resenha_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can comment" ON public.resenha_comments;
CREATE POLICY "Authenticated users can comment" ON public.resenha_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Author can delete their own comments" ON public.resenha_comments;
CREATE POLICY "Author can delete their own comments" ON public.resenha_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- ================== debitos ==================
CREATE TABLE IF NOT EXISTS public.debitos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  descricao TEXT NOT NULL,
  data DATE NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'debito',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.debitos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Debitos viewable by everyone" ON public.debitos;
CREATE POLICY "Debitos viewable by everyone" ON public.debitos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Team owners can insert debitos" ON public.debitos;
CREATE POLICY "Team owners can insert debitos" ON public.debitos FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = debitos.team_id AND t.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Team owners can update debitos" ON public.debitos;
CREATE POLICY "Team owners can update debitos" ON public.debitos FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = debitos.team_id AND t.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Team owners can delete debitos" ON public.debitos;
CREATE POLICY "Team owners can delete debitos" ON public.debitos FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = debitos.team_id AND t.owner_id = auth.uid())
);

-- ================== match_events ==================
CREATE TABLE IF NOT EXISTS public.match_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('goal','yellow_card','red_card')),
  team_side TEXT CHECK (team_side IN ('home','away')),
  player_id UUID,
  player_name TEXT,
  minute INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Match events viewable by everyone" ON public.match_events;
CREATE POLICY "Match events viewable by everyone" ON public.match_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Team owners can insert match events" ON public.match_events;
CREATE POLICY "Team owners can insert match events" ON public.match_events FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.matches m JOIN public.teams t ON (t.id = m.home_team_id OR t.id = m.away_team_id)
          WHERE m.id = match_events.match_id AND t.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Team owners can update match events" ON public.match_events;
CREATE POLICY "Team owners can update match events" ON public.match_events FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.matches m JOIN public.teams t ON (t.id = m.home_team_id OR t.id = m.away_team_id)
          WHERE m.id = match_events.match_id AND t.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Team owners can delete match events" ON public.match_events;
CREATE POLICY "Team owners can delete match events" ON public.match_events FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.matches m JOIN public.teams t ON (t.id = m.home_team_id OR t.id = m.away_team_id)
          WHERE m.id = match_events.match_id AND t.owner_id = auth.uid())
);

-- ================== Auto-summons trigger ==================
CREATE OR REPLACE FUNCTION public.auto_summon_team_players()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.match_summons (match_id, player_id, position, status)
  SELECT NEW.id, p.id, p.position, 'pending'
  FROM public.players p
  WHERE p.team_id = NEW.home_team_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_auto_summon_on_match_create ON public.matches;
CREATE TRIGGER trg_auto_summon_on_match_create
AFTER INSERT ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.auto_summon_team_players();

CREATE OR REPLACE FUNCTION public.auto_lineup_on_confirm()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    INSERT INTO public.match_lineups (match_id, player_id, position)
    VALUES (NEW.match_id, NEW.player_id, NEW.position)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_auto_lineup_on_confirm ON public.match_summons;
CREATE TRIGGER trg_auto_lineup_on_confirm
AFTER UPDATE ON public.match_summons
FOR EACH ROW EXECUTE FUNCTION public.auto_lineup_on_confirm();

CREATE UNIQUE INDEX IF NOT EXISTS uq_match_lineups_match_player ON public.match_lineups(match_id, player_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_match_summons_match_player ON public.match_summons(match_id, player_id);

-- ================== Storage bucket: photos ==================
INSERT INTO storage.buckets (id, name, public) VALUES ('photos','photos', true) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Photos public read') THEN
    CREATE POLICY "Photos public read" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Authenticated can upload photos') THEN
    CREATE POLICY "Authenticated can upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Owners can update photos') THEN
    CREATE POLICY "Owners can update photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Owners can delete photos') THEN
    CREATE POLICY "Owners can delete photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- ================== Realtime (idempotent) ==================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='match_summons') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.match_summons';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='match_lineups') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.match_lineups';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='match_events') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.match_events';
  END IF;
END $$;
ALTER TABLE public.match_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.match_summons REPLICA IDENTITY FULL;
ALTER TABLE public.match_lineups REPLICA IDENTITY FULL;
ALTER TABLE public.match_events REPLICA IDENTITY FULL;

-- ================== handle_new_user trigger ==================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
