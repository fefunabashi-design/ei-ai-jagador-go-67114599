import { User, GripVertical } from "lucide-react";
import { useState, DragEvent } from "react";

// Position coordinates on field (percentage-based for responsive layout)
const positionCoords: Record<string, { top: string; left: string }> = {
  "Goleiro": { top: "88%", left: "50%" },
  "Zagueiro": { top: "72%", left: "35%" },
  "Zagueiro_2": { top: "72%", left: "65%" },
  "Lateral Direito": { top: "65%", left: "85%" },
  "Lateral Esquerdo": { top: "65%", left: "15%" },
  "Volante": { top: "52%", left: "35%" },
  "Volante_2": { top: "52%", left: "65%" },
  "Meia": { top: "40%", left: "50%" },
  "Ponta Direita": { top: "25%", left: "80%" },
  "Ponta Esquerda": { top: "25%", left: "20%" },
  "Atacante": { top: "15%", left: "50%" },
  "Atacante_2": { top: "18%", left: "35%" },
};

const getCoordKey = (position: string, index: number): string => {
  const dupeKey = `${position}_${index + 1}`;
  if (positionCoords[dupeKey]) return dupeKey;
  return position;
};

interface PlayerOnField {
  id: string;
  name: string;
  position: string;
  avatarUrl?: string | null;
  status?: string;
  onClick?: () => void;
}

interface AvailablePlayer {
  id: string;
  name: string;
  position?: string | null;
  avatarUrl?: string | null;
}

interface SoccerFieldProps {
  players: PlayerOnField[];
  unpositioned?: PlayerOnField[];
  onPositionClick?: (position: string) => void;
  showStatus?: boolean;
  emptyPositions?: string[];
  availablePlayers?: AvailablePlayer[];
  onDropPlayer?: (playerId: string, position: string) => void;
  onRemovePlayer?: (lineupId: string) => void;
}

const summonDot: Record<string, string> = {
  pending: "bg-warning",
  confirmed: "bg-success",
  declined: "bg-destructive",
};

const SoccerField = ({
  players,
  unpositioned = [],
  onPositionClick,
  showStatus = false,
  emptyPositions = [],
  availablePlayers = [],
  onDropPlayer,
  onRemovePlayer,
}: SoccerFieldProps) => {
  const [dragOverPosition, setDragOverPosition] = useState<string | null>(null);

  const positionCount: Record<string, number> = {};
  const positionedPlayers = players.map((p) => {
    const pos = p.position || "";
    const idx = positionCount[pos] || 0;
    positionCount[pos] = idx + 1;
    const coordKey = getCoordKey(pos, idx);
    const coords = positionCoords[coordKey] || positionCoords[pos];
    return { ...p, coords };
  });

  const handleDragStart = (e: DragEvent, playerId: string) => {
    e.dataTransfer.setData("playerId", playerId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent, position: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverPosition(null);
  };

  const handleDrop = (e: DragEvent, position: string) => {
    e.preventDefault();
    setDragOverPosition(null);
    const playerId = e.dataTransfer.getData("playerId");
    if (playerId && onDropPlayer) {
      onDropPlayer(playerId, position);
    }
  };

  return (
    <div className="space-y-3">
      {/* Field */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-border" style={{ aspectRatio: "3/4" }}>
        {/* Grass background */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-700 to-emerald-800" />

        {/* Field lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
          <rect x="10" y="10" width="280" height="380" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" rx="4" />
          <line x1="10" y1="200" x2="290" y2="200" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          <circle cx="150" cy="200" r="40" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          <circle cx="150" cy="200" r="3" fill="white" fillOpacity="0.3" />
          <rect x="70" y="10" width="160" height="60" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          <rect x="100" y="10" width="100" height="30" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
          <rect x="70" y="330" width="160" height="60" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          <rect x="100" y="360" width="100" height="30" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
        </svg>

        {/* Empty position spots (clickable + droppable) */}
        {emptyPositions.map((pos) => {
          const coords = positionCoords[pos];
          if (!coords) return null;
          const isOver = dragOverPosition === pos;
          return (
            <button
              key={`empty-${pos}`}
              onClick={() => onPositionClick?.(pos)}
              onDragOver={(e) => handleDragOver(e, pos)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, pos)}
              className={`absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 group transition-transform ${
                isOver ? "scale-125" : ""
              }`}
              style={{ top: coords.top, left: coords.left }}
            >
              <div className={`w-9 h-9 rounded-full border-2 border-dashed flex items-center justify-center transition-colors ${
                isOver
                  ? "border-primary bg-primary/30 shadow-lg shadow-primary/20"
                  : "border-white/40 bg-white/10 group-hover:bg-white/20"
              }`}>
                <span className={`text-lg ${isOver ? "text-primary-foreground" : "text-white/60"}`}>+</span>
              </div>
              <span className="text-[8px] text-white/50 font-medium max-w-[60px] text-center leading-tight">{pos}</span>
            </button>
          );
        })}

        {/* Players on field */}
        {positionedPlayers.map((p) => {
          if (!p.coords) return null;
          return (
            <button
              key={p.id}
              onClick={p.onClick || (onRemovePlayer ? () => onRemovePlayer(p.id) : undefined)}
              className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 group"
              style={{ top: p.coords.top, left: p.coords.left }}
              title={onRemovePlayer ? "Clique para remover" : undefined}
            >
              <div className="relative">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white flex items-center justify-center shadow-lg">
                    <User size={16} className="text-white" />
                  </div>
                )}
                {showStatus && p.status && (
                  <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border border-white ${summonDot[p.status] || "bg-muted"}`} />
                )}
              </div>
              <span className="text-[9px] text-white font-bold max-w-[70px] text-center leading-tight drop-shadow-md truncate">
                {p.name.split(" ")[0]}
              </span>
              <span className="text-[7px] text-white/70 font-medium">{p.position}</span>
            </button>
          );
        })}
      </div>

      {/* Draggable player list */}
      {availablePlayers.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            JOGADORES DISPONÍVEIS — arraste para o campo
          </p>
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {availablePlayers.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => handleDragStart(e, p.id)}
                className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-secondary/80 transition-colors select-none"
              >
                <GripVertical size={14} className="text-muted-foreground shrink-0" />
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.name} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <User size={12} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground font-medium block truncate">{p.name}</span>
                  {p.position && (
                    <span className="text-[10px] text-muted-foreground">{p.position}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unpositioned players */}
      {unpositioned.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">SEM POSIÇÃO DEFINIDA</p>
          <div className="flex flex-wrap gap-2">
            {unpositioned.map((p) => (
              <button
                key={p.id}
                onClick={p.onClick}
                className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 hover:bg-secondary/80 transition-colors"
              >
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.name} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <User size={12} className="text-muted-foreground" />
                  </div>
                )}
                <span className="text-xs text-foreground font-medium">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SoccerField;
