import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMySummons, useRespondSummon } from "@/hooks/useSupabaseData";

const statusBadge: Record<string, { label: string; className: string }> = {
  confirmed: { label: "✅ Confirmado", className: "bg-success/10 text-success" },
  declined: { label: "❌ Recusado", className: "bg-destructive/10 text-destructive" },
  pending: { label: "⏳ Aguardando", className: "bg-warning/10 text-warning" },
};

const PlayerSummons = () => {
  const { data: summons = [], isLoading } = useMySummons();
  const respond = useRespondSummon();

  if (isLoading) return null;
  if (summons.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-2xl text-foreground font-display">CONVOCAÇÕES</h2>
      {summons.map((s: any, i: number) => {
        const match = s.match;
        const date = match ? new Date(match.match_date) : null;
        const badge = statusBadge[s.status] || statusBadge.pending;

        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                {badge.label}
              </span>
              {match && (
                <span className="text-[10px] text-muted-foreground">{match.format}</span>
              )}
            </div>
            {match && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-display text-foreground">{match.home_team?.name?.toUpperCase()}</span>
                  <span className="text-xs text-muted-foreground font-bold px-2">VS</span>
                  <span className="font-display text-foreground">{match.away_team?.name?.toUpperCase() || "???"}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {date && (
                    <>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </>
                  )}
                  <span className="flex items-center gap-1"><MapPin size={12} /> {match.location}</span>
                </div>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Posição: <span className="text-foreground font-semibold">{s.position || "Não definida"}</span>
            </p>

            {s.status === "pending" ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => respond.mutate({ id: s.id, status: "confirmed" })}
                  disabled={respond.isPending}
                  className="flex-1 bg-gradient-primary text-primary-foreground border-0"
                >
                  <Check size={14} className="mr-1" /> Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respond.mutate({ id: s.id, status: "declined" })}
                  disabled={respond.isPending}
                  className="flex-1"
                >
                  <X size={14} className="mr-1" /> Recusar
                </Button>
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground">
                Respondido em {s.responded_at ? new Date(s.responded_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default PlayerSummons;
