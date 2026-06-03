import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, lazy, Suspense, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStatsData } from "@/lib/stats";
import UserThemeLoader from "@/components/UserThemeLoader";

// Lazy-load all route pages so the initial bundle stays small and
// switching between menus doesn't pay for code that wasn't visited yet.
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Index = lazy(() => import("./pages/Index.tsx"));
const Match = lazy(() => import("./pages/Match.tsx"));
const Agenda = lazy(() => import("./pages/Agenda.tsx"));
const Team = lazy(() => import("./pages/Team.tsx"));
const TeamManage = lazy(() => import("./pages/TeamManage.tsx"));
const Ranking = lazy(() => import("./pages/Ranking.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Chat = lazy(() => import("./pages/Chat.tsx"));
const Payments = lazy(() => import("./pages/Payments.tsx"));
const Funds = lazy(() => import("./pages/Funds.tsx"));
const EventDetails = lazy(() => import("./pages/EventDetails.tsx"));
const CreateEvent = lazy(() => import("./pages/CreateEvent.tsx"));
const Mensalidades = lazy(() => import("./pages/Mensalidades.tsx"));
const Caixa = lazy(() => import("./pages/Caixa.tsx"));
const Escalacao = lazy(() => import("./pages/Escalacao.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Desafios = lazy(() => import("./pages/Desafios.tsx"));
const BuscarAdversario = lazy(() => import("./pages/BuscarAdversario.tsx"));
const Times = lazy(() => import("./pages/Times.tsx"));
const Fotos = lazy(() => import("./pages/Fotos.tsx"));
const Notifications = lazy(() => import("./pages/Notifications.tsx"));
const OpponentDetails = lazy(() => import("./pages/OpponentDetails.tsx"));
const Resenha = lazy(() => import("./pages/Resenha.tsx"));
const Assinatura = lazy(() => import("./pages/Assinatura.tsx"));
const SuperAdminPagamentos = lazy(() => import("./pages/SuperAdminPagamentos.tsx"));
const MatchDetails = lazy(() => import("./pages/MatchDetails.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
type AuthCtxValue = { status: AuthStatus; session: Session | null; stuck: boolean };
const AuthCtx = createContext<AuthCtxValue>({ status: "loading", session: null, stuck: false });
export const useAuthContext = () => useContext(AuthCtx);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let alive = true;
    let requestId = 0;
    let stuckTimer = window.setTimeout(() => { if (alive) setStuck(true); }, 8000);

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
      if (status !== "incomplete") return;
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

  return (
    <AuthCtx.Provider value={{ status, session: session ?? null, stuck }}>
      {children}
    </AuthCtx.Provider>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { status, stuck } = useContext(AuthCtx);
  const location = useLocation();

  if (status === "loading") {
    if (stuck) return <AuthStuckScreen />;
    return <RouteFallback />;
  }
  if (status === "anon" || status === "deactivated") {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
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

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <StatsLoader />
            <UserThemeLoader />
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
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
