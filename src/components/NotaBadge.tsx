import { Star } from "lucide-react";
import { formatNota } from "@/lib/stats";

interface NotaBadgeProps {
  nota: number;
  played?: number;
  className?: string;
  showStar?: boolean;
}

/**
 * Exibe a nota (0–10) calculada a partir de pontos obtidos / pontos possíveis.
 * Cor do texto reflete desempenho.
 */
const NotaBadge = ({ nota, played, className = "", showStar = true }: NotaBadgeProps) => {
  const hasGames = (played ?? 1) > 0;
  const tone =
    !hasGames ? "text-muted-foreground" :
    nota >= 7 ? "text-success" :
    nota >= 5 ? "text-warning" :
    "text-destructive";

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${tone} ${className}`}
      title={hasGames ? `Nota ${formatNota(nota)} em ${played} jogo(s)` : "Sem jogos finalizados"}
    >
      {showStar && <Star size={11} className="fill-current" />}
      {hasGames ? formatNota(nota) : "—"}
    </span>
  );
};

export default NotaBadge;
