import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, MoreHorizontal, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useMatchSummons } from "@/hooks/useSupabaseData";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ChatPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch match info
  const { data: match } = useQuery({
    queryKey: ["match-detail", matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const { data, error } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(name, abbreviation), away_team:teams!matches_away_team_id_fkey(name, abbreviation)")
        .eq("id", matchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from("match_chat_messages")
        .select("*, profile:profiles!match_chat_messages_user_id_fkey(display_name, avatar_url)")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  // Fetch summons for confirmation status
  const { data: summons = [] } = useMatchSummons(matchId);

  // Realtime subscription
  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`chat-${matchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_chat_messages", filter: `match_id=eq.${matchId}` },
        () => { queryClient.invalidateQueries({ queryKey: ["chat-messages", matchId] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId, queryClient]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !matchId || !profile) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("match_chat_messages").insert({
      match_id: matchId,
      user_id: user.id,
      message: message.trim(),
    });
    setMessage("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const homeTeam = match?.home_team as any;
  const awayTeam = match?.away_team as any;
  const matchDate = match ? new Date(match.match_date) : null;

  // Confirmation summary
  const confirmed = summons.filter((s: any) => s.status === "confirmed");
  const pending = summons.filter((s: any) => s.status === "pending");
  const declined = summons.filter((s: any) => s.status === "declined");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={20} className="text-muted-foreground" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield size={14} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {homeTeam?.name || "???"} × {awayTeam?.name || "???"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {summons.length} participantes · {match?.location}
            </p>
          </div>
          <button><MoreHorizontal size={18} className="text-muted-foreground" /></button>
        </div>
      </div>

      {/* Match info banner */}
      {match && (
        <div className="bg-secondary/50 px-4 py-2 text-center border-b border-border">
          <p className="text-[10px] text-muted-foreground">
            ⚽ {homeTeam?.name} × {awayTeam?.name || "???"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {matchDate?.toLocaleDateString("pt-BR", { weekday: "long" })} · {matchDate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {match.location}
          </p>
          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
            match.status === "confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          }`}>
            {match.status === "confirmed" ? "Confirmado" : "Aberto"}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* System: chat created */}
        <div className="text-center">
          <span className="text-[10px] text-muted-foreground bg-secondary px-3 py-1 rounded-full">
            🏟️ Chat da partida criado
          </span>
        </div>

        {/* Confirmation summary card */}
        {summons.length > 0 && (
          <div className="bg-secondary/80 rounded-xl p-3 border border-border/50 text-xs">
            <p className="font-semibold text-foreground mb-1">✅ CONFIRMAÇÃO — {homeTeam?.name?.toUpperCase()}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
              {confirmed.map((s: any) => (
                <span key={s.id} className="text-success">{s.player?.name?.split(" ")[0]} ✓</span>
              ))}
              {pending.map((s: any) => (
                <span key={s.id} className="text-warning">{s.player?.name?.split(" ")[0]} ?</span>
              ))}
              {declined.map((s: any) => (
                <span key={s.id} className="text-destructive">{s.player?.name?.split(" ")[0]} ✗</span>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg: any) => {
          const isMe = msg.user_id === profile?.user_id;
          const senderProfile = msg.profile as any;
          const senderName = senderProfile?.display_name || "Usuário";
          const initials = getInitials(senderName);
          const time = new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

          if (msg.message_type === "system") {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-[10px] text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                  {msg.message}
                </span>
              </div>
            );
          }

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
            >
              {!isMe && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {senderProfile?.avatar_url ? (
                    <img src={senderProfile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : initials}
                </div>
              )}
              <div className={`max-w-[75%] ${isMe ? "items-end" : ""}`}>
                {!isMe && (
                  <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">{senderName}</p>
                )}
                <div className={`rounded-2xl px-3 py-2 ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border rounded-bl-md"
                }`}>
                  <p className="text-sm">{msg.message}</p>
                </div>
                <p className={`text-[9px] text-muted-foreground mt-0.5 ${isMe ? "text-right" : ""}`}>
                  {time} {isMe && "✓✓"}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mensagem..."
            className="bg-secondary border-border flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            size="icon"
            className="bg-gradient-primary text-primary-foreground border-0 shrink-0"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
