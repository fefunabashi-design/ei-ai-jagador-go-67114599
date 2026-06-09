## Problema

Na dashboard (`src/pages/Index.tsx`), o sino com o badge "1" (mostrado quando `pendingSummons > 0`) é renderizado como um `<div>` decorativo, sem `onClick`. Por isso nada acontece ao tocar.

## Solução

Transformar o sino em um botão acessível que abre o mesmo Sheet de configurações já usado pelo link "Editar" — esse Sheet contém o item "Notificações" e demais opções.

### Alteração (linhas 518–525 de `src/pages/Index.tsx`)

Trocar o `<div className="relative">` por um `<button>` com:
- `onClick={() => setSettingsOpen(true)}`
- `aria-label="Abrir notificações e configurações"`
- mesma marcação visual atual (ícone `Bell` + badge com a contagem)
- `type="button"` e foco/hover sutis para não destoar do header

Nada mais muda: o Sheet (`settingsOpen`) já existe (linha 444) e já lista "Notificações", "Editar perfil", etc.

## Fora de escopo

- Não criar nova página/popover dedicado.
- Não alterar lógica de convocações nem o conteúdo do menu.
- Sem mudanças de backend.
