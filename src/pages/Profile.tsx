import { useState, useRef, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, LogOut, Pencil, Camera, Trash2 } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useProfile, useUpdateProfile, useUploadAvatar, useAuth } from "@/hooks/useSupabaseData";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [cityOptions, setCityOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!editOpen || cityOptions.length > 0) return;
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios")
      .then((r) => r.json())
      .then((data: any[]) => {
        const names = Array.from(
          new Set(data.map((m) => `${m.nome} - ${m.microrregiao?.mesorregiao?.UF?.sigla || ""}`))
        ).sort();
        setCityOptions(names);
      })
      .catch(() => setCityOptions([]));
  }, [editOpen, cityOptions.length]);

  const handleLogout = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const openEditProfile = () => {
    setEditName(profile?.display_name || "");
    setEditLastName((profile as any)?.last_name || "");
    setEditNickname(profile?.nickname || "");
    setEditPhone(profile?.phone || "");
    setEditBirthDate(profile?.birth_date || "");
    setEditCity((profile as any)?.city || "");
    setEditRegion(profile?.region || "");
    setEditEmail((profile as any)?.email || user?.email || "");
    setEditOpen(true);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!editEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
      toast({ title: "E-mail é obrigatório", description: "Informe um e-mail válido.", variant: "destructive" });
      return;
    }
    updateProfile.mutate({
      display_name: editName.trim(),
      nickname: editNickname.trim() || undefined,
      phone: editPhone || undefined,
      birth_date: editBirthDate || undefined,
      region: editRegion.trim() || undefined,
      email: editEmail.trim(),
    });
    setEditOpen(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    uploadAvatar.mutate(file);
  };

  const handleDeleteAccount = async () => {
    updateProfile.mutate({ display_name: "[Conta Desativada]", avatar_url: "" });
    navigate("/");
    toast({ title: "Conta desativada" });
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
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top bar com voltar */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Configurações</p>
          <h1 className="text-xl font-display text-foreground truncate">MEUS DADOS</h1>
        </div>
      </div>

      {/* Header */}
      <div className="relative px-5 pt-4 pb-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          {/* Avatar with upload */}
          <div className="relative mb-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-primary/30"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-4xl">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <h1 className="text-3xl text-foreground font-display">
            {(profile?.nickname || profile?.display_name || "SEM NOME").toUpperCase()}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{(profile as any)?.email || user?.email || ""}</p>
          {profile?.is_pro && (
            <span className="mt-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">PRO</span>
          )}
        </motion.div>
      </div>

      {/* Profile Info */}
      <div className="px-5 space-y-3">
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Informações Pessoais</h3>
              <button onClick={openEditProfile} className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                <Pencil size={14} className="text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: "Nome", value: profile?.display_name },
                { label: "Nome Social", value: profile?.nickname },
                { label: "Celular", value: profile?.phone },
                { label: "Data de Nascimento", value: profile?.birth_date },
                { label: "Região", value: profile?.region },
                { label: "E-mail", value: (profile as any)?.email || user?.email },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground text-right max-w-[60%] truncate">{item.value || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-1">
            {[
              { label: "Meu Time", path: "/team" },
              { label: "Histórico de Partidas", path: "/match" },
              { label: "Ranking", path: "/ranking" },
            ].map((item, i) => (
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

          {/* Logout */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <LogOut size={16} className="mr-2" /> Sair da Conta
          </Button>

          {/* Delete account */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-destructive">
                <Trash2 size={14} className="mr-1" /> Desativar minha conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar conta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação vai desativar seu perfil. Você pode entrar em contato para reativação.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground">
                  Desativar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">EDITAR PERFIL</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-secondary border-border" required />
            </div>
            <div>
              <Label>Nome Social</Label>
              <Input value={editNickname} onChange={(e) => setEditNickname(e.target.value)} placeholder="Como quer aparecer no app" className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Celular</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label>Data de Nascimento</Label>
              <Input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Região</Label>
              <Input value={editRegion} onChange={(e) => setEditRegion(e.target.value)} placeholder="Ex: Zona Sul - SP" className="bg-secondary border-border" />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="bg-secondary border-border"
              />
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
