import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, LogOut, Pencil, Camera, Search, Plus, UserPlus, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import { useProfile, useUpdateProfile, useMyTeam, useCreateTeam, useUpdateTeam, usePlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer } from "@/hooks/useSupabaseData";
import BottomNav from "@/components/BottomNav";
import PlayerCard from "@/components/PlayerCard";
import { useToast } from "@/hooks/use-toast";

const positions = [
  "Goleiro", "Zagueiro", "Lateral Direito", "Lateral Esquerdo",
  "Volante", "Meia", "Ponta Direita", "Ponta Esquerda", "Atacante",
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: team, isLoading: teamLoading } = useMyTeam();
  const { data: players = [] } = usePlayers(team?.id);
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();

  const isAdmin = profile?.role === "admin";

  // Profile edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");

  // Team edit state
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamFormat, setTeamFormat] = useState("8x8");
  const [teamRegion, setTeamRegion] = useState("");
  const [isEditingTeam, setIsEditingTeam] = useState(false);

  // Player state
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");
  const [playerNumber, setPlayerNumber] = useState(0);

  // Search player by email
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // === Profile handlers ===
  const openEditProfile = () => {
    setEditName(profile?.display_name || "");
    setEditPhone(profile?.phone || "");
    setEditBirthDate(profile?.birth_date || "");
    setEditOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      display_name: editName,
      phone: editPhone,
      birth_date: editBirthDate || undefined,
    });
    setEditOpen(false);
  };

  const handleToggleRole = () => {
    const newRole = isAdmin ? "player" : "admin";
    updateProfile.mutate({ role: newRole });
  };

  // === Team handlers ===
  const openCreateTeam = () => {
    setIsEditingTeam(false);
    setTeamName("");
    setTeamFormat("8x8");
    setTeamRegion("");
    setTeamDialogOpen(true);
  };

  const openEditTeam = () => {
    if (!team) return;
    setIsEditingTeam(true);
    setTeamName(team.name);
    setTeamFormat(team.format || "8x8");
    setTeamRegion(team.region || "");
    setTeamDialogOpen(true);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const abbr = teamName.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
    if (isEditingTeam && team) {
      updateTeam.mutate({ id: team.id, name: teamName, abbreviation: abbr, format: teamFormat, region: teamRegion });
    } else {
      createTeam.mutate({ name: teamName, abbreviation: abbr, format: teamFormat, region: teamRegion });
    }
    setTeamDialogOpen(false);
  };

  // === Player handlers ===
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

  const handleSearchPlayer = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchResult(null);
    // Search by looking up auth user email via profiles
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("display_name", `%${searchEmail}%`);
    
    if (error || !data || data.length === 0) {
      setSearchResult("not_found");
    } else {
      setSearchResult(data);
    }
    setSearching(false);
  };

  const handleAddFoundPlayer = async (foundProfile: any) => {
    if (!team) return;
    createPlayer.mutate({
      team_id: team.id,
      name: foundProfile.display_name || "Sem nome",
      position: foundProfile.position || undefined,
      jersey_number: foundProfile.jersey_number || 0,
    });
    setSearchEmail("");
    setSearchResult(null);
    toast({ title: "Jogador adicionado ao time! ⚽" });
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

  const defaultTab = isAdmin ? "profile" : "profile";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="relative px-5 pt-12 pb-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-4xl">
              {initials}
            </div>
          </div>
          <h1 className="text-3xl text-foreground font-display">{(profile?.display_name || "SEM NOME").toUpperCase()}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={isAdmin ? "default" : "secondary"} className="text-[10px]">
              {isAdmin ? (
                <><Shield size={10} className="mr-1" /> Administrador</>
              ) : (
                <><User size={10} className="mr-1" /> Jogador</>
              )}
            </Badge>
          </div>
          <button
            onClick={handleToggleRole}
            className="mt-2 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Alternar para {isAdmin ? "Jogador" : "Administrador"}
          </button>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="px-5">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full bg-secondary">
            <TabsTrigger value="profile" className="flex-1 text-xs">Meu Perfil</TabsTrigger>
            {isAdmin && <TabsTrigger value="team" className="flex-1 text-xs">Meu Time</TabsTrigger>}
            {isAdmin && <TabsTrigger value="players" className="flex-1 text-xs">Jogadores</TabsTrigger>}
          </TabsList>

          {/* ==================== TAB: MEU PERFIL ==================== */}
          <TabsContent value="profile" className="space-y-3 mt-4">
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {/* Info cards */}
              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Informações Pessoais</h3>
                  <button onClick={openEditProfile} className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                    <Pencil size={14} className="text-muted-foreground" />
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome</span>
                    <span className="text-foreground">{profile?.display_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Celular</span>
                    <span className="text-foreground">{profile?.phone || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data de Nascimento</span>
                    <span className="text-foreground">{profile?.birth_date || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posição</span>
                    <span className="text-foreground">{profile?.position || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Camisa</span>
                    <span className="text-foreground">#{profile?.jersey_number || 0}</span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="space-y-1">
                {[
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
            </motion.div>
          </TabsContent>

          {/* ==================== TAB: MEU TIME (Admin only) ==================== */}
          {isAdmin && (
            <TabsContent value="team" className="space-y-3 mt-4">
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                {teamLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : !team ? (
                  <div className="bg-card rounded-xl border border-border border-dashed p-8 text-center">
                    <p className="text-muted-foreground text-sm mb-4">Você ainda não tem um time cadastrado</p>
                    <Button onClick={openCreateTeam} className="bg-gradient-primary text-primary-foreground border-0">
                      <Plus size={16} className="mr-1" /> Criar Time
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-foreground">Informações do Time</h3>
                        <button onClick={openEditTeam} className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                          <Pencil size={14} className="text-muted-foreground" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-2xl shrink-0">
                          {team.abbreviation || team.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-display text-xl text-foreground">{team.name.toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">
                            {team.format} · {team.region || "Sem região"} · ⭐ {Number(team.rating || 0).toFixed(1)}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Formato</span>
                          <span className="text-foreground">{team.format || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Região</span>
                          <span className="text-foreground">{team.region || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Jogadores</span>
                          <span className="text-foreground">{players.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </TabsContent>
          )}

          {/* ==================== TAB: JOGADORES (Admin only) ==================== */}
          {isAdmin && (
            <TabsContent value="players" className="space-y-3 mt-4">
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {!team ? (
                  <div className="bg-card rounded-xl border border-border border-dashed p-8 text-center">
                    <p className="text-muted-foreground text-sm">Crie um time primeiro na aba "Meu Time"</p>
                  </div>
                ) : (
                  <>
                    {/* Search player */}
                    <div className="bg-card rounded-xl border border-border p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-3">Buscar Jogador</h3>
                      <div className="flex gap-2">
                        <Input
                          value={searchEmail}
                          onChange={(e) => setSearchEmail(e.target.value)}
                          placeholder="Buscar por nome..."
                          className="bg-secondary border-border flex-1"
                        />
                        <Button onClick={handleSearchPlayer} disabled={searching} size="sm" className="bg-gradient-primary text-primary-foreground border-0 shrink-0">
                          <Search size={14} />
                        </Button>
                      </div>

                      {searchResult === "not_found" && (
                        <div className="mt-3 p-3 rounded-lg bg-secondary text-center">
                          <p className="text-xs text-muted-foreground mb-2">Nenhum jogador encontrado</p>
                          <Button size="sm" onClick={openNewPlayer} variant="outline" className="text-xs">
                            <UserPlus size={12} className="mr-1" /> Cadastrar Novo Jogador
                          </Button>
                        </div>
                      )}

                      {Array.isArray(searchResult) && searchResult.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {searchResult.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary">
                              <div>
                                <p className="text-sm text-foreground font-medium">{p.display_name || "Sem nome"}</p>
                                <p className="text-[10px] text-muted-foreground">{p.position || "Sem posição"}</p>
                              </div>
                              <Button size="sm" onClick={() => handleAddFoundPlayer(p)} className="bg-gradient-primary text-primary-foreground border-0 text-xs">
                                <Plus size={12} className="mr-1" /> Adicionar
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add new */}
                    <Button onClick={openNewPlayer} className="w-full bg-gradient-primary text-primary-foreground border-0">
                      <Plus size={16} className="mr-1" /> Novo Jogador
                    </Button>

                    {/* Player list */}
                    <div className="space-y-2">
                      {players.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-4">Nenhum jogador no elenco</p>
                      ) : (
                        players.map((player, i) => (
                          <motion.div
                            key={player.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
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
                    </div>
                  </>
                )}
              </motion.div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* ==================== DIALOGS ==================== */}

      {/* Edit Profile Dialog */}
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
              <Label>Celular</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="(11) 99999-9999" className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Data de Nascimento</Label>
              <Input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className="bg-secondary border-border" />
            </div>
            <Button type="submit" disabled={updateProfile.isPending} className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold">
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{isEditingTeam ? "EDITAR TIME" : "CRIAR TIME"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTeam} className="space-y-4">
            <div>
              <Label>Nome do Time</Label>
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Ex: Os Crias FC" className="bg-secondary border-border" required />
            </div>
            <div>
              <Label>Formato</Label>
              <Select value={teamFormat} onValueChange={setTeamFormat}>
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
              <Input value={teamRegion} onChange={(e) => setTeamRegion(e.target.value)} placeholder="Ex: Zona Sul" className="bg-secondary border-border" />
            </div>
            <Button type="submit" disabled={createTeam.isPending || updateTeam.isPending} className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold">
              {isEditingTeam ? "Salvar Alterações" : "Criar Time"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Player Dialog */}
      <Dialog open={playerDialogOpen} onOpenChange={setPlayerDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingPlayer ? "EDITAR JOGADOR" : "NOVO JOGADOR"}</DialogTitle>
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
                  {positions.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
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

export default ProfilePage;
