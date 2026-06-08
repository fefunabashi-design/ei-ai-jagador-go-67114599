
-- 1. Remove weak duplicate INSERT policy on match_guests
DROP POLICY IF EXISTS "Authenticated can invite guests" ON public.match_guests;

-- 2. Restrict photo_posts SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view photo posts" ON public.photo_posts;
DROP POLICY IF EXISTS "Public can view photo posts" ON public.photo_posts;
DROP POLICY IF EXISTS "Photo posts are viewable by everyone" ON public.photo_posts;
CREATE POLICY "Authenticated users can view photo posts"
  ON public.photo_posts FOR SELECT TO authenticated USING (true);

-- 3. Restrict resenha_* SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view resenha posts" ON public.resenha_posts;
DROP POLICY IF EXISTS "Public can view resenha posts" ON public.resenha_posts;
DROP POLICY IF EXISTS "Resenha posts are viewable by everyone" ON public.resenha_posts;
CREATE POLICY "Authenticated can view resenha posts"
  ON public.resenha_posts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view resenha comments" ON public.resenha_comments;
DROP POLICY IF EXISTS "Public can view resenha comments" ON public.resenha_comments;
DROP POLICY IF EXISTS "Resenha comments are viewable by everyone" ON public.resenha_comments;
CREATE POLICY "Authenticated can view resenha comments"
  ON public.resenha_comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view resenha reactions" ON public.resenha_reactions;
DROP POLICY IF EXISTS "Public can view resenha reactions" ON public.resenha_reactions;
DROP POLICY IF EXISTS "Resenha reactions are viewable by everyone" ON public.resenha_reactions;
CREATE POLICY "Authenticated can view resenha reactions"
  ON public.resenha_reactions FOR SELECT TO authenticated USING (true);

-- 4. Extend match_lineups policies to include away team owners
DROP POLICY IF EXISTS "Team owners can insert lineups" ON public.match_lineups;
DROP POLICY IF EXISTS "Team owners can update lineups" ON public.match_lineups;
DROP POLICY IF EXISTS "Team owners can delete lineups" ON public.match_lineups;

CREATE POLICY "Team owners can insert lineups"
  ON public.match_lineups FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    WHERE m.id = match_lineups.match_id
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid())
  ));

CREATE POLICY "Team owners can update lineups"
  ON public.match_lineups FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    WHERE m.id = match_lineups.match_id
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid())
  ));

CREATE POLICY "Team owners can delete lineups"
  ON public.match_lineups FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    WHERE m.id = match_lineups.match_id
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid())
  ));

-- 5. Extend realtime team channel access to team members (players)
DROP POLICY IF EXISTS "Team channel access" ON realtime.messages;
CREATE POLICY "Team channel access"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    (realtime.topic() LIKE 'team:%')
    AND public.is_team_member(
      substring(realtime.topic() FROM 'team:(.*)')::uuid,
      auth.uid()
    )
  );
