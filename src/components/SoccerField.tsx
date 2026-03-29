import { User, UserPlus, X, ChevronDown } from "lucide-react";
import { useState, DragEvent } from "react";

const positionCoords: Record<string, { top: string; left: string }> = {
  "Goleiro": { top: "90%", left: "50%" },
  "Zagueiro": { top: "73%", left: "38%" },
  "Zagueiro_2": { top: "73%", left: "62%" },
  "Lateral Esquerdo": { top: "68%", left: "14%" },
  "Lateral Direito": { top: "68%", left: "86%" },
  "Volante": { top: "52%", left: "38%" },
  "Volante_2": { top: "52%", left: "62%" },
  "Meia": { top: "40%", left: "50%" },
  "Meia_2": { top: "40%", left: "28%" },
  "Meia_3": { top: "40%", left: "72%" },
  "Atacante": { top: "20%", left: "50%" },
  "Atacante_2": { top: "22%", left: "28%" },
  "Atacante_3": { top: "22%", left: "72%" },
};

const positionAbbrev: Record<string, string> = {
  "Goleiro": "GK",
  "Zagueiro": "ZAG",
  "Lateral Direito": "LD",
  "Lateral Esquerdo": "LE",
  "Volante": "VOL",
  "Meia": "MEI",
  "Atacante": "ATA",
};

const sectorLabels: { label: string; top: string }[] = [
  { label: "ATAQUE", top: "12%" },
  { label: "MEIO-CAMPO", top: "45%" },
  { label: "DEFESA", top: "78%" },
];

const statusBorderColor: Record<string, string> = {
  pending: "border-warning",
  confirmed: "border-success",
  declined: "border-destructive",
};

const statusDotColor: Record<string, string> = {
  pending: "bg-warning",
  confirmed: "bg-success",
  declined: "bg-destructive",
};

