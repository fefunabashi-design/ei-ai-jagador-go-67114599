## Auditoria — Telas de estatísticas vs `match_events`

Já existe uma única fonte de verdade para nota/jogo finalizado (`src/lib/stats.ts`) e a maior parte do app a usa corretamente. A auditoria encontrou **4 inconsistências**, das quais 2 afetam o que o usuário vê hoje.

### Resumo do estado atual

| Tela / Componente | Fonte de dados | Status |
|---|---|---|
| Artilharia (Admin) | `match_events` (type=goal) agregados in-memory | OK |
| Lista de gols no card de partida (Index) | `match_events` | OK |
| Detalhes da partida (Agenda) | `match_events` | OK |
| Nota do time/jogador em todos os lugares (`NotaBadge`) | `stats.ts` → `matches` + `match_lineups` | OK |
| Perfil do jogador (Profile) | não exibe estatísticas | N/A |
| **Ranking** | **dados mockados, hardcoded** | quebrado |
| `playerStats` no Index | colunas obsoletas `players.goals/matches/rating` | dead code, confunde |
| "Gols por time" no breakdown do Index | hardcoded `0` por time | bug visível |
| Colunas `players.goals / matches / rating / yellow_cards / red_cards` | nunca atualizadas por trigger | obsoletas no schema |

### Correções propostas

**1. Ranking (`src/pages/Ranking.tsx`)** — crítico
Substituir o array mockado por uma query real:
- Artilheiros: `match_events` (type=goal) agrupados por `player_id`, juntando nome/apelido de `players` / `public_players`.
- Jogos: contar via `match_lineups` por jogador (ou via `match_summons` confirmados, conforme padrão usado em `getPlayerStats`).
- Nota: usar `getPlayerStats(playerId, teamId)` de `stats.ts`.
- Escopo do ranking: jogadores do meu time ativo (mesmo critério da Artilharia do Admin) — confirmar com o usuário se também quer um modo "geral" (entre todos os times).

**2. `playerStats` morto no Index (`src/pages/Index.tsx:123–127`)**
Remover o objeto `playerStats` que lê `myPlayer.goals/matches/rating` (colunas paradas). Não é renderizado, mas dá impressão de fonte alternativa.

**3. "Gols por time" no breakdown do Index (`src/pages/Index.tsx:197`)**
Hoje `gols: 0` é fixo em cada item do breakdown. Calcular a partir do mesmo lote de `match_events` já carregado em `matchExtras`/`Index.tsx:99`, agrupando por `team_side` × `home/away_team_id` do match.

**4. Colunas obsoletas em `players`** — limpeza opcional
Como nenhum trigger/edge function popula `goals`, `matches`, `rating`, `yellow_cards`, `red_cards`, recomendar uma migração que as remova (ou deixar registrado em memória do projeto que não devem ser usadas). Sugiro **só remover após o item 1 estar implementado** para evitar quebrar tipos gerados. Pedir confirmação antes de dropar.

### Detalhes técnicos

- A fonte canônica para "partida conta?" é `getTeamSideFinalized` em `src/lib/stats.ts` (já considera o lado finalizado e faz fallback para o adversário).
- Para artilharia consistente entre Admin e Ranking, extrair um helper `getTopScorers(matchIds)` em `src/lib/stats.ts` que faz a query em `match_events` e devolve `Map<player_id, goals>`. Admin e Ranking passam a usá-lo.
- Para "gols por time" no breakdown do Index, reaproveitar `matchExtras` (já carregado) — não precisa de nova query.

### Perguntas antes de implementar

1. O **Ranking** deve listar jogadores **apenas do meu time ativo** (igual à Artilharia do Admin) ou **todos os jogadores cadastrados** no app?
2. Posso **dropar** as colunas obsoletas `goals/matches/rating/yellow_cards/red_cards` da tabela `players` na mesma rodada, ou prefere deixar para depois?