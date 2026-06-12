# Reorganizar tela do Admin

## Mudanças em `src/pages/Admin.tsx`

### 1. Adicionar botão "Artilharia" em `quickActions` (linha ~462)
Incluir um terceiro/quarto atalho apontando para a rota `/ranking` (página já existente que mostra a artilharia do time), usando o ícone `Trophy`:

```ts
{ icon: Trophy, label: "Artilharia", path: "/ranking" },
```

### 2. Remover o card "ARTILHARIA · NOME DO TIME" (linhas 733–754)
Apagar o bloco `topScorers.length > 0 && (...)` da tela do Admin. A artilharia passa a ser vista exclusivamente pelo novo botão (página `/ranking`).

Como o cálculo de artilharia (`teamGoalEvents`, `goalsByPlayer`, `topScorers`) só era usado nesse card, também removerei o `useQuery` e os derivados (linhas 261–288) para não fazer fetch desnecessário.

### 3. Esconder "PEDIDOS DE MATCH RECEBIDOS" (linhas 676–731)
Remover o bloco `pendingRequests.length > 0 && (...)` da tela do Admin. Esses pedidos continuam visíveis no botão **Desafios** (que já existe em `quickActions` com badge `totalChallenges` e lista os `receivedChallenges`).

A variável `pendingRequests` e o handler `handleAccept`/`handleDecline` ficam apenas se ainda forem usados em outro lugar; caso contrário, removo também.

## Fora de escopo
- Não altero a página `/ranking` nem `/desafios`.
- Não mexo em estilos ou em outras seções do Admin (KPIs, próxima partida, busca de adversário, etc.).
