## Objetivo

Remover completamente os conceitos de **Crédito Previsto** e **Débito Previsto** do app. Manter apenas o que é **realizado** (efetivamente pago/lançado).

## Onde a funcionalidade existe hoje

Após varredura do código e do banco, "previsto" **não tem nenhuma tabela, coluna, trigger, função ou política dedicada** no banco. É 100% um conceito derivado na UI, e existe **apenas em `src/pages/Caixa.tsx`**:

- Tipo `Lancamento.status: "realizado" | "previsto"`.
- Estado `filterStatus` e opção "Previsto" no select de filtro.
- Geração de "créditos previstos" a partir das mensalidades em aberto do mês atual até dezembro.
- Marcação de débitos/créditos manuais com data futura como `"previsto"`.
- Totalizadores `creditosPrevistos` e `debitosPrevistos`.
- Cards "Créditos Previstos" e "Débitos Previstos".
- Card "Saldo Previsto".
- Badge "Previsto" na lista de lançamentos.

O Admin (`src/pages/Admin.tsx`) já calcula `saldoAtual` ignorando datas futuras — não é afetado.

## Mudanças (apenas `src/pages/Caixa.tsx`)

1. **Tipos / estado**
   - Em `Lancamento`, remover o campo `status` (passa a só existir lançamento realizado).
   - Remover o estado `filterStatus` e seu uso no filtro.

2. **Construção dos lançamentos (`useMemo`)**
   - Remover o bloco que gera "Créditos previstos" a partir das mensalidades em aberto (loop `for (let mes = currentMonth; mes <= 12; mes++)`).
   - Para débitos/créditos manuais (`debitos.forEach`): **não** marcar mais como "previsto" quando a data for futura. Remover `isFuture`/`now` — todo registro vira simplesmente um lançamento real.

3. **Totalizadores**
   - Remover `creditosPrevistos`, `debitosPrevistos` e `saldoPrevisto`.
   - Manter `creditosRealizados`, `debitosRealizados`, `saldoAtual = creditosRealizados − debitosRealizados`.

4. **UI**
   - Grid de summary cards: passa a ter só **Créditos Realizados** e **Débitos Realizados** (2 cards).
   - Remover o card "Saldo Previsto".
   - Adicionar/manter exibição do `Saldo Atual` no lugar onde estava o "Saldo Previsto" (mesmo bloco, só renomeado para "Saldo Atual" e usando `saldoAtual`), para o usuário não perder a visão do saldo.
   - No painel de filtros, remover o select **Status** (Todos/Realizado/Previsto). Ajustar grid para acomodar.
   - Na lista de lançamentos, remover o badge "Realizado/Previsto".
   - Remover qualquer texto/label que mencione "Previsto" (inclui o label da linha 372 e a renderização do badge na linha 733).

## Banco de dados

Nenhuma migração necessária. As tabelas `debitos`, `mensalidades` e `mensalidade_config` não possuem colunas relacionadas a "previsto" e continuarão como estão. Nada é dropado, nenhuma trigger é alterada.

## Fora de escopo

- Qualquer outra tela, hook, função, automação ou regra. Admin, Mensalidades, hooks de Supabase, etc. permanecem **inalterados**.
- Nenhum redesign além da remoção dos elementos listados acima.

## Resultado esperado

- Tela Caixa mostra apenas valores realizados (Créditos Realizados, Débitos Realizados, Saldo Atual).
- Filtro de Status some; filtros de tipo e data continuam funcionando.
- Nenhuma referência a "previsto" no código (`rg -i previsto src/` deve retornar 0 ocorrências) nem no banco.
- Restante do app intacto.
