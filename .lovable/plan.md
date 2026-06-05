# Configurar e-mails com domínio próprio

**Subdomínio remetente:** `eaijogador.funando.com.br`
**Nome do remetente:** `E Aí Jogador(a)`

## O que será feito

1. **Abrir o diálogo de configuração de domínio de e-mail** — você adicionará o subdomínio `eaijogador.funando.com.br` e receberá os registros NS para colocar no seu provedor de DNS (funando.com.br). A Lovable passa a gerenciar SPF/DKIM/MX automaticamente nesse subdomínio.

2. **Após o subdomínio ser registrado** (mesmo antes da verificação de DNS completar), eu vou:
   - Provisionar a infraestrutura de e-mail (fila, cron, logs de envio, supressão).
   - Gerar os 6 templates de auth (signup, **recovery**, magic-link, invite, email-change, reauthentication).
   - Aplicar a identidade visual do app (tema escuro, verde menta e dourado, fonte Nunito, textos em PT-BR).
   - Customizar o template de **recuperação de senha** com copy em português, marca "E Aí Jogador(a)" e CTA "Redefinir senha".
   - Publicar a função `auth-email-hook` que processa os eventos de e-mail.

3. **Verificação de DNS** — pode levar até 72h (geralmente <1h). Durante esse período, os e-mails padrão da Lovable continuam funcionando. Após verificação, os e-mails passam a sair de `nao-responda@eaijogador.funando.com.br` com o nome "E Aí Jogador(a)".

## Detalhes técnicos

- Domínio delegado via NS records para `ns3.lovable.cloud` / `ns4.lovable.cloud`.
- Remetente final: `E Aí Jogador(a) <nao-responda@eaijogador.funando.com.br>`.
- Templates em `supabase/functions/_shared/email-templates/*.tsx` usando React Email.
- Hook em `supabase/functions/auth-email-hook/` usa a fila `auth_emails` (pgmq) com retentativas automáticas.
- Monitoramento em **Cloud → Emails** após o setup.

Aprovar para iniciar?
