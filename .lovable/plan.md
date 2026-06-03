# Acelerar páginas Inicial, Times, Agenda e Admin

## Diagnóstico

Após inspecionar `src/pages/Index.tsx`, `Times.tsx`, `Agenda.tsx`, `Admin.tsx`, `src/hooks/useSupabaseData.ts` e `src/lib/stats.ts`, identifiquei 5 causas que se somam e fazem essas páginas demorarem a aparecer:

1. **Cascata de requisições em série na inicialização**
   - `useMyTeam()` é construído sobre `useMyTeams()`, que faz 3 queries sequenciais: `teams (owner)` → `players (links)` → `teams in (...)`.
   - Em seguida `usePlayers(myTeam?.id)` só dispara *depois* que `myTeam` chega.
   - `useMatches()` repete `teams (owner)` + `players (links)` **de novo** antes de buscar `matches` com join duplo (home_team + away_team). Cada página refaz 2-3x a mesma informação.

2. **Render bloqueado pelo `isLoading`**
   - Todos os hooks de lista iniciam com `isLoading: true`. As páginas (especialmente Index, Agenda, Admin) usam essas flags para mostrar spinner em tela cheia em vez de pintar o esqueleto da UI primeiro. O usuário só vê algo depois que TODAS as queries terminam.

3. **Verificação de perfil duplicada**
   - `AuthProvider` já busca `profiles` no boot. `useProfile()` é chamado de novo no Index (e como side-effect no Admin), refazendo o mesmo SELECT.

4. **Invalidationes globais via `emitChange`**
   - Qualquer mutação dispara o evento `supabase-data-change`, que **refaz todos os hooks de lista montados** (myTeams, matches, players, photoEvents, etc.). Em telas com 4-5 hooks ativos isso multiplica o tráfego e mantém spinners piscando.

5. **`useStatsData` em série**
   - O hook global de notas faz `matches (completed)` e só depois `match_lineups in (...)`, com `staleTime: 60s`. Embora rode no App, ele compete pela conexão durante o boot.

## Estratégia (sem mudar funcionalidade)

Aplicar **render progressivo + cache compartilhado**, focado nas 4 páginas reclamadas. Nenhuma regra de negócio muda.

### 1. Consolidar o "contexto do usuário" em um único hook cacheado

Criar `useUserContext()` em `src/hooks/useUserContext.ts` usando React Query (já temos `QueryClient` no App):

- Uma única busca paralela (Promise.all) para: `teams owned`, `players links → team_ids`, e os `teams` correspondentes.
- Retorna `{ uid, ownedTeamIds, memberTeamIds, allTeams, isLoading }`.
- `staleTime: 30s`, chave `['user-context', uid]`.
- `useMyTeams`, `useMyAdminTeams`, `useMyTeam` e a parte inicial de `useMatches` passam a derivar desse cache em vez de cada um fazer suas próprias 2-3 queries.
- Mantém o evento `supabase-data-change`: o hook escuta uma vez e chama `queryClient.invalidateQueries(['user-context'])`. Assim a granularidade do refetch é controlada — não vai mais refazer tudo a cada mutação.

### 2. Migrar `useMatches`, `useMyTeams`, `useMyAdminTeams`, `usePlayers` para React Query

- Substituir as factories internas `createListHook` por `useQuery`, usando `staleTime: 30-60s` e `keepPreviousData: true`.
- Benefício imediato: na segunda visita à página os dados já vêm do cache → render quase instantâneo, fetch acontece em background.
- O dispatcher `supabase-data-change` é traduzido uma única vez para `invalidateQueries` com as chaves certas.
- Assinaturas dos hooks ficam idênticas (`{ data, isLoading }`), nenhum consumidor muda.

### 3. Render progressivo (não bloquear na carga)

Nas 4 páginas:

- Pintar header, abas e estrutura imediatamente; usar Skeletons só nas áreas de dados (lista de partidas, grid de jogadores, cards de times).
- Trocar checagens do tipo `if (isLoading) return <Spinner/>` por renderização condicional dentro de cada bloco.
- Em **Index**: remover dependência de `profileLoading`/`teamLoading` para o layout — o cabeçalho usa fallback ("Craque") e o card "próximo jogo" mostra skeleton enquanto `matches` carrega.
- Em **Admin**: remover a chamada redundante a `useProfile()` (linha 54) — o `AuthProvider` já garante perfil; usar `useAuthContext()` se precisar de algum campo, ou ler do cache do React Query.

### 4. Dedup de perfil

- Expor `profile` (com is_active etc.) pelo `AuthCtx` em `App.tsx`, escrito uma vez no `checkProfile`.
- `useProfile` passa a ler do cache do React Query semeado pelo AuthProvider (`queryClient.setQueryData(['profile', uid], data)`), eliminando o segundo SELECT.

### 5. Quick wins adicionais

- `useStatsData`: já tem `staleTime: 60s`, mas o `queryKey` dos lineups inclui `matchIds.join(",")` — em listas grandes isso invalida com qualquer mudança. Usar `matchIds.length + ":" + maxUpdatedAt` ou uma chave estável (`['stats-lineups']`) e invalidar manualmente.
- `useMyTeam`: remover o `addEventListener('supabase-data-change')` interno (refetch em toda mutação) — basta reagir ao cache de `useMyTeams` mais o `localStorage` (evento `storage`).
- Em `Index`, `myTeams` é importado mas só usado para um seletor opcional; deixar em `enabled: settingsOpen` para não buscar no load.

## Detalhes técnicos (resumo dos arquivos tocados)

```text
src/hooks/useUserContext.ts        (novo)  — fonte única para uid + times
src/hooks/useSupabaseData.ts       — useMyTeams/useMyAdminTeams/useMyTeam/
                                     useMatches/usePlayers/useProfile reescritos
                                     com React Query; createListHook removido.
                                     emitChange → invalidateQueries seletivo.
src/App.tsx                        — AuthProvider semeia ['profile', uid] no cache;
                                     AuthCtx expõe profile.
src/pages/Index.tsx                — remove gate de loading global,
                                     usa skeletons locais; myTeams lazy.
src/pages/Times.tsx                — skeletons locais; remove dependência de
                                     isLoading global.
src/pages/Agenda.tsx               — idem; mantém isLoading só para a lista.
src/pages/Admin.tsx                — remove useProfile() duplicado; skeletons.
src/lib/stats.ts                   — queryKey estável; sem refetch em cascata.
```

Nada de UI muda visualmente além da troca "spinner full → skeleton + conteúdo aparecendo em partes". Nenhum endpoint, RLS, schema ou regra de negócio é alterado.

## Critérios de validação

- Build TypeScript ok, sem mudar assinaturas exportadas dos hooks.
- Navegar Inicial → Times → Agenda → Admin: cabeçalho aparece em <300ms, dados preenchem progressivamente; segunda visita praticamente instantânea (cache React Query).
- Mutações (criar/editar/excluir time, jogador, partida) continuam refletindo nas listas (via `invalidateQueries`).
- Nenhuma regressão em login/logout, troca de time ativo, ou em telas não listadas.

## Fora do escopo

- Refatorar páginas Chat/Funds/Mensalidades/Caixa (não foram citadas).
- Mexer em edge functions, RLS, schema.
- Mudar visual/UX além da substituição spinner → skeleton.
