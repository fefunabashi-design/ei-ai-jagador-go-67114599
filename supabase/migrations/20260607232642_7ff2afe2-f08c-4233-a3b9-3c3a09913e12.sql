
-- 1) match_guests INSERT: ensure inserter has access to the match
DROP POLICY IF EXISTS "Users can insert guests" ON public.match_guests;
DROP POLICY IF EXISTS "Authenticated can add guests" ON public.match_guests;
DROP POLICY IF EXISTS "match_guests_insert" ON public.match_guests;

CREATE POLICY "Match participants can add guests"
ON public.match_guests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = invited_by
  AND public.can_access_match_realtime(match_id)
);

-- 2) resenha_reactions SELECT: restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.resenha_reactions;
DROP POLICY IF EXISTS "Public can view reactions" ON public.resenha_reactions;
DROP POLICY IF EXISTS "resenha_reactions_select" ON public.resenha_reactions;
DROP POLICY IF EXISTS "Reactions are viewable by everyone" ON public.resenha_reactions;

CREATE POLICY "Authenticated users can view reactions"
ON public.resenha_reactions
FOR SELECT
TO authenticated
USING (true);
