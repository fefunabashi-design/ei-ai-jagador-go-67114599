## Ajustes no cadastro do time e na tela de Desafio

### 1. Botão "+ Dias" um pouco maior
**Arquivo:** `src/pages/TeamManage.tsx` (botão na linha 1361)
- Aumentar a fonte de `text-[11px]` para `text-xs` e adicionar um leve padding (`py-1`), mantendo o mesmo estilo de link em cor primária. Continua sendo um botão discreto, apenas um pouco mais legível.

### 2. "Possui Arena" — trocar Switch por Sim/Não
**Arquivo:** `src/pages/TeamManage.tsx` (bloco linhas 1373–1406)
- Remover o `Switch` atual.
- Trocar por dois botões/segmented control **Sim** / **Não** (usando o padrão visual já presente em outros pontos do formulário — botões `outline` que ficam preenchidos quando ativos).
- Label fixa: "Possui Arena?".
- Comportamento (sem mudar a estrutura de dados — continua usando `form.has_field` com valores `"com"` / `"sem"`):
  - **Sim** → `has_field = "com"`; campo abaixo aparece como **"Nome da Arena *"** (placeholder "Ex: Arena do time"), e o título do endereço continua "Endereço da Arena/Quadra/Campo".
  - **Não** → `has_field = "sem"`; campo abaixo aparece como **"Nome da Sede *"** (placeholder "Ex: Sede do time"), e o título do endereço fica "Endereço da Sede".
- Nenhuma mudança em validação, save, ou em outras telas do cadastro.

### 3. Filtrar Sedes na tela de Desafio (menu Times)
**Arquivo:** `src/pages/BuscarAdversario.tsx`
- Hoje a opção "Meu campo" / "Campo do adversário" aparece sempre que existir `field_name`/`field_address`, independentemente de o time ter Arena ou apenas Sede.
- Alteração: considerar `hasField` (arena cadastrada) **somente** quando `has_field === true` **e** existir `field_name`/`field_address`. Ou seja, times marcados como "Não possui Arena" (`has_field === false`, ou seja, possuem apenas Sede) deixam de aparecer como local selecionável.
- Pontos a ajustar (mesma lógica em todos):
  - Linhas 115–116 (`myHasField` / `oppHasField` no resumo do match).
  - Linhas 590–591 (diálogo "Enviar desafio" — opções "Meu campo" / "Campo do adversário").
  - Linha 665 (diálogo "Nova partida" — pré-seleção do local).
  - Linha 695 (diálogo "Nova partida" — opção "Meu campo").
- Quando nenhum dos dois times tem Arena, manter a mensagem existente "Nenhum dos times tem campo cadastrado. Informe o endereço abaixo." e deixar o usuário digitar o endereço manualmente (comportamento já presente).

### Fora de escopo
- Sem mudanças no schema do banco, sem migração.
- Sem alterar Agenda, Match, MatchDetails ou outras telas que exibem o local — a Sede continua sendo mostrada normalmente em qualquer outro lugar do app.
