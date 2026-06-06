import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Swords, Inbox, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import NotaBadge from "@/components/NotaBadge";
import { getTeamStats } from "@/lib/stats";
import { useMyTeam, useMatches, useAcceptMatch, useDeleteMatch, useUpdateMatch } from "@/hooks/useSupabaseData";
import type { Database } from "@/integrations/supabase/types";

type Team = Database["public"]["Tables"]["teams"]["Row"];
type Match = Database["public"]["Tables"]["matches"]["Row"] & {
  home_team?: Team | null;
  away_team?: Team | null;
};

const DesafiosPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: myTeam } = useMyTeam();
  const { data: matches = [] } = useMatches();
  const acceptMatch = useAcceptMatch();
  const deleteMatchMut = useDeleteMatch();
  const updateMatchMut = useUpdateMatch();

  const typedMatches = matches as Match[];

  const receivedChallenges = typedMatches.filter((m) => {
    if (!myTeam || m.status !== "open") return false;
    const homeTeam = m.home_team;
    if (homeTeam?.id === myTeam.id) return false;
    if (m.away_team_id === myTeam.id) return true;
    if (!m.away_team_id) return true;
    return false;
  });

  const sentChallenges = typedMatches.filter((m) => {
    if (!myTeam || m.status !== "open") return false;
    return m.home_team?.id === myTeam.id;
  });

  const handleAccept = (matchId: string) => {
    if (!myTeam) return;
    acceptMatch.mutate({ matchId, awayTeamId: myTeam.id });
  };

  const [cancelMatchId, setCancelMatchId] = useState<string | null>(null);

  const handleDecline = (matchId: string) => {
    setCancelMatchId(matchId);
  };

  const confirmDecline = () => {
    if (!cancelMatchId) return;
    deleteMatchMut.mutate(cancelMatchId);
    setCancelMatchId(null);
  };

  const [rescheduleMatch, setRescheduleMatch] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleLocation, setRescheduleLocation] = useState("");

  const openReschedule = (m: any) => {
    const d = new Date(m.match_date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    setRescheduleDate(`${yyyy}-${mm}-${dd}`);
    setRescheduleTime(`${hh}:${mi}`);
    setRescheduleLocation(m.location || "");
    setRescheduleMatch(m);
  };

  const confirmReschedule = () => {
    if (!rescheduleMatch || !rescheduleDate || !rescheduleTime) return;
    const match_date = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
    updateMatchMut.mutate({ id: rescheduleMatch.id, match_date, location: rescheduleLocation });
    toast({ title: "Reagendamento proposto!", description: "Aguardando confirmação do adversário." });
    setRescheduleMatch(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-8 pb-4 flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="p-2 -ml-2 rounded-lg hover:bg-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div>
          <h1 className="text-2xl text-foreground font-display flex items-center gap-2">
            <Swords size={20} className="text-primary" /> DESAFIOS
          </h1>
          <p className="text-[11px] text-muted-foreground">Gerencie desafios recebidos e enviados</p>
        </div>
      </div>

      <div className="px-5 space-y-6">
        {/* RECEBIDOS */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Inbox size={14} className="text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recebidos ({receivedChallenges.length})
            </h2>
          </div>
          {receivedChallenges.length === 0 ? (
            <p className="text-xs text-muted-foreground bg-card border border-border rounded-lg p-4 text-center">
              Nenhum desafio recebido.
            </p>
          ) : (
            <div className="space-y-2">
              {receivedChallenges.map((m) => {
                const homeTeam = m.home_team;
                const date = new Date(m.match_date);
                return (
                  <div key={m.id} className="bg-card rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {homeTeam?.logo_url ? (
                          <img src={homeTeam.logo_url} alt={homeTeam.name} className="w-full h-full object-cover" />
                        ) : (
                          <Shield size={14} className="text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                          <span className="truncate">{homeTeam?.name || (m as any).home_team_name} desafiou</span>
                          {homeTeam?.id && (() => { const s = getTeamStats(homeTeam.id); return <NotaBadge nota={s.nota} played={s.played} />; })()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} ·{" "}
                          {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {m.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(m.id)}
                        disabled={acceptMatch.isPending}
                        className="flex-1 h-8 text-[11px] px-2 bg-gradient-primary text-primary-foreground border-0"
                      >
                        Aceitar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px] px-2" onClick={() => openReschedule(m)}>
                        Reagendar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-[11px] px-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={() => handleDecline(m.id)}
                      >
                        Cancelar
                      </Button>
                      {homeTeam?.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="basis-full h-8 text-[11px] px-2"
                          onClick={() => navigate(`/opponent-details?teamId=${homeTeam.id}`)}
                        >
                          Detalhes do time
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ENVIADOS */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Send size={14} className="text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Enviados ({sentChallenges.length})
            </h2>
          </div>
          {sentChallenges.length === 0 ? (
            <p className="text-xs text-muted-foreground bg-card border border-border rounded-lg p-4 text-center">
              Você ainda não enviou desafios.
            </p>
          ) : (
            <div className="space-y-2">
              {sentChallenges.map((m) => {
                const awayName = m.away_team?.name || (m as any).away_team_name || "Aguardando adversário";
                const date = new Date(m.match_date);
                return (
                  <div key={m.id} className="bg-card rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {m.away_team?.logo_url ? (
                          <img src={m.away_team.logo_url} alt={awayName} className="w-full h-full object-cover" />
                        ) : (
                          <Shield size={14} className="text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                          <span className="truncate">vs {awayName}</span>
                          {m.away_team?.id && (() => { const s = getTeamStats(m.away_team.id); return <NotaBadge nota={s.nota} played={s.played} />; })()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} ·{" "}
                          {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {m.location}
                        </p>
                        <p className="text-[9px] text-warning mt-0.5">Aguardando resposta</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px] px-2" onClick={() => openReschedule(m)}>
                        Reagendar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-[11px] px-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={() => handleDecline(m.id)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Reagendar partida */}
      <Dialog open={!!rescheduleMatch} onOpenChange={(open) => !open && setRescheduleMatch(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reagendar partida</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="rs-date">Data</Label>
              <Input id="rs-date" type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="rs-time">Horário</Label>
              <Input id="rs-time" type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="rs-loc">Local</Label>
              <Input id="rs-loc" value={rescheduleLocation} onChange={(e) => setRescheduleLocation(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleMatch(null)}>
              Cancelar
            </Button>
            <Button className="bg-gradient-primary text-primary-foreground border-0" onClick={confirmReschedule}>
              Propor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelMatchId} onOpenChange={(open) => !open && setCancelMatchId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar partida?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A partida será removida para os dois times.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDecline}
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default DesafiosPage;
