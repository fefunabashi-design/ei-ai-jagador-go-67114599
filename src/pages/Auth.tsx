import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import logo from "@/assets/logo.png";

const SYNTHETIC_EMAIL_DOMAIN = "cpf.eaijogador.app";

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const looksLikeCpf = (s: string) => onlyDigits(s).length === 11 && !s.includes("@");
const isValidCpf = (raw: string) => {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
};
const formatCpf = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};
const cpfToSyntheticEmail = (cpf: string) => `${onlyDigits(cpf)}@${SYNTHETIC_EMAIL_DOMAIN}`;

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isStrongPassword = (p: string) =>
    p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p);
  const isValidEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

  useEffect(() => {
    const goIfActive = async (session: any) => {
      if (!session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        Object.keys(localStorage)
          .filter((key) => key.startsWith("sb-") || key.includes("supabase.auth.token"))
          .forEach((key) => localStorage.removeItem(key));
        return;
      }
      navigate("/dashboard", { replace: true });
    };
    supabase.auth.getSession().then(({ data: { session } }) => goIfActive(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void goIfActive(session);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = identifier.trim();
    const isCpf = looksLikeCpf(raw);
    let loginEmail = "";
    let cpfDigits = "";

    if (isCpf) {
      if (!isValidCpf(raw)) {
        toast({ title: "CPF inválido", description: "Confira os 11 dígitos do CPF.", variant: "destructive" });
        return;
      }
      cpfDigits = onlyDigits(raw);
    } else {
      const normalizedEmail = raw.toLowerCase();
      if (!isValidEmail(normalizedEmail)) {
        toast({ title: "E-mail inválido", description: "Informe um e-mail ou CPF válido.", variant: "destructive" });
        return;
      }
      loginEmail = normalizedEmail;
    }

    if (!isLogin) {
      if (!name.trim()) {
        toast({ title: "Dados incompletos", description: "Informe seu nome.", variant: "destructive" });
        return;
      }
      if (!isStrongPassword(password)) {
        toast({
          title: "Senha fraca",
          description: "Use no mínimo 8 caracteres, com 1 letra maiúscula e 1 número.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      const checkEmailStatus = async (e: string) => {
        const { data } = await supabase.functions.invoke("check-email-status", {
          body: { email: e },
        });
        return data as { exists?: boolean; deactivated?: boolean; cleaned?: boolean } | null;
      };

      if (isLogin) {
        // Se CPF, descobre o e-mail real cadastrado
        if (isCpf) {
          const { data: lookup, error: lkErr } = await supabase.functions.invoke("lookup-email-by-cpf", {
            body: { cpf: cpfDigits },
          });
          if (lkErr || !lookup?.email) {
            toast({ title: "CPF não encontrado", description: "Nenhuma conta com esse CPF.", variant: "destructive" });
            return;
          }
          loginEmail = lookup.email as string;
        }

        const status = await checkEmailStatus(loginEmail);
        if (status?.deactivated || status?.cleaned) {
          toast({
            title: "Conta desativada",
            description: "Este cadastro já foi utilizado. Crie uma nova conta com uma nova senha.",
            variant: "destructive",
          });
          setIsLogin(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw error;
        toast({ title: "Bem-vindo de volta! ⚽", description: "Login efetuado com sucesso." });
        navigate("/dashboard");
      } else {
        // Cadastro: se for e-mail real, valida MX/descartável
        let signupEmail = loginEmail;
        if (isCpf) {
          signupEmail = cpfToSyntheticEmail(cpfDigits);
        } else {
          const { data: v } = await supabase.functions.invoke("validate-email", {
            body: { email: loginEmail },
          });
          if (v && v.valid === false) {
            const reasons: Record<string, string> = {
              format: "Formato de e-mail inválido.",
              disposable: "E-mails descartáveis não são permitidos.",
              no_mx: "Este domínio de e-mail não recebe mensagens.",
            };
            toast({ title: "E-mail inválido", description: reasons[v.reason] || "Use um e-mail válido.", variant: "destructive" });
            return;
          }
        }

        await checkEmailStatus(signupEmail);
        const fullName = name.trim();
        const { error } = await supabase.auth.signUp({
          email: signupEmail,
          password,
          options: {
            data: {
              full_name: fullName,
              first_name: fullName,
              ...(cpfDigits ? { cpf: cpfDigits } : {}),
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Cadastro realizado! 🎉",
          description: isCpf
            ? "Conta criada. Você já pode entrar com seu CPF."
            : "Verifique seu e-mail para confirmar a conta.",
        });
      }
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : "Erro desconhecido";
      const friendlyMessages: Record<string, string> = {
        "User already registered": "Este e-mail já está cadastrado. Tente fazer login.",
        "Invalid login credentials": "E-mail ou senha incorretos.",
        "Email not confirmed": "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
        "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres.",
        "Signup requires a valid password": "Informe uma senha válida.",
        "Unable to validate email address: invalid format": "Formato de e-mail inválido.",
      };
      const message = friendlyMessages[rawMessage] || rawMessage;
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "Erro", description: String(error), variant: "destructive" });
    }
  };

  const handleAppleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "Erro", description: String(error), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        {/* Logo & Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-10"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
            <img src={logo} alt="E Ai Jogador" width={48} height={48} />
          </div>
          <h1 className="text-4xl text-foreground tracking-wider">E AÍ JOGADOR(A)</h1>
          <p className="text-sm text-muted-foreground mt-1">O app da pelada brasileira</p>
        </motion.div>

        {/* Tab toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex bg-card rounded-xl border border-border p-1 mb-8 w-full max-w-sm"
        >
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              isLogin
                ? "bg-gradient-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              !isLogin
                ? "bg-gradient-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Criar Conta
          </button>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-4"
        >
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                key="name-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Nome</Label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      className="pl-9 bg-card border-border"
                      required={!isLogin}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">E-mail ou CPF</Label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                inputMode="email"
                value={identifier}
                onChange={(e) => {
                  const v = e.target.value;
                  // Se o usuário começou a digitar só dígitos, aplica máscara de CPF
                  const digits = onlyDigits(v);
                  if (!v.includes("@") && digits.length > 0 && digits.length <= 11 && /^[\d.\-\s]*$/.test(v)) {
                    setIdentifier(formatCpf(v));
                  } else {
                    setIdentifier(v);
                  }
                }}
                placeholder="seu@email.com ou CPF"
                className="pl-9 bg-card border-border"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Senha</Label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 pr-10 bg-card border-border"
                required
                minLength={isLogin ? 6 : 8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>


          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setResetEmail(identifier.includes("@") ? identifier : ""); }}
                className="text-xs text-primary hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold h-12 text-sm"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              />
            ) : (
              <>
                {isLogin ? "Entrar" : "Criar Conta"}
                <ArrowRight size={16} className="ml-2" />
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou continue com</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              className="flex-1 border-border bg-card hover:bg-secondary"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 12 4.91c1.69 0 3.22.59 4.42 1.56l3.31-3.31A11.97 11.97 0 0 0 12 0 12 12 0 0 0 .64 6.95l4.63 2.81Z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.55 5.55 0 0 1-2.4 3.63l3.86 3A11.95 11.95 0 0 0 23.49 12.27Z" />
                <path fill="#FBBC05" d="M5.27 14.24A7.12 7.12 0 0 1 4.91 12c0-.79.13-1.54.36-2.24L.64 6.95A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.99-3.16Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3a7.18 7.18 0 0 1-4.07 1.16 7.1 7.1 0 0 1-6.73-4.99l-4.63 2.81A12 12 0 0 0 12 24Z" />
              </svg>
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleAppleLogin}
              className="flex-1 border-border bg-card hover:bg-secondary"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11Z" />
              </svg>
              Apple
            </Button>
          </div>
        </motion.form>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6"
            onClick={() => setShowForgotPassword(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl p-6 w-full max-w-sm border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-foreground mb-2">Recuperar Senha</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">E-mail</Label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-9 bg-background border-border"
                    />
                  </div>
                </div>
                <Button
                  className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold"
                  disabled={loading || !resetEmail}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) throw error;
                      toast({
                        title: "E-mail enviado! 📧",
                        description: "Verifique sua caixa de entrada para redefinir sua senha.",
                      });
                      setShowForgotPassword(false);
                    } catch (error: unknown) {
                      const message = error instanceof Error ? error.message : "Erro desconhecido";
                      toast({ title: "Erro", description: message, variant: "destructive" });
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Enviar link de recuperação
                </Button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="py-6 text-center"
      >
        <p className="text-[10px] text-muted-foreground">
          Desenvolvido por{" "}
          <span className="text-primary font-semibold">clickautomation</span>
        </p>
        <p className="text-[9px] text-muted-foreground/50 mt-1">v1.0.0</p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
