import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Droplets, UtensilsCrossed, Clock, Loader2, Send, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useMealTimeSettings } from "@/hooks/useMealTimeSettings";
import { useUserCountry, DEFAULT_COUNTRY } from "@/hooks/useUserCountry";
import { toast } from "sonner";

const COUNTRIES = [
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "IT", name: "Itália", flag: "🇮🇹" },
  { code: "FR", name: "França", flag: "🇫🇷" },
  { code: "DE", name: "Alemanha", flag: "🇩🇪" },
  { code: "ES", name: "Espanha", flag: "🇪🇸" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧" },
  { code: "CO", name: "Colômbia", flag: "🇨🇴" },
];

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
  
  // Usar hook centralizado para país
  const { country: initialCountry, isLoading: isLoadingCountryHook } = useUserCountry();

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

  // Country and timezone settings - país vem do hook centralizado
  const [userCountry, setUserCountry] = useState<string>(DEFAULT_COUNTRY);
  const [userTimezone, setUserTimezone] = useState("America/Sao_Paulo");
  const [isLoadingTimezone, setIsLoadingTimezone] = useState(true);
  const [isSavingCountry, setIsSavingCountry] = useState(false);
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);

  // Sincronizar país do hook centralizado
  useEffect(() => {
    if (!isLoadingCountryHook) {
      setUserCountry(initialCountry);
    }
  }, [initialCountry, isLoadingCountryHook]);

  useEffect(() => {
    fetchWaterSettings();
    fetchMealSettings();
    fetchTimezone();
  }, [mealTimeSettings]);

  const fetchTimezone = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsLoadingTimezone(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", session.user.id)
      .maybeSingle();

    if (data?.timezone) {
      setUserTimezone(data.timezone);
    }
    setIsLoadingTimezone(false);
  };

  const saveTimezone = async (newTimezone: string) => {
    setIsSavingTimezone(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("profiles")
      .update({ timezone: newTimezone })
      .eq("id", session.user.id);

    if (error) {
      toast.error("Erro ao salvar fuso horário");
    } else {
      setUserTimezone(newTimezone);
      toast.success("Fuso horário atualizado");
    }
    setIsSavingTimezone(false);
  };

  const detectTimezone = async () => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected !== userTimezone) {
      await saveTimezone(detected);
    } else {
      toast.info("Fuso horário já está correto");
    }
  };

  const saveCountry = async (newCountry: string) => {
    setIsSavingCountry(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("profiles")
      .update({ country: newCountry })
      .eq("id", session.user.id);

    if (error) {
      toast.error("Erro ao salvar país");
    } else {
      setUserCountry(newCountry);
      const countryName = COUNTRIES.find(c => c.code === newCountry)?.name || newCountry;
      toast.success(`País alterado para ${countryName}`);
    }
    setIsSavingCountry(false);
  };

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
        enabled_meals: defaultMeals.length > 0 ? defaultMeals : ["cafe_manha", "almoco", "lanche", "jantar", "ceia"]
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
        {/* Region/Country Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Sua Região</CardTitle>
            </div>
            <CardDescription>
              Define quais alimentos e receitas serão sugeridos para você
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCountryHook ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* País */}
                <div className="space-y-3">
                  <Label>País de origem</Label>
                  <Select
                    value={userCountry}
                    onValueChange={saveCountry}
                    disabled={isSavingCountry}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione seu país" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <span className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span>{country.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Isso ajuda a sugerir alimentos populares na sua região, como {
                      userCountry === "BR" ? "pão de queijo, açaí" :
                      userCountry === "US" ? "hamburgers, mac & cheese" :
                      userCountry === "JP" ? "ramen, sushi" :
                      userCountry === "MX" ? "tacos, burritos" :
                      userCountry === "IT" ? "pizza, pasta" :
                      "pratos típicos locais"
                    }.
                  </p>
                </div>

                <Separator />

                {/* Fuso horário */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Fuso horário
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1 p-3 rounded-lg border bg-muted/50">
                      <p className="text-sm font-medium">{userTimezone}</p>
                      <p className="text-xs text-muted-foreground">
                        Hora atual: {new Date().toLocaleTimeString("pt-BR", { 
                          timeZone: userTimezone,
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={detectTimezone}
                      disabled={isSavingTimezone}
                      className="shrink-0"
                    >
                      {isSavingTimezone ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Detectar"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usado para lembretes e horários de refeição. Clique em "Detectar" para atualizar automaticamente.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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

        {/* Meal Reminders */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Lembretes de Refeição</CardTitle>
            </div>
            <CardDescription>
              Configure alertas para os horários das suas refeições
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingMeal ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembretes ativos</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber alertas nos horários das refeições
                    </p>
                  </div>
                  <Switch
                    checked={mealSettings.enabled}
                    onCheckedChange={(checked) =>
                      setMealSettings((prev) => ({
                        ...prev,
                        enabled: checked,
                      }))
                    }
                  />
                </div>

                {mealSettings.enabled && (
                  <>
                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Quando lembrar
                        </Label>
                        <span className="text-sm font-medium">
                          {mealSettings.reminder_minutes_before === 0
                            ? "No horário"
                            : `${mealSettings.reminder_minutes_before} min antes`}
                        </span>
                      </div>
                      <Slider
                        value={[mealSettings.reminder_minutes_before]}
                        onValueChange={([value]) =>
                          setMealSettings((prev) => ({
                            ...prev,
                            reminder_minutes_before: value,
                          }))
                        }
                        min={0}
                        max={30}
                        step={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Refeições com lembrete</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {mealTimeSettings.map(meal => (
                          <div
                            key={meal.meal_type}
                            className="flex items-center space-x-2 rounded-lg border p-2"
                          >
                            <Checkbox
                              id={`meal-settings-${meal.meal_type}`}
                              checked={mealSettings.enabled_meals.includes(meal.meal_type)}
                              onCheckedChange={() => handleMealToggle(meal.meal_type)}
                            />
                            <Label
                              htmlFor={`meal-settings-${meal.meal_type}`}
                              className="text-sm cursor-pointer font-normal"
                            >
                              {meal.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={saveMealSettings}
                    disabled={isSavingMeal}
                    className="flex-1"
                  >
                    {isSavingMeal && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Salvar
                  </Button>
                  {mealSettings.enabled && isSubscribed && (
                    <Button
                      variant="outline"
                      onClick={sendMealReminderTest}
                      disabled={isSendingMealTest}
                    >
                      {isSendingMealTest ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </>
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
