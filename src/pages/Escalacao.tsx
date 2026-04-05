import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Save, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyTeam, usePlayers, useMatches, useMatchSummons } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

// Campo: viewBox 400 x 600 (portrait)
// Formação 4-4-2: y pequeno = topo = ataque, y grande = baixo = goleiro
const SLOTS = [
  { key:"ST1", label:"CA", x:130, y: 80 },
  { key:"ST2", label:"CA", x:270, y: 80 },
  { key:"LM",  label:"ME", x: 50, y:220 },
  { key:"CM1", label:"ME", x:155, y:220 },
  { key:"CM2", label:"ME", x:245, y:220 },
  { key:"RM",  label:"ME", x:350, y:220 },
  { key:"LB",  label:"LE", x: 50, y:360 },
  { key:"CB1", label:"ZA", x:155, y:360 },
  { key:"CB2", label:"ZA", x:245, y:360 },
  { key:"RB",  label:"LD", x:350, y:360 },
  { key:"GK",  label:"GOL",x:200, y:490 },
];

type Player = { id: string; name: string };
type SlotMap = Record<string, Player>;
type Sel = { id: string; name: string; from: "list"|"field"; slotKey?: string };

const FALLBACK_SQUAD: Player[] = [
  { id: "fb-01", name: "Carlao" },
  { id: "fb-02", name: "Rafa" },
  { id: "fb-03", name: "Marcao" },
  { id: "fb-04", name: "Bruno" },
  { id: "fb-05", name: "Leo" },
  { id: "fb-06", name: "Didi" },
  { id: "fb-07", name: "Nando" },
  { id: "fb-08", name: "Paulinho" },
  { id: "fb-09", name: "Rick" },
  { id: "fb-10", name: "Gabi" },
  { id: "fb-11", name: "Thi" },
];

function truncate(s: string, n = 7) { return s.length > n ? s.slice(0, n-1)+"." : s; }

function PlayerCard({
  cx,
  cy,
  role,
  name,
  selected,
}: {
  cx: number;
  cy: number;
  role: string;
  name?: string;
  selected: boolean;
}) {
  const w = 54;
  const h = 34;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const isGoalkeeper = role === "GOL";

  if (!name) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          rx="7"
          width={w}
          height={h}
          fill="rgba(255,255,255,0.06)"
          stroke={selected ? "rgba(250,204,21,0.9)" : "rgba(255,255,255,0.35)"}
          strokeWidth="1.4"
          strokeDasharray="5,3"
        />
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fontSize="12"
          fontWeight="800"
          fill={selected ? "rgba(250,204,21,0.95)" : "rgba(255,255,255,0.72)"}
          fontFamily="system-ui,sans-serif"
        >
          {role}
        </text>
      </g>
    );
  }

  return (
    <g>
      <rect x={x} y={y} rx="7" width={w} height={h} fill="rgba(10,18,16,0.88)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <rect
        x={x + 4}
        y={y + 4}
        rx="6"
        width={w - 8}
        height={h - 14}
        fill={isGoalkeeper ? (selected ? "#fde047" : "#facc15") : (selected ? "#22c55e" : "#16a34a")}
      />
      <text
        x={cx}
        y={y + 18}
        textAnchor="middle"
        fontSize="12"
        fontWeight="900"
        fill={isGoalkeeper ? "#1f2937" : "#ecfdf5"}
        fontFamily="system-ui,sans-serif"
      >
        {role}
      </text>
      <text
        x={cx}
        y={y + h + 12}
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fill="rgba(255,255,255,0.9)"
        fontFamily="system-ui,sans-serif"
      >
        {truncate(name, 8).toUpperCase()}
      </text>
    </g>
  );
}

