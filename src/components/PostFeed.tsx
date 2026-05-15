import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PostCard, { Post } from "./PostCard";

const PostFeed = ({ currentUserId, refreshSignal = 0 }: { currentUserId?: string; refreshSignal?: number }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  const load = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("data", { ascending: false })
      .limit(50);
    setPosts((data as Post[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener("posts-feed-change", refresh);
    const channel = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        load();
      })
      .subscribe();
    return () => {
      window.removeEventListener("posts-feed-change", refresh);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (refreshSignal > 0) load();
  }, [refreshSignal]);

  // Auto-advance every 3s — paused while a video is playing
  useEffect(() => {
    if (posts.length <= 1) return;
    if (playingId) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % posts.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, [posts.length, playingId]);

  // When user moves manually, ensure no leftover playing flag from a different post
  useEffect(() => {
    setPlayingId((prev) => (prev && posts[index]?.id !== prev ? null : prev));
  }, [index, posts]);

  // Reset index if posts shrink
  useEffect(() => {
    if (index >= posts.length) setIndex(0);
  }, [posts.length, index]);

  // Scroll track when index changes
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const child = track.children[index] as HTMLElement | undefined;
    if (child) {
      track.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
    }
  }, [index]);

  // Detect manual scroll to update index
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const children = Array.from(track.children) as HTMLElement[];
        let closestIdx = 0;
        let closestDist = Infinity;
        const center = track.scrollLeft + track.clientWidth / 2;
        children.forEach((c, i) => {
          const cCenter = c.offsetLeft + c.clientWidth / 2;
          const d = Math.abs(cCenter - center);
          if (d < closestDist) { closestDist = d; closestIdx = i; }
        });
        setIndex((cur) => (cur !== closestIdx ? closestIdx : cur));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [posts.length]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <p className="text-sm text-muted-foreground">Nenhum post ainda. Seja o primeiro a publicar!</p>
      </div>
    );
  }

  return (
    <div
      className="space-y-2"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onTouchStart={() => { pausedRef.current = true; }}
      onTouchEnd={() => { pausedRef.current = false; }}
    >
      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar -mx-4 px-4"
        style={{ scrollbarWidth: "none" }}
      >
        {posts.map((p, i) => (
          <div key={p.id} className="snap-center shrink-0 w-full">
            <PostCard
              post={p}
              currentUserId={currentUserId}
              onDeleted={load}
              isActive={i === index}
              onPlayingChange={(playing) => {
                setPlayingId((prev) => {
                  if (playing) return p.id;
                  return prev === p.id ? null : prev;
                });
              }}
            />
          </div>
        ))}
      </div>
      {posts.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-1">
          {posts.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Ir para post ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PostFeed;
