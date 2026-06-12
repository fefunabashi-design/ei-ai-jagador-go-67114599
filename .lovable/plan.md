# Botão Chat nos Desafios + Nome/Time correto no Chat

A entrega anterior ficou só em planejamento — nada foi escrito em código. Esta passagem implementa de fato as duas correções.

## 1. `src/pages/Desafios.tsx` — botão "Chat" nos cards

Em cada card de **Recebidos** (linha ~154) e **Enviados** (linha ~231), adicionar um botão "Chat" com o mesmo estilo do botão "Detalhes do time" (`variant="outline"`, `basis-full h-8 text-[11px] px-2`), navegando para `/chat/{m.id}`. Ficará logo abaixo do botão "Detalhes do time" — um por linha, ambos ocupando largura total.

```tsx
<Button
  size="sm"
  variant="outline"
  className="basis-full h-8 text-[11px] px-2"
  onClick={() => navigate(`/chat/${m.id}`)}
>
  Chat
</Button>
```

## 2. `src/pages/Chat.tsx` — nome e time do outro usuário

Hoje o card do outro usuário mostra "Usuário" / sem time, porque:

- `senderProfile` cai no fallback `"Usuário"` quando `public_profiles` não tem linha.
- `userTeamMap` só é populado com `owner_id` do mandante/visitante e com `public_players` filtrados por `team_id IN (home, away)` — então quem não é dono e não está cadastrado nesses dois times fica sem time.

Correções:

a) **Nome** — usar a mesma lógica do usuário logado: `senderProfile?.nickname || senderProfile?.display_name || "Usuário"`.

b) **Time** — adicionar busca complementar para remetentes que não estão no `userTeamMap`:
   - Coletar `user_id` distintos das mensagens que ainda não têm time mapeado.
   - Buscar em `public_players` (`select user_id, team_id` `in user_id`) e em `teams` (`select id, name, owner_id` `in owner_id`).
   - Para cada usuário, preferir o time que coincide com `homeTeam.id` ou `awayTeam.id`; caso não bata, usar o primeiro time encontrado.
   - Aplicar `getShortTeamName(name)` antes de salvar no `userTeamMap`.

Esse map estendido é calculado num `useEffect` que dispara quando `messages`, `homeTeam?.id` ou `awayTeam?.id` mudam, e guarda o resultado num `useState<Record<string,string>>` para re-render.

## Fora de escopo

- Estilo do chat, hooks (`useChatMessages`), RLS, tabela `match_chat_messages`.
- Rotas e demais botões dos cards de desafio.
