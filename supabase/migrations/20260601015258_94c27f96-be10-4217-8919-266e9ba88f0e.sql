
-- 1) Restrict match_chat_messages SELECT to match participants
DROP POLICY IF EXISTS "Chat messages viewable by everyone" ON public.match_chat_messages;

CREATE POLICY "Match participants can view chat messages"
ON public.match_chat_messages
FOR SELECT
TO authenticated
USING (public.can_access_match_realtime(match_id));

-- 2) Restrict match_lineups SELECT to match participants
DROP POLICY IF EXISTS "Lineups viewable by everyone" ON public.match_lineups;

CREATE POLICY "Match participants can view lineups"
ON public.match_lineups
FOR SELECT
TO authenticated
USING (public.can_access_match_realtime(match_id));

-- 3) Drop any overly permissive realtime.messages policies (USING true)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
  LOOP
    -- Drop known permissive policies; the restrictive one below will replace them
    IF pol.policyname IN (
      'Allow all',
      'Allow listen for authenticated',
      'authenticated can read messages',
      'Authenticated can read realtime messages'
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', pol.policyname);
    END IF;
  END LOOP;
END $$;

-- Re-create the topic-scoped policy (idempotent)
DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('user:' || auth.uid()::text)
  OR (
    realtime.topic() LIKE 'team:%'
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = split_part(realtime.topic(), ':', 2)
        AND t.owner_id = auth.uid()
    )
  )
  OR (
    (realtime.topic() LIKE 'match:%'
     OR realtime.topic() LIKE 'chat:%'
     OR realtime.topic() LIKE 'lineup:%'
     OR realtime.topic() LIKE 'summon:%')
    AND public.can_access_match_realtime(
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
);
