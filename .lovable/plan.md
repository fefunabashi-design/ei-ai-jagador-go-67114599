# Modal fullscreen de fotos — Jogadores adversários

Adicionar visualização em tela cheia das fotos dos jogadores na aba "Jogadores" de `src/pages/OpponentDetails.tsx`, com zoom (pinch/double-tap/botões) e navegação entre fotos (swipe e setas).

## Comportamento

- Clicar no avatar de um jogador (na lista da aba Jogadores) abre um modal fullscreen.
- Apenas jogadores **com foto** entram na lista navegável do modal. Jogadores sem avatar continuam mostrando o fallback com inicial, mas não são clicáveis.
- Header do modal: nome do jogador atual + contador "X / N" + botão fechar (X).
- Navegação:
  - Setas laterais (◀ ▶) em desktop.
  - Swipe horizontal em mobile.
  - Teclado: ←, →, Esc.
  - Loop opcional: não — para nas extremidades (botões desabilitados nas pontas).
- Zoom:
  - Pinch-to-zoom no mobile.
  - Double-tap/double-click alterna entre 1x e 2.5x no ponto tocado.
  - Botões "+" e "−" no canto inferior, com botão "Reset".
  - Pan (arrastar) quando estiver com zoom > 1.
  - Ao trocar de foto, o zoom reseta para 1x.
- Fundo preto, foto centralizada com `object-contain`, ocupando viewport inteira.

## Implementação técnica

- Reusar `Dialog` de `src/components/ui/dialog.tsx` com `DialogContent` customizado: `max-w-none w-screen h-screen p-0 bg-black border-0 rounded-none` e sem overlay translúcido (override para `bg-black`).
- Estado local em `OpponentDetails`:
  - `viewerIndex: number | null` — índice na lista filtrada de jogadores com foto.
  - Lista derivada `photoPlayers = activePlayers.filter(p => p.user_id && avatarMap[p.user_id])`.
- Componente novo `src/components/PlayerPhotoViewer.tsx`:
  - Props: `open`, `players` (com `display`, `avatarUrl`), `index`, `onIndexChange`, `onClose`.
  - Estado interno: `scale`, `tx`, `ty` (translate) para zoom/pan; reseta no change de `index`.
  - Gestos: handlers de `pointerdown/move/up` para pan + pinch (2 pointers) calculando distância; double-click toggle.
  - Swipe: quando `scale === 1`, deltaX > threshold dispara prev/next.
  - Atalhos: `useEffect` com listener de `keydown` global enquanto aberto.
- Acessibilidade: `DialogTitle` visualmente oculto com nome do jogador (sr-only) para satisfazer Radix.
- Mobile-first, `touch-action: none` na área da imagem para evitar scroll da página durante gestos.

## Fora do escopo

- Não altera a aba "Dados do Time", `Agenda.tsx`, `MatchDetails.tsx`, nem o upload de fotos.
- Não muda o tamanho/estilo atual dos avatars na lista.
- Não adiciona carregamento de fotos de jogadores convidados sem `user_id`.
