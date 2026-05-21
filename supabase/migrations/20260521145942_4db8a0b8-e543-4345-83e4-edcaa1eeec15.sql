ALTER TABLE public.teams 
  ADD COLUMN IF NOT EXISTS admin_cpf text,
  ADD COLUMN IF NOT EXISTS sub1_name text,
  ADD COLUMN IF NOT EXISTS sub1_phone text,
  ADD COLUMN IF NOT EXISTS sub1_email text,
  ADD COLUMN IF NOT EXISTS sub1_cpf text;