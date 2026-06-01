import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon, Clock, MapPin, Users, Eye, Pencil, UserCheck,
  Send, XCircle, Trash2, Plus, Shield, CheckCircle2, AlertCircle, MessageCircle, CreditCard, List,
  ChevronDown, ChevronUp, CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format as formatDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import BottomNav from "@/components/BottomNav";
import SoccerField from "@/components/SoccerField";
import MonthlyCalendar from "@/components/MonthlyCalendar";
import {
  useMatches, useMyTeam, useCreateMatch, useUpdateMatch, useDeleteMatch,
  usePlayers, useMatchSummons, useCreateSummons, useCreateLineup, useMatchLineups, useDeleteLineup,
  useSendChatMessage,
} from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const BR_HOLIDAYS_2026: string[] = [
  "2026-01-01","2026-02-23","2026-02-24","2026-04-03","2026-04-05","2026-04-21",
  "2026-05-01","2026-09-07","2026-10-12","2026-11-02","2026-11-15","2026-11-20","2026-12-25",
];


const statusStyles: Record<string, string> = {
  open: "bg-warning/10 text-warning",
  confirmed: "bg-success/10 text-success",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  open: "Aberto",
  confirmed: "Confirmado",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

const summonStatusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  declined: "Recusado",
};

const summonStatusStyles: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-success/10 text-success",
  declined: "bg-destructive/10 text-destructive",
};

type FilterType = "upcoming" | "past" | "all" | "open" | "confirmed" | "completed" | "cancelled";

