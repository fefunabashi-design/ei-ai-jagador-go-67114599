Plano para corrigir o local exibido nos cards:

1. Ajustar `getFieldDisplayName` em `src/lib/matchView.ts`
   - Remover a dependência de `home_team.field_name` para exibição dos cards.
   - Usar sempre `match.location` como fonte principal, pois é onde fica salvo o campo escolhido no desafio: arena do adversário ou outro campo digitado.
   - Extrair só o nome do campo antes do endereço, aceitando os formatos usados no app:
     - `Nome da Arena — Endereço`
     - `Nome do Campo - Endereço`
     - `Nome do Campo, Endereço`
     - `Nome do Campo · Endereço`
   - Se não houver separador, mostrar o próprio `match.location`.

2. Corrigir comentário/documentação do helper
   - Atualizar o comentário para deixar claro que os cards não devem usar sede/arena do time mandante como fallback.

3. Validar usos existentes
   - Como `Desafios`, `Agenda`, `Match`, `MatchDetails` e Home usam esse helper, a correção passa a valer para todos os cards que mostram local da partida.
   - Não alterar a lógica de criação do desafio nem trocar mandante/visitante; apenas corrigir a forma de exibir o local salvo.