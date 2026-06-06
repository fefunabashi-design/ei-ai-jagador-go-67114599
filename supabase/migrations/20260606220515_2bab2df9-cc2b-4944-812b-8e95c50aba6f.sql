DROP POLICY IF EXISTS "Comment reactions viewable by everyone" ON public.resenha_comment_reactions;
CREATE POLICY "Authenticated can view comment reactions"
ON public.resenha_comment_reactions
FOR SELECT
TO authenticated
USING (true);
REVOKE SELECT ON public.resenha_comment_reactions FROM anon;