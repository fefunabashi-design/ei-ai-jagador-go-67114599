import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Camera, UserPlus, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import BottomNav from "@/components/BottomNav";
import {
  useMyTeam,
  useMyTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useUploadTeamLogo,
  usePlayers,
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
  useProfile,
} from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const POSITIONS = ["Gol", "Lat Esq", "Lat Dir", "Zaga", "Volante", "Meia", "Atacante"];

const CATEGORIAS = ["Todas", "Esporte", "Infantil", "35+", "40+", "45+", "50+", "60+"];

const REGIOES = ["Z/L", "Z/N", "Z/O", "Z/S"];

const WEEK_DAYS = [
  { value: "domingo", label: "Domingo" },
  { value: "segunda", label: "Segunda" },
  { value: "terca", label: "Terça" },
  { value: "quarta", label: "Quarta" },
  { value: "quinta", label: "Quinta" },
  { value: "sexta", label: "Sexta" },
  { value: "sabado", label: "Sábado" },
];

type TeamForm = {
  name: string;
  region: string;
  categoria: string;
  estilo: string;
  play_days: string[];
  play_time_start: string;
  play_time_end: string;
  play_schedule: Record<string, { mode: "fixed" | "flexible"; start: string; end: string }>;
  addr_cep: string;
  addr_rua: string;
  addr_numero: string;
  addr_bairro: string;
  addr_cidade: string;
  addr_uf: string;
  phone: string;
  mobile: string;
  email: string;
  instagram: string;
  foundation_date: string;
  founder_name: string;
  president_name: string;
  president_phone: string;
  coach_name: string;
  coach_phone: string;
  coach_email: string;
  assistant_coach_name: string;
  assistant_coach_phone: string;
  assistant_coach_email: string;
  admin_name: string;
  admin_phone: string;
  admin_email: string;
  admin_cpf: string;
  sub1_name: string;
  sub1_phone: string;
  sub1_email: string;
  sub1_cpf: string;
  observacoes: string;
};

const EMPTY_TEAM_FORM: TeamForm = {
  name: "",
  region: "",
  categoria: "",
  estilo: "",
  play_days: [],
  play_time_start: "",
  play_time_end: "",
  play_schedule: {},
  addr_cep: "",
  addr_rua: "",
  addr_numero: "",
  addr_bairro: "",
  addr_cidade: "",
  addr_uf: "",
  phone: "",
  mobile: "",
  email: "",
  instagram: "",
  foundation_date: "",
  founder_name: "",
  president_name: "",
  president_phone: "",
  coach_name: "",
  coach_phone: "",
  coach_email: "",
  assistant_coach_name: "",
  assistant_coach_phone: "",
  assistant_coach_email: "",
  admin_name: "",
  admin_phone: "",
  admin_email: "",
  admin_cpf: "",
  sub1_name: "",
  sub1_phone: "",
  sub1_email: "",
  sub1_cpf: "",
  observacoes: "",
};

