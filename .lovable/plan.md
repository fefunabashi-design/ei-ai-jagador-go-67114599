# Corrigir clique no calendário da Agenda

## Problema
No modo Calendário da Agenda, clicar em uma data sem jogo abre o diálogo de "criar partida". Não deve abrir nada.

## Mudança em `src/pages/Agenda.tsx` (linhas ~588-605)

Remover o `else` que chama `setNewDate(...)` + `setCreateOpen(true)`. O `onDateClick` passará a só abrir os detalhes quando houver partida(s) naquela data; caso contrário, não faz nada.

```tsx
onDateClick={(date, dateMatches) => {
  if (dateMatches.length === 0) return;
  const match = myMatches.find((m) => {
    const mDate = new Date(m.match_date);
    return (
      mDate.getDate() === date.getDate() &&
      mDate.getMonth() === date.getMonth() &&
      mDate.getFullYear() === date.getFullYear()
    );
  });
  if (match) openDetails(match, "details");
}}
```

## Fora de escopo
- Botão/fluxo de criar partida existente (continua disponível pelos outros caminhos).
- Estilo das datas no calendário.
