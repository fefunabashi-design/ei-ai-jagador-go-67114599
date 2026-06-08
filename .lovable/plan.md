## Problema

Na aba **Jogadores** dentro do diálogo "Detalhes da Partida" (acessado a partir de uma partida confirmada na Agenda), a lista vem vazia ou incompleta. O objetivo é exibir **todos os jogadores ativos do time adversário** (o elenco do time), e não apenas os jogadores confirmados para aquela partida.

## Causa

Em `src/pages/Agenda.tsx` (linha ~120), o carregamento dos jogadores do adversário usa a tabela `players` diretamente:

```ts
supabase.from("players").select("*").eq("team_id", awayId)
```

Como o usuário logado normalmente **não é membro do time adversário**, a RLS da tabela `players` bloqueia esse SELECT e retorna lista vazia. Por isso a aba aparece sem jogadores.

A tela "Detalhar Adversário" (`src/pages/OpponentDetails.tsx`) já resolve isso usando a view pública `public_players`, que expõe os jogadores ativos de qualquer time sem violar RLS.

## Mudança

Em `src/pages/Agenda.tsx`, no `useEffect` que carrega `opponentPlayers` (linhas ~115‑124):

- Trocar `supabase.from("players")` por `supabase.from("public_players" as any)` para listar o elenco ativo do time adversário, mesmo quando o usuário não pertence a ele.
- Manter o resto do efeito igual (mesmo gatilho por `selectedMatch?.id` e `detailView`, mesmo estado `opponentPlayers`).

Na renderização da aba **Jogadores** (linhas ~966‑995):

- Atualizar o rótulo do contador para deixar explícito que são jogadores do elenco: `Jogadores ({opponentPlayers.length})` → `Elenco ({opponentPlayers.length})` (ou manter "Jogadores" — confirmar preferência), e o título/empty state para refletir "jogadores ativos do time".
- Continuar exibindo apelido/nome de cada jogador como já está.

## Arquivos alterados

- `src/pages/Agenda.tsx` — trocar fonte de dados para `public_players` e ajustar rótulo da aba.

Sem mudanças de backend, banco ou regras de negócio.
