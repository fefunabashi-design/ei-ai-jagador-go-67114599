
CREATE TABLE IF NOT EXISTS public.mensalidade_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano integer NOT NULL UNIQUE,
  valor_mensal numeric NOT NULL DEFAULT 0,
  team_id uuid NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mensalidade_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Config viewable by everyone" ON public.mensalidade_config
  FOR SELECT TO public USING (true);

CREATE POLICY "Team owners can insert config" ON public.mensalidade_config
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM teams t WHERE t.id = mensalidade_config.team_id AND t.owner_id = auth.uid()
  ));

CREATE POLICY "Team owners can update config" ON public.mensalidade_config
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM teams t WHERE t.id = mensalidade_config.team_id AND t.owner_id = auth.uid()
  ));
