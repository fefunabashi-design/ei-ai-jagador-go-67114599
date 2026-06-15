## Problema

Nos cards de Desafios e Partidas, quando o time mandante NÃO tem arena própria (`has_field = false`) mas tem um `field_name` salvo (ex.: "Unidenk"), esse nome aparece mesmo que o desafio tenha sido criado escolhendo o campo do adversário ou outro local. Isso acontece porque `getFieldDisplayName` prioriza cegamente `home_team.field_name`.

## Mudança

Arquivo único: `src/lib/matchView.ts` — função `getFieldDisplayName`.

Nova regra de prioridade:

1. Derivar o nome a partir de `match.location` (primeira parte antes de `-`, `–`, `—`, `,` ou `·`). Esse é o valor efetivamente escolhido na criação/reagendamento do desafio em `BuscarAdversario`, então deve ser a fonte da verdade.
2. Se `match.location` estiver vazio, cair para `home_team.field_name` apenas quando `home_team.has_field === true`.
3. Se nada disso existir, retornar `match.location` cru (string vazia, se for o caso).

## Escopo

- Sem alterações em `BuscarAdversario`, `Desafios`, `Agenda`, `OpponentDetails` ou na estrutura de dados.
- Sem mudanças no `home_team_id`/`away_team_id`.
- Telas que mostram explicitamente "Nome da sede" continuam usando `home_team.field_name` diretamente — não passam por `getFieldDisplayName`.
