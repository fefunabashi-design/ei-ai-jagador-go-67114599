# Etapa 3 — Hooks de dados (revisada após inspeção)

Ao reler `src/hooks/useSupabaseData.ts` (1126 linhas), o plano original precisa de ajustes:

- O arquivo **não usa React Query** — todos os hooks são `useState + useEffect + useSubscribe + emitChange`. Logo, não existe `invalidateQueries`/`mutationFn` para consolidar; a fábrica precisa ser para o padrão real.
- `useMyTeam` é usado em **15 páginas** (Index, Agenda, Admin, Match, Caixa, Chat, Desafios, Escalacao, Fotos, MatchDetails, Mensalidades, OpponentDetails, BuscarAdversario, Times, TeamManage). Removê-lo seria mudança funcional grande. **Manter.**
- `useSetActiveTeam` ainda é usado em `Admin.tsx`. **Manter.**

## O que será feito (sem alterar comportamento)

### 1. Fábrica `createMutationHook`
Consolidar o padrão repetido ~14 vezes:
```
const [isPending, setIsPending] = useState(false);
const mutate = async (input) => {
  setIsPending(true);
  try { ...; emitChange(); toast({ title: success }); }
  catch (e) { toast({ title: error, description: e?.message, variant: "destructive" }); }
  finally { setIsPending(false); }
};
return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
```

Em uma helper interna:
```ts
const createMutationHook = <I,>(opts: {
  run: (input: I) => Promise<void>;
  success?: string;
  error: string;
}) => () => { /* devolve { mutate, mutateAsync, isPending, isLoading } */ };
```

Hooks migrados (assinatura pública idêntica):
- `useUpdateProfile`, `useUploadAvatar`
- `useCreateTeam`, `useUpdateTeam`, `useDeleteTeam`, `useUploadTeamLogo`
- `useCreatePlayer`, `useUpdatePlayer`, `useDeletePlayer`
- `useCreateMatch`, `useUpdateMatch`, `useDeleteMatch`, `useAcceptMatch`
- Demais mutations de Summons/Lineups/Posts/etc. que sigam o mesmo molde

Ganho estimado: ~300–400 linhas removidas.

### 2. Fábrica `createListHook`
Consolidar o padrão de listas:
```
const [data, setData] = useState([]);
const [isLoading, setIsLoading] = useState(true);
useSubscribe(async () => { ...; setData(rows); setIsLoading(false); });
return { data, isLoading };
```

Helper interno:
```ts
const createListHook = <T,>(fetcher: () => Promise<T[]>) => () => { /* { data, isLoading } */ };
```

Aplicada apenas às listas **sem parâmetros** e **sem realtime channel** (para não introduzir mudanças sutis):
- `useMyTeams`, `useMyAdminTeams`, `useMatches`, e similares sem argumentos.

Listas com `teamId`/`matchId` ou que abrem `supabase.channel(...)` (ex.: `usePlayers`, `useMatchSummons`) **ficam intocadas** nesta etapa (risco de regressão de realtime/cleanup).

### 3. Pequenas remoções seguras
- Tipar retornos com `as const` onde possível para reduzir `any`.
- Garantir que cada `useSubscribe` mantém o mesmo conjunto de eventos (`supabase-data-change`, `mock-db-change`, `storage`) — sem alterar.
- **Não** mudar a granularidade do `emitChange` (continua global) — isso fica para a Etapa 6 (cache/realtime), onde o risco é maior.

### 4. O que NÃO entra nesta etapa
- Remoção de `useMyTeam`/`useSetActiveTeam` (mudaria comportamento; precisa decisão de produto separada).
- `invalidateQueries` em escopos menores (não há react-query no arquivo).
- Realtime/canais Supabase.

## Detalhes técnicos

- Arquivo único alterado: `src/hooks/useSupabaseData.ts`.
- Assinaturas exportadas preservadas 1:1 (retornam exatamente os mesmos campos que hoje: `mutate`, `mutateAsync`, `isPending`, `isLoading`, `data`).
- Mensagens dos toasts mantidas literalmente (PT-BR).
- `cleanXPayload` continuam como funções dedicadas, chamadas dentro do `run` da fábrica.
- Sem mudança em arquivos consumidores das hooks.

## Critério de aceite
- Build passa.
- Smoke test manual nas 5 rotas principais (Dashboard, Agenda, Times, TeamManage, Admin): criar/editar/excluir time, jogador e partida funcionam e exibem o mesmo toast.
- Nenhum import em outras páginas precisa ser ajustado.

Aprovar para eu executar esta etapa.