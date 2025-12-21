import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const useAutoUpdate = () => {
  const wasHiddenRef = useRef(false);
  const updatePendingRef = useRef(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service Worker registrado:', swUrl);
      
      // Verificar atualizações a cada 5 minutos
      if (registration) {
        setInterval(() => {
          console.log('[PWA] Verificando atualizações...');
          registration.update();
        }, 5 * 60 * 1000);
      }
    },
    onNeedRefresh() {
      console.log('[PWA] Nova versão disponível!');
      updatePendingRef.current = true;
      
      // Se o app já está em segundo plano, atualiza imediatamente
      if (document.hidden) {
        console.log('[PWA] App em segundo plano - atualizando agora...');
        updateServiceWorker(true);
      }
    },
    onOfflineReady() {
      console.log('[PWA] App pronto para uso offline');
    },
  });

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App foi para segundo plano
        wasHiddenRef.current = true;
        console.log('[PWA] App foi para segundo plano');
        
        // Se há atualização pendente, atualiza agora (em segundo plano)
        if (updatePendingRef.current) {
          console.log('[PWA] Atualizando em segundo plano...');
          updateServiceWorker(true);
          updatePendingRef.current = false;
        }
      } else if (wasHiddenRef.current) {
        // App voltou do segundo plano
        wasHiddenRef.current = false;
        console.log('[PWA] App voltou do segundo plano');
        
        // Se há atualização pendente, recarrega a página
        if (needRefresh || updatePendingRef.current) {
          console.log('[PWA] Recarregando com nova versão...');
          window.location.reload();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [needRefresh, updateServiceWorker]);

  return { needRefresh, updateServiceWorker };
};
