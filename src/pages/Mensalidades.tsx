import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Users, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMyTeam, usePlayers } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const MensalidadesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: myTeam, isLoading: teamLoading } = useMyTeam();
  const { data: players = [], isLoading: playersLoading } = usePlayers(myTeam?.id);
  const [filter, setFilter] = useState<"all" | "ok" | "late">("all");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Fetch mensalidades for current year
  const { data: mensalidades = [], isLoading: mensalidadesLoading } = useQuery({
    queryKey: ["mensalidades", myTeam?.id, currentYear],
    queryFn: async () => {
      if (!myTeam?.id) return [];
      const playerIds = players.map((p) => p.id);
      if (playerIds.length === 0) return [];
      const { data, error } = await supabase
        .from("mensalidades" as any)
        .select("*")
        .in("player_id", playerIds)
        .eq("ano", currentYear);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!myTeam?.id && players.length > 0,
  });

  // Upsert mutation
  const upsertMensalidade = useMutation({
    mutationFn: async ({ playerId, mes, pago }: { playerId: string; mes: number; pago: boolean }) => {
      const { error } = await supabase
        .from("mensalidades" as any)
        .upsert(
          {
            player_id: playerId,
            ano: currentYear,
            mes,
            pago,
            data_pagamento: pago ? new Date().toISOString() : null,
          } as any,
          { onConflict: "player_id,ano,mes" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensalidades", myTeam?.id, currentYear] });
      toast({ title: "Mensalidade atualizada! ✅" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const isMonthPaid = (playerId: string, mes: number) => {
    return mensalidades.some((m: any) => m.player_id === playerId && m.mes === mes && m.pago);
  };

  const isInadimplente = (playerId: string) => {
    if (currentMonth === 1) return false; // No previous month in January
    return !isMonthPaid(playerId, currentMonth - 1);
  };

  const loading = teamLoading || playersLoading || mensalidadesLoading;

  const emDiaCount = players.filter((p) => !isInadimplente(p.id)).length;
  const inadimplenteCount = players.filter((p) => isInadimplente(p.id)).length;

  const filteredPlayers = players.filter((p) => {
    if (filter === "ok") return !isInadimplente(p.id);
    if (filter === "late") return isInadimplente(p.id);
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <h1 className="text-2xl font-display text-foreground">MENSALIDADE 💳</h1>
      </div>

      <div className="px-5 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Users, value: players.length, label: "Total", color: "text-primary", bg: "bg-primary/10" },
                { icon: CheckCircle, value: emDiaCount, label: "Em dia", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { icon: AlertCircle, value: inadimplenteCount, label: "Inadimplentes", color: "text-destructive", bg: "bg-destructive/10" },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl border border-border p-3 text-center"
                >
                  <div className={`w-8 h-8 rounded-full ${stat.bg} flex items-center justify-center mx-auto mb-1`}>
                    <stat.icon size={14} className={stat.color} />
                  </div>
                  <p className="text-lg font-display text-foreground">{stat.value}</p>
                  <p className="text-[9px] text-muted-foreground font-semibold">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2">
              {([
                { key: "all" as const, label: "Todos" },
                { key: "ok" as const, label: "Em dia" },
                { key: "late" as const, label: "Inadimplentes" },
              ]).map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={filter === f.key ? "default" : "outline"}
                  className={`text-xs h-8 ${filter === f.key ? "bg-primary text-primary-foreground" : ""}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {/* Player cards */}
            <div className="space-y-3">
              {filteredPlayers.map((player, idx) => {
                const late = isInadimplente(player.id);
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`rounded-xl border p-4 shadow-sm ${
                      late
                        ? "bg-destructive/5 border-destructive/30"
                        : "bg-emerald-500/5 border-emerald-500/30"
                    }`}
                  >
                    {/* Player header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {getInitials(player.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{player.name}</p>
                          <p className="text-[10px] text-muted-foreground">{player.position || "—"}</p>
                        </div>
                      </div>
                      <Badge
                        variant={late ? "destructive" : "default"}
                        className={`text-[9px] ${
                          late
                            ? "bg-destructive/10 text-destructive border-destructive/30"
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        }`}
                      >
                        {late ? "Inadimplente" : "Em dia"}
                      </Badge>
                    </div>

                    {/* Month grid */}
                    <div className="grid grid-cols-6 gap-1.5">
                      {MONTH_LABELS.map((label, i) => {
                        const mes = i + 1;
                        const paid = isMonthPaid(player.id, mes);
                        return (
                          <button
                            key={mes}
                            onClick={() =>
                              upsertMensalidade.mutate({
                                playerId: player.id,
                                mes,
                                pago: !paid,
                              })
                            }
                            disabled={upsertMensalidade.isPending}
                            className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-[9px] font-medium transition-colors ${
                              paid
                                ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30"
                                : "bg-secondary text-muted-foreground border border-border hover:border-primary/30"
                            }`}
                          >
                            {paid && <Check size={10} className="mb-0.5" />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}

              {filteredPlayers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Nenhum jogador encontrado</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MensalidadesPage;
