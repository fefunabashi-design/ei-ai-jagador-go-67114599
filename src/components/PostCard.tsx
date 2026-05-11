import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";

export interface Post {
  id: string;
  author_id: string;
  tipo: "imagem" | "video";
  url: string;
  legenda: string | null;
  data: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const getYouTubeEmbed = (url: string): string | null => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
};

const PostCard = ({ post, currentUserId, onDeleted }: { post: Post; currentUserId?: string; onDeleted?: () => void }) => {
  const [author, setAuthor] = useState<{ display_name: string | null; nickname: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("profiles")
      .select("display_name,nickname,avatar_url")
      .eq("user_id", post.author_id)
      .maybeSingle()
      .then(({ data }) => { if (alive) setAuthor(data as any); });
    return () => { alive = false; };
  }, [post.author_id]);

  const handleDelete = async () => {
    if (!confirm("Excluir este post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (!error) onDeleted?.();
  };

  const youtube = post.tipo === "video" ? getYouTubeEmbed(post.url) : null;
  const name = author?.nickname || author?.display_name || "Jogador";
  const initials = name.slice(0, 2).toUpperCase();
  const isOwner = currentUserId && currentUserId === post.author_id;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center overflow-hidden">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-primary">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
          <p className="text-[10px] text-muted-foreground">{formatDate(post.data)}</p>
        </div>
        {isOwner && (
          <button onClick={handleDelete} aria-label="Excluir post" className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="bg-black">
        {post.tipo === "imagem" ? (
          <img src={post.url} alt={post.legenda || "Post"} className="w-full max-h-[480px] object-contain" loading="lazy" />
        ) : youtube ? (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={youtube}
              title={post.legenda || "Vídeo"}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <video src={post.url} controls preload="metadata" className="w-full max-h-[480px]" />
        )}
      </div>

      {post.legenda && (
        <p className="px-4 py-3 text-sm text-foreground/90 whitespace-pre-wrap">{post.legenda}</p>
      )}
    </div>
  );
};

export default PostCard;
