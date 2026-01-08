import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const useAutoUpdate = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true, // Registra imediatamente
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service Worker registrado:', swUrl);
      
      // Verificar atualizações imediatamente ao registrar
      if (registration) {
        registration.update();
        
        // Verificar atualizações a cada 1 minuto (mais agressivo)
        setInterval(() => {
          console.log('[PWA] Verificando atualizações...');
          registration.update();
        }, 60 * 1000); // 1 minuto
      }
    },
    onNeedRefresh() {
      console.log('[PWA] Nova versão disponível! Atualizando automaticamente...');
      // Atualiza automaticamente sem perguntar
      updateServiceWorker(true);
    },
    onOfflineReady() {
      console.log('[PWA] App pronto para uso offline');
    },
  });

  // Quando há atualização pendente, recarrega a página
  useEffect(() => {
    if (needRefresh) {
      console.log('[PWA] Recarregando para aplicar atualização...');
      window.location.reload();
    }
  }, [needRefresh]);

  // Verificar atualização quando o app volta do segundo plano
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[PWA] App voltou - verificando atualizações...');
        // Força verificação quando volta do segundo plano
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
