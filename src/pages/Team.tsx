import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PlayerCard from "@/components/PlayerCard";
import BottomNav from "@/components/BottomNav";
import { useMyTeam, useCreateTeam, usePlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer } from "@/hooks/useSupabaseData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const positions = [
  "Goleiro", "Zagueiro", "Lateral Direito", "Lateral Esquerdo",
  "Volante", "Meia", "Ponta Direita", "Ponta Esquerda", "Atacante",
];

const TeamPage = () => {
  const { data: team, isLoading: teamLoading } = useMyTeam();
  const { data: players = [], isLoading: playersLoading } = usePlayers(team?.id);
  const createTeam = useCreateTeam();
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();

  // Team creation state
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamFormat, setTeamFormat] = useState("8x8");
  const [teamRegion, setTeamRegion] = useState("");

  // Player form state
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<typeof players[0] | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");
  const [playerNumber, setPlayerNumber] = useState(0);

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const abbr = teamName.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
    createTeam.mutate({ name: teamName, abbreviation: abbr, format: teamFormat, region: teamRegion });
    setTeamDialogOpen(false);
  };

  const openNewPlayer = () => {
    setEditingPlayer(null);
    setPlayerName("");
    setPlayerPosition("");
    setPlayerNumber(0);
    setPlayerDialogOpen(true);
  };

  const openEditPlayer = (player: typeof players[0]) => {
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
      updatePlayer.mutate({
        id: editingPlayer.id,
        team_id: team.id,
        name: playerName,
        position: playerPosition,
        jersey_number: playerNumber,
      });
    } else {
      createPlayer.mutate({
        team_id: team.id,
        name: playerName,
        position: playerPosition,
        jersey_number: playerNumber,
      });
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

  // No team yet - show creation
  if (!team) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="px-5 pt-12 pb-4">
          <h1 className="text-4xl text-foreground">MEU TIME</h1>
          <p className="text-sm text-muted-foreground mt-1">Você ainda não tem um time</p>
        </div>
        <div className="px-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border border-dashed p-8 text-center"
          >
            <p className="text-muted-foreground text-sm mb-4">Crie seu time para começar a escalar jogadores e buscar adversários</p>
            <Button onClick={() => setTeamDialogOpen(true)} className="bg-gradient-primary text-primary-foreground border-0">
              <Plus size={16} className="mr-1" /> Criar Time
            </Button>
          </motion.div>
        </div>

        {/* Create Team Dialog */}
        <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">CRIAR TIME</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTeam} className="space-y-4">
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
              <Button type="submit" disabled={createTeam.isPending} className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold">
                Criar Time
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl text-foreground">MEU TIME</h1>
            <p className="text-sm text-muted-foreground">{players.length} jogadores no elenco</p>
          </div>
          <Button onClick={openNewPlayer} className="bg-gradient-primary text-primary-foreground border-0">
            <Plus size={16} className="mr-1" /> Novo
          </Button>
        </div>
      </div>

      {/* Team banner */}
      <div className="px-5 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-4 flex items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-2xl shrink-0">
            {team.abbreviation || team.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-display text-xl text-foreground">{team.name.toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">
              Formato: {team.format} · {team.region || "Sem região"} · ⭐ {Number(team.rating || 0).toFixed(1)}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Invite */}
      <div className="px-5 mb-4">
        <button className="w-full flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 border-dashed text-primary text-sm">
          <UserPlus size={16} />
          <span>Convidar jogador por link ou WhatsApp</span>
        </button>
      </div>

      {/* Player list */}
      <div className="px-5 space-y-2">
        {playersLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : players.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">Nenhum jogador no elenco ainda</p>
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

export default TeamPage;
