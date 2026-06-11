# Refazer status da Agenda

## Mudanças em `src/pages/Agenda.tsx`

1. **Remover filtros "Próximas" e "Passadas"** do seletor de status.
   - Atualizar `FilterType` para: `"all" | "open" | "confirmed" | "completed" | "cancelled"`.
   - Atualizar `filterOptions` para conter apenas: Todas, Aberto, Confirmado, Finalizado, Cancelado.

2. **Padrão ao abrir a Agenda: "Confirmado"**.
   - `useState<FilterType>("confirmed")` (mantendo override por `focusMatchId` se aplicável — também passa a abrir em `confirmed`).
   - Ajustar o `useEffect` de `focusMatchId` para `setFilter("confirmed")`.

3. **Lógica de filtragem** (`filtered`): remover os `case "upcoming"` e `case "past"`. Os demais (`open`, `confirmed`, `completed`, `cancelled`, `all`) continuam como hoje, baseados em `getMatchView(m, myTeam?.id).status`.

4. **Limpeza**: remover `statusLabels.past` e `statusStyles.past` se não forem mais usados em outros pontos do arquivo (verificar usos antes de remover).

## Fora de escopo
- Sem mudanças de schema, RLS ou em outras telas.
- Sem alteração no ciclo de vida da partida (open/confirmed/completed/cancelled permanecem como estão).
