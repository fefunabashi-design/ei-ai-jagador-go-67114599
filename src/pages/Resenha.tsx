import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImageIcon, Plus, ThumbsDown, ThumbsUp, Send, Trash2, Clock, CornerDownRight } from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useProfile, useResenhaPosts, useAppSharedImages, useMatches, useMyTeams,
  useCreateResenhaPost, useToggleResenhaReaction, useAddResenhaComment, useDeleteResenhaPost,
  useToggleResenhaCommentReaction,
} from "@/hooks/useSupabaseData";
import { getShortTeamName } from "@/lib/teamName";

const STAFF_ROLES = ["admin", "coach", "assistant_coach", "sub_coach", "tecnico", "subtecnico"];
const STAFF_TEAM_FIELDS = [
  "admin_email", "coach_email", "assistant_coach_email", "sub1_email", "sub2_email",
  "admin_name", "coach_name", "assistant_coach_name", "sub1_name", "sub2_name",
];

const norm = (v: any) => (v || "").toString().trim().toLowerCase();

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
};

const remainingTime = (iso: string) => {
  const expiresAt = new Date(iso).getTime() + 7 * 24 * 60 * 60 * 1000;
  const left = expiresAt - Date.now();
  if (left <= 0) return "expirado";
  const days = Math.floor(left / (24 * 60 * 60 * 1000));
  const hours = Math.floor((left % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days >= 1) return `expira em ${days}d ${hours}h`;
  return `expira em ${hours}h`;
};

const initials = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const Resenha = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const { data: posts } = useResenhaPosts();
  const { data: gallery } = useAppSharedImages();
  const { data: matches } = useMatches();
  const { data: myTeams } = useMyTeams();
  const role = (profile?.role || "player").toLowerCase();
  const myEmail = norm((profile as any)?.email);
  const myName = norm((profile as any)?.display_name);
  const isTeamStaff = (myTeams || []).some((t: any) =>
    STAFF_TEAM_FIELDS.some((f) => {
      const v = norm(t?.[f]);
      if (!v) return false;
      return v === myEmail || v === myName;
    })
  );
  const canPublish = STAFF_ROLES.includes(role) || isTeamStaff;

  const [matchPickerOpen, setMatchPickerOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pickedImage, setPickedImage] = useState<string>("");
  const [caption, setCaption] = useState("");
  // Per-post comment input: { [postId]: text }
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  // Reply target per post: { [postId]: { id, name } | null }
  const [replyTarget, setReplyTarget] = useState<Record<string, { id: string; name: string } | null>>({});

  const createPost = useCreateResenhaPost();
  const toggleReaction = useToggleResenhaReaction();
  const toggleCommentReaction = useToggleResenhaCommentReaction();
  const addComment = useAddResenhaComment();
  const deletePost = useDeleteResenhaPost();

  const myUid = profile?.user_id || "mock-user-id";
  const orderedPosts = useMemo(() => posts, [posts]);

  const eligibleMatches = useMemo(() => {
    return (matches || [])
      .filter((m: any) => m.status === "confirmed" || m.status === "completed")
      .sort((a: any, b: any) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
  }, [matches]);

  const openPublishFlow = () => {
    setSelectedMatch(null);
    setPickedImage("");
    setCaption("");
    setMatchPickerOpen(true);
  };

  const handleSelectMatch = (m: any) => {
    setSelectedMatch(m);
    setMatchPickerOpen(false);
    setCreateOpen(true);
  };

  const handlePublish = async () => {
    if (!pickedImage) {
      toast({ title: "Escolha uma imagem", description: "Selecione uma imagem da galeria do App." });
      return;
    }
    const matchLabel = selectedMatch
      ? `${selectedMatch.home_team?.name || "Time"} vs ${selectedMatch.away_team?.name || "Adversário"}`
      : null;
    await createPost.mutateAsync({
      photo_url: pickedImage,
      caption: caption.trim(),
      match_id: selectedMatch?.id || null,
      match_label: matchLabel,
      team_id: (myTeams || [])[0]?.id || null,
    });
    toast({ title: "Resenha publicada! 🎉" });
    setCaption("");
    setPickedImage("");
    setSelectedMatch(null);
    setCreateOpen(false);
  };

  const handleSendComment = (postId: string) => {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    const target = replyTarget[postId] || null;
    addComment.mutate(postId, text, target?.id || null);
    setCommentDrafts((d) => ({ ...d, [postId]: "" }));
    setReplyTarget((r) => ({ ...r, [postId]: null }));
  };

  const renderCommentItem = (c: any, postId: string, isReply = false) => {
    const liked = (c.likes || []).includes(myUid);
    const disliked = (c.dislikes || []).includes(myUid);
    return (
      <div key={c.id} className={`flex gap-2 ${isReply ? "ml-8" : ""}`}>
        <Avatar className="w-7 h-7 shrink-0">
          <AvatarImage src={c.author_avatar} alt={c.author_name} />
          <AvatarFallback className="text-[10px]">{initials(c.author_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-muted/50 rounded-2xl px-3 py-2">
            <p className="text-[11px] font-semibold text-foreground">
              {c.author_name}
              <span className="font-normal text-muted-foreground"> · {formatRelative(c.created_at)}</span>
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{c.text}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-2">
            <button
              onClick={() => toggleCommentReaction.mutate(c.id, "like")}
              className={`flex items-center gap-1 text-[11px] ${liked ? "text-primary font-semibold" : "text-muted-foreground"}`}
            >
              <ThumbsUp size={12} /> {(c.likes || []).length || ""}
            </button>
            <button
              onClick={() => toggleCommentReaction.mutate(c.id, "dislike")}
              className={`flex items-center gap-1 text-[11px] ${disliked ? "text-destructive font-semibold" : "text-muted-foreground"}`}
            >
              <ThumbsDown size={12} /> {(c.dislikes || []).length || ""}
            </button>
            {!isReply && (
              <button
                onClick={() => setReplyTarget((r) => ({ ...r, [postId]: { id: c.id, name: c.author_name } }))}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
              >
                <CornerDownRight size={12} /> Responder
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center gap-3 border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-30">
        <button onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-display text-foreground">RESENHA DA VÁRZEA</h1>
          <p className="text-[10px] text-muted-foreground">Posts ficam visíveis por 7 dias</p>
        </div>
        {canPublish && (
          <Button
            size="sm"
            onClick={openPublishFlow}
            className="bg-gradient-primary text-primary-foreground border-0 h-8"
          >
            <Plus size={14} className="mr-1" /> Publicar
          </Button>
        )}
      </div>

      {/* Feed */}
      <div className="px-4 mt-4 space-y-4 max-w-xl mx-auto">
        {orderedPosts.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma resenha publicada ainda.</p>
            {canPublish && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Toque em "Publicar" para abrir a primeira resenha do time.
              </p>
            )}
          </div>
        )}

        {orderedPosts.map((post: any, idx: number) => {
          const liked = (post.likes || []).includes(myUid);
          const disliked = (post.dislikes || []).includes(myUid);
          const isAuthor = post.author_id === myUid;
          const target = replyTarget[post.id] || null;
          return (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <header className="flex items-center gap-3 p-3">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={post.author_avatar} alt={post.author_name} />
                  <AvatarFallback className="text-[11px]">{initials(post.author_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{post.author_name}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {post.team_name && <span className="truncate">{post.team_name} · </span>}
                    {formatRelative(post.created_at)} · <Clock size={10} /> {remainingTime(post.created_at)}
                  </p>
                  {post.match_label && (
                    <p className="text-[10px] text-primary font-semibold truncate mt-0.5">
                      ⚽ {post.match_label}
                    </p>
                  )}
                </div>
                {isAuthor && (
                  <button
                    onClick={() => {
                      deletePost.mutate(post.id);
                      toast({ title: "Resenha removida" });
                    }}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Excluir post"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </header>

              <div className="bg-black/40">
                <img
                  src={post.photo_url}
                  alt={post.caption || "Resenha"}
                  className="w-full max-h-[480px] object-contain"
                />
              </div>

              {post.caption && (
                <p className="px-4 py-3 text-sm text-foreground whitespace-pre-wrap">{post.caption}</p>
              )}

              {/* Inline reactions + comments */}
              <div className="px-3 pb-3 pt-1 space-y-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleReaction.mutate(post.id, "like")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      liked ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <ThumbsUp size={14} />
                    {(post.likes || []).length}
                  </button>
                  <button
                    onClick={() => toggleReaction.mutate(post.id, "dislike")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      disliked ? "bg-destructive/15 text-destructive" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <ThumbsDown size={14} />
                    {(post.dislikes || []).length}
                  </button>
                </div>

                {(post.comments || []).length > 0 && (
                  <div className="space-y-3 border-t border-border/60 pt-3">
                    {(post.comments || []).map((c: any) => (
                      <div key={c.id} className="space-y-2">
                        {renderCommentItem(c, post.id, false)}
                        {(c.replies || []).map((r: any) => renderCommentItem(r, post.id, true))}
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-border/60 pt-3">
                  {target && (
                    <div className="flex items-center justify-between bg-muted/40 rounded-md px-2 py-1 mb-2">
                      <span className="text-[11px] text-muted-foreground">
                        Respondendo a <span className="text-foreground font-semibold">{target.name}</span>
                      </span>
                      <button
                        onClick={() => setReplyTarget((r) => ({ ...r, [post.id]: null }))}
                        className="text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      value={commentDrafts[post.id] || ""}
                      onChange={(e) => setCommentDrafts((d) => ({ ...d, [post.id]: e.target.value }))}
                      placeholder={target ? `Responder a ${target.name}...` : "Escreva um comentário..."}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendComment(post.id);
                        }
                      }}
                      className="h-9 text-sm"
                    />
                    <Button
                      size="icon"
                      onClick={() => handleSendComment(post.id)}
                      disabled={!(commentDrafts[post.id] || "").trim()}
                      className="h-9 w-9"
                    >
                      <Send size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Match picker dialog */}
      <Dialog open={matchPickerOpen} onOpenChange={setMatchPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Publicar resenha</DialogTitle>
            <DialogDescription>
              Escolha a partida sobre a qual você quer publicar. Apenas partidas confirmadas e
              finalizadas aparecem aqui.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {eligibleMatches.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma partida confirmada ou finalizada disponível.
              </p>
            )}
            {eligibleMatches.map((m: any) => {
              const date = new Date(m.match_date);
              const isFinished = m.status === "completed";
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectMatch(m)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {m.home_team?.name || "Time"} vs {m.away_team?.name || "Adversário"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {date.toLocaleDateString("pt-BR")} ·{" "}
                      {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                      isFinished ? "bg-muted text-muted-foreground" : "bg-success/15 text-success"
                    }`}
                  >
                    {isFinished ? "Finalizada" : "Confirmada"}
                  </span>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchPickerOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova resenha</DialogTitle>
            <DialogDescription>
              Escolha uma imagem já compartilhada no App. Não é permitido enviar arquivos do
              dispositivo nem usar a câmera.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {selectedMatch && (
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Partida</p>
                <p className="text-sm font-semibold text-foreground">
                  {selectedMatch.home_team?.name || "Time"} vs{" "}
                  {selectedMatch.away_team?.name || "Adversário"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(selectedMatch.match_date).toLocaleDateString("pt-BR")} ·{" "}
                  {new Date(selectedMatch.match_date).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <ImageIcon size={12} /> Imagens compartilhadas
              </p>
              {gallery.length === 0 ? (
                <div className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">
                  Ainda não há imagens compartilhadas no App. Publique fotos pelo módulo de Fotos
                  do time para usá-las aqui.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto">
                  {gallery.map((img: any) => {
                    const selected = pickedImage === img.url;
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setPickedImage(img.url)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selected ? "border-primary ring-2 ring-primary/40" : "border-border"
                        }`}
                      >
                        <img src={img.url} alt={img.label || "Imagem"} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Comentário (opcional)
              </p>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Conte a resenha..."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePublish} disabled={!pickedImage}>
              Publicar resenha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Resenha;
