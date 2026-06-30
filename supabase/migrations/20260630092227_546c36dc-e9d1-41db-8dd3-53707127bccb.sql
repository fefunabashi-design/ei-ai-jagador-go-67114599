
-- 1. Per-user last-read timestamp per match chat
CREATE TABLE public.match_chat_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_chat_reads TO authenticated;
GRANT ALL ON public.match_chat_reads TO service_role;

ALTER TABLE public.match_chat_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own chat reads"
  ON public.match_chat_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert their own chat reads"
  ON public.match_chat_reads FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_access_match_realtime(match_id)
  );

CREATE POLICY "Users update their own chat reads"
  ON public.match_chat_reads FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_access_match_realtime(match_id)
  );

CREATE TRIGGER update_match_chat_reads_updated_at
  BEFORE UPDATE ON public.match_chat_reads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_match_chat_reads_user ON public.match_chat_reads(user_id);
CREATE INDEX idx_match_chat_reads_match ON public.match_chat_reads(match_id);

-- 2. mark_chat_as_read RPC
CREATE OR REPLACE FUNCTION public.mark_chat_as_read(_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.can_access_match_realtime(_match_id) THEN
    RAISE EXCEPTION 'Access denied for match %', _match_id;
  END IF;

  INSERT INTO public.match_chat_reads (match_id, user_id, last_read_at)
  VALUES (_match_id, auth.uid(), now())
  ON CONFLICT (match_id, user_id)
  DO UPDATE SET last_read_at = EXCLUDED.last_read_at, updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_chat_as_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_chat_as_read(uuid) TO authenticated;

-- 3. get_unread_chat_counts RPC
CREATE OR REPLACE FUNCTION public.get_unread_chat_counts()
RETURNS TABLE(match_id uuid, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.match_id, COUNT(*)::bigint AS unread_count
  FROM public.match_chat_messages m
  LEFT JOIN public.match_chat_reads r
    ON r.match_id = m.match_id AND r.user_id = auth.uid()
  WHERE auth.uid() IS NOT NULL
    AND m.user_id IS DISTINCT FROM auth.uid()
    AND m.created_at > COALESCE(r.last_read_at, 'epoch'::timestamptz)
    AND public.can_access_match_realtime(m.match_id)
  GROUP BY m.match_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_unread_chat_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unread_chat_counts() TO authenticated;
