import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

/**
 * Hook para monitorar status de conexão de rede
 * 
 * Funcionalidades:
 * - Detecta quando usuário perde conexão
 * - Mostra toast quando fica offline
 * - Mostra toast de recuperação quando volta online
 * - Previne toasts duplicados
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [hasShownOfflineToast, setHasShownOfflineToast] = useState(false);

  const handleOnline = useCallback(() => {
    console.log('[NETWORK] Conexão restaurada');
    setIsOnline(true);
    
    // Só mostra toast de "voltou" se tinha ficado offline
    if (wasOffline) {
      toast.success('Conexão restaurada', {
        description: 'Você está online novamente.',
        duration: 3000,
      });
      setWasOffline(false);
    }
    setHasShownOfflineToast(false);
  }, [wasOffline]);

  const handleOffline = useCallback(() => {
    console.log('[NETWORK] Conexão perdida');
    setIsOnline(false);
    setWasOffline(true);
    
    // Evita toasts duplicados
    if (!hasShownOfflineToast) {
      toast.warning('Sem conexão', {
        description: 'Verifique sua internet. O app tentará reconectar automaticamente.',
        duration: 5000,
      });
      setHasShownOfflineToast(true);
    }
  }, [hasShownOfflineToast]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificação inicial
    if (!navigator.onLine && !hasShownOfflineToast) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline, hasShownOfflineToast]);

  return { isOnline, wasOffline };
}

export default useNetworkStatus;
