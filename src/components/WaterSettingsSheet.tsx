import { useState, useEffect } from "react";
import { Droplets, Bell, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
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
          {/* Daily Goal */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Meta diária
            </Label>
            <Select
              value={localSettings.daily_goal_ml.toString()}
              onValueChange={(value) =>
                setLocalSettings({ ...localSettings, daily_goal_ml: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione sua meta" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A recomendação geral é de 35ml por kg de peso corporal
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

        <SheetFooter>
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
