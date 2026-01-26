import { useState, useEffect } from "react";
import { Bell, X, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const PUSH_PROMPT_DISMISSED_KEY = "push_prompt_dismissed";

function PushDebugInfo() {
  const [debugInfo, setDebugInfo] = useState<Record<string, boolean | string>>({});

  useEffect(() => {
    const info: Record<string, boolean | string> = {
      "serviceWorker": "serviceWorker" in navigator,
      "PushManager": "PushManager" in window,
      "Notification": "Notification" in window,
      "standalone (iOS)": (window.navigator as any).standalone ?? false,
      "display-mode": window.matchMedia('(display-mode: standalone)').matches,
      "permission": "Notification" in window ? Notification.permission : "N/A",
      "userAgent iOS": /iPhone|iPad|iPod/.test(navigator.userAgent),
    };
    setDebugInfo(info);
  }, []);

  return (
    <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono space-y-1">
      <p className="font-semibold text-muted-foreground mb-1">Debug Info:</p>
      {Object.entries(debugInfo).map(([key, value]) => (
        <div key={key} className="flex justify-between gap-2">
          <span className="text-muted-foreground truncate">{key}:</span>
          <span className={value === true || value === "granted" ? "text-green-600 font-semibold" : value === false ? "text-red-600 font-semibold" : "text-yellow-600"}>
            {String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PushPermissionPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const { isSupported, isSubscribed, isLoading, permission, subscribe } = usePushSubscription();

  useEffect(() => {
    // Don't show if:
    // - Push not supported
    // - Already subscribed
    // - Permission was denied (user blocked it)
    // - Still loading
    if (!isSupported || isSubscribed || permission === "denied" || isLoading) {
      return;
    }

    // Check if dismissed and if 7 days have passed
    const dismissedAt = localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 7) {
        return;
      }
    }

    // Show prompt after a short delay for better UX
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, permission, isLoading]);

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, new Date().toISOString());
    setIsVisible(false);
  };

  // Show debug card when push is not supported (show immediately, don't wait for loading)
  if (!isLoading && !isSupported) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="font-medium text-sm">Notificações push não suportadas</h3>
                <p className="text-xs text-muted-foreground">
                  No iPhone, instale o app na tela inicial (Safari → Compartilhar → Adicionar à Tela de Início)
                </p>
              </div>
              <Collapsible open={showDebug} onOpenChange={setShowDebug}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                    <Bug className="h-3 w-3" />
                    {showDebug ? "Ocultar debug" : "Ver debug"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <PushDebugInfo />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // While loading, show nothing
  if (isLoading) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-primary/5 relative overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
      <CardContent className="p-4 pr-10">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="font-medium text-sm">Ativar notificações</h3>
              <p className="text-xs text-muted-foreground">
                Receba lembretes de hidratação e feedback de refeições
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={handleEnable}>
                Ativar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Agora não
              </Button>
              <Collapsible open={showDebug} onOpenChange={setShowDebug}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                    <Bug className="h-3 w-3" />
                    Debug
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>
            <Collapsible open={showDebug} onOpenChange={setShowDebug}>
              <CollapsibleContent>
                <PushDebugInfo />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
