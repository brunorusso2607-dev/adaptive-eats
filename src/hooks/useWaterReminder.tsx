import { useEffect, useRef, useCallback, useState } from "react";
import { useToast } from "./use-toast";

interface WaterReminderProps {
  settings: {
    reminder_enabled: boolean;
    reminder_interval_minutes: number;
    reminder_start_hour: number;
    reminder_end_hour: number;
    daily_goal_ml: number;
  };
  totalToday: number;
  percentage: number;
  onAddWater?: (amount: number) => Promise<boolean>;
}

export function useWaterReminder({ settings, totalToday, percentage, onAddWater }: WaterReminderProps) {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // Check notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Notificações não suportadas",
        description: "Seu navegador não suporta notificações",
        variant: "destructive",
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        toast({
          title: "Notificações ativadas",
          description: "Você receberá lembretes para beber água",
        });
        return true;
      } else {
        toast({
          title: "Permissão negada",
          description: "Ative as notificações nas configurações do navegador",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [toast]);

  // Show notification (browser or service worker)
  const showNotification = useCallback(() => {
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

    const title = "💧 Hora de beber água!";
    const body = `Você bebeu ${(totalToday / 1000).toFixed(1)}L de ${(settings.daily_goal_ml / 1000).toFixed(1)}L hoje`;

    // Show in-app toast
    toast({
      title,
      description: body,
    });

    // Show browser notification if permission granted
    if (notificationPermission === "granted") {
      try {
        // Try using service worker registration for better mobile support
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
              body,
              icon: "/icons/icon-192x192.png",
              badge: "/icons/icon-72x72.png",
              tag: "water-reminder",
              requireInteraction: false,
            } as NotificationOptions);
          });
        } else {
          // Fallback to regular notification
          new Notification(title, {
            body,
            icon: "/icons/icon-192x192.png",
            tag: "water-reminder",
          });
        }
      } catch (error) {
        console.error("Error showing notification:", error);
      }
    }
  }, [settings, totalToday, percentage, notificationPermission, toast]);

  // Listen for messages from service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "ADD_WATER" && onAddWater) {
        onAddWater(event.data.amount);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [onAddWater]);

  // Handle URL action for add-water
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("action") === "add-water" && onAddWater) {
      onAddWater(250);
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [onAddWater]);

  // Set up reminder interval
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

    // Initial reminder after first interval
    intervalRef.current = setInterval(() => {
      showNotification();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [settings.reminder_enabled, settings.reminder_interval_minutes, showNotification]);

  return {
    notificationPermission,
    requestPermission,
    showNotification,
  };
}
