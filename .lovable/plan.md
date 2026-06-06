## Objetivo

Apagar completamente as duas contas do banco:

- `vorva.funa@gmail.com` — user `37bf03f0-df70-42b2-8d3d-ab43acfaf08d` (Cauan)
- CPF `80941133834` — user `e20b93e1-79c5-47f9-b3af-fbe735dd4c0c` (Aristenides)

## Como será feito

Uma única migration que executa, dentro de uma transação, para os dois `user_id`:

1. Apagar linhas dependentes em todas as tabelas do schema `public` que referenciam o usuário (direta ou indiretamente via `players`, `teams` que ele possui, `matches` desses times, `posts`, `resenha_posts`, `photo_posts` etc.). Ordem segura:
   - reactions / comments → `resenha_comment_reactions`, `resenha_reactions`, `resenha_comments`, `resenha_posts`
   - `match_chat_messages`, `match_events`, `match_guests`, `match_lineups`, `match_payments`, `match_summons` ligados às matches dos times do usuário e às linhas onde ele é player
   - `matches` cujos times pertencem ao usuário
   - `mensalidades`, `mensalidade_config`, `debitos` ligados aos times do usuário
   - `team_favorites` do usuário
   - `players` do usuário (e os vinculados aos times dele)
   - `photo_posts`, `posts` do usuário
   - `admin_subscriptions` do usuário
   - `trial_blocklist` com `source_user_id` do usuário
   - `teams` cujo `owner_id` é o usuário
   - `profiles` do usuário
2. Apagar o usuário em `auth.users` (cascateia o que sobrar).

A migration usa apenas os dois UUIDs acima, sem afetar outros usuários.

## Riscos / efeitos colaterais

- Times de propriedade dessas contas serão removidos junto com tudo que pendura neles (partidas, escalações, chats, pagamentos, mensalidades, caixa). Se algum jogador de outro `user_id` estiver vinculado a esses times, o vínculo também some.
- Arquivos em Storage (avatars, team-logos, photos, payment-proofs, post-media) **não** são apagados por esta migration. Se quiser limpar storage também, me diga e eu adiciono uma etapa via Edge Function (a CLI/SQL não apaga buckets diretamente).
- Operação **irreversível**.

## O que não será feito

- Não mexo em código (sem alterações em React, hooks ou Edge Functions).
- Não toco em outros usuários, times ou registros.
- Não altero schema, RLS, triggers ou policies.
