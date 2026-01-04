import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "reminder";
  is_read: boolean;
  action_url: string | null;
  created_at: string;
};

// Helper to update app badge
const updateAppBadge = async (count: number) => {
  console.log("[Badge] Attempting to update app badge to:", count);
  
  try {
    if (count === 0) {
      // Try clearAppBadge first
      if ('clearAppBadge' in navigator) {
        await (navigator as any).clearAppBadge();
        console.log("[Badge] clearAppBadge() called successfully");
      } 
      // Fallback: set badge to 0 explicitly
      if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(0);
        console.log("[Badge] setAppBadge(0) called as fallback");
      }
    } else {
      if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(count);
        console.log("[Badge] setAppBadge() called with count:", count);
      }
    }
  } catch (error) {
    console.error("[Badge] Error updating badge:", error);
  }
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as Notification[]);
      const unread = data.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
      // Sync app badge with actual unread count from database
      updateAppBadge(unread);
    }
    setIsLoading(false);
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => {
        const newCount = Math.max(0, prev - 1);
        updateAppBadge(newCount);
        return newCount;
      });
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    console.log("[Notifications] Marking all as read and clearing app badge...");

    // Clear app badge immediately for better UX
    updateAppBadge(0);

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      console.log("[Notifications] All notifications marked as read, badge cleared");
    } else {
      console.error("[Notifications] Error marking as read:", error);
      // Re-sync badge on error
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (!error) {
      const deletedNotif = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (deletedNotif && !deletedNotif.is_read) {
        setUnreadCount((prev) => {
          const newCount = Math.max(0, prev - 1);
          updateAppBadge(newCount);
          return newCount;
        });
      }
    }
  }, [notifications]);

  const clearAll = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", session.user.id);

    if (!error) {
      setNotifications([]);
      setUnreadCount(0);
      updateAppBadge(0);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Sync badge when app becomes visible (user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Subscribe to realtime updates
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => {
            const newCount = prev + 1;
            updateAppBadge(newCount);
            return newCount;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const updatedNotif = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
          );
          // Recalculate unread count
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refetch: fetchNotifications,
  };
}
