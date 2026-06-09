## Decisão

O botão **Lembretes** no Início mostra **apenas as inadimplências do jogador logado** — é o comportamento já implementado na última alteração. Inadimplências de outros jogadores (como Kazu) **não** devem aparecer aí; quem precisa ver isso é o admin do time, na tela de **Mensalidades** (dentro do Admin).

## O que será feito

Nada no código. A implementação atual em `src/pages/Index.tsx` (filtro `.eq("user_id", profile.user_id)` no carregamento dos jogadores para Lembretes) já corresponde à regra confirmada.

## Onde ver as inadimplências do Kazu

- Menu **Admin → Mensalidades** continua mostrando todos os jogadores do time (inclui Kazu) com os meses em aberto, usando o nome social.
- O card de Lembretes no Início é pessoal e não vai listar Kazu para o dono do time.

Se quiser que o dono do time também veja um resumo das inadimplências do time inteiro no Início, posso adicionar uma seção separada "Inadimplências do time" visível apenas para owners — me avise para eu replanejar.
