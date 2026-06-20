import { startsWithNorm } from "@/lib/normalize";
import { getFieldDisplayName } from "@/lib/matchView";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, DollarSign, Pencil, CreditCard, Search, Shield, CalendarDays, Eye, ClipboardList, MapPin, UserPlus, Building2, AlertTriangle, Calendar as CalIcon, Clock, Swords, ChevronDown, ChevronUp, CalendarClock, XCircle, Trophy } from "lucide-react";
import FinalizeMatchDialog from "@/components/FinalizeMatchDialog";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { AdminGate } from "@/components/AdminGate";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  useMyTeam, useMatches, usePlayers,
  useMyAdminTeams, useSetActiveTeam,
  useCreateMatch, useUpdateMatch, useDeleteMatch,
  useDebitos, useMensalidades, useMensalidadeConfig,
} from "@/hooks/useSupabaseData";

import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { getCitiesForUf } from "@/lib/brCities";

type Team = Database["public"]["Tables"]["teams"]["Row"];
type Player = Database["public"]["Tables"]["players"]["Row"] & { is_active?: boolean };
type Match = Database["public"]["Tables"]["matches"]["Row"] & {
  home_team?: Team | null;
  away_team?: Team | null;
};
type Debito = {
  id: string;
  team_id: string;
  descricao: string;
  data: string;
  valor: number | string;
  tipo: string;
  observacao?: string;
  created_at?: string;
};
type Mensalidade = Database["public"]["Tables"]["mensalidades"]["Row"];
type MensalidadeConfig = Database["public"]["Tables"]["mensalidade_config"]["Row"];

const CATEGORIAS = ["Esporte", "35+", "40+", "45+", "50+", "60+"];
const REGIOES = ["Z/L", "Z/N", "Z/O", "Z/S"];

