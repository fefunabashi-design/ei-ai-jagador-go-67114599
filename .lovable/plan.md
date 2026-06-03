## Objetivo
Confirmar, no preview, que a cor primária selecionada em "Editar Usuário" é gravada em `profiles.primary_color` e refletida imediatamente na UI do perfil.

## Pré-condições
- Usuário logado no preview (rota atual `/team-manage`).
- Coluna `profiles.primary_color` já existe (confirmado anteriormente).
- `useUpdateProfile` inclui `primary_color` na allowlist (linha 118 de `useSupabaseData.ts`) — o trigger `prevent_profile_privilege_escalation` NÃO bloqueia este campo.
- `Profile.tsx` chama `applyPrimaryColor(editPrimaryColor)` logo após salvar (linha 240).
- `UserThemeLoader` relê `primary_color` ao montar e aplica via CSS vars.

## Passos de verificação (browser tool)
1. Navegar para `/profile`.
2. Abrir "Editar perfil", selecionar uma cor diferente da atual no Select de cores.
3. Clicar "Salvar".
4. Observar: header/badge/acentos do perfil mudam imediatamente (sem refresh).
5. Recarregar a página (`navigate_to_sandbox` para `/profile`) e confirmar que a cor permanece (vinda do banco via `UserThemeLoader`).
6. Consultar o banco com `supabase--read_query`:
   ```sql
   SELECT user_id, primary_color, updated_at
   FROM public.profiles
   WHERE user_id = auth.uid()  -- ou filtrar pelo usuário logado
   ORDER BY updated_at DESC LIMIT 1;
   ```
   e confirmar que `primary_color` corresponde ao hex selecionado.

## Critérios de sucesso
- Valor de `primary_color` no banco === hex selecionado no Select.
- UI do perfil reflete a cor imediatamente após salvar (sem reload).
- Após reload, a cor persiste (carregada pelo `UserThemeLoader`).

## Em caso de falha
- Se UI muda mas banco não grava → inspecionar resposta do `update` no Network/console e revisar allowlist/trigger.
- Se banco grava mas UI não atualiza → revisar `applyPrimaryColor` e variáveis CSS consumidas pelos componentes do perfil.
- Reportar achados ao usuário antes de qualquer correção.

## Escopo
Somente verificação — nenhuma alteração de código ou schema neste plano.