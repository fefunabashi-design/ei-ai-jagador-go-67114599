## Problema

Na tela inicial, os cards **Jogos da temporada**, **Gols da temporada** e **Lembretes** somam dados de todos os times retornados por `useMyTeams()`, que inclui tanto times onde o usuário é dono/administrador quanto times onde ele é jogador vinculado.

Resultado: a usuária Nide, que é administradora de dois times mas só está cadastrada como jogadora em um deles (ou em nenhum), vê estatísticas/lembretes de times onde ela não joga.

A regra correta:
- Os 3 cards da Home devem considerar **apenas os times em que o usuário está cadastrado como jogador** (`players.user_id = profile.user_id`).
- Se ela for só administradora de um time (sem registro como jogadora), aquele time **não** entra nos cards.
- A página **Agenda** (fora do menu Admin) já segue essa regra (`myPlayerTeamIds`), então só validamos.

## Mudanças

### 1. `src/pages/Index.tsx`

Adicionar um query para os times em que o usuário é jogador e usar esse conjunto como filtro em todos os cálculos dos cards:

- Nova query `useQuery(["my-player-team-ids", profile.user_id])` que retorna `Set<string>` de `team_id` distintos onde existe `players.user_id == profile.user_id` (mesma lógica usada hoje em `Agenda.tsx`).
- Substituir a derivação atual:
  ```ts
  const myTeamIds = new Set((myTeams || []).map((t) => t.id));
  ```
  por:
  ```ts
  const playerTeamIds = new Set(myPlayerTeamIds);
  const teamsAsPlayer = (myTeams || []).filter((t) => playerTeamIds.has(t.id));
  const myTeamIds = new Set(teamsAsPlayer.map((t) => t.id));
  ```
- Usar `teamsAsPlayer` (em vez de `myTeams`) ao montar `perTeamStats` (breakdown por time exibido nos cards).
- `allMyMatches`, `completedAllMatches`, `golsByTeam`, `meusGolsByTeam`, `lembretes` e `lembretesPerTeam` continuam funcionando porque dependem de `myTeamIds`, agora restrito.
- Card **Jogos da temporada**: `jogosTemporada` continua sendo a soma de `perTeamStats[].jogos` (já fica zerado para times onde ela é só admin).
- Card **Gols da temporada**: usa `meusGolsTemporada`, que já filtra por `players` desses times — ao restringir `myTeamIds` automaticamente passa a ignorar times onde ela só administra.
- Card **Lembretes**: `lembretesPerTeam` é montado por `teamIds = Array.from(myTeamIds)`, então o time onde ela só é admin some da lista.

Nenhuma outra área da Home muda (próximo jogo, header, ações, etc.).

### 2. `src/pages/Agenda.tsx`

Sem mudanças de comportamento — já filtra por `myPlayerTeamIds` quando `fromAdmin === false` (linhas 248-267). Apenas validar visualmente:
- Quando ela acessa Agenda pelo bottom nav (sem `?from=admin`), só aparecem partidas dos times em que ela é jogadora.
- Acessando via menu Admin, continua mostrando partidas do time ativo administrado.

## Fora do escopo

- Painel **Admin** e telas internas dele (continuam mostrando o time administrado).
- Lógica de criação de partidas, escalação, chat, finanças.
- Mudanças em `useMyTeams` (continua útil para seleção de time ativo no header).
