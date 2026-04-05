import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Shield, Plus, ChevronLeft, ChevronRight, LayoutList, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import { useMatches, useMyTeam } from "@/hooks/useSupabaseData";
import { mockDb } from "@/lib/mockDb";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS  = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const STATUS_LABEL: Record<string,string> = { open:"Aberto", confirmed:"Confirmado", completed:"Finalizado", cancelled:"Cancelado" };
const STATUS_CLS:   Record<string,string> = {
  open:      "bg-yellow-500/10 text-yellow-500",
  confirmed: "bg-green-500/10 text-green-500",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const FORMATOS = ["5x5","8x8","11x11"];
const EMPTY_FORM = { location:"", match_date:"", format:"8x8" };

export default function AgendaPage() {
  const now = new Date();

  const { data: myTeam }      = useMyTeam();
  const { data: matches=[] }  = useMatches();

  const [viewMode,   setViewMode]   = useState<"lista"|"calendario">("lista");
  const [calMonth,   setCalMonth]   = useState(now.getMonth());
  const [calYear,    setCalYear]    = useState(now.getFullYear());
  const [filter,     setFilter]     = useState<"upcoming"|"past"|"all">("upcoming");
  const [createOpen, setCreateOpen] = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [, forceUpdate]             = useState(0);

  const myMatches = (matches as any[]).filter(m => {
    const ht = m.home_team as any;
    return myTeam && (ht?.id === myTeam.id || ht?.owner_id === myTeam.owner_id);
  });

  const filtered = myMatches.filter(m => {
    const d = new Date(m.match_date);
    if (filter === "upcoming") return d >= now;
    if (filter === "past")     return d < now;
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeam) return;
    mockDb.createMatch({
      home_team_id: myTeam.id,
      location: form.location,
      match_date: new Date(form.match_date).toISOString(),
      format: form.format,
      status: "open",
    });
    setCreateOpen(false);
    setForm(EMPTY_FORM);
    forceUpdate(n => n + 1);
  };

  // Calendário
  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const matchDays   = myMatches
    .filter(m => { const d = new Date(m.match_date); return d.getMonth()===calMonth && d.getFullYear()===calYear; })
    .map(m => new Date(m.match_date).getDate());
  const todayDay    = now.getDate();
  const isThisMonth = now.getMonth()===calMonth && now.getFullYear()===calYear;
  const cells       = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const prevMonth   = () => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); };
  const nextMonth   = () => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); };
  const monthMatches = myMatches.filter(m => { const d=new Date(m.match_date); return d.getMonth()===calMonth&&d.getFullYear()===calYear; });

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-foreground font-display">AGENDA</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas partidas</p>
        </div>
        {myTeam && (
          <Button onClick={()=>setCreateOpen(true)} className="bg-gradient-primary text-primary-foreground border-0">
            <Plus size={16} className="mr-1"/> Nova Partida
          </Button>
        )}
      </div>

      <div className="px-5 space-y-4">

        {/* Toggle Lista / Calendário */}
        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
          <button onClick={()=>setViewMode("lista")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode==="lista"?"bg-card text-foreground shadow-sm":"text-muted-foreground"}`}>
            <LayoutList size={13}/> Lista
          </button>
          <button onClick={()=>setViewMode("calendario")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode==="calendario"?"bg-card text-foreground shadow-sm":"text-muted-foreground"}`}>
            <CalendarDays size={13}/> Calendário
          </button>
        </div>

        {/* ── CALENDÁRIO ── */}
        {viewMode==="calendario" && (
          <div className="space-y-4">
            {/* Navegação */}
            <div className="flex items-center gap-2">
              <button onPointerDown={prevMonth} className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center">
                <ChevronLeft size={16} className="text-muted-foreground"/>
              </button>
              <div className="flex-1 flex gap-2">
                <select value={calMonth} onChange={e=>setCalMonth(Number(e.target.value))}
                  className="flex-1 bg-card border border-border text-foreground text-sm py-2 px-3 rounded-xl appearance-none text-center font-semibold">
                  {MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}
                </select>
                <select value={calYear} onChange={e=>setCalYear(Number(e.target.value))}
                  className="w-[90px] bg-card border border-border text-foreground text-sm py-2 px-3 rounded-xl appearance-none text-center font-semibold">
                  {[2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onPointerDown={nextMonth} className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center">
                <ChevronRight size={16} className="text-muted-foreground"/>
              </button>
            </div>

            {/* Grade */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="grid grid-cols-7 mb-3">
                {DIAS.map(d=>(
                  <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day, idx) => {
                  if(!day) return <div key={`e${idx}`} className="h-10"/>;
                  const hasMatch = matchDays.includes(day as number);
                  const isToday  = isThisMonth && day===todayDay;
                  return (
                    <div key={day} className="flex items-center justify-center h-10">
                      {hasMatch ? (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_0_10px_rgba(92,253,128,0.25)]">
                          {day}
                        </div>
                      ) : isToday ? (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold border-2 border-primary text-primary">
                          {day}
                        </div>
                      ) : (
                        <div className="w-9 h-9 flex items-center justify-center text-sm text-foreground font-medium">
                          {day}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Jogos do mês */}
            {monthMatches.length===0
              ? <p className="text-center text-muted-foreground text-sm py-2">Nenhum jogo neste mês</p>
              : (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Jogos do mês</h3>
                  {monthMatches.map((m: any) => {
                    const ht = m.home_team as any;
                    const at = m.away_team as any;
                    const d  = new Date(m.match_date);
                    return (
                      <div key={m.id} className="bg-secondary/50 rounded-xl border border-border px-4 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-primary uppercase">{MESES[d.getMonth()].slice(0,3)}</span>
                          <span className="text-base font-black text-primary leading-none">{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {ht?.name||"???"}{at?.name ? ` × ${at.name}` : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {m.location} · {d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
                          </p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[m.status]||""}`}>
                          {STATUS_LABEL[m.status]||m.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            }

            {/* Legenda */}
            <div className="bg-card rounded-2xl border border-border px-4 py-3">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Legenda</h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 shrink-0"/>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">Jogo Agendado</p>
                    <p className="text-[11px] text-muted-foreground">Data com partida confirmada</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl border-2 border-primary shrink-0"/>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">Hoje</p>
                    <p className="text-[11px] text-muted-foreground">Data atual</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── LISTA ── */}
        {viewMode==="lista" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["upcoming","past","all"] as const).map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    filter===f?"bg-gradient-primary text-primary-foreground":"bg-card border border-border text-muted-foreground"}`}>
                  {f==="upcoming"?"Próximas":f==="past"?"Passadas":"Todas"}
                </button>
              ))}
            </div>

            {!myTeam && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-sm text-yellow-500">
                ⚠️ Crie um time para gerenciar a agenda de partidas.
              </div>
            )}

            <div className="space-y-3">
              {filtered.map((match: any, i: number) => {
                const ht = match.home_team as any;
                const at = match.away_team as any;
                const d  = new Date(match.match_date);
                return (
                  <motion.div key={match.id}
                    initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
                    className="bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/30 transition-all">
                    <div className="bg-secondary/50 px-4 py-2 flex items-center justify-between">
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${STATUS_CLS[match.status]||""}`}>
                        {STATUS_LABEL[match.status]||match.status}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-semibold">{match.format}</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Shield size={16} className="text-primary"/>
                          </div>
                          <span className="font-display text-foreground">{ht?.name?.toUpperCase()||"???"}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-bold px-3">VS</span>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-foreground">{at?.name?.toUpperCase()||"???"}</span>
                          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                            <Shield size={16} className="text-muted-foreground"/>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar size={11}/> {d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</span>
                        <span className="flex items-center gap-1"><Clock size={11}/> {d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>
                        <span className="flex items-center gap-1"><MapPin size={11}/> {match.location}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {filtered.length===0 && (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhuma partida encontrada 😕</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialog Nova Partida */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border" onInteractOutside={e=>e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">NOVA PARTIDA</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Local</Label>
              <Input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))}
                placeholder="Ex: Campo do Zé" className="bg-secondary border-border" required/>
            </div>
            <div>
              <Label>Data e Hora</Label>
              <Input type="datetime-local" value={form.match_date}
                onChange={e=>setForm(f=>({...f,match_date:e.target.value}))}
                className="bg-secondary border-border" required/>
            </div>
            <div>
              <Label>Formato</Label>
              <Select value={form.format} onValueChange={v=>setForm(f=>({...f,format:v}))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue/></SelectTrigger>
                <SelectContent>
                  {FORMATOS.map(fmt=><SelectItem key={fmt} value={fmt}>{fmt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold">
              Criar Partida
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav/>
    </div>
  );
}
