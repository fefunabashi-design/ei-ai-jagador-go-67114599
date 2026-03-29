import { motion } from "framer-motion";
import { MapPin, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MatchCardProps {
  homeTeam: string;
  awayTeam?: string;
  location: string;
  time: string;
  format: string;
  compatibility?: number;
  status: "open" | "confirmed" | "completed";
  delay?: number;
}

const statusStyles = {
  open: "bg-warning/10 text-warning",
  confirmed: "bg-success/10 text-success",
  completed: "bg-muted text-muted-foreground",
};

const MatchCard = ({
  homeTeam,
  awayTeam,
  location,
  time,
  format,
  compatibility,
  status,
  delay = 0,
}: MatchCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusStyles[status]}`}>
          {status === "open" ? "Aberto" : status === "confirmed" ? "Confirmado" : "Finalizado"}
        </span>
        {compatibility && (
          <span className="text-xs font-bold text-primary">{compatibility}% match</span>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-center flex-1">
          <p className="font-display text-lg text-foreground">{homeTeam}</p>
        </div>
        <div className="px-3">
          <span className="text-xs font-bold text-muted-foreground">VS</span>
        </div>
        <div className="text-center flex-1">
          <p className="font-display text-lg text-foreground">
            {awayTeam || "???"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <MapPin size={12} /> {location}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} /> {time}
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} /> {format}
        </span>
      </div>

      {status === "open" && (
        <Button size="sm" className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold">
          {awayTeam ? "Aceitar Desafio" : "Desafiar"}
        </Button>
      )}
    </motion.div>
  );
};

export default MatchCard;
