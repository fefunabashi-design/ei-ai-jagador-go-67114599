import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, lazy, Suspense, createContext, useContext, Component, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStatsData } from "@/lib/stats";
import UserThemeLoader from "@/components/UserThemeLoader";

const CHUNK_RELOAD_KEY = "__chunk_reload_at__";
const CHUNK_RELOAD_THROTTLE_MS = 10_000;
const CHUNK_ERROR_PATTERN = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i;

const isChunkLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");
  return CHUNK_ERROR_PATTERN.test(message);
};

const reloadWithFreshAssets = () => {
  if (typeof window === "undefined") return false;
  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  if (Date.now() - last < CHUNK_RELOAD_THROTTLE_MS) return false;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  const url = new URL(window.location.href);
  url.searchParams.set("__fresh", String(Date.now()));
  window.location.replace(url.toString());
  return true;
};

const lazyWithChunkRetry = <T extends { default: ComponentType<any> }>(factory: () => Promise<T>) =>
  lazy(() =>
    factory().catch((error) => {
      if (isChunkLoadError(error) && reloadWithFreshAssets()) {
        return new Promise<never>(() => undefined);
      }
      throw error;
    })
  );

// Lazy-load all route pages so the initial bundle stays small and
// switching between menus doesn't pay for code that wasn't visited yet.
const Auth = lazyWithChunkRetry(() => import("./pages/Auth.tsx"));
const Index = lazyWithChunkRetry(() => import("./pages/Index.tsx"));
const Match = lazyWithChunkRetry(() => import("./pages/Match.tsx"));
const Agenda = lazyWithChunkRetry(() => import("./pages/Agenda.tsx"));
const Team = lazyWithChunkRetry(() => import("./pages/Team.tsx"));
const TeamManage = lazyWithChunkRetry(() => import("./pages/TeamManage.tsx"));
const Ranking = lazyWithChunkRetry(() => import("./pages/Ranking.tsx"));
const Profile = lazyWithChunkRetry(() => import("./pages/Profile.tsx"));
const Chat = lazyWithChunkRetry(() => import("./pages/Chat.tsx"));
const Payments = lazyWithChunkRetry(() => import("./pages/Payments.tsx"));
const Funds = lazyWithChunkRetry(() => import("./pages/Funds.tsx"));
const EventDetails = lazyWithChunkRetry(() => import("./pages/EventDetails.tsx"));
const CreateEvent = lazyWithChunkRetry(() => import("./pages/CreateEvent.tsx"));
const Mensalidades = lazyWithChunkRetry(() => import("./pages/Mensalidades.tsx"));
const Caixa = lazyWithChunkRetry(() => import("./pages/Caixa.tsx"));
const Escalacao = lazyWithChunkRetry(() => import("./pages/Escalacao.tsx"));
const Admin = lazyWithChunkRetry(() => import("./pages/Admin.tsx"));
const Desafios = lazyWithChunkRetry(() => import("./pages/Desafios.tsx"));
const BuscarAdversario = lazyWithChunkRetry(() => import("./pages/BuscarAdversario.tsx"));
const Times = lazyWithChunkRetry(() => import("./pages/Times.tsx"));
const Fotos = lazyWithChunkRetry(() => import("./pages/Fotos.tsx"));
const Notifications = lazyWithChunkRetry(() => import("./pages/Notifications.tsx"));
const OpponentDetails = lazyWithChunkRetry(() => import("./pages/OpponentDetails.tsx"));
const Resenha = lazyWithChunkRetry(() => import("./pages/Resenha.tsx"));
const Assinatura = lazyWithChunkRetry(() => import("./pages/Assinatura.tsx"));
const SuperAdminPagamentos = lazyWithChunkRetry(() => import("./pages/SuperAdminPagamentos.tsx"));
const MatchDetails = lazyWithChunkRetry(() => import("./pages/MatchDetails.tsx"));
const NotFound = lazyWithChunkRetry(() => import("./pages/NotFound.tsx"));
const ResetPassword = lazyWithChunkRetry(() => import("./pages/ResetPassword.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Bridge: traduz o evento global `supabase-data-change` (emitido por mutations
// no useSupabaseData) em invalidações pontuais nas queries do React Query,
// evitando que cada hook se reinscreva e refaça fetch redundante.
const INVALIDATE_KEYS = ["profile", "my-teams", "my-admin-teams", "matches", "players"];
const invalidateAll = () => {
  INVALIDATE_KEYS.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
};
if (typeof window !== "undefined") {
  window.addEventListener("supabase-data-change", invalidateAll);
  window.addEventListener("mock-db-change", invalidateAll);
}

const REQUIRED_PROFILE_FIELDS = ["display_name", "last_name", "phone", "birth_date", "city"];
const PROFILE_CHECK_TIMEOUT_MS = 4000;

const withTimeout = <T,>(promise: PromiseLike<T>, ms = PROFILE_CHECK_TIMEOUT_MS): Promise<T | null> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), ms)),
  ]);
};

