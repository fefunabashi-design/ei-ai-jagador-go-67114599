-- Add 'past' status for matches and create cron job to auto-transition confirmed matches

-- 1. Drop the old CHECK constraint and add the new one with 'past' status
DO $$ BEGIN
  ALTER TABLE public.matches
    DROP CONSTRAINT IF EXISTS matches_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_status_check
    CHECK (status IN ('open', 'confirmed', 'past', 'completed', 'cancelled'));

-- 2. Create pg_cron job to auto-transition confirmed matches to 'past' after 24 hours
DO $$ BEGIN
  -- Unschedule if it exists (idempotent)
  SELECT cron.unschedule('confirm-to-past-matches');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'confirm-to-past-matches',
  '*/5 * * * *',  -- Every 5 minutes
  $$UPDATE public.matches SET status = 'past', updated_at = now()
    WHERE status = 'confirmed' AND match_date + interval '24 hours' < now()$$
);
