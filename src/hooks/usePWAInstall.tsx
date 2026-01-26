import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { pwaLog } from "@/lib/devLog";
import type { BeforeInstallPromptEvent } from "@/types/common";

interface UsePWAInstallReturn {
  deferredPrompt: BeforeInstallPromptEvent | null;
  showInstallButton: boolean;
  isAppInstalled: boolean;
  handleInstallClick: () => Promise<void>;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
      pwaLog.log('App já está instalado (standalone mode)');
      return;
    }

    // Check iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as unknown as { standalone: boolean }).standalone;
    
    if (isIOS && isInStandaloneMode) {
      setIsAppInstalled(true);
      pwaLog.log('App já está instalado (iOS standalone)');
      return;
    }

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
      pwaLog.log('beforeinstallprompt event captured');
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
      pwaLog.log('App installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) {
      pwaLog.warn('No deferred prompt available');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      pwaLog.log('User choice:', outcome);
      
      if (outcome === 'accepted') {
        toast.success('App instalado com sucesso!');
        setIsAppInstalled(true);
      }
      
      setDeferredPrompt(null);
      setShowInstallButton(false);
    } catch (error) {
      pwaLog.error('Error during installation:', error);
      toast.error('Erro ao instalar o app');
    }
  }, [deferredPrompt]);

  return {
    deferredPrompt,
    showInstallButton,
    isAppInstalled,
    handleInstallClick,
  };
}
