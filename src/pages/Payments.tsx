import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  useMatchLineups,
  useMatchDetail,
  useMatchPayments,
  useCreateMatchPayments,
  useDeleteMatchPayment,
  useDeleteMatchPaymentsByMatch,
} from "@/hooks/useSupabaseData";

import { useToast } from "@/hooks/use-toast";

const statusStyles: Record<string, string> = {
  paid: "text-success",
  pending: "text-warning",
  overdue: "text-destructive",
};

const statusLabels: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Atrasado",
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const PaymentsPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [setupOpen, setSetupOpen] = useState(false);
  const [amountPerPlayer, setAmountPerPlayer] = useState("15");
  const [deleteVaquinhaOpen, setDeleteVaquinhaOpen] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const { data: match } = useMatchDetail(matchId);
  const { data: summons = [] } = useMatchSummons(matchId);
  const { data: payments = [] } = useMatchPayments(matchId);
  const createPaymentsMut = useCreateMatchPayments();
  const deletePaymentMut = useDeleteMatchPayment();
  const deleteAllMut = useDeleteMatchPaymentsByMatch();

  const handleCreatePayments = async (amount: number) => {
    if (!matchId) return;
    const confirmedPlayers = summons
      .filter((s: any) => s.status === "confirmed")
      .map((s: any) => s.player_id);
    if (confirmedPlayers.length === 0) {
      toast({ title: "Nenhum jogador confirmado", variant: "destructive" });
      return;
    }
    try {
      await createPaymentsMut.mutateAsync({ matchId, playerIds: confirmedPlayers, amount });
      toast({ title: "Vaquinha criada! 💰" });
      setSetupOpen(false);
    } catch {}
  };

  const handleDeleteVaquinha = async () => {
    if (!matchId) return;
    try {
      await deleteAllMut.mutateAsync(matchId);
      toast({ title: "Vaquinha excluída com sucesso ✅" });
      setDeleteVaquinhaOpen(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await deletePaymentMut.mutateAsync(id);
      toast({ title: "Contribuição removida com sucesso ✅" });
      setDeletePaymentId(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    }
  };

  const createPayments = { mutate: handleCreatePayments, isPending: createPaymentsMut.isPending };
  const deleteVaquinha = { mutate: handleDeleteVaquinha };
  const deletePayment = { mutate: handleDeletePayment };

  const totalAmount = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const paidAmount = payments.filter((p: any) => p.status === "paid").reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const paidCount = payments.filter((p: any) => p.status === "paid").length;
  const progress = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const perPlayer = payments.length > 0 ? Number(payments[0]?.amount || 0) : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <h1 className="text-2xl font-display text-foreground">PAGAMENTOS 💰</h1>
      </div>

      <div className="px-5 space-y-4">
        {payments.length === 0 ? (
          /* No vaquinha yet */
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CreditCard size={28} className="text-primary" />
            </div>
            <div>
              <p className="text-foreground font-semibold">Nenhuma vaquinha ativa</p>
              <p className="text-sm text-muted-foreground">Crie uma vaquinha para dividir os custos da partida</p>
            </div>
            <Button onClick={() => setSetupOpen(true)} className="bg-gradient-primary text-primary-foreground border-0">
              Criar Vaquinha
            </Button>
          </div>
        ) : (
          <>
            {/* Summary card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-semibold">Vaquinha do jogo</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-display text-foreground">R$ {totalAmount.toFixed(2)}</p>
                  <button onClick={() => setDeleteVaquinhaOpen(true)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 size={16} className="text-destructive" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                R$ {perPlayer.toFixed(2)} por jogador · {payments.length} jogadores
              </p>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>R$ {paidAmount.toFixed(2)} arrecadados</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-gradient-primary rounded-full"
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1">
                  <span className="text-success">R$ {paidAmount.toFixed(2)} recebidos</span>
                  <span>Meta: R$ {totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>

            {/* Status by player */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status por jogador</p>
                <button className="text-[10px] text-primary font-semibold">Cobrar todos →</button>
              </div>
              <div className="space-y-1.5">
                {payments.map((p: any, i: number) => {
                  const player = p.player as any;
                  const name = player?.name || "Jogador";
                  const initials = getInitials(name);
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between bg-secondary/80 rounded-xl px-4 py-3 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{name}</p>
                          <p className="text-[10px] text-muted-foreground">{player?.position || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-foreground">R$ {Number(p.amount).toFixed(2)}</p>
                          <p className={`text-[10px] font-semibold ${statusStyles[p.status] || "text-muted-foreground"}`}>
                            {statusLabels[p.status] || p.status}
                          </p>
                        </div>
                        <button onClick={() => setDeletePaymentId(p.id)} className="p-1 rounded-lg hover:bg-destructive/10 transition-colors">
                          <Trash2 size={14} className="text-destructive/70" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <Button className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold">
              ⚡ Cobrar pendentes via Pix
            </Button>
          </>
        )}
      </div>

      {/* Setup dialog */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">CRIAR VAQUINHA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor por jogador (R$)</Label>
              <Input
                type="number"
                value={amountPerPlayer}
                onChange={(e) => setAmountPerPlayer(e.target.value)}
                className="bg-secondary border-border"
                min="1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {summons.filter((s: any) => s.status === "confirmed").length} jogadores confirmados · 
              Total: R$ {(Number(amountPerPlayer) * summons.filter((s: any) => s.status === "confirmed").length).toFixed(2)}
            </p>
            <Button
              onClick={() => createPayments.mutate(Number(amountPerPlayer))}
              disabled={createPayments.isPending}
              className="w-full bg-gradient-primary text-primary-foreground border-0"
            >
              Criar Vaquinha
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete vaquinha confirmation */}
      <AlertDialog open={deleteVaquinhaOpen} onOpenChange={setDeleteVaquinhaOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vaquinha?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a vaquinha? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVaquinha.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete single payment confirmation */}
      <AlertDialog open={!!deletePaymentId} onOpenChange={(open) => !open && setDeletePaymentId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover contribuição?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta contribuição? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePaymentId && deletePayment.mutate(deletePaymentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaymentsPage;
