## Ajustes na tela de Chat da partida

### 1. Remover cabeçalho com nomes dos times
No `src/pages/Chat.tsx`, no header superior, remover o bloco que exibe `{homeTeam?.name} × {awayTeam?.name}`. Manter apenas o botão de voltar (`ArrowLeft`) e o botão de menu (`MoreHorizontal`) à direita, para preservar a navegação.

### 2. Mostrar nome e time também nas mensagens do adversário
Hoje só as mensagens do próprio usuário (`isMe`) exibem o nome do time (`myTeam.name`) acima do balão. Para as mensagens recebidas, é exibido apenas o apelido/nome do remetente, sem o time.

Mudanças:
- Buscar a qual time cada remetente pertence. Como a partida envolve apenas dois times (`home_team` e `away_team`), e cada mensagem traz `user_id`, vou:
  - Carregar os jogadores de ambos os times (já temos `usePlayers(homeTeam?.id)`; adicionar `usePlayers(awayTeam?.id)`).
  - Montar um mapa `userId → teamName` usando `player.user_id` + nome do time correspondente. Considerar também os donos dos times (`home_team.owner_id` / `away_team.owner_id`) como fallback.
- Para mensagens onde `!isMe`, renderizar acima do balão (mesmo padrão já usado para o usuário atual) uma linha extra com o nome curto do time do remetente, usando `getShortTeamName(...)` que já existe no arquivo. Se o time não for identificado, não renderiza nada (evita "undefined").

### Resumo dos arquivos alterados
- `src/pages/Chat.tsx`
  - Remoção do bloco de nomes dos times no header.
  - Adição de fetch dos jogadores do time visitante.
  - Construção do mapa `user_id → time` e renderização do nome do time também nas mensagens recebidas.

Sem mudanças de backend, banco ou regras de negócio.