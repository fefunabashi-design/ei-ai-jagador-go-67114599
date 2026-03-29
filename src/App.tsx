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
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, session }: { children: React.ReactNode; session: Session | null }) => {
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute session={session}><Index /></ProtectedRoute>} />
            <Route path="/match" element={<ProtectedRoute session={session}><Match /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute session={session}><Agenda /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute session={session}><Team /></ProtectedRoute>} />
            <Route path="/ranking" element={<ProtectedRoute session={session}><Ranking /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute session={session}><Profile /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
