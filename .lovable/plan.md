# Atalho visível para super admin

Hoje a página `/super-admin/pagamentos` só é alcançada digitando a URL. Vou adicionar um acesso visível, apenas para usuários com `is_super_admin = true`.

## Mudanças

**`src/pages/Admin.tsx`**
- Importar `useAdminAccess` para ler `isSuperAdmin`.
- Logo abaixo da grid "Atalhos administrativos", renderizar um card destacado **"Pagamentos Pix — Aprovar/rejeitar mensalidades"** que navega para `/super-admin/pagamentos`. Visível só se `isSuperAdmin`.

**(Opcional) `src/pages/Profile.tsx`**
- Acrescentar um link "Painel super admin → Pagamentos" no menu da conta, também condicionado a `isSuperAdmin`.

Sem alterações de banco. Sem novas rotas (a rota já existe).
