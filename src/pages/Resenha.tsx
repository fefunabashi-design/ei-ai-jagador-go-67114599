import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImageIcon, Plus, ThumbsDown, ThumbsUp, MessageCircle, Send, Trash2, Clock, X } from "lucide-react";
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
import { useProfile, useResenhaPosts, useAppSharedImages } from "@/hooks/useSupabaseData";
import { mockDb } from "@/lib/mockDb";

const STAFF_ROLES = ["admin", "coach", "assistant_coach", "sub_coach", "tecnico", "subtecnico"];

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
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Resenha = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const { data: posts } = useResenhaPosts();
  const { data: gallery } = useAppSharedImages();

  const role = (profile?.role || "player").toLowerCase();
  const canPublish = STAFF_ROLES.includes(role);

  const [createOpen, setCreateOpen] = useState(false);
  const [pickedImage, setPickedImage] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const myUid = profile?.user_id || "mock-user-id";

  const orderedPosts = useMemo(() => posts, [posts]);

  const handlePublish = () => {
    if (!pickedImage) {
      toast({ title: "Escolha uma imagem", description: "Selecione uma imagem da galeria do App." });
      return;
    }
    mockDb.createResenhaPost({ photo_url: pickedImage, caption: caption.trim() });
    toast({ title: "Resenha publicada! 🎉" });
    setCaption("");
    setPickedImage("");
    setCreateOpen(false);
  };

  const handleReact = (postId: string, type: "like" | "dislike") => {
    mockDb.toggleResenhaReaction(postId, type);
  };

  const handleSendComment = (postId: string) => {
    const text = commentText.trim();
    if (!text) return;
    mockDb.addResenhaComment(postId, text);
    setCommentText("");
  };

  const activePost = orderedPosts.find((p) => p.id === openComments) || null;

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
            onClick={() => setCreateOpen(true)}
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
                </div>
                {isAuthor && (
                  <button
                    onClick={() => {
                      mockDb.deleteResenhaPost(post.id);
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

              <footer className="flex items-center gap-1 border-t border-border px-2 py-2">
                <button
                  onClick={() => handleReact(post.id, "like")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    liked
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ThumbsUp size={14} />
                  {(post.likes || []).length}
                </button>
                <button
                  onClick={() => handleReact(post.id, "dislike")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    disliked
                      ? "bg-destructive/15 text-destructive"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ThumbsDown size={14} />
                  {(post.dislikes || []).length}
                </button>
                <button
                  onClick={() => setOpenComments(post.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:bg-muted ml-auto"
                >
                  <MessageCircle size={14} />
                  {(post.comments || []).length}
                </button>
              </footer>
            </motion.article>
          );
        })}
      </div>

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

      {/* Comments dialog */}
      <Dialog open={!!openComments} onOpenChange={(open) => !open && setOpenComments(null)}>
        <DialogContent className="max-w-md flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Comentários</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {activePost && (activePost.comments || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Seja o primeiro a comentar.
              </p>
            )}
            {activePost &&
              (activePost.comments || []).map((c: any) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={c.author_avatar} alt={c.author_name} />
                    <AvatarFallback className="text-[10px]">{initials(c.author_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-muted/50 rounded-2xl px-3 py-2">
                    <p className="text-[11px] font-semibold text-foreground">
                      {c.author_name}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {formatRelative(c.created_at)}
                      </span>
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{c.text}</p>
                  </div>
                </div>
              ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva um comentário..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (activePost) handleSendComment(activePost.id);
                }
              }}
            />
            <Button
              size="icon"
              onClick={() => activePost && handleSendComment(activePost.id)}
              disabled={!commentText.trim()}
            >
              <Send size={16} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Resenha;
