
ALTER TABLE public.resenha_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid NULL REFERENCES public.resenha_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_resenha_comments_parent ON public.resenha_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_resenha_comments_post ON public.resenha_comments(post_id);

CREATE TABLE IF NOT EXISTS public.resenha_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.resenha_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('like','dislike')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

ALTER TABLE public.resenha_comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comment reactions viewable by everyone"
  ON public.resenha_comment_reactions FOR SELECT USING (true);

CREATE POLICY "Users insert their own comment reactions"
  ON public.resenha_comment_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own comment reactions"
  ON public.resenha_comment_reactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own comment reactions"
  ON public.resenha_comment_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
