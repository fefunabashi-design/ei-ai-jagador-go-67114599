
CREATE TABLE public.mensalidades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  pago boolean NOT NULL DEFAULT false,
  data_pagamento timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (player_id, ano, mes)
);

ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;

-- Everyone can view mensalidades
CREATE POLICY "Mensalidades viewable by everyone"
  ON public.mensalidades FOR SELECT
  TO public
  USING (true);

-- Team owners can insert mensalidades
CREATE POLICY "Team owners can insert mensalidades"
  ON public.mensalidades FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      JOIN teams t ON t.id = p.team_id
      WHERE p.id = mensalidades.player_id AND t.owner_id = auth.uid()
    )
  );

-- Team owners can update mensalidades
CREATE POLICY "Team owners can update mensalidades"
  ON public.mensalidades FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN teams t ON t.id = p.team_id
      WHERE p.id = mensalidades.player_id AND t.owner_id = auth.uid()
    )
  );

-- Team owners can delete mensalidades
CREATE POLICY "Team owners can delete mensalidades"
  ON public.mensalidades FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN teams t ON t.id = p.team_id
      WHERE p.id = mensalidades.player_id AND t.owner_id = auth.uid()
    )
  );
