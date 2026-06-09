ALTER TABLE public.players ADD COLUMN IF NOT EXISTS cpf text;
CREATE INDEX IF NOT EXISTS idx_players_cpf ON public.players(cpf);
CREATE INDEX IF NOT EXISTS idx_players_email_lower ON public.players(lower(email));

-- Vincula o jogador "Kazu" (Fernando Funabashi) ao auth user e CPF corretos
UPDATE public.players
SET user_id = '68133df4-71ee-4e62-9aee-8b1ac4ca435c',
    cpf = '86967584120'
WHERE id = 'c7b5bc6a-7d78-48b7-b989-39f0f7e3c48c';