const filterOptions: { value: FilterType; label: string }[] = [
  { value: "upcoming", label: "Próximas" },
  { value: "past", label: "Passadas" },
  { value: "all", label: "Todas" },
  { value: "open", label: "Aberto" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Finalizado" },
  { value: "cancelled", label: "Cancelado" },
];

const allPositions = [
  "Goleiro", "Zagueiro", "Lateral Esquerdo", "Lateral Direito",
  "Volante", "Meia", "Atacante",
];

const AgendaPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusMatchId = searchParams.get("matchId");
  const focusView = searchParams.get("view");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<FilterType>(focusMatchId ? "upcoming" : "upcoming");
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(focusMatchId);
  const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [detailView, setDetailView] = useState<"details" | "lineup" | "summons" | "field" | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editFormat, setEditFormat] = useState("8x8");
  const [editChatMessage, setEditChatMessage] = useState("");
  const sendChatMessage = useSendChatMessage();

  const [opponentPlayers, setOpponentPlayers] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const awayId = (selectedMatch as any)?.away_team?.id;
      if (!awayId || detailView !== "details") { setOpponentPlayers([]); return; }
      const { data: pls } = await supabase.from("players").select("*").eq("team_id", awayId);
      if (!cancelled) setOpponentPlayers(pls || []);
    })();
    return () => { cancelled = true; };
  }, [selectedMatch?.id, detailView]);

  // Create match
  const [createOpen, setCreateOpen] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newFormat, setNewFormat] = useState("8x8");

  // Lineup dialog
  const [lineupOpen, setLineupOpen] = useState(false);
  const [lineupPosition, setLineupPosition] = useState("");
  const [lineupPlayerId, setLineupPlayerId] = useState("");

  const { data: matches = [], isLoading } = useMatches();
  const { data: myTeam } = useMyTeam();
  const createMatch = useCreateMatch();
  const updateMatch = useUpdateMatch();
  const deleteMatch = useDeleteMatch();
  const { data: players = [] } = usePlayers(myTeam?.id);
  const { data: summons = [] } = useMatchSummons(selectedMatch?.id);
  const { data: lineups = [] } = useMatchLineups(selectedMatch?.id);
  const createSummons = useCreateSummons();
  const createLineup = useCreateLineup();
  const deleteLineup = useDeleteLineup();

  // Fetch all summons for all matches to show counters on cards
  const myMatchIds = matches
    .filter((m) => {
      const homeTeam = m.home_team as any;
      return myTeam && homeTeam?.owner_id === myTeam.owner_id;
    })
    .map((m) => m.id);

  const { data: allSummons = [] } = useQuery({
    queryKey: ["all-match-summons", myMatchIds.join(",")],
    queryFn: async () => {
      if (!myMatchIds.length) return [];
      const { data, error } = await supabase
        .from("match_summons")
        .select("id, match_id, status")
        .in("match_id", myMatchIds);
      if (error) throw error;
      return data;
    },
    enabled: myMatchIds.length > 0,
  });

  const getSummonCounts = (matchId: string) => {
    const matchSummons = allSummons.filter((s) => s.match_id === matchId);
    return {
      total: matchSummons.length,
      confirmed: matchSummons.filter((s) => s.status === "confirmed").length,
      pending: matchSummons.filter((s) => s.status === "pending").length,
      declined: matchSummons.filter((s) => s.status === "declined").length,
    };
  };

  const now = new Date();

  const myMatches = matches.filter((m: any) => {
    if (!myTeam) return false;
    return m.home_team_id === myTeam.id || m.away_team_id === myTeam.id;
  });

  const availableDays = Array.isArray((myTeam as any)?.play_days)
    ? ((myTeam as any).play_days as string[])
        .map((day) => ({
          domingo: 0,
          segunda: 1,
          terca: 2,
          quarta: 3,
          quinta: 4,
          sexta: 5,
          sabado: 6,
        }[day]))
        .filter((day): day is number => typeof day === "number")
    : [2, 4, 6];

  const filtered = myMatches.filter((m) => {
    const matchDate = new Date(m.match_date);
    switch (filter) {
      case "upcoming": return matchDate >= now && (m.status === "open" || m.status === "confirmed");
      case "past": return matchDate < now || m.status === "completed";
      case "open": case "confirmed": case "completed": case "cancelled": return m.status === filter;
      default: return true;
    }
  });

  useEffect(() => {
    if (!focusMatchId) return;
    setView("list");
    setFilter("upcoming");
    const t = setTimeout(() => {
      const el = matchRefs.current[focusMatchId];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (focusView === "summons" || focusView === "lineup" || focusView === "field") {
        const m = matches.find((x: any) => x.id === focusMatchId);
        if (m) openDetails(m, focusView);
      }
      const t2 = setTimeout(() => {
        setHighlightedMatchId(null);
        searchParams.delete("matchId");
        searchParams.delete("view");
        setSearchParams(searchParams, { replace: true });
      }, 2500);
      return () => clearTimeout(t2);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMatchId, focusView, filtered.length, matches.length]);

  const openEdit = (match: any) => {
    setSelectedMatch(match);
    const teamFieldName = (match.home_team as any)?.field_name;
    setEditLocation(teamFieldName || match.location);
    setEditDate(match.match_date.slice(0, 16));
    setEditFormat(match.format);
    setEditOpen(true);
  };


  const handleCreateMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeam) return;
    createMatch.mutate({
      home_team_id: myTeam.id,
      location: newLocation,
      match_date: new Date(newDate).toISOString(),
      format: newFormat,
    });
    setCreateOpen(false);
    setNewLocation("");
    setNewDate("");
  };

  const handleUpdateMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;
    updateMatch.mutate({
      id: selectedMatch.id,
      location: editLocation,
      match_date: new Date(editDate).toISOString(),
      format: editFormat,
    });
    setEditOpen(false);
  };

  const handleCancelMatch = (matchId: string) => {
    updateMatch.mutate({ id: matchId, status: "cancelled" });
  };

  const handleDeleteMatch = (matchId: string) => {
    deleteMatch.mutate(matchId);
    setDetailView(null);
    setSelectedMatch(null);
  };

  const openDetails = (match: any, view: "details" | "lineup" | "summons" | "field") => {
    setSelectedMatch(match);
    setDetailView(view);
  };

  const handleSendSummons = () => {
    if (!selectedMatch || !lineups.length) return;
    lineups.forEach((l: any) => {
      createSummons.mutate({
        matchId: selectedMatch.id,
        playerId: l.player_id,
        status: "pending",
      });
    });
  };

  const handleAddToLineup = () => {
    if (!selectedMatch || !lineupPlayerId) return;
    createLineup.mutate({
      match_id: selectedMatch.id,
      player_id: lineupPlayerId,
      position: lineupPosition || undefined,
    });
    setLineupPlayerId("");
    setLineupPosition("");
    setLineupOpen(false);
  };

  const handleDropPlayer = (playerId: string, position: string) => {
    if (!selectedMatch) return;
    createLineup.mutate({
      match_id: selectedMatch.id,
      player_id: playerId,
      position,
    });
  };

  const handleRemoveFromLineup = (lineupId: string) => {
    if (!selectedMatch) return;
    deleteLineup.mutate(lineupId);
  };

  const handlePositionClick = (position: string) => {
    setLineupPosition(position);
    setLineupPlayerId("");
    setLineupOpen(true);
  };

  // Build field players from lineups
  const fieldPlayers = lineups.map((l: any) => ({
    id: l.id,
    name: l.player?.name || "???",
    position: l.position || l.player?.position || "",
    avatarUrl: null,
  }));

  // Build summons field players
  const summonsFieldPlayers = summons.map((s: any) => ({
    id: s.id,
    name: s.player?.name || "???",
    position: s.position || "",
    avatarUrl: null,
    status: s.status,
  }));

  // Empty positions not yet filled
  const filledPositions = lineups.map((l: any) => l.position || l.player?.position).filter(Boolean);
  const emptyPositions = allPositions.filter((p) => !filledPositions.includes(p));

  // Players without position in lineups
  const unpositionedLineups = lineups
    .filter((l: any) => !l.position && !l.player?.position)
    .map((l: any) => ({
      id: l.id,
      name: l.player?.name || "???",
      position: "",
      avatarUrl: null,
    }));

  // Split available players by summon status:
  // Confirmed summons → main list; others → secondary
  const confirmedPlayerIds = summons
    .filter((s: any) => s.status === "confirmed")
    .map((s: any) => s.player_id);
  const declinedPlayerIds = summons
    .filter((s: any) => s.status === "declined")
    .map((s: any) => s.player_id);

  const confirmedAvailable = players
    .filter((p) => confirmedPlayerIds.includes(p.id) && !lineups.some((l: any) => l.player_id === p.id))
    .map((p) => ({ id: p.id, name: p.name, position: p.position, avatarUrl: null }));

  const otherAvailable = players
    .filter((p) => !confirmedPlayerIds.includes(p.id) && !declinedPlayerIds.includes(p.id) && !lineups.some((l: any) => l.player_id === p.id))
    .map((p) => ({ id: p.id, name: p.name, position: p.position, avatarUrl: null }));

  // Combine: confirmed first, then others (pending/no summon)
  const availableForDrag = [...confirmedAvailable, ...otherAvailable];

  // Counters
  const confirmedCount = summons.filter((s: any) => s.status === "confirmed").length;
  const pendingCount = summons.filter((s: any) => s.status === "pending").length;
  const declinedCount = summons.filter((s: any) => s.status === "declined").length;

  // Match info for field header
  const getMatchInfo = () => {
    if (!selectedMatch) return undefined;
    const homeTeam = selectedMatch.home_team as any;
    const awayTeam = selectedMatch.away_team as any;
    const date = new Date(selectedMatch.match_date);
    const dayLabel = date.toLocaleDateString("pt-BR", { weekday: "short" }) + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return {
      home: homeTeam?.name || "???",
      away: awayTeam?.name,
      dateLabel: dayLabel,
    };
  };

  // Suggested players filtered by position
  const suggestedPlayers = lineupPosition
    ? players.filter((p) => p.position === lineupPosition && !lineups.some((l: any) => l.player_id === p.id))
    : players.filter((p) => !lineups.some((l: any) => l.player_id === p.id));

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl text-foreground font-display">AGENDA</h1>
            <p className="text-sm text-muted-foreground">Gerencie suas partidas</p>
          </div>
        </div>
      </div>

      <div className={`px-5 ${view === "calendar" ? "space-y-2" : "space-y-4"}`}>
        {/* View Toggle and Filters */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex gap-2">
            <Button
              onClick={() => setView("list")}
              variant={view === "list" ? "default" : "outline"}
              size="sm"
              className={`text-xs rounded-lg ${
                view === "list"
                  ? "bg-gradient-primary text-primary-foreground border-0"
                  : ""
              }`}
            >
              <List size={14} className="mr-1" /> Lista
            </Button>
            <Button
              onClick={() => setView("calendar")}
              variant={view === "calendar" ? "default" : "outline"}
              size="sm"
              className={`text-xs rounded-lg ${
                view === "calendar"
                  ? "bg-gradient-primary text-primary-foreground border-0"
                  : ""
              }`}
            >
              <CalendarIcon size={14} className="mr-1" /> Calendário
            </Button>
          </div>
        </div>

        {/* Filters (only show in list view) */}
        {view === "list" && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filterOptions.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === f.value
                    ? "bg-gradient-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : view === "calendar" ? (
          <MonthlyCalendar
            matches={myMatches.map((m) => ({
              id: m.id,
              date: new Date(m.match_date),
              title: (m.away_team as any)?.name || "Partida",
              status: m.status,
            }))}
              availableDays={availableDays}
            onDateClick={(date, dateMatches) => {
              if (dateMatches.length > 0) {
                const match = myMatches.find((m) => {
                  const mDate = new Date(m.match_date);
                  return (
                    mDate.getDate() === date.getDate() &&
                    mDate.getMonth() === date.getMonth() &&
                    mDate.getFullYear() === date.getFullYear()
                  );
                });
                if (match) {
                  openDetails(match, "details");
                }
              } else {
                setNewDate(date.toISOString().slice(0, 16));
                setCreateOpen(true);
              }
            }}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((match, i) => {
              const homeTeam = match.home_team as any;
              const awayTeam = match.away_team as any;
              const isOwner = myTeam && homeTeam?.owner_id === myTeam.owner_id;
              const date = new Date(match.match_date);
              const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
              const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

              return (
                <motion.div
                  key={match.id}
                  ref={(el) => { matchRefs.current[match.id] = el; }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`bg-card rounded-2xl border overflow-hidden transition-all ${
                    highlightedMatchId === match.id
                      ? "border-primary ring-2 ring-primary/50 shadow-[0_0_30px_-10px_hsl(var(--primary))]"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {/* Header bar */}
                  <div className="bg-secondary/50 px-4 py-2 flex items-center justify-between">
                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${statusStyles[match.status] || ""}`}>
                      {statusLabels[match.status] || match.status}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-semibold">{match.format}</span>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Teams */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                          {homeTeam?.logo_url ? (
                            <img src={homeTeam.logo_url} alt="" loading="eager" className="w-9 h-9 object-contain" />
                          ) : (
                            <Shield size={16} className="text-primary" />
                          )}
                        </div>
                        <span className="font-display text-foreground">{homeTeam?.name?.toUpperCase() || "???"}</span>
                      </div>
                      {match.status === "completed" ? (
                        <span className="text-sm font-display text-foreground font-bold px-3">
                          {match.home_score ?? 0} <span className="text-xs text-muted-foreground mx-1">VS</span> {match.away_score ?? 0}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-bold px-3">VS</span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-display text-foreground">{awayTeam?.name?.toUpperCase() || "???"}</span>
                        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                          {awayTeam?.logo_url ? (
                            <img src={awayTeam.logo_url} alt="" loading="eager" className="w-9 h-9 object-contain" />
                          ) : (
                            <Shield size={16} className="text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info row */}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><CalendarIcon size={11} /> {dateStr}</span>
                      <span className="flex items-center gap-1"><Clock size={11} /> {timeStr}</span>
                      <span className="flex items-center gap-1"><MapPin size={11} /> {(match.home_team as any)?.field_name || match.location}</span>
                    </div>

                    {/* Summon counters */}
                    {(() => {
                      const counts = getSummonCounts(match.id);
                      if (counts.total === 0) return null;
                      return (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-success" />
                            <span className="text-[11px] font-semibold text-success">{counts.confirmed}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertCircle size={12} className="text-warning" />
                            <span className="text-[11px] font-semibold text-warning">{counts.pending}</span>
                          </div>
                          {counts.declined > 0 && (
                            <div className="flex items-center gap-1">
                              <XCircle size={12} className="text-destructive" />
                              <span className="text-[11px] font-semibold text-destructive">{counts.declined}</span>
                            </div>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {counts.confirmed}/{counts.total} confirmados
                          </span>
                        </div>
                      );
                    })()}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2.5 rounded-lg" onClick={() => openDetails(match, "details")}>
                        <Eye size={12} className="mr-1" /> Detalhes
                      </Button>
                      <Button size="sm" className="text-xs h-7 px-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20" onClick={() => openDetails(match, "summons")}>
                        <Users size={12} className="mr-1" /> Elenco
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2.5 rounded-lg" onClick={() => navigate(`/chat/${match.id}`)}>
                        <MessageCircle size={12} className="mr-1" /> Chat
                      </Button>
                      {isOwner && (
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2.5 rounded-lg" onClick={() => navigate(`/payments/${match.id}`)}>
                          <CreditCard size={12} className="mr-1" /> Vaquinha
                        </Button>
                      )}
                      {isOwner && match.status !== "cancelled" && match.status !== "completed" && (
                        <Button size="sm" variant="ghost" className="text-xs h-7 px-2.5 rounded-lg text-destructive hover:text-destructive" onClick={() => handleCancelMatch(match.id)}>
                          <XCircle size={12} className="mr-1" /> Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                Nenhuma partida encontrada 😕
              </p>
            )}
          </div>
        )}
      </div>

      {/* Create Match Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">NOVA PARTIDA</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateMatch} className="space-y-4">
            <div>
              <Label>Local</Label>
              <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Ex: Campo do Zé" className="bg-secondary border-border" required />
            </div>
            <div>
              <Label>Data e Hora</Label>
              <Input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="bg-secondary border-border" required />
            </div>
            <div>
              <Label>Formato</Label>
              <Select value={newFormat} onValueChange={setNewFormat}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5x5">5x5</SelectItem>
                  <SelectItem value="8x8">8x8</SelectItem>
                  <SelectItem value="11x11">11x11</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={createMatch.isPending} className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold">
              Criar Partida
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">EDITAR PARTIDA</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateMatch} className="space-y-4">
            <div>
              <Label>Local</Label>
              <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="bg-secondary border-border" required />
            </div>
            <div>
              <Label>Data e Hora</Label>
              {(() => {
                const dateValue = editDate ? new Date(editDate) : undefined;
                const timeValue = editDate ? editDate.slice(11, 16) : "";
                const matchDateSet = new Set(
                  myMatches
                    .filter((m: any) => m.id !== selectedMatch?.id)
                    .map((m: any) => new Date(m.match_date).toDateString()),
                );
                const holidaySet = new Set(BR_HOLIDAYS_2026.map((s) => new Date(s + "T12:00:00").toDateString()));
                const isAvailableDay = (d: Date) => availableDays.includes(d.getDay());
                const modifiers = {
                  hasMatch: (d: Date) => matchDateSet.has(d.toDateString()),
                  holiday: (d: Date) => holidaySet.has(d.toDateString()),
                  available: (d: Date) => isAvailableDay(d) && !matchDateSet.has(d.toDateString()) && !holidaySet.has(d.toDateString()),
                };
                const modifiersClassNames = {
                  hasMatch: "bg-neutral-700 text-white hover:bg-neutral-700",
                  holiday: "bg-red-500/80 text-white hover:bg-red-500",
                  available: "bg-neutral-300 text-neutral-900 hover:bg-neutral-300 dark:bg-neutral-400 dark:text-neutral-900",
                };
                return (
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn("flex-1 justify-start text-left font-normal bg-secondary border-border", !dateValue && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateValue ? formatDate(dateValue, "PPP", { locale: ptBR }) : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateValue}
                          onSelect={(d) => {
                            if (!d) return;
                            const time = timeValue || "20:00";
                            const yyyy = d.getFullYear();
                            const mm = String(d.getMonth() + 1).padStart(2, "0");
                            const dd = String(d.getDate()).padStart(2, "0");
                            setEditDate(`${yyyy}-${mm}-${dd}T${time}`);
                          }}
                          modifiers={modifiers}
                          modifiersClassNames={modifiersClassNames}
                          locale={ptBR}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                        <div className="border-t border-border p-3 space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="inline-block w-3 h-3 rounded bg-neutral-700" />
                            <span className="text-foreground">Jogo agendado</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="inline-block w-3 h-3 rounded bg-neutral-300 dark:bg-neutral-400" />
                            <span className="text-foreground">Disponível</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="inline-block w-3 h-3 rounded bg-red-500/80" />
                            <span className="text-foreground">Feriado</span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={timeValue}
                      onChange={(e) => {
                        const t = e.target.value;
                        const base = dateValue ?? new Date();
                        const yyyy = base.getFullYear();
                        const mm = String(base.getMonth() + 1).padStart(2, "0");
                        const dd = String(base.getDate()).padStart(2, "0");
                        setEditDate(`${yyyy}-${mm}-${dd}T${t || "20:00"}`);
                      }}
                      className="w-28 bg-secondary border-border"
                      required
                    />
                  </div>
                );
              })()}
            </div>
            <div className="pt-2 border-t border-border">
              <Label>Chat da partida</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={editChatMessage}
                  onChange={(e) => setEditChatMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="bg-secondary border-border"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!editChatMessage.trim() || !selectedMatch}
                  onClick={async () => {
                    if (!selectedMatch || !editChatMessage.trim()) return;
                    await sendChatMessage.mutateAsync({ matchId: selectedMatch.id, message: editChatMessage.trim() });
                    setEditChatMessage("");
                    setEditOpen(false);
                    navigate(`/chat/${selectedMatch.id}`);
                  }}
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
            <Button type="submit" disabled={updateMatch.isPending} className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold">
              Salvar Alterações
            </Button>
          </form>
        </DialogContent>
      </Dialog>


      {/* Details / Lineup (Field) / Summons Dialog */}
      <Dialog open={!!detailView} onOpenChange={() => setDetailView(null)}>
        <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {selectedMatch && detailView === "details" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">DETALHES DA PARTIDA</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Status", value: statusLabels[selectedMatch.status] },
                  { label: "Local", value: (selectedMatch.home_team as any)?.field_name || selectedMatch.location },
                  { label: "Data", value: new Date(selectedMatch.match_date).toLocaleDateString("pt-BR", { dateStyle: "long" }) },
                  { label: "Hora", value: new Date(selectedMatch.match_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) },
                  { label: "Desafiador", value: (selectedMatch.home_team as any)?.name },
                  { label: "Mandante", value: (selectedMatch.home_team as any)?.name },
                  { label: "Visitante", value: (selectedMatch.away_team as any)?.name || "Aguardando" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground">{item.value || "—"}</span>
                  </div>
                ))}
              </div>

              {(() => {
                const opp: any = (selectedMatch as any).away_team;
                if (!opp) return null;
                const addressParts = [
                  opp.field_address,
                  [opp.addr_rua, opp.addr_numero].filter(Boolean).join(", "),
                  opp.addr_bairro,
                  [opp.addr_cidade, opp.addr_uf].filter(Boolean).join(" - "),
                  opp.addr_cep,
                ].filter((s) => s && String(s).trim().length > 0);
                const fullAddress = addressParts.join(" · ");
                const Row = ({ label, value }: any) => (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</p>
                    <p className="text-foreground text-sm">{value && String(value).trim().length ? value : "Não informado"}</p>
                  </div>
                );
                return (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h3 className="font-display text-lg text-foreground mb-3">ADVERSÁRIO</h3>
                    <Tabs defaultValue="team" className="w-full">
                      <TabsList className="w-full bg-secondary">
                        <TabsTrigger value="team" className="flex-1 text-xs">Dados do Time</TabsTrigger>
                        <TabsTrigger value="players" className="flex-1 text-xs">
                          Jogadores ({opponentPlayers.length})
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="team" className="mt-4 space-y-3">
                        <Row label="Nome do time" value={opp.name} />
                        <Row label="Subcategoria" value={opp.sub_categoria} />
                        <Row label={opp.has_field ? "Nome do campo" : "Nome da sede"} value={opp.field_name} />
                        <Row label={opp.has_field ? "Endereço do campo" : "Endereço da sede"} value={fullAddress} />
                        <Row label="Telefone do campo" value={opp.phone} />
                        <Row label="Nome do técnico" value={opp.coach_name} />
                        <Row label="Admin do app" value={opp.admin_name} />
                        <Row label="Celular do admin" value={opp.admin_phone} />
                      </TabsContent>
                      <TabsContent value="players" className="mt-4">
                        {opponentPlayers.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Nenhum jogador cadastrado neste time.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {opponentPlayers.map((p: any) => {
                              const display = p.nickname?.trim() || p.name || "Jogador";
                              return (
                                <li key={p.id} className="text-sm text-foreground bg-secondary/40 border border-border rounded-lg px-3 py-2">
                                  {display}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                );
              })()}

              {selectedMatch.status === "completed" && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Resultado</h3>
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">{(selectedMatch.home_team as any)?.name}</p>
                      <p className="text-3xl font-display text-foreground">{selectedMatch.home_score ?? 0}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">x</span>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">{(selectedMatch.away_team as any)?.name || "Adversário"}</p>
                      <p className="text-3xl font-display text-foreground">{selectedMatch.away_score ?? 0}</p>
                    </div>
                  </div>
                  {(() => {
                    const evs: any[] = (selectedMatch as any).events || [];
                    const goals = evs.filter((e) => e.type === "goal" || e.type === "own_goal");
                    const yellows = evs.filter((e) => e.type === "yellow");
                    const reds = evs.filter((e) => e.type === "red");
                    const nameOf = (pid: string) => {
                      const p: any = players.find((pl) => pl.id === pid);
                      return p?.nickname || p?.name || "Jogador";
                    };
                    return (
                      <div className="space-y-2">
                        {goals.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Gols</p>
                            <div className="flex flex-wrap gap-1.5">
                              {goals.map((e) => (
                                <span key={e.id} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                                  {e.type === "own_goal" ? "🥅" : "⚽"} {nameOf(e.player_id)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {yellows.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Cartões amarelos</p>
                            <div className="flex flex-wrap gap-1.5">
                              {yellows.map((e) => (
                                <span key={e.id} className="text-[11px] px-2 py-0.5 rounded-full bg-warning/10 text-warning font-semibold">
                                  🟨 {nameOf(e.player_id)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {reds.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Cartões vermelhos</p>
                            <div className="flex flex-wrap gap-1.5">
                              {reds.map((e) => (
                                <span key={e.id} className="text-[11px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold">
                                  🟥 {nameOf(e.player_id)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {evs.length === 0 && (
                          <p className="text-[11px] text-muted-foreground text-center">Sem gols ou cartões registrados.</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => { setDetailView(null); openEdit(selectedMatch); }}
                >
                  <Pencil size={14} className="mr-1" /> Editar Partida
                </Button>
                {selectedMatch.status !== "completed" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="flex-1 text-xs text-destructive">
                        <Trash2 size={14} className="mr-1" /> Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir partida?</AlertDialogTitle>
                        <AlertDialogDescription>Essa ação é irreversível.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteMatch(selectedMatch.id)} className="bg-destructive text-destructive-foreground">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </>
          )}

          {selectedMatch && detailView === "lineup" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">ESCALAÇÃO</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground mb-2">
                Somente jogadores que <span className="text-success font-semibold">confirmaram</span> presença aparecem na lista principal.
              </p>
              <SoccerField
                players={fieldPlayers.filter((p) => p.position)}
                unpositioned={unpositionedLineups}
                emptyPositions={emptyPositions}
                onPositionClick={handlePositionClick}
                availablePlayers={availableForDrag}
                onDropPlayer={handleDropPlayer}
                onRemovePlayer={handleRemoveFromLineup}
                matchInfo={getMatchInfo()}
                counters={{ confirmed: confirmedCount, pending: pendingCount, vacant: declinedCount }}
              />
              <div className="flex gap-2 mt-3">
                <Button onClick={() => setLineupOpen(true)} variant="outline" className="flex-1 text-xs">
                  <Plus size={12} className="mr-1" /> Escalar Manual
                </Button>
              </div>

              {/* Reserves / Available */}
              {availableForDrag.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reservas</h3>
                    <span className="text-[10px] text-muted-foreground">{availableForDrag.length} disponíveis</span>
                  </div>
                  <div className="space-y-1.5">
                    {availableForDrag.map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-secondary/80 rounded-xl px-3 py-2 border border-border/50">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.position || "—"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}


          {selectedMatch && detailView === "summons" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">ELENCO DA PARTIDA</DialogTitle>
              </DialogHeader>
              {summons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma convocação enviada.</p>
              ) : (
                <>
                  <SoccerField
                    players={summonsFieldPlayers.filter((p) => p.position)}
                    unpositioned={summonsFieldPlayers.filter((p) => !p.position)}
                    showStatus
                  />
                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-2 justify-center">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <div className="w-2.5 h-2.5 rounded-full bg-warning" /> Pendente
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <div className="w-2.5 h-2.5 rounded-full bg-success" /> Confirmado
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive" /> Recusado
                    </span>
                  </div>
                  {/* Mini cards list */}
                  <div className="space-y-1.5 mt-3">
                    {summons.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between bg-secondary/80 rounded-xl px-4 py-3 border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {s.player?.name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-tight">{s.player?.name}</p>
                            <p className="text-[11px] text-muted-foreground">{s.position || "Sem posição"}</p>
                          </div>
                        </div>
                        <span className={`text-[11px] font-semibold ${
                          s.status === "confirmed" ? "text-success" :
                          s.status === "declined" ? "text-destructive" :
                          "text-warning"
                        }`}>
                          {summonStatusLabels[s.status] || s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add to Lineup Dialog */}
      <Dialog open={lineupOpen} onOpenChange={setLineupOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">ESCALAR JOGADOR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Posição</Label>
              <Select value={lineupPosition} onValueChange={(val) => { setLineupPosition(val); setLineupPlayerId(""); }}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {allPositions.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Jogador
                {lineupPosition && suggestedPlayers.length > 0 && (
                  <span className="text-primary ml-1 text-xs">(sugestão automática por posição)</span>
                )}
              </Label>
              <Select value={lineupPlayerId} onValueChange={setLineupPlayerId}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {suggestedPlayers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.position ? `(${p.position})` : ""}
                    </SelectItem>
                  ))}
                  {suggestedPlayers.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum jogador disponível</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddToLineup} disabled={!lineupPlayerId || createLineup.isPending} className="w-full bg-gradient-primary text-primary-foreground border-0">
              Confirmar Escalação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default AgendaPage;
