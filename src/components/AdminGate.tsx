import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Check, ShieldCheck, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const benefits = [
  "Cadastrar e gerenciar seu time",
  "Cadastrar jogadores e categorias",
  "Agendar partidas",
  "Fazer escalações",
  "Enviar convocações",
  "Controle de mensalidades e caixa",
  "Buscar adversários e desafios",
  "Suporte prioritário",
];

const Intro = ({ onContinue, onPlayerOnly }: { onContinue: () => void; onPlayerOnly: () => void }) => (
  <div className="min-h-screen bg-background pb-20">
    <div className="px-5 pt-12 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center"
      >
        <Info size={36} className="text-primary" />
      </motion.div>
      <h1 className="mt-4 text-2xl font-display text-foreground">Atenção</h1>
      <p className="mt-3 text-sm text-muted-foreground px-4 leading-relaxed">
        O menu <strong className="text-foreground">Admin</strong> é destinado a quem{" "}
        <strong className="text-foreground">administra um time</strong> (presidente, técnico ou organizador).
      </p>
      <p className="mt-2 text-sm text-muted-foreground px-4 leading-relaxed">
        Se você quer apenas <strong className="text-foreground">jogar</strong> e participar de partidas,
        não precisa entrar aqui.
      </p>
      <p className="mt-3 text-xs text-destructive px-4 leading-relaxed font-semibold">
        Menores de 18 anos não podem administrar times.
      </p>
    </div>

    <div className="px-5 mt-8 space-y-3">
      <Button onClick={onContinue} size="lg" className="w-full">
        Quero administrar um time
      </Button>
      <Button onClick={onPlayerOnly} variant="outline" size="lg" className="w-full">
        Sou apenas jogador
      </Button>
    </div>
    <BottomNav />
  </div>
);

const Welcome = ({
  onStart,
  onPlayerOnly,
  loading,
}: {
  onStart: () => void;
  onPlayerOnly: () => void;
  loading: boolean;
}) => (
  <div className="min-h-screen bg-background pb-20">
    <div className="px-5 pt-10 pb-6 text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 mx-auto rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
        <Crown size={36} className="text-primary-foreground" />
      </motion.div>
      <h1 className="mt-4 text-2xl font-display text-foreground">Admin PRO</h1>
      <p className="mt-1 text-sm text-muted-foreground px-4">
        Gerencie seu time como um profissional. Comece com <strong>30 dias grátis</strong>.
      </p>
    </div>

    <div className="px-5">
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Plano único</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl font-display text-foreground">R$ 29,90</span>
          <span className="text-sm text-muted-foreground">/mês</span>
        </div>
        <p className="mt-1 text-xs text-primary font-semibold">30 dias grátis · Sem cartão</p>
        <ul className="mt-4 space-y-2">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-foreground">
              <Check size={16} className="text-primary mt-0.5 shrink-0" /> {b}
            </li>
          ))}
        </ul>
        <Button onClick={onStart} disabled={loading} size="lg" className="w-full mt-5">
          {loading ? "Iniciando..." : "Começar 30 dias grátis"}
        </Button>
        <Button onClick={onPlayerOnly} variant="ghost" size="lg" className="w-full mt-2">
          Quero ficar somente como jogador
        </Button>
        <p className="text-[11px] text-muted-foreground text-center mt-3">
          Após o trial, mantenha o acesso pagando R$ 29,90/mês via Pix.
        </p>
      </div>
    </div>
    <BottomNav />
  </div>
);

const Expired = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle size={36} className="text-destructive" />
        </div>
        <h1 className="mt-4 text-2xl font-display text-foreground">Acesso expirado</h1>
        <p className="mt-2 text-sm text-muted-foreground px-6">
          Seu período de acesso ao Admin PRO terminou. Renove sua assinatura para continuar gerenciando seu time.
        </p>
        <div className="mt-6 px-5">
          <Button size="lg" className="w-full" onClick={() => navigate("/assinatura")}>
            Pagar mensalidade R$ 29,90
          </Button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export const AdminGate = ({ children }: { children: ReactNode }) => {
  const { loading, hasAccess, status, daysLeft, refresh } = useAdminAccess();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<"intro" | "plan">("intro");

  if (loading) return <div className="p-6"><Skeleton className="h-40 w-full rounded-xl" /></div>;

  const startTrial = async () => {
    const { data, error } = await supabase.functions.invoke("start-trial");
    const errMsg = (error as any)?.message || (data as any)?.error;
    if (errMsg) {
      toast({ title: "Trial indisponível", description: errMsg, variant: "destructive" });
      if ((data as any)?.code === "TRIAL_BLOCKED") navigate("/assinatura");
      return;
    }
    toast({ title: "Trial iniciado! 🎉", description: "Você tem 30 dias para explorar tudo." });
    await refresh();
  };

  const goPlayerOnly = () => navigate("/dashboard");

  if (status === "none") {
    if (step === "intro") return <Intro onContinue={() => setStep("plan")} onPlayerOnly={goPlayerOnly} />;
    return <Welcome onStart={startTrial} onPlayerOnly={goPlayerOnly} loading={false} />;
  }
  if (status === "expired" || !hasAccess) return <Expired />;

  return (
    <>
      {status === "trialing" && (() => {
        const urgent = daysLeft <= 3;
        const critical = daysLeft <= 1;
        const Icon = urgent ? AlertTriangle : ShieldCheck;
        const label = daysLeft === 0
          ? "Seu trial expira hoje"
          : `Trial: ${daysLeft === 1 ? "falta 1 dia" : `faltam ${daysLeft} dias`}`;
        return (
          <div className="px-5 pt-3">
            <div className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
              critical ? "bg-destructive/15 border-destructive/40 text-destructive animate-pulse"
                       : urgent ? "bg-destructive/10 border-destructive/30 text-destructive"
                                : "bg-primary/10 border-primary/30 text-primary"
            }`}>
              <span className="flex items-center gap-2 font-semibold">
                <Icon size={14} /> {label}
              </span>
              <button onClick={() => navigate("/assinatura")} className="underline font-semibold">
                {urgent ? "Renovar agora" : "Assinar agora"}
              </button>
            </div>
          </div>
        );
      })()}
      {children}
    </>
  );
};
