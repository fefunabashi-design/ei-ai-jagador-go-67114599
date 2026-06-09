## Diagnóstico

O badge "1" no sino vem de `pendingSummons` (convocações de partida pendentes), mas a página `/notifications` foi definida para mostrar **apenas comunicados oficiais do app/administrador** — hoje uma lista vazia. Por isso o "1" aparece, mas a página fica sem nada.

## Solução

Desacoplar o sino das convocações. O badge deve refletir só os avisos oficiais.

### Alterações em `src/pages/Index.tsx`

1. Trocar a fonte do badge: usar uma contagem de notificações oficiais (`unreadNotifications`) no lugar de `pendingSummons`. Como ainda não existe tabela/fonte, deixar a contagem em `0` por enquanto (constante local) — o sino fica oculto enquanto não houver avisos.
2. Manter o `onClick` indo para `/notifications`.
3. Não remover `pendingSummons` — continua usado em outros pontos da Home (convocação na agenda/próximo jogo).

### Resultado

- Sem avisos oficiais → sino não aparece (sem número fantasma).
- Convocações pendentes continuam visíveis nos cards/agenda, como já é hoje.
- Quando criarmos a fonte real de avisos (tabela `notifications` ou similar), basta plugar a query em `unreadNotifications`.

## Fora de escopo

- Criar tabela/edge function de notificações oficiais.
- Mudar a página `/notifications` (continua como está).
