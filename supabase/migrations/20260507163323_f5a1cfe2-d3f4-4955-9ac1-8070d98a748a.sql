-- Foreign keys (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE public.matches
    ADD CONSTRAINT matches_home_team_fk FOREIGN KEY (home_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.matches
    ADD CONSTRAINT matches_away_team_fk FOREIGN KEY (away_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.players
    ADD CONSTRAINT players_team_fk FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.match_summons
    ADD CONSTRAINT summons_match_fk FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE,
    ADD CONSTRAINT summons_player_fk FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.match_lineups
    ADD CONSTRAINT lineups_match_fk FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE,
    ADD CONSTRAINT lineups_player_fk FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.match_payments
    ADD CONSTRAINT payments_match_fk FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE,
    ADD CONSTRAINT payments_player_fk FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.mensalidades
    ADD CONSTRAINT mensalidades_player_fk FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.mensalidade_config
    ADD CONSTRAINT mensalidade_config_team_fk FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.match_chat_messages
    ADD CONSTRAINT chat_match_fk FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.match_events
    ADD CONSTRAINT events_match_fk FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.debitos
    ADD CONSTRAINT debitos_team_fk FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.photo_posts
    ADD CONSTRAINT photo_posts_team_fk FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.resenha_posts
    ADD CONSTRAINT resenha_posts_team_fk FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL,
    ADD CONSTRAINT resenha_posts_match_fk FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.resenha_comments
    ADD CONSTRAINT resenha_comments_post_fk FOREIGN KEY (post_id) REFERENCES public.resenha_posts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.resenha_reactions
    ADD CONSTRAINT resenha_reactions_post_fk FOREIGN KEY (post_id) REFERENCES public.resenha_posts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_resenha_reactions_post_user
  ON public.resenha_reactions (post_id, user_id);