# Ajustes na tela Agenda

## 1. Título da página

Arquivo: `src/pages/Agenda.tsx` (linha 527-529)

- Quando aberta a partir do Admin (`fromAdmin === true`): mostrar `AGENDA {NOME_CURTO_DO_TIME}` usando `getShortTeamName` de `src/lib/teamName.ts` (mesma lógica do Chat — ex.: "SC Corinthians Paulista" → "AGENDA CORINTHIANS").
- Quando aberta fora do Admin (acesso pelo BottomNav): mostrar apenas `AGENDA`.

Hoje o código concatena sempre o primeiro token em uppercase, incluindo siglas como "SC"/"EC". Será substituído por `getShortTeamName` e condicionado a `fromAdmin`.

## 2. Novo botão "Finalização" no card finalizado (somente admin)

Arquivo: `src/pages/Agenda.tsx` (linhas 722-780) + um novo Dialog.

Comportamento:

- Em cards cujo `view.isFinalizedByMe === true` e `isOwner === true` (e `fromAdmin === true`), adicionar um novo botão na linha de ações (ao lado de Chat / Vaquinha / Detalhes) chamado **"Finalização"** (ícone `Trophy`).
- Ao clicar, abre um Dialog "Finalização da partida" contendo:
  - Placar final (mandante x visitante) — reaproveitando os campos `home_reported_*` / `away_reported_*` ou `home_score`/`away_score` já usados em outras telas.
  - Lista resumida de gols e cartões do meu time (usando `match_events` já carregados em `matchEvents`, filtrando pelo meu `team_side`).
  - Botão **"Editar finalização"** dentro do dialog, que fecha este modal e abre o `FinalizeMatchDialog` existente (`setFinalizeMatch(match)`).
- Remover o botão "Editar finalização" do bloco expandido `expandedActionsId` (linhas 770-778), pois ele agora vive dentro do novo dialog.

## Detalhes técnicos

- Importar `getShortTeamName` de `@/lib/teamName`.
- Criar estado `const [resultMatch, setResultMatch] = useState<any | null>(null)` para controlar o novo dialog.
- Carregar eventos do `resultMatch` via `match_events` (consulta pontual quando abrir o dialog), espelhando o padrão já em uso (`matchEvents`).
- Nenhuma alteração de backend ou schema — somente UI.

## Fora de escopo

- Estilo/visual do título não muda além da regra acima.
- Demais botões e fluxos do card permanecem inalterados.
