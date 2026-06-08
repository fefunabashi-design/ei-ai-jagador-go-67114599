import { motion } from "framer-motion";
import { Shield, MapPin, ChevronRight, Bell, MessageCircle, Settings, Users, User, Bell as BellIcon, LogOut, Pencil, Eye, Check, X, UserCheck, ListChecks, Trash2, Share2, Instagram } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useUpdateProfile } from "@/hooks/useSupabaseData";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import PlayerSummons from "@/components/PlayerSummons";
import BottomNav from "@/components/BottomNav";
import { useMyTeam, useMyTeams, useMatches, usePlayers, useMatchSummons, useProfile, useCreateSummons, useCreateResenhaPost } from "@/hooks/useSupabaseData";
import { generateMatchShareImage } from "@/lib/matchShareImage";
import { getTeamStats } from "@/lib/stats";
import { getMatchView } from "@/lib/matchView";
import NotaBadge from "@/components/NotaBadge";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Index = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: myTeam, isLoading: teamLoading } = useMyTeam();
  const { data: myTeams = [] } = useMyTeams();
  const { data: matches = [] } = useMatches();
  const { data: players = [] } = usePlayers(myTeam?.id);
  const { data: summons = [] } = useMatchSummons(undefined);
  const createSummons = useCreateSummons();
  const createResenhaPost = useCreateResenhaPost();
  const updateProfile = useUpdateProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const { toast } = useToast();

  const handleDeactivate = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    try {
      const { error } = await supabase.functions.invoke("deactivate-account");
      if (error) throw error;
    } catch (e) {
      toast({ title: "Erro ao desativar", description: String((e as any)?.message || e), variant: "destructive" });
      return;
    }
    await supabase.auth.signOut();
    toast({ title: "Conta desativada", description: "Essa ação desativou seu perfil. Você poderá cadastrar novamente." });
    navigate("/auth", { replace: true });
  };


  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 12 ? "Bom dia" : hours < 18 ? "Boa tarde" : "Boa noite";
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const playerName = profile?.nickname?.trim() || profile?.display_name?.split(" ")[0] || "Craque";
  const firstName = playerName;

  // Cards visíveis na tela inicial: próximos jogos + finalizados nas últimas 24h
  const DAY_MS = 24 * 60 * 60 * 1000;
  const relevantMatches = matches
    .filter((m) => {
      const homeTeam = m.home_team as any;
      const awayTeam = m.away_team as any;
      if (!myTeam || !(homeTeam?.id === myTeam.id || awayTeam?.id === myTeam.id)) return false;
      const md = new Date(m.match_date).getTime();
      const v = getMatchView(m, myTeam?.id);
      if (v.status === "completed") return now.getTime() - md <= DAY_MS;
      return new Date(m.match_date) >= now && (v.status === "open" || v.status === "confirmed");
    })
    .sort((a, b) => {
      const aCompleted = getMatchView(a, myTeam?.id).status === "completed" ? 1 : 0;
      const bCompleted = getMatchView(b, myTeam?.id).status === "completed" ? 1 : 0;
      if (aCompleted !== bCompleted) return aCompleted - bCompleted;
      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
    });
  const nextMatch = relevantMatches.find((m) => getMatchView(m, myTeam?.id).status !== "completed") || relevantMatches[0];

  // Carrega eventos + jogadores dos dois times para cada partida finalizada exibida
  const [matchExtras, setMatchExtras] = useState<Record<string, { events: any[]; playerMap: Map<string, any> }>>({});
  const completedIdsKey = relevantMatches.filter((m) => getMatchView(m, myTeam?.id).status === "completed").map((m) => m.id).join(",");
  useEffect(() => {
    const completed = relevantMatches.filter((m) => getMatchView(m, myTeam?.id).status === "completed");
    if (!completed.length) { setMatchExtras({}); return; }
    let alive = true;
    (async () => {
      const ids = completed.map((m) => m.id);
      const teamIds = Array.from(new Set(
        completed.flatMap((m) => [(m.home_team as any)?.id, (m.away_team as any)?.id].filter(Boolean))
      ));
      const [evRes, plRes] = await Promise.all([
        supabase.from("match_events").select("*").in("match_id", ids),
        teamIds.length
          ? supabase.from("players").select("id, name, nickname, team_id").in("team_id", teamIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const playerMap = new Map<string, any>();
      ((plRes as any).data || []).forEach((p: any) => playerMap.set(p.id, p));
      const extras: Record<string, { events: any[]; playerMap: Map<string, any> }> = {};
      completed.forEach((m) => {
        extras[m.id] = {
          events: ((evRes as any).data || []).filter((e: any) => e.match_id === m.id),
          playerMap,
        };
      });
      if (alive) setMatchExtras(extras);
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedIdsKey]);

  const [detailsMatchId, setDetailsMatchId] = useState<string | null>(null);

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


  // Aggregate season stats across ALL teams the user belongs to
  const myTeamIds = new Set((myTeams || []).map((t: any) => t.id));
  const allMyMatches = matches.filter((m) => {
    const homeTeam = m.home_team as any;
    const awayTeam = m.away_team as any;
    return (homeTeam?.id && myTeamIds.has(homeTeam.id)) || (awayTeam?.id && myTeamIds.has(awayTeam.id));
  });
  const completedAllMatches = allMyMatches.filter((m) => getMatchView(m, myTeam?.id).status === "completed");

  // Backward-compatible (current active team) — used elsewhere on the page
  const myMatches = matches.filter((m) => {
    const homeTeam = m.home_team as any;
    const awayTeam = m.away_team as any;
    return myTeam && (homeTeam?.id === myTeam.id || awayTeam?.id === myTeam.id);
  });

  // Per-team breakdown for the 4 stat cards
  const perTeamStats = (myTeams || []).map((t: any) => {
    const teamMatches = completedAllMatches.filter((m) => {
      const h = m.home_team as any; const a = m.away_team as any;
      return h?.id === t.id || a?.id === t.id;
    });
    const jogos = teamMatches.length;
    return { teamId: t.id, teamName: t.name, logo: t.logo_url, jogos, gols: 0 };
  });

  // Gols temporada — apenas gols nominalmente atribuídos ao usuário na finalização das partidas
  const [golsTemporada, setGolsTemporada] = useState(0);
  useEffect(() => {
    const uid = profile?.user_id;
    if (!uid) { setGolsTemporada(0); return; }
    let alive = true;
    (async () => {
      const { data: myPlayers = [] } = await supabase
        .from("players").select("id").eq("user_id", uid);
      const ids = (myPlayers || []).map((p: any) => p.id);
      if (!ids.length) { if (alive) setGolsTemporada(0); return; }
      const { count } = await supabase
        .from("match_events")
        .select("id", { count: "exact", head: true })
        .eq("type", "goal")
        .in("player_id", ids);
      if (alive) setGolsTemporada(count || 0);
    })();
    return () => { alive = false; };
  }, [profile?.user_id, completedAllMatches.length]);

  const jogosTemporada = perTeamStats.reduce((a, s) => a + s.jogos, 0);

  // Lembretes — mensalidades em atraso + vaquinhas pendentes — para TODOS os times
  type LembreteMens = { playerId: string; playerName: string; mes: number };
  type LembreteVaq = { matchId: string; label: string; playerName: string; amount: number };
  type LembreteTeam = { mens: LembreteMens[]; vaq: LembreteVaq[] };
  const [lembretes, setLembretes] = useState(0);
  const [lembretesPerTeam, setLembretesPerTeam] = useState<Record<string, LembreteTeam>>({});
  useEffect(() => {
    const teamIds = Array.from(myTeamIds);
    if (!teamIds.length) { setLembretes(0); setLembretesPerTeam({}); return; }
    let alive = true;
    (async () => {
      const now = new Date();
      const ano = now.getFullYear();
      const mesAtual = now.getMonth() + 1;

      // Players of all teams
      const { data: allPlayers = [] } = await supabase
        .from("players").select("id, team_id, name").in("team_id", teamIds);
      const playersByTeam = new Map<string, { id: string; name: string }[]>();
      const playerById = new Map<string, { id: string; name: string; team_id: string }>();
      (allPlayers || []).forEach((p: any) => {
        const arr = playersByTeam.get(p.team_id) || [];
        arr.push({ id: p.id, name: p.name });
        playersByTeam.set(p.team_id, arr);
        playerById.set(p.id, p);
      });
      const allPlayerIds = (allPlayers || []).map((p: any) => p.id);

      const mensList: LembreteMens[] = [];
      const mensByTeam = new Map<string, LembreteMens[]>();
      if (allPlayerIds.length) {
        const { data: mens = [] } = await supabase
          .from("mensalidades")
          .select("id, pago, mes, ano, player_id")
          .in("player_id", allPlayerIds)
          .eq("ano", ano)
          .lte("mes", mesAtual);
        (mens || []).filter((m: any) => !m.pago).forEach((m: any) => {
          const p = playerById.get(m.player_id);
          if (!p) return;
          const item = { playerId: m.player_id, playerName: p.name, mes: m.mes };
          mensList.push(item);
          const arr = mensByTeam.get(p.team_id) || [];
          arr.push(item);
          mensByTeam.set(p.team_id, arr);
        });
      }

      const matchById = new Map<string, any>();
      allMyMatches.forEach((m) => matchById.set(m.id, m));
      const matchIds = allMyMatches.map((m) => m.id);
      const matchToTeamSide = new Map<string, string[]>();
      allMyMatches.forEach((m) => {
        const tids: string[] = [];
        const h = m.home_team as any; const a = m.away_team as any;
        if (h?.id && myTeamIds.has(h.id)) tids.push(h.id);
        if (a?.id && myTeamIds.has(a.id)) tids.push(a.id);
        matchToTeamSide.set(m.id, tids);
      });

      const vaqByTeam = new Map<string, LembreteVaq[]>();
      if (matchIds.length) {
        const { data: pays = [] } = await supabase
          .from("match_payments")
          .select("id, status, match_id, player_id, amount")
          .in("match_id", matchIds)
          .eq("status", "pending");
        (pays || []).forEach((p: any) => {
          const tids = matchToTeamSide.get(p.match_id) || [];
          const m = matchById.get(p.match_id);
          const home = (m?.home_team as any)?.name || "Time";
          const away = (m?.away_team as any)?.name || "Adversário";
          const dt = m ? new Date(m.match_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";
          const label = `${home} x ${away}${dt ? ` • ${dt}` : ""}`;
          const playerName = playerById.get(p.player_id)?.name || "Jogador";
          tids.forEach((tid) => {
            const arr = vaqByTeam.get(tid) || [];
            arr.push({ matchId: p.match_id, label, playerName, amount: Number(p.amount || 0) });
            vaqByTeam.set(tid, arr);
          });
        });
      }

      const perTeam: Record<string, LembreteTeam> = {};
      teamIds.forEach((tid) => {
        perTeam[tid] = {
          mens: mensByTeam.get(tid) || [],
          vaq: vaqByTeam.get(tid) || [],
        };
      });
      const total = Object.values(perTeam).reduce((acc, v) => acc + v.mens.length + v.vaq.length, 0);
      if (alive) { setLembretes(total); setLembretesPerTeam(perTeam); }
    })();
    return () => { alive = false; };
  }, [Array.from(myTeamIds).join(","), allMyMatches.length]);

  const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];


  // Stat detail dialog
  type StatKey = "jogos" | "gols" | "lembretes";
  const [statDetail, setStatDetail] = useState<StatKey | null>(null);
  const statDetailLabels: Record<StatKey, string> = {
    jogos: "Jogos da temporada",
    gols: "Gols da temporada",
    lembretes: "Lembretes",
  };






  if (profileLoading || !profile || teamLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">

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

      <div className="relative px-5 pt-3 pb-4">
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">{greeting}, craque! ⚽</p>
            {pendingSummons > 0 && (
              <div className="relative">
                <Bell size={18} className="text-muted-foreground" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                  {pendingSummons}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-[60px] h-[60px] rounded-full overflow-hidden bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-2xl shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={firstName} className="w-[60px] h-[60px] rounded-full object-cover" />
              ) : (
                getInitials(firstName)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl text-foreground font-display tracking-wide truncate">{firstName.toUpperCase()}</h1>
              <button
                onClick={() => setSettingsOpen(true)}
                aria-label="Editar"
                className="mt-1 text-xs text-primary font-semibold hover:underline"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Team Season Stats */}
      <div className="px-5 mt-3">
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "jogos" as StatKey, value: jogosTemporada, label: "Jogos temporada" },
            { key: "gols" as StatKey, value: golsTemporada, label: "Gols temporada" },
            { key: "lembretes" as StatKey, value: lembretes, label: "Lembretes", highlight: lembretes > 0 },
          ]).map((stat, i) => (
            <motion.button
              key={stat.label}
              type="button"
              onClick={() => setStatDetail(stat.key)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card rounded-lg border p-1 text-center hover:border-primary/40 transition-colors ${stat.highlight ? "border-destructive/50" : "border-border"}`}
            >
              <p className={`text-xs font-bold font-display leading-tight ${stat.highlight ? "text-destructive" : "text-foreground"}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground font-semibold leading-tight">{stat.label}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stat detail dialog — per-team breakdown */}
      <Dialog open={statDetail !== null} onOpenChange={(o) => !o && setStatDetail(null)}>
        <DialogContent className="bg-card border-border max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {statDetail ? statDetailLabels[statDetail] : ""}
            </DialogTitle>
          </DialogHeader>


          {/* Jogos / Gols: total por time */}
          {(statDetail === "jogos" || statDetail === "gols") && (
            <div className="space-y-2">
              {perTeamStats.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Você ainda não está vinculado a nenhum time.
                </p>
              )}
              {perTeamStats.map((s) => {
                const value = statDetail === "jogos" ? s.jogos : s.gols;
                return (
                  <div
                    key={s.teamId}
                    className="flex items-center gap-3 p-2 rounded-lg border border-border bg-background"
                  >
                    {s.logo ? (
                      <img src={s.logo} alt="" className="h-8 w-8 object-contain rounded" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                        <Shield size={14} className="text-primary" />
                      </div>
                    )}
                    <p className="flex-1 min-w-0 text-sm font-semibold text-foreground truncate">{s.teamName}</p>
                    <p className="text-lg font-display text-foreground">{value}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lembretes: detalhe item a item */}
          {statDetail === "lembretes" && (
            <div className="space-y-3">
              {perTeamStats.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Você ainda não está vinculado a nenhum time.
                </p>
              )}
              {perTeamStats.map((s) => {
                const lt = lembretesPerTeam[s.teamId] || { mens: [], vaq: [] };
                const total = lt.mens.length + lt.vaq.length;

                // Agrupa mensalidades por jogador
                const mensByPlayer = new Map<string, { name: string; meses: number[] }>();
                lt.mens.forEach((m) => {
                  const e = mensByPlayer.get(m.playerId) || { name: m.playerName, meses: [] };
                  e.meses.push(m.mes);
                  mensByPlayer.set(m.playerId, e);
                });

                // Agrupa vaquinhas por partida
                const vaqByMatch = new Map<string, { label: string; players: string[]; total: number }>();
                lt.vaq.forEach((v) => {
                  const e = vaqByMatch.get(v.matchId) || { label: v.label, players: [], total: 0 };
                  e.players.push(v.playerName);
                  e.total += v.amount;
                  vaqByMatch.set(v.matchId, e);
                });

                return (
                  <div key={s.teamId} className="rounded-lg border border-border bg-background p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {s.logo ? (
                        <img src={s.logo} alt="" className="h-7 w-7 object-contain rounded" />
                      ) : (
                        <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center">
                          <Shield size={12} className="text-primary" />
                        </div>
                      )}
                      <p className="flex-1 text-sm font-semibold text-foreground truncate">{s.teamName}</p>
                      <span className={`text-sm font-display ${total > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {total}
                      </span>
                    </div>

                    {total === 0 && (
                      <p className="text-[11px] text-muted-foreground">Sem pendências 🎉</p>
                    )}

                    {mensByPlayer.size > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                          Mensalidades em atraso
                        </p>
                        {Array.from(mensByPlayer.values()).map((e, idx) => (
                          <button
                            key={idx}
                            onClick={() => { setStatDetail(null); navigate("/mensalidades"); }}
                            className="w-full flex items-start gap-2 text-left p-2 rounded-md bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors"
                          >
                            <span className="text-xs font-semibold text-foreground flex-1 truncate">{e.name}</span>
                            <span className="text-[10px] text-destructive font-medium">
                              {e.meses.sort((a, b) => a - b).map((m) => MONTHS_SHORT[m - 1]).join(", ")}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {vaqByMatch.size > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                          Vaquinhas pendentes
                        </p>
                        {Array.from(vaqByMatch.entries()).map(([mid, e]) => (
                          <button
                            key={mid}
                            onClick={() => { setStatDetail(null); navigate(`/match/${mid}`); }}
                            className="w-full text-left p-2 rounded-md bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors"
                          >
                            <p className="text-xs font-semibold text-foreground truncate">{e.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {e.players.length} jogador(es) • R$ {e.total.toFixed(2).replace(".", ",")}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>




      {/* Match cards carousel — próximos jogos + finalizados (24h) */}
      {relevantMatches.length > 0 && (
        <div className="mt-4">
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-5 pb-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
            {relevantMatches.map((m) => {
              const homeTeam = m.home_team as any;
              const awayTeam = m.away_team as any;
              const matchDate = new Date(m.match_date);
              const extras = matchExtras[m.id];
              const goals = (extras?.events || []).filter((e: any) => e.type === "goal" || e.type === "own_goal");
              const mView = getMatchView(m, myTeam?.id);
              const shareText = mView.status === "completed"
                ? `🏁 ${homeTeam?.name || "Mandante"} ${mView.homeScore ?? 0} x ${mView.awayScore ?? 0} ${awayTeam?.name || "Visitante"}\n📅 ${matchDate.toLocaleDateString("pt-BR")}\n📍 ${(homeTeam as any)?.field_name || m.location}`
                : `⚽ Próxima partida: ${homeTeam?.name || "Meu time"} x ${awayTeam?.name || "Adversário"}\n📅 ${matchDate.toLocaleDateString("pt-BR")} às ${matchDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}\n📍 ${m.location}`;

              const handleResenha = async () => {
                try {
                  toast({ title: "Gerando imagem da partida..." });
                  const blob = await generateMatchShareImage({
                    homeName: homeTeam?.name,
                    awayName: awayTeam?.name,
                    homeLogoUrl: homeTeam?.logo_url,
                    awayLogoUrl: awayTeam?.logo_url,
                    matchDate,
                    location: (homeTeam as any)?.field_name || m.location,
                  });
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) throw new Error("Sessão expirada. Faça login novamente.");
                  const path = `${user.id}/match-share/${m.id}-${Date.now()}.png`;
                  const { error: upErr } = await supabase.storage.from("post-media").upload(path, blob, {
                    contentType: "image/png", upsert: true,
                  });
                  if (upErr) throw upErr;
                  const { data: pub } = supabase.storage.from("post-media").getPublicUrl(path);
                  await createResenhaPost.mutateAsync({
                    photo_url: pub.publicUrl,
                    caption: shareText,
                    match_id: m.id,
                    match_label: `${homeTeam?.name || "Time"} vs ${awayTeam?.name || "Adversário"}`,
                    team_id: myTeam?.id || null,
                  });
                  toast({ title: "Publicado na Resenha da Várzea! 🎉" });
                  navigate("/resenha");
                } catch (e: any) {
                  toast({ title: "Erro ao publicar", description: e?.message, variant: "destructive" });
                }
              };

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="snap-center shrink-0 w-[calc(100vw-2.5rem)] max-w-[420px] bg-card rounded-2xl border border-border overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                          {homeTeam?.logo_url ? (
                            <img src={homeTeam.logo_url} alt="" loading="eager" className="w-14 h-14 rounded-lg object-contain bg-card" />
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
                        {mView.status === "completed" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-display text-foreground leading-none">{mView.homeScore ?? 0}</span>
                            <span className="text-xs text-muted-foreground">x</span>
                            <span className="text-2xl font-display text-foreground leading-none">{mView.awayScore ?? 0}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">VS</span>
                        )}
                        <div className="text-[10px] text-muted-foreground text-center whitespace-nowrap">
                          <p className="font-semibold">{matchDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</p>
                          <p>{matchDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                          <p className="mt-2 flex items-center justify-center gap-1"><MapPin size={10} /> {(homeTeam as any)?.field_name || m.location}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                          {awayTeam?.logo_url ? (
                            <img src={awayTeam.logo_url} alt="" loading="eager" className="w-14 h-14 rounded-lg object-contain bg-card" />
                          ) : (
                            <Shield size={28} className="text-muted-foreground" />
                          )}
                        </div>
                        <p className="font-display text-foreground text-sm text-center">{awayTeam?.name?.toUpperCase() || "???"}</p>
                        {(() => {
                          const s = awayTeam?.id ? getTeamStats(awayTeam.id) : { nota: 0, played: 0 };
                          return <NotaBadge nota={s.nota} played={s.played} />;
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                      <span className={`ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                        mView.status === "completed" ? "bg-muted text-muted-foreground" :
                        mView.status === "confirmed" ? "bg-success/10 text-success" :
                        mView.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                      }`}>
                        {mView.status === "completed" ? "🏁 Finalizado" : mView.status === "confirmed" ? "✓ Confirmado" : mView.status === "cancelled" ? "✕ Cancelado" : "Aberto"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 px-2 rounded-md"
                        onClick={() => mView.status === "completed" ? setDetailsMatchId(m.id) : navigate(`/match/${m.id}`)}
                      >
                        <MessageCircle size={10} className="mr-1" /> Detalhes
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 rounded-md">
                            <Share2 size={10} className="mr-1" /> Compartilhar
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={async () => {
                            try {
                              toast({ title: "Gerando imagem..." });
                              const blob = await generateMatchShareImage({
                                homeName: homeTeam?.name,
                                awayName: awayTeam?.name,
                                homeLogoUrl: homeTeam?.logo_url,
                                awayLogoUrl: awayTeam?.logo_url,
                                matchDate,
                                location: (homeTeam as any)?.field_name || m.location,
                              });
                              const file = new File([blob], `partida-${m.id}.png`, { type: "image/png" });
                              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                await navigator.share({ files: [file], text: shareText, title: "Próxima partida" });
                              } else {
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url; a.download = file.name; a.click();
                                URL.revokeObjectURL(url);
                                window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
                                toast({ title: "Imagem baixada", description: "Anexe a imagem no WhatsApp." });
                              }
                            } catch (e: any) {
                              toast({ title: "Erro ao compartilhar", description: e?.message, variant: "destructive" });
                            }
                          }}>
                            <MessageCircle size={14} className="mr-2" /> WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            try {
                              toast({ title: "Gerando imagem..." });
                              const blob = await generateMatchShareImage({
                                homeName: homeTeam?.name,
                                awayName: awayTeam?.name,
                                homeLogoUrl: homeTeam?.logo_url,
                                awayLogoUrl: awayTeam?.logo_url,
                                matchDate,
                                location: (homeTeam as any)?.field_name || m.location,
                              });
                              const file = new File([blob], `partida-${m.id}.png`, { type: "image/png" });
                              try { await navigator.clipboard.writeText(shareText); } catch {}
                              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                await navigator.share({ files: [file], text: shareText, title: "Próxima partida" });
                              } else {
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url; a.download = file.name; a.click();
                                URL.revokeObjectURL(url);
                                window.open("https://www.instagram.com/", "_blank");
                                toast({ title: "Imagem baixada", description: "Abra o Instagram e publique a imagem (texto já copiado)." });
                              }
                            } catch (e: any) {
                              toast({ title: "Erro ao compartilhar", description: e?.message, variant: "destructive" });
                            }
                          }}>
                            <Instagram size={14} className="mr-2" /> Instagram
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleResenha}>
                            <Users size={14} className="mr-2" /> Resenha da Várzea
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {mView.status === "completed" && goals.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5 justify-center">
                        {goals.map((e: any) => {
                          const p = extras?.playerMap.get(e.player_id);
                          const name = p?.nickname || p?.name || e.player_name || "Jogador";
                          return (
                            <span key={e.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                              {e.type === "own_goal" ? "🥅" : "⚽"} {name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          {relevantMatches.length > 1 && (
            <p className="px-5 text-[10px] text-muted-foreground text-center">← arraste para ver mais partidas →</p>
          )}
        </div>
      )}

      {/* Detalhes da partida finalizada */}
      <Dialog open={detailsMatchId !== null} onOpenChange={(o) => !o && setDetailsMatchId(null)}>
        <DialogContent className="bg-card border-border max-w-sm max-h-[80vh] overflow-y-auto">
          {(() => {
            const m = relevantMatches.find((x) => x.id === detailsMatchId);
            if (!m) return null;
            const homeTeam = m.home_team as any;
            const awayTeam = m.away_team as any;
            const extras = matchExtras[m.id];
            const evs = extras?.events || [];
            const goals = evs.filter((e: any) => e.type === "goal" || e.type === "own_goal");
            const yellow = evs.filter((e: any) => e.type === "yellow_card");
            const red = evs.filter((e: any) => e.type === "red_card");
            const blue = evs.filter((e: any) => e.type === "blue_card");
            const labelFor = (e: any) => {
              const p = extras?.playerMap.get(e.player_id);
              return p?.nickname || p?.name || e.player_name || "Jogador";
            };
            const renderList = (title: string, list: any[], emoji: string) => (
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">{title} ({list.length})</p>
                {list.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum.</p>
                ) : (
                  <ul className="space-y-1">
                    {list.map((e: any) => (
                      <li key={e.id} className="text-xs text-foreground bg-background border border-border rounded-md px-2 py-1 flex items-center justify-between">
                        <span>{emoji} {labelFor(e)}</span>
                        {e.minute != null && <span className="text-[10px] text-muted-foreground">{e.minute}'</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
            const dView = getMatchView(m, myTeam?.id);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-center">
                    {homeTeam?.name} {dView.homeScore ?? 0} x {dView.awayScore ?? 0} {awayTeam?.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {renderList("Gols", goals, "⚽")}
                  {renderList("Cartões amarelos", yellow, "🟨")}
                  {renderList("Cartões vermelhos", red, "🟥")}
                  {renderList("Cartões azuis", blue, "🟦")}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>



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
            <DialogTitle className="font-display">CONFIRMAÇÕES ({confirmedRoster.length}/{roster.length})</DialogTitle>
          </DialogHeader>

          {nextMatch && nextMatch.status !== "completed" && (
            <Button
              onClick={() => { setListOpen(false); setConfirmOpen(true); }}
              className="bg-gradient-primary text-primary-foreground border-0 font-semibold w-full"
            >
              <UserCheck size={14} className="mr-1" />
              {myCurrentStatus === "confirmed" ? "Presença ✓" : myCurrentStatus === "declined" ? "Ausente ✗" : "Confirmar presença"}
            </Button>
          )}

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
