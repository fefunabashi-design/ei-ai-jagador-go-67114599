# Plano: Feed de Mídia Dinâmico no Dashboard

## Visão geral
Criar um feed público global ("Posts") visível na tela inicial (`/dashboard`), onde qualquer usuário logado pode publicar imagem ou vídeo (upload ou URL externa) com legenda. Os novos posts aparecem automaticamente em tempo real, sem refresh.

A coleção `Posts` será uma nova tabela no backend (Lovable Cloud). No futuro, o plano mensal de publicidade pode ser exigido — por enquanto a publicação fica liberada para todos os usuários autenticados.

---

## 1. Backend (banco de dados + storage)

**Nova tabela `posts`** com:
- `tipo` — texto: `"imagem"` ou `"video"`
- `url` — texto (link da mídia, seja do storage ou externo)
- `legenda` — texto opcional
- `data` — timestamp de criação
- `author_id` — vínculo ao usuário que criou (necessário para RLS)

**Regras de acesso (RLS):**
- Visualizar: qualquer pessoa (público).
- Criar: qualquer usuário autenticado (`author_id = usuário logado`).
- Editar/excluir: apenas o autor do post.

**Storage:**
- Novo bucket público `post-media` para uploads de imagens e vídeos.
- Políticas: leitura pública; upload restrito ao próprio usuário autenticado.

**Realtime:**
- Habilitar realtime na tabela `posts` para que novos posts apareçam instantaneamente no feed.

---

## 2. Frontend

### Componentes novos
- `src/components/PostCard.tsx` — card que renderiza imagem (`<img>`) ou vídeo (`<video controls>`), legenda, data formatada em PT-BR e nome/avatar do autor.
- `src/components/PostFeed.tsx` — lista os posts ordenados pela data (mais recentes primeiro), com loading skeleton e estado vazio. Assina realtime para atualizar automaticamente.
- `src/components/AddPostDialog.tsx` — modal disparado pelo botão **"+ Adicionar Post"**, com:
  - Select **Tipo**: Imagem / Vídeo
  - Toggle **Origem da mídia**: Upload do dispositivo / Colar URL
  - Campo de upload (`<input type="file">` filtrado por tipo) **OU** input de URL
  - Textarea **Legenda** (opcional)
  - Botão **Publicar** que faz o upload (se aplicável) e insere a linha em `posts`.

### Integração no Dashboard
Em `src/pages/Index.tsx`, adicionar uma nova seção **"Feed da Comunidade"** abaixo do conteúdo atual, contendo:
- Cabeçalho com título e botão **"+ Adicionar Post"** (visível para qualquer usuário logado).
- `<PostFeed />`.

### Bindings principais
- `PostFeed` faz `select` em `posts` ordenado por `data desc`, e usa um canal Realtime (`postgres_changes` em `posts`) para anexar novos posts ao topo.
- `AddPostDialog` faz: (1) opcional `supabase.storage.from('post-media').upload(...)` → pega `publicUrl`; (2) `supabase.from('posts').insert({ tipo, url, legenda, author_id })`.
- Ao concluir, fecha o modal e mostra toast PT-BR ("Post publicado!"). Como o Realtime está ligado, o feed atualiza sozinho.

---

## 3. Validações e UX
- Limite de tamanho de upload (ex.: 25 MB) com mensagem de erro clara.
- Validação de URL externa (precisa começar com `http`).
- Vídeos externos do YouTube/Instagram em URL serão renderizados como link/embed simples (apenas `<video>` para arquivos diretos; URLs do YouTube serão tratadas com um `<iframe>` básico se detectado domínio).
- Mensagens e labels em PT-BR, seguindo o tema escuro com verde menta e dourado.

---

## 4. Detalhes técnicos (referência)

```text
Tabela: public.posts
  id           uuid PK default gen_random_uuid()
  author_id    uuid not null  -- referência ao usuário logado
  tipo         text not null check in ('imagem','video')
  url          text not null
  legenda      text
  data         timestamptz not null default now()
  created_at   timestamptz default now()

RLS:
  SELECT: true (público)
  INSERT: auth.uid() = author_id
  UPDATE/DELETE: auth.uid() = author_id

Storage bucket: post-media (public)
  policies: leitura pública; insert/update/delete somente pelo dono (auth.uid() = owner)

Realtime:
  ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
```

---

## Fora do escopo (sugestões para depois)
- Plano mensal de publicidade (paywall para postar) — pode ser adicionado depois bloqueando o botão para quem não tem assinatura ativa.
- Curtidas, comentários e compartilhamento.
- Moderação/denúncia de posts.
- Integração nativa de embeds de YouTube/Instagram com preview rico.
