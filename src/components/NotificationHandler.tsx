import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Helper to update app badge - same as in useNotifications
const updateAppBadge = async (count: number) => {
  console.log("[NotificationHandler] Updating app badge to:", count);
  
  try {
    if (count === 0) {
      // Try clearAppBadge first
      if ('clearAppBadge' in navigator) {
        await (navigator as any).clearAppBadge();
        console.log("[NotificationHandler] clearAppBadge() success");
      } 
      // Fallback: set badge to 0 explicitly
      if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(0);
        console.log("[NotificationHandler] setAppBadge(0) fallback success");
      }
    } else {
      if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(count);
        console.log("[NotificationHandler] setAppBadge() success:", count);
      }
    }
  } catch (error) {
    console.error("[NotificationHandler] Badge error:", error);
  }
};

/**
 * Global notification handler that processes markAsRead query params
 * and Service Worker messages. This component should be placed inside
 * BrowserRouter but outside of route-specific components.
 */
export function NotificationHandler() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Mark notification as read by ID
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    console.log('[NotificationHandler] Marking as read:', notificationId);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('[NotificationHandler] No session, skipping');
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      console.error('[NotificationHandler] Error marking as read:', error);
    } else {
      console.log('[NotificationHandler] Successfully marked as read:', notificationId);
      
      // Update app badge with user-specific count
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false);
      
      await updateAppBadge(count || 0);
    }
  }, []);

  // Handle markAsRead query parameter (from push notification click)
  useEffect(() => {
    const notificationId = searchParams.get('markAsRead');
    if (notificationId) {
      console.log('[NotificationHandler] Found markAsRead param:', notificationId);
      markNotificationAsRead(notificationId);
      // Remove the query param after handling
      searchParams.delete('markAsRead');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, markNotificationAsRead]);

  // Handle messages from Service Worker
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('[NotificationHandler] SW message received:', event.data);
      if (event.data?.type === 'MARK_NOTIFICATION_READ' && event.data.notificationId) {
        markNotificationAsRead(event.data.notificationId);
      }
    };

    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
    
    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [markNotificationAsRead]);

  // Mark all notifications as read and clear badge when app becomes visible
  useEffect(() => {
    const markAllReadOnVisibility = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[NotificationHandler] App visible, marking all notifications as read...');
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        // Mark all unread notifications as read
        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", session.user.id)
          .eq("is_read", false);
        
        if (error) {
          console.error('[NotificationHandler] Error marking notifications as read:', error);
        } else {
          console.log('[NotificationHandler] All notifications marked as read');
        }
        
        // Always clear badge when app is opened
        await updateAppBadge(0);
      }
    };

    document.addEventListener('visibilitychange', markAllReadOnVisibility);
    
    // Also run on mount
    markAllReadOnVisibility();
    
    return () => {
      document.removeEventListener('visibilitychange', markAllReadOnVisibility);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
