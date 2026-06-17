## Plano

Piscar em todas as telas, mesmo parado, indica fonte global de atualização. Vou atacar 3 causas globais identificadas no código, sem tocar em regras de negócio nem em layout.

### 1. Bridge de invalidação global registrado fora do React (`src/App.tsx`)

Os listeners `supabase-data-change` e `mock-db-change` que invalidam queries do React Query estão registrados no topo do módulo, fora de qualquer `useEffect`. Sempre que o módulo é reavaliado (hot reload, navegação que toque o módulo), um novo listener é adicionado sem remover o anterior. Resultado: uma única mutação dispara invalidação 2x, 3x, N vezes → todas as listas globais refazem fetch → re-render em cascata.

Vou mover esse registro para dentro de um `useEffect([], ...)` no componente `App`, com `removeEventListener` no cleanup.

### 2. Refetch em cada renovação de token (`src/hooks/useSupabaseData.ts` → `useProfile` e `src/hooks/useAdminAccess.ts`)

Ambos chamam `refetch()`/`load()` em qualquer evento de `onAuthStateChange`, inclusive `TOKEN_REFRESHED` (Supabase dispara periodicamente em segundo plano) e `INITIAL_SESSION` (às vezes duplicado). Cada refetch troca a referência de `profile`/`admin state` → re-render de toda a árvore que depende deles (Home, BottomNav, gates de Admin, etc.).

Vou filtrar para refetch só em `SIGNED_IN`, `SIGNED_OUT` e `USER_UPDATED`, como o `AuthProvider` já faz.

### 3. Polling redundante no chat (`src/hooks/useSupabaseData.ts` → `useChatMessages`)

O hook atualiza a lista de mensagens por três caminhos simultâneos: Realtime, listener global de mutações e `setInterval(load, 5000)`. O polling de 5s recarrega `setData` continuamente. Embora o chat só rode quando aberto, ele dispara `setData` que pode pesar em cascata se houver outros listeners.

Vou remover o `setInterval` fixo. Realtime + listener global cobrem o caso. Mantém `removeChannel` no cleanup.

### Verificação final

Após as edições, vou reler os trechos para confirmar que: listeners globais têm cleanup, subscriptions Realtime continuam com `removeChannel`, e os filtros de evento de auth estão corretos.

## Fora de escopo

- Não vou refatorar `useSubscribe`/`createListHook` — funcionam corretamente; corrijo o gatilho, não o consumidor.
- Não vou mexer em subscriptions Realtime de lineups/payments — já têm cleanup correto e não têm polling.
- Não vou memoizar componentes de página agora — esperado que o flicker pare só com as 3 correções acima.
- Não altero design, cores, regras de negócio nem queries.

## Explicação que darei ao usuário depois da implementação

> O app piscava em todas as telas porque três coisas globais ficavam recarregando dados sem necessidade: o registro de invalidação de queries estava fora do React e acumulava handlers duplicados, o perfil e o status de assinante refaziam fetch toda vez que o Supabase renovava o token em segundo plano, e o chat tinha polling de 5s além do realtime. Corrigi os três pontos para que recarregamentos só aconteçam quando algo realmente muda.