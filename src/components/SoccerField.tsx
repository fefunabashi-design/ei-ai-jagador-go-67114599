import { User } from "lucide-react";

// Position coordinates on field (percentage-based for responsive layout)
// Layout: goalkeeper at bottom, attackers at top
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

// Map a position to coordinate key (handles duplicates by index)
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

interface SoccerFieldProps {
  players: PlayerOnField[];
  unpositioned?: PlayerOnField[];
  onPositionClick?: (position: string) => void;
  showStatus?: boolean;
  emptyPositions?: string[];
}

const summonDot: Record<string, string> = {
  pending: "bg-warning",
  confirmed: "bg-success",
  declined: "bg-destructive",
};

const SoccerField = ({ players, unpositioned = [], onPositionClick, showStatus = false, emptyPositions = [] }: SoccerFieldProps) => {
  // Group players by position, track per-position index for coords
  const positionCount: Record<string, number> = {};

  const positionedPlayers = players.map((p) => {
    const pos = p.position || "";
    const idx = positionCount[pos] || 0;
    positionCount[pos] = idx + 1;
    const coordKey = getCoordKey(pos, idx);
    const coords = positionCoords[coordKey] || positionCoords[pos];
    return { ...p, coords };
  });

  return (
    <div className="space-y-3">
      {/* Field */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-border" style={{ aspectRatio: "3/4" }}>
        {/* Grass background */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-700 to-emerald-800" />
        
        {/* Field lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
          {/* Border */}
          <rect x="10" y="10" width="280" height="380" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" rx="4" />
          {/* Center line */}
          <line x1="10" y1="200" x2="290" y2="200" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          {/* Center circle */}
          <circle cx="150" cy="200" r="40" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          <circle cx="150" cy="200" r="3" fill="white" fillOpacity="0.3" />
          {/* Top box (attacking) */}
          <rect x="70" y="10" width="160" height="60" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          <rect x="100" y="10" width="100" height="30" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
          {/* Bottom box (defending/goalkeeper) */}
          <rect x="70" y="330" width="160" height="60" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          <rect x="100" y="360" width="100" height="30" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
        </svg>

        {/* Empty position spots (clickable) */}
        {emptyPositions.map((pos) => {
          const coords = positionCoords[pos];
          if (!coords) return null;
          return (
            <button
              key={`empty-${pos}`}
              onClick={() => onPositionClick?.(pos)}
              className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 group"
              style={{ top: coords.top, left: coords.left }}
            >
              <div className="w-9 h-9 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center bg-white/10 group-hover:bg-white/20 transition-colors">
                <span className="text-white/60 text-lg">+</span>
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
              onClick={p.onClick}
              className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 group"
              style={{ top: p.coords.top, left: p.coords.left }}
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
