import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

export function useCameraPermission(autoRequest: boolean = true) {
  const [status, setStatus] = useState<PermissionStatus>('prompt');
  const [isRequesting, setIsRequesting] = useState(false);

  // Check current permission status
  const checkPermission = useCallback(async (): Promise<PermissionStatus> => {
    try {
      // Check if the API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('[CameraPermission] getUserMedia not supported');
        return 'unsupported';
      }

      // Try to query permission status (not all browsers support this)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          console.log('[CameraPermission] Permission query result:', result.state);
          return result.state as PermissionStatus;
        } catch (e) {
          // Some browsers don't support querying camera permission
          console.log('[CameraPermission] Permission query not supported, will request directly');
        }
      }

      return 'prompt';
    } catch (error) {
      console.error('[CameraPermission] Error checking permission:', error);
      return 'prompt';
    }
  }, []);

  // Request camera permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (isRequesting) return false;
    
    setIsRequesting(true);
    console.log('[CameraPermission] Requesting camera permission...');

    try {
      // Check if API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('[CameraPermission] Camera API not supported');
        setStatus('unsupported');
        return false;
      }

      // Request camera access - this triggers the browser permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Immediately stop the stream - we just needed to trigger the permission
      stream.getTracks().forEach(track => track.stop());
      
      console.log('[CameraPermission] Permission granted');
      setStatus('granted');
      return true;
    } catch (error: any) {
      console.error('[CameraPermission] Permission denied or error:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setStatus('denied');
        toast.error('Acesso à câmera negado', {
          description: 'Habilite nas configurações do navegador para usar a câmera.',
          duration: 5000,
        });
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setStatus('unsupported');
        toast.error('Câmera não encontrada', {
          description: 'Verifique se seu dispositivo possui uma câmera.',
          duration: 5000,
        });
      } else {
        setStatus('denied');
      }
      
      return false;
    } finally {
      setIsRequesting(false);
    }
  }, [isRequesting]);

  // Auto-request permission on mount if enabled
  useEffect(() => {
    if (!autoRequest) return;

    const initPermission = async () => {
      const currentStatus = await checkPermission();
      setStatus(currentStatus);
      
      // Only request if status is 'prompt' (not yet decided)
      if (currentStatus === 'prompt') {
        // Small delay to let the component render first
        setTimeout(() => {
          requestPermission();
        }, 500);
      }
    };

    initPermission();
  }, [autoRequest, checkPermission, requestPermission]);

  return {
    status,
    isRequesting,
    requestPermission,
    checkPermission,
    isGranted: status === 'granted',
    isDenied: status === 'denied',
    isUnsupported: status === 'unsupported',
  };
}
