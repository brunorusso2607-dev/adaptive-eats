import { useState, useEffect } from "react";
import { Bell, BellOff, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useMealTimeSettings } from "@/hooks/useMealTimeSettings";

interface MealReminderSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REMINDER_OPTIONS = [
  { value: "0", label: "No horário" },
  { value: "15", label: "15 min antes" },
  { value: "30", label: "30 min antes" },
];

export function MealReminderSettings({ open, onOpenChange }: MealReminderSettingsProps) {
  const [enabled, setEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState("0");
  const [enabledMeals, setEnabledMeals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { isSupported, isSubscribed, permission, subscribe } = usePushSubscription();
  const { settings: mealTimeSettings, isLoading: isLoadingMeals } = useMealTimeSettings();

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("meal_reminder_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading meal reminder settings:", error);
        return;
      }

      if (data) {
        setEnabled(data.enabled);
        setReminderMinutes(String(data.reminder_minutes_before));
        setEnabledMeals(data.enabled_meals || []);
      } else {
        // Default: all meals enabled
        const defaultMeals = mealTimeSettings.map(m => m.meal_type);
        setEnabledMeals(defaultMeals.length > 0 ? defaultMeals : ["breakfast", "lunch", "afternoon_snack", "dinner", "supper"]);
      }

      setIsLoading(false);
    };

    if (open) {
      loadSettings();
    }
  }, [open, mealTimeSettings]);

  // Set default meals when meal settings load
  useEffect(() => {
    if (!isLoadingMeals && mealTimeSettings.length > 0 && enabledMeals.length === 0) {
      setEnabledMeals(mealTimeSettings.map(m => m.meal_type));
    }
  }, [mealTimeSettings, isLoadingMeals, enabledMeals.length]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }

      // Upsert settings
      const { error } = await supabase
        .from("meal_reminder_settings")
        .upsert({
          user_id: session.user.id,
          enabled,
          reminder_minutes_before: parseInt(reminderMinutes),
          enabled_meals: enabledMeals,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (error) throw error;

      toast.success("Configurações salvas!");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving meal reminder settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMealToggle = (mealType: string) => {
    setEnabledMeals(prev => 
      prev.includes(mealType)
        ? prev.filter(m => m !== mealType)
        : [...prev, mealType]
    );
  };

  const handleEnablePush = async () => {
    const success = await subscribe();
    if (success) {
      toast.success("Notificações ativadas!");
    }
  };

  const needsPushPermission = isSupported && !isSubscribed;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col p-0">
        <SheetHeader className="text-left p-6 pb-4 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Lembretes de Refeição
          </SheetTitle>
          <SheetDescription>
            Configure quando receber lembretes para suas refeições
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 space-y-6">
          {/* Push notification warning */}
          {needsPushPermission && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <BellOff className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Notificações desativadas
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    Ative as notificações push para receber lembretes.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleEnablePush}
                  >
                    Ativar notificações
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!isSupported && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">
                Seu navegador não suporta notificações push.
              </p>
            </div>
          )}

          {/* General toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Lembretes ativos</Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações nos horários das refeições
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={!isSupported}
            />
          </div>

          {/* Reminder timing */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Quando lembrar
            </Label>
            <Select value={reminderMinutes} onValueChange={setReminderMinutes} disabled={!enabled}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Individual meal toggles */}
          <div className="space-y-3 pb-4">
            <Label>Refeições com lembrete</Label>
            <div className="space-y-2">
              {isLoadingMeals ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                mealTimeSettings.map(meal => (
                  <div
                    key={meal.meal_type}
                    className="flex items-center space-x-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      id={meal.meal_type}
                      checked={enabledMeals.includes(meal.meal_type)}
                      onCheckedChange={() => handleMealToggle(meal.meal_type)}
                      disabled={!enabled}
                    />
                    <Label
                      htmlFor={meal.meal_type}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      {meal.label}
                      <span className="ml-2 text-xs text-muted-foreground">
                        às {meal.start_hour}h
                      </span>
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Save button - Fixed Footer */}
        <div className="p-4 border-t flex-shrink-0">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
