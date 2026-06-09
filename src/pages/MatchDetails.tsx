import { useMemo } from "react";
import { getFieldDisplayName } from "@/lib/matchView";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle, Shield, MapPin, Clock } from "lucide-react";
import BottomNav from "@/components/BottomNav";

import { useMatches, useMyTeam } from "@/hooks/useSupabaseData";

const MatchDetails = () => {
  const { matchId = "" } = useParams();
  const navigate = useNavigate();
  const { data: matches = [] } = useMatches();
  const { data: myTeam } = useMyTeam();

  const match = useMemo(() => matches.find((m: any) => m.id === matchId), [matches, matchId]);

  if (!match) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Partida não encontrada.</p>
        <BottomNav />
      </div>
    );
  }

  const homeTeam = (match as any).home_team;
  const awayTeam = (match as any).away_team;
  const matchDate = new Date(match.match_date);
  const myIsHome = myTeam && homeTeam?.id === myTeam.id;
  const opponentTeam = myIsHome ? awayTeam : homeTeam;

  const actions = [
    {
      icon: MessageCircle,
      label: "Chat da partida",
      description: "Conversar com o grupo",
      onClick: () => navigate(`/chat/${match.id}`),
      disabled: false,
    },
    {
      icon: Shield,
      label: "Detalhar adversário",
      description: opponentTeam?.name ? `Saiba mais sobre ${opponentTeam.name}` : "Informações do adversário",
      onClick: () => navigate(`/opponent-details?matchId=${match.id}`),
      disabled: !opponentTeam,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-secondary">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-display text-foreground">DETALHES DA PARTIDA</h1>
          <p className="text-xs text-muted-foreground">Tudo o que você precisa em um só lugar</p>
        </div>
      </div>

      <div className="px-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-center flex-1">
              <p className="font-display text-lg text-foreground">{homeTeam?.name?.toUpperCase() || "???"}</p>
            </div>
            <span className="text-xs font-bold text-muted-foreground px-3">VS</span>
            <div className="text-center flex-1">
              <p className="font-display text-lg text-foreground">{awayTeam?.name?.toUpperCase() || "???"}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock size={12} /> {matchDate.toLocaleDateString("pt-BR")} {matchDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            {match.location && <span className="flex items-center gap-1"><MapPin size={12} /> {getFieldDisplayName(match)}</span>}
          </div>
        </div>

        <div className="space-y-2">
          {actions.map((a, i) => (
            <motion.button
              key={a.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={a.onClick}
              disabled={a.disabled}
              className="w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-card border-border hover:border-primary/40"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/15 text-primary">
                <a.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{a.label}</p>
                <p className="text-xs text-muted-foreground truncate">{a.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default MatchDetails;
