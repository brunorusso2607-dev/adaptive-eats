import { useState } from "react";
import { Droplets, Scale, TrendingUp, TrendingDown, Pencil, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWaterConsumption } from "@/hooks/useWaterConsumption";
import { WaterTracker } from "@/components/WaterTracker";
import CalorieSpeedometer from "@/components/CalorieSpeedometer";
import WeightProgressBar from "@/components/WeightProgressBar";
import { calculateMacros } from "@/components/WeightGoalSetup";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface WeightData {
  weight_current: number | null;
  weight_goal: number | null;
  height: number | null;
  age: number | null;
  sex: "male" | "female" | null;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal_mode: "lose" | "gain" | "maintain" | null;
}

interface DailyConsumption {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface CompactHealthCirclesProps {
  userGoal?: string | null;
  weightData?: WeightData | null;
  dailyConsumption?: DailyConsumption;
  onOpenWeightSetup?: () => void;
  onOpenWeightUpdate?: () => void;
  onOpenWeightHistory?: () => void;
}

export function CompactHealthCircles({
  userGoal,
  weightData,
  dailyConsumption = { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 },
  onOpenWeightSetup,
  onOpenWeightUpdate,
  onOpenWeightHistory,
}: CompactHealthCirclesProps) {
  const [waterSheetOpen, setWaterSheetOpen] = useState(false);
  const [weightSheetOpen, setWeightSheetOpen] = useState(false);
  const { percentage: waterPercentage, settings, totalToday } = useWaterConsumption();

  const isWaterGoalReached = waterPercentage >= 100;
  const cappedWaterPercentage = Math.min(waterPercentage, 100);
  const dailyGoal = settings?.daily_goal_ml || 2000;
  const remainingWater = Math.max(0, dailyGoal - totalToday);

  // Format water values
  const formatWater = (ml: number) => {
    if (ml >= 1000) {
      return `${(ml / 1000).toFixed(1).replace('.0', '')}L`;
    }
    return `${ml}ml`;
  };

  // Calculate weight difference
  const getWeightDiff = () => {
    if (!weightData?.weight_current || !weightData?.weight_goal) return null;
    const diff = weightData.weight_goal - weightData.weight_current;
    return diff;
  };

  const weightDiff = getWeightDiff();
  const hasWeightGoal = (userGoal === "emagrecer" || userGoal === "ganhar_peso" || userGoal === "manter") && weightData?.weight_current;
  const calcs = weightData ? calculateMacros(weightData) : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {/* Water Mini-Card */}
        <button
          onClick={() => setWaterSheetOpen(true)}
          className={cn(
            "flex flex-col items-start p-3 rounded-xl",
            "bg-blue-500/5 border border-blue-500/10",
            "hover:bg-blue-500/10 hover:border-blue-500/20",
            "transition-all duration-200 active:scale-[0.98]",
            "text-left"
          )}
          aria-label="Abrir rastreador de água"
        >
          <div className="flex items-center gap-2 w-full mb-2">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              isWaterGoalReached ? "bg-emerald-500/20" : "bg-blue-500/20"
            )}>
              <Droplets className={cn(
                "h-4 w-4",
                isWaterGoalReached ? "text-emerald-500" : "text-blue-500"
              )} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Hidratação</span>
          </div>
          
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className={cn(
              "text-lg font-semibold",
              isWaterGoalReached ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
            )}>
              {formatWater(totalToday)}
            </span>
            <span className="text-xs text-muted-foreground">/ {formatWater(dailyGoal)}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-blue-500/10 rounded-full overflow-hidden mb-1.5">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isWaterGoalReached ? "bg-emerald-500" : "bg-blue-500"
              )}
              style={{ width: `${cappedWaterPercentage}%` }}
            />
          </div>

          <span className="text-[10px] text-muted-foreground">
            {isWaterGoalReached 
              ? "Meta atingida!" 
              : `Faltam ${formatWater(remainingWater)}`
            }
          </span>
        </button>

        {/* Weight Mini-Card */}
        <button
          onClick={() => setWeightSheetOpen(true)}
          className={cn(
            "flex flex-col items-start p-3 rounded-xl",
            "bg-primary/5 border border-primary/10",
            "hover:bg-primary/10 hover:border-primary/20",
            "transition-all duration-200 active:scale-[0.98]",
            "text-left"
          )}
          aria-label="Abrir controle de peso"
        >
          <div className="flex items-center gap-2 w-full mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/20">
              {userGoal === "ganhar_peso" 
                ? <TrendingUp className="h-4 w-4 text-primary" />
                : userGoal === "manter"
                  ? <Scale className="h-4 w-4 text-primary" />
                  : <TrendingDown className="h-4 w-4 text-primary" />
              }
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {userGoal === "ganhar_peso" ? "Ganho" : userGoal === "manter" ? "Peso" : "Peso"}
            </span>
          </div>
          
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className="text-lg font-semibold text-primary">
              {weightData?.weight_current ? `${weightData.weight_current}kg` : "--"}
            </span>
            {weightData?.weight_goal && userGoal !== "manter" && (
              <span className="text-xs text-muted-foreground">→ {weightData.weight_goal}kg</span>
            )}
          </div>

          {/* Progress indicator or context */}
          {hasWeightGoal && weightDiff !== null ? (
            <>
              <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden mb-1.5">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: weightDiff === 0 ? '100%' : '15%' }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {weightDiff === 0 
                  ? "Meta atingida!" 
                  : userGoal === "manter"
                    ? "Mantendo peso"
                    : `${Math.abs(weightDiff).toFixed(1)}kg p/ meta`
                }
              </span>
            </>
          ) : (
            <>
              <div className="w-full h-1.5 bg-muted rounded-full mb-1.5" />
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" />
                Definir meta
              </span>
            </>
          )}
        </button>
      </div>

      {/* Water Tracker Sheet */}
      <Sheet open={waterSheetOpen} onOpenChange={setWaterSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] p-6">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Hidratação
            </SheetTitle>
          </SheetHeader>
          
          <div className="overflow-y-auto h-[calc(80vh-100px)]">
            <WaterTracker />
          </div>
        </SheetContent>
      </Sheet>

      {/* Weight Sheet */}
      <Sheet open={weightSheetOpen} onOpenChange={setWeightSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] p-6">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              {userGoal === "ganhar_peso" 
                ? <TrendingUp className="h-5 w-5 text-primary" />
                : userGoal === "manter"
                  ? <Scale className="h-5 w-5 text-primary" />
                  : <TrendingDown className="h-5 w-5 text-primary" />
              }
              {userGoal === "ganhar_peso" 
                ? "Ganho de Peso" 
                : userGoal === "manter"
                  ? "Manutenção"
                  : "Emagrecimento"}
            </SheetTitle>
          </SheetHeader>
          
          <div className="overflow-y-auto h-[calc(85vh-80px)]">
          {hasWeightGoal && calcs ? (
            <div className="space-y-4 pb-6">
              {/* Header info */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {userGoal === "manter"
                    ? `Mantendo ${weightData?.weight_current}kg`
                    : `${weightData?.weight_current}kg → ${weightData?.weight_goal}kg`}
                </p>
                <button 
                  onClick={() => {
                    setWeightSheetOpen(false);
                    onOpenWeightSetup?.();
                  }}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  aria-label="Editar peso"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* Calorie Speedometer */}
              <CalorieSpeedometer
                targetCalories={calcs.targetCalories}
                consumedCalories={Math.round(dailyConsumption.totalCalories)}
                protein={calcs.protein}
                consumedProtein={Math.round(dailyConsumption.totalProtein)}
                carbs={calcs.carbs}
                consumedCarbs={Math.round(dailyConsumption.totalCarbs)}
                fat={calcs.fat}
                consumedFat={Math.round(dailyConsumption.totalFat)}
                mode={calcs.mode}
              />
              
              {/* Weight Progress Bar */}
              <WeightProgressBar
                currentWeight={weightData?.weight_current || 0}
                goalWeight={weightData?.weight_goal || 0}
                weeklyChange={calcs.weeklyChange}
                weeksToGoal={calcs.weeksToGoal}
                mode={calcs.mode}
              />

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <button 
                  onClick={() => {
                    setWeightSheetOpen(false);
                    onOpenWeightUpdate?.();
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                >
                  <Scale className="w-4 h-4 text-primary stroke-[1.5]" />
                  Atualizar Peso
                </button>
                <span className="text-muted-foreground/40">|</span>
                <button 
                  onClick={() => {
                    setWeightSheetOpen(false);
                    onOpenWeightHistory?.();
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                >
                  <TrendingUp className="w-4 h-4 text-primary stroke-[1.5]" />
                  Ver Evolução
                </button>
              </div>

              {/* Footer note */}
              <div className="border-t border-border/40 pt-3">
                <p className="text-xs text-muted-foreground text-center">
                  *Estimativa baseada em {
                    userGoal === "ganhar_peso" 
                      ? "superávit calórico saudável" 
                      : userGoal === "manter"
                        ? "balanço calórico equilibrado"
                        : "déficit calórico saudável"
                  }. Resultados variam individualmente.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Scale className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-foreground font-medium">Nenhuma meta configurada</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Configure seu peso para metas personalizadas
                </p>
              </div>
              <button
                onClick={() => {
                  setWeightSheetOpen(false);
                  onOpenWeightSetup?.();
                }}
                className="text-primary text-sm font-medium hover:underline"
              >
                Configurar agora
              </button>
            </div>
          )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
