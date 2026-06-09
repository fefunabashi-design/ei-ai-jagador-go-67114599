## Mudança

No `src/pages/Index.tsx`, alterar o `onClick` do botão do sino (linhas 518–530) para navegar direto à página de notificações em vez de abrir o Sheet de configurações:

- `onClick={() => navigate("/notifications")}`
- atualizar `aria-label` para "Abrir notificações"

Nada mais muda. O Sheet de configurações continua disponível pelo botão "Editar" no header.
