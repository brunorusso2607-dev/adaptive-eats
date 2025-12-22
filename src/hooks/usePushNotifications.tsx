import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// VAPID public key - this is safe to expose (it's a PUBLIC key)
const VAPID_PUBLIC_KEY = 'BFvsQaMbzpnY2i6ssyLlC3idQ-3a56wKU6LP6OCYjOrycUoM8qpaanDfvmx8vlqORG2ncV895egD0se9gM7ukGw';

interface NotificationPreferences {
  meal_reminders: boolean;
  streak_alerts: boolean;
  reminder_time: string;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    meal_reminders: true,
    streak_alerts: true,
    reminder_time: '19:00:00'
  });
  const { toast } = useToast();

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    };
    
    checkSupport();
  }, []);

  // Check subscription status and load preferences
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Check if service worker is registered
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          // Check if subscription exists in database
          const { data: dbSub } = await supabase
            .from('push_subscriptions')
            .select('is_active')
            .eq('endpoint', subscription.endpoint)
            .eq('user_id', user.id)
            .single();
          
          setIsSubscribed(dbSub?.is_active ?? false);
        } else {
          setIsSubscribed(false);
        }

        // Load preferences
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (prefs) {
          setPreferences({
            meal_reminders: prefs.meal_reminders,
            streak_alerts: prefs.streak_alerts,
            reminder_time: prefs.reminder_time
          });
        }

      } catch (error) {
        console.error('[usePushNotifications] Error checking subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported]);

  // Convert base64 to Uint8Array for VAPID key
  const urlBase64ToUint8Array = useCallback((base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Não suportado",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive"
      });
      return false;
    }

    try {
      setIsLoading(true);

      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        toast({
          title: "Permissão negada",
          description: "Você precisa permitir notificações para receber lembretes.",
          variant: "destructive"
        });
        return false;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para ativar notificações.",
          variant: "destructive"
        });
        return false;
      }

      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      // If no subscription, create one
      if (!subscription) {
        if (!VAPID_PUBLIC_KEY) {
          throw new Error('VAPID public key not configured');
        }

        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer
        });
      }

      // Extract keys from subscription
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      if (!p256dh || !auth) {
        throw new Error('Failed to get subscription keys');
      }

      // Convert to base64
      const p256dhBase64 = btoa(String.fromCharCode(...new Uint8Array(p256dh)));
      const authBase64 = btoa(String.fromCharCode(...new Uint8Array(auth)));

      // Save to database
      const { error: upsertError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: p256dhBase64,
          auth: authBase64,
          is_active: true
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (upsertError) throw upsertError;

      // Create default notification preferences if not exist
      const { error: prefError } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          meal_reminders: true,
          streak_alerts: true,
          reminder_time: '19:00:00'
        }, {
          onConflict: 'user_id'
        });

      if (prefError) console.error('Error saving preferences:', prefError);

      setIsSubscribed(true);
      toast({
        title: "Notificações ativadas!",
        description: "Você receberá lembretes para registrar suas refeições."
      });

      return true;

    } catch (error) {
      console.error('[usePushNotifications] Subscribe error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível ativar as notificações. Tente novamente.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, toast, urlBase64ToUint8Array]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Mark as inactive in database
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('endpoint', subscription.endpoint)
          .eq('user_id', user.id);
      }

      setIsSubscribed(false);
      toast({
        title: "Notificações desativadas",
        description: "Você não receberá mais lembretes."
      });

      return true;

    } catch (error) {
      console.error('[usePushNotifications] Unsubscribe error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível desativar as notificações.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPrefs: Partial<NotificationPreferences>): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('notification_preferences')
        .update(newPrefs)
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences(prev => ({ ...prev, ...newPrefs }));
      toast({
        title: "Preferências atualizadas",
        description: "Suas configurações de notificação foram salvas."
      });

      return true;

    } catch (error) {
      console.error('[usePushNotifications] Update preferences error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as preferências.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Send a test notification
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          payload: {
            title: "🔔 Teste de Notificação",
            body: "Se você viu isso, as notificações estão funcionando!",
            icon: '/icons/icon-192x192.png',
            tag: 'test'
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Notificação enviada!",
        description: "Verifique se você recebeu a notificação."
      });

      return true;

    } catch (error) {
      console.error('[usePushNotifications] Test notification error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a notificação de teste.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    preferences,
    subscribe,
    unsubscribe,
    updatePreferences,
    sendTestNotification
  };
}
