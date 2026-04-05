import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyTeam, usePlayers, useMatches, useMatchSummons } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

// Formação 4-2-2-2 — posições em % do campo (largura x altura)
const SLOTS = [
  { key: "ST1", label: "CA",  px: 32, py:  8 },
  { key: "ST2", label: "CA",  px: 68, py:  8 },
  { key: "AM1", label: "MEI", px: 32, py: 30 },
  { key: "AM2", label: "MEI", px: 68, py: 30 },
  { key: "DM1", label: "VOL", px: 32, py: 52 },
  { key: "DM2", label: "VOL", px: 68, py: 52 },
  { key: "LB",  label: "LE",  px:  9, py: 74 },
  { key: "CB1", label: "ZAG", px: 35, py: 74 },
  { key: "CB2", label: "ZAG", px: 65, py: 74 },
  { key: "RB",  label: "LD",  px: 91, py: 74 },
  { key: "GK",  label: "GOL", px: 50, py: 92 },
];

type Player  = { id: string; name: string };
type SlotMap = Record<string, Player>;
type Sel     = { id: string; name: string; from: "list"|"field"|"res"|"sub"; slotKey?: string };

function truncate(s: string, n = 6) { return s.length > n ? s.slice(0, n - 1) + "." : s; }

function Shirt({ name, label, selected, empty }: {
  name?: string; label?: string; selected?: boolean; empty?: boolean;
}) {
  if (empty) {
    const col = selected ? "rgba(250,204,21,0.85)" : "rgba(255,255,255,0.45)";
    const bg  = selected ? "rgba(250,204,21,0.12)" : "rgba(255,255,255,0.07)";
    return (
      <svg viewBox="0 0 60 56" width="44" height="41">
        <polygon points="0,15 14,7 18,20 5,26" fill={bg} stroke={col} strokeWidth="1.5" strokeDasharray="4,3" strokeLinejoin="round"/>
        <polygon points="60,15 46,7 42,20 55,26" fill={bg} stroke={col} strokeWidth="1.5" strokeDasharray="4,3" strokeLinejoin="round"/>
        <path d="M14 7 Q30 1 46 7 L46 53 Q46 55 44 55 L16 55 Q14 55 14 53 Z" fill={bg} stroke={col} strokeWidth="1.5" strokeDasharray="4,3"/>
        <text x="30" y="34" textAnchor="middle" fontSize="10" fontWeight="700" fill={col} fontFamily="system-ui,sans-serif">{label}</text>
      </svg>
    );
  }
  const body   = selected ? "#facc15" : "#ffffff";
  const sleeve = selected ? "#d4a800" : "#d5d5d5";
  const stroke = selected ? "#b45309" : "#777";
  const txt    = selected ? "#7c2d00" : "#1a5c2e";
  const lbl    = truncate(name || "");
  const fs     = lbl.length > 5 ? 8 : lbl.length > 3 ? 9 : 10;
  return (
    <svg viewBox="0 0 60 56" width="44" height="41">
      <polygon points="0,15 14,7 18,20 5,26"   fill={sleeve} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round"/>
      <polygon points="60,15 46,7 42,20 55,26" fill={sleeve} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M14 7 Q30 1 46 7 L46 53 Q46 55 44 55 L16 55 Q14 55 14 53 Z" fill={body} stroke={stroke} strokeWidth="1.2"/>
      <path d="M22 7 Q30 13 38 7" fill="none" stroke={stroke} strokeWidth="1.5"/>
      <text x="30" y="36" textAnchor="middle" fontSize={fs} fontWeight="800" fill={txt} fontFamily="system-ui,-apple-system,sans-serif">{lbl}</text>
    </svg>
  );
}

