import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
const updateAppBadge = (count: number) => {
  if (count === 0) {
    if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(() => {});
    }
  } else {
    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(count).catch(() => {});
    }
  }
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // Mark notification as read by ID (for auto-marking when clicked from push)
  const markNotificationAsReadById = useCallback(async (notificationId: string) => {
    console.log('[Notifications] Auto-marking as read:', notificationId);
    
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => {
        const newCount = Math.max(0, prev - 1);
        updateAppBadge(newCount);
        return newCount;
      });
    }
  }, []);

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
      updateAppBadge(0);
    }
  }, []);

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

  // Handle markAsRead query parameter (from push notification click)
  useEffect(() => {
    const notificationId = searchParams.get('markAsRead');
    if (notificationId) {
      console.log('[Notifications] Found markAsRead param:', notificationId);
      markNotificationAsReadById(notificationId);
      // Remove the query param after handling
      searchParams.delete('markAsRead');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, markNotificationAsReadById]);

  // Handle messages from Service Worker
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('[Notifications] SW message received:', event.data);
      if (event.data?.type === 'MARK_NOTIFICATION_READ' && event.data.notificationId) {
        markNotificationAsReadById(event.data.notificationId);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [markNotificationAsReadById]);

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
    markNotificationAsReadById,
  };
}
