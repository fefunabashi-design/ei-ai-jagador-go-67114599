## Objetivo
No diálogo de "Lançar desafio" (`src/pages/BuscarAdversario.tsx`), quando um time não tem arena cadastrada (`has_field=false`), não oferecer a sede como local. As opções de Local passam a ser:

- **Meu campo** — só aparece se o time mandante tiver `has_field=true`.
- **Campo do adversário** — só aparece se o adversário tiver `has_field=true`.
- **Outro campo** — sempre aparece. Ao selecionar, mostra dois inputs: **Nome do campo** e **Endereço do campo**.

Se nenhum dos times tiver campo, "Outro campo" já vem pré-selecionado.

## Alteração (apenas frontend)

Arquivo: `src/pages/BuscarAdversario.tsx`

1. Mudar o tipo de `locationChoice` de `"own" | "away"` para `"own" | "away" | "other"`. Adicionar dois novos estados:
   - `challengeFieldName: string`
   - `challengeFieldAddress: string`

2. No `useEffect` de auto-seleção (≈ linhas 110–125):
   - `myHasField`/`oppHasField` como hoje.
   - Definir `choice`:
     - `myHasField && !oppHasField → "own"`
     - `!myHasField && oppHasField → "away"`
     - ambos com campo → `"away"` (mantém comportamento atual)
     - nenhum com campo → `"other"`
   - Quando `choice === "other"`, limpar `challengeLocation`, `challengeFieldName`, `challengeFieldAddress`.

3. No RadioGroup do diálogo (≈ linhas 593–644):
   - Manter `Meu campo` e `Campo do adversário` apenas quando `myHasField`/`oppHasField` respectivamente.
   - Adicionar **sempre** a opção `Outro campo`.
   - Remover o parágrafo "Nenhum dos times tem campo cadastrado..." (substituído por "Outro campo").
   - Quando `locationChoice === "other"`, ocultar o input atual de "Endereço do local da partida" e mostrar dois inputs novos:
     - `Nome do campo` (`challengeFieldName`)
     - `Endereço do campo` (`challengeFieldAddress`)
   - Quando `locationChoice` for `own`/`away`, manter o input único pré-preenchido (vindo de `field_name`/`field_address` do time correspondente).

4. Em `handleConfirmChallenge` (≈ linhas 140–172):
   - Se `locationChoice === "other"`:
     - Exigir `challengeFieldName` e `challengeFieldAddress`; senão `toast` de erro.
     - `location = "<nome> - <endereço>"` (mantém compatibilidade com a coluna `matches.location` que é string única).
   - Caso contrário, fluxo atual.
   - Resetar os novos estados ao final.

5. Diálogo "Nova Partida" (≈ linhas 658–744): aplicar o mesmo padrão de três opções com os mesmos dois inputs quando `newMatchLocationChoice === "other"`. Validar igualmente em `handleCreateNewMatch`.

## Fora do escopo
- Sem alterações de schema/RLS. A coluna `matches.location` continua sendo um único texto; nome + endereço são concatenados para preservar compatibilidade com Agenda, Desafios e demais telas que exibem `location`.
- Cards de Times (`/times`) e demais telas não são tocados.