const AdminPage = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAdminAccess();
  const { data: myTeam } = useMyTeam();
  const { data: players = [] } = usePlayers(myTeam?.id);
  const { data: matches = [] } = useMatches();
  
  const { data: adminTeams = [] } = useMyAdminTeams();
  const setActiveTeam = useSetActiveTeam();
  const [switchTeamOpen, setSwitchTeamOpen] = useState(false);
  const [showOpponentSearch, setShowOpponentSearch] = useState(false);
  const createMatchMut = useCreateMatch();
  const updateMatchMut = useUpdateMatch();
  const deleteMatchMut = useDeleteMatch();
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [showCitySuggest, setShowCitySuggest] = useState(false);
  const [showNameSuggest, setShowNameSuggest] = useState(false);
  const [challengeTeam, setChallengeTeam] = useState<any | null>(null);
  const [challengeDate, setChallengeDate] = useState("");
  const [challengeTime, setChallengeTime] = useState("");
  const [locationChoice, setLocationChoice] = useState<"own" | "away">("away");
  const [challengeLocation, setChallengeLocation] = useState("");
  const [newMatchOpen, setNewMatchOpen] = useState(false);
  const [newMatchOpponent, setNewMatchOpponent] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");
  const [newMatchTime, setNewMatchTime] = useState("");
  const [newMatchLocation, setNewMatchLocation] = useState("");
  const { toast } = useToast();

  const handleCreateNewMatch = async () => {
    if (!myTeam) return;
    if (!newMatchOpponent.trim() || !newMatchDate || !newMatchTime || !newMatchLocation.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    const match_date = new Date(`${newMatchDate}T${newMatchTime}`).toISOString();
    await createMatchMut.mutateAsync({
      home_team_id: myTeam.id,
      away_team_id: null,
      match_date,
      location: newMatchLocation.trim(),
      status: "confirmed",
      format: (myTeam as any).format || "8x8",
    });
    toast({ title: "Partida criada e confirmada!", description: `vs ${newMatchOpponent.trim()}` });
    setNewMatchOpen(false);
    setNewMatchOpponent(""); setNewMatchDate(""); setNewMatchTime(""); setNewMatchLocation("");
    navigate("/agenda?from=admin", { state: { fromAdmin: true } });
  };

  // Pré-popular filtros de busca com o cadastro do meu time ao abrir o painel
  useEffect(() => {
    if (!showOpponentSearch || !myTeam) return;
    const t = myTeam as any;
    if (t.addr_cidade) setCityQuery(t.addr_cidade);
    if (t.categoria) setSelectedCategories([t.categoria]);
    if (t.region) setSelectedRegions([t.region]);
    if (t.play_time_start) setTimeFrom(t.play_time_start);
    if (t.play_time_end) setTimeTo(t.play_time_end);
  }, [showOpponentSearch, myTeam]);

  const WEEK_DAY_LABEL: Record<string, string> = {
    domingo: "Domingo", segunda: "Segunda", terca: "Terça", quarta: "Quarta",
    quinta: "Quinta", sexta: "Sexta", sabado: "Sábado",
  };
  const DAY_INDEX: Record<string, number> = {
    domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
  };

  const opponentReady = (t: any) =>
    !!t && !!t.name && !!t.addr_cidade && !!t.addr_uf && !!t.field_address &&
    Array.isArray(t.play_days) && t.play_days.length > 0 && !!t.play_time_start;

  const isDateAllowed = (dateStr: string, allowedDays: string[]) => {
    if (!dateStr) return false;
    const d = new Date(dateStr + "T12:00:00");
    return allowedDays.some((day) => DAY_INDEX[day] === d.getDay());
  };

  const handleConfirmChallenge = async () => {
    if (!myTeam || !challengeTeam) return;
    if (!challengeDate) { toast({ title: "Informe a data", variant: "destructive" }); return; }
    if (!challengeTime) { toast({ title: "Informe o horário", variant: "destructive" }); return; }
    if (Array.isArray(challengeTeam.play_days) && challengeTeam.play_days.length > 0) {
      if (!isDateAllowed(challengeDate, challengeTeam.play_days)) {
        toast({
          title: "Data inválida",
          description: `Adversário só joga: ${challengeTeam.play_days.map((d: string) => WEEK_DAY_LABEL[d]).join(", ")}`,
          variant: "destructive",
        });
        return;
      }
    }
    const fallbackLocation = locationChoice === "own"
      ? (myTeam.field_address || myTeam.field_name || "Campo do mandante")
      : (challengeTeam.field_address || challengeTeam.field_name || "Campo do adversário");
    const location = challengeLocation.trim() || fallbackLocation;
    const match_date = new Date(`${challengeDate}T${challengeTime}`).toISOString();
    await createMatchMut.mutateAsync({
      home_team_id: locationChoice === "own" ? myTeam.id : challengeTeam.id,
      away_team_id: locationChoice === "own" ? challengeTeam.id : myTeam.id,
      match_date,
      location,
      status: "open",
      format: challengeTeam.format || myTeam.format || "8x8",
    });
    toast({ title: "Desafio enviado!", description: `${challengeTeam.name} foi convidado.` });
    setChallengeTeam(null);
    setChallengeDate(""); setChallengeTime(""); setLocationChoice("away"); setChallengeLocation("");
    navigate("/agenda?from=admin", { state: { fromAdmin: true } });
  };

  const typedPlayers = players as Player[];
  const typedMatches = matches as Match[];

  const activePlayers = typedPlayers.filter((p) => p.is_active !== false);
  const inactivePlayers = typedPlayers.filter((p) => p.is_active === false);

  const myMatches = typedMatches.filter((m) => {
    const homeTeam = m.home_team;
    return myTeam && homeTeam?.id === myTeam.id;
  });

  // Estatísticas: cada time só conta partidas que ELE finalizou pelo lado dele.
  const completedMatches = myMatches.filter((m: any) => {
    if (!myTeam) return false;
    const isHome = m.home_team_id === myTeam.id;
    return isHome ? !!m.home_finalized_at : !!m.away_finalized_at;
  });
  const wins = completedMatches.filter((m: any) => {
    const isHome = m.home_team_id === myTeam!.id;
    const hs = (isHome ? m.home_reported_home_score : m.away_reported_home_score) ?? m.home_score ?? 0;
    const as = (isHome ? m.home_reported_away_score : m.away_reported_away_score) ?? m.away_score ?? 0;
    return isHome ? hs > as : as > hs;
  }).length;
  const draws = completedMatches.filter((m: any) => {
    const hs = (m.home_team_id === myTeam!.id ? m.home_reported_home_score : m.away_reported_home_score) ?? m.home_score ?? 0;
    const as = (m.home_team_id === myTeam!.id ? m.home_reported_away_score : m.away_reported_away_score) ?? m.away_score ?? 0;
    return hs === as;
  }).length;
  const losses = completedMatches.length - wins - draws;


  // Desafios RECEBIDOS (lista completa para o card Desafios)
  const receivedChallenges = typedMatches.filter((m) => {
    if (!myTeam || m.status !== "open") return false;
    const homeTeam = m.home_team;
    if (homeTeam?.id === myTeam.id) return false;
    if (m.away_team_id === myTeam.id) return true;
    if (!m.away_team_id) return true;
    return false;
  });

  // Desafios ENVIADOS pelo meu time (ainda abertos, aguardando resposta)
  const sentChallenges = typedMatches.filter((m) => {
    if (!myTeam || m.status !== "open") return false;
    const homeTeam = m.home_team;
    return homeTeam?.id === myTeam.id;
  });

  const totalChallenges = receivedChallenges.length + sentChallenges.length;

  const currentYear = new Date().getFullYear();
  const { data: debitos = [] } = useDebitos(myTeam?.id);
  const playerIds = typedPlayers.map((p) => p.id);
  const { data: mensalidades = [] } = useMensalidades(playerIds, currentYear);
  const { data: mensalidadeConfig } = useMensalidadeConfig(myTeam?.id, currentYear);

  const { data: registeredTeams = [] } = useQuery<any[]>({
    queryKey: ["registered_teams"],
    queryFn: async () => {
      const { data } = await supabase.from("public_teams").select("*");
      return data || [];
    },
  });

  const saldoAtual = (() => {
    const valorMensal = mensalidadeConfig?.valor_mensal ? Number(mensalidadeConfig.valor_mensal) : 0;
    const now = Date.now();
    const creditosMensalidades = mensalidades.filter((m) => m.pago && m.data_pagamento).length * valorMensal;
    const manualCredits = debitos
      .filter((d) => d.tipo === "credito" && new Date(d.data).getTime() <= now)
      .reduce((sum, debito) => sum + Number(debito.valor), 0);
    const totalDebitos = debitos
      .filter((d) => d.tipo === "debito" && new Date(d.data).getTime() <= now)
      .reduce((sum, debito) => sum + Number(debito.valor), 0);
    return (creditosMensalidades + manualCredits) - totalDebitos;
  })();


  const nextMatchRaw = [...myMatches, ...typedMatches.filter((m) => myTeam && m.away_team_id === myTeam.id)]
    .filter((m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx)
    .filter((m) => m.status === "confirmed" && !!m.away_team_id)
    .filter((m) => {
      if (!myTeam) return false;
      const isHome = m.home_team_id === myTeam.id;
      // Esconde do meu admin assim que EU finalizei (o outro time ainda pode ver e finalizar do lado dele)
      return isHome ? !m.home_finalized_at : !m.away_finalized_at;
    })
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())[0];

  // Hydrate home/away teams from registeredTeams (public_teams view) since useMatches may not include them
  const findTeam = (id?: string | null) => {
    if (!id) return null;
    if (myTeam && myTeam.id === id) return myTeam as any;
    return (registeredTeams as any[]).find((t) => t.id === id) || null;
  };
  const nextMatch = nextMatchRaw
    ? {
        ...nextMatchRaw,
        home_team: (nextMatchRaw as any).home_team ?? findTeam(nextMatchRaw.home_team_id),
        away_team: (nextMatchRaw as any).away_team ?? findTeam(nextMatchRaw.away_team_id),
      }
    : undefined;


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

  const confirmReschedule = async () => {
    if (!rescheduleMatch || !rescheduleDate || !rescheduleTime) return;
    const match_date = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
    await updateMatchMut.mutateAsync({
      id: rescheduleMatch.id,
      match_date,
      location: rescheduleLocation,
      status: "open",
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const teamName = (myTeam as any)?.name || "Adversário";
      const novaData = new Date(match_date).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
      const text = `🔁 Partida reagendada por ${teamName}.\nNova data: ${novaData}\nLocal: ${rescheduleLocation}\nAguardando confirmação do adversário.`;
      await supabase.from("match_chat_messages").insert({
        match_id: rescheduleMatch.id,
        user_id: user.id,
        message: text,
        message_type: "system",
      });
    }
    toast({ title: "Reagendamento enviado!", description: "Aguardando confirmação do adversário." });
    setRescheduleMatch(null);
  };

  const [showNextActions, setShowNextActions] = useState(false);
  const [cancelMatch, setCancelMatch] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [finalizeMatch, setFinalizeMatch] = useState<any | null>(null);

  // Auto-mark confirmed matches as "past" after 12h
  useEffect(() => {
    if (!myTeam) return;
    const overdue = typedMatches.filter((m: any) => {
      if (m.status !== "confirmed") return false;
      if (m.home_team_id !== myTeam.id) return false;
      return Date.now() - new Date(m.match_date).getTime() > 12 * 60 * 60 * 1000;
    });
    if (!overdue.length) return;
    (async () => {
      await Promise.all(overdue.map((m: any) => supabase.from("matches").update({ status: "past" }).eq("id", m.id)));
      window.dispatchEvent(new CustomEvent("supabase-data-change"));
    })();
  }, [myTeam?.id, typedMatches.length]);


  const handleConfirmCancelMatch = async () => {
    if (!cancelMatch) return;
    if (!cancelReason.trim()) {
      toast({ title: "Informe o motivo do cancelamento", variant: "destructive" });
      return;
    }
    await updateMatchMut.mutateAsync({ id: cancelMatch.id, status: "cancelled" });

    // Posta mensagem de sistema no chat da partida (visível para ambos os times)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const teamName = (myTeam as any)?.name || "Adversário";
      const text = `⚠️ Partida cancelada por ${teamName}.\nMotivo: ${cancelReason.trim()}`;
      await supabase.from("match_chat_messages").insert({
        match_id: cancelMatch.id,
        user_id: user.id,
        message: text,
        message_type: "system",
      });
    }

    toast({
      title: "Partida cancelada",
      description: "O administrador do time adversário foi notificado no chat da partida.",
    });
    setCancelMatch(null);
    setCancelReason("");
  };


  const toggleFilter = (
    value: string,
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const toMinutes = (value?: string | null) => {
    if (!value || !value.includes(":")) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const myUf = ((myTeam as any)?.addr_uf || "SP").toUpperCase();
  const cityOptions = getCitiesForUf(myUf);

  // Apenas adversários no MESMO estado do meu time
  const availableOpponentTeams = registeredTeams.filter(
    (team) => team.id !== myTeam?.id && ((team as any).addr_uf || "SP").toUpperCase() === myUf
  );
  const fromMinutes = toMinutes(timeFrom);
  const toMinutesFilter = toMinutes(timeTo);

  const filteredCitySuggest = (() => {
    if (!cityQuery.trim()) return cityOptions.slice(0, 8);
    return cityOptions.filter((c) => startsWithNorm(c, cityQuery)).slice(0, 8);
  })();

  const filteredNameSuggest = (() => {
    if (!nameQuery.trim()) return [] as any[];
    return availableOpponentTeams.filter((t) => startsWithNorm(t.name, nameQuery)).slice(0, 8);
  })();

  const filteredOpponentTeams = availableOpponentTeams.filter((team) => {
    const matchesCategory =
      selectedCategories.length === 0 || selectedCategories.includes(team.categoria || "");
    const matchesRegion =
      selectedRegions.length === 0 || selectedRegions.includes(team.region || "");
    const teamStart = toMinutes(team.play_time_start);
    const teamEnd = toMinutes(team.play_time_end);
    const matchesTime =
      (!fromMinutes || (teamEnd !== null && teamEnd >= fromMinutes)) &&
      (!toMinutesFilter || (teamStart !== null && teamStart <= toMinutesFilter));
    const matchesCity = startsWithNorm((team as any).addr_cidade, cityQuery);
    const matchesName = startsWithNorm(team.name, nameQuery);

    return matchesCategory && matchesRegion && matchesTime && matchesCity && matchesName;
  });

  const teamFirstName = myTeam?.name ? myTeam.name.trim().split(/\s+/)[0] : "";
  const quickActions: Array<{ icon: any; label: string; path: string; badge?: number }> = [
    { icon: CalendarDays, label: "Agenda Time", path: "/agenda" },
    { icon: CreditCard, label: "Mensalidade", path: "/mensalidades" },
    { icon: Swords, label: "Desafios", path: "/desafios", badge: totalChallenges },
    { icon: Trophy, label: "Artilharia", path: "/ranking" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-3xl text-foreground font-display">PAINEL ADMIN</h1>
        {myTeam && (
          <p className="text-xs text-muted-foreground mt-1">
            Time ativo: <span className="text-foreground font-semibold">{myTeam.name}</span>
            {" · "}
            <button onClick={() => setSwitchTeamOpen(true)} className="text-primary underline">trocar</button>
          </p>
        )}
      </div>

      <div className="px-5 space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Users, value: players.length, label: "Meu Time", trend: `${activePlayers.length} ativos · ${inactivePlayers.length} inativos`, color: "text-primary", path: "/team-manage" },
            {
              icon: DollarSign,
              value: saldoAtual.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
              label: "Caixa atual",
              trend: "Ver movimentações",
              color: "text-warning",
              path: "/caixa",
            },
          ].map((kpi: any, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                if (kpi.onClick) kpi.onClick();
                else if (kpi.path) navigate(kpi.path);
              }}
              className={`bg-card rounded-xl border border-border p-3 ${kpi.path || kpi.onClick ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon size={16} className={kpi.color} />
                <span className="text-xl font-display text-foreground">{kpi.value}</span>
              </div>
              <p className="text-xs text-muted-foreground font-semibold">{kpi.label}</p>
              <p className="text-[9px] text-muted-foreground">{kpi.trend}</p>
            </motion.div>
          ))}
        </div>

        {nextMatch && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-primary/30 p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-primary" />
                <h2 className="text-xs font-display text-primary tracking-wider">PRÓXIMA PARTIDA CONFIRMADA</h2>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/20 text-destructive uppercase tracking-wider">
                Live Track
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-1 overflow-hidden">
                  {(nextMatch.home_team as any)?.logo_url ? (
                    <img src={(nextMatch.home_team as any).logo_url} alt={(nextMatch.home_team as any)?.name || ""} className="w-12 h-12 object-contain" />
                  ) : (
                    <Shield size={20} className="text-foreground" />
                  )}
                </div>
                <p className="text-xs text-foreground font-semibold">{nextMatch.home_team?.name || "Meu Time"}</p>
              </div>
              <div className="text-center px-2">
                <p className="text-primary font-display text-sm">VS</p>
                <p className="text-foreground font-display text-base mt-0.5">
                  {new Date(nextMatch.match_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(nextMatch.match_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="text-center flex-1">
                <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-1 overflow-hidden">
                  {(nextMatch.away_team as any)?.logo_url ? (
                    <img src={(nextMatch.away_team as any).logo_url} alt={(nextMatch.away_team as any)?.name || ""} className="w-12 h-12 object-contain" />
                  ) : (
                    <Shield size={20} className="text-foreground" />
                  )}
                </div>
                <p className="text-xs text-foreground font-semibold">{nextMatch.away_team?.name || "Adversário"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground">
              <MapPin size={12} className="text-primary" />
              <span>{nextMatch.location}</span>
            </div>

            <div className="pt-2 border-t border-border">
              <Button
                onClick={() => setShowNextActions((v) => !v)}
                variant="outline"
                size="sm"
                className="w-full h-8 text-[11px] font-semibold"
              >
                <Eye size={12} className="mr-1" /> DETALHES
                {showNextActions ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
              </Button>

              {showNextActions && (
                <div className="mt-2 space-y-1.5">
                  <button
                    onClick={() => navigate(`/opponent-details?matchId=${nextMatch.id}`)}
                    className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border hover:border-primary/40 text-left transition-colors"
                  >
                    <Shield size={14} className="text-primary" />
                    <span className="text-xs font-semibold text-foreground">Detalhar adversário</span>
                  </button>
                  <button
                    onClick={() => openReschedule(nextMatch)}
                    className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border hover:border-primary/40 text-left transition-colors"
                  >
                    <CalendarClock size={14} className="text-primary" />
                    <span className="text-xs font-semibold text-foreground">Reagendar partida</span>
                  </button>
                  <button
                    onClick={() => { setFinalizeMatch(nextMatch); setShowNextActions(false); }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border hover:border-primary/40 text-left transition-colors"
                  >
                    <Trophy size={14} className="text-primary" />
                    <span className="text-xs font-semibold text-foreground">Finalizar partida</span>
                  </button>
                  <button
                    onClick={() => { setCancelMatch(nextMatch); setCancelReason(""); }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/30 hover:bg-destructive/10 text-left transition-colors"
                  >
                    <XCircle size={14} className="text-destructive" />
                    <span className="text-xs font-semibold text-destructive">Cancelar partida</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Atalhos administrativos</h2>
          <div className="grid grid-cols-3 gap-2">
            {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.03 }}
              onClick={() => {
                if (action.path !== "#") {
                  navigate(action.path === "/agenda" ? "/agenda?from=admin" : action.path, action.path === "/agenda" ? { state: { fromAdmin: true } } : undefined);
                }
              }}
              className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <div className="relative">
                <action.icon size={18} className="text-primary" />
                {action.badge !== undefined && action.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {action.badge}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-medium text-center leading-tight">{action.label}</span>
            </motion.button>
          ))}
          </div>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => navigate("/super-admin/pagamentos")}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-2 text-left">
              <Shield size={18} className="text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Pagamentos Pix</p>
                <p className="text-[10px] text-muted-foreground">Aprovar/rejeitar mensalidades (super admin)</p>
              </div>
            </div>
            <span className="text-xs text-primary font-semibold">Abrir →</span>
          </button>
        )}



      </div>

      <Dialog
        open={!!challengeTeam}
        onOpenChange={(open) => {
          if (!open) {
            setChallengeTeam(null);
            setChallengeDate("");
            setChallengeTime("");
            setLocationChoice("away");
            setChallengeLocation("");
          } else if (challengeTeam) {
            // Pré-popular horário fixo do adversário ao abrir, se houver
            setChallengeTime(challengeTeam.play_time_start || "");
            // Pré-popular Local com o endereço do adversário (escolha padrão "away")
            setChallengeLocation(
              challengeTeam.field_address || challengeTeam.field_name || ""
            );
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">DESAFIO</DialogTitle>
            <DialogDescription>
              {challengeTeam ? `Enviar desafio para ${challengeTeam.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          {challengeTeam && (
            <div className="space-y-4">
              {!opponentReady(challengeTeam) && (
                <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-warning">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>Cadastro do adversário incompleto — preencha os dados manualmente.</div>
                </div>
              )}

              <div className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-3 space-y-1">
                <p><strong>Cidade:</strong> {challengeTeam.addr_cidade || "—"}{challengeTeam.addr_uf ? `/${challengeTeam.addr_uf}` : ""}</p>
                <p>
                  <strong>Joga em:</strong>{" "}
                  {Array.isArray(challengeTeam.play_days) && challengeTeam.play_days.length > 0
                    ? challengeTeam.play_days.map((d: string) => WEEK_DAY_LABEL[d]).join(", ")
                    : "Não informado"}
                </p>
                <p><strong>Horário:</strong> {challengeTeam.play_time_start ? `${challengeTeam.play_time_start} (fixo)` : "Livre"}</p>
              </div>

              <div>
                <Label htmlFor="ch-date" className="flex items-center gap-1">
                  <CalIcon size={14} /> Data do jogo
                </Label>
                <Input
                  id="ch-date"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={challengeDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && Array.isArray(challengeTeam.play_days) && challengeTeam.play_days.length > 0 && !isDateAllowed(v, challengeTeam.play_days)) {
                      toast({
                        title: "Dia não permitido",
                        description: `Adversário só joga: ${challengeTeam.play_days.map((d: string) => WEEK_DAY_LABEL[d]).join(", ")}`,
                        variant: "destructive",
                      });
                      return;
                    }
                    setChallengeDate(v);
                  }}
                />
              </div>

              <div>
                <Label htmlFor="ch-time" className="flex items-center gap-1">
                  <Clock size={14} /> Horário {challengeTeam.play_time_start ? "(fixo)" : ""}
                </Label>
                <Input
                  id="ch-time"
                  type="time"
                  value={challengeTime}
                  readOnly={!!challengeTeam.play_time_start}
                  onChange={(e) => setChallengeTime(e.target.value)}
                  className={challengeTeam.play_time_start ? "opacity-80 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <Label className="mb-2 block">Local</Label>
                <RadioGroup
                  value={locationChoice}
                  onValueChange={(v) => {
                    const choice = v as "own" | "away";
                    setLocationChoice(choice);
                    const addr = choice === "own"
                      ? ((myTeam as any)?.field_address || (myTeam as any)?.field_name || "")
                      : (challengeTeam.field_address || challengeTeam.field_name || "");
                    setChallengeLocation(addr);
                  }}
                  className="space-y-2"
                >
                  <label htmlFor="loc-own" className="flex items-start gap-3 bg-secondary/40 border border-border rounded-lg p-3 cursor-pointer">
                    <RadioGroupItem id="loc-own" value="own" className="mt-1" />
                    <div className="text-sm">
                      <div className="font-semibold flex items-center gap-1">
                        <Building2 size={14} /> Meu campo
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(myTeam as any)?.field_address || (myTeam as any)?.field_name || "Endereço não cadastrado"}
                      </div>
                    </div>
                  </label>
                  <label htmlFor="loc-away" className="flex items-start gap-3 bg-secondary/40 border border-border rounded-lg p-3 cursor-pointer">
                    <RadioGroupItem id="loc-away" value="away" className="mt-1" />
                    <div className="text-sm">
                      <div className="font-semibold flex items-center gap-1">
                        <Building2 size={14} /> Campo do adversário
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {challengeTeam.field_address || challengeTeam.field_name || "—"}
                      </div>
                    </div>
                  </label>
                </RadioGroup>
                <Input
                  className="mt-2"
                  value={challengeLocation}
                  onChange={(e) => setChallengeLocation(e.target.value)}
                  placeholder="Endereço do local da partida"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setChallengeTeam(null)}>Cancelar</Button>
                <Button onClick={handleConfirmChallenge} className="bg-gradient-primary text-primary-foreground border-0">
                  Enviar desafio
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nova Partida (sem filtros) */}
      <Dialog
        open={newMatchOpen}
        onOpenChange={(open) => {
          setNewMatchOpen(open);
          if (open && myTeam) {
            const t = myTeam as any;
            if (!newMatchTime && t.play_time_start) setNewMatchTime(t.play_time_start);
            if (!newMatchLocation && (t.field_address || t.field_name)) {
              setNewMatchLocation(t.field_address || t.field_name);
            }
          }
        }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">NOVA PARTIDA</DialogTitle>
            <DialogDescription>Crie uma partida informando os dados manualmente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="nm-opp">Nome do Time Adversário</Label>
              <Input id="nm-opp" value={newMatchOpponent} onChange={(e) => setNewMatchOpponent(e.target.value)} placeholder="Ex: Águias FC" />
            </div>
            <div>
              <Label htmlFor="nm-date">Data</Label>
              <Input id="nm-date" type="date" min={new Date().toISOString().slice(0, 10)} value={newMatchDate} onChange={(e) => setNewMatchDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="nm-time">Horário</Label>
              <Input id="nm-time" type="time" value={newMatchTime} onChange={(e) => setNewMatchTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="nm-loc">Local</Label>
              <Input id="nm-loc" value={newMatchLocation} onChange={(e) => setNewMatchLocation(e.target.value)} placeholder="Endereço ou nome do campo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMatchOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateNewMatch} className="bg-gradient-primary text-primary-foreground border-0">
              Criar partida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button variant="outline" onClick={() => setRescheduleMatch(null)}>Cancelar</Button>
            <Button className="bg-gradient-primary text-primary-foreground border-0" onClick={confirmReschedule}>Propor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={switchTeamOpen} onOpenChange={setSwitchTeamOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Trocar time administrado</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {adminTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Você não administra nenhum time.
              </p>
            ) : (
              adminTeams.map((t: any) => {
                const isActive = myTeam?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTeam(t.id);
                      setSwitchTeamOpen(false);
                      toast({ title: `Time ativo: ${t.name}` });
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                      isActive ? "bg-primary/10 border-primary/40" : "bg-card border-border hover:border-primary/30"
                    }`}
                  >
                    {t.logo_url ? (
                      <img src={t.logo_url} alt={t.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-sm">
                        {t.abbreviation || t.name?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{t.categoria || "—"} · {t.region || "—"}</p>
                    </div>
                    {isActive && <span className="text-[10px] font-semibold text-primary">ATIVO</span>}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancelar partida com motivo */}
      <Dialog open={!!cancelMatch} onOpenChange={(open) => { if (!open) { setCancelMatch(null); setCancelReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar partida</DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento. Ao confirmar, o administrador do time adversário será notificado no chat da partida.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: campo indisponível, falta de jogadores..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelMatch(null); setCancelReason(""); }}>Voltar</Button>
            <Button
              onClick={handleConfirmCancelMatch}
              disabled={updateMatchMut.isPending || !cancelReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {finalizeMatch && myTeam && (
        <FinalizeMatchDialog
          open={!!finalizeMatch}
          onOpenChange={(o) => !o && setFinalizeMatch(null)}
          match={finalizeMatch}
          myTeamId={myTeam.id}
        />
      )}

      <BottomNav />
    </div>
  );
};

const AdminPageGated = () => (<AdminGate><AdminPage /></AdminGate>);
export default AdminPageGated;
