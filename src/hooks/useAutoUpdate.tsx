import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Check if running inside iframe (Lovable editor preview)
const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

export const useAutoUpdate = () => {
  const intervalRef = useRef<number | null>(null);
  
  // Skip SW registration entirely in iframe to prevent performance issues
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: !isInIframe, // Only register if NOT in iframe
    onRegisteredSW(swUrl, registration) {
      if (isInIframe) return; // Skip in iframe
      
      console.log('[PWA] Service Worker registrado:', swUrl);
      
      if (registration) {
        registration.update();
        
        // Clear any existing interval before creating new one
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        // Check updates every 5 minutes (less aggressive)
        intervalRef.current = window.setInterval(() => {
          console.log('[PWA] Verificando atualizações...');
          registration.update();
        }, 5 * 60 * 1000); // 5 minutes instead of 1
      }
    },
    onNeedRefresh() {
      if (isInIframe) return; // Skip in iframe
      console.log('[PWA] Nova versão disponível! Atualizando automaticamente...');
      updateServiceWorker(true);
    },
    onOfflineReady() {
      console.log('[PWA] App pronto para uso offline');
    },
  });

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Skip reload logic in iframe
  useEffect(() => {
    if (isInIframe) return;
    if (needRefresh) {
      console.log('[PWA] Recarregando para aplicar atualização...');
      window.location.reload();
    }
  }, [needRefresh]);

  // Skip visibility change logic in iframe
  useEffect(() => {
    if (isInIframe) return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[PWA] App voltou - verificando atualizações...');
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
              registration.update();
            }
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { needRefresh, updateServiceWorker };
};
