import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, DollarSign, Pencil, CreditCard, MessageCircle, Search, Camera, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import { useMyTeam, useMatches, usePlayers, useAcceptMatch, useProfile } from "@/hooks/useSupabaseData";
import type { Database } from "@/integrations/supabase/types";
import { mockDb } from "@/lib/mockDb";

type Team = Database["public"]["Tables"]["teams"]["Row"];
type Player = Database["public"]["Tables"]["players"]["Row"] & { is_active?: boolean };
type Match = Database["public"]["Tables"]["matches"]["Row"] & {
  home_team?: Team | null;
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
  const [showOpponentSearch, setShowOpponentSearch] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");

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

  const pendingRequests = typedMatches.filter((m) => {
    const homeTeam = m.home_team;
    return m.status === "open" && myTeam && homeTeam?.id !== myTeam.id && !m.away_team_id;
  }).slice(0, 3);

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

  const handleAccept = (matchId: string) => {
    if (!myTeam) return;
    acceptMatch.mutate({ matchId, awayTeamId: myTeam.id });
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
    { icon: Pencil, label: "Escalação", path: "/escalacao" },
    { icon: CreditCard, label: "Mensalidade", path: "/mensalidades" },
    { icon: DollarSign, label: "Vaquinha", path: "/funds" },
    { icon: MessageCircle, label: "Avisar o time", path: "#" },
    { icon: Search, label: "Buscar adversÃ¡rio", path: "/match" },
    { icon: Camera, label: "Postar fotos", path: "/fotos" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-3xl text-foreground font-display">PAINEL ADMIN</h1>
      </div>

      <div className="px-5 space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Users, value: players.length, label: "Meu Time", trend: `${activePlayers.length} ativos · ${inactivePlayers.length} inativos`, color: "text-primary", path: "/team" },
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
                    <div key={team.id} className="rounded-xl border border-border bg-background p-3">
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
                    </div>
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
                  <div key={m.id} className="flex items-center justify-between bg-card rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{homeTeam?.name}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {date.toLocaleDateString("pt-BR", { weekday: "short" })} {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {m.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(m.id)}
                        disabled={acceptMatch.isPending}
                        className="h-6 text-[10px] px-2 bg-gradient-primary text-primary-foreground border-0"
                      >
                        Aceitar
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2">
                        Recusar
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

      <BottomNav />
    </div>
  );
};

export default AdminPage;
