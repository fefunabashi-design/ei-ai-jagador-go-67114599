# Redesenho dos Filtros da tela Times (estilo Mercado Livre)

## Objetivo
Substituir o card grandão com todos os filtros expandidos por uma barra de **chips horizontais roláveis** no topo + um **painel "Filtros"** completo (Sheet) com categorias à esquerda e opções à direita, mantendo **todos os campos e regras de filtro atuais**. Nenhuma lógica de filtragem (`filteredTeams`, defaults, persistência em `localStorage`, hierarquias Estado→Cidade e Categoria→Subcategoria) muda.

## Referências
- Imagem 1: barra horizontal de chips (Categorias, Marca, Cor, Filtros) + atalhos rápidos ("Chegará em 3h", "Chegará hoje").
- Imagem 2: painel completo com lista vertical de grupos à esquerda, opções com toggle à direita, rodapé com "Limpar filtros" + "Ver N resultados".

## Estrutura nova (`src/pages/Times.tsx`)

### 1. Barra sticky no topo (substitui o card de filtros)
Logo abaixo do header "TIMES CADASTRADOS":

```text
[ Filtros (3) ▾ ] [ Estado: SP ✕ ] [ Cidade ▾ ] [ Categoria ▾ ] [ Modalidade ▾ ] [ Gênero ▾ ] [ Nível ▾ ] [ ♥ Favoritos ] ...
```

- Container `sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border` para acompanhar o scroll.
- Linha 1: campo de busca por nome (mantido, com autocomplete já existente).
- Linha 2: scroll horizontal (`overflow-x-auto no-scrollbar flex gap-2`) com:
  - **Botão "Filtros (N)"** sempre primeiro, fixo visualmente com `sticky left-0`, destacado em primary outline, exibindo o total de filtros ativos.
  - **Chips de atalho** para cada filtro: Estado, Cidade, Região (se aplicável), Modalidade, Gênero, Categoria, Subcategoria, Nível, Campo, Dia, Horário, Favoritos.
  - Cada chip mostra:
    - Rótulo + valor selecionado abreviado (ex.: "Estado: SP", "Categoria: Adulto +1", "Favoritos ●").
    - Quando inativo: outline neutro. Quando ativo: fundo `primary/15`, borda `primary/40`, texto `primary`, com um `✕` no fim que limpa só aquele filtro (preserva os demais).
  - Chip "Favoritos" funciona como toggle direto (não abre popover).

### 2. Popover por chip (acesso rápido)
Cada chip (exceto Favoritos) abre um `Popover` ancorado, contendo apenas o controle daquele filtro (reaproveita `MultiSelect`, `Select` de Nível/Campo, range de horário, etc.). Fecha ao clicar fora. Esse é o atalho "1 clique" para mexer num filtro sem abrir o painel grande.

### 3. Painel "Filtros" completo (`Sheet` lateral / bottom em mobile)
Acionado pelo botão "Filtros (N)". Usa o componente `Sheet` do shadcn:

- **Header**: título "Filtros" + botão fechar.
- **Body**: layout 2 colunas (em mobile: lista vertical no topo vira menu de scroll, com âncoras):
  - **Coluna esquerda** (`w-32 shrink-0 border-r border-border`): lista vertical de grupos clicáveis, item ativo com `bg-muted text-foreground font-semibold`, demais `text-muted-foreground`. Grupos:
    1. Localização (Estado, Cidade, Região)
    2. Modalidade
    3. Gênero
    4. Categoria (+ Subcategoria condicional)
    5. Nível
    6. Time com Campo
    7. Dia da Semana
    8. Horário
    9. Favoritos
  - **Coluna direita** (`flex-1 overflow-y-auto p-4 space-y-4`): renderiza só os controles do grupo selecionado, com toggles/checkboxes/inputs estilizados como na referência (linha por opção, label à esquerda, switch/check à direita quando booleano; quando lista de múltipla escolha, chips clicáveis).
- **Footer fixo** (`sticky bottom-0 border-t bg-background px-4 py-3 flex items-center gap-3`):
  - Botão `ghost` "Limpar filtros" (reseta todos os states para defaults, mesma lógica de hoje).
  - Botão primary "Ver N resultados" (mostra `filteredTeams.length` em tempo real e fecha o sheet).

### 4. Contagem de resultados
- O badge `{filteredTeams.length} times` sai do card e passa a aparecer:
  - dentro do botão "Ver N resultados" no painel,
  - num pequeno texto `N times encontrados` logo acima da lista de cards.

### 5. Lista de times (inalterada)
A lista de cards de times segue idêntica em estrutura e ações — só ganha mais respiro vertical porque os filtros já não ocupam tela inteira.

## Estado e lógica
Sem mudanças nos `useState` existentes nem em `filteredTeams`. Apenas adiciono:
- `const [filtersOpen, setFiltersOpen] = useState(false)` para o Sheet.
- `const [activeGroup, setActiveGroup] = useState<GroupKey>("localizacao")` para o grupo selecionado dentro do Sheet.
- Função `activeFiltersCount()` que conta quantos filtros estão fora do default (para o badge do botão "Filtros").
- Função `clearOne(key)` para o `✕` dos chips ativos e `clearAll()` para "Limpar filtros".

## Componentes shadcn usados (já existem)
`Sheet`, `Popover`, `Button`, `Badge`, `Input`, `Select`, `MultiSelect` (já no projeto), `Switch` (existe), `Separator`.

## Mobile-first
- Largura `1038px` atual: barra de chips em uma linha rolando horizontal.
- Em mobile (<480px): o painel "Filtros" abre como `Sheet side="bottom"` ocupando 90vh; o layout 2 colunas vira lista única scrollável com âncoras (mesma ordem de grupos).

## Fora do escopo
- Mudar os campos de filtro disponíveis.
- Mudar regras de prioridade/persistência ou defaults baseados no time do usuário.
- Tocar na seção de "Desafio sem cadastro" (mantém botão acima da lista de cards).
- Outras telas (Inicial, Agenda, Admin).
