
-- 1) Fix anon-executable SECURITY DEFINER email queue helpers + set search_path
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- 2) Tighten realtime.messages SELECT policy to require participation on match/chat/lineup/summon topics
DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;

CREATE POLICY "Authenticated can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'team:%' THEN
      public.is_team_member(
        (NULLIF(split_part(realtime.topic(), ':', 2), ''))::uuid,
        auth.uid()
      )
    WHEN realtime.topic() LIKE 'match:%'
      OR realtime.topic() LIKE 'chat:%'
      OR realtime.topic() LIKE 'lineup:%'
      OR realtime.topic() LIKE 'summon:%' THEN
      public.can_access_match_realtime(
        (NULLIF(split_part(realtime.topic(), ':', 2), ''))::uuid
      )
    ELSE false
  END
);
