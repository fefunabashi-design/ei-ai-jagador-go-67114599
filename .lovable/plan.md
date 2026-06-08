# Corrigir cards de partida

Dois ajustes em todos os cards de partida (Dashboard, Agenda, Desafios e qualquer outro que liste partidas).

## 1. Logos dos times não aparecem

**Causa:** `useMatches` faz JOIN direto com a tabela `teams` (`teams!matches_home_team_id_fkey(*)`). A RLS da `teams` é "owner-only", então quando o time pertence a outro usuário (adversário, ou time do qual sou apenas jogador), o join devolve `null` — sem `logo_url`, sem `name`, sem `field_name`. Por isso o card cai no fallback (ícone `Shield` rosa, "???").

**Correção:** trocar o join para a view pública `public_teams`, que expõe os campos seguros (`id, name, logo_url, field_name, city, state, ...`) para qualquer usuário autenticado.

- Em `src/hooks/useSupabaseData.ts`, no `useMatches` (linha ~365) e em qualquer outra query equivalente (linha ~829), substituir:
  - `home_team:teams!matches_home_team_id_fkey(*)` → `home_team:public_teams!matches_home_team_id_fkey(*)`
  - `away_team:teams!matches_away_team_id_fkey(*)` → `away_team:public_teams!matches_away_team_id_fkey(*)`
- Validar que a FK `matches_home_team_id_fkey` resolve a `public_teams`; caso a hint da FK não funcione com a view, fazer fetch separado em `public_teams` pelos IDs e mesclar no resultado (fallback robusto).

## 2. Localização mostra o endereço inteiro

Hoje os cards exibem `(home_team as any)?.field_name || m.location`. Quando `field_name` está vazio (caso de matches antigos / desafios onde o usuário digitou local livre como `"Itaquerão — Avenida Miguel Ignácio Curi, 111 - Vila Carmosina - SP"`), cai no `m.location` completo.

**Correção:** criar um helper `getFieldDisplayName(match)` em `src/lib/matchView.ts` (ou novo `src/lib/matchLocation.ts`) que retorna apenas o nome do campo:

1. Se `home_team.field_name` existir, usa ele.
2. Caso contrário, pega `m.location` e corta na primeira ocorrência de `—`, ` - `, `,` ou `·`, retornando só a parte inicial (`trim()`).

Aplicar esse helper em todos os locais que hoje fazem `field_name || location`:
- `src/pages/Index.tsx` (linhas 629, 641, 701, 755, 783)
- `src/pages/Agenda.tsx` (linhas 663, 915)
- `src/lib/matchShareImage.ts` (se aplicável)
- Qualquer outro local detectado por `rg "field_name \|\| .*location"`

## Não incluído

- Não alterar a forma como a localização é **gravada** (continua salvando o que o usuário digitou). A mudança é apenas de exibição.
- Não mexer em RLS da tabela `teams` (manter owner-only).
