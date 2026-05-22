import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStatsData } from "@/lib/stats";

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

const clearAuthStorage = () => {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("sb-") || key.includes("supabase.auth.token"))
    .forEach((key) => localStorage.removeItem(key));
  queryClient.clear();
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profileCheck, setProfileCheck] = useState<"loading" | "ok" | "incomplete" | "deactivated">("loading");
  const location = useLocation();

  useEffect(() => {
    const checkProfile = async (s: Session | null) => {
      if (!s) { setProfileCheck("ok"); return; }
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name,last_name,phone,birth_date,city,is_active")
        .eq("user_id", s.user.id)
        .maybeSingle();
      if (p && (p as any).is_active === false) {
        await supabase.auth.signOut();
        setProfileCheck("deactivated");
        return;
      }
      const incomplete = !p || REQUIRED_PROFILE_FIELDS.some((f) => {
        const v = (p as any)?.[f];
        return v === null || v === undefined || String(v).trim() === "";
      });
      setProfileCheck(incomplete ? "incomplete" : "ok");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (_event === "SIGNED_OUT") {
        clearAuthStorage();
      }
      checkProfile(s);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      checkProfile(s);
    });
    const onDataChange = () => {
      supabase.auth.getSession().then(({ data: { session: s } }) => checkProfile(s));
    };
    window.addEventListener("supabase-data-change", onDataChange);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("supabase-data-change", onDataChange);
    };
  }, []);

  if (session === undefined || profileCheck === "loading") return null;
  if (!session) return <Navigate to="/auth" replace state={{ from: location }} />;
  if (profileCheck === "incomplete" && location.pathname !== "/profile") {
    return <Navigate to="/profile" replace state={{ requireComplete: true }} />;
  }
  return <>{children}</>;
};

const StatsLoader = () => {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (alive) setHasSession(Boolean(session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useStatsData(hasSession);
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
        <Sonner />
        <StatsLoader />
        <BrowserRouter>
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
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
