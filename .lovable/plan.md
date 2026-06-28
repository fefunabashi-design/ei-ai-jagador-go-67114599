## Diagnóstico

O e-mail de recuperação de senha está sendo enviado por `no-reply@auth.lovable.cloud` (remetente padrão genérico do Lovable), e **não** pelo seu domínio `notify.funando.com.br`.

Motivos do aviso "Esta mensagem pode ser perigosa" no Gmail:
1. **Domínio do remetente ≠ domínio do link de reset** (auth.lovable.cloud vs sua app). O Gmail desconfia desse desalinhamento.
2. **`auth.lovable.cloud` é um remetente compartilhado** de baixa reputação para a sua conta, sem SPF/DKIM/DMARC alinhados ao seu domínio.
3. O template customizado de recuperação ainda **não está ativo** porque o domínio `notify.funando.com.br` está com status **DNS pendente** ("Setting up — Verifying your domain").

Enquanto o DNS não verificar, o Lovable cai no fallback (template e remetente padrão) — exatamente o que você está vendo.

## O que precisa ser feito

O código (`auth-email-hook`, templates em PT-BR com identidade do app, infraestrutura de fila) **já está pronto e implantado**. Não há mudança de código necessária. O que falta é apenas a propagação/verificação DNS dos registros NS de `notify.funando.com.br` no seu registrador (Registro.br / provedor onde `funando.com.br` está hospedado).

### Passos

1. Abrir **Cloud → Emails → Manage Domains** no Lovable e copiar os 2 registros **NS** indicados para `notify.funando.com.br` (algo como `ns3.lovable.cloud` e `ns4.lovable.cloud`).
2. No painel DNS do `funando.com.br`, criar/garantir o subdomínio `notify` apontando para esses NS (registros do tipo NS, não A/CNAME).
3. Aguardar propagação (alguns minutos até algumas horas; pode chegar a 72h em casos raros).
4. Clicar em **Verify Domain** no Lovable até o status virar **Active**.
5. Testar novamente o "Esqueci a senha". O e-mail passará a sair de `no-reply@notify.funando.com.br` com SPF/DKIM/DMARC alinhados e o aviso vermelho do Gmail desaparece.

### Verificação extra (após DNS Active)

- Confirmar no Gmail que o cabeçalho mostra "assinado por: notify.funando.com.br" e "enviado por: notify.funando.com.br".
- Marcar a primeira mensagem como "Não é spam" para acelerar a reputação na sua caixa.

## Observação

Não vou alterar arquivos do projeto neste plano — o problema é puramente de DNS/configuração de domínio. Se preferir, posso, em vez disso, **trocar para um subdomínio diferente** (ex.: `mail.funando.com.br`) caso `notify.funando.com.br` esteja com conflito de DNS existente. Me avise se quer seguir por esse caminho.
