import { motion } from "framer-motion";
import { Shield, MapPin, ChevronRight, Bell, MessageCircle, Settings, Users, User, Bell as BellIcon, LogOut, Pencil, Eye, Check, X, UserCheck, ListChecks, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useUpdateProfile } from "@/hooks/useSupabaseData";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import PlayerSummons from "@/components/PlayerSummons";
import BottomNav from "@/components/BottomNav";
import { useMyTeam, useMatches, usePlayers, useMatchSummons, useProfile, useCreateSummons } from "@/hooks/useSupabaseData";
import { getTeamStats } from "@/lib/stats";
import NotaBadge from "@/components/NotaBadge";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { useState } from "react";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Index = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: myTeam } = useMyTeam();
  const { data: matches = [] } = useMatches();
  const { data: players = [] } = usePlayers(myTeam?.id);
  const { data: summons = [] } = useMatchSummons(undefined);
  const createSummons = useCreateSummons();
  const updateProfile = useUpdateProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const { toast } = useToast();

  const handleDeactivate = async () => {
    await updateProfile.mutate({ display_name: "[Conta Desativada]", avatar_url: "" });
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    toast({ title: "Conta desativada" });
    navigate("/auth", { replace: true });
  };


  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 12 ? "Bom dia" : hours < 18 ? "Boa tarde" : "Boa noite";
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const playerName = profile?.nickname?.trim() || profile?.display_name?.split(" ")[0] || "Craque";
  const firstName = playerName;

  // Next upcoming match — also keeps finalized matches visible for 24h
  const DAY_MS = 24 * 60 * 60 * 1000;
  const nextMatch = matches
    .filter((m) => {
      const homeTeam = m.home_team as any;
      const awayTeam = m.away_team as any;
      if (!myTeam || !(homeTeam?.id === myTeam.id || awayTeam?.id === myTeam.id)) return false;
      const md = new Date(m.match_date).getTime();
      if (m.status === "completed") {
        return now.getTime() - md <= DAY_MS;
      }
      return new Date(m.match_date) >= now && (m.status === "open" || m.status === "confirmed");
    })
    .sort((a, b) => {
      // upcoming first by date asc; completed (recent) shown if no upcoming
      const aCompleted = a.status === "completed" ? 1 : 0;
      const bCompleted = b.status === "completed" ? 1 : 0;
      if (aCompleted !== bCompleted) return aCompleted - bCompleted;
      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
    })[0];

  // Player stats
  const myPlayer = players.find((p) => p.user_id === profile?.user_id);
  const playerStats = {
    matches: myPlayer?.matches || 0,
    goals: myPlayer?.goals || 0,
    rating: myPlayer?.rating || 0,
  };

  const pendingSummons = summons.filter((s: any) => s.status === "pending").length;

  // Is owner
  const isOwner = myTeam && profile && myTeam.owner_id === profile.user_id;

  // Presence: every active team player is implicitly summoned. We just track responses.
  const teamPlayers = players;
  const nextMatchSummons: any[] = nextMatch
    ? summons.filter((s: any) => s.match_id === nextMatch.id)
    : [];
  const summonByPlayerId = new Map(nextMatchSummons.map((s: any) => [s.player_id, s]));

  // Build a unified roster with status (confirmed | declined | pending) for each active player
  const roster = teamPlayers.map((p: any) => {
    const s = summonByPlayerId.get(p.id);
    return { player: p, status: (s?.status as "confirmed" | "declined" | "pending") || "pending", summon: s };
  });
  const confirmedRoster = roster.filter((r) => r.status === "confirmed");
  const declinedRoster = roster.filter((r) => r.status === "declined");
  const pendingRoster = roster.filter((r) => r.status === "pending");

  const myPlayerForPresence = teamPlayers.find((p: any) => p.user_id === profile?.user_id);
  const myCurrentStatus = myPlayerForPresence
    ? (summonByPlayerId.get(myPlayerForPresence.id)?.status as "confirmed" | "declined" | undefined)
    : undefined;

  const handlePresence = async (status: "confirmed" | "declined") => {
    if (!nextMatch) {
      toast({ title: "Sem partida agendada", variant: "destructive" });
      return;
    }
    if (!myPlayerForPresence) {
      toast({ title: "Você ainda não está vinculado a este time", variant: "destructive" });
      return;
    }
    await createSummons.mutateAsync({
      matchId: nextMatch.id,
      playerId: myPlayerForPresence.id,
      status,
    });
    toast({ title: status === "confirmed" ? "Presença confirmada! ✅" : "Ausência registrada" });
    setConfirmOpen(false);
  };


  // Team season stats
  const myMatches = matches.filter((m) => {
    const homeTeam = m.home_team as any;
    return myTeam && homeTeam?.id === myTeam.id;
  });
  const completedMatches = myMatches.filter((m) => m.status === "completed");
  const wins = completedMatches.filter((m) => (m.home_score || 0) > (m.away_score || 0)).length;
  const draws = completedMatches.filter((m) => m.home_score === m.away_score).length;
  const losses = completedMatches.length - wins - draws;
  const teamStats = myTeam ? getTeamStats(myTeam.id) : { played: 0, points: 0, maxPoints: 0, nota: 0 };



  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Status bar */}
      <div className="px-5 pt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-semibold">{timeStr}</span>
        <div className="flex items-center gap-3">
          {pendingSummons > 0 && (
            <div className="relative">
              <Bell size={18} className="text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                {pendingSummons}
              </span>
            </div>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Configurações"
            className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:border-primary/40 transition-colors"
          >
            <Settings size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Settings quick menu */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-[85vw] sm:max-w-sm bg-background border-border">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">CONFIGURAÇÕES</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {[
              { icon: User, label: "Meus dados", desc: "Cadastrar, editar e excluir", path: "/profile" },
              { icon: Users, label: "Meus Times", desc: "Times em que você joga", path: "/team" },
              { icon: BellIcon, label: "Notificações", desc: "Avisos do app e do administrador", path: "/notifications" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { setSettingsOpen(false); navigate(item.path); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            ))}
            <button
              onClick={async () => {
                setSettingsOpen(false);
                const { supabase } = await import("@/integrations/supabase/client");
                await supabase.auth.signOut();
                navigate("/auth", { replace: true });
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors mt-4"
            >
              <LogOut size={16} />
              <span className="text-sm font-semibold">Sair da conta</span>
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={14} />
                  <span className="font-semibold">Desativar minha conta</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Desativar conta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação vai desativar seu perfil. Você poderá cadastrar novamente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => { setSettingsOpen(false); await handleDeactivate(); }}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Desativar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SheetContent>
      </Sheet>

      {/* Greeting + Avatar */}
      <div className="px-5 pt-3 pb-2">
        <p className="text-sm text-muted-foreground">{greeting}, craque! ⚽</p>
        <div className="flex items-center gap-3 mt-2">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-xl shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={firstName} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              getInitials(firstName)
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl text-foreground font-display tracking-wide">{firstName.toUpperCase()}</h1>
            {myTeam && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                <span>{myTeam.name} · {myTeam.format}</span>
                <NotaBadge nota={teamStats.nota} played={teamStats.played} />
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Player Stats */}
      <div className="px-5 mt-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: playerStats.matches, label: "Partidas" },
            { value: playerStats.goals, label: "Gols" },
            { value: myMatches.length, label: "Jogos temporada", sub: `${wins}V ${draws}E ${losses}D` },
            { value: teamStats.played > 0 ? teamStats.nota.toFixed(1) : "—", label: "Nota Time" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border p-2.5 text-center"
            >
              <p className="text-lg font-bold text-foreground font-display">{stat.value}</p>
              <p className="text-[9px] text-muted-foreground font-semibold">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Next Match Card */}
      {nextMatch && (() => {
        const homeTeam = nextMatch.home_team as any;
        const awayTeam = nextMatch.away_team as any;
        const matchDate = new Date(nextMatch.match_date);
        const dayLabel = matchDate.toLocaleDateString("pt-BR", { weekday: "short" });
        const timeLabel = matchDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        return (
          <div className="px-5 mt-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                      {myTeam?.logo_url ? (
                        <img src={myTeam.logo_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                      ) : (
                        <Shield size={28} className="text-primary" />
                      )}
                    </div>
                    <p className="font-display text-foreground text-sm text-center">{homeTeam?.name?.toUpperCase()}</p>
                    {(() => {
                      const s = homeTeam?.id ? getTeamStats(homeTeam.id) : { nota: 0, played: 0 };
                      return <NotaBadge nota={s.nota} played={s.played} />;
                    })()}
                  </div>
                  <div className="flex flex-col items-center gap-2 px-3">
                    <span className="text-xs font-bold text-muted-foreground">VS</span>
                    <div className="text-[10px] text-muted-foreground text-center whitespace-nowrap">
                      <p className="font-semibold">{matchDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</p>
                      <p>{matchDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                      <Shield size={28} className="text-muted-foreground" />
                    </div>
                    <p className="font-display text-foreground text-sm text-center">{awayTeam?.name?.toUpperCase() || "???"}</p>
                    {(() => {
                      const s = awayTeam?.id ? getTeamStats(awayTeam.id) : { nota: 0, played: 0 };
                      return <NotaBadge nota={s.nota} played={s.played} />;
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin size={10} /> {nextMatch.location}</span>
                  <span className={`ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                    nextMatch.status === "completed" ? "bg-muted text-muted-foreground" :
                    nextMatch.status === "confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  }`}>
                    {nextMatch.status === "completed" ? "🏁 Finalizado" : nextMatch.status === "confirmed" ? "✓ Confirmado" : "Aberto"}
                  </span>
                </div>

                {nextMatch.status === "completed" && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <span className="text-2xl font-display text-foreground">{nextMatch.home_score ?? 0}</span>
                      <span className="text-xs text-muted-foreground">x</span>
                      <span className="text-2xl font-display text-foreground">{nextMatch.away_score ?? 0}</span>
                    </div>
                    {(() => {
                      const evs = ((nextMatch as any).events || []).filter((e: any) => e.type === "goal" || e.type === "own_goal");
                      if (!evs.length) return null;
                      return (
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {evs.map((e: any) => {
                            const p = players.find((pl: any) => pl.id === e.player_id);
                            const name = p?.nickname || p?.name || "Jogador";
                            return (
                              <span key={e.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                                {e.type === "own_goal" ? "🥅" : "⚽"} {name}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Detalhes da partida - fora do card */}
            <button
              onClick={() => navigate(`/chat/${nextMatch.id}`)}
              className="w-full mt-2 px-4 py-2.5 rounded-xl bg-card border border-border flex items-center justify-between hover:border-primary/40 transition-colors"
            >
              <span className="text-[11px] text-primary font-semibold flex items-center gap-1">
                <MessageCircle size={12} /> Detalhes da partida
              </span>
              <ChevronRight size={14} className="text-primary" />
            </button>

          </div>
        );
      })()}

      {/* Scheduled matches list moved to /agenda */}

      {/* Presence / Summons */}
      {myTeam && summons.length > 0 && (
        <div className="px-5 mt-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-display text-foreground">PRESENÇA — {myTeam.name.toUpperCase()}</h2>
            <button onClick={() => navigate("/agenda")} className="text-[10px] text-primary font-semibold">
              Ver escalação →
            </button>
          </div>
          <PlayerSummons />
        </div>
      )}

      {/* Feed do Campo movido para "Resenha da Várzea" no botão + da barra inferior */}

      {/* No team CTA */}
      {!myTeam && (
        <div className="px-5 mt-5">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
            <p className="text-sm text-primary mb-2">Você ainda não pertence a nenhum time.</p>
          </motion.div>
        </div>
      )}



      {/* Confirm presence dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">CONFIRMAR PRESENÇA</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {nextMatch
              ? `Você estará presente na partida do dia ${new Date(nextMatch.match_date).toLocaleDateString("pt-BR")}?`
              : "Sem partida agendada."}
          </p>
          {myCurrentStatus && (
            <p className="text-[11px] text-primary font-semibold">
              Status atual: {myCurrentStatus === "confirmed" ? "✓ Confirmado" : "✗ Ausente"}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button
              onClick={() => handlePresence("confirmed")}
              className="bg-success text-success-foreground hover:bg-success/90 font-semibold h-11"
            >
              <Check size={16} className="mr-1" /> CONFIRMADO
            </Button>
            <Button
              onClick={() => handlePresence("declined")}
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold h-11"
            >
              <X size={16} className="mr-1" /> AUSENTE
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmations list dialog */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="bg-card border-border max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">CONFIRMAÇÕES</DialogTitle>
          </DialogHeader>

          <div>
            <p className="text-[11px] font-semibold text-success uppercase tracking-wider mb-2">
              ✓ Confirmados ({confirmedRoster.length})
            </p>
            {confirmedRoster.length === 0 ? (
              <p className="text-xs text-muted-foreground mb-3">Ninguém confirmado ainda.</p>
            ) : (
              <ul className="space-y-1 mb-3">
                {confirmedRoster.map((r) => (
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
                {declinedRoster.map((r) => (
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
                {pendingRoster.map((r) => (
                  <li key={r.player.id} className="text-sm text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-1.5">
                    {r.player?.nickname || r.player?.name || "Jogador"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Index;
