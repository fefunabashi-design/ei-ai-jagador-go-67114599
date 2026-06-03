## Cadastro de Jogadores — ajustes

**1. CPF não aparece ao editar jogador**
- Em `src/pages/TeamManage.tsx`, na função `openEditPlayer` (linha 504), o campo `cpf` é inicializado como `""`.
- Corrigir para `cpf: player.cpf ? formatCpf(player.cpf) : ""` para trazer o CPF já cadastrado, formatado.

**2. Data de Nascimento obrigatória**
- Em `handleSavePlayer`, adicionar validação: se `playerForm.birth_date` estiver vazio, exibir toast "Data de Nascimento é obrigatória" e abortar o save.
- Marcar visualmente o label "Data de Nascimento" como obrigatório (asterisco).

**3. E-mail não é mais obrigatório**
- Remover a validação que exige `playerForm.email` em `handleSavePlayer` (linha 539-542).
- Manter validação de formato apenas se o usuário preencher algo: se `email` não vazio e não bater com regex, mostrar erro; caso contrário aceitar vazio.
- Remover/atualizar indicação visual de obrigatoriedade no label do E-mail.

Nenhuma outra alteração de comportamento, schema ou outros formulários.