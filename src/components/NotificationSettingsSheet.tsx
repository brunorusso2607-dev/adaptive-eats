import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2, Droplets, Clock, UtensilsCrossed, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
import { useMealTimeSettings } from "@/hooks/useMealTimeSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WaterReminderSettings {
  reminder_enabled: boolean;
  reminder_interval_minutes: number;
  reminder_start_hour: number;
  reminder_end_hour: number;
}

interface MealReminderSettings {
  enabled: boolean;
  reminder_minutes_before: number;
  enabled_meals: string[];
}

const INTERVAL_OPTIONS = [
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 horas" },
];

const MEAL_REMINDER_OPTIONS = [
  { value: 0, label: "No horário" },
  { value: 15, label: "15 min antes" },
  { value: 30, label: "30 min antes" },
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
  const { settings: mealTimeSettings } = useMealTimeSettings();
  
  const [waterSettings, setWaterSettings] = useState<WaterReminderSettings>({
    reminder_enabled: true,
    reminder_interval_minutes: 60,
    reminder_start_hour: 8,
    reminder_end_hour: 22,
  });
  const [mealSettings, setMealSettings] = useState<MealReminderSettings>({
    enabled: true,
    reminder_minutes_before: 0,
    enabled_meals: [],
  });
  const [isLoadingWater, setIsLoadingWater] = useState(true);
  const [isLoadingMeal, setIsLoadingMeal] = useState(true);
  const [isSendingMealTest, setIsSendingMealTest] = useState(false);

  const sendMealReminderTest = async () => {
    if (mealSettings.enabled_meals.length === 0) {
      toast({
        title: "Nenhuma refeição selecionada",
        description: "Selecione ao menos uma refeição para testar o lembrete",
        variant: "destructive",
      });
      return;
    }

    setIsSendingMealTest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Usuário não autenticado");
      }

      // Get first enabled meal for test
      const testMealType = mealSettings.enabled_meals[0];
      const testMeal = mealTimeSettings.find(m => m.meal_type === testMealType);
      const mealLabel = testMeal?.label || testMealType;

      const response = await supabase.functions.invoke("send-test-notification", {
        body: {
          title: `🍽️ Hora da ${mealLabel}!`,
          message: `Este é um teste do lembrete de refeição. Seu próximo lembrete será ${mealSettings.reminder_minutes_before === 0 ? "no horário" : `${mealSettings.reminder_minutes_before} min antes`}.`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Notificação enviada!",
        description: "Verifique se recebeu a notificação de teste de refeição",
      });
    } catch (error: any) {
      console.error("Error sending meal test notification:", error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar a notificação de teste",
        variant: "destructive",
      });
    } finally {
      setIsSendingMealTest(false);
    }
  };

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

  // Fetch meal reminder settings
  useEffect(() => {
    const fetchMealSettings = async () => {
      if (!open) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("meal_reminder_settings")
          .select("enabled, reminder_minutes_before, enabled_meals")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          setMealSettings({
            enabled: data.enabled,
            reminder_minutes_before: data.reminder_minutes_before,
            enabled_meals: data.enabled_meals || [],
          });
        } else {
          // Default: all meals enabled
          const defaultMeals = mealTimeSettings.map(m => m.meal_type);
          setMealSettings(prev => ({
            ...prev,
            enabled_meals: defaultMeals.length > 0 ? defaultMeals : ["cafe_manha", "almoco", "lanche", "jantar", "ceia"]
          }));
        }
      } catch (error) {
        console.error("Error fetching meal settings:", error);
      } finally {
        setIsLoadingMeal(false);
      }
    };

    fetchMealSettings();
  }, [open, mealTimeSettings]);

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

  const handleMealReminderToggle = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("meal_reminder_settings")
        .upsert({
          user_id: user.id,
          enabled,
          reminder_minutes_before: mealSettings.reminder_minutes_before,
          enabled_meals: mealSettings.enabled_meals,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;

      setMealSettings({ ...mealSettings, enabled });
      toast({
        title: enabled ? "Lembretes ativados" : "Lembretes desativados",
        description: enabled 
          ? "Você receberá lembretes de refeições" 
          : "Lembretes de refeição desativados",
      });
    } catch (error) {
      console.error("Error updating meal reminder:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar configurações",
        variant: "destructive",
      });
    }
  };

  const updateMealSetting = async (key: keyof MealReminderSettings, value: number | string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newSettings = { ...mealSettings, [key]: value };

      const { error } = await supabase
        .from("meal_reminder_settings")
        .upsert({
          user_id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;

      setMealSettings(newSettings);
    } catch (error) {
      console.error("Error updating meal setting:", error);
    }
  };

  const handleMealToggle = (mealType: string) => {
    const newMeals = mealSettings.enabled_meals.includes(mealType)
      ? mealSettings.enabled_meals.filter(m => m !== mealType)
      : [...mealSettings.enabled_meals, mealType];
    updateMealSetting("enabled_meals", newMeals);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto p-6">
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

                  {/* Meal Reminders Section */}
                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UtensilsCrossed className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Lembretes de Refeição</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Lembrar das refeições</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba alertas nos horários das refeições
                        </p>
                      </div>
                      {isLoadingMeal ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Switch
                          checked={mealSettings.enabled}
                          onCheckedChange={handleMealReminderToggle}
                        />
                      )}
                    </div>

                    {mealSettings.enabled && (
                      <>
                        {/* Reminder timing */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            Quando lembrar
                          </Label>
                          <Select
                            value={mealSettings.reminder_minutes_before.toString()}
                            onValueChange={(value) =>
                              updateMealSetting("reminder_minutes_before", parseInt(value))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {MEAL_REMINDER_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value.toString()}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Individual meals */}
                        <div className="space-y-2">
                          <Label className="text-sm">Refeições com lembrete</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {mealTimeSettings.map(meal => (
                              <div
                                key={meal.meal_type}
                                className="flex items-center space-x-2 rounded-lg border p-2"
                              >
                                <Checkbox
                                  id={`meal-${meal.meal_type}`}
                                  checked={mealSettings.enabled_meals.includes(meal.meal_type)}
                                  onCheckedChange={() => handleMealToggle(meal.meal_type)}
                                />
                                <Label
                                  htmlFor={`meal-${meal.meal_type}`}
                                  className="text-sm cursor-pointer font-normal"
                                >
                                  {meal.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Test button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={sendMealReminderTest}
                          disabled={isSendingMealTest}
                        >
                          {isSendingMealTest ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Testar lembrete de refeição
                        </Button>
                      </>
                    )}
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
                  <li>Lembretes de refeições do plano alimentar</li>
                  <li>Lembretes de hidratação</li>
                  <li>Lembretes de feedback (2-24h após refeição)</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
