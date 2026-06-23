## Objetivo
Na tela "Detalhar Adversário" (acessada pelo botão "Detalhar adversário" dentro de uma partida), na aba **Jogadores**, exibir as fotos dos jogadores adversários de forma mais visível.

## Situação atual
O arquivo `src/pages/OpponentDetails.tsx` já busca os avatares (`avatar_url`) de `public_profiles` via `user_id` de cada `public_players`, e os exibe num `Avatar` pequeno (40x40px) ao lado do nome. Porém:

1. Strings vazias (`avatar_url = ""`) caem no `AvatarImage` e quebram a renderização, mostrando só o fallback com a inicial.
2. O tamanho está pequeno (10×10 em Tailwind = 40px), pouco destacado para uma aba dedicada a "Jogadores".
3. Jogadores convidados/sem `user_id` não têm forma de exibir foto (continuam só com inicial — comportamento esperado).

## Mudanças (apenas `src/pages/OpponentDetails.tsx`)

1. **Filtrar `avatar_url` vazio** ao montar o `avatarMap`: só incluir quando `avatar_url` tiver conteúdo não-vazio (`p.avatar_url && p.avatar_url.trim()`).
2. **Aumentar o avatar** na lista de jogadores de `w-10 h-10` para `w-14 h-14`, com `rounded-xl` (mais destaque, mantendo padrão do app).
3. **Ajustar o item da lista** para acomodar o avatar maior:
   - Padding `py-2.5`
   - Manter nome + idade à direita, `NotaBadge` no canto.
4. **Fallback visual**: quando não houver foto, manter a inicial em `AvatarFallback` com `bg-primary/15 text-primary` para ficar consistente com o resto do app (em vez de `bg-muted` cinza).

## Fora do escopo
- Não alterar a aba "Dados do Time".
- Não mexer em `MatchDetails.tsx`, `Agenda.tsx` ou no card de partidas.
- Não criar upload de foto para jogadores convidados (sem `user_id`).
