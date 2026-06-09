## Objetivo

Apagar totalmente a funcionalidade de **Convocações de jogadores** (tabela `match_summons` e tudo que depende dela). Sem deixar resquícios no banco, em automações, hooks ou telas.

## Escopo do que existe hoje

**Banco de dados**
- Tabela `public.match_summons` (+ índice único, replica identity, publicação realtime).
- Coluna `absence_reason` na mesma tabela.
- Trigger `trg_auto_summon_team_players` em `matches` → função `auto_summon_team_players()` (cria summons "pending" ao criar partida).
- Trigger `trg_auto_lineup_on_confirm` em `match_summons` → função `auto_lineup_on_confirm()` (insere em `match_lineups` quando vira "confirmed").
- Função `can_access_match_realtime(_match_id)` faz `JOIN` em `match_summons` para liberar acesso ao chat — precisa ser recriada sem esse join.
- Políticas RLS de `match_summons`.

**Frontend**
- Componente `src/components/PlayerSummons.tsx` (lista de convocações).
- Componente `src/components/MatchConfirmationList.tsx` (tela de confirmação de presença — usa `match_summons`).
- Hooks `useMatchSummons` e `useCreateSummons` em `src/hooks/useSupabaseData.ts` (+ canal realtime `summons-${matchId}`).
- `src/pages/Index.tsx`: bloco de "Presença" para o próximo jogo (confirmar/recusar), import de `PlayerSummons`, contador `pendingSummons` (já não usado pelo sino).
- `src/pages/Agenda.tsx`: aba/visão "summons", contadores nos cards (`getSummonCounts`), pré-preenchimento da escalação com confirmados, botão "Enviar convocações", import e uso de `useMatchSummons`/`useCreateSummons`.
- `src/pages/Chat.tsx`: presença (confirmar/recusar) via `useCreateSummons`, mapa `summonByPlayerId`.
- `src/pages/Escalacao.tsx`: pré-fill da escalação com confirmados.
- `src/pages/Payments.tsx`: filtro "confirmedPlayers" para divisão de custo via `summons`.
- `src/components/FinalizeMatchDialog.tsx`: carrega "confirmed summons" para montar a lista de jogadores ao finalizar a partida.
- `src/components/AdminGate.tsx`: item de descrição "Enviar convocações".
- `src/integrations/supabase/types.ts`: tipos auto-gerados (regenerados na migration).

## Mudanças

### 1) Migration única — apagar tudo do banco

```sql
-- triggers e funções de convocação
DROP TRIGGER IF EXISTS trg_auto_summon_team_players ON public.matches;
DROP TRIGGER IF EXISTS trg_auto_summon_on_match_create ON public.matches;
DROP TRIGGER IF EXISTS trg_auto_lineup_on_confirm ON public.match_summons;
DROP FUNCTION IF EXISTS public.auto_summon_team_players() CASCADE;
DROP FUNCTION IF EXISTS public.auto_lineup_on_confirm() CASCADE;

-- remover da publicação realtime (se estiver)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables
             WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='match_summons') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.match_summons';
  END IF;
END $$;

-- recriar can_access_match_realtime SEM o join em match_summons
CREATE OR REPLACE FUNCTION public.can_access_match_realtime(_match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _match_id IS NULL THEN false ELSE EXISTS (
    SELECT 1 FROM public.matches m
    LEFT JOIN public.teams th ON th.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    LEFT JOIN public.players ph ON ph.team_id = m.home_team_id AND ph.user_id = auth.uid()
    LEFT JOIN public.players pa ON pa.team_id = m.away_team_id AND pa.user_id = auth.uid()
    WHERE m.id = _match_id AND auth.uid() IS NOT NULL
      AND (th.owner_id = auth.uid() OR ta.owner_id = auth.uid()
           OR ph.id IS NOT NULL OR pa.id IS NOT NULL)
  ) END;
$$;

-- por fim, a tabela
DROP TABLE IF EXISTS public.match_summons CASCADE;
```

### 2) Frontend — remover arquivos

- `src/components/PlayerSummons.tsx` → deletar
- `src/components/MatchConfirmationList.tsx` → deletar

### 3) Frontend — remover hooks/usos

- `src/hooks/useSupabaseData.ts`: remover bloco `SUMMONS / LINEUPS` referente a `useMatchSummons` e `useCreateSummons` (manter os de lineups). Remover o canal realtime `summons-${matchId}`.
- `src/pages/Index.tsx`: remover import de `PlayerSummons`, `useMatchSummons`, `useCreateSummons`; remover `summons`, `pendingSummons`, `nextMatchSummons`, `summonByPlayerId`, `roster`, `confirmedRoster`, `declinedRoster`, `pendingRoster`, `myCurrentStatus`, `handlePresence` e o card/dialog de "Presença" do próximo jogo. Não mexer no resto da Home.
- `src/pages/Agenda.tsx`: remover import e uso de `useMatchSummons`/`useCreateSummons`; remover `summons`, `allSummons`, `getSummonCounts`, view `"summons"` (case do `detailView`), botão "Enviar convocações" e os contadores de summons nos cards. Pré-fill da escalação passa a ser feito só com `match_lineups` existentes (sem filtrar por confirmados). Visão "lineup/field" continua funcionando.
- `src/pages/Chat.tsx`: remover `useMatchSummons`/`useCreateSummons` e toda a UI de presença (confirmar/recusar). Mensagens do chat permanecem.
- `src/pages/Escalacao.tsx`: remover `useMatchSummons` e o pré-fill baseado em summons; usar somente `match_lineups`/`players` existentes.
- `src/pages/Payments.tsx`: divisão de custo deixa de filtrar por "confirmados via summons" — passa a usar `match_lineups` (jogadores escalados) como base. Esta é a única substituição funcional necessária para o app não quebrar.
- `src/components/FinalizeMatchDialog.tsx`: remover "confirmed summons"; lista de jogadores ao finalizar passa a vir de `match_lineups` + `match_guests` (já é o que faz parcialmente).
- `src/components/AdminGate.tsx`: remover o item de texto "Enviar convocações".

### 4) Tipos

- `src/integrations/supabase/types.ts` é auto-regenerado após a migration; nenhum edit manual.

## Fora de escopo

- Qualquer mudança em funcionalidades não relacionadas (matches em si, lineups, chat de mensagens, agenda em geral, ranking, mensalidades, perfis, autenticação, etc.).
- Não criar nenhuma funcionalidade substituta de "presença" — fica simplesmente removida.

## Resultado esperado

- Banco sem `match_summons`, sem triggers/funcções de convocação.
- App sem nenhuma tela, botão ou hook de convocação/presença.
- Realtime do chat segue funcionando (RLS recriada sem o join).
- Escalação e divisão de custo continuam funcionando, apoiadas em `match_lineups`.
