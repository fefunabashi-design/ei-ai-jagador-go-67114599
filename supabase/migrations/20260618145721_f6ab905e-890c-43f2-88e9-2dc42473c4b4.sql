-- Align realtime SELECT policy for team:% topics with INSERT policy (use is_team_member)
DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can read realtime messages"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    realtime.topic() LIKE 'match:%'
    OR realtime.topic() LIKE 'chat:%'
    OR realtime.topic() LIKE 'lineup:%'
    OR realtime.topic() LIKE 'summon:%'
    OR (
      realtime.topic() LIKE 'team:%'
      AND public.is_team_member(
        substring(realtime.topic() FROM 'team:(.*)')::uuid,
        auth.uid()
      )
    )
    OR realtime.topic() = ('user:' || (auth.uid())::text)
  );

-- Remove the now-redundant duplicate team channel policy
DROP POLICY IF EXISTS "Team channel access" ON realtime.messages;