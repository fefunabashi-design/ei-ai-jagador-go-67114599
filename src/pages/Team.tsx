import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Lock, Crown, Camera, Search, UserPlus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PlayerCard from "@/components/PlayerCard";
import BottomNav from "@/components/BottomNav";
import {
  useProfile,
  useMyTeam,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useUploadTeamLogo,
  usePlayers,
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
} from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";

const positions = [
  "Goleiro", "Zagueiro", "Lateral Direito", "Lateral Esquerdo",
  "Volante", "Meia", "Ponta Direita", "Ponta Esquerda", "Atacante",
];

const TeamPage = () => {
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const { data: team, isLoading: teamLoading } = useMyTeam();
  const { data: players = [], isLoading: playersLoading } = usePlayers(team?.id);
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const uploadLogo = useUploadTeamLogo();
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isPro = profile?.is_pro === true;

  // Team form state
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [form, setForm] = useState({
    name: "", field_name: "", field_address: "", phone: "", email: "",
    instagram: "", foundation_date: "", founder_name: "", war_cry: "",
    coach_name: "", admin_name: "", admin_email: "", admin_phone: "",
    substitute_name: "", president_name: "", president_email: "", format: "8x8", region: "",
  });

  // Player form state
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");
  const [playerNumber, setPlayerNumber] = useState(0);

  const setField = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const openCreateTeam = () => {
    if (!isPro) return;
    setIsEditingTeam(false);
    setForm({
      name: "", field_name: "", field_address: "", phone: "", email: "",
      instagram: "", foundation_date: "", founder_name: "", war_cry: "",
      coach_name: "", admin_name: "", admin_email: "", admin_phone: "",
      substitute_name: "", president_name: "", president_email: "", format: "8x8", region: "",
    });
    setTeamDialogOpen(true);
  };

  const openEditTeam = () => {
    if (!team) return;
    setIsEditingTeam(true);
    setForm({
      name: team.name || "",
      field_name: (team as any).field_name || "",
      field_address: (team as any).field_address || "",
      phone: (team as any).phone || "",
      email: (team as any).email || "",
      instagram: (team as any).instagram || "",
      foundation_date: (team as any).foundation_date || "",
      founder_name: (team as any).founder_name || "",
      war_cry: (team as any).war_cry || "",
      coach_name: (team as any).coach_name || "",
      admin_name: (team as any).admin_name || "",
      admin_email: (team as any).admin_email || "",
      admin_phone: (team as any).admin_phone || "",
      substitute_name: (team as any).substitute_name || "",
      president_name: (team as any).president_name || "",
      president_email: (team as any).president_email || "",
      format: team.format || "8x8",
      region: team.region || "",
    });
    setTeamDialogOpen(true);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Nome do time é obrigatório", variant: "destructive" });
      return;
    }
    const abbr = form.name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
    const payload = { ...form, abbreviation: abbr };
    if (isEditingTeam && team) {
      updateTeam.mutate({ id: team.id, ...payload });
    } else {
      createTeam.mutate(payload);
    }
    setTeamDialogOpen(false);
  };

  const handleDeleteTeam = () => {
    if (!team) return;
    deleteTeam.mutate(team.id);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !team) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    uploadLogo.mutate({ teamId: team.id, file });
  };

  // Player handlers
  const openNewPlayer = () => {
    setEditingPlayer(null);
    setPlayerName("");
    setPlayerPosition("");
    setPlayerNumber(0);
    setPlayerDialogOpen(true);
  };

  const openEditPlayer = (player: any) => {
    setEditingPlayer(player);
    setPlayerName(player.name);
    setPlayerPosition(player.position || "");
    setPlayerNumber(player.jersey_number || 0);
    setPlayerDialogOpen(true);
  };

  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    if (editingPlayer) {
      updatePlayer.mutate({ id: editingPlayer.id, team_id: team.id, name: playerName, position: playerPosition, jersey_number: playerNumber });
    } else {
      createPlayer.mutate({ team_id: team.id, name: playerName, position: playerPosition, jersey_number: playerNumber });
    }
    setPlayerDialogOpen(false);
  };

  const handleRemovePlayer = (id: string) => {
    if (!team) return;
    deletePlayer.mutate({ id, teamId: team.id });
  };

  if (teamLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // PRO gate: user is NOT pro and has no team
  if (!isPro && !team) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="px-5 pt-12 pb-4">
          <h1 className="text-4xl text-foreground font-display">MEU TIME</h1>
        </div>
        <div className="px-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-8 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Lock size={28} className="text-primary" />
            </div>
            <h2 className="text-lg font-display text-foreground">RECURSO PRO</h2>
            <p className="text-sm text-muted-foreground">
              O cadastro de time é exclusivo para usuários PRO. Faça upgrade do seu plano para criar e gerenciar seu time.
            </p>
            <Button className="bg-gradient-primary text-primary-foreground border-0">
              <Crown size={16} className="mr-2" /> Fazer Upgrade para PRO
            </Button>
          </motion.div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // No team yet (PRO user)
  if (!team) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="px-5 pt-12 pb-4">
          <h1 className="text-4xl text-foreground font-display">MEU TIME</h1>
          <p className="text-sm text-muted-foreground mt-1">Você ainda não tem um time</p>
        </div>
        <div className="px-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border border-dashed p-8 text-center"
          >
            <p className="text-muted-foreground text-sm mb-4">Crie seu time para começar</p>
            <Button onClick={openCreateTeam} className="bg-gradient-primary text-primary-foreground border-0">
              <Plus size={16} className="mr-1" /> Criar Time
            </Button>
          </motion.div>
        </div>

        <TeamFormDialog
          open={teamDialogOpen}
          onOpenChange={setTeamDialogOpen}
          isEditing={false}
          form={form}
          setField={setField}
          onSubmit={handleSaveTeam}
          isPending={createTeam.isPending}
        />

        <BottomNav />
      </div>
    );
  }

  // Has team
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-4xl text-foreground font-display">MEU TIME</h1>
      </div>

      <div className="px-5">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full bg-secondary">
            <TabsTrigger value="info" className="flex-1 text-xs">Dados do Time</TabsTrigger>
            <TabsTrigger value="players" className="flex-1 text-xs">Jogadores</TabsTrigger>
          </TabsList>

          {/* Team Info Tab */}
          <TabsContent value="info" className="space-y-3 mt-4">
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {/* Team banner */}
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    {(team as any).logo_url ? (
                      <img src={(team as any).logo_url} alt="Escudo" className="w-16 h-16 rounded-2xl object-cover border border-border" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-2xl shrink-0">
                        {team.abbreviation || team.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground"
                    >
                      <Camera size={10} />
                    </button>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </div>
                  <div>
                    <p className="font-display text-xl text-foreground">{team.name.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {team.format} · {team.region || "Sem região"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Informações</h3>
                  <button onClick={openEditTeam} className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                    <Pencil size={14} className="text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  {[
                    { label: "Nome do Campo", value: (team as any).field_name },
                    { label: "Endereço", value: (team as any).field_address },
                    { label: "Telefone", value: (team as any).phone },
                    { label: "E-mail", value: (team as any).email },
                    { label: "Instagram", value: (team as any).instagram },
                    { label: "Fundação", value: (team as any).foundation_date },
                    { label: "Fundador", value: (team as any).founder_name },
                    { label: "Grito de Guerra", value: (team as any).war_cry },
                    { label: "Técnico", value: (team as any).coach_name },
                    { label: "Administrador", value: (team as any).admin_name },
                    { label: "Presidente", value: (team as any).president_name },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-foreground text-right max-w-[55%] truncate">{item.value || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delete team */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} className="mr-1" /> Excluir Time
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir time?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação é irreversível. Todos os jogadores vinculados serão removidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive text-destructive-foreground">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </motion.div>
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players" className="space-y-3 mt-4">
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <Button onClick={openNewPlayer} className="w-full bg-gradient-primary text-primary-foreground border-0">
                <Plus size={16} className="mr-1" /> Novo Jogador
              </Button>

              {playersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : players.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhum jogador no elenco ainda</p>
              ) : (
                players.map((player, i) => (
                  <motion.div key={player.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <PlayerCard
                      name={player.name}
                      position={player.position || "Sem posição"}
                      number={player.jersey_number || 0}
                      goals={player.goals || 0}
                      matches={player.matches || 0}
                      rating={Number(player.rating || 0)}
                      onEdit={() => openEditPlayer(player)}
                      onRemove={() => handleRemovePlayer(player.id)}
                    />
                  </motion.div>
                ))
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Team Form Dialog */}
      <TeamFormDialog
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        isEditing={isEditingTeam}
        form={form}
        setField={setField}
        onSubmit={handleSaveTeam}
        isPending={createTeam.isPending || updateTeam.isPending}
      />

      {/* Player Dialog */}
      <Dialog open={playerDialogOpen} onOpenChange={setPlayerDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editingPlayer ? "EDITAR JOGADOR" : "NOVO JOGADOR"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePlayer} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Nome do jogador" className="bg-secondary border-border" required />
            </div>
            <div>
              <Label>Posição</Label>
              <Select value={playerPosition} onValueChange={setPlayerPosition}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número</Label>
              <Input type="number" value={playerNumber} onChange={(e) => setPlayerNumber(parseInt(e.target.value) || 0)} min={0} max={99} className="bg-secondary border-border" />
            </div>
            <Button type="submit" disabled={createPlayer.isPending || updatePlayer.isPending} className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold">
              {editingPlayer ? "Salvar Alterações" : "Adicionar Jogador"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

// Team form dialog component
const TeamFormDialog = ({
  open, onOpenChange, isEditing, form, setField, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isEditing: boolean;
  form: Record<string, string>;
  setField: (key: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}) => {
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{isEditing ? "EDITAR TIME" : "CRIAR TIME"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Nome do Time *</Label>
            <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Ex: Os Crias FC" className="bg-secondary border-border" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Formato</Label>
              <Select value={form.format} onValueChange={(v) => setField("format", v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5x5">5x5</SelectItem>
                  <SelectItem value="8x8">8x8</SelectItem>
                  <SelectItem value="11x11">11x11</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Região</Label>
              <Input value={form.region} onChange={(e) => setField("region", e.target.value)} placeholder="Zona Sul" className="bg-secondary border-border" />
            </div>
          </div>
          <div>
            <Label>Nome do Campo</Label>
            <Input value={form.field_name} onChange={(e) => setField("field_name", e.target.value)} placeholder="Campo do Parque" className="bg-secondary border-border" />
          </div>
          <div>
            <Label>Endereço do Campo</Label>
            <Input value={form.field_address} onChange={(e) => setField("field_address", e.target.value)} placeholder="Rua..." className="bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setField("phone", formatPhone(e.target.value))} placeholder="(11) 99999-9999" className="bg-secondary border-border" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="time@email.com" className="bg-secondary border-border" />
            </div>
          </div>
          <div>
            <Label>Instagram</Label>
            <Input value={form.instagram} onChange={(e) => setField("instagram", e.target.value)} placeholder="@seutime" className="bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data de Fundação</Label>
              <Input type="date" value={form.foundation_date} onChange={(e) => setField("foundation_date", e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Fundador</Label>
              <Input value={form.founder_name} onChange={(e) => setField("founder_name", e.target.value)} className="bg-secondary border-border" />
            </div>
          </div>
          <div>
            <Label>Grito de Guerra</Label>
            <Input value={form.war_cry} onChange={(e) => setField("war_cry", e.target.value)} placeholder="É gol!" className="bg-secondary border-border" />
          </div>
          <div>
            <Label>Técnico</Label>
            <Input value={form.coach_name} onChange={(e) => setField("coach_name", e.target.value)} className="bg-secondary border-border" />
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Administração</p>
            <div className="space-y-3">
              <div>
                <Label>Nome do Administrador</Label>
                <Input value={form.admin_name} onChange={(e) => setField("admin_name", e.target.value)} className="bg-secondary border-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>E-mail Admin</Label>
                  <Input type="email" value={form.admin_email} onChange={(e) => setField("admin_email", e.target.value)} className="bg-secondary border-border" />
                </div>
                <div>
                  <Label>Telefone Admin</Label>
                  <Input value={form.admin_phone} onChange={(e) => setField("admin_phone", formatPhone(e.target.value))} className="bg-secondary border-border" />
                </div>
              </div>
              <div>
                <Label>Substituto</Label>
                <Input value={form.substitute_name} onChange={(e) => setField("substitute_name", e.target.value)} className="bg-secondary border-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Presidente</Label>
                  <Input value={form.president_name} onChange={(e) => setField("president_name", e.target.value)} className="bg-secondary border-border" />
                </div>
                <div>
                  <Label>E-mail Presidente</Label>
                  <Input type="email" value={form.president_email} onChange={(e) => setField("president_email", e.target.value)} className="bg-secondary border-border" />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold">
            {isEditing ? "Salvar Alterações" : "Criar Time"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeamPage;
