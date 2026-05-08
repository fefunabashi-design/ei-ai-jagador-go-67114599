## Resposta rápida

**Código-fonte privado:** já está. Projetos Lovable são privados por padrão — só quem você convidar via Share enxerga o código. O "Public remixing" está desligado (padrão), então ninguém consegue copiar seu código pelo link.

**Link do app público:** já está publicado em `https://ei-ai-jagador-go.lovable.app` com visibilidade `public`. Qualquer pessoa pode acessar, se cadastrar e usar.

**Mas tem 6 falhas críticas de segurança** detectadas na varredura que precisamos corrigir antes — senão qualquer usuário cadastrado vai conseguir ler dados pessoais de todos os outros. Não publique a versão atual ainda.

## O que será corrigido

### 1. Vazamento de dados pessoais (3 erros críticos)
Hoje, qualquer usuário logado consegue ler email/telefone/nascimento de **todos** os jogadores, perfis e times. Vou ajustar as policies RLS:

- **`players`**: SELECT só para o dono do time OU o próprio jogador (via `user_id`).
- **`profiles`**: SELECT só do próprio perfil. Para exibir nome/foto de outros (resenha, ranking) crio uma view pública `public_profiles` com apenas `display_name` e `avatar_url`.
- **`teams`**: divido em dois níveis — campos públicos (nome, logo, cidade) acessíveis via view; campos sensíveis (email, telefone, admin_*, president_*, field_address) só para owner e jogadores vinculados.

### 2. Storage do `team-logos` (1 erro crítico)
Existem policies redundantes "Auth users can delete/update team logos" que permitem **qualquer** usuário logado apagar/sobrescrever logo de qualquer time. Vou removê-las (as policies corretas, restritas ao owner, já existem).

### 3. Realtime sem proteção (1 erro + 1 warning)
`match_payments`, `mensalidades` e `debitos` estão no Realtime sem policies em `realtime.messages` — qualquer logado pode escutar broadcasts financeiros de qualquer time. Vou adicionar policy em `realtime.messages` exigindo que o usuário seja owner ou jogador do time do tópico.

### 4. `mensalidade_config` público (1 warning)
SELECT aberto pra anônimos. Restrinjo a `authenticated` + membro do time.

### 5. Funções SECURITY DEFINER (3 warnings)
`has_role`, `is_team_member`, etc. estão executáveis por anônimos. Vou `REVOKE EXECUTE ... FROM anon` mantendo só `authenticated`.

### 6. Buckets públicos com listagem (3 warnings)
`avatars`, `team-logos`, `photos` permitem `LIST` (não só leitura individual). Vou trocar a policy de SELECT em `storage.objects` para permitir só leitura por path conhecido, sem listar o bucket inteiro.

## Detalhes técnicos

- 1 migration SQL com todas as alterações de RLS, REVOKEs e remoção de policies redundantes.
- Criar view `public_profiles` (security_invoker) e ajustar `Resenha`, `Ranking`, `OpponentDetails` para consumi-la em vez de `profiles` quando o dado for de terceiro.
- Função helper `is_team_member(_team_id, _user_id)` (já existe ou criar) usada em policies novas.
- Configurar **Password HIBP Check** via `configure_auth` (proteção contra senhas vazadas, recomendado pré-publicação).

## Depois de corrigir

Roda nova varredura, confirma 0 erros, e a publicação atual já reflete as mudanças automaticamente (backend deploya na hora; frontend você clica em **Update** no diálogo de Publish).

Posso seguir?
