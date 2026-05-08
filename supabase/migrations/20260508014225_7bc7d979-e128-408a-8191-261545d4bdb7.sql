
-- ============ PLAYERS: restrict to owner + self only ============
DROP POLICY IF EXISTS "Team owner or self can view players" ON public.players;
CREATE POLICY "Team owner or self can view players"
  ON public.players FOR SELECT TO authenticated
  USING (
    players.user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = players.team_id AND t.owner_id = auth.uid())
  );

-- Public view exposing only safe fields (no email/phone/birth_date)
CREATE OR REPLACE VIEW public.public_players
WITH (security_invoker = true) AS
SELECT id, team_id, user_id, name, last_name, display_name, nickname,
       position, jersey_number, goals, matches, rating, region, created_at
FROM public.players;
GRANT SELECT ON public.public_players TO anon, authenticated;

-- ============ TEAMS: restrict full row to owner only ============
DROP POLICY IF EXISTS "Team members can view full team" ON public.teams;
CREATE POLICY "Owner can view full team"
  ON public.teams FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

-- ============ STORAGE: fix avatar + team-logo INSERTs ============
DROP POLICY IF EXISTS "Auth users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload own avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Auth users can upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can upload team logo" ON storage.objects;
CREATE POLICY "Team owners can upload team logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'team-logos'
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE (t.id)::text = (storage.foldername(name))[1] AND t.owner_id = auth.uid()
    )
  );

-- Fix buggy DELETE/UPDATE policies that referenced t.name instead of object name
DROP POLICY IF EXISTS "Team owners can delete team logo" ON storage.objects;
CREATE POLICY "Team owners can delete team logo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'team-logos'
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE (t.id)::text = (storage.foldername(name))[1] AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team owners can update team logo" ON storage.objects;
CREATE POLICY "Team owners can update team logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'team-logos'
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE (t.id)::text = (storage.foldername(name))[1] AND t.owner_id = auth.uid()
    )
  );

-- ============ REALTIME: restrict channel subscriptions ============
-- Channel naming convention: 'team:<team_id>' for owner-only financial channels
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can read realtime messages"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    -- Match-related channels: anyone authenticated can read (chat, lineups, summons)
    realtime.topic() LIKE 'match:%'
    OR realtime.topic() LIKE 'chat:%'
    OR realtime.topic() LIKE 'lineup:%'
    OR realtime.topic() LIKE 'summon:%'
    -- Team financial channels: only team owner
    OR (realtime.topic() LIKE 'team:%' AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE (t.id)::text = split_part(realtime.topic(), ':', 2)
        AND t.owner_id = auth.uid()
    ))
    -- User-scoped private channels
    OR realtime.topic() = ('user:' || (auth.uid())::text)
  );
