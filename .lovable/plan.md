## Problema

A KPI **"Gols da Temporada"** no dashboard mostra **3** para o Kazu, mas ele só fez **2** gols.

Causa: a lógica atual (`src/pages/Index.tsx:232`) soma os gols de TODOS os times do usuário (`perTeamStats.reduce(...)`), incluindo gols de companheiros de equipe e convidados. No banco, a partida tem:

- Fernando (= Kazu) → 2 gols
- Cafu (convidado) → 1 gol
- **Total time: 3** ← valor errado exibido na KPI pessoal

Além disso, o player "Fernando" tem `user_id = null`, então um filtro ingênuo por `players.user_id = auth.uid()` retornaria 0. Precisamos resolver o vínculo por nome/apelido também.

## Solução

Trocar a KPI **"Gols da Temporada"** para contar apenas eventos do próprio usuário (Kazu = Fernando = 2).

### Mudanças em `src/pages/Index.tsx`

1. **Resolver os `player_id` que pertencem ao usuário logado** dentro de `myTeamIds`:
   - Primário: `players.user_id === profile.user_id`
   - Fallback (quando não há vínculo): match por nome — `players.name`, `players.nickname` igual (case/acentos-insensitive) a `profile.display_name` ou `profile.nickname`
   - Armazenar em `myPlayerIds: string[]`

2. **Novo `useEffect`** que consulta `match_events` (`type IN ('goal','own_goal')`, `player_id IN myPlayerIds`, `match_id IN completedAllMatches.ids`) e seta `meusGolsTemporada` (own_goal NÃO conta como gol pessoal — deve ser excluído).

3. **Substituir** `const golsTemporada = perTeamStats.reduce((a,s)=>a+s.gols,0)` por `const golsTemporada = meusGolsTemporada` (KPI individual).

4. Manter `perTeamStats[*].gols` (dialog "Gols por time") inalterado — segue exibindo total do time (correto semanticamente).

5. `jogosTemporada` permanece como está (escopo do pedido é apenas gols).

## Detalhe técnico

- Fonte única continua sendo `match_events` (sem regressão na auditoria anterior).
- `own_goal` próprio não é gol do jogador — filtrar somente `type = 'goal'` na consulta pessoal.
- A resolução por nome é tolerante: normalizar (lowercase + remover acentos) antes de comparar; usar `Set` para evitar duplicatas.

## Arquivos afetados

- `src/pages/Index.tsx` — adicionar resolução de `myPlayerIds`, novo `useEffect` para `meusGolsTemporada`, trocar atribuição do `golsTemporada`.
