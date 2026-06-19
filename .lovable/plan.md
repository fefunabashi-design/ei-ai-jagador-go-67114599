## Plano: E-mails de autenticação com domínio próprio

### Situação atual
- Domínio de envio já adicionado: **suporte.eaijogador.funando.com.br** (status: pendente de DNS).
- Você optou por manter este domínio e aplicar a identidade visual do app nos templates.

### Passo 1 — Verificar DNS do domínio
A verificação acontece via delegação de subdomínio (NS records) do Lovable. Você precisa adicionar, no seu provedor de DNS de `funando.com.br`, registros NS apontando o subdomínio `suporte.eaijogador` para os nameservers do Lovable. Os valores exatos estão em **Cloud → Emails → Manage Domains** (ex.: `ns3.lovable.cloud`, `ns4.lovable.cloud`).

Vou abrir um botão direto para essa tela para você conferir/copiar os registros. Após adicionar, a propagação pode levar até 72h; o Lovable verifica automaticamente.

Importante: o remetente exibido aos destinatários será `algo@suporte.eaijogador.funando.com.br` (e não `@funando.com.br`), por ser o subdomínio delegado já configurado. Trocar para `@funando.com.br` puro exigiria remover o domínio atual e configurar um novo na raiz — você pediu para manter o atual, então sigo com este.

### Passo 2 — Scaffold dos templates de auth
Rodar `scaffold_auth_email_templates`, que cria:
- `supabase/functions/auth-email-hook/` (hook que enfileira na pgmq).
- `supabase/functions/_shared/email-templates/` com os 6 templates: `signup`, `magic-link`, `recovery` (redefinição de senha), `invite`, `email-change`, `reauthentication`.

A infraestrutura de fila (pgmq, cron, `process-email-queue`) já está instalada neste projeto, então não será recriada.

### Passo 3 — Aplicar identidade visual nos templates
Ler `src/index.css` e usar os tokens já definidos:
- Primary `hsl(145, 68%, 36%)` (verde menta), accent `hsl(42, 90%, 52%)` (dourado), foreground/muted conforme `:root`.
- Fonte: Nunito (com fallback `Arial, sans-serif` para clientes de e-mail).
- Border radius do botão CTA conforme `--radius`.
- Body do e-mail sempre `#ffffff` (regra do sistema, mesmo em apps com tema escuro).
- Logo: procurar em `public/` e `src/assets/`; se houver, subir para bucket `email-assets` e inserir no topo de cada template. Se não houver, usar texto "E Aí Jogador" estilizado.
- Copy em PT-BR, tom amistoso coerente com o app (ex.: "Redefina sua senha", "Confirme seu e-mail").

Atenção especial ao **recovery** (redefinição de senha):
- Preview text claro ("Link para criar uma nova senha").
- CTA "Redefinir senha" usando `confirmationUrl`.
- Aviso de expiração e instrução "se você não solicitou, ignore este e-mail".
- Link alternativo em texto caso o botão não funcione.

### Passo 4 — Deploy
Deploy do `auth-email-hook` para ativar a integração. Enquanto o DNS não verifica, o Lovable continua enviando os e-mails de auth padrão; após verificação, passam a sair com seus templates a partir do seu subdomínio.

### Passo 5 — Preview e acompanhamento
Vou fornecer botões para:
- Abrir a tela de Emails (status do domínio e DNS).
- Pré-visualizar os templates de signup e recovery.

### Detalhes técnicos
- Arquivos criados/editados:
  - `supabase/functions/auth-email-hook/index.ts`, `deno.json`
  - `supabase/functions/_shared/email-templates/{signup,magic-link,recovery,invite,email-change,reauthentication}.tsx`
  - `supabase/config.toml` (entrada da função, automática)
  - Possível upload em Storage `email-assets` (logo)
- Sem alterações no app React em si.
- Sem novas migrations (infra já existe).

### Fora do escopo
- Trocar para `@funando.com.br` puro (requer remover o domínio atual).
- Templates de e-mail transacional do app (contato, notificações). Posso configurar depois se quiser.
