import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Upload, Check, Clock, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

type PixInfo = { amount: number; recipient_name: string; pix_key: string; brcode: string };
type Subscription = {
  id: string; amount: number; status: string; submitted_at: string;
  reviewed_at: string | null; period_end: string | null; notes: string | null;
};

const Assinatura = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pix, setPix] = useState<PixInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [txid, setTxid] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [history, setHistory] = useState<Subscription[]>([]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: pixData }, { data: { user } }] = await Promise.all([
      supabase.functions.invoke("get-pix-info"),
      supabase.auth.getUser(),
    ]);
    if (pixData && !pixData.error) setPix(pixData);
    if (user) {
      const { data } = await supabase
        .from("admin_subscriptions")
        .select("id, amount, status, submitted_at, reviewed_at, period_end, notes")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false });
      setHistory(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const copyCode = () => {
    if (!pix) return;
    navigator.clipboard.writeText(pix.brcode);
    toast({ title: "Código Pix copiado!" });
  };

  const submit = async () => {
    if (!txid.trim() && !proofFile) {
      toast({ title: "Anexe o comprovante ou informe o ID Pix", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      let proof_url: string | null = null;
      if (proofFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Não autenticado");
        const ext = proofFile.name.split(".").pop() || "bin";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, proofFile);
        if (upErr) throw upErr;
        proof_url = path;
      }
      const { error } = await supabase.functions.invoke("submit-pix-payment", {
        body: { pix_txid: txid.trim() || null, proof_url },
      });
      if (error) throw error;
      toast({ title: "Comprovante enviado! ✅", description: "Aguardando aprovação do administrador." });
      setTxid(""); setProofFile(null);
      await loadAll();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30"><Check size={10} className="mr-1" />Aprovado</Badge>;
    if (s === "rejected") return <Badge className="bg-destructive/10 text-destructive border-destructive/30"><X size={10} className="mr-1" />Rejeitado</Badge>;
    return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30"><Clock size={10} className="mr-1" />Em análise</Badge>;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft size={20} className="text-muted-foreground" /></button>
        <h1 className="text-2xl font-display text-foreground">ASSINATURA 💳</h1>
      </div>

      <div className="px-5 space-y-4">
        {loading || !pix ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : (
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Mensalidade Admin PRO</p>
            <p className="text-3xl font-display text-foreground mt-1">R$ {pix.amount.toFixed(2).replace(".", ",")}</p>
            <p className="text-xs text-muted-foreground mt-1">Recebedor: {pix.recipient_name}</p>

            <div className="bg-white p-4 rounded-xl mt-4 mx-auto w-fit">
              <QRCodeSVG value={pix.brcode} size={180} />
            </div>

            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={copyCode}>
              <Copy size={14} /> Copiar código Pix
            </Button>

            <p className="text-[11px] text-muted-foreground mt-3 text-left">
              1. Abra o app do seu banco e pague via Pix com o QR Code ou código copia-e-cola.<br/>
              2. Anexe o comprovante e/ou informe o ID da transação (E2E).<br/>
              3. Em breve seu acesso será liberado por mais 30 dias.
            </p>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Enviar comprovante</p>
          <Input placeholder="ID da transação Pix (E2E) — opcional"
            value={txid} onChange={(e) => setTxid(e.target.value)} />
          <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-lg py-3 cursor-pointer hover:bg-accent text-sm text-muted-foreground">
            <Upload size={16} />
            {proofFile ? proofFile.name : "Anexar comprovante (imagem/PDF)"}
            <input type="file" accept="image/*,application/pdf" className="hidden"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
          </label>
          <Button className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar para análise"}
          </Button>
        </div>

        {history.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Meus pagamentos</p>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="text-foreground font-medium">R$ {Number(h.amount).toFixed(2).replace(".", ",")}</p>
                    <p className="text-muted-foreground">{new Date(h.submitted_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  {statusBadge(h.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Assinatura;
