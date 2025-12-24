import { useState, useEffect } from "react";
import { Droplets, Calculator, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

export function WaterSettingsSheet({
  open,
  onOpenChange,
  settings,
  onSave,
}: WaterSettingsSheetProps) {
  const [localGoal, setLocalGoal] = useState(settings.daily_goal_ml);
  const [isSaving, setIsSaving] = useState(false);
  const [userWeight, setUserWeight] = useState<number | null>(null);
  const [useCalculatedGoal, setUseCalculatedGoal] = useState(false);

  // Calculate recommended goal based on weight (35ml per kg)
  const calculatedGoal = userWeight ? Math.round((userWeight * 35) / 100) * 100 : null;

  useEffect(() => {
    setLocalGoal(settings.daily_goal_ml);
  }, [settings.daily_goal_ml]);

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
    const success = await onSave({ daily_goal_ml: localGoal });
    setIsSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleUseCalculatedGoal = () => {
    if (calculatedGoal) {
      setLocalGoal(calculatedGoal);
      setUseCalculatedGoal(true);
    }
  };

  const handleSelectManualGoal = (value: string) => {
    setLocalGoal(parseInt(value));
    setUseCalculatedGoal(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            Meta de Hidratação
          </SheetTitle>
          <SheetDescription>
            Configure sua meta diária de água
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
              value={useCalculatedGoal ? "" : localGoal.toString()}
              onValueChange={handleSelectManualGoal}
            >
              <SelectTrigger className={cn(useCalculatedGoal && "opacity-60")}>
                <SelectValue placeholder="Selecione sua meta">
                  {useCalculatedGoal 
                    ? "Meta calculada ativa" 
                    : GOAL_OPTIONS.find(o => o.value === localGoal)?.label || "Selecione"
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
              {(localGoal / 1000).toFixed(1)}L
            </p>
            <p className="text-xs text-muted-foreground">
              ≈ {Math.round(localGoal / 250)} copos de 250ml
            </p>
          </div>
        </div>

        <SheetFooter className="pb-6">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            {isSaving ? "Salvando..." : "Salvar meta"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
