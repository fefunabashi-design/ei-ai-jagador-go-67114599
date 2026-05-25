import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle, ListChecks, Users, Shield, CalendarClock, XCircle, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BottomNav from "@/components/BottomNav";
import MatchConfirmationList from "@/components/MatchConfirmationList";

import { useMatches, useMyTeam, useUpdateMatch } from "@/hooks/useSupabaseData";

const MatchDetails = () => {
  const { matchId = "" } = useParams();
  const navigate = useNavigate();
  const { data: matches = [] } = useMatches();
  const { data: myTeam } = useMyTeam();
  const updateMatch = useUpdateMatch();

  const match = useMemo(() => matches.find((m: any) => m.id === matchId), [matches, matchId]);

  
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newDate, setNewDate] = useState("");

  if (!match) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Partida não encontrada.</p>
        <BottomNav />
      </div>
    );
  }

  const homeTeam = (match as any).home_team;
  const awayTeam = (match as any).away_team;
  const matchDate = new Date(match.match_date);
  const isOwner = myTeam && (homeTeam?.owner_id === myTeam.owner_id || awayTeam?.owner_id === myTeam.owner_id);
  const myIsHome = myTeam && homeTeam?.id === myTeam.id;
  const opponentTeam = myIsHome ? awayTeam : homeTeam;

  const handleCancel = async () => {
    await updateMatch.mutateAsync({ id: match.id, status: "cancelled" });
    setCancelOpen(false);
    navigate("/dashboard");
  };

  const handleReschedule = async () => {
    if (!newDate) return;
    await updateMatch.mutateAsync({ id: match.id, match_date: new Date(newDate).toISOString() });
    setRescheduleOpen(false);
    setNewDate("");
  };

  const actions = [
    {
      icon: MessageCircle,
      label: "Chat da partida",
      description: "Conversar com o grupo",
      onClick: () => navigate(`/chat/${match.id}`),
    },
    {
      icon: ListChecks,
      label: "Confirmações",
      description: "Ver quem confirmou presença",
      onClick: () => setConfirmOpen(true),
    },
    {
      icon: Users,
      label: "Escalação do time",
      description: "Montar e visualizar a escalação",
      onClick: () => navigate(`/agenda?matchId=${match.id}`),
    },
    {
      icon: Shield,
      label: "Detalhar adversário",
      description: opponentTeam?.name ? `Saiba mais sobre ${opponentTeam.name}` : "Informações do adversário",
      onClick: () => navigate(`/opponent-details?matchId=${match.id}`),
      disabled: !opponentTeam,
    },
    {
      icon: CalendarClock,
      label: "Reagendar partida",
      description: "Alterar a data ou horário",
      onClick: () => {
        const iso = matchDate.toISOString();
        setNewDate(iso.slice(0, 16));
        setRescheduleOpen(true);
      },
      adminOnly: true,
    },
    {
      icon: XCircle,
      label: "Cancelar partida",
      description: "Encerrar este confronto",
      onClick: () => setCancelOpen(true),
      destructive: true,
      adminOnly: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-secondary">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-display text-foreground">DETALHES DA PARTIDA</h1>
          <p className="text-xs text-muted-foreground">Tudo o que você precisa em um só lugar</p>
        </div>
      </div>

      <div className="px-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-center flex-1">
              <p className="font-display text-lg text-foreground">{homeTeam?.name?.toUpperCase() || "???"}</p>
            </div>
            <span className="text-xs font-bold text-muted-foreground px-3">VS</span>
            <div className="text-center flex-1">
              <p className="font-display text-lg text-foreground">{awayTeam?.name?.toUpperCase() || "???"}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock size={12} /> {matchDate.toLocaleDateString("pt-BR")} {matchDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            {match.location && <span className="flex items-center gap-1"><MapPin size={12} /> {match.location}</span>}
          </div>
        </div>

        <div className="space-y-2">
          {actions
            .filter((a) => !a.adminOnly || isOwner)
            .map((a, i) => (
              <motion.button
                key={a.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={a.onClick}
                disabled={a.disabled}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  a.destructive
                    ? "bg-destructive/5 border-destructive/30 hover:bg-destructive/10"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    a.destructive ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                  }`}
                >
                  <a.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${a.destructive ? "text-destructive" : "text-foreground"}`}>
                    {a.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                </div>
              </motion.button>
            ))}
        </div>
      </div>

      {/* Confirmações */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">CONFIRMAÇÕES</DialogTitle>
          </DialogHeader>
          <MatchConfirmationList
            matchId={match.id}
            teamId={myIsHome ? homeTeam?.id : awayTeam?.id}
          />
        </DialogContent>
      </Dialog>

      {/* Reagendar */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">REAGENDAR PARTIDA</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nova data e hora</Label>
              <Input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleReschedule}
              disabled={!newDate || updateMatch.isPending}
              className="bg-gradient-primary text-primary-foreground border-0"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancelar */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta partida?</AlertDialogTitle>
            <AlertDialogDescription>
              A partida será marcada como cancelada. Você pode criar uma nova depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar partida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default MatchDetails;
