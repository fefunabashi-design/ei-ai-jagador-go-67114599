import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PostCard, { Post } from "./PostCard";

const PostFeed = ({ currentUserId, refreshSignal = 0 }: { currentUserId?: string; refreshSignal?: number }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} currentUserId={currentUserId} onDeleted={load} />
      ))}
    </div>
  );
};

export default PostFeed;
