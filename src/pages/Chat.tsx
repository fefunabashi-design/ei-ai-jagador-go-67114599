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
import {
  useProfile, useMatchSummons, usePlayers, useMyTeam,
  useMatchDetail, useChatMessages, useSendChatMessage,
  useCreateSummons, useUpdateMatch,
} from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const TEAM_PREFIX_SKIP = new Set([
  "EC","SC","AC","FC","AA","AD","CR","CA","SE","CE","CD","SD","GE","ABC","CF","RC","CRB","SER","ASA","AE","CSA",
]);
const getShortTeamName = (name?: string) => {
  if (!name) return "";
  const tokens = name.trim().split(/\s+/);
  const main = tokens.find((t) => !TEAM_PREFIX_SKIP.has(t.toUpperCase()) && t.length > 2);
  return main || tokens[0] || "";
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
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [newEventType, setNewEventType] = useState<MatchEvent["type"]>("goal");
  const [newEventPlayer, setNewEventPlayer] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: match } = useMatchDetail(matchId);
  const { data: messages = [] } = useChatMessages(matchId);
  const { data: summons = [] } = useMatchSummons(matchId);
  const sendMessage = useSendChatMessage();
  const createSummonsMut = useCreateSummons();
  const updateMatch = useUpdateMatch();

  const homeTeam = match?.home_team as any;
  const awayTeam = match?.away_team as any;
  const matchDate = match ? new Date(match.match_date) : null;

  // Players of home team for the roster (presence dialog)
  const { data: teamPlayers = [] } = usePlayers(homeTeam?.id);

  // Public players from both teams (bypasses RLS via public_players view) for attribution
  const [publicTeamPlayers, setPublicTeamPlayers] = useState<any[]>([]);
  useEffect(() => {
    const ids = [homeTeam?.id, awayTeam?.id].filter(Boolean);
    if (!ids.length) { setPublicTeamPlayers([]); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("public_players")
        .select("user_id, team_id")
        .in("team_id", ids);
      if (alive) setPublicTeamPlayers(data || []);
    })();
    return () => { alive = false; };
  }, [homeTeam?.id, awayTeam?.id]);

  // Map user_id -> short team name for chat message attribution
  const userTeamMap = new Map<string, string>();
  if (homeTeam?.name) {
    const short = getShortTeamName(homeTeam.name);
    if (homeTeam.owner_id) userTeamMap.set(homeTeam.owner_id, short);
  }
  if (awayTeam?.name) {
    const short = getShortTeamName(awayTeam.name);
    if (awayTeam.owner_id) userTeamMap.set(awayTeam.owner_id, short);
  }
  publicTeamPlayers.forEach((p: any) => {
    if (!p.user_id) return;
    const t = p.team_id === homeTeam?.id ? homeTeam : p.team_id === awayTeam?.id ? awayTeam : null;
    if (t?.name) userTeamMap.set(p.user_id, getShortTeamName(t.name));
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !matchId) return;
    setSending(true);
    await sendMessage.mutateAsync({ matchId, message: message.trim() });
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

  const handlePresence = async (status: "confirmed" | "declined") => {
    if (!matchId) return;
    if (!myPlayerForPresence) {
      toast({ title: "Você não está vinculado a este time", variant: "destructive" });
      return;
    }
    await createSummonsMut.mutateAsync({
      matchId,
      playerId: myPlayerForPresence.id,
      status,
    });
    toast({ title: status === "confirmed" ? "Presença confirmada! ✅" : "Ausência registrada" });
    setConfirmOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={20} className="text-muted-foreground" />
          </button>
          <button><MoreHorizontal size={18} className="text-muted-foreground" /></button>
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
                <p className={`text-[10px] text-muted-foreground font-semibold mb-0.5 ${isMe ? "text-right" : ""}`}>
                  {isMe
                    ? (profile?.nickname || profile?.display_name || "Você")
                    : (senderProfile?.nickname || senderName)}
                </p>
                {(() => {
                  const teamLabel = isMe
                    ? (myTeam?.name ? getShortTeamName(myTeam.name) : "")
                    : (userTeamMap.get(msg.user_id) || "");
                  if (!teamLabel) return null;
                  return (
                    <p className={`text-[9px] text-primary font-semibold mb-0.5 ${isMe ? "text-right" : ""}`}>
                      {teamLabel}
                    </p>
                  );
                })()}
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
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Eventos: gols e cartões */}
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Gols e Cartões</p>
            {confirmedRoster.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum jogador confirmado para selecionar.</p>
            ) : (
              <div className="grid grid-cols-[1fr_1.3fr_auto] gap-2 items-end">
                <div>
                  <Label className="text-[10px]">Tipo</Label>
                  <Select value={newEventType} onValueChange={(v) => setNewEventType(v as MatchEvent["type"])}>
                    <SelectTrigger className="bg-secondary border-border h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="goal">⚽ Gol</SelectItem>
                      <SelectItem value="own_goal">🥅 Gol contra</SelectItem>
                      <SelectItem value="yellow">🟨 Amarelo</SelectItem>
                      <SelectItem value="red">🟥 Vermelho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Jogador</Label>
                  <Select value={newEventPlayer} onValueChange={setNewEventPlayer}>
                    <SelectTrigger className="bg-secondary border-border h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {confirmedRoster.map((r: any) => (
                        <SelectItem key={r.player.id} value={r.player.id}>
                          {r.player?.nickname || r.player?.name || "Jogador"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="icon"
                  className="bg-primary text-primary-foreground h-9 w-9"
                  onClick={() => {
                    if (!newEventPlayer) {
                      toast({ title: "Selecione um jogador", variant: "destructive" });
                      return;
                    }
                    setEvents([...events, { id: crypto.randomUUID(), type: newEventType, player_id: newEventPlayer }]);
                    setNewEventPlayer("");
                  }}
                >
                  <Plus size={16} />
                </Button>
              </div>
            )}

            {events.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 text-[10px]">Tipo</TableHead>
                    <TableHead className="h-8 text-[10px]">Jogador</TableHead>
                    <TableHead className="h-8 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev) => {
                    const p: any = teamPlayers.find((pl: any) => pl.id === ev.player_id);
                    const label =
                      ev.type === "goal" ? "⚽ Gol" :
                      ev.type === "own_goal" ? "🥅 Gol contra" :
                      ev.type === "yellow" ? "🟨 Amarelo" : "🟥 Vermelho";
                    return (
                      <TableRow key={ev.id}>
                        <TableCell className="py-1.5 text-xs">{label}</TableCell>
                        <TableCell className="py-1.5 text-xs">{p?.nickname || p?.name || "Jogador"}</TableCell>
                        <TableCell className="py-1.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setEvents(events.filter((e) => e.id !== ev.id))}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button variant="outline" onClick={() => setFinalizeOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!matchId || !myTeam || !match) return;
                const hs = parseInt(homeScore);
                const as = parseInt(awayScore);
                if (isNaN(hs) || isNaN(as)) {
                  toast({ title: "Informe o placar", variant: "destructive" });
                  return;
                }
                const mySide: "home" | "away" = match.home_team_id === myTeam.id ? "home" : "away";
                const patch: Record<string, any> = mySide === "home"
                  ? {
                      home_finalized_at: new Date().toISOString(),
                      home_reported_home_score: hs,
                      home_reported_away_score: as,
                    }
                  : {
                      away_finalized_at: new Date().toISOString(),
                      away_reported_home_score: hs,
                      away_reported_away_score: as,
                    };
                await updateMatch.mutateAsync({ id: matchId, ...patch });
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
