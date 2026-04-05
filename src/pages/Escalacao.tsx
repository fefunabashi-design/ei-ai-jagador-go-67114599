import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Save, X, ZoomIn, ZoomOut } from "lucide-react";
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
type Sel = { id: string; name: string; from: "list"|"field"|"res"|"sub"; slotKey?: string };

function truncate(s: string, n = 7) { return s.length > n ? s.slice(0, n-1)+"." : s; }

// Camiseta centrada em (cx, cy) — corpo + mangas em SVG puro
function ShirtFilled({ cx, cy, name, selected }: { cx:number; cy:number; name:string; selected:boolean }) {
  const body   = selected ? "#facc15" : "#ffffff";
  const sleeve = selected ? "#d4a800" : "#dddddd";
  const stroke = selected ? "#b45309" : "#555";
  const txt    = selected ? "#7c2d00" : "#1a5c2e";
  const label  = truncate(name);
  const fs     = label.length > 6 ? 13 : label.length > 4 ? 14 : 16;
  // camiseta: 60 wide, 54 tall, centrada
  const x = cx - 30; const y = cy - 27;
  return (
    <g>
      {/* manga esq */}
      <polygon points={`${x},${y+15} ${x+14},${y+7} ${x+18},${y+20} ${x+5},${y+26}`}
        fill={sleeve} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
      {/* manga dir */}
      <polygon points={`${x+60},${y+15} ${x+46},${y+7} ${x+42},${y+20} ${x+55},${y+26}`}
        fill={sleeve} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
      {/* corpo */}
      <path d={`M${x+14} ${y+7} Q${x+30} ${y+1} ${x+46} ${y+7} L${x+46} ${y+53} Q${x+46} ${y+55} ${x+44} ${y+55} L${x+16} ${y+55} Q${x+14} ${y+55} ${x+14} ${y+53} Z`}
        fill={body} stroke={stroke} strokeWidth="1.5"/>
      {/* gola */}
      <path d={`M${x+22} ${y+7} Q${x+30} ${y+14} ${x+38} ${y+7}`}
        fill="none" stroke={stroke} strokeWidth="2"/>
      {/* nome */}
      <text x={cx} y={cy+14} textAnchor="middle" fontSize={fs} fontWeight="800"
        fill={txt} fontFamily="system-ui,-apple-system,sans-serif" letterSpacing="-0.5">
        {label}
      </text>
    </g>
  );
}

