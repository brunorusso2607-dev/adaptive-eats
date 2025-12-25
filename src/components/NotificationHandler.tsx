import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
    
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      console.error('[NotificationHandler] Error marking as read:', error);
    } else {
      console.log('[NotificationHandler] Successfully marked as read:', notificationId);
      // Update app badge
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      
      if (count === 0 && 'clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch(() => {});
      } else if ('setAppBadge' in navigator) {
        (navigator as any).setAppBadge(count || 0).catch(() => {});
      }
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

  // This component doesn't render anything
  return null;
}
