import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  eachDayOfInterval,
  isBefore,
  isAfter,
  isSameDay,
  getWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export type WeekInfo = {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: DayInfo[];
  isPast: boolean;
};

export type DayInfo = {
  date: Date;
  dayOfMonth: number;
  dayOfWeek: number; // 0 = Monday, 6 = Sunday
  isInMonth: boolean;
  isPast: boolean;
  isToday: boolean;
};

export function useMonthWeeks(referenceDate: Date = new Date()) {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = startOfMonth(referenceDate);
    const monthEnd = endOfMonth(referenceDate);

    // Get all weeks that include days from this month
    // Week starts on Monday (weekStartsOn: 1)
    const weeksInMonth = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }
    );

    const weeks: WeekInfo[] = weeksInMonth.map((weekStart, index) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      
      // Get all days in this week
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

      const days: DayInfo[] = daysInWeek.map((day, dayIndex) => {
        const dayDate = new Date(day);
        dayDate.setHours(0, 0, 0, 0);

        return {
          date: day,
          dayOfMonth: day.getDate(),
          dayOfWeek: dayIndex, // 0 = Monday, 6 = Sunday
          isInMonth: day.getMonth() === referenceDate.getMonth(),
          isPast: isBefore(dayDate, today),
          isToday: isSameDay(dayDate, today),
        };
      });

      // Filter to only include days that are in the current month
      const daysInCurrentMonth = days.filter(d => d.isInMonth);
      
      // Week is past if all its days in the month are past
      const isWeekPast = daysInCurrentMonth.every(d => d.isPast);

      return {
        weekNumber: index + 1,
        startDate: weekStart,
        endDate: weekEnd,
        days,
        isPast: isWeekPast,
      };
    });

    // Find current week (first non-past week)
    const currentWeekIndex = weeks.findIndex(w => !w.isPast);
    const currentWeek = currentWeekIndex >= 0 ? currentWeekIndex + 1 : weeks.length;

    // Find today's position
    let todayWeek = 1;
    let todayDayIndex = 0;
    for (const week of weeks) {
      const todayInWeek = week.days.find(d => d.isToday);
      if (todayInWeek) {
        todayWeek = week.weekNumber;
        todayDayIndex = todayInWeek.dayOfWeek;
        break;
      }
    }

    return {
      weeks,
      totalWeeks: weeks.length,
      currentWeek,
      todayWeek,
      todayDayIndex,
      // Usar a referenceDate para nome do mês (mês real do plano, não o próximo mês)
      monthName: referenceDate.toLocaleDateString("pt-BR", { month: "long" }),
      year: referenceDate.getFullYear(),
    };
  }, [referenceDate]);
}

// Helper function to get week date range formatted
export function formatWeekRange(week: WeekInfo, monthDate: Date): string {
  const monthNum = monthDate.getMonth();
  
  // Get first day of month in this week
  const firstDayInMonth = week.days.find(d => d.isInMonth);
  // Get last day of month in this week
  const lastDayInMonth = [...week.days].reverse().find(d => d.isInMonth);

  if (!firstDayInMonth || !lastDayInMonth) return "";

  const startDay = firstDayInMonth.dayOfMonth;
  const endDay = lastDayInMonth.dayOfMonth;

  return `${String(startDay).padStart(2, "0")}/${String(monthNum + 1).padStart(2, "0")} - ${String(endDay).padStart(2, "0")}/${String(monthNum + 1).padStart(2, "0")}`;
}
