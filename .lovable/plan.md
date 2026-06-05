# Testar fluxo "Esqueci minha senha"

Hoje o app ainda usa o remetente padrão da plataforma (o domínio próprio `eaijogador.funando.com.br` ainda não foi cadastrado). Mesmo assim já dá para validar o fluxo ponta-a-ponta.

## Passo a passo do teste

1. Abrir a tela de login do app (`/auth`).
2. Clicar em **Esqueci minha senha**.
3. Informar um e-mail real de um usuário existente (ex.: `fe.funabashi@gmail.com`) e enviar.
4. Conferir a caixa de entrada (e a pasta de spam/lixo eletrônico — como ainda é o remetente padrão, a chance de cair em spam é maior).
5. Clicar no link do e-mail. Deve abrir a tela `/reset-password` do app.
6. Definir uma nova senha e confirmar. Esperado: toast "Senha alterada" e redirecionamento para `/dashboard`.
7. Voltar para `/auth` e fazer login com a nova senha para confirmar.

## Verificações que eu faço em paralelo

- Conferir nos logs de auth se a requisição `/recover` retornou 200 e se o hook de e-mail rodou com sucesso (já vi os dois eventos nos logs mais recentes — está funcionando).
- Confirmar que o link de redirecionamento aponta para `/reset-password` do ambiente correto (preview vs. publicado).

## Cenários extras para cobrir

- E-mail **não cadastrado**: o Supabase responde 200 mesmo assim (por segurança), nenhum e-mail é enviado. Comportamento esperado, não é bug.
- Link **expirado/reutilizado**: a tela `/reset-password` deve mostrar "Link inválido" com botão de voltar.
- Senha com menos de 6 caracteres ou senhas diferentes: deve mostrar toast de erro sem chamar o backend.

## Observação sobre entrega

Enquanto o domínio `eaijogador.funando.com.br` não estiver verificado, os e-mails saem do remetente padrão e podem cair em spam. Depois que o domínio for ativado, a entrega melhora bastante e o remetente passa a ser `E Aí Jogador(a) <nao-responda@eaijogador.funando.com.br>`.

Quer que eu já dispare um e-mail de recuperação de teste pra um endereço específico e acompanhe os logs, ou prefere testar manualmente pelo app?