export default function EscalacaoPage() {
  const navigate  = useNavigate();
  const { toast } = useToast();
  const { data: myTeam }      = useMyTeam();
  const { data: allPlayers=[] } = usePlayers(myTeam?.id);
  const { data: matches=[] }   = useMatches();

  const [slots, setSlots]   = useState<SlotMap>({});
  const [sel, setSel]       = useState<Sel|null>(null);
  const [draggingPlayer, setDraggingPlayer] = useState<Player | null>(null);
  const [zoom, setZoom]     = useState(() => (typeof window !== "undefined" && window.innerWidth < 768 ? 0.9 : 1));

  const myMatches = useMemo(()=>
    matches.filter(m=>(m.home_team as any)?.id===myTeam?.id),[matches,myTeam]);
  const matchId = myMatches[0]?.id||"";
  const { data: summons=[] } = useMatchSummons(matchId||undefined);

  const fallbackPlayers = useMemo<Player[]>(() => {
    if (allPlayers.length > 0 || typeof window === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem("mock_players");
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];

      return parsed.map((p: any) => ({
        id: p.id,
        name: p.display_name || p.nickname || p.name || "?",
      }));
    } catch {
      return [];
    }
  }, [allPlayers]);

  const confirmed = useMemo<Player[]>(()=>{
    const list = summons
      .filter((s:any)=>s.status==="confirmed")
      .map((s:any)=>({ id:s.player_id, name:s.player?.display_name||s.player?.nickname||s.player?.name||"?" }));
    if(list.length) return list;
    const teamPlayers = allPlayers.map(p=>({ id:p.id, name:p.display_name||p.nickname||p.name }));
    if (teamPlayers.length) return teamPlayers;
    if (fallbackPlayers.length) return fallbackPlayers;
    return FALLBACK_SQUAD;
  },[summons,allPlayers,fallbackPlayers]);

  const placedIds = useMemo(()=>new Set([
    ...Object.values(slots).map(p=>p.id),
  ]),[slots]);

  const available = confirmed.filter(p=>!placedIds.has(p.id));

  const doSelect = (info:Sel) => setSel(prev=>prev?.id===info.id&&prev.from===info.from?null:info);

  const placePlayerInSlot = (player: Player, key: string, fromSlotKey?: string) => {
    if (slots[key] && fromSlotKey !== key) {
      toast({ title: "Posição ocupada", description: "Remova o jogador atual antes de posicionar outro." });
      return false;
    }

    setSlots((prev) => {
      const next = { ...prev };
      if (fromSlotKey) {
        delete next[fromSlotKey];
      }
      next[key] = player;
      return next;
    });

    return true;
  };

  const placeOnSlot = (key:string) => {
    if(!sel){ const occ=slots[key]; if(occ) doSelect({id:occ.id,name:occ.name,from:"field",slotKey:key}); return; }
    if(sel.from==="field"&&sel.slotKey===key){ setSel(null); return; }

    const moved = placePlayerInSlot(
      { id: sel.id, name: sel.name },
      key,
      sel.from === "field" ? sel.slotKey : undefined
    );

    if (moved) {
      setSel(null);
    }
  };

  const removeFromSlot = (key: string) => {
    setSlots((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (sel?.from === "field" && sel.slotKey === key) {
      setSel(null);
    }
  };

  const reset=()=>{ setSlots({}); setSel(null); toast({title:"Escalação resetada"}); };
  const save =()=> toast({title:`Escalação salva! ✅ (${Object.keys(slots).length}/11)`});

  // campo SVG viewBox 400x600
  const VBWW=400, VBHH=600;

  return (
    <div className="relative h-[100dvh] bg-background overflow-hidden flex flex-col" style={{userSelect:"none"}}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.1),transparent_35%)]" />

      {/* Header */}
      <div className="px-3 md:px-6 pt-4 pb-2 max-w-6xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-card via-card/95 to-card/80 px-3 py-2.5 flex items-center gap-2 shadow-[0_10px_30px_-20px_hsl(var(--primary))] backdrop-blur">
          <button onClick={()=>navigate(-1)}><ArrowLeft size={20} className="text-muted-foreground"/></button>
          <h1 className="text-lg md:text-xl font-display text-foreground flex-1">ESCALAÇÃO</h1>
          <span className="text-[10px] font-semibold bg-primary/15 text-primary px-2 py-1 rounded-lg border border-primary/30">4-4-2</span>
          <Button onClick={save} size="sm" className="h-8 text-[10px] md:text-xs bg-gradient-primary text-primary-foreground border-0 shadow-[0_10px_20px_-12px_hsl(var(--primary))]">
            <Save size={11} className="mr-1"/> Salvar
          </Button>
        </div>
      </div>

      {/* Hint */}
      {sel && (
        <div className="mx-3 md:mx-6 mb-2 bg-yellow-500/15 border border-yellow-500/35 rounded-xl px-3 py-2 text-[11px] text-yellow-700 font-semibold max-w-6xl shadow-[0_8px_25px_-20px_#facc15]">
          ⚽ {sel.name} selecionado — toque/clique uma posição no campo
        </div>
      )}

      {/* Campo + Sidebar */}
      <div className="relative grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3 md:gap-4 px-3 md:px-6 max-w-6xl mx-auto flex-1 min-h-0 w-full">

        {/* Campo SVG */}
        <div className="min-w-0 bg-gradient-to-b from-card to-card/80 border border-white/10 rounded-2xl p-2 md:p-3 shadow-[0_16px_40px_-30px_hsl(var(--primary))] backdrop-blur flex flex-col min-h-0">
          {/* Zoom controls */}
          <div className="flex gap-1 justify-end mb-2">
            <button onClick={()=>setZoom(z=>Math.min(z+0.2,2.4))}
              className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-background/70 border border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-colors flex items-center justify-center">
              <ZoomIn size={14} className="text-muted-foreground"/>
            </button>
            <button onClick={()=>setZoom(z=>Math.max(z-0.2,0.5))}
              className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-background/70 border border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-colors flex items-center justify-center">
              <ZoomOut size={14} className="text-muted-foreground"/>
            </button>
          </div>

          <div className="overflow-auto rounded-xl flex-1 min-h-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${VBWW} ${VBHH}`}
              onDragOver={(e) => e.preventDefault()}
              style={{
                width: `${zoom * 100}%`,
                height: "auto",
                display: "block",
                borderRadius: 16,
              }}
            >
              {/* Fundo grama com listras */}
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1b6e35"/>
                  <stop offset="50%" stopColor="#1e7d3c"/>
                  <stop offset="100%" stopColor="#1b6e35"/>
                </linearGradient>
              </defs>
              <rect width={VBWW} height={VBHH} fill="url(#g1)"/>
              {/* Listras */}
              {[0,1,2,3,4,5,6,7,8].map(i=>(
                <rect key={i} x="0" y={i*68} width={VBWW} height="68"
                  fill={i%2===0?"rgba(0,0,0,0.06)":"transparent"}/>
              ))}

              {/* Linhas do campo */}
              {/* Borda */}
              <rect x="14" y="14" width="372" height="572" rx="4"
                fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="3"/>
              {/* Linha do meio */}
              <line x1="14" y1="300" x2="386" y2="300" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5"/>
              {/* Círculo central */}
              <circle cx="200" cy="300" r="55" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5"/>
              <circle cx="200" cy="300" r="4" fill="rgba(255,255,255,0.7)"/>
              {/* Área topo */}
              <rect x="100" y="14" width="200" height="90" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2"/>
              {/* Pequena área topo */}
              <rect x="145" y="14" width="110" height="38" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2"/>
              {/* Pênalti topo */}
              <circle cx="200" cy="76" r="4" fill="rgba(255,255,255,0.55)"/>
              {/* Arco topo */}
              <path d="M130 104 A72 72 0 0 1 270 104" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
              {/* Área baixo */}
              <rect x="100" y="496" width="200" height="90" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2"/>
              {/* Pequena área baixo */}
              <rect x="145" y="548" width="110" height="38" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2"/>
              {/* Pênalti baixo */}
              <circle cx="200" cy="524" r="4" fill="rgba(255,255,255,0.55)"/>
              {/* Arco baixo */}
              <path d="M130 496 A72 72 0 0 0 270 496" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
              {/* Escanteios */}
              <path d="M14 14 A10 10 0 0 1 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2"/>
              <path d="M386 14 A10 10 0 0 0 376 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2"/>
              <path d="M14 586 A10 10 0 0 0 24 576" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2"/>
              <path d="M386 586 A10 10 0 0 1 376 576" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2"/>

              {/* Slots de posição */}
              {SLOTS.map(slot=>{
                const occ = slots[slot.key];
                const isSel = sel?.from==="field" && sel?.slotKey===slot.key;
                return (
                  <g
                    key={slot.key}
                    onClick={()=>placeOnSlot(slot.key)}
                    onDragOver={(e) => {
                      if (!occ) {
                        e.preventDefault();
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!draggingPlayer) return;
                      const moved = placePlayerInSlot(draggingPlayer, slot.key);
                      if (moved) {
                        setDraggingPlayer(null);
                      }
                    }}
                    style={{cursor:"pointer"}}
                  >
                    {occ ? (
                      <>
                        <PlayerCard cx={slot.x} cy={slot.y} role={slot.label} name={occ.name} selected={isSel} />
                        <g
                          onClick={(e: any) => {
                            e.stopPropagation();
                            removeFromSlot(slot.key);
                          }}
                        >
                          <circle cx={slot.x + 27} cy={slot.y - 24} r="9" fill="rgba(20,20,20,0.85)" stroke="rgba(255,255,255,0.85)" strokeWidth="1" />
                          <text
                            x={slot.x + 27}
                            y={slot.y - 20}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="700"
                            fill="white"
                            fontFamily="system-ui,sans-serif"
                          >
                            x
                          </text>
                        </g>
                      </>
                    ) : (
                      <PlayerCard cx={slot.x} cy={slot.y} role={slot.label} selected={!!sel || !!draggingPlayer} />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <p className="text-center text-[10px] md:text-xs text-muted-foreground mt-1 font-semibold">
            4-4-2 · {Object.keys(slots).length}/11 escalados
          </p>
        </div>

        {/* Sidebar */}
        <div className="bg-gradient-to-b from-card to-card/80 border border-white/10 rounded-2xl p-2 md:p-3 shadow-[0_16px_40px_-30px_hsl(var(--primary))] backdrop-blur md:flex md:flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Confirmados</p>
            <span className="text-[10px] text-muted-foreground font-semibold">{available.length}</span>
          </div>

          {/* Mobile: lista horizontal */}
          <div className="md:hidden overflow-x-auto">
            <div className="flex gap-2 pb-1">
              {available.length===0 && <p className="text-[10px] text-muted-foreground py-2">Todos escalados</p>}
              {available.map(p=>{
                const isSel=sel?.id===p.id&&sel.from==="list";
                return (
                  <button
                    key={p.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingPlayer({ id: p.id, name: p.name });
                    }}
                    onDragEnd={() => setDraggingPlayer(null)}
                    onClick={()=>doSelect({id:p.id,name:p.name,from:"list"})}
                    className={`min-w-[110px] rounded-xl px-2 py-2 flex items-center gap-2 transition-all ${
                      isSel?"bg-yellow-400/25 border border-yellow-400 shadow-[0_8px_20px_-16px_#facc15]":"bg-background/60 border border-border/80 hover:border-primary/30"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isSel?"bg-yellow-400 text-black":"bg-primary/15 text-primary"}`}>
                      {p.name.slice(0,1).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-semibold text-foreground truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop: lista vertical */}
          <div className="hidden md:block overflow-y-auto space-y-1 flex-1 min-h-0 pr-1">
            {available.length===0 && <p className="text-[10px] text-muted-foreground text-center py-2 leading-tight">Todos escalados</p>}
            {available.map(p=>{
              const isSel=sel?.id===p.id&&sel.from==="list";
              return (
                <button
                  key={p.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDraggingPlayer({ id: p.id, name: p.name });
                  }}
                  onDragEnd={() => setDraggingPlayer(null)}
                  onClick={()=>doSelect({id:p.id,name:p.name,from:"list"})}
                  className={`w-full rounded-lg px-2 py-1.5 flex items-center gap-2 transition-all ${
                    isSel?"bg-yellow-400/25 border border-yellow-400 shadow-[0_8px_20px_-16px_#facc15]":"bg-background/60 border border-border/80 hover:border-primary/30"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isSel?"bg-yellow-400 text-black":"bg-primary/15 text-primary"}`}>
                    {p.name.slice(0,1).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-foreground leading-tight truncate">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="px-3 md:px-6 max-w-6xl mx-auto w-full mt-2 mb-16 md:mb-3 shrink-0">
        <div className="flex gap-2 rounded-2xl border border-white/10 bg-card/80 backdrop-blur p-1 shadow-[0_16px_35px_-28px_hsl(var(--primary))]">
          <Button variant="outline" size="sm" onClick={reset} className="w-full text-[10px] md:text-xs h-8 md:h-9 border-border/80 bg-background/70 hover:bg-background">
            <RotateCcw size={11} className="mr-1"/> Resetar
          </Button>
        </div>
      </div>

      <BottomNav/>
    </div>
  );
}
