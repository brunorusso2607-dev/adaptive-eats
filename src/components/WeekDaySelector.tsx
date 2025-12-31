import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMonthWeeks, formatWeekRange, WeekInfo, DayInfo } from "@/hooks/useMonthWeeks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type WeekDaySelectorProps = {
  referenceDate?: Date;
  selectedWeek: number;
  selectedDay: number | null;
  onWeekChange: (week: number) => void;
  onDayChange: (day: number) => void;
  showDaySelector?: boolean;
  className?: string;
  /** Optional: filter out days before this date (e.g., plan start date) */
  minDate?: Date;
};

export default function WeekDaySelector({
  referenceDate = new Date(),
  selectedWeek,
  selectedDay,
  onWeekChange,
  onDayChange,
  showDaySelector = true,
  className,
  minDate
}: WeekDaySelectorProps) {
  const { weeks, monthName, year } = useMonthWeeks(referenceDate);

  // Helper to check if a day is before minDate
  const isDayBeforeMinDate = (day: DayInfo): boolean => {
    if (!minDate) return false;
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    return dayDate < min;
  };

  // Filter only weeks that have at least one available (non-past AND >= minDate) day
  const availableWeeks = useMemo(() => {
    return weeks.filter(week => {
      const daysInMonth = week.days.filter(d => d.isInMonth);
      return daysInMonth.some(d => (!d.isPast || d.isToday) && !isDayBeforeMinDate(d));
    });
  }, [weeks, minDate]);

  const currentWeekData = useMemo(() => {
    return weeks.find(w => w.weekNumber === selectedWeek);
  }, [weeks, selectedWeek]);

  const availableDaysCount = useMemo(() => {
    if (!currentWeekData) return 0;
    return currentWeekData.days.filter(d => 
      d.isInMonth && (!d.isPast || d.isToday) && !isDayBeforeMinDate(d)
    ).length;
  }, [currentWeekData, minDate]);

  return (
    <Card className={cn("glass-card", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Week Selector */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Semana
          </label>
          <Select
            value={String(selectedWeek)}
            onValueChange={(val) => onWeekChange(Number(val))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue>
                <div className="flex items-center justify-between w-full">
                  <span>Semana {selectedWeek}</span>
                  {currentWeekData && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({formatWeekRange(currentWeekData, referenceDate)})
                    </span>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {weeks.map((week) => {
                const daysInMonth = week.days.filter(d => d.isInMonth);
                const hasAvailableDays = daysInMonth.some(d => 
                  (!d.isPast || d.isToday) && !isDayBeforeMinDate(d)
                );
                const isDisabled = !hasAvailableDays;
                
                return (
                  <SelectItem 
                    key={week.weekNumber} 
                    value={String(week.weekNumber)}
                    disabled={isDisabled}
                    className={cn(isDisabled && "opacity-50")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Semana {week.weekNumber}</span>
                      <span className="text-xs text-muted-foreground">
                        ({formatWeekRange(week, referenceDate)})
                      </span>
                      {isDisabled && (
                        <Badge variant="outline" className="text-[10px] ml-1">Passou</Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Day Selector */}
        {showDaySelector && currentWeekData && (() => {
          // Filtrar dias: apenas os que são do mês, não passaram E são >= minDate
          const filteredDays = currentWeekData.days
            .map((day, originalIndex) => ({ day, originalIndex }))
            .filter(({ day }) => 
              day.isInMonth && (!day.isPast || day.isToday) && !isDayBeforeMinDate(day)
            );

          return (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Dia
                </label>
                <Badge variant="outline" className="text-[10px]">
                  {filteredDays.length} dias disponíveis
                </Badge>
              </div>
              <div className="flex gap-1 flex-wrap">
                {filteredDays.map(({ day, originalIndex }) => {
                  const isSelected = selectedDay === originalIndex;
                  
                  return (
                    <button
                      key={originalIndex}
                      onClick={() => onDayChange(originalIndex)}
                      className={cn(
                        "flex flex-col items-center py-2 px-3 rounded-lg transition-all text-center min-w-[48px]",
                        "hover:bg-muted cursor-pointer",
                        isSelected && "bg-primary text-primary-foreground",
                        day.isToday && !isSelected && "ring-2 ring-primary ring-offset-1"
                      )}
                    >
                      <span className="text-[10px] font-medium">{DAY_LABELS[originalIndex]}</span>
                      <span className="text-sm font-bold">
                        {day.dayOfMonth}
                      </span>
                      {day.isToday && (
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full mt-0.5",
                          isSelected ? "bg-primary-foreground" : "bg-primary"
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}

// Helper to get the count of available days from selected week until end of month
export function getAvailableDaysInPlan(
  weeks: WeekInfo[], 
  startWeek: number
): { totalDays: number; weekDays: { weekNumber: number; days: DayInfo[] }[] } {
  const result: { weekNumber: number; days: DayInfo[] }[] = [];
  let totalDays = 0;

  weeks.forEach(week => {
    if (week.weekNumber >= startWeek) {
      const availableDays = week.days.filter(d => d.isInMonth && (!d.isPast || d.isToday));
      if (availableDays.length > 0) {
        result.push({ weekNumber: week.weekNumber, days: availableDays });
        totalDays += availableDays.length;
      }
    }
  });

  return { totalDays, weekDays: result };
}
