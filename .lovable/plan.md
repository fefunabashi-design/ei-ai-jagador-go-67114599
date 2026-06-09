## Causa

No banco, **Kazu** e **Matoso** estão cadastrados como jogadores do SC Corinthians Paulista com o **mesmo e-mail** (`fe.funabashi@gmail.com`) e ambos sem `user_id`. O filtro atual dos Lembretes casa por e-mail como fallback, então quando o Kazu loga, os dois aparecem.

## Correção

Aplicar regra estrita de vínculo pessoal em `src/pages/Index.tsx` (effect dos Lembretes):

1. **Match primário por `user_id`**: só conta jogadores cujo `user_id` é igual ao do usuário logado.
2. **Fallback por e-mail só quando único**: se nenhum jogador casar por `user_id`, cai para o e-mail do perfil — mas **apenas se exatamente 1 jogador** entre os times do usuário tiver esse e-mail. Se houver 2 ou mais (caso atual de Kazu/Matoso), o fallback é descartado e a lista fica vazia até que o vínculo seja feito.

Com isso, Matoso desaparece dos Lembretes do Kazu.

## Como destravar o Kazu (vincular ao auth user)

Como Kazu e Matoso compartilham e-mail, o fallback não vai resolver. Para o Kazu voltar a ver as próprias inadimplências, precisamos atribuir `players.user_id` ao auth user dele. Posso fazer isso de duas formas — me diga qual prefere ao aprovar:

- **Update direto no banco**: setar `players.user_id` do registro do Kazu (id `c7b5bc6a-…`) para o `user_id` do auth user que faz login como Kazu. Preciso saber qual auth user é o "Kazu" (e-mail/uid).
- **Botão "Sou eu" no perfil do jogador**: o usuário logado clica em um jogador do time e reivindica o cadastro; o app grava `user_id`. Trabalho um pouco maior, mas resolve casos futuros sem intervenção manual.

## Arquivos afetados

- `src/pages/Index.tsx` — apenas o trecho do `useEffect` dos Lembretes (linhas ~298–308).

## Fora do escopo

- Não mexo na tela Admin → Mensalidades (continua mostrando o time inteiro para o dono).
- Não altero o cálculo de meses em atraso nem vaquinhas.
