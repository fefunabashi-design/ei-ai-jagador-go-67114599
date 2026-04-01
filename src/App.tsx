import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import Auth from "./pages/Auth.tsx";
import Index from "./pages/Index.tsx";
import Match from "./pages/Match.tsx";
import Agenda from "./pages/Agenda.tsx";
import Team from "./pages/Team.tsx";
import Ranking from "./pages/Ranking.tsx";
import Profile from "./pages/Profile.tsx";
import Chat from "./pages/Chat.tsx";
import Payments from "./pages/Payments.tsx";
import Mensalidades from "./pages/Mensalidades.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, session }: { children: React.ReactNode; session: Session | null }) => {
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const isRecoveryUrl = () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    return (
      hashParams.get("type") === "recovery" ||
      searchParams.get("type") === "recovery" ||
      window.location.pathname === "/reset-password"
    );
  };

  useEffect(() => {
    setIsPasswordRecovery(isRecoveryUrl());

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);

      if (_event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }

      if (_event === "SIGNED_IN") {
        setIsPasswordRecovery(isRecoveryUrl());
        queryClient.clear();
      }

      if (_event === "SIGNED_OUT") {
        setIsPasswordRecovery(false);
        queryClient.clear();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsPasswordRecovery(isRecoveryUrl());
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const shouldGoToResetPassword = isPasswordRecovery || isRecoveryUrl();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={shouldGoToResetPassword ? <Navigate to="/reset-password" replace /> : session ? <Navigate to="/dashboard" replace /> : <Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute session={session}><Index /></ProtectedRoute>} />
            <Route path="/match" element={<ProtectedRoute session={session}><Match /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute session={session}><Agenda /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute session={session}><Team /></ProtectedRoute>} />
            <Route path="/ranking" element={<ProtectedRoute session={session}><Ranking /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute session={session}><Profile /></ProtectedRoute>} />
            <Route path="/chat/:matchId" element={<ProtectedRoute session={session}><Chat /></ProtectedRoute>} />
            <Route path="/payments/:matchId" element={<ProtectedRoute session={session}><Payments /></ProtectedRoute>} />
            <Route path="/mensalidades" element={<ProtectedRoute session={session}><Mensalidades /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute session={session}><Admin /></ProtectedRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
