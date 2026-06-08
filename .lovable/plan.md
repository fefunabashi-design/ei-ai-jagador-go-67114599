## Objetivo

Hoje a `matches` é uma única linha compartilhada pelos dois times, então confirmar/reagendar já sincroniza, mas **excluir apaga para os dois** e **finalizar é único pra partida**. Precisamos diferenciar o que é compartilhado do que é por time.

## Regras finais

| Ação | Quem vê | Como implementar |
|---|---|---|
| Confirmar | Os dois | `status = 'confirmed'` (já funciona) |
| Reagendar (data/local) | Os dois | `UPDATE match_date/location` (já funciona) |
| Cancelar | Os dois (fica no histórico como "Cancelada") | Novo: `status = 'cancelled'` |
| **Excluir** | Só quem excluiu | Soft delete por time (flag) |
| **Finalizar** | Por time | Cada time grava placar e status próprios |

## Mudanças no banco (migration)

Adicionar em `public.matches`:

```sql
ALTER TABLE public.matches
  ADD COLUMN home_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN away_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN home_finalized_at timestamptz,
  ADD COLUMN away_finalized_at timestamptz,
  ADD COLUMN home_reported_home_score int,
  ADD COLUMN home_reported_away_score int,
  ADD COLUMN away_reported_home_score int,
  ADD COLUMN away_reported_away_score int;
```

- `status` vira o ciclo compartilhado: `open | confirmed | cancelled` (removemos o uso de `'completed'` como estado global — passa a ser derivado por time).
- RLS de UPDATE já cobre dono de qualquer lado; sem mudança.
- Sem `DELETE` no fluxo padrão. (Opcional, num passo futuro: cron apaga linhas com `home_hidden AND away_hidden`.)

Backfill rápido na mesma migration:
- partidas com `status='completed'` ⇒ marcar `home_finalized_at = updated_at`, `away_finalized_at = updated_at`, copiar scores para ambos os lados, e setar `status='confirmed'` (a "finalização" passa a ser por flag, não por status).

## Mudanças no código

### `src/hooks/useSupabaseData.ts`

1. **`useDeleteMatch` → `useHideMatch`** — em vez de `DELETE`, faz `UPDATE` setando `home_hidden=true` ou `away_hidden=true` conforme o time do usuário (descobre via `useMyTeam` ou recebe `mySide` como parâmetro). Toast: "Partida removida da sua agenda".
2. **Novo `useCancelMatch`** — `UPDATE matches SET status='cancelled' WHERE id=…`. Toast: "Partida cancelada".
3. **`useMatches`** — no `select`, filtrar `home_hidden=false quando sou home` / `away_hidden=false quando sou away`. Mais simples: trazer tudo e filtrar no client comparando com `myTeam.id`.

### `src/components/FinalizeMatchDialog.tsx`

- Em vez de `UPDATE matches SET home_score, away_score, status='completed'`, gravar nos campos do meu lado: `{mySide}_reported_home_score`, `{mySide}_reported_away_score`, `{mySide}_finalized_at = now()`.
- Mantém a lógica de `match_events` por `team_side` (já está por time).
- Status da partida não muda.

### Telas que mostram placar/estado

- `src/pages/Agenda.tsx`, `src/pages/Index.tsx`, qualquer card que use `match.home_score`/`away_score`/`status==='completed'`: criar helper `getMatchViewForTeam(match, myTeamId)` em `src/lib/stats.ts` (ou novo `src/lib/matchView.ts`) que devolve:
  - `isFinalizedByMe` (a partir de `{mySide}_finalized_at`)
  - `homeScore`, `awayScore` (do meu lado se eu finalizei, senão do outro lado se ele finalizou, senão `null`)
  - `displayStatus`: `cancelled` | `completed` (se algum lado finalizou) | `confirmed` | `open`
- Substituir leituras diretas pelos campos do helper.
- Filtro "Finalizado" na Agenda usa `isFinalizedByMe`.
- Cartão de partida cancelada: badge "Cancelada", sem botões de ação (só "Remover da agenda" chamando `useHideMatch`).

### Telas com botão "Cancelar"

- `src/pages/Desafios.tsx` e `src/pages/Agenda.tsx`: o atual "Cancelar" (que hoje deleta) passa a abrir um menu com duas opções:
  - **Cancelar partida** → `useCancelMatch` (avisa o adversário).
  - **Remover da minha agenda** → `useHideMatch` (só pra mim; usado também depois que a partida foi cancelada/finalizada).
- Para partidas ainda `open` enviadas por mim sem adversário, "Cancelar partida" pode continuar excluindo de verdade (sem efeito para terceiros) — manter um `useDeleteMatchOpen` interno só pra esse caso.

### `src/lib/stats.ts`

Hoje conta vitória/derrota a partir de `home_score`/`away_score`. Passar a usar o helper acima — só conta partida quando o time finalizou o lado dele. Times que ainda não finalizaram não pontuam.

## Validação

1. Time A confirma partida ⇒ Time B vê `confirmed`. ✅
2. Time A reagenda ⇒ Time B vê nova data. ✅
3. Time A cancela ⇒ Time B vê `cancelled` na agenda (histórico). ✅
4. Time A "remove da agenda" ⇒ some pra A, continua aparecendo pra B. ✅
5. Time A finaliza com placar X⇒ Time B continua vendo a partida como `confirmed`/não finalizada do lado dele, mas vê placar reportado por A; quando B finaliza, grava o placar dele. Estatísticas em `stats.ts` só usam o placar do próprio time. ✅

## Pontos abertos para você decidir

1. Se A e B reportarem placares diferentes, mostro os dois lado a lado ("A reportou 3x2 · B reportou 2x2") ou priorizo o do dono da página?
2. Quando a partida estiver `cancelled`, ainda pode ser "removida da agenda" pelos dois lados independentemente — confirma?
3. Posso seguir com a migration sem deletar o status `'completed'` antigo (mantenho como sinônimo de "ambos finalizaram") ou prefere que eu remova totalmente?
