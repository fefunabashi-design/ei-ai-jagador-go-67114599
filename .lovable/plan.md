# Restaurar funcionalidade do botão "Confirmações"

O botão continua no card da próxima partida em `src/pages/Index.tsx`, mas hoje apenas navega para `/agenda`. A funcionalidade antiga (diálogo com confirmados/ausentes/convidados) foi perdida em reversões anteriores e o componente `MatchConfirmationList` não existe mais. Além disso, a tabela `match_lineups` atual não guarda status nem motivo de ausência.

## O que será feito

### 1. Migration de banco
Adicionar campos em `public.match_lineups` para suportar confirmação de presença:
- `status` (texto: `confirmed` ou `absent`, padrão `confirmed`)
- `absence_reason` (texto: `machucado`, `viagem`, `trabalho`, nulo quando confirmado)

A tabela `match_guests` (já existente) será usada para os convidados.

### 2. Novo componente `src/components/MatchConfirmationList.tsx`
Diálogo (shadcn `Dialog`) acionado pelo botão "Confirmações", recebendo `matchId` e `teamId`. Conteúdo:

- **Topo (ações do usuário logado)**: botões grandes
  - `Confirmado` (verde) → upsert em `match_lineups` com `status='confirmed'`
  - `Ausente` (vermelho) → upsert com `status='absent'` e abre seletor de motivo:
    - Machucado (cruz vermelha)
    - Viagem (avião)
    - Trabalho (maleta)
  - `Convidado` → abre input para digitar o nome → insert em `match_guests`

- **Três colunas** (`grid grid-cols-3`):
  1. **Jogadores** — todos os players ativos do time que ainda não responderam
  2. **Confirmados** — players com `status='confirmed'` + convidados (com badge "Convidado por X")
  3. **Ausentes** — players com `status='absent'` mostrando o ícone do motivo

Usa React Query (`useQuery` para `match_lineups` + `match_guests` + `players`, `useMutation` para upsert/insert/delete) e Realtime para atualizar a lista ao vivo.

### 3. Integração em `src/pages/Index.tsx`
- Manter o botão `Confirmações` no card da próxima partida.
- Trocar o `onClick` que faz `navigate("/agenda?matchId=...")` por um estado local `confirmOpen` que abre `<MatchConfirmationList matchId={m.id} teamId={myTeam.id} open={confirmOpen} onOpenChange={setConfirmOpen} />`.
- Continua visível apenas para partidas com `status !== 'completed'`.

## Detalhes técnicos
- Identificação do `player_id` do usuário logado via `players.user_id = auth.uid()` e `team_id = myTeam.id`.
- Upsert em `match_lineups` por `(match_id, player_id)` — adicionar índice único se ainda não existir na migration.
- Políticas RLS: permitir `SELECT` para membros do time (via `is_team_member`) e `INSERT/UPDATE/DELETE` do próprio registro do jogador; convidados podem ser inseridos por qualquer membro do time da partida.
- Localização PT-BR em todos os textos e toasts.
- Mobile-first: em telas pequenas, as 3 colunas viram cards empilhados verticalmente.

## Fora de escopo
- Não mexer na tela `/agenda` nem na escalação visual (SoccerField).
- Não alterar lógica de pagamento ou chat.