const getCoordKey = (position: string, index: number): string => {
  const dupeKey = `${position}_${index + 1}`;
  if (positionCoords[dupeKey]) return dupeKey;
  return position;
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Color palette for player circles
const playerColors = [
  "bg-emerald-600", "bg-red-500", "bg-purple-500", "bg-blue-500",
  "bg-amber-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500",
];

const getPlayerColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return playerColors[Math.abs(hash) % playerColors.length];
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
  matchInfo?: { home: string; away?: string; dateLabel?: string };
  counters?: { confirmed: number; pending: number; vacant: number };
}

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
  matchInfo,
  counters,
}: SoccerFieldProps) => {
  const [dragOverPosition, setDragOverPosition] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [showAllPlayers, setShowAllPlayers] = useState(false);

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

  const handleDragLeave = () => setDragOverPosition(null);

  const handleDrop = (e: DragEvent, position: string) => {
    e.preventDefault();
    setDragOverPosition(null);
    const playerId = e.dataTransfer.getData("playerId");
    if (playerId && onDropPlayer) onDropPlayer(playerId, position);
  };

  const handleEmptyClick = (pos: string) => {
    setSelectedPosition(pos === selectedPosition ? null : pos);
    setShowAllPlayers(false);
    onPositionClick?.(pos);
  };

  const handleSelectPlayer = (playerId: string) => {
    if (selectedPosition && onDropPlayer) {
      onDropPlayer(playerId, selectedPosition);
      setSelectedPosition(null);
      setShowAllPlayers(false);
    }
  };

  const matchingPlayers = selectedPosition
    ? availablePlayers.filter((p) => p.position === selectedPosition)
    : [];
  const otherPlayers = selectedPosition
    ? availablePlayers.filter((p) => p.position !== selectedPosition)
    : availablePlayers;

  return (
    <div className="space-y-3">
      {/* Field */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-border shadow-lg" style={{ aspectRatio: "3/4" }}>
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 8%, rgba(255,255,255,0.3) 8%, rgba(255,255,255,0.3) 16%)",
        }} />

        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
          <rect x="10" y="10" width="280" height="380" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.35" rx="4" />
          <line x1="10" y1="200" x2="290" y2="200" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
          <circle cx="150" cy="200" r="40" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
          <circle cx="150" cy="200" r="3" fill="white" fillOpacity="0.25" />
          <rect x="70" y="10" width="160" height="60" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
          <rect x="100" y="10" width="100" height="30" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.2" />
          <rect x="70" y="330" width="160" height="60" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
          <rect x="100" y="360" width="100" height="30" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.2" />
        </svg>

        {/* Match info header */}
        {matchInfo && (
          <div className="absolute top-2 left-3 right-3 flex items-center justify-between text-white/70 text-[10px] font-semibold z-10">
            <span>{matchInfo.home}{matchInfo.away ? ` × ${matchInfo.away}` : ""}</span>
            {matchInfo.dateLabel && <span>{matchInfo.dateLabel}</span>}
          </div>
        )}

        {/* Sector labels */}
        {sectorLabels.map((s) => (
          <div key={s.label} className="absolute left-1/2 -translate-x-1/2 text-white/15 text-[9px] font-bold tracking-[0.3em] pointer-events-none" style={{ top: s.top }}>
            {s.label}
          </div>
        ))}

        {/* Empty position spots */}
        {emptyPositions.map((pos) => {
          const coords = positionCoords[pos];
          if (!coords) return null;
          const isOver = dragOverPosition === pos;
          const isSelected = selectedPosition === pos;
          const abbrev = positionAbbrev[pos] || pos.slice(0, 3).toUpperCase();
          return (
            <button
              key={`empty-${pos}`}
              onClick={() => handleEmptyClick(pos)}
              onDragOver={(e) => handleDragOver(e, pos)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, pos)}
              className={`absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 group transition-all duration-200 ${
                isOver || isSelected ? "scale-110" : ""
              }`}
              style={{ top: coords.top, left: coords.left }}
            >
              <div className={`w-11 h-11 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-200 ${
                isOver || isSelected
                  ? "border-primary bg-primary/30 shadow-lg shadow-primary/30"
                  : "border-white/25 bg-white/5 group-hover:bg-white/15 group-hover:border-white/50"
              }`}>
                <span className="text-white/30 text-lg">+</span>
              </div>
              <span className="text-[9px] text-white/50 font-semibold">Vaga</span>
              <span className="text-[7px] text-white/30 font-semibold">{abbrev}</span>
            </button>
          );
        })}

        {/* Players on field */}
        {positionedPlayers.map((p) => {
          if (!p.coords) return null;
          const abbrev = positionAbbrev[p.position] || p.position.slice(0, 3).toUpperCase();
          const initials = getInitials(p.name);
          const bgColor = getPlayerColor(p.name);
          const borderColor = p.status ? (statusBorderColor[p.status] || "border-white/60") : "border-white/60";

          return (
            <div
              key={p.id}
              className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 group"
              style={{ top: p.coords.top, left: p.coords.left }}
            >
              <div className="relative">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.name} className={`w-11 h-11 rounded-full object-cover border-[2.5px] shadow-lg ${borderColor}`} />
                ) : (
                  <div className={`w-11 h-11 rounded-full ${bgColor} border-[2.5px] ${borderColor} flex items-center justify-center shadow-lg`}>
                    <span className="text-white text-xs font-bold">{initials}</span>
                  </div>
                )}
                {showStatus && p.status && (
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-emerald-700 ${statusDotColor[p.status] || "bg-muted"}`} />
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
              <span className="text-[10px] text-white font-bold max-w-[70px] text-center leading-tight drop-shadow-md truncate">
                {p.name.split(" ")[0]}
              </span>
              <span className="text-[7px] text-white/50 font-semibold">{abbrev}</span>
            </div>
          );
        })}
      </div>

      {/* Counters */}
      {counters && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-xl border border-border p-2 text-center">
            <p className="text-lg font-bold text-success">{counters.confirmed}</p>
            <p className="text-[9px] text-muted-foreground font-semibold">Confirmados</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-2 text-center">
            <p className="text-lg font-bold text-warning">{counters.pending}</p>
            <p className="text-[9px] text-muted-foreground font-semibold">Aguardando</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-2 text-center">
            <p className="text-lg font-bold text-destructive">{counters.vacant}</p>
            <p className="text-[9px] text-muted-foreground font-semibold">Recusados</p>
          </div>
        </div>
      )}

      {/* Player selection panel */}
      {selectedPosition && (
        <div className="bg-card rounded-xl border border-primary/30 p-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">
              {positionAbbrev[selectedPosition] || selectedPosition} — Selecione o jogador
            </p>
            <button onClick={() => { setSelectedPosition(null); setShowAllPlayers(false); }} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>

          {matchingPlayers.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-2">
              {matchingPlayers.map((p) => {
                const initials = getInitials(p.name);
                const bgColor = getPlayerColor(p.name);
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPlayer(p.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, p.id)}
                    className="flex flex-col items-center gap-1 w-16 py-2 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/15 transition-colors cursor-pointer"
                  >
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.name} className="w-9 h-9 rounded-full object-cover border-2 border-primary/40" />
                    ) : (
                      <div className={`w-9 h-9 rounded-full ${bgColor} flex items-center justify-center border-2 border-primary/40`}>
                        <span className="text-white text-[10px] font-bold">{initials}</span>
                      </div>
                    )}
                    <span className="text-[9px] text-foreground font-semibold truncate max-w-[56px]">
                      {p.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground mb-2">Nenhum jogador confirmado como {selectedPosition}.</p>
          )}

          {otherPlayers.length > 0 && (
            <div>
              <button
                onClick={() => setShowAllPlayers(!showAllPlayers)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-semibold mb-1.5 transition-colors"
              >
                <ChevronDown size={12} className={`transition-transform ${showAllPlayers ? "rotate-180" : ""}`} />
                {showAllPlayers ? "Ocultar outras posições" : "Ver jogadores de outras posições"}
              </button>
              {showAllPlayers && (
                <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-1 duration-150">
                  {otherPlayers.map((p) => {
                    const initials = getInitials(p.name);
                    const bgColor = getPlayerColor(p.name);
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPlayer(p.id)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, p.id)}
                        className="flex flex-col items-center gap-1 w-16 py-2 rounded-xl bg-secondary border border-transparent hover:border-border transition-colors cursor-pointer"
                      >
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.name} className="w-9 h-9 rounded-full object-cover border-2 border-muted" />
                        ) : (
                          <div className={`w-9 h-9 rounded-full ${bgColor} flex items-center justify-center border-2 border-muted`}>
                            <span className="text-white text-[10px] font-bold">{initials}</span>
                          </div>
                        )}
                        <span className="text-[9px] text-foreground font-semibold truncate max-w-[56px]">
                          {p.name.split(" ")[0]}
                        </span>
                        {p.position && (
                          <span className="text-[7px] text-muted-foreground">{positionAbbrev[p.position] || p.position.slice(0, 3).toUpperCase()}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {onAddGuest && (
            <button
              onClick={() => { onAddGuest(selectedPosition); setSelectedPosition(null); }}
              className="flex flex-col items-center gap-1 w-16 py-2 mt-2 rounded-xl bg-secondary border border-dashed border-muted-foreground/30 hover:border-primary/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30">
                <UserPlus size={14} className="text-primary" />
              </div>
              <span className="text-[9px] text-muted-foreground font-semibold">Convidado</span>
            </button>
          )}
        </div>
      )}

      {/* Unpositioned / Reserves */}
      {unpositioned.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">Reservas</p>
            {onAddGuest && (
              <button onClick={() => onAddGuest("")} className="text-[10px] text-primary font-semibold hover:underline">
                + Convidar →
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {unpositioned.map((p) => {
              const initials = getInitials(p.name);
              const bgColor = getPlayerColor(p.name);
              return (
                <button
                  key={p.id}
                  onClick={p.onClick}
                  className="flex flex-col items-center gap-1 w-16"
                >
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt={p.name} className="w-11 h-11 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className={`w-11 h-11 rounded-full ${bgColor} flex items-center justify-center border-2 border-border`}>
                      <span className="text-white text-xs font-bold">{initials}</span>
                    </div>
                  )}
                  <span className="text-[10px] text-foreground font-bold truncate max-w-[60px]">{p.name.split(" ")[0]}</span>
                  {p.position && (
                    <span className="text-[7px] text-muted-foreground">{positionAbbrev[p.position] || p.position.slice(0, 3).toUpperCase()}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SoccerField;
