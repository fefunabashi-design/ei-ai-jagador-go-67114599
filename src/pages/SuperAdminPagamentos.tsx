import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import BottomNav from "@/components/BottomNav";

type Row = {
  id: string; user_id: string; amount: number; pix_txid: string | null;
  proof_url: string | null; status: string; submitted_at: string;
};

const SuperAdminPagamentos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, loading } = useAdminAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [emails, setEmails] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase
      .from("admin_subscriptions")
      .select("id, user_id, amount, pix_txid, proof_url, status, submitted_at")
      .order("submitted_at", { ascending: false })
      .limit(200);
    setRows((data || []) as Row[]);
  };

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  const openProof = async (path: string | null) => {
    if (!path) return;
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const review = async (id: string, action: "approve" | "reject") => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("review-pix-payment", { body: { payment_id: id, action } });
      if (error) throw error;
      toast({ title: action === "approve" ? "Pagamento aprovado ✅" : "Pagamento rejeitado" });
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  if (loading) return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;
  if (!isSuperAdmin) {
    return <div className="p-10 text-center text-muted-foreground">Acesso restrito.</div>;
  }

  const pending = rows.filter(r => r.status === "pending");
  const others = rows.filter(r => r.status !== "pending");

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft size={20} className="text-muted-foreground" /></button>
        <h1 className="text-2xl font-display text-foreground">PAGAMENTOS PIX 🛡️</h1>
      </div>

      <div className="px-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Pendentes ({pending.length})</p>
          {pending.length === 0 && <p className="text-sm text-muted-foreground">Nada pendente.</p>}
          <div className="space-y-2">
            {pending.map(r => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">R$ {Number(r.amount).toFixed(2).replace(".", ",")}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(r.submitted_at).toLocaleString("pt-BR")}</p>
                    <p className="text-[11px] text-muted-foreground break-all">user: {r.user_id}</p>
                    {r.pix_txid && <p className="text-[11px] text-muted-foreground">E2E: {r.pix_txid}</p>}
                  </div>
                  {r.proof_url && (
                    <Button size="sm" variant="outline" onClick={() => openProof(r.proof_url)}>
                      <ExternalLink size={12} /> Comprovante
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" disabled={busy} onClick={() => review(r.id, "approve")}>
                    <Check size={14} /> Aprovar
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" disabled={busy} onClick={() => review(r.id, "reject")}>
                    <X size={14} /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Histórico</p>
          <div className="space-y-1">
            {others.map(r => (
              <div key={r.id} className="bg-card border border-border rounded-lg p-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{new Date(r.submitted_at).toLocaleDateString("pt-BR")} · R$ {Number(r.amount).toFixed(2).replace(".", ",")}</span>
                <Badge className={r.status === "approved"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : "bg-destructive/10 text-destructive border-destructive/30"}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default SuperAdminPagamentos;
