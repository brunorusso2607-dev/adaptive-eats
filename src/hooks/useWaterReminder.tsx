import { useEffect, useRef, useCallback } from "react";
import { useWaterConsumption } from "./useWaterConsumption";
import { useToast } from "./use-toast";

export function useWaterReminder() {
  const { settings, totalToday, percentage } = useWaterConsumption();
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastReminderRef = useRef<Date | null>(null);

  const showReminder = useCallback(() => {
    const now = new Date();
    const currentHour = now.getHours();

    // Check if within active hours
    if (
      currentHour < settings.reminder_start_hour ||
      currentHour >= settings.reminder_end_hour
    ) {
      return;
    }

    // Check if goal already reached
    if (percentage >= 100) {
      return;
    }

    // Show in-app toast
    toast({
      title: "💧 Hora de beber água!",
      description: `Você bebeu ${(totalToday / 1000).toFixed(1)}L de ${(settings.daily_goal_ml / 1000).toFixed(1)}L hoje`,
    });

    // Show browser notification if permission granted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("💧 Hora de beber água!", {
        body: `Você bebeu ${(totalToday / 1000).toFixed(1)}L de ${(settings.daily_goal_ml / 1000).toFixed(1)}L hoje`,
        icon: "/icons/icon-192x192.png",
        tag: "water-reminder",
        requireInteraction: false,
      });
    }

    lastReminderRef.current = now;
  }, [settings, totalToday, percentage, toast]);

  useEffect(() => {
    if (!settings.reminder_enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Set up interval for reminders
    const intervalMs = settings.reminder_interval_minutes * 60 * 1000;
    
    intervalRef.current = setInterval(() => {
      showReminder();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [settings.reminder_enabled, settings.reminder_interval_minutes, showReminder]);

  return null;
}
