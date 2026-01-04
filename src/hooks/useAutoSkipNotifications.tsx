import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AutoSkipNotification {
  id: string;
  meal_plan_item_id: string;
  skipped_at: string;
}

export function useAutoSkipNotifications() {
  const [pendingNotifications, setPendingNotifications] = useState<AutoSkipNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPendingNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      // Fetch unnotified auto-skip records
      const { data, error } = await (supabase.from("auto_skip_notifications") as any)
        .select("id, meal_plan_item_id, skipped_at")
        .eq("user_id", session.user.id)
        .is("notified_at", null)
        .order("skipped_at", { ascending: false });

      if (error) {
        console.error("[useAutoSkipNotifications] Error fetching:", error);
        setIsLoading(false);
        return;
      }

      setPendingNotifications(data || []);
      setIsLoading(false);
    } catch (error) {
      console.error("[useAutoSkipNotifications] Error:", error);
      setIsLoading(false);
    }
  }, []);

  const markAsNotified = useCallback(async () => {
    if (pendingNotifications.length === 0) return;

    try {
      const ids = pendingNotifications.map((n) => n.id);
      
      await (supabase.from("auto_skip_notifications") as any)
        .update({ notified_at: new Date().toISOString() })
        .in("id", ids);

      setPendingNotifications([]);
    } catch (error) {
      console.error("[useAutoSkipNotifications] Error marking as notified:", error);
    }
  }, [pendingNotifications]);

  const showNotificationToast = useCallback(() => {
    if (pendingNotifications.length === 0) return;

    const count = pendingNotifications.length;
    const message = count === 1
      ? "1 refeição foi marcada como perdida"
      : `${count} refeições foram marcadas como perdidas`;

    toast.info(message, {
      description: "Refeições não registradas em 24h são automaticamente marcadas",
      duration: 5000,
    });

    // Mark as notified after showing
    markAsNotified();
  }, [pendingNotifications, markAsNotified]);

  // Defer initial fetch to avoid blocking first render
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPendingNotifications();
    }, 2000); // 2s delay for initial load
    return () => clearTimeout(timer);
  }, [fetchPendingNotifications]);

  // Auto-show toast when there are pending notifications
  useEffect(() => {
    if (!isLoading && pendingNotifications.length > 0) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        showNotificationToast();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isLoading, pendingNotifications.length, showNotificationToast]);

  return {
    pendingCount: pendingNotifications.length,
    isLoading,
    refetch: fetchPendingNotifications,
  };
}
