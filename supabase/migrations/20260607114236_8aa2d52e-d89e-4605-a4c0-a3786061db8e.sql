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
      SELECT 1
      FROM public.teams t
      WHERE t.id::text = split_part(realtime.topic(), ':', 2)
        AND t.owner_id = auth.uid()
    )
  )
  OR (
    realtime.topic() LIKE 'chat:%'
    AND public.can_access_match_realtime(
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
  OR (
    (realtime.topic() LIKE 'match:%'
     OR realtime.topic() LIKE 'lineup:%'
     OR realtime.topic() LIKE 'summon:%')
    AND public.can_access_match_realtime(
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
);