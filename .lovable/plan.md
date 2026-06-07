## O que está acontecendo

O chat da partida em si **já está correto**. A função vive em `src/hooks/useSupabaseData.ts`:

- `useChatMessages(matchId)` (linhas 759–797) — faz `SELECT` em `match_chat_messages` filtrando por `match_id`, inscreve no canal Realtime `chat:${matchId}`, ouve o evento global `supabase-data-change` e ainda faz polling a cada 5s.
- `useSendChatMessage()` (linhas 799–811) — insere a mensagem e dispara `emitChange()` para forçar o reload.

E no banco:
- `match_chat_messages` está na publicação `supabase_realtime`.
- Política de leitura: `can_access_match_realtime(match_id)` — libera dono do mandante, dono do visitante, jogadores vinculados a qualquer um dos times e usuários convocados.

## Por que então o adversário não vê as mensagens

Olhando a partida que você está testando (`/chat/1bef3c21-1774-4927-9baf-3d839ab30e76`):

```
status        = 'confirmed'
home_team_id  = SC Corinthians Paulista
away_team_id  = NULL   ← este é o problema
```

Ou seja: a partida está marcada como confirmada, **mas o `away_team_id` nunca foi gravado**. Como `can_access_match_realtime` precisa do `away_team_id` para liberar o adversário, o dono do outro time fica sem permissão de leitura do chat — e por isso só aparecem as próprias mensagens.

A causa é a política RLS de UPDATE em `matches`:

```
USING:
  (home_team owner_id = auth.uid())
  OR
  (away_team owner_id = auth.uid())
```

Quando o desafiante clica em "aceitar" (`useAcceptMatch` em `useSupabaseData.ts` linha 410), o código chama:

```ts
supabase.from("matches").update({ away_team_id: awayTeamId, status: "confirmed" }).eq("id", matchId)
```

No momento dessa UPDATE o `away_team_id` ainda é NULL, então o usuário **não é dono nem do home nem do away**. O RLS bloqueia o update sem lançar erro (PostgREST retorna 0 linhas afetadas) e o toast "Match confirmado!" aparece mesmo assim. Resultado: `away_team_id` continua NULL e o chat fica isolado para o lado mandante.

## Plano de correção

1. **Migration — política RLS para aceitar desafio.** Adicionar uma política de UPDATE em `public.matches` que permita um usuário autenticado preencher o `away_team_id` quando ele ainda for NULL, desde que ele seja dono do time que está virando visitante:

   ```sql
   CREATE POLICY "Team owner can accept open match"
   ON public.matches
   FOR UPDATE
   TO authenticated
   USING (
     away_team_id IS NULL
     AND EXISTS (SELECT 1 FROM public.teams t
                 WHERE t.owner_id = auth.uid())
   )
   WITH CHECK (
     away_team_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.teams t
                 WHERE t.id = away_team_id AND t.owner_id = auth.uid())
   );
   ```

2. **`useAcceptMatch` — detectar falha silenciosa.** Pedir `.select()` no update e, se vier 0 linhas, lançar erro com mensagem PT-BR ("Não foi possível aceitar este desafio") em vez de mostrar "Match confirmado!".

3. **Backfill da partida atual (`1bef3c21-…`).** Como ela ficou "confirmada" sem adversário, preciso de uma decisão sua: qual time deveria ser o visitante dessa partida? Posso (a) gravar manualmente o `away_team_id` correto via insert tool, ou (b) reverter o status para `open` para que o desafiante aceite de novo após a correção.

4. **Validação.** Depois do deploy: aceitar um desafio novo de outro usuário, conferir no banco que `away_team_id` foi gravado, e confirmar que o chat aparece para ambos os lados.

Nada precisa ser alterado no `useChatMessages`/`useSendChatMessage` — eles já estão corretos.
