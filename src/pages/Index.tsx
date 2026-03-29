import { motion } from "framer-motion";
import { Zap, Trophy, Target, TrendingUp, Search, Users, CreditCard, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import MatchCard from "@/components/MatchCard";
import BottomNav from "@/components/BottomNav";
import heroBg from "@/assets/hero-bg.jpg";
import logo from "@/assets/logo.png";

const quickActions = [
  { icon: Search, label: "Buscar Adversário", path: "/match" },
  { icon: Users, label: "Escalar Time", path: "/team" },
  { icon: CreditCard, label: "Vaquinha", path: "/payments" },
  { icon: Trophy, label: "Artilharia", path: "/ranking" },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={heroBg}
          alt="Campo de futebol"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 to-background" />
        <div className="relative z-10 flex flex-col items-start justify-end h-full px-5 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <img src={logo} alt="E Ai Jogador" width={32} height={32} />
            <h1 className="text-3xl text-foreground tracking-wider">E AÍ JOGADOR</h1>
          </div>
          <p className="text-sm text-muted-foreground">Bora pra pelada! ⚽</p>
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

        {/* Stats */}
        <div>
          <h2 className="text-2xl text-foreground mb-3">SUAS STATS</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Target} label="Gols" value={12} trend="+3" delay={0.1} />
            <StatCard icon={Zap} label="Partidas" value={28} trend="+2" delay={0.15} />
            <StatCard icon={Trophy} label="Vitórias" value={18} delay={0.2} />
            <StatCard icon={TrendingUp} label="Avaliação" value="8.5" delay={0.25} />
          </div>
        </div>

        {/* Upcoming Matches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl text-foreground">PRÓXIMAS PARTIDAS</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs"
              onClick={() => navigate("/match")}
            >
              Ver todas
            </Button>
          </div>
          <div className="space-y-3">
            <MatchCard
              homeTeam="Os Crias FC"
              awayTeam="Vila Nova SC"
              location="Campo do Zé"
              time="Sáb 16h"
              format="8x8"
              status="confirmed"
              delay={0.1}
            />
            <MatchCard
              homeTeam="Os Crias FC"
              location="Arena Pelada"
              time="Dom 10h"
              format="5x5"
              compatibility={87}
              status="open"
              delay={0.2}
            />
          </div>
        </div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Pendências</h3>
            <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
              3
            </span>
          </div>
          <div className="space-y-2">
            {[
              "💰 Vaquinha pendente: R$ 25,00 - Sábado",
              "✅ Confirme presença: Dom 10h",
              "⭐ Avalie a partida de ontem",
            ].map((item, i) => (
              <p key={i} className="text-xs text-muted-foreground py-1.5 border-b border-border last:border-0">
                {item}
              </p>
            ))}
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
