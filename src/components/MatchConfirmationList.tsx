import { useEffect, useMemo, useState } from "react";
import { Check, X, HeartPulse, Plane, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMatchSummons, useCreateSummons } from "@/hooks/useSupabaseData";
import { cn } from "@/lib/utils";

interface Props {
  matchId: string;
  teamId?: string;
}

const getInitials = (name: string) => {
  const parts = (name || "").trim().split(/\s+/);
  if (!parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const REASONS = [
  { id: "injured", label: "Machucado", icon: HeartPulse },
  { id: "travel", label: "Viagem", icon: Plane },
  { id: "work", label: "Trabalho", icon: Briefcase },
];

const reasonLabel = (r?: string | null) => REASONS.find((x) => x.id === r)?.label;

const MatchConfirmationList = ({ matchId, teamId }: Props) => {
  const { data: summons = [] } = useMatchSummons(matchId);
  const createSummon = useCreateSummons();
  const [players, setPlayers] = useState<any[]>([]);
  const [reasonOpenFor, setReasonOpenFor] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!teamId) return;
      const { data = [] } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", teamId)
        .order("name", { ascending: true });
      if (alive) setPlayers(data || []);
    })();
    return () => { alive = false; };
  }, [teamId]);

  const summonByPlayer = useMemo(() => {
    const m: Record<string, any> = {};
    for (const s of summons) m[s.player_id] = s;
    return m;
  }, [summons]);

  const handleSet = async (playerId: string, status: "confirmed" | "declined", absenceReason?: string | null) => {
    await createSummon.mutateAsync({ matchId, playerId, status, absenceReason });
    if (status === "confirmed" || absenceReason !== undefined) setReasonOpenFor(null);
  };

  if (!teamId) {
    return <p className="text-xs text-muted-foreground text-center py-6">Time não encontrado.</p>;
  }

  if (players.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">Nenhum jogador cadastrado.</p>;
  }

  return (
    <div className="space-y-2">
      {players.map((p) => {
        const s = summonByPlayer[p.id];
        const status: "confirmed" | "declined" | "pending" = s?.status || "pending";
        const reason: string | null = s?.absence_reason || null;
        const isReasonOpen = reasonOpenFor === p.id;

        return (
          <div
            key={p.id}
            className="bg-secondary/80 rounded-xl px-3 py-2.5 border border-border/50"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {getInitials(p.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {p.position || "Sem posição"}
                    {status === "declined" && reason && (
                      <span className="ml-1 text-destructive">· {reasonLabel(reason)}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleSet(p.id, "confirmed")}
                  disabled={createSummon.isPending}
                  className={cn(
                    "h-8 px-2.5 text-[11px] border",
                    status === "confirmed"
                      ? "bg-success text-white border-success hover:bg-success/90"
                      : "bg-success/10 text-success border-success/20 hover:bg-success/20",
                  )}
                >
                  <Check size={12} className="mr-1" /> Confirmado
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (status !== "declined") {
                      setReasonOpenFor(p.id);
                      handleSet(p.id, "declined", null);
                    } else {
                      setReasonOpenFor(isReasonOpen ? null : p.id);
                    }
                  }}
                  disabled={createSummon.isPending}
                  className={cn(
                    "h-8 px-2.5 text-[11px]",
                    status === "declined" &&
                      "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90",
                  )}
                >
                  <X size={12} className="mr-1" /> Ausente
                </Button>
              </div>
            </div>

            {status === "declined" && isReasonOpen && (
              <div className="mt-2.5 pt-2.5 border-t border-border/50">
                <p className="text-[11px] text-muted-foreground mb-1.5">Motivo da ausência:</p>
                <div className="flex flex-wrap gap-1.5">
                  {REASONS.map((r) => {
                    const Icon = r.icon;
                    const active = reason === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSet(p.id, "declined", r.id)}
                        disabled={createSummon.isPending}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition",
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:border-primary/40",
                        )}
                      >
                        <Icon size={12} />
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MatchConfirmationList;
