DROP POLICY IF EXISTS "Posts viewable by everyone" ON public.posts;
CREATE POLICY "Authenticated users can view posts" ON public.posts FOR SELECT TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime DROP TABLE public.posts;