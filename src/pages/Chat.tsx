import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, MoreHorizontal, Shield, Pencil, Eye, UserCheck, ListChecks, Check, X, Flag, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type MatchEvent = {
  id: string;
  type: "goal" | "own_goal" | "yellow" | "red";
  player_id: string;
};
import { mockDb } from "@/lib/mockDb";
import { useProfile, useMatchSummons, usePlayers, useMyTeam } from "@/hooks/useSupabaseData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ChatPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: myTeam } = useMyTeam();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: match } = useQuery({
    queryKey: ["match-detail", matchId],
    queryFn: async () => (matchId ? mockDb.getMatch(matchId) : null),
    enabled: !!matchId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", matchId],
    queryFn: async () => (matchId ? mockDb.getMessages(matchId) : []),
    enabled: !!matchId,
  });

  const { data: summons = [] } = useMatchSummons(matchId);

  const homeTeam = match?.home_team as any;
  const awayTeam = match?.away_team as any;
  const matchDate = match ? new Date(match.match_date) : null;

  // Players of home team for the roster (presence dialog)
  const { data: teamPlayers = [] } = usePlayers(homeTeam?.id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !matchId) return;
    setSending(true);
    mockDb.addMessage(matchId, message.trim());
    queryClient.invalidateQueries({ queryKey: ["chat-messages", matchId] });
    setMessage("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Permission: only Admin / Coach / Sub-Coach can "Escalar Time".
  // Plain players cannot. Owner of the home team is always allowed.
  const role = (profile?.role || "player").toLowerCase();
  const isStaff = ["admin", "coach", "assistant_coach", "sub_coach", "tecnico", "subtecnico"].includes(role);
  const isHomeOwner = !!(myTeam && homeTeam?.id === myTeam.id && myTeam.owner_id === profile?.user_id);
  const canScheduleLineup = isHomeOwner || isStaff;

  // Roster + statuses
  const summonByPlayerId = new Map(summons.map((s: any) => [s.player_id, s]));
  const roster = teamPlayers.map((p: any) => {
    const s: any = summonByPlayerId.get(p.id);
    return { player: p, status: (s?.status as "confirmed" | "declined" | "pending") || "pending", summon: s };
  });
  const confirmedRoster = roster.filter((r) => r.status === "confirmed");
  const declinedRoster = roster.filter((r) => r.status === "declined");
  const pendingRoster = roster.filter((r) => r.status === "pending");

  const myPlayerForPresence = teamPlayers.find((p: any) => p.user_id === profile?.user_id);
  const myCurrentStatus = myPlayerForPresence
    ? (summonByPlayerId.get(myPlayerForPresence.id) as any)?.status as "confirmed" | "declined" | undefined
    : undefined;

  const handlePresence = (status: "confirmed" | "declined") => {
    if (!matchId) return;
    if (!myPlayerForPresence) {
      toast({ title: "Você não está vinculado a este time", variant: "destructive" });
      return;
    }
    const existing: any = summonByPlayerId.get(myPlayerForPresence.id);
    if (existing) {
      mockDb.respondSummon(existing.id, status);
    } else {
      const created = mockDb.createSummons([
        { match_id: matchId, player_id: myPlayerForPresence.id, status: "pending" },
      ])[0];
      if (created) mockDb.respondSummon(created.id, status);
    }
    window.dispatchEvent(new CustomEvent("mock-db-change"));
    queryClient.invalidateQueries({ queryKey: ["match-summons", matchId] });
    toast({ title: status === "confirmed" ? "Presença confirmada! ✅" : "Ausência registrada" });
    setConfirmOpen(false);
  };

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
              Detalhes da partida · {match?.location}
            </p>
          </div>
          <button><MoreHorizontal size={18} className="text-muted-foreground" /></button>
        </div>
      </div>

      {/* Match info banner */}
      {match && (
        <div className="bg-secondary/50 px-4 py-2 text-center border-b border-border">
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

      {/* Action buttons */}
      <div className="px-4 py-3 border-b border-border bg-background space-y-2">
        {canScheduleLineup && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => navigate(`/escalacao?matchId=${matchId}`)}
              className="bg-gradient-primary text-primary-foreground border-0 font-semibold h-10"
            >
              <Pencil size={14} className="mr-1" /> ESCALAR TIME
            </Button>
            <Button
              onClick={() => {
                setHomeScore(String(match?.home_score ?? ""));
                setAwayScore(String(match?.away_score ?? ""));
                setFinalizeOpen(true);
              }}
              variant="outline"
              className="border-success/40 text-success hover:bg-success/10 font-semibold h-10"
              disabled={match?.status === "completed"}
            >
              <Flag size={14} className="mr-1" /> {match?.status === "completed" ? "FINALIZADA" : "FINALIZAR"}
            </Button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => navigate(`/opponent-details?matchId=${matchId}`)}
            variant="outline"
            className="border-primary/40 text-primary font-semibold h-10"
          >
            <Eye size={14} className="mr-1" /> ADVERSÁRIO
          </Button>
          <Button
            onClick={() => setListOpen(true)}
            variant="outline"
            className="border-primary/40 text-primary font-semibold h-10"
          >
            <ListChecks size={14} className="mr-1" /> CONFIRMAÇÕES ({confirmedRoster.length})
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div className="text-center">
          <span className="text-[10px] text-muted-foreground bg-secondary px-3 py-1 rounded-full">
            🏟️ Chat da partida criado
          </span>
        </div>

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

      {/* Confirmations list dialog with Confirm button inside */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="bg-card border-border max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">CONFIRMAÇÕES</DialogTitle>
          </DialogHeader>

          {/* Confirm action inside the same screen */}
          <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-foreground">Sua presença</p>
            {myCurrentStatus && (
              <p className="text-[11px] text-primary font-semibold">
                Status atual: {myCurrentStatus === "confirmed" ? "✓ Confirmado" : "✗ Ausente"}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handlePresence("confirmed")}
                className="bg-success text-success-foreground hover:bg-success/90 font-semibold h-10"
              >
                <Check size={14} className="mr-1" /> CONFIRMADO
              </Button>
              <Button
                onClick={() => handlePresence("declined")}
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold h-10"
              >
                <X size={14} className="mr-1" /> AUSENTE
              </Button>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-success uppercase tracking-wider mb-2">
              ✓ Confirmados ({confirmedRoster.length})
            </p>
            {confirmedRoster.length === 0 ? (
              <p className="text-xs text-muted-foreground mb-3">Ninguém confirmado ainda.</p>
            ) : (
              <ul className="space-y-1 mb-3">
                {confirmedRoster.map((r: any) => (
                  <li key={r.player.id} className="text-sm text-foreground bg-success/5 border border-success/20 rounded-lg px-3 py-1.5">
                    {r.player?.nickname || r.player?.name || "Jogador"}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-[11px] font-semibold text-destructive uppercase tracking-wider mb-2">
              ✗ Ausentes ({declinedRoster.length})
            </p>
            {declinedRoster.length === 0 ? (
              <p className="text-xs text-muted-foreground mb-3">Nenhuma ausência registrada.</p>
            ) : (
              <ul className="space-y-1 mb-3">
                {declinedRoster.map((r: any) => (
                  <li key={r.player.id} className="text-sm text-foreground bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-1.5">
                    {r.player?.nickname || r.player?.name || "Jogador"}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-[11px] font-semibold text-warning uppercase tracking-wider mb-2">
              • Aguardando ({pendingRoster.length})
            </p>
            {pendingRoster.length === 0 ? (
              <p className="text-xs text-muted-foreground">Todos responderam.</p>
            ) : (
              <ul className="space-y-1">
                {pendingRoster.map((r: any) => (
                  <li key={r.player.id} className="text-sm text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-1.5">
                    {r.player?.nickname || r.player?.name || "Jogador"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Finalize match dialog */}
      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">FINALIZAR PARTIDA</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Informe o placar final da partida.</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label className="text-[11px]">{homeTeam?.name || "Mandante"}</Label>
              <Input
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="bg-secondary border-border text-center text-lg font-bold"
              />
            </div>
            <div>
              <Label className="text-[11px]">{awayTeam?.name || "Visitante"}</Label>
              <Input
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="bg-secondary border-border text-center text-lg font-bold"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button variant="outline" onClick={() => setFinalizeOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!matchId) return;
                const hs = parseInt(homeScore);
                const as = parseInt(awayScore);
                if (isNaN(hs) || isNaN(as)) {
                  toast({ title: "Informe o placar", variant: "destructive" });
                  return;
                }
                mockDb.updateMatch(matchId, { status: "completed", home_score: hs, away_score: as });
                window.dispatchEvent(new CustomEvent("mock-db-change"));
                queryClient.invalidateQueries({ queryKey: ["match-detail", matchId] });
                queryClient.invalidateQueries({ queryKey: ["matches"] });
                toast({ title: "Partida finalizada! 🏁" });
                setFinalizeOpen(false);
              }}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              <Flag size={14} className="mr-1" /> Finalizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatPage;
