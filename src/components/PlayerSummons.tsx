import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMySummons, useRespondSummon } from "@/hooks/useSupabaseData";

const statusStyles: Record<string, string> = {
  confirmed: "text-success",
  declined: "text-destructive",
  pending: "text-warning",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmado",
  declined: "Recusado",
  pending: "Pendente",
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const PlayerSummons = () => {
  const { data: summons = [], isLoading } = useMySummons();
  const respond = useRespondSummon();

  if (isLoading) return null;
  if (summons.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {summons.map((s: any, i: number) => {
        const playerName = s.player?.name || "Jogador";
        const initials = getInitials(playerName);
        const position = s.position || s.player?.position || "Sem posição";

        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center justify-between bg-secondary/80 rounded-xl px-4 py-3 border border-border/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">{playerName}</p>
                <p className="text-[11px] text-muted-foreground">{position}</p>
              </div>
            </div>

            {s.status === "pending" ? (
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  onClick={() => respond.mutate({ id: s.id, status: "confirmed" })}
                  disabled={respond.isPending}
                  className="h-7 px-2.5 text-[10px] bg-success/10 text-success border border-success/20 hover:bg-success/20"
                >
                  <Check size={12} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respond.mutate({ id: s.id, status: "declined" })}
                  disabled={respond.isPending}
                  className="h-7 px-2.5 text-[10px]"
                >
                  <X size={12} />
                </Button>
              </div>
            ) : (
              <span className={`text-[11px] font-semibold ${statusStyles[s.status] || "text-muted-foreground"}`}>
                {statusLabels[s.status] || s.status}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default PlayerSummons;
