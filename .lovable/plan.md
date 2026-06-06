## Contexto

Você está logado em `vorva.funa@gmail.com` (Cauan) e, ao completar o perfil, tentou salvar o CPF `80941133834` — que já pertence a outra conta no banco (Aristenides Teixeira). O sistema bloqueia, mas a mensagem atual ("Este CPF já está cadastrado em outra conta. Verifique o número ou faça login na conta existente.") aparece como um toast genérico de erro e não fica clara para o usuário final.

## O que vou mudar

Apenas a mensagem/UX do erro de CPF duplicado no fluxo de salvar perfil. Sem mexer em login, sem apagar contas, sem alterar banco.

### Arquivo: `src/hooks/useSupabaseData.ts` (mutação `useUpdateProfile`)

- Trocar a mensagem do `throw` para um texto mais claro e acionável em PT-BR, indicando:
  - Que o CPF já está vinculado a outra conta.
  - Que o usuário deve conferir os dígitos ou entrar com a conta dona desse CPF (por e-mail ou pelo próprio CPF na tela de login).
- Manter o mesmo tratamento para e-mail duplicado, ajustando o texto no mesmo padrão.

### Arquivo: `src/pages/Profile.tsx` (envio do formulário)

- No `catch` do submit do perfil, quando a mensagem retornada contiver "CPF", além do toast destrutivo:
  - Manter o diálogo de edição aberto (sem fechar).
  - Marcar o campo CPF como inválido (borda destacada) e exibir um texto auxiliar logo abaixo do campo com a mesma mensagem, para que o usuário enxergue o erro sem depender só do toast.
  - Limpar essa marcação assim que o usuário editar o campo CPF novamente.

## O que NÃO vou fazer

- Não apago nem mescla a conta antiga (Aristenides / `e20b93e1-...`).
- Não altero o constraint `profiles_cpf_unique`.
- Não mudo o fluxo de login por CPF/e-mail.
- Não altero migrations nem RLS.

## Como validar depois

1. Logado como `vorva.funa@gmail.com`, abrir o perfil e tentar salvar com CPF `80941133834` → ver mensagem clara no toast **e** no campo, diálogo permanece aberto.
2. Trocar para um CPF válido e não usado → salvar funciona normalmente e redireciona para `/dashboard`.
