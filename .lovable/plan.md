# Auditoria Técnica — E Aí Jogador

> Escopo: análise estática (sem alterar nada). Aprovação necessária antes de cada etapa de refatoração.

## 1. Componentes não utilizados

Detectados via varredura de `import` em todo `src/`:

**Componentes de aplicação (`src/components/`) sem nenhum import:**
- `MatchCard.tsx` (83 linhas) — substituído por código inline em `Index.tsx`/`Agenda.tsx`.
- `NavLink.tsx` (28 linhas) — `BottomNav` foi reescrito sem ele.
- `PlayerCard.tsx` (66 linhas) — não referenciado.
- `PlayerFormDialog.tsx` (135 linhas) — formulário foi reimplementado dentro de `TeamManage.tsx`.
- `StatCard.tsx` (34 linhas) — duplicado por blocos manuais.
- `AdminGate.test.tsx` — teste de um componente, ok manter, mas confirmar se o test runner roda.

**Componentes shadcn/ui (`src/components/ui/`) sem nenhum import:**
`accordion`, `alert`, `aspect-ratio`, `breadcrumb`, `card`, `carousel`, `chart`, `collapsible`, `command`, `context-menu`, `drawer`, `form`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `progress`, `resizable`, `scroll-area`, `sidebar`, `slider`, `toggle-group`.

→ ~23 arquivos UI mortos. Removê-los reduz o bundle de dev e a árvore que o Vite precisa escanear.

## 2. Bibliotecas não utilizadas (ou subutilizadas)

Detectado escaneando `from "<lib>"` em `src/`:

| Pacote | Uso real | Recomendação |
|---|---|---|
| `react-hook-form` + `@hookform/resolvers` + `zod` | **0 imports** | remover |
| `cmdk` | só em `ui/command.tsx` (não usado) | remover junto com `command` |
| `embla-carousel-react` | só em `ui/carousel.tsx` (não usado) | remover |
| `input-otp` | só em `ui/input-otp.tsx` (não usado) | remover |
| `next-themes` | só em `ui/sonner.tsx` | manter (dependência indireta do toast) |
| `qrcode.react` | 1 uso (Pix) | manter |
| `react-day-picker` | só em `ui/calendar.tsx` (não usado) | remover |
| `react-resizable-panels` | só em `ui/resizable.tsx` (não usado) | remover |
| `recharts` | só em `ui/chart.tsx` (não usado) | remover (pesado!) |
| `vaul` | só em `ui/drawer.tsx` (não usado) | remover |
| `@lovable.dev/cloud-auth-js` | 1 uso | confirmar necessidade |
| `framer-motion` | 25 arquivos | mantido, mas pesado — ver §7 |

**Impacto estimado:** `recharts`, `embla-carousel`, `framer-motion` e o Radix de componentes não usados respondem por uma fatia grande do bundle inicial.

## 3. Hooks redundantes / duplicados

`src/hooks/useSupabaseData.ts` exporta **52 hooks** em 1126 linhas. Problemas:

- `useMyTeams`, `useMyAdminTeams`, `useMyTeam`, `useSetActiveTeam` coexistem após a decisão (memória) de não ter "time ativo". `useMyTeam`/`useSetActiveTeam` provavelmente são mortos pós-mudança de `Team.tsx` e `Index.tsx`.
- Pares CRUD (`useCreateX/useUpdateX/useDeleteX`) repetem boilerplate idêntico de `mutationFn + invalidateQueries`; podem virar uma fábrica genérica.
- `useStatsData` em `src/lib/stats.ts` é chamado em `App.tsx` em todas as rotas, mesmo nas que não exibem stats.
- `useAdminAccess` re-executa em cada `onAuthStateChange` e é usado em múltiplas páginas (Admin, AdminGate) — sem cache compartilhado, refaz a mesma query.

## 4. Contextos globais / providers desnecessários

