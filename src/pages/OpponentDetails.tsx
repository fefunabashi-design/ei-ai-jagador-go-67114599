import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, MapPin, Phone, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import NotaBadge from "@/components/NotaBadge";
import { getTeamStats, getPlayerStats } from "@/lib/stats";
import { supabase } from "@/integrations/supabase/client";
import { useMyTeam, useMatchSummons } from "@/hooks/useSupabaseData";

const OpponentDetails = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const matchId = params.get("matchId") || "";

  const [match, setMatch] = useState<any>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [opponentPlayers, setOpponentPlayers] = useState<any[]>([]);
  const { data: myTeam } = useMyTeam();
  const { data: summons = [] } = useMatchSummons(matchId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!matchId) return;
      const { data: m } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .eq("id", matchId).maybeSingle();
      if (cancelled) return;
      setMatch(m);
      const home = (m as any)?.home_team;
      const away = (m as any)?.away_team;
      let opp = null;
      if (myTeam && home?.id === myTeam.id) opp = away;
      else if (myTeam && away?.id === myTeam.id) opp = home;
      else opp = away || home;
      // Fallback: fetch opponent fully if missing fields
      if (opp?.id) {
        const { data: full } = await supabase.from("teams").select("*").eq("id", opp.id).maybeSingle();
        if (full) opp = full;
        const { data: pls } = await supabase.from("players").select("*").eq("team_id", opp.id);
        if (!cancelled) setOpponentPlayers(pls || []);
      }
      if (!cancelled) setOpponent(opp);
    })();
    return () => { cancelled = true; };
  }, [matchId, myTeam?.id]);

  const opponentPlayerIds = new Set(opponentPlayers.map((p: any) => p.id));
  const confirmedOpponents = (summons as any[])
    .filter((s: any) => s.status === "confirmed" && opponentPlayerIds.has(s.player_id))
    .map((s: any) => opponentPlayers.find((p: any) => p.id === s.player_id))
    .filter(Boolean);



  const fullAddress = opponent?.field_address || "";

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <ArrowLeft size={14} /> Voltar
        </button>
        <h1 className="text-3xl text-foreground font-display">DETALHAR TIME</h1>
        {match && (
          <p className="text-xs text-muted-foreground mt-1">
            Adversário do jogo {new Date(match.match_date).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>

      <div className="px-5">
        {!opponent ? (
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Adversário ainda não definido para esta partida.</p>
          </div>
        ) : (
          <Tabs defaultValue="team" className="w-full">
            <TabsList className="w-full bg-secondary">
              <TabsTrigger value="team" className="flex-1 text-xs">Dados do Time</TabsTrigger>
              <TabsTrigger value="players" className="flex-1 text-xs">
                Confirmados ({confirmedOpponents.length})
              </TabsTrigger>
            </TabsList>

            {/* Team data */}
            <TabsContent value="team" className="mt-4">
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 mb-4">
                  {opponent.logo_url ? (
                    <img src={opponent.logo_url} alt="Escudo" className="w-14 h-14 rounded-2xl object-cover border border-border" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                      <Shield size={22} className="text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-display text-lg text-foreground flex items-center gap-2">
                      <span>{(opponent.name || "Adversário").toUpperCase()}</span>
                      {opponent.id && (() => { const s = getTeamStats(opponent.id); return <NotaBadge nota={s.nota} played={s.played} />; })()}
                    </p>
                    {opponent.categoria && (
                      <p className="text-[11px] text-muted-foreground">{opponent.categoria}{opponent.region ? ` · ${opponent.region}` : ""}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Nome do time</p>
                    <p className="text-foreground">{opponent.name || "—"}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
                      <MapPin size={11} /> Endereço do campo
                    </p>
                    <p className="text-foreground">{fullAddress || "Endereço não informado"}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
                      <Phone size={11} /> Telefone do campo
                    </p>
                    <p className="text-foreground">{opponent.phone || opponent.mobile || "Não informado"}</p>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* Confirmed players */}
            <TabsContent value="players" className="mt-4">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Jogadores confirmados ({confirmedOpponents.length})
                  </h3>
                </div>
                {confirmedOpponents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum jogador adversário confirmou presença ainda.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {confirmedOpponents.map((p: any) => {
                      const ps = opponent?.id ? getPlayerStats(p.id, opponent.id) : { nota: 0, played: 0 };
                      return (
                      <li
                        key={p.id}
                        className="text-sm text-foreground bg-success/5 border border-success/20 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{p.nickname?.trim() || p.name || "Jogador"}</span>
                        <NotaBadge nota={ps.nota} played={ps.played} />
                      </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default OpponentDetails;
