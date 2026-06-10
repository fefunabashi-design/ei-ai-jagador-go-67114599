## Adicionar botão "+ Dias" na tela de cadastro do time

### O que muda
Na seção "Horários por dia" do formulário de cadastro/edição do time, abaixo dos cards de cada dia já selecionado, adicionar um botão **"+ Dias"** com o mesmo estilo do botão "Editar dias" (link em texto pequeno, cor primária).

### Comportamento
- O botão **"+ Dias"** só aparece quando já existe pelo menos um dia selecionado (caso contrário a lista de dias completa já está visível).
- Ao clicar, ele expande a lista de dias da semana (mesmo efeito que clicar em "Editar dias"), permitindo selecionar dias adicionais.
- Quando a lista já estiver expandida, o botão fica oculto (evita duplicidade com "Ocultar não selecionados").

### Localização técnica
- Arquivo: `src/pages/TeamManage.tsx`
- Inserir o botão logo após o `.map` que renderiza os cards de horário (depois do bloco que termina por volta da linha onde fecha o `{WEEK_DAYS.filter(...).map(...)}` dentro de "Horários por dia"), reaproveitando o estado `showAllWeekDays` / `setShowAllWeekDays` já existente.
- Estilo idêntico ao botão "Editar dias": `text-[11px] font-medium text-primary`, com ícone `+` antes do texto.

### Fora de escopo
Nenhuma alteração de lógica de salvamento, validação ou em outras telas.
