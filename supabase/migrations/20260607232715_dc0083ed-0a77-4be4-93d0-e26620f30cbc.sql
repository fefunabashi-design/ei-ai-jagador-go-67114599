
DROP POLICY IF EXISTS "Anyone can view comments" ON public.resenha_comments;
DROP POLICY IF EXISTS "Public can view comments" ON public.resenha_comments;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.resenha_comments;
DROP POLICY IF EXISTS "resenha_comments_select" ON public.resenha_comments;

CREATE POLICY "Authenticated users can view comments"
ON public.resenha_comments
FOR SELECT
TO authenticated
USING (true);
