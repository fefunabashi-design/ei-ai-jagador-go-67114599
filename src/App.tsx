import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Match from "./pages/Match.tsx";
import Agenda from "./pages/Agenda.tsx";
import Team from "./pages/Team.tsx";
import Ranking from "./pages/Ranking.tsx";
import Profile from "./pages/Profile.tsx";
import Chat from "./pages/Chat.tsx";
import Payments from "./pages/Payments.tsx";
import Funds from "./pages/Funds.tsx";
import EventDetails from "./pages/EventDetails.tsx";
import CreateEvent from "./pages/CreateEvent.tsx";
import Mensalidades from "./pages/Mensalidades.tsx";
import Caixa from "./pages/Caixa.tsx";
import Escalacao from "./pages/Escalacao.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/match" element={<ProtectedRoute><Match /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
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
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
