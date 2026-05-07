import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, Pencil, Trash2, TrendingUp, TrendingDown,
  Wallet, ChevronDown, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useMyTeam, usePlayers,
  useDebitos, useCreateDebito, useUpdateDebito, useDeleteDebito,
  useMensalidades, useMensalidadeConfig,
} from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmtCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
};

const toInputDate = (iso: string) => (iso ? iso.slice(0, 10) : "");

const EMPTY_DEBITO = { descricao: "", data: "", valor: "", observacao: "" };

// ─── types ──────────────────────────────────────────────────────────────────
type Lancamento = {
  id: string;
  tipo: "credito" | "debito";
  status: "realizado" | "previsto";
  descricao: string;
  data: string;
  valor: number;
  origem: "mensalidade" | "vaquinha" | "debito_manual";
  jogador?: string;
  observacao?: string;
};

// ─── page ───────────────────────────────────────────────────────────────────
const CaixaPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: team } = useMyTeam();
  const { data: players = [] } = usePlayers(team?.id);

  // ── filters (default = mês atual) ──
  const _today = new Date();
  const _firstDay = new Date(_today.getFullYear(), _today.getMonth(), 1).toISOString().slice(0, 10);
  const _lastDay = new Date(_today.getFullYear(), _today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [filterTipo, setFilterTipo] = useState<"all" | "credito" | "debito">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "realizado" | "previsto">("all");
  const [filterDtInicio, setFilterDtInicio] = useState(_firstDay);
  const [filterDtFim, setFilterDtFim] = useState(_lastDay);
  const [showFilters, setShowFilters] = useState(false);

  // ── lançamento dialog ──
  const [debitoOpen, setDebitoOpen] = useState(false);
  const [editingDebito, setEditingDebito] = useState<any>(null);
  const [tipoLancamento, setTipoLancamento] = useState<"debito" | "credito">("debito");
  const [showLancMenu, setShowLancMenu] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_DEBITO });
  const setF = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // ── queries ──
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const { data: debitos = [] } = useQuery({
    queryKey: ["debitos", team?.id],
    queryFn: () => (team?.id ? mockDb.getDebitos(team.id) : []),
    enabled: !!team?.id,
  });

  const { data: mensalidades = [] } = useQuery({
    queryKey: ["mensalidades_caixa", team?.id, currentYear],
    queryFn: () => {
      if (!team?.id || players.length === 0) return [];
      return mockDb.getMensalidades(players.map((p) => p.id), currentYear);
    },
    enabled: !!team?.id && players.length > 0,
  });

  const { data: mensalidadeConfig } = useQuery({
    queryKey: ["mensalidade_config", currentYear],
    queryFn: () => mockDb.getMensalidadeConfig(currentYear),
  });

  // ── mutations ──
  const createDebito = useMutation({
    mutationFn: async (d: any) => mockDb.createDebito({ ...d, team_id: team!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debitos", team?.id] });
      toast({ title: "Débito registrado! ✅" });
      setDebitoOpen(false);
    },
  });

  const updateDebito = useMutation({
    mutationFn: async ({ id, ...d }: any) => mockDb.updateDebito(id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debitos", team?.id] });
      toast({ title: "Débito atualizado! ✅" });
      setDebitoOpen(false);
    },
  });

  const deleteDebito = useMutation({
    mutationFn: async (id: string) => mockDb.deleteDebito(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debitos", team?.id] });
      toast({ title: "Débito excluído" });
    },
  });

  // ── build lancamentos ──
  const lancamentos = useMemo<Lancamento[]>(() => {
    const list: Lancamento[] = [];
    const valorMensal = mensalidadeConfig?.valor_mensal
      ? Number(mensalidadeConfig.valor_mensal)
      : 0;

    // Créditos realizados — mensalidades pagas
    if (valorMensal > 0) {
      mensalidades
        .filter((m: any) => m.pago && m.data_pagamento)
        .forEach((m: any) => {
          const player = players.find((p) => p.id === m.player_id);
          const nome = player?.display_name || player?.nickname || player?.name || "Jogador";
          list.push({
            id: `mens-${m.id || m.player_id + m.mes}`,
            tipo: "credito",
            status: "realizado",
            descricao: `Mensalidade ${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][m.mes - 1]}/${m.ano}`,
            data: m.data_pagamento,
            valor: valorMensal,
            origem: "mensalidade",
            jogador: nome,
          });
        });

      // Crédito previsto — mensalidade do mês atual não paga
      const activePlayers = players.filter((p) => p.is_active !== false);
      const paidThisMonth = mensalidades.filter(
        (m: any) => m.pago && m.mes === currentMonth && m.ano === currentYear
      ).length;
      const pendingCount = activePlayers.length - paidThisMonth;
      if (pendingCount > 0) {
        const monthLabel = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][currentMonth - 1];
        list.push({
          id: `previsto-mens-${currentMonth}`,
          tipo: "credito",
          status: "previsto",
          descricao: `Mensalidade ${monthLabel}/${currentYear} — ${pendingCount} jogador(es) em aberto`,
          data: new Date(currentYear, currentMonth - 1, 28).toISOString(),
          valor: pendingCount * valorMensal,
          origem: "mensalidade",
        });
      }
    }

    // Débitos e créditos manuais
    const now = Date.now();
    debitos.forEach((d: any) => {
      const isCredito = d.tipo === "credito";
      const isFuture = new Date(d.data).getTime() > now;
      list.push({
        id: d.id,
        tipo: isCredito ? "credito" : "debito",
        status: isFuture ? "previsto" : "realizado",
        descricao: d.descricao,
        data: d.data,
        valor: Number(d.valor),
        origem: isCredito ? "vaquinha" : "debito_manual",
        observacao: d.observacao,
      });
    });

    return list.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [debitos, mensalidades, mensalidadeConfig, players, currentMonth, currentYear]);

  // ── filtro ──
  const filtered = useMemo(() => {
    return lancamentos.filter((l) => {
      if (filterTipo !== "all" && l.tipo !== filterTipo) return false;
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      if (filterDtInicio && l.data < filterDtInicio) return false;
      if (filterDtFim && l.data > filterDtFim + "T23:59:59") return false;
      return true;
    });
  }, [lancamentos, filterTipo, filterStatus, filterDtInicio, filterDtFim]);

  // ── totalizadores (respeitam filtro) ──
  const creditosRealizados = filtered
    .filter((l) => l.tipo === "credito" && l.status === "realizado")
    .reduce((s, l) => s + l.valor, 0);

  const debitosRealizados = filtered
    .filter((l) => l.tipo === "debito" && l.status === "realizado")
    .reduce((s, l) => s + l.valor, 0);

  const creditosPrevistos = filtered
    .filter((l) => l.tipo === "credito" && l.status === "previsto")
    .reduce((s, l) => s + l.valor, 0);

  const debitosPrevistos = filtered
    .filter((l) => l.tipo === "debito" && l.status === "previsto")
    .reduce((s, l) => s + l.valor, 0);

  const saldoAtual = creditosRealizados - debitosRealizados;
  const saldoPrevisto = creditosRealizados + creditosPrevistos - debitosRealizados - debitosPrevistos;

  // ── totalizadores filtrados ──
  const totalFiltradoCredito = filtered
    .filter((l) => l.tipo === "credito")
    .reduce((s, l) => s + l.valor, 0);
  const totalFiltradoDebito = filtered
    .filter((l) => l.tipo === "debito")
    .reduce((s, l) => s + l.valor, 0);

  // ── form handlers ──
  const openNew = (tipo: "debito" | "credito") => {
    setEditingDebito(null);
    setTipoLancamento(tipo);
    setForm({ ...EMPTY_DEBITO, data: new Date().toISOString().slice(0, 10) });
    setShowLancMenu(false);
    setDebitoOpen(true);
  };

  const openEdit = (d: any) => {
    setEditingDebito(d);
    setTipoLancamento("debito");
    setForm({
      descricao: d.descricao,
      data: toInputDate(d.data),
      valor: String(d.valor),
      observacao: d.observacao || "",
    });
    setDebitoOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao.trim() || !form.data || !form.valor) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    const payload = {
      descricao: form.descricao,
      data: new Date(form.data).toISOString(),
      valor: parseFloat(form.valor.replace(",", ".")),
      tipo: tipoLancamento,
      observacao: form.observacao || undefined,
    };
    if (editingDebito) {
      updateDebito.mutate({ id: editingDebito.id, ...payload });
    } else {
      createDebito.mutate(payload);
    }
  };

  const hasFilters =
    filterTipo !== "all" || filterStatus !== "all" || filterDtInicio || filterDtFim;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <h1 className="text-xl font-display text-foreground flex-1">CAIXA</h1>

        <div className="relative">
          <Button
            onClick={() => setShowLancMenu((v) => !v)}
            size="sm"
            className="bg-gradient-primary text-primary-foreground border-0 text-xs h-9 px-3"
          >
            <Plus size={14} className="mr-1" /> Lançamentos
            <ChevronDown size={13} className="ml-1" />
          </Button>
          {showLancMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full mt-1 right-0 z-50 w-40 bg-card border border-border rounded-xl overflow-hidden shadow-lg"
            >
              <button
                onClick={() => openNew("debito")}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors text-left"
              >
                <TrendingDown size={14} className="text-destructive" />
                Débito
              </button>
              <div className="border-t border-border" />
              <button
                onClick={() => openNew("credito")}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors text-left"
              >
                <TrendingUp size={14} className="text-emerald-500" />
                Crédito
              </button>
            </motion.div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          className={`h-9 px-3 ${hasFilters ? "border-primary text-primary" : ""}`}
        >
          <Filter size={14} />
        </Button>
      </div>

      <div className="px-5 space-y-4">
        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard
            label="Créditos Realizados"
            value={fmtCurrency(creditosRealizados)}
            color="text-emerald-500"
            bg="bg-emerald-500/10"
            icon={<TrendingUp size={14} />}
            delay={0}
          />
          <SummaryCard
            label="Débitos Realizados"
            value={fmtCurrency(debitosRealizados)}
            color="text-destructive"
            bg="bg-destructive/10"
            icon={<TrendingDown size={14} />}
            delay={0.05}
          />
          <SummaryCard
            label="Créditos Previstos"
            value={fmtCurrency(creditosPrevistos)}
            color="text-amber-500"
            bg="bg-amber-500/10"
            icon={<TrendingUp size={14} />}
            delay={0.1}
          />
          <SummaryCard
            label="Débitos Previstos"
            value={fmtCurrency(debitosPrevistos)}
            color="text-orange-500"
            bg="bg-orange-500/10"
            icon={<TrendingDown size={14} />}
            delay={0.15}
          />
        </div>

        {/* Saldo previsto */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-3 flex items-center justify-between"
        >
          <span className="text-xs text-muted-foreground font-semibold">Saldo Previsto</span>
          <span className={`text-lg font-display ${saldoPrevisto >= 0 ? "text-primary" : "text-destructive"}`}>
            {fmtCurrency(saldoPrevisto)}
          </span>
        </motion.div>

        {/* ── Filters ── */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-4 space-y-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros</span>
              {hasFilters && (
                <button
                  onClick={() => {
                    setFilterTipo("all");
                    setFilterStatus("all");
                    setFilterDtInicio(_firstDay);
                    setFilterDtFim(_lastDay);
                  }}
                  className="text-[10px] text-primary underline"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Tipo</Label>
                <Select value={filterTipo} onValueChange={(v: any) => setFilterTipo(v)}>
                  <SelectTrigger className="h-8 text-xs bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Status</Label>
                <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                  <SelectTrigger className="h-8 text-xs bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                    <SelectItem value="previsto">Previsto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Data inicial</Label>
                <Input
                  type="date"
                  value={filterDtInicio}
                  onChange={(e) => setFilterDtInicio(e.target.value)}
                  className="h-8 text-xs bg-secondary border-border"
                />
              </div>
              <div>
                <Label className="text-[10px]">Data final</Label>
                <Input
                  type="date"
                  value={filterDtFim}
                  onChange={(e) => setFilterDtFim(e.target.value)}
                  className="h-8 text-xs bg-secondary border-border"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Totais filtrados ── */}
        {hasFilters && (
          <div className="flex gap-2 text-[10px]">
            <span className="bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-lg font-semibold">
              + {fmtCurrency(totalFiltradoCredito)}
            </span>
            <span className="bg-destructive/10 text-destructive px-2 py-1 rounded-lg font-semibold">
              − {fmtCurrency(totalFiltradoDebito)}
            </span>
            <span className={`px-2 py-1 rounded-lg font-semibold ${(totalFiltradoCredito - totalFiltradoDebito) >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
              = {fmtCurrency(totalFiltradoCredito - totalFiltradoDebito)}
            </span>
          </div>
        )}

        {/* ── Lista ── */}
        <div>
          <h2 className="text-xs font-display text-muted-foreground mb-2">
            LANÇAMENTOS {filtered.length > 0 && `(${filtered.length})`}
          </h2>

          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Nenhum lançamento encontrado
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((l, i) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`bg-card rounded-xl border p-3 flex items-start gap-3 ${
                    l.tipo === "credito"
                      ? "border-emerald-500/20"
                      : "border-destructive/20"
                  }`}
                >
                  {/* Indicador */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      l.tipo === "credito" ? "bg-emerald-500/15" : "bg-destructive/15"
                    }`}
                  >
                    {l.tipo === "credito" ? (
                      <TrendingUp size={14} className="text-emerald-500" />
                    ) : (
                      <TrendingDown size={14} className="text-destructive" />
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-tight truncate">
                          {l.descricao}
                        </p>
                        {l.jogador && (
                          <p className="text-[10px] text-muted-foreground">{l.jogador}</p>
                        )}
                      </div>
                      <span
                        className={`text-sm font-display shrink-0 ${
                          l.tipo === "credito" ? "text-emerald-500" : "text-destructive"
                        }`}
                      >
                        {l.tipo === "credito" ? "+" : "−"}{fmtCurrency(l.valor)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[9px] text-muted-foreground">{fmtDate(l.data)}</span>
                      <OrigemBadge origem={l.origem} tipo={l.tipo} />
                      <StatusBadge status={l.status} />
                    </div>

                    {l.observacao && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic">
                        {l.observacao}
                      </p>
                    )}
                  </div>

                  {/* Ações (só débito manual) */}
                  {l.origem === "debito_manual" && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => {
                          const d = debitos.find((d: any) => d.id === l.id);
                          if (d) openEdit(d);
                        }}
                        className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        <Pencil size={12} className="text-muted-foreground" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1.5 rounded-lg bg-secondary hover:bg-destructive/20 transition-colors">
                            <Trash2 size={12} className="text-muted-foreground" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir débito?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteDebito.mutate(l.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Lançamento Dialog ── */}
      <Dialog open={debitoOpen} onOpenChange={setDebitoOpen}>
        <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editingDebito
                ? `EDITAR ${tipoLancamento === "debito" ? "DÉBITO" : "CRÉDITO"}`
                : `NOVO ${tipoLancamento === "debito" ? "DÉBITO" : "CRÉDITO"}`}
            </DialogTitle>
          </DialogHeader>

          {/* Seletor de tipo (só no novo lançamento) */}
          {!editingDebito && (
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setTipoLancamento("debito")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  tipoLancamento === "debito"
                    ? "bg-destructive/15 text-destructive border border-destructive/30"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}
              >
                <TrendingDown size={13} /> Débito
              </button>
              <button
                type="button"
                onClick={() => setTipoLancamento("credito")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  tipoLancamento === "credito"
                    ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}
              >
                <TrendingUp size={13} /> Crédito
              </button>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setF("descricao", e.target.value)}
                placeholder={tipoLancamento === "debito" ? "Ex: Aluguel do campo" : "Ex: Receita extra"}
                className="bg-secondary border-border"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) => setF("data", e.target.value)}
                  className="bg-secondary border-border"
                  required
                />
              </div>
              <div>
                <Label>Valor (R$) *</Label>
                <Input
                  value={form.valor}
                  onChange={(e) => setF("valor", e.target.value)}
                  placeholder="0,00"
                  className="bg-secondary border-border"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Observação</Label>
              <Textarea
                value={form.observacao}
                onChange={(e) => setF("observacao", e.target.value)}
                placeholder="Informações adicionais..."
                className="bg-secondary border-border resize-none"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={createDebito.isPending || updateDebito.isPending}
              className={`w-full border-0 font-semibold ${
                tipoLancamento === "credito"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-gradient-primary text-primary-foreground"
              }`}
            >
              {editingDebito
                ? "Salvar Alterações"
                : tipoLancamento === "debito" ? "Registrar Débito" : "Registrar Crédito"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

// ─── sub-components ──────────────────────────────────────────────────────────
const SummaryCard = ({
  label, value, color, bg, icon, delay,
}: {
  label: string; value: string; color: string; bg: string; icon: React.ReactNode; delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-card rounded-xl border border-border p-3"
  >
    <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-1.5 ${color}`}>
      {icon}
    </div>
    <p className={`text-base font-display ${color}`}>{value}</p>
    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{label}</p>
  </motion.div>
);

const OrigemBadge = ({ origem, tipo }: { origem: Lancamento["origem"]; tipo: Lancamento["tipo"] }) => {
  const map = {
    mensalidade: { label: "Mensalidade", cls: "bg-blue-500/10 text-blue-500" },
    vaquinha: tipo === "credito" ? { label: "Crédito Manual", cls: "bg-emerald-500/10 text-emerald-600" } : { label: "Vaquinha", cls: "bg-purple-500/10 text-purple-500" },
    debito_manual: { label: "Débito Manual", cls: "bg-orange-500/10 text-orange-500" },
  };
  const { label, cls } = map[origem];
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${cls}`}>
      {label}
    </span>
  );
};

const StatusBadge = ({ status }: { status: Lancamento["status"] }) => (
  <span
    className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
      status === "realizado"
        ? "bg-emerald-500/10 text-emerald-600"
        : "bg-amber-500/10 text-amber-600"
    }`}
  >
    {status === "realizado" ? "Realizado" : "Previsto"}
  </span>
);

export default CaixaPage;
