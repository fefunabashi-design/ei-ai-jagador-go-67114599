
-- Posts table
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('imagem','video')),
  url text NOT NULL,
  legenda text,
  data timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts viewable by everyone"
ON public.posts FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create their own posts"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own posts"
ON public.posts FOR UPDATE TO authenticated
USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own posts"
ON public.posts FOR DELETE TO authenticated
USING (auth.uid() = author_id);

CREATE INDEX idx_posts_data ON public.posts (data DESC);

-- Realtime
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media','post-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Post media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

CREATE POLICY "Authenticated users can upload post media to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own post media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own post media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);
