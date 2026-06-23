## Diagnóstico

A alteração anterior **foi feita** em `src/pages/Agenda.tsx` (linhas 746–795): o botão "Detalhes" expande mostrando as 4 opções (Detalhar adversário, Reagendar, Finalizar, Cancelar) quando `fromAdmin && isOwner && view.status === "confirmed"`.

Investigando por que você não está vendo as 4 opções, encontrei um bug na verificação de propriedade do time, na linha 654:

```tsx
const isOwner = myTeam && homeTeam?.owner_id === myTeam.owner_id;
```

Isso compara o `owner_id` do **time mandante** com o do meu time. Em partidas **fora de casa**, `homeTeam` é o adversário — então `isOwner` vira `false` e os botões Reagendar/Finalizar/Cancelar somem. Esse é o motivo mais provável de você ver "só dados do time e jogador".

O segundo ponto: o estilo do botão "Detalhes" hoje em Agenda é um botão pequeno (`h-7 px-2.5`, lado a lado com Chat), diferente do botão grande full-width amarelo de `Admin.tsx` (linhas 540–583). Vou alinhar o visual ao do Admin dentro do card de partida confirmada.

## Arquivos a editar

Só **`src/pages/Agenda.tsx`** (e nada mais — `Admin.tsx`, `MatchDetails.tsx`, `FinalizeMatchDialog.tsx` ficam como estão).

## O que vai mudar

1. **Corrigir `isOwner`** (linha 654) para validar ownership do **meu time**, não do mandante:
   ```tsx
   const isOwner = !!myTeam && myTeam.owner_id === currentUserId;
   ```
   (usando o `user.id` já disponível via `useProfile`/auth no arquivo).

2. **Reestruturar o bloco de ações do card** (linhas 730–795) para partidas confirmadas no modo admin:
   - Manter os botões pequenos atuais (Chat, Finalização quando aplicável).
   - **Remover** o botão pequeno "Detalhes" atual.
   - **Adicionar**, logo abaixo da linha de info da partida, um bloco separado por borda superior — idêntico ao de `Admin.tsx` linhas 540–583 — com:
     - Botão full-width amarelo "DETALHES" (`variant="outline" w-full h-8 text-[11px] font-semibold`) que expande/recolhe.
     - Painel expandido com as 4 opções verticais (Detalhar adversário, Reagendar partida, Finalizar partida, Cancelar partida).
   - Esse bloco só aparece quando `fromAdmin && isOwner && view.status === "confirmed" && !view.isFinalizedByMe`.

3. **Modo jogador (não-admin)**: manter o botão pequeno "Detalhes" + "Detalhar adversário" como está hoje (sem mudança de comportamento).

## Resultado esperado

```text
┌─ Card da partida (Agenda admin, status=CONFIRMADA) ─┐
│ [escudo] MEU TIME  VS  ADVERSÁRIO [escudo]          │
│ 📅 data  ⏰ hora  📍 local                          │
│ [Chat]                                              │
│ ─────────────────────────────────────────────────── │
│ [        ⌕ DETALHES         ▼ ]                     │
│   ├─ 🛡  Detalhar adversário                        │
│   ├─ 📅  Reagendar partida                          │
│   ├─ 🏆  Finalizar partida                          │
│   └─ ✖  Cancelar partida                            │
└─────────────────────────────────────────────────────┘
```

Partidas não-confirmadas (open/cancelled/completed) e a visão do jogador comum continuam sem esse bloco.

Quer que eu prossiga com essa abordagem ou prefere outro recorte (ex.: deixar o painel sempre aberto sem o toggle "DETALHES")?