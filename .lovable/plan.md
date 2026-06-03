## Objetivo
Padronizar o tamanho da fonte dos botões das telas **Início** e **Admin** para o mesmo tamanho usado nos botões da tela **Agenda** (`text-xs` / 12px).

## Telas afetadas
- `src/pages/Index.tsx` — 3 botões de estatísticas (Jogos da temporada, Gols da temporada, Lembretes)
- `src/pages/Admin.tsx` — 5 botões de atalhos administrativos (Mensalidade, Desafios, Vaquinha, Meu Time, Saldo)

## Referência
Tela **Agenda** (`src/pages/Agenda.tsx`) usa `text-xs` (12px) nos botões de filtro e ações.

## Alterações necessárias

### `src/pages/Index.tsx`
Localizar os 3 `motion.button` de estatísticas (linha ~456) e alterar o label de:
```
className="text-[8px] text-muted-foreground font-semibold leading-tight"
```
para:
```
className="text-xs text-muted-foreground font-semibold leading-tight"
```

### `src/pages/Admin.tsx`
1. **Atalhos administrativos** (linha ~600): alterar o label de:
```
className="text-[10px] text-muted-foreground font-medium text-center leading-tight"
```
para:
```
className="text-xs text-muted-foreground font-medium text-center leading-tight"
```

2. **Cards superiores** (linha ~432): alterar o label de:
```
className="text-[10px] text-muted-foreground font-medium"
```
para:
```
className="text-xs text-muted-foreground font-medium"
```

## Critérios de sucesso
- Botões da tela Início com fonte `text-xs` (12px) nos labels.
- Botões da tela Admin com fonte `text-xs` (12px) nos labels.
- Tamanho visualmente consistente com os botões da Agenda.