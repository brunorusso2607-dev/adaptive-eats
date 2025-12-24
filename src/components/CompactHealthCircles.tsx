import { useState } from "react";
import { Droplets, Scale, TrendingUp, TrendingDown, Settings } from "lucide-react";
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
  const { percentage: waterPercentage } = useWaterConsumption();

  const isWaterGoalReached = waterPercentage >= 100;
  const cappedWaterPercentage = Math.min(waterPercentage, 100);

  // Calculate weight progress percentage
  const getWeightProgress = () => {
    if (!weightData?.weight_current || !weightData?.weight_goal) return 0;
    
    const current = weightData.weight_current;
    const goal = weightData.weight_goal;
    
    if (weightData.goal_mode === "lose") {
      // For weight loss: progress = how much lost / total to lose
      const startWeight = current; // We don't have start weight, so this is simplified
      const diff = Math.abs(goal - current);
      if (diff === 0) return 100;
      return 0; // Will need history to calculate properly
    } else if (weightData.goal_mode === "gain") {
      const diff = Math.abs(goal - current);
      if (diff === 0) return 100;
      return 0;
    }
    return 0;
  };

  const weightProgress = getWeightProgress();
  const hasWeightGoal = (userGoal === "emagrecer" || userGoal === "ganhar_peso" || userGoal === "manter") && weightData?.weight_current;
  const calcs = weightData ? calculateMacros(weightData) : null;

  return (
    <>
      <div className="flex items-center justify-center gap-6 py-4">
        {/* Water Circle */}
        <button
          onClick={() => setWaterSheetOpen(true)}
          className={cn(
            "relative flex items-center justify-center w-14 h-14 rounded-full",
            "bg-blue-500/5 hover:bg-blue-500/10 transition-all duration-300",
            "hover:scale-105 active:scale-95"
          )}
          aria-label="Abrir rastreador de água"
        >
          <svg className="w-14 h-14 -rotate-90 absolute" viewBox="0 0 56 56">
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-blue-500/20"
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${cappedWaterPercentage * 1.508} 150.8`}
              className={cn(
                "transition-all duration-500",
                isWaterGoalReached ? "stroke-green-500" : "stroke-blue-500"
              )}
            />
          </svg>
          
          <Droplets 
            className={cn(
              "relative z-10 h-5 w-5 transition-colors duration-300",
              isWaterGoalReached ? "text-green-500" : "text-blue-500"
            )} 
          />
        </button>

        {/* Weight Circle */}
        <button
          onClick={() => setWeightSheetOpen(true)}
          className={cn(
            "relative flex items-center justify-center w-14 h-14 rounded-full",
            "bg-muted/50 hover:bg-muted/80 transition-all duration-300",
            "hover:scale-105 active:scale-95",
            hasWeightGoal && "bg-primary/5 hover:bg-primary/10"
          )}
          aria-label="Abrir controle de peso"
        >
          <svg className="w-14 h-14 -rotate-90 absolute" viewBox="0 0 56 56">
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className={hasWeightGoal ? "text-primary/20" : "text-muted-foreground/20"}
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${weightProgress * 1.508} 150.8`}
              className={cn(
                "transition-all duration-500",
                hasWeightGoal ? "stroke-primary" : "stroke-muted-foreground/40"
              )}
            />
          </svg>
          
          <Scale className={cn(
            "relative z-10 h-5 w-5",
            hasWeightGoal ? "text-primary" : "text-muted-foreground"
          )} />
        </button>
      </div>

      {/* Water Tracker Sheet */}
      <Sheet open={waterSheetOpen} onOpenChange={setWaterSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Hidratação
            </SheetTitle>
          </SheetHeader>
          
          <div className="overflow-y-auto h-[calc(85vh-80px)]">
            <WaterTracker />
          </div>
        </SheetContent>
      </Sheet>

      {/* Weight Sheet */}
      <Sheet open={weightSheetOpen} onOpenChange={setWeightSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-5">
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
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                >
                  <Settings className="w-4 h-4 text-primary stroke-[1.5]" />
                  Editar
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
