## Objetivo

Os botões **Finalizar partida**, **Editar Partida** e **Remover da agenda** não devem mais aparecer dentro do dialog "Detalhar" da tela Agenda. A ação **Finalizar partida** continua disponível no botão **Detalhes** do card da próxima partida na tela Admin (onde já existe hoje).

## Mudanças

### 1. `src/pages/Admin.tsx`
Sem alterações de comportamento — confirmar que o bloco `showNextActions` (card "Próxima partida") já contém **Finalizar partida** (linhas 574–580). Não é preciso adicionar Editar/Remover lá, pois essas ações já estão acessíveis em outros pontos (Reagendar/Cancelar no card, e na Agenda há o painel de ações por card).

### 2. `src/pages/Agenda.tsx` (dialog Detalhar — linhas ~1135–1179)
Remover o bloco inteiro que renderiza:
- Botão **Finalizar partida** (IIFE com `getMatchView`, linhas 1135–1148)
- Botão **Editar Partida** (linhas 1150–1156)
- `AlertDialog` de **Remover da agenda** (linhas 1157–1178)

O dialog Detalhar passa a mostrar apenas o conteúdo informativo (placar, gols, cartões, etc.) sem os três botões de ação no rodapé.

As ações continuam disponíveis:
- **Finalizar partida**: no card "Próxima partida" do Admin (Detalhes) e no painel de ações expandido do card da Agenda (quando aplicável).
- **Reagendar / Cancelar partida**: já existem no painel de ações expandido do card da Agenda.
- **Editar finalização**: já existe no painel de ações quando a partida foi finalizada.

## Notas técnicas
- Após a remoção, verificar se `Trophy`, `Pencil`, `Trash2`, `AlertDialog*` ainda são usados em outros pontos do arquivo antes de remover imports (provavelmente continuam em uso pelos cards da lista).
