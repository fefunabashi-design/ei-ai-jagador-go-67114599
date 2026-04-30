import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useMyTeams, useMyTeam, useSetActiveTeam } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";

const MyTeamsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: myTeams = [] } = useMyTeams();
  const { data: activeTeam } = useMyTeam();
  const setActiveTeam = useSetActiveTeam();

  const handleSelect = (teamId: string, teamName: string) => {
    if (activeTeam?.id === teamId) return;
    setActiveTeam(teamId);
    toast({ title: `Time ativo: ${teamName}`, description: "As telas do app foram atualizadas." });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-4xl text-foreground font-display">MEUS TIMES</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Times em que você joga. Toque para ativar no app.
        </p>
      </div>

      <div className="px-5 space-y-2">
        {myTeams.length === 0 ? (
          <div className="bg-card rounded-xl border border-border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Você ainda não está incluído em nenhum time.
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">
              O cadastro de times e jogadores é feito pelo Admin do time.
            </p>
          </div>
        ) : (
          myTeams.map((team: any, i: number) => {
            const isActive = activeTeam?.id === team.id;
            return (
              <motion.button
                key={team.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleSelect(team.id, team.name)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-colors text-left ${
                  isActive
                    ? "bg-primary/10 border-primary/40"
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="w-12 h-12 rounded-xl object-cover border border-border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-lg shrink-0">
                    {team.abbreviation || team.name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {team.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {team.categoria || "Sem categoria"} · {team.region || "Sem região"}
                  </p>
                </div>
                {isActive ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                    <Check size={14} /> ATIVO
                  </span>
                ) : (
                  <ChevronRight size={16} className="text-muted-foreground" />
                )}
              </motion.button>
            );
          })
        )}

      </div>

      <BottomNav />
    </div>
  );
};

export default MyTeamsPage;
