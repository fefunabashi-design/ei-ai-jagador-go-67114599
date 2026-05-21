ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS addr_cep text,
  ADD COLUMN IF NOT EXISTS addr_rua text,
  ADD COLUMN IF NOT EXISTS addr_numero text,
  ADD COLUMN IF NOT EXISTS addr_bairro text,
  ADD COLUMN IF NOT EXISTS addr_cidade text,
  ADD COLUMN IF NOT EXISTS addr_uf text,
  ADD COLUMN IF NOT EXISTS observacoes text;