import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, DollarSign, Pencil, CreditCard, MessageCircle, Search, Camera, Shield, CalendarDays, Eye, ClipboardList, MapPin, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { useMyTeam, useMatches, usePlayers, useAcceptMatch, useProfile, useMyAdminTeams, useSetActiveTeam } from "@/hooks/useSupabaseData";
import type { Database } from "@/integrations/supabase/types";
import { mockDb } from "@/lib/mockDb";

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
  useProfile();
  const { data: myTeam } = useMyTeam();
  const { data: players = [] } = usePlayers(myTeam?.id);
  const { data: matches = [] } = useMatches();
  const acceptMatch = useAcceptMatch();
  const { data: adminTeams = [] } = useMyAdminTeams();
  const setActiveTeam = useSetActiveTeam();
  const [switchTeamOpen, setSwitchTeamOpen] = useState(false);
  const [showOpponentSearch, setShowOpponentSearch] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [challengeTeam, setChallengeTeam] = useState<any | null>(null);
  const [challengeDate, setChallengeDate] = useState("");
  const [challengeTime, setChallengeTime] = useState("");
  const [challengeLocation, setChallengeLocation] = useState("");
  const { toast } = useToast();

  const handleConfirmChallenge = () => {
    if (!myTeam || !challengeTeam || !challengeDate || !challengeTime || !challengeLocation) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    const match_date = new Date(`${challengeDate}T${challengeTime}`).toISOString();
    mockDb.createMatch({
      home_team_id: myTeam.id,
      away_team_id: challengeTeam.id,
      match_date,
      location: challengeLocation,
      status: "open",
      format: myTeam.format || "8x8",
    });
    window.dispatchEvent(new CustomEvent("mock-db-change"));
    toast({ title: "Desafio enviado!", description: `${challengeTeam.name} foi convidado.` });
    setChallengeTeam(null);
    setChallengeDate("");
    setChallengeTime("");
    setChallengeLocation("");
    navigate("/agenda");
  };

  const typedPlayers = players as Player[];
  const typedMatches = matches as Match[];

  const activePlayers = typedPlayers.filter((p) => p.is_active !== false);
  const inactivePlayers = typedPlayers.filter((p) => p.is_active === false);

  const myMatches = typedMatches.filter((m) => {
    const homeTeam = m.home_team;
    return myTeam && homeTeam?.id === myTeam.id;
  });

  const completedMatches = myMatches.filter((m) => m.status === "completed");
  const wins = completedMatches.filter((m) => (m.home_score || 0) > (m.away_score || 0)).length;
  const draws = completedMatches.filter((m) => m.home_score === m.away_score).length;
  const losses = completedMatches.length - wins - draws;

  // Pedidos recebidos: matches abertos onde meu time foi desafiado diretamente (away_team_id === myTeam.id)
  // OU matches abertos sem adversário definido criados por outro time
  const pendingRequests = typedMatches.filter((m) => {
    if (!myTeam || m.status !== "open") return false;
    const homeTeam = m.home_team;
    if (homeTeam?.id === myTeam.id) return false;
    // Desafio direcionado ao meu time
    if (m.away_team_id === myTeam.id) return true;
    // Convite aberto (sem adversário)
    if (!m.away_team_id) return true;
    return false;
  }).slice(0, 5);

  const currentYear = new Date().getFullYear();
  const { data: debitos = [] } = useQuery<Debito[]>({
    queryKey: ["debitos", myTeam?.id],
    queryFn: () => (myTeam?.id ? mockDb.getDebitos(myTeam.id) : []),
    enabled: !!myTeam?.id,
  });

  const { data: mensalidades = [] } = useQuery<Mensalidade[]>({
    queryKey: ["mensalidades_caixa", myTeam?.id, currentYear],
    queryFn: () => {
      if (!myTeam?.id || typedPlayers.length === 0) return [];
      return mockDb.getMensalidades(typedPlayers.map((p) => p.id), currentYear);
    },
    enabled: !!myTeam?.id && typedPlayers.length > 0,
  });

  const { data: mensalidadeConfig } = useQuery<MensalidadeConfig | null>({
    queryKey: ["mensalidade_config", currentYear],
    queryFn: () => mockDb.getMensalidadeConfig(currentYear),
  });

  const { data: registeredTeams = [] } = useQuery<any[]>({
    queryKey: ["registered_teams"],
    queryFn: () => mockDb.getAllTeams(),
  });

  const saldoAtual = (() => {
    const valorMensal = mensalidadeConfig?.valor_mensal ? Number(mensalidadeConfig.valor_mensal) : 0;
    const creditosMensalidades = mensalidades.filter((m) => m.pago && m.data_pagamento).length * valorMensal;
    const manualCredits = debitos.filter((d) => d.tipo === "credito").reduce((sum, debito) => sum + Number(debito.valor), 0);
    const totalDebitos = debitos.filter((d) => d.tipo === "debito").reduce((sum, debito) => sum + Number(debito.valor), 0);
    return (creditosMensalidades + manualCredits) - totalDebitos;
  })();

  const topScorers = [...players]
    .filter((p) => (p.goals || 0) > 0)
    .sort((a, b) => (b.goals || 0) - (a.goals || 0))
    .slice(0, 3);

  const nextMatch = [...myMatches, ...typedMatches.filter((m) => myTeam && m.away_team_id === myTeam.id)]
    .filter((m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx)
    .filter((m) => m.status === "confirmed" && !!m.away_team_id)
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())[0];

  const handleAccept = (matchId: string) => {
    if (!myTeam) return;
    acceptMatch.mutate({ matchId, awayTeamId: myTeam.id });
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
    mockDb.updateMatch(rescheduleMatch.id, { match_date, location: rescheduleLocation });
    window.dispatchEvent(new CustomEvent("mock-db-change"));
    toast({ title: "Reagendamento proposto!", description: "Aguardando confirmação do adversário." });
    setRescheduleMatch(null);
  };

  const handleDecline = (matchId: string) => {
    mockDb.deleteMatch(matchId);
    window.dispatchEvent(new CustomEvent("mock-db-change"));
    toast({ title: "Pedido recusado." });
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

  const availableOpponentTeams = registeredTeams.filter((team) => team.id !== myTeam?.id);
  const fromMinutes = toMinutes(timeFrom);
  const toMinutesFilter = toMinutes(timeTo);

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

    return matchesCategory && matchesRegion && matchesTime;
  });

  const quickActions = [
    { icon: Users, label: "Gerenciar Time", path: "/team-manage" },
    { icon: Pencil, label: "Escalação", path: "/escalacao" },
    { icon: CreditCard, label: "Mensalidade", path: "/mensalidades" },
    { icon: DollarSign, label: "Vaquinha", path: "/funds" },
    { icon: MessageCircle, label: "Avisar o time", path: "#" },
    { icon: Search, label: "Buscar adversário", path: "/match" },
    { icon: Camera, label: "Postar fotos", path: "/fotos" },
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
                maximumFractionDigits: 0,
              }),
              label: "Caixa atual",
              trend: "Ver movimentações",
              color: "text-warning",
              path: "/caixa",
            },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => kpi.path && navigate(kpi.path)}
              className={`bg-card rounded-xl border border-border p-3 ${kpi.path ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon size={16} className={kpi.color} />
                <span className="text-xl font-display text-foreground">{kpi.value}</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold">{kpi.label}</p>
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
                <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-1">
                  <Shield size={20} className="text-foreground" />
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
                <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-1">
                  <Shield size={20} className="text-foreground" />
                </div>
                <p className="text-xs text-foreground font-semibold">{nextMatch.away_team?.name || "Adversário"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground">
              <MapPin size={12} className="text-primary" />
              <span>{nextMatch.location}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => navigate("/escalacao")}
                className="bg-gradient-primary text-primary-foreground border-0 font-semibold h-10"
              >
                <Pencil size={14} className="mr-1" /> ESCALAR TIME
              </Button>
              <Button
                onClick={() => navigate(`/event/${nextMatch.id}`)}
                variant="outline"
                className="border-primary/40 text-primary font-semibold h-10"
              >
                <Eye size={14} className="mr-1" /> DETALHAR TIME
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] font-semibold">
              <button className="flex items-center gap-1 text-primary">
                <UserPlus size={12} /> JOGADORES ADVERSÁRIOS
              </button>
              <button className="text-muted-foreground hover:text-foreground">REAGENDAR</button>
              <button className="text-destructive">CANCELAR</button>
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
                if (action.label === "Buscar adversário") {
                  setShowOpponentSearch((value) => !value);
                  return;
                }
                if (action.path !== "#") {
                  navigate(action.path);
                }
              }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <action.icon size={18} className="text-primary" />
              <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">{action.label}</span>
            </motion.button>
          ))}
          </div>
        </div>

        {showOpponentSearch && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-display text-foreground">BUSCAR ADVERSÁRIO</h2>
                <p className="text-[10px] text-muted-foreground">Selecione uma ou mais opções por filtro</p>
              </div>
              <Badge variant="secondary">{filteredOpponentTeams.length} times</Badge>
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleFilter(category, setSelectedCategories)}
                      className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                        selectedCategories.includes(category)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Região</p>
                <div className="flex flex-wrap gap-2">
                  {REGIOES.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => toggleFilter(region, setSelectedRegions)}
                      className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                        selectedRegions.includes(region)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Horário</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="time"
                    value={timeFrom}
                    onChange={(e) => setTimeFrom(e.target.value)}
                    className="bg-background border-border"
                  />
                  <Input
                    type="time"
                    value={timeTo}
                    onChange={(e) => setTimeTo(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {filteredOpponentTeams.length > 0 ? (
                filteredOpponentTeams.map((team) => {
                  const teamTime =
                    team.play_time_start && team.play_time_end
                      ? `${team.play_time_start} até ${team.play_time_end}`
                      : team.play_time_start || team.play_time_end || "Horário não informado";
                  const teamDays = Array.isArray(team.play_days) && team.play_days.length > 0
                    ? team.play_days.join(", ")
                    : "Dias não informados";

                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setChallengeTeam(team)}
                      className="w-full text-left rounded-xl border border-border bg-background p-3 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{team.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {team.categoria || "Sem categoria"} · {team.region || "Sem região"}
                          </p>
                        </div>
                        <Shield size={16} className="text-primary" />
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {teamDays} · {teamTime}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-primary">Toque para desafiar →</p>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-xl border border-border bg-background p-4 text-center text-sm text-muted-foreground">
                  Nenhum time encontrado com esses filtros.
                </div>
              )}
            </div>
          </div>
        )}

        {pendingRequests.length > 0 && (
          <div>
            <h2 className="text-sm font-display text-foreground mb-2">PEDIDOS DE MATCH RECEBIDOS</h2>
            <div className="space-y-2">
              {pendingRequests.map((m) => {
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
                        <p className="text-xs font-semibold text-foreground truncate">{homeTeam?.name} desafiou</p>
                        <p className="text-[10px] text-muted-foreground">
                          {date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} · {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {m.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(m.id)}
                        disabled={acceptMatch.isPending}
                        className="flex-1 h-7 text-[10px] px-2 bg-gradient-primary text-primary-foreground border-0"
                      >
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-[10px] px-2"
                        onClick={() => openReschedule(m)}
                      >
                        Reagendar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-[10px] px-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={() => handleDecline(m.id)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {topScorers.length > 0 && (
          <div>
            <h2 className="text-sm font-display text-foreground mb-2">ARTILHARIA · {myTeam?.name?.toUpperCase()}</h2>
            <div className="space-y-1.5">
              {topScorers.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 bg-card rounded-xl border border-border p-3">
                  <span className={`text-lg font-display w-6 text-center ${i === 0 ? "text-warning" : "text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.position || "—"}</p>
                  </div>
                  <span className="text-sm font-display text-foreground">{p.goals} gols</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!challengeTeam} onOpenChange={(open) => !open && setChallengeTeam(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Desafiar {challengeTeam?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ch-date">Data</Label>
              <Input id="ch-date" type="date" value={challengeDate} onChange={(e) => setChallengeDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ch-time">Horário</Label>
              <Input id="ch-time" type="time" value={challengeTime} onChange={(e) => setChallengeTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ch-loc">Local</Label>
              <Input id="ch-loc" placeholder="Ex: Arena Pacaembu" value={challengeLocation} onChange={(e) => setChallengeLocation(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChallengeTeam(null)}>Cancelar</Button>
            <Button onClick={handleConfirmChallenge} className="bg-gradient-primary text-primary-foreground border-0">
              Enviar desafio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trocar time administrado */}
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

      <BottomNav />
    </div>
  );
};

export default AdminPage;
