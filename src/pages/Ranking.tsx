import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Medal, Target, Star } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useMyTeam, usePlayers, useMatches } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { getPlayerStats, formatNota } from "@/lib/stats";

const medalColors: Record<number, string> = {
  1: "text-warning",
  2: "text-muted-foreground",
  3: "text-primary",
};

type Row = {
  rank: number;
  playerId: string;
  name: string;
  team: string;
  goals: number;
  matches: number;
  rating: number;
};

const RankingPage = () => {
  const { data: myTeam } = useMyTeam();
  const { data: players = [] } = usePlayers(myTeam?.id);
  const { data: matches = [] } = useMatches();
  const [goalsByPlayer, setGoalsByPlayer] = useState<Record<string, number>>({});

  const myMatchIds = (matches || [])
    .filter((m: any) => myTeam && (m.home_team_id === myTeam.id || m.away_team_id === myTeam.id))
    .map((m: any) => m.id);

  useEffect(() => {
    if (!myMatchIds.length) { setGoalsByPlayer({}); return; }
    let alive = true;
    (async () => {
      const { data: evs = [] } = await supabase
        .from("match_events")
        .select("player_id, type")
        .in("match_id", myMatchIds)
        .eq("type", "goal");
      const tally: Record<string, number> = {};
      (evs || []).forEach((e: any) => {
        if (!e.player_id) return;
        tally[e.player_id] = (tally[e.player_id] || 0) + 1;
      });
      if (alive) setGoalsByPlayer(tally);
    })();
    return () => { alive = false; };
  }, [myMatchIds.join(",")]);

  const rows: Row[] = (players || [])
    .map((p: any) => {
      const stats = myTeam ? getPlayerStats(p.id, myTeam.id) : { played: 0, nota: 0 };
      return {
        playerId: p.id,
        name: p.nickname?.trim() || p.name || "Jogador",
        team: myTeam?.name || "",
        goals: goalsByPlayer[p.id] || 0,
        matches: stats.played,
        rating: stats.nota,
      };
    })
    .filter((r) => r.goals > 0 || r.matches > 0)
    .sort((a, b) => b.goals - a.goals || b.rating - a.rating)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const podium = rows.slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-4xl text-foreground">RANKING</h1>
        <p className="text-sm text-muted-foreground">
          Artilharia {myTeam?.name ? `· ${myTeam.name}` : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 mt-10 text-center text-sm text-muted-foreground">
          Nenhum gol registrado ainda. Finalize uma partida para começar o ranking.
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {podium.length >= 1 && (
            <div className="px-5 mb-6">
              <div className="flex items-end justify-center gap-3 h-48">
                {[podium[1], podium[0], podium[2]].filter(Boolean).map((player, i, arr) => {
                  const heights = ["h-28", "h-36", "h-24"];
                  const positions = arr.length === 3 ? [2, 1, 3] : arr.length === 2 ? [2, 1] : [1];
                  return (
                    <motion.div
                      key={player.playerId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex flex-col items-center flex-1"
                    >
                      <Medal size={20} className={medalColors[positions[i]] || "text-muted-foreground"} />
                      <p className="text-xs font-semibold text-foreground mt-1 truncate max-w-full text-center">
                        {player.name.split(" ")[0]}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{player.goals} gols</p>
                      <div
                        className={`${heights[i]} w-full mt-2 rounded-t-xl bg-gradient-to-t from-card to-secondary border border-border border-b-0 flex items-center justify-center`}
                      >
                        <span className="font-display text-3xl text-foreground">{positions[i]}º</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full list */}
          <div className="px-5 space-y-2">
            {rows.map((player, i) => (
              <motion.div
                key={player.playerId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.03 }}
                className="bg-card rounded-xl border border-border p-3 flex items-center gap-3"
              >
                <span
                  className={`font-display text-xl w-8 text-center ${
                    player.rank <= 3 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {player.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{player.name}</p>
                  <p className="text-[10px] text-muted-foreground">{player.team}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Target size={12} className="text-primary" /> {player.goals}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star size={12} className="text-warning" /> {player.matches > 0 ? formatNota(player.rating) : "—"}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default RankingPage;
