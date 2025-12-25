import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Droplets, UtensilsCrossed, Clock, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useMealTimeSettings } from "@/hooks/useMealTimeSettings";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const {
    isSupported,
    isSubscribed,
    isLoading: pushLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushSubscription();

  const { settings: mealTimeSettings } = useMealTimeSettings();

  const [waterSettings, setWaterSettings] = useState({
    reminder_enabled: true,
    reminder_start_hour: 8,
    reminder_end_hour: 22,
    reminder_interval_minutes: 60,
    daily_goal_ml: 2000,
  });

  const [mealSettings, setMealSettings] = useState({
    enabled: true,
    reminder_minutes_before: 0,
    enabled_meals: [] as string[],
  });

  const [isLoadingWater, setIsLoadingWater] = useState(true);
  const [isLoadingMeal, setIsLoadingMeal] = useState(true);
  const [isSavingWater, setIsSavingWater] = useState(false);
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [isSendingMealTest, setIsSendingMealTest] = useState(false);

  useEffect(() => {
    fetchWaterSettings();
    fetchMealSettings();
  }, [mealTimeSettings]);

  const fetchWaterSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("water_settings")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (data) {
      setWaterSettings({
        reminder_enabled: data.reminder_enabled,
        reminder_start_hour: data.reminder_start_hour,
        reminder_end_hour: data.reminder_end_hour,
        reminder_interval_minutes: data.reminder_interval_minutes,
        daily_goal_ml: data.daily_goal_ml,
      });
    }
    setIsLoadingWater(false);
  };

  const fetchMealSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("meal_reminder_settings")
      .select("*")
      .eq("user_id", session.user.id)
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
        enabled_meals: defaultMeals.length > 0 ? defaultMeals : ["cafe_manha", "almoco", "lanche_tarde", "jantar", "ceia"]
      }));
    }
    setIsLoadingMeal(false);
  };

  const saveWaterSettings = async () => {
    setIsSavingWater(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("water_settings")
      .upsert({
        user_id: session.user.id,
        ...waterSettings,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas");
    }
    setIsSavingWater(false);
  };

  const saveMealSettings = async () => {
    setIsSavingMeal(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("meal_reminder_settings")
      .upsert({
        user_id: session.user.id,
        ...mealSettings,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações de refeição salvas");
    }
    setIsSavingMeal(false);
  };

  const handleMealToggle = (mealType: string) => {
    const newMeals = mealSettings.enabled_meals.includes(mealType)
      ? mealSettings.enabled_meals.filter(m => m !== mealType)
      : [...mealSettings.enabled_meals, mealType];
    setMealSettings(prev => ({ ...prev, enabled_meals: newMeals }));
  };

  const sendMealReminderTest = async () => {
    if (mealSettings.enabled_meals.length === 0) {
      toast.error("Selecione ao menos uma refeição");
      return;
    }

    setIsSendingMealTest(true);
    try {
      const testMealType = mealSettings.enabled_meals[0];
      const testMeal = mealTimeSettings.find(m => m.meal_type === testMealType);
      const mealLabel = testMeal?.label || testMealType;

      const { error } = await supabase.functions.invoke("send-test-notification", {
        body: {
          title: `🍽️ Hora da ${mealLabel}!`,
          message: `Este é um teste do lembrete de refeição.`,
        },
      });

      if (error) throw error;
      toast.success("Notificação de teste enviada!");
    } catch (err) {
      console.error("Error sending meal test:", err);
      toast.error("Erro ao enviar notificação de teste");
    } finally {
      setIsSendingMealTest(false);
    }
  };

  const [isSendingTest, setIsSendingTest] = useState(false);

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  const sendTestNotification = async () => {
    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-test-notification");
      if (error) throw error;
      toast.success("Notificação de teste enviada!");
    } catch (err) {
      console.error("Error sending test notification:", err);
      toast.error("Erro ao enviar notificação de teste");
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container flex items-center h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Configurações</h1>
        </div>
      </header>

      <main className="container max-w-2xl px-4 py-6 space-y-6 pb-24">
        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Notificações Push</CardTitle>
            </div>
            <CardDescription>
              Receba lembretes e alertas no seu dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSupported ? (
              <p className="text-sm text-muted-foreground">
                Notificações push não são suportadas neste navegador.
              </p>
            ) : permission === "denied" ? (
              <p className="text-sm text-destructive">
                Permissão negada. Ative as notificações nas configurações do navegador.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-toggle">Ativar notificações</Label>
                    <p className="text-xs text-muted-foreground">
                      Lembretes de hidratação e feedback de refeições
                    </p>
                  </div>
                  {pushLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Switch
                      id="push-toggle"
                      checked={isSubscribed}
                      onCheckedChange={handlePushToggle}
                    />
                  )}
                </div>
                {isSubscribed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendTestNotification}
                    disabled={isSendingTest}
                    className="w-full"
                  >
                    {isSendingTest ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Bell className="h-4 w-4 mr-2" />
                    )}
                    Enviar notificação de teste
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Water Reminders */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Lembretes de Hidratação</CardTitle>
            </div>
            <CardDescription>
              Configure os horários e frequência dos lembretes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingWater ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembretes ativos</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber notificações de hidratação
                    </p>
                  </div>
                  <Switch
                    checked={waterSettings.reminder_enabled}
                    onCheckedChange={(checked) =>
                      setWaterSettings((prev) => ({
                        ...prev,
                        reminder_enabled: checked,
                      }))
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Meta diária</Label>
                      <span className="text-sm font-medium">
                        {waterSettings.daily_goal_ml} ml
                      </span>
                    </div>
                    <Slider
                      value={[waterSettings.daily_goal_ml]}
                      onValueChange={([value]) =>
                        setWaterSettings((prev) => ({
                          ...prev,
                          daily_goal_ml: value,
                        }))
                      }
                      min={1000}
                      max={4000}
                      step={250}
                      disabled={!waterSettings.reminder_enabled}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Início
                      </Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={waterSettings.reminder_start_hour}
                        onChange={(e) =>
                          setWaterSettings((prev) => ({
                            ...prev,
                            reminder_start_hour: parseInt(e.target.value),
                          }))
                        }
                        disabled={!waterSettings.reminder_enabled}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>
                            {i.toString().padStart(2, "0")}:00
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Fim
                      </Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={waterSettings.reminder_end_hour}
                        onChange={(e) =>
                          setWaterSettings((prev) => ({
                            ...prev,
                            reminder_end_hour: parseInt(e.target.value),
                          }))
                        }
                        disabled={!waterSettings.reminder_enabled}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>
                            {i.toString().padStart(2, "0")}:00
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Intervalo entre lembretes</Label>
                      <span className="text-sm font-medium">
                        {waterSettings.reminder_interval_minutes} min
                      </span>
                    </div>
                    <Slider
                      value={[waterSettings.reminder_interval_minutes]}
                      onValueChange={([value]) =>
                        setWaterSettings((prev) => ({
                          ...prev,
                          reminder_interval_minutes: value,
                        }))
                      }
                      min={30}
                      max={180}
                      step={15}
                      disabled={!waterSettings.reminder_enabled}
                    />
                  </div>
                </div>

                <Button
                  onClick={saveWaterSettings}
                  disabled={isSavingWater}
                  className="w-full"
                >
                  {isSavingWater ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Salvar configurações
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Meal Feedback Reminders */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">Feedback de Refeições</CardTitle>
            </div>
            <CardDescription>
              Lembretes para registrar como você se sentiu após as refeições
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Os lembretes de feedback são enviados automaticamente 2-24 horas
              após cada refeição registrada, quando as notificações push estão
              ativas.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
