import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type PlayerOption = { id: string; name: string; isGuest?: boolean };

type EventDraft = {
  uid: string;
  key: string; // player_id or guest:<name>
  type: "goal" | "yellow" | "red" | "blue";
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: any;
  myTeamId: string;
  onFinalized?: () => void;
}

const cardLabel: Record<string, string> = {
  yellow: "Amarelo",
  red: "Vermelho",
  blue: "Azul",
};

const cardColor: Record<string, string> = {
  yellow: "bg-warning/15 text-warning border-warning/30",
  red: "bg-destructive/15 text-destructive border-destructive/30",
  blue: "bg-primary/15 text-primary border-primary/30",
};

const FinalizeMatchDialog = ({ open, onOpenChange, match, myTeamId, onFinalized }: Props) => {
  const isHome = match?.home_team_id === myTeamId;
  const mySide: "home" | "away" = isHome ? "home" : "away";
  const myTeamName = isHome ? match?.home_team?.name : match?.away_team?.name;

  const [homeScore, setHomeScore] = useState<string>("");
  const [awayScore, setAwayScore] = useState<string>("");
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [goals, setGoals] = useState<EventDraft[]>([]);
  const [cards, setCards] = useState<EventDraft[]>([]);
  const [saving, setSaving] = useState(false);

  // Load players (confirmed summons + manual lineups + guests of my side)
  useEffect(() => {
    if (!open || !match?.id || !myTeamId) return;
    let alive = true;
    (async () => {
      const [{ data: teamPlayers = [] }, { data: summons = [] }, { data: lineups = [] }, { data: guests = [] }, { data: events = [] }] = await Promise.all([
        supabase.from("players").select("id, name, nickname").eq("team_id", myTeamId),
        supabase.from("match_summons").select("player_id, status").eq("match_id", match.id).eq("status", "confirmed"),
        supabase.from("match_lineups").select("player_id").eq("match_id", match.id),
        supabase.from("match_guests").select("id, name").eq("match_id", match.id),
        supabase.from("match_events").select("*").eq("match_id", match.id),
      ]);
      if (!alive) return;

      const confirmedIds = new Set((summons || []).map((s: any) => s.player_id));
      const lineupIds = new Set((lineups || []).map((l: any) => l.player_id));
      const eligibleIds = new Set([...confirmedIds, ...lineupIds]);

      const opts: PlayerOption[] = (teamPlayers || [])
        .filter((p: any) => eligibleIds.has(p.id))
        .map((p: any) => ({ id: p.id, name: p.nickname?.trim() || p.name }));

      (guests || []).forEach((g: any) => opts.push({ id: `guest:${g.name}`, name: `${g.name} (convidado)`, isGuest: true }));
      setPlayers(opts);

      setHomeScore(match.home_score != null ? String(match.home_score) : "");
      setAwayScore(match.away_score != null ? String(match.away_score) : "");

      // Pre-populate existing events for my side
      const mine = (events || []).filter((e: any) => e.team_side === mySide);
      const toDraft = (e: any): EventDraft => ({
        uid: e.id,
        key: e.player_id ? e.player_id : (e.player_name ? `guest:${e.player_name}` : ""),
        type: e.type === "own_goal" ? "goal" : (e.type as any),
      });
      setGoals(mine.filter((e: any) => e.type === "goal" || e.type === "own_goal").map(toDraft));
      setCards(mine.filter((e: any) => ["yellow", "red", "blue"].includes(e.type)).map(toDraft));
    })();
    return () => { alive = false; };
  }, [open, match?.id, myTeamId, mySide, match?.home_score, match?.away_score]);

  const myScore = useMemo(() => {
    const v = parseInt(mySide === "home" ? homeScore : awayScore, 10);
    return Number.isNaN(v) ? 0 : v;
  }, [homeScore, awayScore, mySide]);

  const addGoal = () => setGoals((g) => [...g, { uid: `n-${Date.now()}-${Math.random()}`, key: "", type: "goal" }]);
  const addCard = (type: "yellow" | "red" | "blue") =>
    setCards((c) => [...c, { uid: `n-${Date.now()}-${Math.random()}`, key: "", type }]);

  const removeGoal = (uid: string) => setGoals((g) => g.filter((e) => e.uid !== uid));
  const removeCard = (uid: string) => setCards((c) => c.filter((e) => e.uid !== uid));

  const updateEntry = (list: EventDraft[], setList: (l: EventDraft[]) => void, uid: string, patch: Partial<EventDraft>) => {
    setList(list.map((e) => (e.uid === uid ? { ...e, ...patch } : e)));
  };

  const handleSubmit = async () => {
    const hs = parseInt(homeScore, 10);
    const as = parseInt(awayScore, 10);
    if (Number.isNaN(hs) || Number.isNaN(as) || hs < 0 || as < 0) {
      toast({ title: "Informe o placar das duas equipes", variant: "destructive" });
      return;
    }
    if (goals.length !== myScore) {
      toast({
        title: `Indique o autor de cada gol`,
        description: `Seu time marcou ${myScore} gol(s) — adicione exatamente ${myScore} marcador(es).`,
        variant: "destructive",
      });
      return;
    }
    if (goals.some((g) => !g.key)) {
      toast({ title: "Selecione o jogador de cada gol", variant: "destructive" });
      return;
    }
    if (cards.some((c) => !c.key)) {
      toast({ title: "Selecione o jogador de cada cartão", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Replace my-side events
      const { error: delErr } = await supabase
        .from("match_events")
        .delete()
        .eq("match_id", match.id)
        .eq("team_side", mySide);
      if (delErr) throw delErr;

      const all = [...goals, ...cards];
      if (all.length) {
        const rows = all.map((e) => {
          const isGuest = e.key.startsWith("guest:");
          const player_id = isGuest ? null : e.key;
          const player_name = isGuest ? e.key.slice(6) : null;
          return {
            match_id: match.id,
            type: e.type,
            team_side: mySide,
            player_id,
            player_name,
          };
        });
        const { error: insErr } = await supabase.from("match_events").insert(rows);
        if (insErr) throw insErr;
      }

      const { error: upErr } = await supabase
        .from("matches")
        .update({ home_score: hs, away_score: as, status: "completed" })
        .eq("id", match.id);
      if (upErr) throw upErr;

      toast({ title: "Partida finalizada!" });
      window.dispatchEvent(new CustomEvent("supabase-data-change"));
      onFinalized?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao finalizar", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderPlayerSelect = (entry: EventDraft, list: EventDraft[], setList: (l: EventDraft[]) => void) => (
    <Select value={entry.key} onValueChange={(v) => updateEntry(list, setList, entry.uid, { key: v })}>
      <SelectTrigger className="bg-secondary border-border h-9 text-xs">
        <SelectValue placeholder="Jogador" />
      </SelectTrigger>
      <SelectContent>
        {players.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum jogador confirmado</div>
        ) : (
          players.map((p) => (
            <SelectItem key={p.id} value={p.id} className="text-xs">
              {p.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">FINALIZAR PARTIDA</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <Label className="text-xs">Placar final</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground mb-1 truncate">{match?.home_team?.name || "Mandante"}</p>
                <Input
                  type="number"
                  min={0}
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="bg-secondary border-border text-center text-lg font-display"
                />
              </div>
              <span className="text-muted-foreground pt-5">x</span>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground mb-1 truncate">{match?.away_team?.name || "Visitante"}</p>
                <Input
                  type="number"
                  min={0}
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="bg-secondary border-border text-center text-lg font-display"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Os dois times podem editar o placar.
            </p>
          </div>

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="text-xs">Gols de {myTeamName || "meu time"}</Label>
                <p className="text-[10px] text-muted-foreground">
                  {goals.length}/{myScore} marcadores informados
                </p>
              </div>
              <Button size="sm" variant="outline" type="button" onClick={addGoal} className="h-7 text-[11px]">
                <Plus size={12} className="mr-1" /> Gol
              </Button>
            </div>
            <div className="space-y-2">
              {goals.map((g) => (
                <div key={g.uid} className="flex items-center gap-2">
                  <span className="text-lg">⚽</span>
                  <div className="flex-1">{renderPlayerSelect(g, goals, setGoals)}</div>
                  <Button size="icon" variant="ghost" type="button" onClick={() => removeGoal(g.uid)} className="h-8 w-8 text-destructive">
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              {goals.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-2">Nenhum gol registrado.</p>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Cartões de {myTeamName || "meu time"}</Label>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" type="button" onClick={() => addCard("yellow")} className="h-7 text-[11px] border-warning/40 text-warning">
                  <Plus size={12} className="mr-0.5" /> Amarelo
                </Button>
                <Button size="sm" variant="outline" type="button" onClick={() => addCard("red")} className="h-7 text-[11px] border-destructive/40 text-destructive">
                  <Plus size={12} className="mr-0.5" /> Vermelho
                </Button>
                <Button size="sm" variant="outline" type="button" onClick={() => addCard("blue")} className="h-7 text-[11px] border-primary/40 text-primary">
                  <Plus size={12} className="mr-0.5" /> Azul
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {cards.map((c) => (
                <div key={c.uid} className="flex items-center gap-2">
                  <Select
                    value={c.type}
                    onValueChange={(v) => updateEntry(cards, setCards, c.uid, { type: v as any })}
                  >
                    <SelectTrigger className={`h-9 text-xs w-28 border ${cardColor[c.type]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yellow" className="text-xs">🟨 Amarelo</SelectItem>
                      <SelectItem value="red" className="text-xs">🟥 Vermelho</SelectItem>
                      <SelectItem value="blue" className="text-xs">🟦 Azul</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1">{renderPlayerSelect(c, cards, setCards)}</div>
                  <Button size="icon" variant="ghost" type="button" onClick={() => removeCard(c.uid)} className="h-8 w-8 text-destructive">
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              {cards.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-2">Nenhum cartão registrado.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-gradient-primary text-primary-foreground border-0">
            {saving ? "Salvando..." : "Finalizar partida"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinalizeMatchDialog;
