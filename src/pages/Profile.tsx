import { motion } from "framer-motion";
import { Settings, ChevronRight, Trophy, Target, Zap, Star, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

const stats = [
  { icon: Target, label: "Gols", value: 12 },
  { icon: Zap, label: "Partidas", value: 28 },
  { icon: Trophy, label: "Vitórias", value: 18 },
  { icon: Star, label: "Avaliação", value: "8.5" },
];

const menuItems = [
  { label: "Editar Perfil", path: "#" },
  { label: "Meus Times", path: "#" },
  { label: "Histórico de Partidas", path: "#" },
  { label: "Pagamentos", path: "#" },
  { label: "Configurações", path: "#" },
  { label: "Ajuda & Suporte", path: "#" },
];

const ProfilePage = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="relative px-5 pt-12 pb-6">
        <button className="absolute right-5 top-12 p-2 rounded-lg bg-card border border-border">
          <Settings size={18} className="text-muted-foreground" />
        </button>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-4xl mb-3">
            CS
          </div>
          <h1 className="text-3xl text-foreground">CARLOS SILVA</h1>
          <p className="text-sm text-muted-foreground">Atacante · #9 · Os Crias FC</p>
        </motion.div>
      </div>

      {/* Stats row */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border p-3 text-center"
            >
              <stat.icon size={16} className="text-primary mx-auto mb-1" />
              <p className="font-display text-xl text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="px-5 space-y-1">
        {menuItems.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.03 }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <span className="text-sm text-foreground">{item.label}</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </motion.button>
        ))}
      </div>

      {/* Logout */}
      <div className="px-5 mt-6">
        <Button variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10">
          <LogOut size={16} className="mr-2" /> Sair da Conta
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
