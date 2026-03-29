import { User, UserPlus, X } from "lucide-react";
import { useState, DragEvent } from "react";

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

const positionAbbrev: Record<string, string> = {
  "Goleiro": "GOL",
  "Zagueiro": "ZAG",
  "Lateral Direito": "LD",
  "Lateral Esquerdo": "LE",
  "Volante": "VOL",
  "Meia": "MEI",
  "Ponta Direita": "PD",
  "Ponta Esquerda": "PE",
  "Atacante": "ATA",
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
  isGuest?: boolean;
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
  onAddGuest?: (position: string) => void;
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
  onAddGuest,
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
      <div className="relative w-full rounded-2xl overflow-hidden border border-border shadow-lg" style={{ aspectRatio: "3/4" }}>
        {/* Grass background with stripes */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 8%, rgba(255,255,255,0.3) 8%, rgba(255,255,255,0.3) 16%)",
        }} />

        {/* Field lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
          <rect x="10" y="10" width="280" height="380" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.35" rx="4" />
          <line x1="10" y1="200" x2="290" y2="200" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
          <circle cx="150" cy="200" r="40" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
          <circle cx="150" cy="200" r="3" fill="white" fillOpacity="0.25" />
          <rect x="70" y="10" width="160" height="60" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
          <rect x="100" y="10" width="100" height="30" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.2" />
          <rect x="70" y="330" width="160" height="60" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
          <rect x="100" y="360" width="100" height="30" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.2" />
          {/* Corner arcs */}
          <path d="M10,20 A10,10 0 0,1 20,10" fill="none" stroke="white" strokeWidth="0.8" strokeOpacity="0.2" />
          <path d="M280,10 A10,10 0 0,1 290,20" fill="none" stroke="white" strokeWidth="0.8" strokeOpacity="0.2" />
          <path d="M10,380 A10,10 0 0,0 20,390" fill="none" stroke="white" strokeWidth="0.8" strokeOpacity="0.2" />
          <path d="M280,390 A10,10 0 0,0 290,380" fill="none" stroke="white" strokeWidth="0.8" strokeOpacity="0.2" />
        </svg>

        {/* Empty position spots */}
        {emptyPositions.map((pos) => {
          const coords = positionCoords[pos];
          if (!coords) return null;
          const isOver = dragOverPosition === pos;
          const abbrev = positionAbbrev[pos] || pos.slice(0, 3).toUpperCase();
          return (
            <button
              key={`empty-${pos}`}
              onClick={() => onPositionClick?.(pos)}
              onDragOver={(e) => handleDragOver(e, pos)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, pos)}
              className={`absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 group transition-all duration-200 ${
                isOver ? "scale-110" : ""
              }`}
              style={{ top: coords.top, left: coords.left }}
            >
              <div className={`w-9 h-9 rounded-lg border-2 border-dashed flex items-center justify-center transition-all duration-200 ${
                isOver
                  ? "border-primary bg-primary/40 shadow-lg shadow-primary/30"
                  : "border-white/30 bg-white/5 group-hover:bg-white/15 group-hover:border-white/50"
              }`}>
                <span className={`text-[10px] font-bold ${isOver ? "text-white" : "text-white/50 group-hover:text-white/80"}`}>
                  {abbrev}
                </span>
              </div>
            </button>
          );
        })}

        {/* Players on field */}
        {positionedPlayers.map((p) => {
          if (!p.coords) return null;
          const abbrev = positionAbbrev[p.position] || p.position.slice(0, 3).toUpperCase();
          return (
            <div
              key={p.id}
              className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 group"
              style={{ top: p.coords.top, left: p.coords.left }}
            >
              <div className="relative">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover border-2 border-white/80 shadow-lg" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-white/20 border-2 border-white/60 flex items-center justify-center shadow-lg backdrop-blur-sm">
                    <User size={16} className="text-white" />
                  </div>
                )}
                {showStatus && p.status && (
                  <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-emerald-700 ${summonDot[p.status] || "bg-muted"}`} />
                )}
                {onRemovePlayer && (
                  <button
                    onClick={() => onRemovePlayer(p.id)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <X size={10} className="text-destructive-foreground" />
                  </button>
                )}
              </div>
              <span className="text-[9px] text-white font-bold max-w-[70px] text-center leading-tight drop-shadow-md truncate">
                {p.name.split(" ")[0]}
              </span>
              <span className="text-[7px] text-white/60 font-semibold bg-black/20 px-1.5 rounded-sm">{abbrev}</span>
            </div>
          );
        })}
      </div>

      {/* Player chips grid */}
      {(availablePlayers.length > 0 || onAddGuest) && (
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">
            Arraste ou toque para escalar
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {availablePlayers.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => handleDragStart(e, p.id)}
                className="flex items-center gap-1.5 bg-secondary rounded-lg px-2 py-1.5 cursor-grab active:cursor-grabbing hover:bg-accent transition-colors select-none border border-transparent hover:border-primary/20"
              >
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.name} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                    <User size={10} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] text-foreground font-semibold truncate max-w-[60px]">
                    {p.name.split(" ")[0]}
                  </span>
                  {p.position && (
                    <span className="text-[8px] text-muted-foreground">{positionAbbrev[p.position] || p.position.slice(0, 3).toUpperCase()}</span>
                  )}
                </div>
              </div>
            ))}
            {/* Guest button */}
            {onAddGuest && (
              <button
                onClick={() => onAddGuest("")}
                className="flex items-center gap-1.5 bg-secondary rounded-lg px-2 py-1.5 hover:bg-accent transition-colors border border-dashed border-muted-foreground/30 hover:border-primary/40"
              >
                <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <UserPlus size={10} className="text-primary" />
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold">Convidado</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Unpositioned players */}
      {unpositioned.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">Sem posição definida</p>
          <div className="flex flex-wrap gap-1.5">
            {unpositioned.map((p) => (
              <button
                key={p.id}
                onClick={p.onClick}
                className="flex items-center gap-1.5 bg-secondary rounded-lg px-2 py-1.5 hover:bg-accent transition-colors"
              >
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.name} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                    <User size={10} className="text-muted-foreground" />
                  </div>
                )}
                <span className="text-[10px] text-foreground font-semibold">{p.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SoccerField;