function ShirtEmpty({ cx, cy, label, highlight }: { cx:number; cy:number; label:string; highlight:boolean }) {
  const s = highlight ? "rgba(250,204,21,0.9)" : "rgba(255,255,255,0.4)";
  const f = highlight ? "rgba(250,204,21,0.15)" : "rgba(255,255,255,0.1)";
  const dash = highlight ? "" : "5,3";
  const x = cx - 30; const y = cy - 27;
  return (
    <g>
      <polygon points={`${x},${y+15} ${x+14},${y+7} ${x+18},${y+20} ${x+5},${y+26}`}
        fill={f} stroke={s} strokeWidth="1.5" strokeDasharray={dash} strokeLinejoin="round"/>
      <polygon points={`${x+60},${y+15} ${x+46},${y+7} ${x+42},${y+20} ${x+55},${y+26}`}
        fill={f} stroke={s} strokeWidth="1.5" strokeDasharray={dash} strokeLinejoin="round"/>
      <path d={`M${x+14} ${y+7} Q${x+30} ${y+1} ${x+46} ${y+7} L${x+46} ${y+53} Q${x+46} ${y+55} ${x+44} ${y+55} L${x+16} ${y+55} Q${x+14} ${y+55} ${x+14} ${y+53} Z`}
        fill={f} stroke={s} strokeWidth="1.5" strokeDasharray={dash}/>
      <text x={cx} y={cy+6} textAnchor="middle" fontSize="14" fontWeight="700"
        fill={highlight ? "rgba(250,204,21,0.9)" : "rgba(255,255,255,0.5)"}
        fontFamily="system-ui,sans-serif">
        {label}
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
  const [reservas, setRes]  = useState<Player[]>([]);
  const [subs, setSubs]     = useState<Player[]>([]);
  const [sel, setSel]       = useState<Sel|null>(null);
  const [zoom, setZoom]     = useState(1);

  const myMatches = useMemo(()=>
    matches.filter(m=>(m.home_team as any)?.id===myTeam?.id),[matches,myTeam]);
  const matchId = myMatches[0]?.id||"";
  const { data: summons=[] } = useMatchSummons(matchId||undefined);

  const confirmed = useMemo<Player[]>(()=>{
    const list = summons
      .filter((s:any)=>s.status==="confirmed")
      .map((s:any)=>({ id:s.player_id, name:s.player?.display_name||s.player?.nickname||s.player?.name||"?" }));
    if(list.length) return list;
    return allPlayers.map(p=>({ id:p.id, name:p.display_name||p.nickname||p.name }));
  },[summons,allPlayers]);

  const placedIds = useMemo(()=>new Set([
    ...Object.values(slots).map(p=>p.id),
    ...reservas.map(p=>p.id),
    ...subs.map(p=>p.id),
  ]),[slots,reservas,subs]);

  const available = confirmed.filter(p=>!placedIds.has(p.id));

  const doSelect = (info:Sel) => setSel(prev=>prev?.id===info.id&&prev.from===info.from?null:info);

  const placeOnSlot = (key:string) => {
    if(!sel){ const occ=slots[key]; if(occ) doSelect({id:occ.id,name:occ.name,from:"field",slotKey:key}); return; }
    if(sel.from==="field"&&sel.slotKey===key){ setSel(null); return; }
    const occ = slots[key];
    setSlots(prev=>{
      const n={...prev};
      if(sel.from==="field"&&sel.slotKey){ delete n[sel.slotKey]; if(occ) n[sel.slotKey]=occ; }
      else if(sel.from==="res"){ setRes(r=>occ?[...r.filter(p=>p.id!==sel.id),occ]:r.filter(p=>p.id!==sel.id)); }
      else if(sel.from==="sub"){ setSubs(s=>occ?[...s.filter(p=>p.id!==sel.id),occ]:s.filter(p=>p.id!==sel.id)); }
      else { if(occ) setRes(r=>[...r,occ]); }
      n[key]={id:sel.id,name:sel.name};
      return n;
    });
    setSel(null);
  };

  const toRes=(p:Player,k?:string)=>{ if(k) setSlots(prev=>{const n={...prev};delete n[k];return n;}); setRes(r=>[...r,p]); setSel(null); };
  const toSub=(p:Player,k?:string)=>{ if(k) setSlots(prev=>{const n={...prev};delete n[k];return n;}); setSubs(s=>[...s,p]); setSel(null); };
  const fromRes=(p:Player)=>{ setRes(r=>r.filter(x=>x.id!==p.id)); setSel(null); };
  const fromSub=(p:Player)=>{ setSubs(s=>s.filter(x=>x.id!==p.id)); setSel(null); };
  const reset=()=>{ setSlots({}); setRes([]); setSubs([]); setSel(null); toast({title:"Escalação resetada"}); };
  const save =()=> toast({title:`Escalação salva! ✅ (${Object.keys(slots).length}/11)`});

  // campo SVG viewBox 400x600
  const VBWW=400, VBHH=600;

  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-hidden" style={{userSelect:"none"}}>

      {/* Header */}
      <div className="px-4 pt-5 pb-2 flex items-center gap-2">
        <button onClick={()=>navigate(-1)}><ArrowLeft size={20} className="text-muted-foreground"/></button>
        <h1 className="text-xl font-display text-foreground flex-1">ESCALAÇÃO</h1>
        <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-1 rounded-lg">4-4-2</span>
      </div>

      {/* Hint */}
      {sel && (
        <div className="mx-4 mb-2 bg-yellow-500/15 border border-yellow-500/30 rounded-xl px-3 py-1.5 text-[11px] text-yellow-700 font-semibold">
          ⚽ {sel.name} selecionado — toque uma posição no campo
        </div>
      )}

      {/* Campo + Sidebar */}
      <div className="flex gap-2 px-2">

        {/* Campo SVG */}
        <div className="flex-1 min-w-0">
          {/* Zoom controls */}
          <div className="flex gap-1 justify-end mb-1">
            <button onClick={()=>setZoom(z=>Math.min(z+0.2,2.4))}
              className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center">
              <ZoomIn size={14} className="text-muted-foreground"/>
            </button>
            <button onClick={()=>setZoom(z=>Math.max(z-0.2,0.5))}
              className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center">
              <ZoomOut size={14} className="text-muted-foreground"/>
            </button>
          </div>

          <div className="overflow-auto rounded-2xl" style={{maxHeight:"calc(100dvh - 320px)"}}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${VBWW} ${VBHH}`}
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
                  <g key={slot.key} onClick={()=>placeOnSlot(slot.key)} style={{cursor:"pointer"}}>
                    {occ
                      ? <ShirtFilled cx={slot.x} cy={slot.y} name={occ.name} selected={isSel}/>
                      : <ShirtEmpty  cx={slot.x} cy={slot.y} label={slot.label} highlight={!!sel}/>
                    }
                  </g>
                );
              })}
            </svg>
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-1 font-semibold">
            4-4-2 · {Object.keys(slots).length}/11 escalados
          </p>
        </div>

        {/* Sidebar */}
        <div className="w-[68px] shrink-0 pt-8">
          <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-wider mb-1 text-center">Confirmados</p>
          <div className="overflow-y-auto space-y-0.5" style={{maxHeight:280}}>
            {available.length===0 && <p className="text-[9px] text-muted-foreground text-center py-2 leading-tight">Todos escalados</p>}
            {available.map(p=>{
              const isSel=sel?.id===p.id&&sel.from==="list";
              return (
                <button key={p.id} onClick={()=>doSelect({id:p.id,name:p.name,from:"list"})}
                  className={`w-full rounded-lg px-1.5 py-1.5 flex items-center gap-1 transition-all ${
                    isSel?"bg-yellow-400/25 border border-yellow-400":"bg-card border border-border"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
                    isSel?"bg-yellow-400 text-black":"bg-primary/15 text-primary"}`}>
                    {p.name.slice(0,1).toUpperCase()}
                  </div>
                  <span className="text-[9px] font-semibold text-foreground leading-tight truncate">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ações campo selecionado */}
      {sel?.from==="field" && sel.slotKey && (
        <div className="mx-4 mt-1.5 flex gap-1">
          <Button size="sm" variant="outline" className="flex-1 text-[9px] h-6"
            onClick={()=>toRes({id:sel.id,name:sel.name},sel.slotKey)}>Reservas</Button>
          <Button size="sm" variant="outline" className="flex-1 text-[9px] h-6 text-orange-500 border-orange-400/40"
            onClick={()=>toSub({id:sel.id,name:sel.name},sel.slotKey)}>Sub</Button>
          <Button size="sm" variant="ghost" className="px-1 h-6" onClick={()=>setSel(null)}><X size={11}/></Button>
        </div>
      )}

      {/* Reservas */}
      <div className="px-4 mt-2">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1 bg-secondary/50">
            <span className="text-[9px] font-bold uppercase tracking-wider">Reservas</span>
            <span className="text-[9px] text-muted-foreground">{reservas.length}</span>
          </div>
          <div className="p-1.5 min-h-[32px] flex flex-wrap gap-1">
            {reservas.length===0
              ? <p className="text-[8px] text-muted-foreground w-full text-center py-0.5">Nenhum</p>
              : reservas.map(p=>{
                const isSel=sel?.id===p.id&&sel.from==="res";
                return (
                  <button key={p.id}
                    onClick={()=>isSel?setSel(null):doSelect({id:p.id,name:p.name,from:"res"})}
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[8px] font-semibold ${
                      isSel?"bg-yellow-400/20 border border-yellow-400/60 text-yellow-700":"bg-secondary border border-border text-foreground"}`}>
                    {p.name}
                    <span onClick={e=>{e.stopPropagation();fromRes(p);}} className="text-muted-foreground hover:text-destructive ml-0.5"><X size={8}/></span>
                  </button>
                );
              })
            }
          </div>
        </div>
      </div>

      {/* Substituídos */}
      <div className="px-4 mt-1.5">
        <div className="bg-card rounded-xl border border-orange-500/25 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1 bg-orange-500/5">
            <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wider">Substituídos</span>
            <span className="text-[9px] text-muted-foreground">{subs.length}</span>
          </div>
          <div className="p-1.5 min-h-[32px] flex flex-wrap gap-1">
            {subs.length===0
              ? <p className="text-[8px] text-muted-foreground w-full text-center py-0.5">Nenhum</p>
              : subs.map(p=>(
                <span key={p.id} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[8px] font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-600">
                  {p.name}
                  <button onClick={()=>fromSub(p)} className="hover:text-destructive ml-0.5"><X size={8}/></button>
                </span>
              ))
            }
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="fixed bottom-16 left-0 right-0 px-4 flex gap-2 pb-0.5 pt-1.5 bg-background/90 backdrop-blur">
        <Button variant="outline" size="sm" onClick={reset} className="text-[9px] h-8">
          <RotateCcw size={11} className="mr-1"/> Resetar
        </Button>
        <Button onClick={save} className="flex-1 bg-gradient-primary text-primary-foreground border-0 text-[9px] h-8">
          <Save size={11} className="mr-1"/> Salvar
        </Button>
      </div>

      <BottomNav/>
    </div>
  );
}
