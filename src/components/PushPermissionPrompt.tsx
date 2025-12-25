import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushSubscription } from "@/hooks/usePushSubscription";

const PUSH_PROMPT_DISMISSED_KEY = "push_prompt_dismissed";

export function PushPermissionPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const { isSupported, isSubscribed, isLoading, permission, subscribe } = usePushSubscription();

  useEffect(() => {
    // Don't show if:
    // - Push not supported
    // - Already subscribed
    // - Permission was denied (user blocked it)
    // - Still loading
    // - User already dismissed the prompt
    if (!isSupported || isSubscribed || permission === "denied" || isLoading) {
      return;
    }

    const wasDismissed = localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY);
    if (wasDismissed) {
      return;
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
    localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, "true");
    setIsVisible(false);
  };

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
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEnable}>
                Ativar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Agora não
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