- `AuthCtx` em `App.tsx` está correto.
- `TooltipProvider` engloba toda a árvore mesmo em telas sem tooltip.
- Dois sistemas de toast simultâneos: `<Toaster />` (radix/shadcn) **e** `<Sonner />` (sonner). Há `src/components/ui/use-toast.ts` re-exportando outro hook. Consolidar em um único.
- `UserThemeLoader` e `StatsLoader` são "componentes-efeito" montados na raiz; ambos chamam `supabase.auth.getSession()` + `onAuthStateChange` separadamente (3 listeners totais com o `AuthProvider`). Pode ser unificado.

## 5. Código duplicado por iterações sucessivas

Sinais fortes nas páginas grandes (Index 1009, Agenda 1333, TeamManage 1735, Times 1147, Admin 1014):

- Renderização de card de partida aparece inline em `Index.tsx`, `Agenda.tsx` e `MatchDetails.tsx` — mesmo placar, mesmas pílulas, mesmo botão compartilhar. `MatchCard.tsx` existe mas não é usado.
- Formatação de data (`isoToBr`, formatação de hora, dia da semana em PT) repetida em várias páginas; deveria viver em `src/lib`.
- Lookup de perfil por CPF: edge functions `lookup-profile-by-cpf` e `lookup-email-by-cpf` fazem trabalho sobreposto.
- Cálculos de stats de jogador duplicados entre `lib/stats.ts` e funções inline nas páginas.
- Lógica de "lineup automático ao confirmar" em `Index.tsx` + `Agenda.tsx` + `Escalacao.tsx`.

## 6. Re-renderizações frequentes

- `Index.tsx` (1009 linhas) declara dezenas de `useState`/`useEffect` no topo; cada `invalidateQueries` re-renderiza a página inteira.
- `App.tsx > AuthProvider` chama `setSession`, `setStatus`, `setStuck` em sequência sem batching cuidadoso. O `useEffect` listener faz `window.setTimeout(() => checkProfile(s), 0)` em **todo** evento auth (inclui `TOKEN_REFRESHED` periódico) → revalida perfil sem necessidade.
- `useStatsData(hasSession)` na raiz mantém subscriptions vivas em todas as rotas.
- `TeamManage.tsx` (1735 linhas) é montado dentro de `Suspense` mas sem code-splitting interno; o form inteiro re-renderiza a cada keystroke do CPF (handler `onBlur`+`onChange` chamando edge function).
- 10 `supabase.channel(...).subscribe()` espalhados — sem checagem se já existem; em navegação rápida pode haver leaks.
- Lista de jogadores/partidas usa `.map` sem `key` estável em vários pontos (a inspecionar).

## 7. Rotas que carregam recursos desnecessários

- `framer-motion` (~60 kB gz) é importado em 25 arquivos, inclusive páginas onde só faz fade-in trivial que `tailwindcss-animate` resolveria.
- `Index.tsx` importa `matchShareImage.ts` (gera PNG via canvas) no topo do módulo → carregado mesmo quem nunca clica em "compartilhar".
- `Agenda.tsx` importa `SoccerField.tsx` (455 linhas, SVGs) eager → carregado mesmo sem abrir escalação.
- `PostFeed`/`PostCard`/`AddPostDialog` (feed/resenha) carregados em `Index.tsx` mesmo se a aba não estiver ativa.
- `ui/sonner` + `ui/toaster` ambos montados na raiz.
- `recharts` e `embla-carousel` no `package.json` ainda são bundlados se algum import residual existir (verificar tree-shaking).

## 8. Causas prováveis da lentidão de navegação

