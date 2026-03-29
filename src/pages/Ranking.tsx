import { motion } from "framer-motion";
import { Trophy, Medal, Target, TrendingUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const rankingData = [
  { rank: 1, name: "Carlos Silva", team: "Os Crias FC", goals: 12, matches: 20, rating: 8.7 },
  { rank: 2, name: "Felipe Souza", team: "Os Crias FC", goals: 8, matches: 21, rating: 8.0 },
  { rank: 3, name: "Marcos Vinícius", team: "Real Várzea", goals: 7, matches: 18, rating: 7.6 },
  { rank: 4, name: "Bruno Santos", team: "Os Crias FC", goals: 5, matches: 22, rating: 8.2 },
  { rank: 5, name: "André Luiz", team: "Tropa do Bruxo", goals: 5, matches: 15, rating: 7.3 },
  { rank: 6, name: "Pedro Alves", team: "Os Crias FC", goals: 3, matches: 19, rating: 7.8 },
  { rank: 7, name: "Thiago Mendes", team: "Pé de Ouro FC", goals: 3, matches: 12, rating: 7.5 },
  { rank: 8, name: "Lucas Oliveira", team: "Os Crias FC", goals: 2, matches: 16, rating: 7.4 },
];

const medalColors: Record<number, string> = {
  1: "text-warning",
  2: "text-muted-foreground",
  3: "text-primary",
};

const RankingPage = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-4xl text-foreground">RANKING</h1>
        <p className="text-sm text-muted-foreground">Artilharia da região</p>
      </div>

      {/* Top 3 podium */}
      <div className="px-5 mb-6">
        <div className="flex items-end justify-center gap-3 h-48">
          {[rankingData[1], rankingData[0], rankingData[2]].map((player, i) => {
            const heights = ["h-28", "h-36", "h-24"];
            const positions = [2, 1, 3];
            return (
              <motion.div
                key={player.rank}
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

      {/* Full list */}
      <div className="px-5 space-y-2">
        {rankingData.map((player, i) => (
          <motion.div
            key={player.rank}
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
                <TrendingUp size={12} /> {player.rating}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default RankingPage;
