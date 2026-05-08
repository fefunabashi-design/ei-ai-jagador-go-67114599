# Acesso Admin com trial 30 dias + mensalidade Pix

## Decisões confirmadas
- **Provedor:** Pix manual (sem gateway). Quem paga é apenas o **Administrador do time**; jogadores comuns continuam grátis.
- **Método:** Pix mensal manual.
- **Preço:** R$ 29,90/mês.
- **Bloqueio:** sem PRO/trial → bloqueia `/admin` E criação de times.
- **Trial:** 30 dias grátis automáticos no 1º acesso ao Admin.

## Como o Pix manual vai funcionar (best practice sem gateway)

Sem Stripe/Mercado Pago, o fluxo recomendado é **Pix estático com confirmação semi-automática**:

1. Você (dono do app) cadastra **uma chave Pix** + nome do recebedor nas configurações (env/secret).
2. Usuário clica "Pagar mensalidade R$ 29,90" → app gera tela com:
   - QR Code Pix estático (gerado pelo payload BR Code com valor fixo).
   - Botão "Copiar código Pix".
   - Campo para usuário enviar **comprovante (imagem/PDF)** ou **ID da transação (E2E)**.
3. Status fica `pending_review` → você (super admin) vê em painel `/super-admin/pagamentos`, valida e aprova → libera +30 dias.
4. Notificação por email/in-app quando aprovado.

> Limitação: confirmação manual. Quando o app crescer, podemos plugar Mercado Pago/Stripe para automatizar (a estrutura já estará pronta).

## Banco (migration)

**`profiles` — colunas novas:**
- `trial_started_at timestamptz`
- `subscription_status text` default `'none'` — `none | trialing | active | past_due | expired`
- `subscription_expires_at timestamptz`
- `is_super_admin boolean` default `false` (para você aprovar pagamentos)

**Nova tabela `admin_subscriptions`:**
- `id`, `user_id`, `amount numeric` (29.90), `pix_txid text`, `proof_url text`, `status text` (`pending|approved|rejected`), `submitted_at`, `reviewed_at`, `reviewed_by`, `period_start`, `period_end`.
- RLS: usuário vê só os próprios; super admin vê todos.

**Função `public.has_admin_access(_uid uuid)` SECURITY DEFINER:**
- retorna `true` se `subscription_status in ('trialing','active')` AND `subscription_expires_at > now()`.

**RLS reforçada:**
- `teams` INSERT: exigir `has_admin_access(auth.uid())`.
- `players` INSERT: exigir `has_admin_access(auth.uid())` (apenas para owner de novos times — donos atuais já têm acesso enquanto trial/ativo).

**Storage bucket novo:** `payment-proofs` (privado), policy: usuário só insere/lê os próprios; super admin lê todos.

## Edge functions

1. **`start-trial`** — idempotente. Marca `trial_started_at = now()`, `subscription_status = 'trialing'`, `expires_at = now() + 30 days`. Só funciona se `status = 'none'`.
2. **`submit-pix-payment`** — recebe `pix_txid` e/ou `proof_url`. Cria registro `admin_subscriptions` com `status='pending'`.
3. **`review-pix-payment`** — apenas super admin. Aprova/rejeita; ao aprovar, atualiza `profiles.subscription_status='active'` e estende `expires_at = max(now(), expires_at) + 30 days`.
4. **Cron diário** (pg_cron) — marca `expired` quem passou da data.

## Frontend

**Hook `useAdminAccess()`** — `{ hasAccess, status, daysLeft, expiresAt, isSuperAdmin }`.

**Componente `<AdminGate>`** envolvendo `Admin.tsx`:
- `status='none'` → tela boas-vindas:
  - Título "Admin PRO — Gerencie seu time"
  - Lista benefícios (cadastrar time, jogadores, agendar partidas, mensalidades, caixa…)
  - "R$ 29,90/mês — 30 dias grátis"
  - CTA grande **"Iniciar 30 dias grátis"** → chama `start-trial`.
- `status='trialing'` → acesso liberado + banner topo "Trial: faltam X dias" (vermelho se ≤7).
- `status='active'` → acesso liberado + chip discreto "PRO ativo até DD/MM".
- `status='expired'` → tela "Trial/Assinatura expirou" com CTA "Pagar mensalidade".

**Nova página `/assinatura`:**
- Card com QR Code Pix + código copia-e-cola + valor R$ 29,90.
- Upload de comprovante (Storage `payment-proofs`).
- Campo opcional "ID da transação Pix (E2E)".
- Botão "Enviar para análise" → `submit-pix-payment`.
- Histórico de pagamentos do usuário (status pending/approved/rejected).

**Nova página `/super-admin/pagamentos`** (só `is_super_admin`):
- Lista pagamentos `pending` com link p/ comprovante, dados do user.
- Botões Aprovar/Rejeitar → `review-pix-payment`.

**`BottomNav`:**
- Ícone Admin com cadeado discreto se sem acesso (mantém visível p/ descoberta).

**`Times.tsx` / criação de time:**
- Botão "Criar time" desabilitado se `!hasAccess` com tooltip "Disponível no Admin PRO" + link para trial.

## Fluxo do usuário

```text
Login → toca "Admin"
  ├─ 1ª vez → tela boas-vindas → "Iniciar 30 dias grátis" → libera
  ├─ trial/ativo → entra normal
  └─ expirado → tela paywall → /assinatura
        → exibe QR Pix R$ 29,90
        → user paga no banco, anexa comprovante
        → super admin aprova → +30 dias liberados
        → notificação "Pagamento aprovado"
```

## Etapas de implementação

1. Migration: colunas em `profiles`, tabela `admin_subscriptions`, função `has_admin_access`, RLS, bucket `payment-proofs`.
2. Solicitar secrets: `PIX_KEY`, `PIX_RECIPIENT_NAME`, `PIX_CITY` (para gerar BR Code).
3. Edge functions `start-trial`, `submit-pix-payment`, `review-pix-payment`.
4. Hook `useAdminAccess` + componente `<AdminGate>`.
5. Refatorar `Admin.tsx` com gate.
6. Criar página `/assinatura` (QR Pix + upload comprovante).
7. Criar página `/super-admin/pagamentos`.
8. Atualizar `BottomNav` (cadeado) e `Times.tsx` (bloquear criação).
9. Marcar seu user como `is_super_admin=true` (via insert tool).
10. Testes: trial → expira → paga Pix → aprovação → renovação.

## Pergunta antes de começar

Você já tem **chave Pix** (CPF/CNPJ/email/celular/aleatória) que será o destinatário das mensalidades? Vou pedir como secret para gerar o QR Code automático. Se ainda não tiver, posso deixar configurável via tela `/super-admin/configuracoes`.
