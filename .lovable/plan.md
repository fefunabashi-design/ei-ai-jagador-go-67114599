## 1. Cadastro do Time — CPF do admin obrigatório

Em `src/pages/TeamManage.tsx` (`handleSaveTeam`):
- Adicionar "CPF do Admin" (`admin_cpf`) à lista de campos obrigatórios e validar com `isValidCpf`.
- Marcar o label do campo com `*` e `required`.
- Pré-preencher `admin_cpf` ao abrir o diálogo de criar time com o CPF do usuário logado (`profile.cpf`, formatado). Ao editar, manter o CPF já salvo no time; se vazio, fazer fallback para o CPF do perfil.

## 2. Tela Início — remover "Campeonatos"

Em `src/pages/Index.tsx`:
- Remover o card de estatística `campeonatos` do grid (mudar `grid-cols-4` → `grid-cols-3`).
- Remover do dicionário `statDetailLabels`, do tipo `StatKey`, das variáveis `campeonatosTotal` e do bloco condicional `statDetail === "campeonatos"` no diálogo de detalhes.
- Remover `campeonatos: 0` de `perTeamStats`.

## 3. Editar Usuário — remover botão "Ranking"

Em `src/pages/Profile.tsx`:
- Remover o bloco de navegação que renderiza o botão "Ranking" (o array com `{ label: "Ranking", path: "/ranking" }` e o `motion.button` correspondente).

## 4. Cadastro do Usuário (Profile) — diversos ajustes

Em `src/pages/Profile.tsx`:

**Estado + Cidade (Select dependentes)**
- Adicionar campo "Estado" como `Select` (lista de UFs do Brasil), acima de "Cidade".
- Trocar o input de "Cidade" por `Select` populado por `getCitiesForUf(estado)` de `src/lib/brCities.ts`. Remover o autocomplete via IBGE.
- Ao trocar Estado, limpar Cidade.
- Persistir o Estado no perfil (campo novo `state` em `profiles`).

**Campo Região**
- Adicionar "Centro" às opções de Região (Z/Sul, Z/Oeste, Z/Norte, Z/Leste, Centro).
- Desabilitar (e limpar) o campo Região quando a Cidade selecionada não for "São Paulo" do estado "SP". Quando for São Paulo-SP, manter habilitado.

**Bug: e-mail "sujo" para cadastro via CPF**
- No `openEditProfile`, detectar e-mail sintético (sufixo `@cpf.eaijogador.app`) vindo de `auth.users` e tratar como vazio no input.
- Tornar o campo E-mail **opcional**: remover validação de obrigatoriedade, validar apenas formato quando preenchido. Atualizar label removendo `*` e remover `required` do `<Input>`.
- Ao salvar, se vazio (ou sintético), gravar `email = null` (não tentar persistir o sintético).

**Bug: e-mail não salva ao editar**
- Em `src/hooks/useSupabaseData.ts` `useUpdateProfile`, incluir `"email"` na lista `allowed` para que o campo seja persistido.
- No `handleSaveProfile` (Profile), incluir `email: editEmail.trim() || null` no payload do `updateProfile.mutate`.

**Bug: cor selecionada não salva**
- Em `useUpdateProfile`, incluir `"primary_color"` e `"state"` na lista `allowed`.

**Simplificar seleção de cores**
- Substituir o `<input type="color">` + botão "Restaurar padrão" por um `Select` com paleta de cores comuns (rótulo + swatch ao lado), por exemplo:
  - Padrão (#bfc4cb), Verde (#10b981), Azul (#3b82f6), Vermelho (#ef4444), Amarelo (#eab308), Laranja (#f97316), Roxo (#8b5cf6), Rosa (#ec4899), Preto (#111827), Cinza (#6b7280).
- `editPrimaryColor` continua sendo o valor (hex) selecionado e segue sendo aplicado via `applyPrimaryColor`.

## 5. Banco de dados

Migration:
- Adicionar coluna `state TEXT` (nullable) à tabela `public.profiles`.
- A coluna `email` em `profiles` já existe — sem mudança de schema.
- Sem alteração em RLS/triggers (campos `email`, `state`, `primary_color` não são privilegiados).

## Detalhes técnicos

- `useUpdateProfile.allowed` passa a incluir: `email`, `primary_color`, `state` além dos atuais.
- Detecção de e-mail sintético: `String(email).endsWith("@cpf.eaijogador.app")` ⇒ tratar como vazio na UI e gravar `null`.
- Lista de UFs hardcoded (27 estados). Cidades por UF usam `CITIES_BY_UF` existente em `src/lib/brCities.ts` (já cobre as principais; expandir SP se necessário em PR futuro).
- Região habilitada apenas quando `state === "SP"` E `city === "São Paulo"`; caso contrário, `disabled` e valor limpo.
- Card "Campeonatos" é removido por completo do dashboard; código relacionado a `campeonatosTotal` e seu detail dialog é apagado.

## Fora de escopo

- Não mexer em outros menus, em Resenha, em feed de posts, em TeamManage além do item (1), nem em fluxos de pagamento/matchmaking.