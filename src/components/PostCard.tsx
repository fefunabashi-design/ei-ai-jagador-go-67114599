import { useEffect, useRef, useState } from "react";
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

const getInstagramEmbed = (url: string): string | null => {
  if (!/instagram\.com\/(p|reel|tv)\//i.test(url)) return null;
  return `${url.split("?")[0].replace(/\/$/, "")}/embed`;
};

const PostCard = ({
  post,
  currentUserId,
  onDeleted,
  isActive = true,
  onPlayingChange,
}: {
  post: Post;
  currentUserId?: string;
  onDeleted?: () => void;
  isActive?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}) => {
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
    if (!error) {
      window.dispatchEvent(new CustomEvent("posts-feed-change"));
      onDeleted?.();
    } else {
      alert(error.message);
    }
  };

  const youtube = post.tipo === "video" ? getYouTubeEmbed(post.url) : null;
  const instagram = post.tipo === "video" ? getInstagramEmbed(post.url) : null;
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
          <EmbedFrame
            src={youtube}
            title={post.legenda || "Vídeo"}
            isActive={isActive}
            onPlayingChange={onPlayingChange}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ratio
          />
        ) : instagram ? (
          <EmbedFrame
            src={instagram}
            title={post.legenda || "Instagram"}
            isActive={isActive}
            onPlayingChange={onPlayingChange}
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          />
        ) : (
          <AutoplayVideo src={post.url} isActive={isActive} onPlayingChange={onPlayingChange} />
        )}
      </div>

      {post.legenda && (
        <p className="px-4 py-3 text-sm text-foreground/90 whitespace-pre-wrap">{post.legenda}</p>
      )}
    </div>
  );
};

const EmbedFrame = ({
  src,
  title,
  isActive,
  onPlayingChange,
  allow,
  ratio = false,
}: {
  src: string;
  title: string;
  isActive: boolean;
  onPlayingChange?: (playing: boolean) => void;
  allow: string;
  ratio?: boolean;
}) => {
  // For embeds we can't detect playback; treat as "playing" only while visible/active
  // and force a remount when leaving so the embedded player stops.
  useEffect(() => {
    onPlayingChange?.(isActive);
    return () => onPlayingChange?.(false);
  }, [isActive]);

  if (!isActive) {
    return (
      <div className={ratio ? "relative w-full" : "relative w-full min-h-[560px] bg-background"} style={ratio ? { paddingBottom: "56.25%" } : undefined}>
        <div className="absolute inset-0 bg-black" />
      </div>
    );
  }

  return (
    <div className={ratio ? "relative w-full" : "relative w-full min-h-[560px] bg-background"} style={ratio ? { paddingBottom: "56.25%" } : undefined}>
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 w-full h-full"
        allow={allow}
        allowFullScreen
      />
    </div>
  );
};

const AutoplayVideo = ({
  src,
  isActive,
  onPlayingChange,
}: {
  src: string;
  isActive: boolean;
  onPlayingChange?: (playing: boolean) => void;
}) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!isActive) {
      el.pause();
      el.currentTime = 0;
      onPlayingChange?.(false);
    }
  }, [isActive]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onPlay = () => onPlayingChange?.(true);
    const onPause = () => onPlayingChange?.(false);
    const onEnded = () => onPlayingChange?.(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      onPlayingChange?.(false);
    };
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      controls
      muted
      playsInline
      preload="metadata"
      className="w-full max-h-[480px]"
    />
  );
};

export default PostCard;
