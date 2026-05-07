# Integração completa com o Supabase

Hoje o app tem o Supabase **conectado** (tabelas `teams`, `players`, `matches`, `match_lineups`, `match_summons`, `match_payments`, `match_chat_messages`, `mensalidades`, `mensalidade_config`, `profiles` com RLS, buckets `avatars` e `team-logos`, página `Auth.tsx` e `ResetPassword.tsx`), mas **toda a camada de dados ainda usa um banco simulado em memória** (`src/lib/mockDb.ts`). Os hooks em `src/hooks/useSupabaseData.ts` leem/escrevem nesse mock e ignoram o `supabase` client. Por isso nada persiste entre sessões nem entre dispositivos.

Esta integração troca o mock pelo Supabase real, ativa a proteção de rotas por autenticação e remove o `mockDb`.

## O que será feito

### 1. Proteção de rotas e estado de autenticação
- `App.tsx`: transformar `ProtectedRoute` em real — escuta `supabase.auth.onAuthStateChange` (antes de `getSession`), redireciona para `/auth` quando não há sessão, limpa `queryClient` no logout (regra do projeto).
- Adicionar rota pública `/auth` apontando para `src/pages/Auth.tsx`.
- Manter `/reset-password` pública.

### 2. Reescrever `src/hooks/useSupabaseData.ts` usando React Query + Supabase
Cada hook abaixo passa a usar `supabase.from(...)` com `useQuery` / `useMutation` e `queryClient.invalidateQueries`:

| Hook | Tabela / ação |
|---|---|
| `useProfile`, `useUpdateProfile`, `useUploadAvatar` | `profiles` + bucket `avatars` |
| `useMyTeams`, `useMyAdminTeams`, `useMyTeam`, `useSetActiveTeam` | `teams` (filtro por `owner_id` ou por jogador vinculado); time ativo persistido em `localStorage` |
| `useCreateTeam`, `useUpdateTeam`, `useDeleteTeam`, `useUploadTeamLogo` | `teams` + bucket `team-logos` |
| `usePlayers`, `useCreatePlayer`, `useUpdatePlayer`, `useDeletePlayer` | `players` |
| `useMatches`, `useCreateMatch`, `useUpdateMatch`, `useDeleteMatch`, `useAcceptMatch` | `matches` |
| `useMatchSummons`, `useCreateSummons` (jogador confirma → status `confirmed`) | `match_summons` |
| `useMatchLineups`, `useSaveLineup`, `useCreateLineup`, `useDeleteLineup` | `match_lineups` |
| Pagamentos, mensalidades | `match_payments`, `mensalidades`, `mensalidade_config` |
| Chat | `match_chat_messages` (com Realtime via `supabase.channel`) |

Hooks de fotos/resenha (`usePhotoEvents`, `usePhotoPosts`, `useCreatePhotoPost`, `useResenhaPosts`, `useAppSharedImages`) — ver seção 4.

### 3. Confirmação na partida (bug recente)
A regra original "ao confirmar, jogador entra na lista de confirmados" passa a funcionar de verdade: `match_summons.status = 'confirmed'` + insert em `match_lineups` (RLS já permite via política `Players can insert their own lineup on confirm`).

### 4. Tabelas que faltam (nova migration)
Hoje não existem tabelas para fotos/resenha/eventos de vaquinha. Migration nova vai criar:
- `photo_events` (id, team_id, type `partida|vaquinha`, title, match_id?, created_at)
- `photo_posts` (id, team_id, event_id, photo_url, comment, author_id, created_at)
- `resenha_posts` (id, team_id, author_id, content, photo_url?, created_at)
- bucket público `photos`
- RLS: SELECT público; INSERT/UPDATE/DELETE só para `owner_id` do time ou autor.

### 5. Realtime
- `ALTER PUBLICATION supabase_realtime ADD TABLE match_chat_messages, match_summons, match_lineups;` para chat e confirmações ao vivo.

### 6. Limpeza
- Remover `src/lib/mockDb.ts`.
- Remover imports de `mockDb` em `Times.tsx`, `Index.tsx`, `Chat.tsx`, `Desafios.tsx`, `Caixa.tsx`, `BuscarAdversario.tsx`, `Payments.tsx`, `Admin.tsx`, `Resenha.tsx`, `Mensalidades.tsx`, `OpponentDetails.tsx`, substituindo por hooks do Supabase.
- Remover `src/lib/stats.ts` se ainda depender do mock (recriar a partir de queries reais ou simplificar).

### 7. Configurações de auth
- Ativar **autoconfirm de email** (regra do projeto) e **HIBP password check**.
- URLs de redirect já estão corretas no código (`/reset-password`).

## O que **não** será feito agora
- Pagamentos via Pix reais (continua marcação manual de pago).
- Notificações push.
- Edge functions novas além da `search-player-by-email` que já existe.

## Riscos / pontos de atenção
- Dados atuais do mock (em `localStorage` do usuário) **serão perdidos** — o app passa a usar o backend real, vazio. Cada usuário precisará criar seu time/jogadores novamente.
- Telas que dependiam de campos extras do mock (ex.: `goals_by`, eventos de cartão dentro da partida) podem precisar de pequenas migrations adicionais — vou identificar e propor conforme aparecerem durante a implementação.

Posso seguir com essa migração?
