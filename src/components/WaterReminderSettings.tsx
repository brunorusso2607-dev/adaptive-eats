import { useState, useEffect } from "react";
import { Bell, BellOff, Clock, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WaterSettings } from "@/hooks/useWaterConsumption";
import { cn } from "@/lib/utils";
import { usePushSubscription } from "@/hooks/usePushSubscription";

interface WaterReminderSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: WaterSettings;
  onSave: (settings: Partial<WaterSettings>) => Promise<boolean>;
}

const INTERVAL_OPTIONS = [
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h 30min" },
  { value: 120, label: "2 horas" },
  { value: 180, label: "3 horas" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, "0")}:00`,
}));

export function WaterReminderSettings({
  open,
  onOpenChange,
  settings,
  onSave,
}: WaterReminderSettingsProps) {
  const [localSettings, setLocalSettings] = useState({
    reminder_enabled: settings.reminder_enabled,
    reminder_interval_minutes: settings.reminder_interval_minutes,
    reminder_start_hour: settings.reminder_start_hour,
    reminder_end_hour: settings.reminder_end_hour,
  });
  const [isSaving, setIsSaving] = useState(false);

  const { 
    isSupported: isPushSupported, 
    isSubscribed: isPushSubscribed, 
    permission: pushPermission,
    subscribe: subscribePush 
  } = usePushSubscription();

  useEffect(() => {
    setLocalSettings({
      reminder_enabled: settings.reminder_enabled,
      reminder_interval_minutes: settings.reminder_interval_minutes,
      reminder_start_hour: settings.reminder_start_hour,
      reminder_end_hour: settings.reminder_end_hour,
    });
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);

    // If enabling reminders, ensure push subscription exists
    if (localSettings.reminder_enabled && !isPushSubscribed) {
      const subscribed = await subscribePush();
      if (!subscribed) {
        setIsSaving(false);
        return;
      }
    }

    const success = await onSave(localSettings);
    setIsSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const canEnableReminders = isPushSupported && pushPermission !== "denied";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            Lembretes de Água
          </SheetTitle>
          <SheetDescription>
            Configure notificações automáticas para lembrar de beber água
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Push notification status */}
          {!isPushSupported ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <BellOff className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-600">
                    Notificações não suportadas
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Seu navegador não suporta notificações push
                  </p>
                </div>
              </div>
            </div>
          ) : pushPermission === "denied" ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <BellOff className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Notificações bloqueadas
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ative as notificações nas configurações do navegador
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Enable/Disable toggle */}
              <div 
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                  localSettings.reminder_enabled 
                    ? "border-blue-500 bg-blue-500/10" 
                    : "border-border"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    localSettings.reminder_enabled 
                      ? "bg-blue-500 text-white" 
                      : "bg-muted"
                  )}>
                    {localSettings.reminder_enabled ? (
                      <Bell className="h-5 w-5" />
                    ) : (
                      <BellOff className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {localSettings.reminder_enabled ? "Lembretes ativos" : "Lembretes desativados"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {localSettings.reminder_enabled 
                        ? "Você receberá notificações automáticas" 
                        : "Ative para receber lembretes"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={localSettings.reminder_enabled}
                  onCheckedChange={(checked) => 
                    setLocalSettings({ ...localSettings, reminder_enabled: checked })
                  }
                />
              </div>

              {/* Interval settings */}
              {localSettings.reminder_enabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Interval */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Intervalo entre lembretes
                    </Label>
                    <Select
                      value={localSettings.reminder_interval_minutes.toString()}
                      onValueChange={(value) => 
                        setLocalSettings({ 
                          ...localSettings, 
                          reminder_interval_minutes: parseInt(value) 
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERVAL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Active hours */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Início</Label>
                      <Select
                        value={localSettings.reminder_start_hour.toString()}
                        onValueChange={(value) => 
                          setLocalSettings({ 
                            ...localSettings, 
                            reminder_start_hour: parseInt(value) 
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOUR_OPTIONS.filter(h => h.value < localSettings.reminder_end_hour).map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Fim</Label>
                      <Select
                        value={localSettings.reminder_end_hour.toString()}
                        onValueChange={(value) => 
                          setLocalSettings({ 
                            ...localSettings, 
                            reminder_end_hour: parseInt(value) 
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOUR_OPTIONS.filter(h => h.value > localSettings.reminder_start_hour).map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <Droplets className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                    <p className="text-sm font-medium">
                      Lembretes a cada {INTERVAL_OPTIONS.find(o => o.value === localSettings.reminder_interval_minutes)?.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Das {localSettings.reminder_start_hour.toString().padStart(2, "0")}:00 às {localSettings.reminder_end_hour.toString().padStart(2, "0")}:00
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <SheetFooter className="pb-6">
          <Button
            onClick={handleSave}
            disabled={isSaving || !canEnableReminders}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            {isSaving ? "Salvando..." : "Salvar configurações"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
