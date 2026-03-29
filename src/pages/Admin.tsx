import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, Trophy, DollarSign, Star, Pencil, CreditCard, MessageCircle, Search, Camera, BarChart3, Shield, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useMyTeam, useMatches, usePlayers } from "@/hooks/useSupabaseData";
import { useProfile } from "@/hooks/useSupabaseData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const AdminPage = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: myTeam } = useMyTeam();
  const { data: players = [] } = usePlayers(myTeam?.id);
  const { data: matches = [] } = useMatches();
  const [showSquad, setShowSquad] = useState(false);

  // Check if user is team owner
  const isOwner = myTeam && profile && myTeam.owner_id === profile.user_id;

  const myMatches = matches.filter((m) => {
    const homeTeam = m.home_team as any;
    return myTeam && homeTeam?.id === myTeam.id;
  });

  const completedMatches = myMatches.filter((m) => m.status === "completed");
  const wins = completedMatches.filter((m) => (m.home_score || 0) > (m.away_score || 0)).length;
  const draws = completedMatches.filter((m) => m.home_score === m.away_score).length;
  const losses = completedMatches.length - wins - draws;

  // Pending match requests (open matches from other teams)
  const pendingRequests = matches.filter((m) => {
    const homeTeam = m.home_team as any;
    return m.status === "open" && myTeam && homeTeam?.id !== myTeam.id && !m.away_team_id;
  }).slice(0, 3);

  // Top scorers
  const topScorers = [...players]
    .filter((p) => (p.goals || 0) > 0)
    .sort((a, b) => (b.goals || 0) - (a.goals || 0))
    .slice(0, 3);

  const quickActions = [
    { icon: UserCheck, label: "Elenco", path: "#squad" },
    { icon: Pencil, label: "Editar escalação", path: "/agenda" },
    { icon: CreditCard, label: "Cobrar pagamentos", path: "#" },
    { icon: MessageCircle, label: "Avisar o time", path: "#" },
    { icon: Search, label: "Buscar adversário", path: "/match" },
    { icon: Camera, label: "Postar fotos", path: "#" },
  ];

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="px-5 pt-12 pb-4">
          <h1 className="text-4xl text-foreground font-display">PAINEL ADMIN 👑</h1>
        </div>
        <div className="px-5 text-center py-12">
          <p className="text-muted-foreground">Acesso restrito ao administrador do time.</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-3xl text-foreground font-display">PAINEL ADMIN 👑</h1>
      </div>

      <div className="px-5 space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Users, value: players.length, label: "Jogadores ativos", trend: `▲ +${players.length} no elenco`, color: "text-primary" },
            { icon: Trophy, value: myMatches.length, label: "Jogos temporada", trend: `${wins}V ${draws}E ${losses}D`, color: "text-success" },
            { icon: DollarSign, value: "R$0", label: "Caixa atual", trend: "Em breve", color: "text-warning" },
            { icon: Star, value: myTeam?.rating || 0, label: "Avaliação", trend: "Rating do time", color: "text-primary" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border p-3"
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

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.03 }}
              onClick={() => {
                if (action.path === "#squad") {
                  setShowSquad(!showSquad);
                } else if (action.path !== "#") {
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

        {/* Squad - All registered players */}
        {showSquad && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-display text-foreground">ELENCO COMPLETO — {players.length} JOGADORES</h2>
            </div>
            {players.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">Nenhum jogador cadastrado ainda.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {(() => {
                  const positionOrder: Record<string, number> = {
                    goleiro: 0, gol: 0, gk: 0,
                    zagueiro: 1, defensor: 1, def: 1,
                    lateral: 2,
                    meia: 3, meio: 3, mid: 3,
                    atacante: 4, ata: 4, atk: 4, ponta: 4,
                  };
                  const getOrder = (pos: string | null) => {
                    if (!pos) return 99;
                    const key = pos.toLowerCase().trim();
                    for (const [k, v] of Object.entries(positionOrder)) {
                      if (key.includes(k)) return v;
                    }
                    return 50;
                  };
                  const sorted = [...players].sort((a, b) => getOrder(a.position) - getOrder(b.position));

                  return sorted.map((p, i) => {
                    const initials = p.name.trim().split(/\s+/).length > 1
                      ? (p.name.trim().split(/\s+/)[0][0] + p.name.trim().split(/\s+/).slice(-1)[0][0]).toUpperCase()
                      : p.name.slice(0, 2).toUpperCase();

                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between bg-secondary/80 rounded-xl px-4 py-3 border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-tight">{p.name}</p>
                            <p className="text-[11px] text-muted-foreground">{p.position || "Sem posição"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {p.jersey_number && (
                            <span className="bg-card border border-border rounded-md px-1.5 py-0.5 font-bold text-foreground">
                              #{p.jersey_number}
                            </span>
                          )}
                          <span>★{p.rating || 0}</span>
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </div>
            )}
          </motion.div>
        )}

        {/* Pending match requests */}
        {pendingRequests.length > 0 && (
          <div>
            <h2 className="text-sm font-display text-foreground mb-2">PEDIDOS DE MATCH RECEBIDOS</h2>
            <div className="space-y-2">
              {pendingRequests.map((m) => {
                const homeTeam = m.home_team as any;
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
                      <Button size="sm" className="h-6 text-[10px] px-2 bg-gradient-primary text-primary-foreground border-0">Aceitar</Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2">Recusar</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Scorers */}
        {topScorers.length > 0 && (
          <div>
            <h2 className="text-sm font-display text-foreground mb-2">ARTILHARIA — {myTeam?.name?.toUpperCase()}</h2>
            <div className="space-y-1.5">
              {topScorers.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 bg-card rounded-xl border border-border p-3">
                  <span className={`text-lg font-display w-6 text-center ${i === 0 ? "text-warning" : "text-muted-foreground"}`}>{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.position || "—"}</p>
                  </div>
                  <span className="text-sm font-display text-foreground">{p.goals} ⚽</span>
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
