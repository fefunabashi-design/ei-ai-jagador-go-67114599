import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, ChevronRight, Trophy, Target, Zap, Star, LogOut, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useUpdateProfile } from "@/hooks/useSupabaseData";
import BottomNav from "@/components/BottomNav";

const positions = [
  "Goleiro", "Zagueiro", "Lateral Direito", "Lateral Esquerdo",
  "Volante", "Meia", "Ponta Direita", "Ponta Esquerda", "Atacante",
];

const menuItems = [
  { label: "Meus Times", path: "/team" },
  { label: "Histórico de Partidas", path: "/match" },
  { label: "Ranking", path: "/ranking" },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editNumber, setEditNumber] = useState(0);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const openEdit = () => {
    setEditName(profile?.display_name || "");
    setEditPosition(profile?.position || "");
    setEditNumber(profile?.jersey_number || 0);
    setEditOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      display_name: editName,
      position: editPosition,
      jersey_number: editNumber,
    });
    setEditOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const initials = (profile?.display_name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative px-5 pt-12 pb-6">
        <button onClick={openEdit} className="absolute right-5 top-12 p-2 rounded-lg bg-card border border-border">
          <Pencil size={18} className="text-muted-foreground" />
        </button>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-4xl mb-3">
            {initials}
          </div>
          <h1 className="text-3xl text-foreground">{(profile?.display_name || "SEM NOME").toUpperCase()}</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.position || "Posição não definida"} · #{profile?.jersey_number || 0} · {profile?.team_name || "Sem time"}
          </p>
        </motion.div>
      </div>

      {/* Menu */}
      <div className="px-5 space-y-1">
        {menuItems.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.03 }}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <span className="text-sm text-foreground">{item.label}</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </motion.button>
        ))}
      </div>

      <div className="px-5 mt-6">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <LogOut size={16} className="mr-2" /> Sair da Conta
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">EDITAR PERFIL</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-secondary border-border" required />
            </div>
            <div>
              <Label>Posição</Label>
              <Select value={editPosition} onValueChange={setEditPosition}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número</Label>
              <Input type="number" value={editNumber} onChange={(e) => setEditNumber(parseInt(e.target.value) || 0)} min={0} max={99} className="bg-secondary border-border" />
            </div>
            <Button type="submit" disabled={updateProfile.isPending} className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold">
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
