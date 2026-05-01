import { motion } from "framer-motion";
import { Shield, MapPin, ChevronRight, Bell, MessageCircle, Settings, Users, User, Bell as BellIcon, LogOut, Pencil, Eye, Check, X, UserCheck, ListChecks } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import PlayerSummons from "@/components/PlayerSummons";
import BottomNav from "@/components/BottomNav";
import { useMyTeam, useMatches, usePlayers, useMatchSummons, usePhotoPosts, useProfile } from "@/hooks/useSupabaseData";
import { mockDb } from "@/lib/mockDb";
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
  const { data: photoPosts = [] } = usePhotoPosts(myTeam?.id);
  const [selectedFeedPhoto, setSelectedFeedPhoto] = useState<any | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const { toast } = useToast();

  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 12 ? "Bom dia" : hours < 18 ? "Boa tarde" : "Boa noite";
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const playerName = profile?.nickname?.trim() || profile?.display_name?.split(" ")[0] || "Craque";
  const firstName = playerName;

  // Next upcoming match
  const nextMatch = matches
    .filter((m) => {
      const homeTeam = m.home_team as any;
      const awayTeam = m.away_team as any;
      return (
        new Date(m.match_date) >= now &&
        (m.status === "open" || m.status === "confirmed") &&
        myTeam &&
        (homeTeam?.id === myTeam.id || awayTeam?.id === myTeam.id)
      );
    })
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())[0];

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
  const nextMatchSummons: any[] = nextMatch ? mockDb.getSummons(nextMatch.id) : [];
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

  const handlePresence = (status: "confirmed" | "declined") => {
    if (!nextMatch) {
      toast({ title: "Sem partida agendada", variant: "destructive" });
      return;
    }
    if (!myPlayerForPresence) {
      toast({ title: "Você ainda não está vinculado a este time", variant: "destructive" });
      return;
    }
    const existing = summonByPlayerId.get(myPlayerForPresence.id);
    if (existing) {
      mockDb.respondSummon(existing.id, status);
    } else {
      // Create summon on the fly and immediately respond
      const created = mockDb.createSummons([
        { match_id: nextMatch.id, player_id: myPlayerForPresence.id, status: "pending" },
      ])[0];
      if (created) mockDb.respondSummon(created.id, status);
    }
    window.dispatchEvent(new CustomEvent("mock-db-change"));
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
              { icon: User, label: "Meus dados de jogador", desc: "Cadastrar, editar e excluir", path: "/profile" },
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
              onClick={() => { setSettingsOpen(false); navigate("/"); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors mt-4"
            >
              <LogOut size={16} />
              <span className="text-sm font-semibold">Sair da conta</span>
            </button>
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
            {myTeam && <p className="text-[10px] text-muted-foreground">{myTeam.name} · {myTeam.format}</p>}
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
            { value: `★${myTeam?.rating || "0"}`, label: "Avaliação" },
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
            {/* Presence buttons ABOVE next match card */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Button
                onClick={() => setConfirmOpen(true)}
                className="bg-gradient-primary text-primary-foreground border-0 font-semibold h-10"
              >
                <UserCheck size={14} className="mr-1" /> CONFIRMAR
              </Button>
              <Button
                onClick={() => setListOpen(true)}
                variant="outline"
                className="border-primary/40 text-primary font-semibold h-10"
              >
                <ListChecks size={14} className="mr-1" /> CONFIRMAÇÕES ({confirmedRoster.length})
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">
              Próximo • {dayLabel} {timeLabel}
            </p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      {myTeam?.logo_url ? (
                        <img src={myTeam.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <Shield size={18} className="text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-display text-foreground text-sm">{homeTeam?.name?.toUpperCase()}</p>
                      <p className="text-[9px] text-muted-foreground">Seu time</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground px-3">VS</span>
                  <div className="flex items-center gap-2 flex-1 justify-end text-right">
                    <div>
                      <p className="font-display text-foreground text-sm">{awayTeam?.name?.toUpperCase() || "???"}</p>
                      <p className="text-[9px] text-muted-foreground">Adversário</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Shield size={18} className="text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin size={10} /> {nextMatch.location}</span>
                  <span className="flex items-center gap-1"><Users size={10} /> {nextMatch.format}</span>
                  <span className={`ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                    nextMatch.status === "confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  }`}>
                    {nextMatch.status === "confirmed" ? "✓ Confirmado" : "Aberto"}
                  </span>
                </div>
              </div>
              {/* Chat link */}
              <button
                onClick={() => navigate(`/chat/${nextMatch.id}`)}
                className="w-full px-4 py-2 bg-secondary/50 border-t border-border flex items-center justify-between hover:bg-secondary/80 transition-colors"
              >
                <span className="text-[11px] text-primary font-semibold flex items-center gap-1">
                  <MessageCircle size={12} /> Ver chat da partida
                </span>
                <ChevronRight size={14} className="text-primary" />
              </button>
            </motion.div>

            {/* Action buttons - escalar / detalhar */}
            {isOwner && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  onClick={() => navigate(`/escalacao?matchId=${nextMatch.id}`)}
                  className="bg-gradient-primary text-primary-foreground border-0 font-semibold h-10"
                >
                  <Pencil size={14} className="mr-1" /> ESCALAR TIME
                </Button>
                <Button
                  onClick={() => navigate(`/agenda?matchId=${nextMatch.id}`)}
                  variant="outline"
                  className="border-primary/40 text-primary font-semibold h-10"
                >
                  <Eye size={14} className="mr-1" /> DETALHAR TIME
                </Button>
              </div>
            )}
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

      {/* Feed section */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-display text-foreground">FEED DO CAMPO</h2>
          <button onClick={() => navigate("/fotos")} className="text-[10px] text-primary font-semibold">Ver tudo →</button>
        </div>
        {photoPosts.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">Sem fotos publicadas ainda 📸</p>
            <p className="text-[10px] text-muted-foreground mt-1">Use o painel Admin para postar as fotos dos eventos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {photoPosts.slice(0, 3).map((post: any) => (
              <div key={post.id} className="bg-card rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setSelectedFeedPhoto(post)}
                  className="w-full bg-black/5"
                  aria-label={`Abrir foto do evento ${post.event_title}`}
                >
                  <img src={post.photo_url} alt={post.event_title} className="w-full max-h-[420px] object-contain" />
                </button>
                <div className="p-3">
                  <p className="text-[11px] uppercase tracking-wide text-primary font-semibold">{post.event_type}</p>
                  <p className="text-sm font-semibold text-foreground">{post.event_title}</p>
                  {post.comment && <p className="text-xs text-muted-foreground mt-1">{post.comment}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(post.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* No team CTA */}
      {!myTeam && (
        <div className="px-5 mt-5">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
            <p className="text-sm text-primary mb-2">Você ainda não tem um time!</p>
            <Button size="sm" onClick={() => navigate("/team")} className="bg-gradient-primary text-primary-foreground border-0">
              Criar Time
            </Button>
          </motion.div>
        </div>
      )}

      <Dialog open={!!selectedFeedPhoto} onOpenChange={(open) => !open && setSelectedFeedPhoto(null)}>
        <DialogContent className="max-w-3xl p-2 sm:p-3">
          {selectedFeedPhoto && (
            <img
              src={selectedFeedPhoto.photo_url}
              alt={selectedFeedPhoto.event_title}
              className="w-full max-h-[80vh] object-contain rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>

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
