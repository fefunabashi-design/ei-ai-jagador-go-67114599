import { startsWithNorm } from "@/lib/normalize";
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, MapPin, Plus, Clock, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import { useMatches, useMyTeam, useCreateMatch, useAcceptMatch } from "@/hooks/useSupabaseData";

const formats = ["Todos", "5x5", "8x8", "11x11"];

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

const MatchPage = () => {
  const [selectedFormat, setSelectedFormat] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchFormat, setMatchFormat] = useState("8x8");

  const { data: matches = [], isLoading } = useMatches();
  const { data: myTeam } = useMyTeam();
  const createMatch = useCreateMatch();
  const acceptMatch = useAcceptMatch();

  const filtered = matches.filter((m) => {
    if (selectedFormat !== "Todos" && m.format !== selectedFormat) return false;
    if (searchTerm) {
      const homeName = (m.home_team as any)?.name || "";
      const loc = m.location || "";
      if (!startsWithNorm(homeName, searchTerm) && !startsWithNorm(loc, searchTerm)) return false;
    }
    return true;
  });

  const handleCreateMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeam) return;
    createMatch.mutate({
      home_team_id: myTeam.id,
      location,
      match_date: new Date(matchDate).toISOString(),
      format: matchFormat,
    });
    setCreateOpen(false);
    setLocation("");
    setMatchDate("");
  };

  const handleAccept = (matchId: string) => {
    if (!myTeam) return;
    acceptMatch.mutate({ matchId, awayTeamId: myTeam.id });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl text-foreground">ENCONTRAR MATCH</h1>
            <p className="text-sm text-muted-foreground">Busque o adversário ideal</p>
          </div>
          {myTeam && (
            <Button onClick={() => setCreateOpen(true)} className="bg-gradient-primary text-primary-foreground border-0">
              <Plus size={16} className="mr-1" /> Criar
            </Button>
          )}
        </div>
      </div>

      <div className="px-5 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar time ou local..."
              className="pl-9 bg-card border-border"
            />
          </div>
          <Button variant="outline" size="icon" className="border-border">
            <SlidersHorizontal size={16} />
          </Button>
        </div>

        <div className="flex gap-2">
          {formats.map((fmt) => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedFormat === fmt
                  ? "bg-gradient-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>

        {!myTeam && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-sm text-warning">
            ⚠️ Crie um time na aba "Time" para criar ou aceitar desafios.
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
              const isMyMatch = myTeam && (homeTeam?.owner_id === myTeam.owner_id);
              const canAccept = myTeam && match.status === "open" && !isMyMatch;
              const date = new Date(match.match_date);
              const timeStr = date.toLocaleDateString("pt-BR", { weekday: "short" }) + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusStyles[match.status] || ""}`}>
                      {statusLabels[match.status] || match.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="text-center flex-1">
                      <p className="font-display text-lg text-foreground">{homeTeam?.name?.toUpperCase() || "???"}</p>
                    </div>
                    <div className="px-3">
                      <span className="text-xs font-bold text-muted-foreground">VS</span>
                    </div>
                    <div className="text-center flex-1">
                      <p className="font-display text-lg text-foreground">{awayTeam?.name?.toUpperCase() || "???"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {match.location}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {timeStr}</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {match.format}</span>
                  </div>

                  {canAccept && (
                    <Button
                      size="sm"
                      onClick={() => handleAccept(match.id)}
                      disabled={acceptMatch.isPending}
                      className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold"
                    >
                      Aceitar Desafio
                    </Button>
                  )}
                </motion.div>
              );
            })}
            {filtered.length === 0 && !isLoading && (
              <p className="text-center text-muted-foreground text-sm py-8">
                Nenhum match encontrado 😕
              </p>
            )}
          </div>
        )}
      </div>

      {/* Create Match Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">CRIAR PARTIDA</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateMatch} className="space-y-4">
            <div>
              <Label>Local</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Campo do Zé" className="bg-secondary border-border" required />
            </div>
            <div>
              <Label>Data e Hora</Label>
              <Input type="datetime-local" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="bg-secondary border-border" required />
            </div>
            <div>
              <Label>Formato</Label>
              <Select value={matchFormat} onValueChange={setMatchFormat}>
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

      <BottomNav />
    </div>
  );
};

export default MatchPage;
