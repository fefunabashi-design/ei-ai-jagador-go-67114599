
-- PLAYERS: restringir leitura a usuários autenticados
DROP POLICY IF EXISTS "Players are viewable by everyone" ON public.players;
CREATE POLICY "Authenticated users can view players"
  ON public.players FOR SELECT
  TO authenticated
  USING (true);

-- PROFILES: restringir leitura a usuários autenticados
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- TEAMS: restringir leitura a usuários autenticados
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
CREATE POLICY "Authenticated users can view teams"
  ON public.teams FOR SELECT
  TO authenticated
  USING (true);

-- MATCH_PAYMENTS: somente dono do time ou jogador envolvido
DROP POLICY IF EXISTS "Payments viewable by everyone" ON public.match_payments;
CREATE POLICY "Team owner or player can view payments"
  ON public.match_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.teams t ON t.id = m.home_team_id
      WHERE m.id = match_payments.match_id AND t.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = match_payments.player_id AND p.user_id = auth.uid()
    )
  );

-- MENSALIDADES: somente dono do time ou jogador
DROP POLICY IF EXISTS "Mensalidades viewable by everyone" ON public.mensalidades;
CREATE POLICY "Team owner or player can view mensalidades"
  ON public.mensalidades FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      JOIN public.teams t ON t.id = p.team_id
      WHERE p.id = mensalidades.player_id AND t.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = mensalidades.player_id AND p.user_id = auth.uid()
    )
  );

-- DEBITOS: somente dono do time
DROP POLICY IF EXISTS "Debitos viewable by everyone" ON public.debitos;
CREATE POLICY "Team owner can view debitos"
  ON public.debitos FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = debitos.team_id AND t.owner_id = auth.uid())
  );

-- STORAGE team-logos: validar dono do time pelo prefixo do path "{team_id}/..."
DROP POLICY IF EXISTS "Team owners can upload team logo" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can update team logo" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can delete team logo" ON storage.objects;

CREATE POLICY "Team owners can upload team logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'team-logos'
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can update team logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'team-logos'
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can delete team logo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'team-logos'
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND t.owner_id = auth.uid()
    )
  );
