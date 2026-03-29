import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlayerCard from "@/components/PlayerCard";
import PlayerFormDialog, { PlayerData } from "@/components/PlayerFormDialog";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

const initialPlayers: PlayerData[] = [
  { id: "1", name: "Carlos Silva", position: "Atacante", number: 9, goals: 12, matches: 20, rating: 8.7 },
  { id: "2", name: "Bruno Santos", position: "Meia", number: 10, goals: 5, matches: 22, rating: 8.2 },
  { id: "3", name: "Rafael Lima", position: "Zagueiro", number: 3, goals: 1, matches: 18, rating: 7.9 },
  { id: "4", name: "Diego Costa", position: "Goleiro", number: 1, goals: 0, matches: 24, rating: 8.5 },
  { id: "5", name: "Lucas Oliveira", position: "Lateral Direito", number: 2, goals: 2, matches: 16, rating: 7.4 },
  { id: "6", name: "Pedro Alves", position: "Volante", number: 5, goals: 3, matches: 19, rating: 7.8 },
  { id: "7", name: "Felipe Souza", position: "Ponta Direita", number: 7, goals: 8, matches: 21, rating: 8.0 },
];

const TeamPage = () => {
  const [players, setPlayers] = useState<PlayerData[]>(initialPlayers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerData | null>(null);
  const { toast } = useToast();

  const handleSave = (data: Omit<PlayerData, "id"> & { id?: string }) => {
    if (data.id) {
      setPlayers((prev) => prev.map((p) => (p.id === data.id ? { ...p, ...data, id: p.id } : p)));
      toast({ title: "Jogador atualizado!", description: `${data.name} foi editado com sucesso.` });
    } else {
      const newPlayer: PlayerData = { ...data, id: crypto.randomUUID() };
      setPlayers((prev) => [...prev, newPlayer]);
      toast({ title: "Jogador adicionado!", description: `${data.name} entrou no elenco.` });
    }
  };

  const handleRemove = (id: string) => {
    const player = players.find((p) => p.id === id);
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    toast({
      title: "Jogador removido",
      description: `${player?.name} foi removido do elenco.`,
      variant: "destructive",
    });
  };

  const handleEdit = (player: PlayerData) => {
    setEditingPlayer(player);
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingPlayer(null);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl text-foreground">MEU TIME</h1>
            <p className="text-sm text-muted-foreground">{players.length} jogadores no elenco</p>
          </div>
          <Button onClick={openNewDialog} className="bg-gradient-primary text-primary-foreground border-0">
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
            OC
          </div>
          <div>
            <p className="font-display text-xl text-foreground">OS CRIAS FC</p>
            <p className="text-xs text-muted-foreground">Formato: 8x8 · Zona Sul · ⭐ 8.3</p>
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
        {players.map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <PlayerCard
              {...player}
              onEdit={() => handleEdit(player)}
              onRemove={() => handleRemove(player.id)}
            />
          </motion.div>
        ))}
      </div>

      <PlayerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        player={editingPlayer}
        onSave={handleSave}
      />

      <BottomNav />
    </div>
  );
};

export default TeamPage;
