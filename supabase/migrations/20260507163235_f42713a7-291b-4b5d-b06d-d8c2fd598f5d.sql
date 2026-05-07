-- Unique constraints needed for upsert flows
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mensalidades_player_ano_mes
  ON public.mensalidades (player_id, ano, mes);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_mensalidade_config_team_ano
  ON public.mensalidade_config (team_id, ano);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_match_payments_match_player
  ON public.match_payments (match_id, player_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_match_summons_match_player
  ON public.match_summons (match_id, player_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_match_lineups_match_player
  ON public.match_lineups (match_id, player_id);

-- Ensure realtime delivers full row data
ALTER TABLE public.match_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.match_summons REPLICA IDENTITY FULL;
ALTER TABLE public.match_lineups REPLICA IDENTITY FULL;
ALTER TABLE public.match_payments REPLICA IDENTITY FULL;
ALTER TABLE public.mensalidades REPLICA IDENTITY FULL;
ALTER TABLE public.debitos REPLICA IDENTITY FULL;

-- Add tables to realtime publication (ignore if already added)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.match_chat_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.match_summons; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.match_lineups; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.match_payments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.mensalidades; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.debitos; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;