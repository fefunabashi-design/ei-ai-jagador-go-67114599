# Sincronizar nome social do perfil com o cadastro de jogador

## Objetivo
Quando o usuário editar seu **nome social** (e sobrenome/apelido) no perfil, atualizar automaticamente o registro correspondente em `players` — o mesmo que aparece em **Admin → Meu Time**.

## Como funciona hoje
- `profiles.display_name` / `last_name` / `nickname` guardam a identidade do usuário.
- `players` tem colunas próprias `display_name`, `last_name`, `nickname` e `name`, preenchidas no cadastro do jogador no time. Elas **não** são recalculadas quando o perfil muda, por isso o "Meu Time" continua com o nome antigo.

## Solução (backend, via migração)
Criar um **trigger** em `public.profiles` que, após `UPDATE`, propaga os campos de identidade para todas as linhas de `public.players` do mesmo `user_id`.

1. Função `public.sync_player_identity_from_profile()` `SECURITY DEFINER`, `search_path = public`:
   - Se `display_name`, `last_name` ou `nickname` mudarem, executar:
     ```sql
     UPDATE public.players
       SET display_name = NEW.display_name,
           last_name    = NEW.last_name,
           nickname     = NEW.nickname,
           name         = TRIM(COALESCE(NEW.display_name,'') || ' ' || COALESCE(NEW.last_name,'')),
           updated_at   = now()
     WHERE user_id = NEW.user_id;
     ```
   - `name` continua sendo o "nome completo" já usado em telas legadas.
2. Trigger `AFTER UPDATE OF display_name, last_name, nickname ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_player_identity_from_profile();`
3. **Backfill único** no mesmo migration para alinhar registros existentes:
   ```sql
   UPDATE public.players p
     SET display_name = pr.display_name,
         last_name    = pr.last_name,
         nickname     = pr.nickname,
         name         = TRIM(COALESCE(pr.display_name,'') || ' ' || COALESCE(pr.last_name,'')),
         updated_at   = now()
   FROM public.profiles pr
   WHERE pr.user_id = p.user_id
     AND (p.display_name IS DISTINCT FROM pr.display_name
       OR p.last_name    IS DISTINCT FROM pr.last_name
       OR p.nickname     IS DISTINCT FROM pr.nickname);
   ```

## Fora de escopo
- Não altera nada no frontend (Profile.tsx continua salvando só em `profiles`).
- Não mexe em `email`, `phone`, `cpf`, `birth_date`, `region` do jogador — esses continuam gerenciados pelo cadastro do time.
- Não toca em RLS, grants nem em outros triggers existentes.

Responda **aprovar** para eu aplicar a migração.
