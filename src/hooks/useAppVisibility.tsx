import { useEffect, useCallback, useRef } from 'react';

interface UseAppVisibilityOptions {
  onVisible?: () => void;
  onHidden?: () => void;
  debounceMs?: number; // Minimum time between refreshes
  minHiddenMs?: number; // Minimum time app must be hidden before triggering refresh
}

/**
 * Hook that detects when the app becomes visible again (user returns to tab/app)
 * and triggers a callback. Useful for refreshing data when user comes back.
 * 
 * Features:
 * - Debounce to prevent excessive refreshes
 * - Minimum hidden time to avoid refresh on quick tab switches
 * - Works with both browser tabs and PWA
 */
export function useAppVisibility({
  onVisible,
  onHidden,
  debounceMs = 5000, // Default: 5 seconds between refreshes
  minHiddenMs = 3000, // Default: App must be hidden for 3+ seconds
}: UseAppVisibilityOptions = {}) {
  const lastRefreshRef = useRef<number>(Date.now());
  const hiddenAtRef = useRef<number | null>(null);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      const timeHidden = hiddenAtRef.current ? now - hiddenAtRef.current : 0;
      
      // Only trigger if:
      // 1. Enough time has passed since last refresh (debounce)
      // 2. App was hidden for minimum required time
      if (timeSinceLastRefresh >= debounceMs && timeHidden >= minHiddenMs) {
        console.log('[useAppVisibility] App became visible, triggering refresh', {
          timeSinceLastRefresh,
          timeHidden
        });
        lastRefreshRef.current = now;
        onVisible?.();
      }
      
      hiddenAtRef.current = null;
    } else {
      // App became hidden
      hiddenAtRef.current = Date.now();
      onHidden?.();
    }
  }, [onVisible, onHidden, debounceMs, minHiddenMs]);

  // Also handle focus event for PWA
  const handleFocus = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;
    
    if (timeSinceLastRefresh >= debounceMs) {
      console.log('[useAppVisibility] Window focused, triggering refresh');
      lastRefreshRef.current = now;
      onVisible?.();
    }
  }, [onVisible, debounceMs]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [handleVisibilityChange, handleFocus]);

  // Return a manual refresh function
  const forceRefresh = useCallback(() => {
    lastRefreshRef.current = Date.now();
    onVisible?.();
  }, [onVisible]);

  return { forceRefresh };
}
