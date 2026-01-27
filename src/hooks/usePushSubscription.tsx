import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  // Fetch VAPID public key from edge function
  useEffect(() => {
    const fetchVapidKey = async () => {
      try {
        console.log("[Push] Fetching VAPID key...");
        const { data, error } = await supabase.functions.invoke("get-vapid-key");
        
        if (error) {
          console.error("[Push] Edge function error:", error);
          throw error;
        }
        
        if (data?.error) {
          console.error("[Push] VAPID key error:", data.error);
          return;
        }
        
        if (data?.publicKey) {
          console.log("[Push] VAPID key loaded successfully");
          setVapidKey(data.publicKey);
        } else {
          console.error("[Push] No publicKey in response:", data);
        }
      } catch (err) {
        console.error("[Push] Failed to fetch VAPID key:", err);
      }
    };
    fetchVapidKey();
  }, []);

  // Check if push is supported
  useEffect(() => {
    const hasServiceWorker = "serviceWorker" in navigator;
    const hasPushManager = "PushManager" in window;
    const hasNotification = "Notification" in window;
    
    const supported = hasServiceWorker && hasPushManager && hasNotification;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check existing subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) {
        setIsLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error("Error checking subscription:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error("Notificações push não suportadas neste navegador");
      return false;
    }
    
    if (!vapidKey) {
      console.error("[Push] VAPID key not available");
      toast.error("Erro de configuração do servidor. Tente recarregar a página.");
      return false;
    }

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast.error("Permissão de notificações negada");
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Get subscription keys
      const subscriptionJson = subscription.toJSON();
      const endpoint = subscriptionJson.endpoint!;
      const p256dh = subscriptionJson.keys!.p256dh;
      const auth = subscriptionJson.keys!.auth;

      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Usuário não autenticado");
        return false;
      }

      // Save to database
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: session.user.id,
          endpoint,
          p256dh,
          auth,
        },
        { onConflict: "user_id,endpoint" }
      );

      if (error) {
        console.error("Error saving subscription:", error);
        toast.error("Erro ao salvar inscrição de notificações");
        return false;
      }

      setIsSubscribed(true);
      toast.success("Notificações ativadas!");
      return true;
    } catch (err) {
      console.error("Error subscribing to push:", err);
      toast.error("Erro ao ativar notificações");
      return false;
    }
  }, [isSupported, vapidKey]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", session.user.id)
            .eq("endpoint", subscription.endpoint);
        }
      }

      setIsSubscribed(false);
      toast.success("Notificações desativadas");
      return true;
    } catch (err) {
      console.error("Error unsubscribing:", err);
      toast.error("Erro ao desativar notificações");
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    vapidKeyLoaded: !!vapidKey,
  };
}
