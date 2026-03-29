import { Star, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PlayerCardProps {
  name: string;
  position: string;
  number: number;
  goals: number;
  matches: number;
  rating: number;
  avatar?: string;
  onEdit?: () => void;
  onRemove?: () => void;
}

const PlayerCard = ({
  name,
  position,
  number,
  goals,
  matches,
  rating,
  onEdit,
  onRemove,
}: PlayerCardProps) => {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 hover:border-primary/30 transition-colors">
      <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-xl shrink-0">
        {number}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{position}</p>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
          <span>{goals} gols</span>
          <span>{matches} jogos</span>
          <span className="flex items-center gap-0.5">
            <Star size={10} className="text-warning fill-warning" /> {rating.toFixed(1)}
          </span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <MoreVertical size={16} className="text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
          <DropdownMenuItem onClick={onRemove} className="text-destructive">
            Remover
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default PlayerCard;
