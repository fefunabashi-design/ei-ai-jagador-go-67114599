import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface CalendarMatch {
  id: string;
  date: Date;
  title: string;
  status: "open" | "confirmed" | "completed" | "cancelled";
}

interface MonthlyCalendarProps {
  matches: CalendarMatch[];
  availableDays?: number[]; // Days of week (0-6) when team can play
  holidays?: Date[];
  onDateClick?: (date: Date, matches: CalendarMatch[]) => void;
  onDateHover?: (date: Date) => void;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const BRAZILIAN_HOLIDAYS_2026 = [
  new Date(2026, 0, 1), // Ano Novo
  new Date(2026, 1, 13), // Sexta-feira Santa (aproximado)
  new Date(2026, 1, 17), // Carnaval (aproximado)
  new Date(2026, 3, 21), // Tiradentes
  new Date(2026, 4, 1), // Dia do Trabalho
  new Date(2026, 8, 7), // Independência
  new Date(2026, 9, 12), // Nossa Senhora Aparecida
  new Date(2026, 10, 2), // Finados
  new Date(2026, 10, 15), // Proclamação da República
  new Date(2026, 10, 20), // Dia da Consciência Negra
  new Date(2026, 11, 25), // Natal
];

export const MonthlyCalendar = ({
  matches = [],
  availableDays = [2, 4, 6], // Segunda, Quarta, Sexta
  holidays = BRAZILIAN_HOLIDAYS_2026,
  onDateClick,
  onDateHover,
}: MonthlyCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthLabel = currentDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startingDayOfWeek }, () => null);
  const calendarDays = [...emptyDays, ...monthDays];

  const isHoliday = (date: Date) => {
    return holidays.some(
      (h) =>
        h.getDate() === date.getDate() &&
        h.getMonth() === date.getMonth() &&
        h.getFullYear() === date.getFullYear()
    );
  };

  const isDayAvailable = (date: Date) => {
    return availableDays.includes(date.getDay());
  };

  const getDateMatches = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return matches.filter(
      (m) =>
        m.date.getDate() === date.getDate() &&
        m.date.getMonth() === date.getMonth() &&
        m.date.getFullYear() === date.getFullYear()
    );
  };

  const getDateColor = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateMatches = getDateMatches(day);

    // Verde: tem jogo agendado
    if (dateMatches.length > 0) {
      return {
        bg: "bg-green-500/20 border-green-500/50",
        dot: "bg-green-500",
        label: "text-green-700 dark:text-green-400",
      };
    }

    // Se é feriado
    if (isHoliday(date)) {
      return {
        bg: "bg-red-200/20 border-red-300/50",
        dot: "bg-red-300",
        label: "text-red-600 dark:text-red-400",
      };
    }

    // Amarelo: data disponível (segue dias da semana)
    if (isDayAvailable(date)) {
      return {
        bg: "bg-amber-400/20 border-amber-500/50",
        dot: "bg-amber-400",
        label: "text-amber-700 dark:text-amber-400",
      };
    }

    // Cinza: data não disponível
    return {
      bg: "bg-transparent border-transparent",
      dot: "bg-muted-foreground/30",
      label: "text-foreground/60",
    };
  };

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft size={16} />
          </Button>

          <div className="text-center flex-1">
            <h2 className="text-2xl font-display font-bold text-foreground capitalize">
              {monthLabel}
            </h2>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToToday}
          className="w-full text-xs"
        >
          Hoje
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-0 bg-secondary/50 border-b border-border">
          {WEEKDAY_LABELS.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-0">
          {calendarDays.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={`empty-${index}`}
                  className="aspect-square bg-secondary/30 border border-border/30"
                />
              );
            }

            const colors = getDateColor(day);
            const dateMatches = getDateMatches(day);
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isToday =
              new Date().toDateString() === date.toDateString();

            return (
              <motion.button
                key={day}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onDateClick?.(date, dateMatches)}
                onHoverStart={() => onDateHover?.(date)}
                className={`
                  aspect-square border border-border/30 p-2 flex flex-col items-center justify-center
                  relative transition-all rounded-lg
                  ${colors.bg}
                  ${isToday ? "ring-2 ring-primary" : ""}
                  hover:border-border cursor-pointer
                `}
              >
                {/* Dot indicator for holiday/available */}
                {!dateMatches.length && (
                  <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                )}

                {/* Day number */}
                <span
                  className={`text-sm font-semibold ${colors.label} ${
                    isToday ? "text-primary font-bold" : ""
                  }`}
                >
                  {day}
                </span>

                {/* Match indicator */}
                {dateMatches.length > 0 && (
                  <span className="text-[10px] font-bold text-green-600 dark:text-green-400 mt-0.5">
                    {dateMatches.length} jogo{dateMatches.length > 1 ? "s" : ""}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Legenda
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-foreground">Jogo agendado</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-sm text-foreground">Data disponível</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-300" />
            <span className="text-sm text-foreground">Feriado</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyCalendar;
