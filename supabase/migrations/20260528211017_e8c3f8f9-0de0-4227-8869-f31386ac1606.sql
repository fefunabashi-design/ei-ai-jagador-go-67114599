
-- Helper: can the current user access a given match's realtime channels?
CREATE OR REPLACE FUNCTION public.can_access_match_realtime(_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    LEFT JOIN public.teams t ON t.id = m.home_team_id
    LEFT JOIN public.players p ON p.team_id = m.home_team_id AND p.user_id = auth.uid()
    LEFT JOIN public.match_summons s ON s.match_id = m.id
      AND s.player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
    WHERE m.id = _match_id
      AND (t.owner_id = auth.uid() OR p.id IS NOT NULL OR s.id IS NOT NULL)
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_match_realtime(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_match_realtime(uuid) TO authenticated;

-- Replace the overly permissive realtime SELECT policy
DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;

CREATE POLICY "Authenticated can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Own user channel
  realtime.topic() = ('user:' || auth.uid()::text)
  -- Team channels: only the owner
  OR (
    realtime.topic() LIKE 'team:%'
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = split_part(realtime.topic(), ':', 2)
        AND t.owner_id = auth.uid()
    )
  )
  -- Match-scoped channels (match:, chat:, lineup:, summon:) — restricted to team/match members
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