const clearAuthStorage = () => {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("sb-") || key.includes("supabase.auth.token"))
    .forEach((key) => localStorage.removeItem(key));
  queryClient.clear();
};

type AuthStatus = "loading" | "anon" | "incomplete" | "deactivated" | "ok";
type AuthCtxValue = {
  status: AuthStatus;
  session: Session | null;
  sessionReady: boolean;
  stuck: boolean;
};
const AuthCtx = createContext<AuthCtxValue>({ status: "loading", session: null, sessionReady: false, stuck: false });
export const useAuthContext = () => useContext(AuthCtx);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [stuck, setStuck] = useState(false);
  const statusRef = useRef<AuthStatus>("loading");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    let alive = true;
    let requestId = 0;
    // Stuck timer só dispara enquanto a SESSÃO ainda não foi resolvida; a
    // verificação de profile roda em segundo plano e nunca trava a UI.
    let stuckTimer = window.setTimeout(() => { if (alive && session === undefined) setStuck(true); }, 8000);

    const checkProfile = async (s: Session | null) => {
      const id = ++requestId;
      if (!s) {
        if (alive) { setStatus("anon"); setStuck(false); window.clearTimeout(stuckTimer); }
        return;
      }
      const result = await withTimeout(
        supabase
          .from("profiles")
          .select("display_name,last_name,phone,birth_date,city,is_active")
          .eq("user_id", s.user.id)
          .maybeSingle()
      ).catch(() => null);
      if (!alive || id !== requestId) return;

      // Network/timeout failure: keep the user where they are instead of forcing
      // a redirect to /profile that would break navigation.
      if (!result) {
        setStatus((prev) => (prev === "loading" ? "ok" : prev));
        setStuck(false);
        window.clearTimeout(stuckTimer);
        return;
      }

      const p = result.data;
      if (p && (p as any).is_active === false) {
        await supabase.auth.signOut();
        if (alive) setStatus("deactivated");
        return;
      }
      const incomplete = !p || REQUIRED_PROFILE_FIELDS.some((f) => {
        const v = (p as any)?.[f];
        return v === null || v === undefined || String(v).trim() === "";
      });
      setStatus(incomplete ? "incomplete" : "ok");
      setStuck(false);
      window.clearTimeout(stuckTimer);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (_event === "SIGNED_OUT") clearAuthStorage();
      // TOKEN_REFRESHED não muda o usuário; evita refetch desnecessário do profile.
      if (_event === "TOKEN_REFRESHED") return;
      window.setTimeout(() => void checkProfile(s), 0);
    });
    withTimeout(supabase.auth.getSession()).then((result) => {
      const s = result?.data.session ?? null;
      if (!alive) return;
      setSession(s);
      void checkProfile(s);
    });
    const onDataChange = () => {
      // Only re-check the profile on data changes if we currently consider it
      // incomplete — avoids extra network calls on every mutation.
      if (statusRef.current !== "incomplete") return;
      withTimeout(supabase.auth.getSession()).then((result) => {
        const s = result?.data.session ?? null;
        void checkProfile(s);
      });
    };
    window.addEventListener("supabase-data-change", onDataChange);
    return () => {
      alive = false;
      window.clearTimeout(stuckTimer);
      subscription.unsubscribe();
      window.removeEventListener("supabase-data-change", onDataChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sessionReady = session !== undefined;
  return (
    <AuthCtx.Provider value={{ status, session: session ?? null, sessionReady, stuck }}>
      {children}
    </AuthCtx.Provider>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { status, sessionReady, session, stuck } = useContext(AuthCtx);
  const location = useLocation();

  // Enquanto não sabemos se há sessão, só mostramos fallback se a verificação
  // travar (>8s) — caso contrário, esperar a sessão é mais rápido que o
  // próprio redirect, então mantemos o spinner mínimo.
  if (!sessionReady) {
    if (stuck) return <AuthStuckScreen />;
    return <RouteFallback />;
  }

  // Sem sessão → login.
  if (!session || status === "anon" || status === "deactivated") {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Perfil ainda em verificação: renderiza a página imediatamente. As páginas
  // mostram skeletons enquanto seus próprios dados chegam. Se a verificação
  // concluir como "incomplete", o efeito abaixo redireciona para /profile.
  if (status === "incomplete" && location.pathname !== "/profile") {
    return <Navigate to="/profile" replace state={{ requireComplete: true }} />;
  }

  return <>{children}</>;
};

const AuthStuckScreen = () => {
  const handleRetry = () => window.location.reload();
  const handleSignOut = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    clearAuthStorage();
    window.location.href = "/auth";
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Não foi possível verificar sua sessão</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A verificação de autenticação demorou mais do que o esperado. Verifique sua conexão e tente novamente.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={handleRetry}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Tentar novamente
          </button>
          <button
            onClick={handleSignOut}
            className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition"
          >
            Ir para login
          </button>
        </div>
      </div>
    </div>
  );
};


const StatsLoader = () => {
  const { session } = useContext(AuthCtx);
  useStatsData(Boolean(session));
  return null;
};

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

class ChunkErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: isChunkLoadError(error) };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    if (isChunkLoadError(error)) reloadWithFreshAssets();
  }

  handleRetry = () => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    reloadWithFreshAssets();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Atualizando o app</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Uma parte do app mudou durante o carregamento. Toque abaixo para buscar a versão mais recente.
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-5 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <StatsLoader />
            <UserThemeLoader />
            <ChunkErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/match" element={<ProtectedRoute><Match /></ProtectedRoute>} />
                  <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
                  <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
                  <Route path="/team-manage" element={<ProtectedRoute><TeamManage /></ProtectedRoute>} />
                  <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/chat/:matchId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                  <Route path="/match/:matchId" element={<ProtectedRoute><MatchDetails /></ProtectedRoute>} />
                  <Route path="/payments/:matchId" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                  <Route path="/funds" element={<ProtectedRoute><Funds /></ProtectedRoute>} />
                  <Route path="/funds/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
                  <Route path="/funds/event/:eventId" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
                  <Route path="/mensalidades" element={<ProtectedRoute><Mensalidades /></ProtectedRoute>} />
                  <Route path="/caixa" element={<ProtectedRoute><Caixa /></ProtectedRoute>} />
                  <Route path="/escalacao" element={<ProtectedRoute><Escalacao /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                  <Route path="/desafios" element={<ProtectedRoute><Desafios /></ProtectedRoute>} />
                  <Route path="/buscar-adversario" element={<ProtectedRoute><BuscarAdversario /></ProtectedRoute>} />
                  <Route path="/times" element={<ProtectedRoute><Times /></ProtectedRoute>} />
                  <Route path="/fotos" element={<ProtectedRoute><Fotos /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/opponent-details" element={<ProtectedRoute><OpponentDetails /></ProtectedRoute>} />
                  <Route path="/resenha" element={<ProtectedRoute><Resenha /></ProtectedRoute>} />
                  <Route path="/assinatura" element={<ProtectedRoute><Assinatura /></ProtectedRoute>} />
                  <Route path="/super-admin/pagamentos" element={<ProtectedRoute><SuperAdminPagamentos /></ProtectedRoute>} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ChunkErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
