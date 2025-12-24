import { useState, useEffect } from "react";
import { Droplets, Bell, Clock, Calculator, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
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

interface WaterSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: WaterSettings;
  onSave: (settings: Partial<WaterSettings>) => Promise<boolean>;
}

const GOAL_OPTIONS = [
  { value: 1500, label: "1,5 litros" },
  { value: 2000, label: "2 litros" },
  { value: 2500, label: "2,5 litros" },
  { value: 3000, label: "3 litros" },
  { value: 3500, label: "3,5 litros" },
  { value: 4000, label: "4 litros" },
];

const INTERVAL_OPTIONS = [
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 horas" },
];

export function WaterSettingsSheet({
  open,
  onOpenChange,
  settings,
  onSave,
}: WaterSettingsSheetProps) {
  const [localSettings, setLocalSettings] = useState<WaterSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [userWeight, setUserWeight] = useState<number | null>(null);
  const [useCalculatedGoal, setUseCalculatedGoal] = useState(false);

  // Calculate recommended goal based on weight (35ml per kg)
  const calculatedGoal = userWeight ? Math.round((userWeight * 35) / 100) * 100 : null;

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Fetch user weight from profile
  useEffect(() => {
    const fetchUserWeight = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("weight_current")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.weight_current) {
        setUserWeight(data.weight_current);
        
        // Check if current goal matches calculated goal
        const calc = Math.round((data.weight_current * 35) / 100) * 100;
        if (settings.daily_goal_ml === calc) {
          setUseCalculatedGoal(true);
        }
      }
    };

    if (open) {
      fetchUserWeight();
    }
  }, [open, settings.daily_goal_ml]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(localSettings);
    setIsSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleReminderToggle = async (enabled: boolean) => {
    setLocalSettings({ ...localSettings, reminder_enabled: enabled });
    
    if (enabled && "Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setLocalSettings({ ...localSettings, reminder_enabled: false });
      }
    }
  };

  const handleUseCalculatedGoal = () => {
    if (calculatedGoal) {
      setLocalSettings({ ...localSettings, daily_goal_ml: calculatedGoal });
      setUseCalculatedGoal(true);
    }
  };

  const handleSelectManualGoal = (value: string) => {
    setLocalSettings({ ...localSettings, daily_goal_ml: parseInt(value) });
    setUseCalculatedGoal(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            Configurações de Água
          </SheetTitle>
          <SheetDescription>
            Configure sua meta diária e lembretes
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Calculated Goal Recommendation */}
          {calculatedGoal && userWeight && (
            <div 
              className={cn(
                "p-4 rounded-xl border-2 transition-all cursor-pointer",
                useCalculatedGoal 
                  ? "border-blue-500 bg-blue-500/10" 
                  : "border-border hover:border-blue-500/50"
              )}
              onClick={handleUseCalculatedGoal}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  useCalculatedGoal ? "bg-blue-500 text-white" : "bg-blue-500/20"
                )}>
                  <Calculator className={cn("h-5 w-5", !useCalculatedGoal && "text-blue-500")} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">Meta calculada</h4>
                    {useCalculatedGoal && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                        Ativa
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {(calculatedGoal / 1000).toFixed(1)}L
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Baseado no seu peso ({userWeight}kg × 35ml)
                  </p>
                </div>
                {useCalculatedGoal && (
                  <Sparkles className="h-5 w-5 text-blue-500 shrink-0" />
                )}
              </div>
            </div>
          )}

          {/* Manual Goal Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              {calculatedGoal ? "Ou escolha manualmente" : "Meta diária"}
            </Label>
            <Select
              value={useCalculatedGoal ? "" : localSettings.daily_goal_ml.toString()}
              onValueChange={handleSelectManualGoal}
            >
              <SelectTrigger className={cn(useCalculatedGoal && "opacity-60")}>
                <SelectValue placeholder="Selecione sua meta">
                  {useCalculatedGoal 
                    ? "Meta calculada ativa" 
                    : GOAL_OPTIONS.find(o => o.value === localSettings.daily_goal_ml)?.label || "Selecione"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {GOAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!calculatedGoal && (
              <p className="text-xs text-muted-foreground">
                💡 Cadastre seu peso no perfil para calcular a meta ideal (35ml/kg)
              </p>
            )}
          </div>

          {/* Current Goal Display */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Meta atual</p>
            <p className="text-3xl font-bold text-foreground">
              {(localSettings.daily_goal_ml / 1000).toFixed(1)}L
            </p>
            <p className="text-xs text-muted-foreground">
              ≈ {Math.round(localSettings.daily_goal_ml / 250)} copos de 250ml
            </p>
          </div>

          {/* Reminder Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Lembretes
              </Label>
              <p className="text-xs text-muted-foreground">
                Receba notificações para beber água
              </p>
            </div>
            <Switch
              checked={localSettings.reminder_enabled}
              onCheckedChange={handleReminderToggle}
            />
          </div>

          {localSettings.reminder_enabled && (
            <>
              {/* Reminder Interval */}
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
                      reminder_interval_minutes: parseInt(value),
                    })
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
                <Label>Horário dos lembretes</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={localSettings.reminder_start_hour.toString()}
                    onValueChange={(value) =>
                      setLocalSettings({
                        ...localSettings,
                        reminder_start_hour: parseInt(value),
                      })
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
                    value={localSettings.reminder_end_hour.toString()}
                    onValueChange={(value) =>
                      setLocalSettings({
                        ...localSettings,
                        reminder_end_hour: parseInt(value),
                      })
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

        <SheetFooter className="pb-6">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            {isSaving ? "Salvando..." : "Salvar configurações"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
