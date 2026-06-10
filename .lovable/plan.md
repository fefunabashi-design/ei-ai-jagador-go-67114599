## Corrigir exibição "Domingo 09:30, Quarta 21:30" nos cards de Times

### Causa do problema
O código em `src/pages/Times.tsx` (linhas 962–986) já está pronto para montar a string por dia (`Domingo 09:30, Quarta 21:30`) a partir de `team.play_schedule`.

Porém os times são carregados a partir da view `public_teams` (linha 218), e essa view **não expõe a coluna `play_schedule`**. Hoje a view só tem `play_days`, `play_time_start`, `play_time_end`.

Resultado: `team.play_schedule` chega como `undefined`, `hasPerDaySchedule` é `false` e o card cai no fallback antigo (`Domingo, Quarta · 09:30 até 21:30`), em vez de mostrar por dia.

Confirmei no banco que o SC Corinthians Paulista tem o `play_schedule` salvo corretamente em `teams`:
`{"quarta": {"start": "21:30", ...}, "domingo": {"start": "09:30", ...}}`.

### Mudança proposta

1. **Migração** — recriar a view `public_teams` adicionando a coluna `play_schedule` (jsonb), mantendo todas as outras colunas exatamente como estão. Sem alterar grants/RLS (a view herda do dono e dos privilégios já existentes; só vamos `CREATE OR REPLACE VIEW`).

2. **Nenhuma mudança em código frontend** — a lógica já existente em `Times.tsx` passa a funcionar imediatamente assim que `play_schedule` chega no payload.

### Resultado esperado no card
- Time com horários iguais para todos os dias → segue mostrando `Domingo, Quarta · 09:30 até 21:30` (fallback).
- Time com horários diferentes por dia (caso do Corinthians) → passa a mostrar `Domingo 09:30, Quarta 21:30`.

### Fora de escopo
- Sem alterar schema da tabela `teams`.
- Sem mexer em RLS, em outras views ou em outras telas.