export default function EscalacaoPage() {
  const navigate   = useNavigate();
  const { toast }  = useToast();
  const { data: myTeam }        = useMyTeam();
  const { data: allPlayers=[] } = usePlayers(myTeam?.id);
  const { data: matches=[] }    = useMatches();

  const [slots, setSlots] = useState<SlotMap>({});
  const [reservas, setRes] = useState<Player[]>([]);
  const [subs, setSubs]   = useState<Player[]>([]);
  const [sel, setSel]     = useState<Sel | null>(null);

  const myMatches = useMemo(() =>
    matches.filter(m => (m.home_team as any)?.id === myTeam?.id), [matches, myTeam]);
  const { data: summons=[] } = useMatchSummons(myMatches[0]?.id || undefined);

  const confirmed = useMemo<Player[]>(() => {
    const list = summons
      .filter((s: any) => s.status === "confirmed")
      .map((s: any) => ({ id: s.player_id, name: s.player?.display_name || s.player?.nickname || s.player?.name || "?" }));
    if (list.length) return list;
    return allPlayers.map(p => ({ id: p.id, name: p.display_name || p.nickname || p.name }));
  }, [summons, allPlayers]);

  const placedIds = useMemo(() => new Set([
    ...Object.values(slots).map(p => p.id),
    ...reservas.map(p => p.id),
    ...subs.map(p => p.id),
  ]), [slots, reservas, subs]);

  const available = confirmed.filter(p => !placedIds.has(p.id));

  const doSelect = (info: Sel) =>
    setSel(prev => prev?.id === info.id && prev.from === info.from ? null : info);

  const handleSlot = (key: string) => {
    const occ = slots[key];
    if (!sel) {
      if (occ) doSelect({ id: occ.id, name: occ.name, from: "field", slotKey: key });
      return;
    }
    if (sel.from === "field" && sel.slotKey === key) { setSel(null); return; }
    setSlots(prev => {
      const n = { ...prev };
      if (sel.from === "field" && sel.slotKey) {
        delete n[sel.slotKey];
        if (occ) n[sel.slotKey] = occ;
      } else if (sel.from === "res") {
        setRes(r => occ ? [...r.filter(p => p.id !== sel.id), occ] : r.filter(p => p.id !== sel.id));
      } else if (sel.from === "sub") {
        setSubs(s => occ ? [...s.filter(p => p.id !== sel.id), occ] : s.filter(p => p.id !== sel.id));
      } else {
        if (occ) setRes(r => [...r, occ]);
      }
      n[key] = { id: sel.id, name: sel.name };
      return n;
    });
    setSel(null);
  };

  const toRes  = (p: Player, k?: string) => { if (k) setSlots(prev => { const n={...prev}; delete n[k]; return n; }); setRes(r=>[...r,p]); setSel(null); };
  const toSub  = (p: Player, k?: string) => { if (k) setSlots(prev => { const n={...prev}; delete n[k]; return n; }); setSubs(s=>[...s,p]); setSel(null); };
  const fromRes = (p: Player) => { setRes(r => r.filter(x => x.id !== p.id)); setSel(null); };
  const fromSub = (p: Player) => { setSubs(s => s.filter(x => x.id !== p.id)); setSel(null); };
  const reset  = () => { setSlots({}); setRes([]); setSubs([]); setSel(null); toast({ title: "Escalação resetada" }); };
  const save   = () => toast({ title: `Escalação salva! ✅ ${Object.keys(slots).length}/11` });

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden" style={{ userSelect: "none" }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-1 flex items-center gap-2 shrink-0">
        <button onPointerDown={() => navigate(-1)}>
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <h1 className="text-lg font-display text-foreground flex-1">ESCALAÇÃO</h1>
        <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-lg">
          {Object.keys(slots).length}/11
        </span>
      </div>

      {/* Hint */}
      {sel && (
        <div className="mx-3 mb-1 shrink-0 bg-yellow-500/15 border border-yellow-500/30 rounded-lg px-3 py-1 text-[10px] text-yellow-700 font-semibold">
          ⚽ {sel.name} — toque uma posição no campo
        </div>
      )}

      {/* CORPO: Campo + Sidebar — ocupa o espaço restante */}
      <div className="flex gap-1 px-2 flex-1 min-h-0 overflow-hidden">

        {/* Campo */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 justify-center">
          {/* Container do campo: largura 100%, altura proporcional */}
          <div style={{ position: "relative", width: "auto", height: "100%", aspectRatio: "9/14", maxWidth: "100%", maxHeight: "100%", margin: "0 auto" }}>

            {/* SVG visual */}
            <svg viewBox="0 0 400 640" style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
              <defs>
                <linearGradient id="fg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1b6e35"/>
                  <stop offset="50%" stopColor="#1e7d3c"/>
                  <stop offset="100%" stopColor="#1b6e35"/>
                </linearGradient>
              </defs>
              <rect width="400" height="640" fill="url(#fg2)" rx="12"/>
              {[0,1,2,3,4,5,6,7,8,9].map(i => (
                <rect key={i} x="0" y={i*64} width="400" height="64"
                  fill={i%2===0 ? "rgba(0,0,0,0.06)" : "transparent"}/>
              ))}
              {/* borda */}
              <rect x="10" y="10" width="380" height="620" rx="8" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"/>
              {/* meio */}
              <line x1="10" y1="320" x2="390" y2="320" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
              <circle cx="200" cy="320" r="50" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
              <circle cx="200" cy="320" r="4" fill="rgba(255,255,255,0.7)"/>
              {/* área topo */}
              <rect x="110" y="10" width="180" height="80" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <rect x="150" y="10" width="100" height="34" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <circle cx="200" cy="68" r="3.5" fill="rgba(255,255,255,0.5)"/>
              <path d="M130 90 A65 65 0 0 1 270 90" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
              {/* área baixo */}
              <rect x="110" y="550" width="180" height="80" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <rect x="150" y="596" width="100" height="34" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <circle cx="200" cy="572" r="3.5" fill="rgba(255,255,255,0.5)"/>
              <path d="M130 550 A65 65 0 0 0 270 550" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
              {/* escanteios */}
              <path d="M10 10 A8 8 0 0 1 18 18" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <path d="M390 10 A8 8 0 0 0 382 18" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <path d="M10 630 A8 8 0 0 0 18 622" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <path d="M390 630 A8 8 0 0 1 382 622" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
            </svg>

            {/* Botões de slot — HTML puro sobre o SVG */}
            {SLOTS.map(slot => {
              const occ   = slots[slot.key];
              const isSel = sel?.from === "field" && sel?.slotKey === slot.key;
              return (
                <button
                  key={slot.key}
                  onPointerDown={e => { e.preventDefault(); handleSlot(slot.key); }}
                  style={{
                    position: "absolute",
                    left: `${slot.px}%`,
                    top:  `${slot.py}%`,
                    transform: "translate(-50%, -50%)",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                    zIndex: 1,
                  }}
                >
                  <Shirt name={occ?.name} label={slot.label} selected={isSel} empty={!occ}/>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar jogadores */}
        <div className="w-[68px] shrink-0 flex flex-col min-h-0 pt-1">
          <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider mb-1 text-center shrink-0">Jogadores</p>
          <div className="overflow-y-auto flex-1 min-h-0 space-y-1">
            {available.length === 0 &&
              <p className="text-[9px] text-muted-foreground text-center py-2 leading-tight">Todos escalados</p>}
            {available.map(p => {
              const isSel = sel?.id === p.id && sel.from === "list";
              return (
                <button key={p.id}
                  onPointerDown={e => { e.preventDefault(); doSelect({ id: p.id, name: p.name, from: "list" }); }}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className={`w-full rounded-lg px-1 py-1 flex items-center gap-1 transition-all text-left ${
                    isSel ? "bg-yellow-400/25 border border-yellow-400" : "bg-card border border-border"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
                    isSel ? "bg-yellow-400 text-black" : "bg-primary/15 text-primary"}`}>
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-[9px] font-semibold text-foreground leading-tight truncate">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ações: jogador no campo selecionado */}
      {sel?.from === "field" && sel.slotKey && (
        <div className="px-3 py-1 shrink-0 flex gap-1.5">
          <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7"
            onClick={() => toRes({ id: sel.id, name: sel.name }, sel.slotKey)}>→ Reservas</Button>
          <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7 text-orange-500 border-orange-400/40"
            onClick={() => toSub({ id: sel.id, name: sel.name }, sel.slotKey)}>→ Subst.</Button>
          <Button size="sm" variant="ghost" className="px-2 h-7" onClick={() => setSel(null)}><X size={12}/></Button>
        </div>
      )}

      {/* Reservas + Substituídos */}
      <div className="px-3 py-1 shrink-0 flex gap-2">
        <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-2 py-0.5 bg-secondary/50">
            <span className="text-[9px] font-bold uppercase tracking-wider">Reservas</span>
            <span className="text-[9px] text-muted-foreground">{reservas.length}</span>
          </div>
          <div className="px-2 py-1 min-h-[26px] flex flex-wrap gap-1">
            {reservas.length === 0
              ? <p className="text-[9px] text-muted-foreground w-full text-center">—</p>
              : reservas.map(p => {
                const isSel = sel?.id === p.id && sel.from === "res";
                return (
                  <button key={p.id}
                    onPointerDown={e => { e.preventDefault(); isSel ? setSel(null) : doSelect({ id: p.id, name: p.name, from: "res" }); }}
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                      isSel ? "bg-yellow-400/20 border border-yellow-400/60 text-yellow-700" : "bg-secondary border border-border text-foreground"}`}>
                    {p.name}
                    <span onPointerDown={e => { e.stopPropagation(); fromRes(p); }}><X size={8}/></span>
                  </button>
                );
              })}
          </div>
        </div>

        <div className="flex-1 bg-card rounded-xl border border-orange-500/25 overflow-hidden">
          <div className="flex items-center justify-between px-2 py-0.5 bg-orange-500/5">
            <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wider">Subst.</span>
            <span className="text-[9px] text-muted-foreground">{subs.length}</span>
          </div>
          <div className="px-2 py-1 min-h-[26px] flex flex-wrap gap-1">
            {subs.length === 0
              ? <p className="text-[9px] text-muted-foreground w-full text-center">—</p>
              : subs.map(p => (
                <span key={p.id} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-600">
                  {p.name}
                  <button onPointerDown={() => fromSub(p)}><X size={8}/></button>
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="px-3 pb-1 pt-1 shrink-0 flex gap-2 border-t border-border/30">
        <Button variant="outline" size="sm" onClick={reset} className="text-xs h-8">
          <RotateCcw size={11} className="mr-1"/> Resetar
        </Button>
        <Button onClick={save} className="flex-1 bg-gradient-primary text-primary-foreground border-0 text-xs h-8">
          <Save size={11} className="mr-1"/> Salvar
        </Button>
      </div>

      <BottomNav/>
    </div>
  );
}
