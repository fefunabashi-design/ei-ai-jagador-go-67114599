import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const BRAZILIAN_HOLIDAYS = {
  "2026-01-01": "Ano Novo",
  "2026-02-23": "Segunda de Carnaval",
  "2026-02-24": "Carnaval",
  "2026-04-03": "Sexta-feira Santa",
  "2026-04-05": "Páscoa",
  "2026-04-21": "Tiradentes",
  "2026-05-01": "Dia do Trabalho",
  "2026-09-07": "Independência",
  "2026-10-12": "Nossa Senhora Aparecida",
  "2026-11-02": "Finados",
  "2026-11-15": "Proclamação da República",
  "2026-11-20": "Dia da Consciência Negra",
  "2026-12-25": "Natal",
};

export const MonthlyCalendar = ({
  matches = [],
  availableDays = [2, 4, 6], // Segunda, Quarta, Sexta
  holidays = [],
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

  const getHolidayName = (date: Date): string | null => {
    const dateStr = date.toISOString().split("T")[0];
    return (BRAZILIAN_HOLIDAYS as Record<string, string>)[dateStr] || null;
  };

  const isHoliday = (date: Date) => {
    return getHolidayName(date) !== null;
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
        {/* Month/Year Navigation */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft size={16} />
          </Button>

          <div className="flex-1 flex gap-2">
            <Select
              value={String(currentDate.getMonth())}
              onValueChange={(month) => {
                setCurrentDate(
                  new Date(currentDate.getFullYear(), parseInt(month), 1)
                );
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {new Date(2026, i, 1).toLocaleDateString("pt-BR", {
                      month: "long",
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(currentDate.getFullYear())}
              onValueChange={(year) => {
                setCurrentDate(
                  new Date(parseInt(year), currentDate.getMonth(), 1)
                );
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-card border-border w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = 2024 + i;
                  return (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
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
            const holidayName = getHolidayName(date);

            return (
              <motion.button
                key={day}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onDateClick?.(date, dateMatches)}
                onHoverStart={() => onDateHover?.(date)}
                className={`
                  aspect-square border border-border/30 p-1.5 flex flex-col items-center justify-center
                  relative transition-all rounded-lg
                  ${colors.bg}
                  ${isToday ? "ring-2 ring-primary" : ""}
                  hover:border-border cursor-pointer text-center
                `}
                title={holidayName || undefined}
              >
                {/* Dot indicator for holiday/available */}
                {!dateMatches.length && (
                  <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                )}

                {/* Day number */}
                <span
                  className={`text-xs font-semibold ${colors.label} ${
                    isToday ? "text-primary font-bold" : ""
                  }`}
                >
                  {day}
                </span>

                {/* Match indicator or Holiday name */}
                {dateMatches.length > 0 ? (
                  <span className="text-[9px] font-bold text-green-600 dark:text-green-400 mt-0.5">
                    {dateMatches.length} jogo{dateMatches.length > 1 ? "s" : ""}
                  </span>
                ) : holidayName ? (
                  <span className="text-[8px] font-semibold text-red-600 dark:text-red-400 mt-0.5 leading-tight line-clamp-2">
                    {holidayName}
                  </span>
                ) : null}
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
