# Restringir "Reagendar/Cancelar" à agenda do time

## Mudança em `src/pages/Agenda.tsx` (linha ~724)

Adicionar `fromAdmin &&` na condição que renderiza os botões "Reagendar partida" e "Cancelar partida" dentro do bloco expandido do card:

```tsx
{fromAdmin && isOwner && view.status !== "cancelled" && !view.isFinalizedByMe && (
  <>
    {/* Reagendar / Cancelar */}
  </>
)}
```

Assim, na Agenda pessoal do usuário (acesso fora do Admin), o card mostra apenas Chat, Detalhes e "Detalhar adversário". Os botões de gestão da partida só aparecem quando a Agenda é aberta a partir do Admin do time (`fromAdmin === true`).

## Fora de escopo
- Sem mudanças em RLS, schema ou outras telas.
- Outros botões (Chat, Detalhes, Finalização) permanecem como estão.
