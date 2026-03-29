import { motion } from "framer-motion";
import { Zap, Trophy, Target, TrendingUp, Search, Users, CreditCard, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import PlayerSummons from "@/components/PlayerSummons";
import BottomNav from "@/components/BottomNav";
import { useProfile, useMyTeam, useMatches } from "@/hooks/useSupabaseData";
import heroBg from "@/assets/hero-bg.jpg";
import logo from "@/assets/logo.png";

const quickActions = [
  { icon: Search, label: "Buscar Adversário", path: "/match" },
  { icon: Users, label: "Escalar Time", path: "/team" },
  { icon: CreditCard, label: "Agenda", path: "/agenda" },
  { icon: Trophy, label: "Artilharia", path: "/ranking" },
];

const Index = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: myTeam } = useMyTeam();
  const { data: matches = [] } = useMatches();

  const upcomingMatches = matches
    .filter((m) => m.status === "open" || m.status === "confirmed")
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero */}
      <div className="relative h-56 overflow-hidden">
        <img src={heroBg} alt="Campo de futebol" className="absolute inset-0 w-full h-full object-cover opacity-40" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 to-background" />
        <div className="relative z-10 flex flex-col items-start justify-end h-full px-5 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <img src={logo} alt="E Ai Jogador" width={32} height={32} />
            <h1 className="text-3xl text-foreground tracking-wider">E AÍ JOGADOR</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {profile?.display_name ? `Fala, ${profile.display_name.split(" ")[0]}! ⚽` : "Bora pra pelada! ⚽"}
          </p>
        </div>
      </div>

      <div className="px-5 space-y-6 mt-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <action.icon size={18} className="text-primary" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Info cards */}
        {!myTeam && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
            <p className="text-sm text-primary mb-2">Você ainda não tem um time!</p>
            <Button size="sm" onClick={() => navigate("/team")} className="bg-gradient-primary text-primary-foreground border-0">
              Criar Time
            </Button>
          </motion.div>
        )}

        {myTeam && (
          <div>
            <h2 className="text-2xl text-foreground mb-3">MEU TIME</h2>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-xl shrink-0">
                {myTeam.abbreviation || myTeam.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-display text-lg text-foreground">{myTeam.name.toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">{myTeam.format} · {myTeam.region || "Sem região"}</p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Upcoming Matches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl text-foreground">PRÓXIMAS PARTIDAS</h2>
            <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => navigate("/match")}>
              Ver todas
            </Button>
          </div>
          {upcomingMatches.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6 bg-card rounded-xl border border-border">
              Nenhuma partida agendada
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingMatches.map((match) => {
                const homeTeam = match.home_team as any;
                const awayTeam = match.away_team as any;
                const date = new Date(match.match_date);
                const timeStr = date.toLocaleDateString("pt-BR", { weekday: "short" }) + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

                return (
                  <div key={match.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        match.status === "confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}>
                        {match.status === "confirmed" ? "Confirmado" : "Aberto"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-foreground">{homeTeam?.name?.toUpperCase() || "???"}</span>
                      <span className="text-xs text-muted-foreground font-bold">VS</span>
                      <span className="font-display text-foreground">{awayTeam?.name?.toUpperCase() || "???"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{match.location} · {timeStr} · {match.format}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Player Summons */}
        <PlayerSummons />
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
