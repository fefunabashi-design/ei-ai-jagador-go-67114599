import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { mockDb } from "@/lib/mockDb";
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

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i);

const MensalidadesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: myTeam, isLoading: teamLoading } = useMyTeam();
  const { data: players = [], isLoading: playersLoading } = usePlayers(myTeam?.id);
  const [filter, setFilter] = useState<"all" | "ok" | "late">("all");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [valorInput, setValorInput] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ playerId: string; mes: number; isPaid: boolean; playerName: string } | null>(null);

  // Fetch mensalidades for selected year
  const { data: mensalidades = [], isLoading: mensalidadesLoading } = useQuery({
    queryKey: ["mensalidades", myTeam?.id, selectedYear],
    queryFn: async () => {
      if (!myTeam?.id) return [];
      const playerIds = players.map((p) => p.id);
      if (playerIds.length === 0) return [];
      return mockDb.getMensalidades(playerIds, selectedYear);
    },
    enabled: !!myTeam?.id && players.length > 0,
  });

  // Fetch config for selected year
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["mensalidade_config", selectedYear],
    queryFn: async () => mockDb.getMensalidadeConfig(selectedYear),
  });

  // Sync valorInput when config data changes or year changes
  useEffect(() => {
    setValorInput(config?.valor_mensal ? Number(config.valor_mensal).toFixed(2).replace(".", ",") : "");
  }, [config, selectedYear]);

  const valorMensal = config?.valor_mensal ? Number(config.valor_mensal) : 0;

  // Upsert config mutation
  const upsertConfig = useMutation({
    mutationFn: async (valor: number) => {
      if (!myTeam?.id) throw new Error("Sem time");
      mockDb.upsertMensalidadeConfig({ ano: selectedYear, valor_mensal: valor, team_id: myTeam.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensalidade_config", selectedYear] });
      toast({ title: `Valor salvo para ${selectedYear}! ✅` });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Upsert mensalidade mutation
  const upsertMensalidade = useMutation({
    mutationFn: async ({ playerId, mes, pago }: { playerId: string; mes: number; pago: boolean }) => {
      mockDb.upsertMensalidade({
        player_id: playerId,
        ano: selectedYear,
        mes,
        pago,
        data_pagamento: pago ? new Date().toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensalidades", myTeam?.id, selectedYear] });
      toast({ title: "Mensalidade atualizada! ✅" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const isMonthPaid = (playerId: string, mes: number) =>
    mensalidades.some((m: any) => m.player_id === playerId && m.mes === mes && m.pago);

  const paidMonthsCount = (playerId: string) =>
    MONTH_LABELS.reduce((acc, _, i) => acc + (isMonthPaid(playerId, i + 1) ? 1 : 0), 0);

  const unpaidMonthsUntilNow = (playerId: string) => {
    const limit = selectedYear === currentYear ? currentMonth - 1 : 12;
    let count = 0;
    for (let m = 1; m <= limit; m++) {
      if (!isMonthPaid(playerId, m)) count++;
    }
    return count;
  };

  const isInadimplente = (playerId: string) => {
    if (selectedYear < currentYear) {
      return unpaidMonthsUntilNow(playerId) > 0;
    }
    if (currentMonth === 1) return false;
    return !isMonthPaid(playerId, currentMonth - 1);
  };

  const loading = teamLoading || playersLoading || mensalidadesLoading || configLoading;

  const emDiaCount = players.filter((p) => !isInadimplente(p.id)).length;
  const inadimplenteCount = players.filter((p) => isInadimplente(p.id)).length;
  const totalArrecadado = players.reduce((acc, p) => acc + paidMonthsCount(p.id) * valorMensal, 0);
  const monthsUntilNow = selectedYear === currentYear ? currentMonth - 1 : 12;
  const totalExpected = players.length * monthsUntilNow * valorMensal;
  const aArrecadar = totalExpected - totalArrecadado;

  const filteredPlayers = players.filter((p) => {
    if (filter === "ok") return !isInadimplente(p.id);
    if (filter === "late") return isInadimplente(p.id);
    return true;
  });

  const handleSaveValor = () => {
    const val = parseFloat(valorInput.replace(",", "."));
    if (isNaN(val) || val < 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    setValorInput(val.toFixed(2).replace(".", ","));
    upsertConfig.mutate(val);
  };

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
            <Skeleton className="h-10 rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Year selector + Valor config */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">ANO</label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-[2]">
                <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">VALOR MENSAL (R$)</label>
                <div className="flex gap-1.5">
                  <Input
                    className="h-9 text-sm"
                    placeholder="0,00"
                    value={valorInput}
                    onChange={(e) => setValorInput(e.target.value)}
                    onBlur={handleSaveValor}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveValor()}
                  />
                </div>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-2">
              {/* Total card */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border p-3 text-center"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
                  <Users size={14} className="text-primary" />
                </div>
                <p className="text-base font-display text-foreground">{players.length}</p>
                <div className="flex justify-center gap-3 mt-1">
                  <span className="text-[9px] font-semibold text-emerald-500">Em dia: {emDiaCount}</span>
                  <span className="text-[9px] font-semibold text-destructive">Inad: {inadimplenteCount}</span>
                </div>
                <p className="text-[9px] text-muted-foreground font-semibold mt-1">Total</p>
              </motion.div>

              {/* Arrecadado card */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border p-3 text-center"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
                  <DollarSign size={14} className="text-primary" />
                </div>
                <p className="text-base font-display text-foreground">{formatCurrency(totalArrecadado)}</p>
                <p className="text-[9px] text-muted-foreground font-semibold">Arrecadado</p>
                {aArrecadar > 0 && (
                  <p className="text-[9px] font-semibold text-destructive mt-1">
                    A arrecadar: {formatCurrency(aArrecadar)}
                  </p>
                )}
              </motion.div>
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
                const paid = paidMonthsCount(player.id);
                const unpaid = unpaidMonthsUntilNow(player.id);
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
                    <div className="flex items-center justify-between mb-2">
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

                    {/* Financial summary */}
                    {valorMensal > 0 && (
                      <div className="flex gap-3 mb-2 text-[10px]">
                        <span className="text-emerald-600 font-medium">
                          💰 {formatCurrency(paid * valorMensal)}
                        </span>
                        {unpaid > 0 && (
                          <span className="text-destructive font-medium">
                            ⚠️ {formatCurrency(unpaid * valorMensal)} em aberto
                          </span>
                        )}
                      </div>
                    )}

                    {/* Month grid */}
                    <div className="grid grid-cols-6 gap-1.5">
                      {MONTH_LABELS.map((label, i) => {
                        const mes = i + 1;
                        const isPaid = isMonthPaid(player.id, mes);
                        return (
                          <button
                            key={mes}
                            onClick={() =>
                              setConfirmAction({
                                playerId: player.id,
                                mes,
                                isPaid,
                                playerName: player.name,
                              })
                            }
                            disabled={upsertMensalidade.isPending}
                            className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-[9px] font-medium transition-colors ${
                              isPaid
                                ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30"
                                : "bg-secondary text-muted-foreground border border-border hover:border-primary/30"
                            }`}
                          >
                            {isPaid && <Check size={10} className="mb-0.5" />}
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
