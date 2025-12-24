import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2, Droplets, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WaterReminderSettings {
  reminder_enabled: boolean;
  reminder_interval_minutes: number;
  reminder_start_hour: number;
  reminder_end_hour: number;
}

const INTERVAL_OPTIONS = [
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 horas" },
];

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

  const { toast } = useToast();
  const [waterSettings, setWaterSettings] = useState<WaterReminderSettings>({
    reminder_enabled: true,
    reminder_interval_minutes: 60,
    reminder_start_hour: 8,
    reminder_end_hour: 22,
  });
  const [isLoadingWater, setIsLoadingWater] = useState(true);

  // Fetch water reminder settings
  useEffect(() => {
    const fetchWaterSettings = async () => {
      if (!open) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("water_settings")
          .select("reminder_enabled, reminder_interval_minutes, reminder_start_hour, reminder_end_hour")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          setWaterSettings({
            reminder_enabled: data.reminder_enabled,
            reminder_interval_minutes: data.reminder_interval_minutes,
            reminder_start_hour: data.reminder_start_hour,
            reminder_end_hour: data.reminder_end_hour,
          });
        }
      } catch (error) {
        console.error("Error fetching water settings:", error);
      } finally {
        setIsLoadingWater(false);
      }
    };

    fetchWaterSettings();
  }, [open]);

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  const handleWaterReminderToggle = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("water_settings")
        .upsert({
          user_id: user.id,
          reminder_enabled: enabled,
          reminder_interval_minutes: waterSettings.reminder_interval_minutes,
          reminder_start_hour: waterSettings.reminder_start_hour,
          reminder_end_hour: waterSettings.reminder_end_hour,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setWaterSettings({ ...waterSettings, reminder_enabled: enabled });
      toast({
        title: enabled ? "Lembretes ativados" : "Lembretes desativados",
        description: enabled 
          ? "Você receberá lembretes para beber água" 
          : "Lembretes de hidratação desativados",
      });
    } catch (error) {
      console.error("Error updating water reminder:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar configurações",
        variant: "destructive",
      });
    }
  };

  const updateWaterSetting = async (key: keyof WaterReminderSettings, value: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newSettings = { ...waterSettings, [key]: value };

      const { error } = await supabase
        .from("water_settings")
        .upsert({
          user_id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setWaterSettings(newSettings);
    } catch (error) {
      console.error("Error updating water setting:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto p-6">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificações
          </SheetTitle>
          <SheetDescription>
            Configure suas preferências de notificação
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
              {/* Push Notifications Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications" className="text-base">
                    Notificações push
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receba lembretes no seu dispositivo
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
                <>
                  {/* Success message */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className="text-sm text-primary">
                      ✓ Notificações push ativadas para este dispositivo.
                    </p>
                  </div>

                  {/* Water Reminders Section */}
                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Lembretes de Hidratação</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Lembrar de beber água</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba lembretes periódicos
                        </p>
                      </div>
                      {isLoadingWater ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Switch
                          checked={waterSettings.reminder_enabled}
                          onCheckedChange={handleWaterReminderToggle}
                        />
                      )}
                    </div>

                    {waterSettings.reminder_enabled && (
                      <>
                        {/* Reminder Interval */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            Intervalo entre lembretes
                          </Label>
                          <Select
                            value={waterSettings.reminder_interval_minutes.toString()}
                            onValueChange={(value) =>
                              updateWaterSetting("reminder_interval_minutes", parseInt(value))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o intervalo" />
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

                        {/* Active Hours */}
                        <div className="space-y-2">
                          <Label className="text-sm">Horário dos lembretes</Label>
                          <div className="flex items-center gap-2">
                            <Select
                              value={waterSettings.reminder_start_hour.toString()}
                              onValueChange={(value) =>
                                updateWaterSetting("reminder_start_hour", parseInt(value))
                              }
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <SelectItem key={i} value={i.toString()}>
                                    {i.toString().padStart(2, "0")}:00
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-muted-foreground">até</span>
                            <Select
                              value={waterSettings.reminder_end_hour.toString()}
                              onValueChange={(value) =>
                                updateWaterSetting("reminder_end_hour", parseInt(value))
                              }
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <SelectItem key={i} value={i.toString()}>
                                    {i.toString().padStart(2, "0")}:00
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Você receberá lembretes apenas neste período
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              <div className="text-xs text-muted-foreground border-t pt-4">
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
