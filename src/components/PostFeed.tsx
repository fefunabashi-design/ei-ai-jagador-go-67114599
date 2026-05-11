import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PostCard, { Post } from "./PostCard";

const PostFeed = ({ currentUserId }: { currentUserId?: string }) => {
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
    const channel = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
        setPosts((prev) => [payload.new as Post, ...prev]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, (payload) => {
        setPosts((prev) => prev.filter((p) => p.id !== (payload.old as Post).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
