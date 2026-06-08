## Objetivo

Adicionar um botão **Agenda** no Painel Admin e personalizar o nome do menu e o título da tela com o primeiro nome do time ativo do admin.

## Mudanças

### 1. `src/pages/Admin.tsx` — Novo atalho "Agenda"

No bloco **Atalhos administrativos** (`quickActions`), adicionar uma nova entrada antes/junto das existentes (Mensalidade, Desafios, Vaquinha):

- Ícone: `CalendarDays` (já importado)
- Label dinâmico: `Agenda {primeiroNome}` — onde `primeiroNome` vem de `myTeam.name.split(" ")[0]`. Se não houver time ativo, usar apenas `Agenda`.
- `path: "/agenda"`

O grid muda de `grid-cols-3` para `grid-cols-2` (ou mantém `grid-cols-3` com 4 itens em duas linhas) para acomodar o novo botão sem quebrar o layout — manter `grid-cols-3` é mais simples e consistente.

### 2. `src/pages/Agenda.tsx` — Título dinâmico

Na linha do `<h1>` da tela:

```tsx
<h1 className="text-4xl text-foreground font-display">AGENDA</h1>
```

Trocar por:

```tsx
<h1 className="text-4xl text-foreground font-display">
  AGENDA{myTeam?.name ? ` ${myTeam.name.split(" ")[0].toUpperCase()}` : ""}
</h1>
```

Isso garante que o título da tela reflete o time ativo (mesmo dado já usado no Admin via `useMyTeam`), seja quando acessada via bottom nav ou via novo botão no Admin.

## Fora do escopo

- Não altera o label "Agenda" do `BottomNav` (o pedido fala do "menu" do Admin; o botão do bottom nav continua "Agenda" para manter consistência mobile). Se quiser que o bottom nav também mostre o nome do time, basta avisar.
