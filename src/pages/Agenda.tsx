import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar, Clock, MapPin, Users, Eye, Pencil, UserCheck,
  Send, XCircle, Trash2, Plus, Shield, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import SoccerField from "@/components/SoccerField";
import {
  useMatches, useMyTeam, useCreateMatch, useUpdateMatch, useDeleteMatch,
  usePlayers, useMatchSummons, useCreateSummons, useCreateLineup, useMatchLineups, useDeleteLineup,
} from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
  const [filter, setFilter] = useState<FilterType>("upcoming");
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [detailView, setDetailView] = useState<"details" | "lineup" | "summons" | "field" | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editFormat, setEditFormat] = useState("8x8");

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

  const now = new Date();

  const myMatches = matches.filter((m) => {
    const homeTeam = m.home_team as any;
    return myTeam && homeTeam?.owner_id === myTeam.owner_id;
  });

  const filtered = myMatches.filter((m) => {
    const matchDate = new Date(m.match_date);
    switch (filter) {
      case "upcoming": return matchDate >= now && (m.status === "open" || m.status === "confirmed");
      case "past": return matchDate < now || m.status === "completed";
      case "open": case "confirmed": case "completed": case "cancelled": return m.status === filter;
      default: return true;
    }
  });

  const openEdit = (match: any) => {
    setSelectedMatch(match);
    setEditLocation(match.location);
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
    const newSummons = lineups.map((l: any) => ({
      match_id: selectedMatch.id,
      player_id: l.player_id,
      position: l.position,
    }));
    createSummons.mutate(newSummons);
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
    deleteLineup.mutate({ id: lineupId, matchId: selectedMatch.id });
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
          {myTeam && (
            <Button onClick={() => setCreateOpen(true)} className="bg-gradient-primary text-primary-foreground border-0">
              <Plus size={16} className="mr-1" /> Nova Partida
            </Button>
          )}
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* Filters */}
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

        {!myTeam && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-sm text-warning">
            ⚠️ Crie um time para gerenciar a agenda de partidas.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((match, i) => {
              const homeTeam = match.home_team as any;
              const awayTeam = match.away_team as any;
              const date = new Date(match.match_date);
              const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
              const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusStyles[match.status] || ""}`}>
                      {statusLabels[match.status] || match.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{match.format}</span>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-lg text-foreground">{homeTeam?.name?.toUpperCase() || "???"}</span>
                    <span className="text-xs text-muted-foreground font-bold px-2">VS</span>
                    <span className="font-display text-lg text-foreground">{awayTeam?.name?.toUpperCase() || "???"}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {dateStr}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {timeStr}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {match.location}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => openDetails(match, "details")}>
                      <Eye size={12} className="mr-1" /> Detalhes
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => openEdit(match)}>
                      <Pencil size={12} className="mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => openDetails(match, "lineup")}>
                      <Users size={12} className="mr-1" /> Escalação
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => openDetails(match, "summons")}>
                      <UserCheck size={12} className="mr-1" /> Convocação
                    </Button>
                    {match.status !== "cancelled" && match.status !== "completed" && (
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleCancelMatch(match.id)}>
                        <XCircle size={12} className="mr-1" /> Cancelar
                      </Button>
                    )}
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
              <Input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="bg-secondary border-border" required />
            </div>
            <div>
              <Label>Formato</Label>
              <Select value={editFormat} onValueChange={setEditFormat}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5x5">5x5</SelectItem>
                  <SelectItem value="8x8">8x8</SelectItem>
                  <SelectItem value="11x11">11x11</SelectItem>
                </SelectContent>
              </Select>
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
                  { label: "Local", value: selectedMatch.location },
                  { label: "Data", value: new Date(selectedMatch.match_date).toLocaleDateString("pt-BR", { dateStyle: "long" }) },
                  { label: "Hora", value: new Date(selectedMatch.match_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) },
                  { label: "Formato", value: selectedMatch.format },
                  { label: "Mandante", value: (selectedMatch.home_team as any)?.name },
                  { label: "Visitante", value: (selectedMatch.away_team as any)?.name || "Aguardando" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground">{item.value || "—"}</span>
                  </div>
                ))}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full text-xs text-destructive mt-4">
                    <Trash2 size={14} className="mr-1" /> Excluir Partida
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
                  {/* List below */}
                  <div className="space-y-2 mt-3">
                    {summons.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{s.player?.name}</p>
                          <p className="text-xs text-muted-foreground">{s.position || "Sem posição"}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${summonStatusStyles[s.status] || ""}`}>
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