1. **Chunks por rota muito grandes**: Index (48 KB raw), TeamManage (68 KB), Times (55 KB), Agenda (61 KB), Admin (46 KB). Sem split interno, cada navegação baixa código pesado + executa `framer-motion` na inicialização do módulo.
2. **`useStatsData` global** roda queries pesadas em toda rota.
3. **3 listeners `onAuthStateChange`** (AuthProvider, StatsLoader, UserThemeLoader, useAdminAccess) — cada `TOKEN_REFRESHED` dispara 4 fluxos paralelos.
4. **Realtime channels** abertos eagerly nas páginas (Chat, Index, Agenda) e não compartilhados.
5. **Hard-reload automático** em `main.tsx` ao primeiro erro de chunk mascara stale-bundle, mas o usuário paga o custo do reload completo.
6. **`queryClient.staleTime: 30s` + `retry: 1`** combinado com muitas `invalidateQueries` em mutações → muitos refetches.
7. **Bundle UI inflado** com ~23 componentes Radix não usados (cada um pode ser tree-shaken, mas o `lovable-tagger` em dev escaneia todos).

---

# Plano de Refatoração (em etapas, sem alterar funcionalidades)

> Cada etapa é independente, reversível, e exige sua aprovação antes da execução. Nenhuma muda comportamento visível ao usuário final.

### Etapa 1 — Limpeza segura (zero risco funcional)
- Remover componentes mortos: `MatchCard`, `NavLink`, `PlayerCard`, `PlayerFormDialog`, `StatCard`.
- Remover componentes shadcn não usados (lista da §1).
- Remover dependências órfãs do `package.json`: `react-hook-form`, `@hookform/resolvers`, `zod`, `cmdk`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `recharts`, `vaul`.
- Consolidar toasts: manter apenas `sonner` **ou** `toaster` (a definir com você).
- **Critério de aceite:** `npm run build` passa; nenhuma rota quebra.

### Etapa 2 — Centralizar auth/theme/stats
- Unificar os 3 listeners `onAuthStateChange` em um único hook `useAuthSession` exposto via contexto; `UserThemeLoader`, `useAdminAccess` e `StatsLoader` o consomem.
- Mover `useStatsData` para ser ativado por rota (somente Index/Ranking), não globalmente.
- Filtrar evento `TOKEN_REFRESHED` para não re-checar perfil.

### Etapa 3 — Hooks de dados
- Criar fábrica genérica `createCrudHooks(table)` reduzindo os pares Create/Update/Delete (~30 hooks).
- Remover `useMyTeam`/`useSetActiveTeam` (já não há "time ativo").
- Padronizar `invalidateQueries` em escopos menores para evitar refetch em cascata.

### Etapa 4 — Extrair componentes das páginas gigantes
Para Index, Agenda, TeamManage, Times (sem mudar comportamento):
- Extrair `MatchCard` real e usá-lo nas 3 telas.
- Extrair `PlayerForm` (TeamManage) em arquivo próprio.
- Extrair `FiltersBar` (Times) em arquivo próprio com estado memoizado.
- Usar `React.memo` em cards de lista; `useMemo` para listas derivadas; `useCallback` em handlers passados pra baixo.

### Etapa 5 — Code-splitting fino
- Lazy-load `matchShareImage`, `SoccerField`, `PostFeed`, `FinalizeMatchDialog`, `MonthlyCalendar` via `import()` sob demanda.
- Substituir animações triviais de `framer-motion` por classes `animate-*` do Tailwind onde a animação é só fade/slide; manter `framer-motion` só em interações ricas.

### Etapa 6 — Realtime e cache
- Centralizar subscrições Supabase em um `RealtimeManager` que reaproveita canais por chave.
- Subir `staleTime` para queries imutáveis (perfil, times) para 5 min; manter 30 s só nas listas voláteis.

### Etapa 7 — Edge functions
- Fundir `lookup-email-by-cpf` e `lookup-profile-by-cpf` em uma única função `lookup-by-cpf` com parâmetro de retorno.

### Métricas de validação (após cada etapa)
- Tamanho do bundle inicial e dos chunks por rota (antes/depois).
- Número de listeners `onAuthStateChange` ativos.
- Tempo até interativo na rota `/dashboard` em viewport mobile.
- `npm run build` + smoke test manual das 5 rotas principais.

---

Diga **quais etapas aprovar** (todas, ou em ordem) e eu executo apenas as aprovadas. Posso começar pela **Etapa 1** (puramente remoção de código morto e dependências) se quiser ganho imediato com risco zero.