import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PlayerData {
  id: string;
  name: string;
  position: string;
  number: number;
  goals: number;
  matches: number;
  rating: number;
}

const positions = [
  "Goleiro",
  "Zagueiro",
  "Lateral Direito",
  "Lateral Esquerdo",
  "Volante",
  "Meia",
  "Ponta Direita",
  "Ponta Esquerda",
  "Atacante",
];

interface PlayerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: PlayerData | null;
  onSave: (player: Omit<PlayerData, "id"> & { id?: string }) => void;
}

const PlayerFormDialog = ({ open, onOpenChange, player, onSave }: PlayerFormDialogProps) => {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [number, setNumber] = useState(0);

  useEffect(() => {
    if (player) {
      setName(player.name);
      setPosition(player.position);
      setNumber(player.number);
    } else {
      setName("");
      setPosition("");
      setNumber(0);
    }
  }, [player, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(player ? { id: player.id } : {}),
      name,
      position,
      number,
      goals: player?.goals ?? 0,
      matches: player?.matches ?? 0,
      rating: player?.rating ?? 0,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {player ? "Editar Jogador" : "Novo Jogador"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do jogador"
              required
              className="bg-secondary border-border"
            />
          </div>
          <div>
            <Label>Posição</Label>
            <Select value={position} onValueChange={setPosition} required>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Selecione a posição" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Número</Label>
            <Input
              type="number"
              value={number}
              onChange={(e) => setNumber(parseInt(e.target.value) || 0)}
              placeholder="Número da camisa"
              min={0}
              max={99}
              required
              className="bg-secondary border-border"
            />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold">
            {player ? "Salvar Alterações" : "Adicionar Jogador"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerFormDialog;
