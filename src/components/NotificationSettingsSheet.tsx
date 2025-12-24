import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { usePushSubscription } from "@/hooks/usePushSubscription";

interface NotificationSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSettingsSheet({
  open,
  onOpenChange,
}: NotificationSettingsSheetProps) {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushSubscription();

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificações
          </SheetTitle>
          <SheetDescription>
            Receba lembretes sobre suas refeições
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {!isSupported ? (
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <BellOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Notificações push não são suportadas neste navegador
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications" className="text-base">
                    Notificações push
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receba lembretes sobre feedback de refeições
                  </p>
                </div>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Switch
                    id="push-notifications"
                    checked={isSubscribed}
                    onCheckedChange={handleToggle}
                  />
                )}
              </div>

              {permission === "denied" && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive">
                    Notificações foram bloqueadas. Para ativar, vá nas
                    configurações do navegador e permita notificações para este
                    site.
                  </p>
                </div>
              )}

              {isSubscribed && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-sm text-primary">
                    ✓ Você receberá lembretes quando houver refeições
                    aguardando feedback de bem-estar.
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                <p>As notificações incluem:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Lembretes de feedback (2-24h após refeição)</li>
                  <li>Lembretes de hidratação</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