const EMPTY_PLAYER_FORM = {
  name: "",
  last_name: "",
  nickname: "",
  birth_date: "",
  hire_date: "",
  jersey_number: "",
  phone: "",
  email: "",
  is_active: "true",
  observacoes: "",
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCpf = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const isValidCpf = (value: string) => {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === parseInt(cpf[10]);
};

const capitalizeFirst = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const TeamPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: activeTeam, isLoading: teamLoading } = useMyTeam();
  const { data: myTeams = [], isLoading: myTeamsLoading } = useMyTeams();
  const { data: myProfile, isLoading: profileLoading } = useProfile();
  const currentUserId = (myProfile as any)?.user_id;
  const ownedTeams = currentUserId ? myTeams.filter((t: any) => t.owner_id === currentUserId) : [];
  const isOwnerOfAny = ownedTeams.length > 0;
  // Prioriza o time ATIVO (logado) se for do usuário; senão cai no primeiro próprio
  const team =
    (activeTeam && ownedTeams.find((t: any) => t.id === activeTeam.id)) ||
    ownedTeams[0] ||
    null;
  const { data: players = [], isLoading: playersLoading } = usePlayers(team?.id);
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const uploadLogo = useUploadTeamLogo();
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  const [authEmail, setAuthEmail] = useState("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthEmail(data.user?.email || ""));
  }, []);
  const adminDefaults = {
    name: [(myProfile as any)?.display_name, (myProfile as any)?.last_name].filter(Boolean).join(" ").trim(),
    phone: (myProfile as any)?.phone || "",
    email: authEmail,
  };
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Team form
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({ ...EMPTY_TEAM_FORM });

  // Keep admin fields locked to the logged-in user's profile while the dialog is open
  useEffect(() => {
    if (!teamDialogOpen) return;
    setTeamForm((prev) => ({
      ...prev,
      admin_name: adminDefaults.name,
      admin_phone: adminDefaults.phone,
      admin_email: adminDefaults.email,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamDialogOpen, adminDefaults.name, adminDefaults.phone, adminDefaults.email]);

  // Player form
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [playerForm, setPlayerForm] = useState({ ...EMPTY_PLAYER_FORM });
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

  // Filter
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const setTF = <K extends keyof TeamForm>(key: K, value: TeamForm[K]) =>
    setTeamForm((p) => ({ ...p, [key]: value }));
  const setPF = (key: string, value: string) => setPlayerForm((p) => ({ ...p, [key]: value }));

  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (teamLoading || myTeamsLoading || profileLoading || autoOpened) return;
    // Aguarda hidratação dos dados de times antes de decidir
    const timer = setTimeout(() => {
      if (autoOpened) return;
      // Só abre o diálogo automaticamente se NÃO houver time cadastrado
      if (!team && !isOwnerOfAny) {
        setIsEditingTeam(false);
        setTeamForm({ ...EMPTY_TEAM_FORM });
        setTeamDialogOpen(true);
      }
      setAutoOpened(true);
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwnerOfAny, teamLoading, myTeamsLoading, profileLoading, team, autoOpened]);

  const openEditTeam = () => {
    if (!team) return;
    setIsEditingTeam(true);
    setTeamForm({
      name: team.name || "",
      region: (team as any).region || "",
      categoria: (team as any).categoria || "",
      estilo: (team as any).estilo || "",
      play_days: Array.isArray((team as any).play_days) ? (team as any).play_days : [],
      play_time_start: (team as any).play_time_start || "",
      play_time_end: (team as any).play_time_end || "",
      play_schedule: ((team as any).play_schedule && typeof (team as any).play_schedule === "object") ? (team as any).play_schedule : {},
      addr_cep: (team as any).addr_cep || "",
      addr_rua: (team as any).addr_rua || "",
      addr_numero: (team as any).addr_numero || "",
      addr_bairro: (team as any).addr_bairro || "",
      addr_cidade: (team as any).addr_cidade || "",
      addr_uf: (team as any).addr_uf || "",
      phone: (team as any).phone || "",
      mobile: (team as any).mobile || "",
      email: (team as any).email || "",
      instagram: (team as any).instagram || "",
      foundation_date: (team as any).foundation_date || "",
      founder_name: (team as any).founder_name || "",
      president_name: (team as any).president_name || "",
      president_phone: (team as any).president_phone || "",
      coach_name: (team as any).coach_name || "",
      coach_phone: (team as any).coach_phone || "",
      coach_email: (team as any).coach_email || "",
      assistant_coach_name: (team as any).assistant_coach_name || "",
      assistant_coach_phone: (team as any).assistant_coach_phone || "",
      assistant_coach_email: (team as any).assistant_coach_email || "",
      admin_name: (team as any).admin_name || "",
      admin_phone: (team as any).admin_phone || "",
      admin_email: (team as any).admin_email || "",
      admin_cpf: (team as any).admin_cpf || "",
      sub1_name: (team as any).sub1_name || "",
      sub1_phone: (team as any).sub1_phone || "",
      sub1_email: (team as any).sub1_email || "",
      sub1_cpf: (team as any).sub1_cpf || "",
      observacoes: (team as any).observacoes || "",
    });
    setTeamDialogOpen(true);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name.trim()) {
      toast({ title: "Nome do time é obrigatório", variant: "destructive" });
      return;
    }
    const abbr = teamForm.name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
    // Derive aggregate time window from per-day schedule (for back-compat displays)
    const starts: string[] = [];
    const ends: string[] = [];
    Object.values(teamForm.play_schedule || {}).forEach((s) => {
      if (s?.start) starts.push(s.start);
      if (s?.mode === "flexible" && s?.end) ends.push(s.end);
      else if (s?.mode === "fixed" && s?.start) ends.push(s.start);
    });
    const aggStart = starts.length ? starts.sort()[0] : teamForm.play_time_start;
    const aggEnd = ends.length ? ends.sort().slice(-1)[0] : teamForm.play_time_end;
    const payload: any = { ...teamForm, abbreviation: abbr, play_time_start: aggStart, play_time_end: aggEnd };
    if (!payload.foundation_date) payload.foundation_date = null;
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

  const openNewTeam = () => {
    setIsEditingTeam(false);
    setTeamForm({ ...EMPTY_TEAM_FORM });
    setTeamDialogOpen(true);
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

  const openNewPlayer = () => {
    setEditingPlayer(null);
    setPlayerForm({
      ...EMPTY_PLAYER_FORM,
      name: (myProfile as any)?.display_name || "",
      nickname: (myProfile as any)?.nickname || "",
      phone: (myProfile as any)?.phone || "",
      birth_date: (myProfile as any)?.birth_date || "",
      email: (myProfile as any)?.email || "",
    });
    setSelectedPositions([]);
    setPlayerDialogOpen(true);
  };

  const openEditPlayer = (player: any) => {
    setEditingPlayer(player);
    setPlayerForm({
      name: player.name || "",
      last_name: player.last_name || "",
      nickname: player.nickname || "",
      birth_date: player.birth_date || "",
      hire_date: player.hire_date || "",
      jersey_number: player.jersey_number?.toString() || "",
      phone: player.phone || "",
      email: player.email || "",
      is_active: player.is_active === false ? "false" : "true",
      observacoes: player.observacoes || "",
    });
    setSelectedPositions(
      Array.isArray(player.positions) ? player.positions : player.position ? [player.position] : []
    );
    setPlayerDialogOpen(true);
  };

  const togglePosition = (pos: string) => {
    setSelectedPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
  };

  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    if (!playerForm.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!playerForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(playerForm.email.trim())) {
      toast({ title: "E-mail é obrigatório", description: "Informe um e-mail válido para vincular a conta.", variant: "destructive" });
      return;
    }
    const data = {
      name: playerForm.name,
      last_name: playerForm.last_name || null,
      nickname: playerForm.nickname || null,
      display_name: playerForm.nickname?.trim() || playerForm.name,
      birth_date: playerForm.birth_date || null,
      hire_date: playerForm.hire_date || null,
      jersey_number: parseInt(playerForm.jersey_number) || 0,
      phone: playerForm.phone || null,
      email: playerForm.email || null,
      is_active: playerForm.is_active !== "false",
      positions: selectedPositions,
      position: selectedPositions[0] || null,
      observacoes: playerForm.observacoes || null,
    };
    if (editingPlayer) {
      updatePlayer.mutate({ id: editingPlayer.id, team_id: team.id, ...data } as any);
    } else {
      createPlayer.mutate({ team_id: team.id, ...data } as any);
    }
    setPlayerDialogOpen(false);
  };

  const handleRemovePlayer = (id: string) => {
    if (!team) return;
    deletePlayer.mutate({ id, teamId: team.id });
  };

  const filteredPlayers = players.filter((p) => {
    if (statusFilter === "active") return p.is_active !== false;
    if (statusFilter === "inactive") return p.is_active === false;
    return true;
  });

  if (teamLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="px-5 pt-12 pb-4">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <ArrowLeft size={14} /> Voltar ao Admin
          </button>
          <h1 className="text-4xl text-foreground font-display">GERENCIAR TIME</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastre seu time para começar</p>
        </div>
        <div className="px-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border border-dashed p-8 text-center"
          >
            <p className="text-muted-foreground text-sm">Abrindo formulário de cadastro...</p>
          </motion.div>
        </div>
        <TeamFormDialog
          open={teamDialogOpen}
          onOpenChange={setTeamDialogOpen}
          isEditing={false}
          form={teamForm}
          setField={setTF}
          onSubmit={handleSaveTeam}
          isPending={createTeam.isPending}
        />
        <BottomNav />
      </div>
    );
  }

  const activePlayers = players.filter((p) => p.is_active !== false);
  const inactivePlayers = players.filter((p) => p.is_active === false);
  const formattedPlayDays = Array.isArray((team as any).play_days)
    ? WEEK_DAYS.filter(({ value }) => (team as any).play_days.includes(value))
        .map(({ label }) => label)
        .join(", ")
    : "";
  const formattedPlayTime =
    (team as any).play_time_start && (team as any).play_time_end
      ? `${(team as any).play_time_start} até ${(team as any).play_time_end}`
      : (team as any).play_time_start || (team as any).play_time_end || "";

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <button onClick={() => navigate("/admin")} className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <ArrowLeft size={14} /> Voltar ao Admin
        </button>
        <h1 className="text-4xl text-foreground font-display">GERENCIAR TIME</h1>
      </div>

      <div className="px-5">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full bg-secondary">
            <TabsTrigger value="info" className="flex-1 text-xs">Dados do Time</TabsTrigger>
            <TabsTrigger value="players" className="flex-1 text-xs">
              Jogadores ({players.length})
            </TabsTrigger>
          </TabsList>

          {/* ─── Team Info Tab ─── */}
          <TabsContent value="info" className="space-y-3 mt-4">
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="bg-card rounded-xl border border-border p-4">
                {/* Header com escudo */}
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
                      {(team as any).categoria || "Sem categoria"} · {(team as any).region || "Sem região"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {activePlayers.length} ativos · {inactivePlayers.length} inativos
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
                    { label: "Categoria", value: (team as any).categoria },
                    { label: "Modalidade", value: (team as any).estilo },
                    { label: "Região", value: (team as any).region },
                    { label: "Dias de jogo", value: formattedPlayDays },
                    { label: "Horário", value: formattedPlayTime },
                    { label: "CEP", value: (team as any).addr_cep },
                    { label: "Rua", value: (team as any).addr_rua ? `${(team as any).addr_rua}${(team as any).addr_numero ? ", " + (team as any).addr_numero : ""}` : undefined },
                    { label: "Bairro", value: (team as any).addr_bairro },
                    { label: "Cidade/UF", value: (team as any).addr_cidade ? `${(team as any).addr_cidade}${(team as any).addr_uf ? " - " + (team as any).addr_uf : ""}` : undefined },
                    { label: "Telefone", value: (team as any).phone },
                    { label: "Celular", value: (team as any).mobile },
                    { label: "E-mail", value: (team as any).email },
                    { label: "Instagram", value: (team as any).instagram },
                    { label: "Fundação", value: (team as any).foundation_date },
                    { label: "Fundador", value: (team as any).founder_name },
                    { label: "Presidente", value: (team as any).president_name },
                    { label: "Cel. Presidente", value: (team as any).president_phone },
                    { label: "Técnico", value: (team as any).coach_name },
                    { label: "Cel. Técnico", value: (team as any).coach_phone },
                    { label: "Admin App", value: (team as any).admin_name },
                    { label: "Cel. Admin", value: (team as any).admin_phone },
                    { label: "Substituto 1", value: (team as any).sub1_name },
                    { label: "Cel. Sub 1", value: (team as any).sub1_phone },
                    { label: "Substituto 2", value: (team as any).sub2_name },
                    { label: "Cel. Sub 2", value: (team as any).sub2_phone },
                    { label: "Observações", value: (team as any).observacoes },
                  ].filter((item) => item.value).map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-foreground text-right max-w-[55%] text-xs">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

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

              <Button
                onClick={openNewTeam}
                variant="outline"
                className="w-full text-xs border-dashed"
              >
                <Plus size={14} className="mr-1" /> Cadastrar Novo Time
              </Button>
            </motion.div>
          </TabsContent>

          {/* ─── Players Tab ─── */}
          <TabsContent value="players" className="space-y-3 mt-4">
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <Button onClick={openNewPlayer} className="w-full bg-gradient-primary text-primary-foreground border-0">
                <Plus size={16} className="mr-1" /> Novo Jogador
              </Button>

              {/* Filtro de status */}
              <div className="flex gap-2">
                {(["all", "active", "inactive"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                      statusFilter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "all" ? `Todos (${players.length})` : f === "active" ? `Ativos (${activePlayers.length})` : `Inativos (${inactivePlayers.length})`}
                  </button>
                ))}
              </div>

              {playersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : filteredPlayers.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhum jogador encontrado</p>
              ) : (
                filteredPlayers.map((player, i) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-card rounded-xl border border-border p-3 flex items-center gap-3"
                  >
                    {/* Número */}
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-display text-primary">{player.jersey_number || "—"}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {player.display_name || player.nickname || player.name}
                        </p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                          player.is_active !== false
                            ? "bg-green-500/20 text-green-500"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {player.is_active !== false ? "Ativo" : "Inativo"}
                        </span>
                        {player.user_id ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 bg-primary/20 text-primary">
                            ✓ Vinculado
                          </span>
                        ) : player.invite_email ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 bg-amber-500/20 text-amber-500">
                            ✉ Convite
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {Array.isArray(player.positions) && player.positions.length > 0
                          ? player.positions.join(" · ")
                          : player.position || "Sem posição"}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEditPlayer(player)}
                        className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        <Pencil size={13} className="text-muted-foreground" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1.5 rounded-lg bg-secondary hover:bg-destructive/20 transition-colors">
                            <Trash2 size={13} className="text-muted-foreground" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover {player.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O jogador será removido do elenco.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemovePlayer(player.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
        form={teamForm}
        setField={setTF}
        onSubmit={handleSaveTeam}
        isPending={createTeam.isPending || updateTeam.isPending}
      />

      {/* Player Dialog */}
      <Dialog open={playerDialogOpen} onOpenChange={setPlayerDialogOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editingPlayer ? "EDITAR JOGADOR" : "NOVO JOGADOR"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePlayer} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={playerForm.name}
                  onChange={(e) => setPF("name", e.target.value)}
                  placeholder="Primeiro nome"
                  className="bg-secondary border-border"
                  required
                />
              </div>
              <div>
                <Label>Sobrenome</Label>
                <Input
                  value={playerForm.last_name}
                  onChange={(e) => setPF("last_name", e.target.value)}
                  placeholder="Sobrenome"
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <div>
              <Label>Nome Social</Label>
              <Input
                value={playerForm.nickname}
                onChange={(e) => setPF("nickname", e.target.value)}
                placeholder="Como aparece nas telas (opcional)"
                className="bg-secondary border-border"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Se preenchido, será usado em todas as telas</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={playerForm.birth_date}
                  onChange={(e) => setPF("birth_date", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <Label>Data de Contratação</Label>
                <Input
                  type="date"
                  value={playerForm.hire_date}
                  onChange={(e) => setPF("hire_date", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <div className="w-1/2 pr-1.5">
              <Label>Nº da Camisa</Label>
              <Input
                type="number"
                value={playerForm.jersey_number}
                onChange={(e) => setPF("jersey_number", e.target.value)}
                min={0}
                max={99}
                placeholder="10"
                className="bg-secondary border-border"
              />
            </div>

            {/* Posições — multi-select */}
            <div>
              <Label className="mb-2 block">Posição(ões)</Label>
              <div className="grid grid-cols-2 gap-2">
                {POSITIONS.map((pos) => (
                  <label key={pos} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedPositions.includes(pos)}
                      onCheckedChange={() => togglePosition(pos)}
                    />
                    <span className="text-sm text-foreground">{pos}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Celular</Label>
                <Input
                  value={playerForm.phone}
                  onChange={(e) => setPF("phone", formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  value={playerForm.email}
                  onChange={(e) => setPF("email", e.target.value)}
                  placeholder="email@email.com"
                  required
                  className="bg-secondary border-border"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Usado para vincular a conta do jogador no app.
                </p>
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={playerForm.is_active} onValueChange={(v) => setPF("is_active", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={playerForm.observacoes}
                onChange={(e) => setPF("observacoes", e.target.value)}
                placeholder="Informações adicionais..."
                className="bg-secondary border-border resize-none"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={createPlayer.isPending || updatePlayer.isPending}
              className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold"
            >
              <UserPlus size={16} className="mr-2" />
              {editingPlayer ? "Salvar Alterações" : "Adicionar Jogador"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

// ─── Team Form Dialog ───────────────────────────────────────────────────────
const TeamFormDialog = ({
  open, onOpenChange, isEditing, form, setField, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isEditing: boolean;
  form: TeamForm;
  setField: <K extends keyof TeamForm>(key: K, value: TeamForm[K]) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}) => {
  const [showAdmin, setShowAdmin] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [showAllWeekDays, setShowAllWeekDays] = useState(false);

  const togglePlayDay = (day: string) => {
    const isAdding = !form.play_days.includes(day);
    const nextDays = isAdding
      ? [...form.play_days, day]
      : form.play_days.filter((item) => item !== day);

    setField("play_days", nextDays);

    const nextSchedule = { ...form.play_schedule };
    if (isAdding) {
      if (!nextSchedule[day]) {
        nextSchedule[day] = { mode: "fixed", start: form.play_time_start || "", end: "" };
      }
    } else {
      delete nextSchedule[day];
    }
    setField("play_schedule", nextSchedule);
  };

  const updateDaySchedule = (
    day: string,
    patch: Partial<{ mode: "fixed" | "flexible"; start: string; end: string }>,
  ) => {
    const current = form.play_schedule[day] || { mode: "fixed" as const, start: "", end: "" };
    setField("play_schedule", { ...form.play_schedule, [day]: { ...current, ...patch } });
  };

  const visibleWeekDays = showAllWeekDays || form.play_days.length === 0
    ? WEEK_DAYS
    : WEEK_DAYS.filter((day) => form.play_days.includes(day.value));

  const handleCepChange = async (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setField("addr_cep", formatted);

    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setField("addr_rua", data.logradouro || "");
          setField("addr_bairro", data.bairro || "");
          setField("addr_cidade", data.localidade || "");
          setField("addr_uf", data.uf || "");
        }
      } catch (_) {
        // silently ignore
      } finally {
        setCepLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEditing ? "EDITAR TIME" : "CADASTRAR TIME"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Dados principais */}
          <div>
            <Label>Nome do Time *</Label>
            <Input
              value={form.name}
              onChange={(e) => setField("name", capitalizeFirst(e.target.value))}
              placeholder="Ex: Os Crias FC"
              className="bg-secondary border-border"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fundador</Label>
              <Input
                value={form.founder_name}
                onChange={(e) => setField("founder_name", e.target.value)}
                placeholder="Nome do fundador"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label>Data de Fundação</Label>
              <Input
                type="date"
                value={form.foundation_date}
                onChange={(e) => setField("foundation_date", e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Presidente</Label>
              <Input
                value={form.president_name}
                onChange={(e) => setField("president_name", e.target.value)}
                placeholder="Nome"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label>Cel. Presidente</Label>
              <Input
                value={form.president_phone}
                onChange={(e) => setField("president_phone", formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div>
            <Label>Categoria *</Label>
            <Select value={form.categoria} onValueChange={(v) => setField("categoria", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Modalidade *</Label>
            <Select value={form.estilo} onValueChange={(v) => setField("estilo", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Selecione a modalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Campo">Campo</SelectItem>
                <SelectItem value="Mini Campo (Society)">Mini Campo (Society)</SelectItem>
                <SelectItem value="Futsal">Futsal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Endereço */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <Label className="block">Dias da semana que o time joga *</Label>
              {form.play_days.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllWeekDays((value) => !value)}
                  className="text-[11px] font-medium text-primary"
                >
                  {showAllWeekDays ? "Ocultar não selecionados" : "Editar dias"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 rounded-xl border border-border p-3">
              {visibleWeekDays.map((day) => (
                <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.play_days.includes(day.value)}
                    onCheckedChange={() => togglePlayDay(day.value)}
                  />
                  <span className="text-sm text-foreground">{day.label}</span>
                </label>
              ))}
            </div>
          </div>

          {form.play_days.length > 0 && (
            <div className="space-y-2">
              <Label className="block">Horários por dia *</Label>
              <div className="space-y-2">
                {WEEK_DAYS.filter((d) => form.play_days.includes(d.value)).map((day) => {
                  const sched = form.play_schedule[day.value] || { mode: "fixed" as const, start: "", end: "" };
                  return (
                    <div key={day.value} className="rounded-xl border border-border p-3 space-y-2 bg-secondary/40">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{day.label}</span>
                        <div className="flex items-center gap-1 rounded-md bg-background border border-border p-0.5">
                          <button
                            type="button"
                            onClick={() => updateDaySchedule(day.value, { mode: "fixed", end: "" })}
                            className={`px-2.5 py-1 text-xs rounded ${sched.mode === "fixed" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                          >
                            Fixo
                          </button>
                          <button
                            type="button"
                            onClick={() => updateDaySchedule(day.value, { mode: "flexible" })}
                            className={`px-2.5 py-1 text-xs rounded ${sched.mode === "flexible" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                          >
                            Flexível
                          </button>
                        </div>
                      </div>
                      {sched.mode === "fixed" ? (
                        <div>
                          <Label className="text-xs text-muted-foreground">Horário</Label>
                          <Input
                            type="time"
                            value={sched.start}
                            onChange={(e) => updateDaySchedule(day.value, { start: e.target.value })}
                            className="bg-background border-border"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">De</Label>
                            <Input
                              type="time"
                              value={sched.start}
                              onChange={(e) => updateDaySchedule(day.value, { start: e.target.value })}
                              className="bg-background border-border"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Até</Label>
                            <Input
                              type="time"
                              value={sched.end}
                              onChange={(e) => updateDaySchedule(day.value, { end: e.target.value })}
                              className="bg-background border-border"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <p className="text-sm font-semibold text-foreground mb-2">Endereço do Campo</p>
          </div>

          <div>
            <Label>CEP *</Label>
            <div className="relative">
              <Input
                value={form.addr_cep}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="00000-000"
                maxLength={9}
                className="bg-secondary border-border pr-8"
              />
              {cepLoading && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Rua *</Label>
              <Input
                value={form.addr_rua}
                onChange={(e) => setField("addr_rua", e.target.value)}
                placeholder="Nome da rua"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label>Nº *</Label>
              <Input
                value={form.addr_numero}
                onChange={(e) => setField("addr_numero", e.target.value)}
                placeholder="123"
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bairro *</Label>
              <Input
                value={form.addr_bairro}
                onChange={(e) => setField("addr_bairro", e.target.value)}
                placeholder="Bairro"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label>
                Região{form.addr_cidade.trim().toLowerCase() === "são paulo" ? " *" : ""}
              </Label>
              <Select value={form.region} onValueChange={(v) => setField("region", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {REGIOES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Cidade *</Label>
              <Input
                value={form.addr_cidade}
                onChange={(e) => setField("addr_cidade", e.target.value)}
                placeholder="Cidade"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label>UF *</Label>
              <Input
                value={form.addr_uf}
                onChange={(e) => setField("addr_uf", e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setField("phone", formatPhone(e.target.value))}
                placeholder="(11) 3333-3333"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label>Celular</Label>
              <Input
                value={form.mobile}
                onChange={(e) => setField("mobile", formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="time@email.com"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input
                value={form.instagram}
                onChange={(e) => setField("instagram", e.target.value)}
                placeholder="@seutime"
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Técnico</Label>
              <Input
                value={form.coach_name}
                onChange={(e) => setField("coach_name", e.target.value)}
                placeholder="Nome"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label>Cel. Técnico</Label>
              <Input
                value={form.coach_phone}
                onChange={(e) => setField("coach_phone", formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div>
            <Label>E-mail Técnico</Label>
            <Input
              type="email"
              value={form.coach_email}
              onChange={(e) => setField("coach_email", e.target.value)}
              placeholder="tecnico@email.com"
              className="bg-secondary border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Aux. Técnico</Label>
              <Input
                value={form.assistant_coach_name}
                onChange={(e) => setField("assistant_coach_name", e.target.value)}
                placeholder="Nome"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label>Aux. Técnico Celular</Label>
              <Input
                value={form.assistant_coach_phone}
                onChange={(e) => setField("assistant_coach_phone", formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div>
            <Label>E-mail Aux. Técnico</Label>
            <Input
              type="email"
              value={form.assistant_coach_email}
              onChange={(e) => setField("assistant_coach_email", e.target.value)}
              placeholder="auxiliar@email.com"
              className="bg-secondary border-border"
            />
          </div>

          {/* Administração — colapsável */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdmin((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 text-sm font-semibold text-foreground"
            >
              <span>Administração do App</span>
              {showAdmin ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAdmin && (
              <div className="p-4 space-y-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Os dados do administrador do app são vinculados ao seu perfil de jogador e não podem ser alterados aqui. Para atualizá-los, edite seu perfil.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Admin App</Label>
                    <Input
                      value={form.admin_name}
                      readOnly
                      disabled
                      placeholder="Nome"
                      className="bg-muted/40 border-border cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <Label>Cel. Admin</Label>
                    <Input
                      value={form.admin_phone}
                      readOnly
                      disabled
                      placeholder="(11) 99999-9999"
                      className="bg-muted/40 border-border cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <Label>E-mail Admin</Label>
                  <Input
                    type="email"
                    value={form.admin_email}
                    readOnly
                    disabled
                    placeholder="admin@email.com"
                    className="bg-muted/40 border-border cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label>CPF Admin *</Label>
                  <Input
                    value={form.admin_cpf}
                    onChange={(e) => setField("admin_cpf", formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    className="bg-secondary border-border"
                  />
                </div>

                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Substitutos</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Substituto 1</Label>
                    <Input
                      value={form.sub1_name}
                      onChange={(e) => setField("sub1_name", e.target.value)}
                      placeholder="Nome"
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <Label>Cel. Sub 1</Label>
                    <Input
                      value={form.sub1_phone}
                      onChange={(e) => setField("sub1_phone", formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>

                <div>
                  <Label>E-mail Sub 1</Label>
                  <Input
                    type="email"
                    value={form.sub1_email}
                    onChange={(e) => setField("sub1_email", e.target.value)}
                    placeholder="sub1@email.com"
                    className="bg-secondary border-border"
                  />
                </div>

                <div>
                  <Label>CPF Sub 1</Label>
                  <Input
                    value={form.sub1_cpf}
                    onChange={(e) => setField("sub1_cpf", formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setField("observacoes", e.target.value)}
              placeholder="Informações adicionais sobre o time..."
              className="bg-secondary border-border resize-none"
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold"
          >
            {isEditing ? "Salvar Alterações" : "Cadastrar Time"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeamPage;
