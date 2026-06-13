# Valor da mensalidade vigente por faixa de meses

## Comportamento atual
Hoje o campo "VALOR" funciona em dois modos:
- "Ano todo" salva um valor padrão do ano (linha com `mes = null`).
- Mês específico salva um valor só para aquele mês; outros meses caem no padrão do ano.

Os cálculos de arrecadação e por jogador usam um único `valorMensal` para todos os meses pagos.

## Novo comportamento solicitado
Quando o usuário define um valor com um mês selecionado, esse valor passa a valer **a partir daquele mês** e segue vigente nos meses seguintes do mesmo ano, **até** o próximo mês que tenha uma nova edição de valor.

Exemplo (ano 2026):
- Jan → R$ 50 → vale de Jan a Mai.
- Jun → R$ 70 → vale de Jun a Set.
- Out → R$ 80 → vale de Out a Dez.

Se não houver nenhuma edição mensal e existir um padrão do ano (linha com `mes = null`), ele continua sendo usado como base/fallback para os meses sem regra.

## Mudanças

### 1. `src/hooks/useSupabaseData.ts`
- `useMensalidadeConfig` (quando `mes` for específico): em vez de cair direto no padrão do ano, buscar a linha mais recente com `mes <= selectedMonth` no mesmo ano. Se não houver, usar a linha com `mes = null` (padrão do ano). Se ainda assim não houver, retornar `null`.
- Adicionar um novo hook `useMensalidadeConfigsAno(teamId, ano)` que retorna todas as linhas de `mensalidade_config` daquele ano (incluindo a padrão `mes = null`), para o cálculo de vigência mês a mês.
- Manter `useUpsertMensalidadeConfig` como está (já grava por `team_id, ano, mes`).

### 2. `src/pages/Mensalidades.tsx`
- Usar `useMensalidadeConfigsAno` e calcular um helper `valorDoMes(mes)`:
  - Pega a maior `mes <= alvo` entre as linhas com `mes` não nulo.
  - Se não houver, usa a linha com `mes = null`.
  - Se nada existir, retorna 0.
- Substituir o uso de `valorMensal` único nos cálculos:
  - `totalArrecadado` no modo "Ano todo": soma `valorDoMes(m)` para cada mês `m` pago, por jogador.
  - `totalArrecadado` no modo mês específico: usa `valorDoMes(selectedMonth)`.
  - `totalExpected`: soma `valorDoMes(m)` para cada mês considerado, multiplicado pelo número de jogadores.
  - Por jogador (resumo "💰 arrecadado" e "⚠️ em aberto"): somar `valorDoMes(m)` por mês pago/em aberto, em vez de `paid * valorMensal`.
- O campo "VALOR" do mês selecionado continua exibindo o valor vigente daquele mês (vindo de `useMensalidadeConfig` ajustado). Salvar continua gravando exatamente em `(ano, mes)` selecionado, criando o ponto de virada.
- Ajustar o texto auxiliar abaixo do campo para: "A partir de {Mês}/{Ano} esse valor passa a valer até que outro mês tenha um novo valor definido."
- Diálogo de confirmação ao salvar: trocar a frase para refletir a nova semântica ("vigente a partir de {Mês}/{Ano}").

## Fora de escopo
- Não alterar schema do banco nem RLS; a tabela `mensalidade_config` já suporta `(team_id, ano, mes)` com `mes` nulo.
- Não mexer em `mensalidades` (registro de pagamentos por jogador/mês continua igual).
- Não mexer em outras telas (Caixa, Admin etc.).
