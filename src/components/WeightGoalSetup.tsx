import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Scale, Ruler, Calendar, User, Activity, Target, 
  TrendingDown, TrendingUp, Minus, Flame, Beef, Wheat, Loader2, Check, X, Sparkles,
  AlertTriangle, Info, Dumbbell, Utensils
} from "lucide-react";
import { useNutritionalStrategies, deriveGoalFromStrategy } from "@/hooks/useNutritionalStrategies";
import { cn } from "@/lib/utils";
import { StrategyAccordion, type NutritionalStrategy } from "@/components/StrategyAccordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CalorieSpeedometer from "@/components/CalorieSpeedometer";
import WeightProgressBar from "@/components/WeightProgressBar";
import { usePhysicalInputHandlers } from "@/hooks/usePhysicalInputHandlers";

type GoalMode = "lose" | "gain" | "maintain";

type WeightGoalData = {
  weight_current: number | null;
  weight_goal: number | null;
  height: number | null;
  age: number | null;
  sex: "male" | "female" | null;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal_mode: GoalMode | null;
  strategy_id?: string | null;
};

type WeightGoalSetupProps = {
  onClose: () => void;
  onSave: (data: WeightGoalData & { calculations: MacroCalculations }) => void;
  onGeneratePlan?: (data: WeightGoalData & { calculations: MacroCalculations }) => void;
  onOpenMealPlanGenerator?: (data: WeightGoalData & { calculations: MacroCalculations }) => void;
  onPlanRegenerated?: () => void;
  onRegenerateStart?: () => void;
  onRegenerateEnd?: () => void;
  initialData?: Partial<WeightGoalData>;
  hasExistingPlan?: boolean;
};

export type MacroCalculations = {
  tmb: number;
  get: number;
  targetCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  weeklyChange: number;
  weeksToGoal: number;
  mode: "lose" | "gain" | "maintain";
};

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentário", description: "Pouco ou nenhum exercício", factor: 1.2 },
  { id: "light", label: "Leve", description: "Exercício 1-3x/semana", factor: 1.375 },
  { id: "moderate", label: "Moderado", description: "Exercício 3-5x/semana", factor: 1.55 },
  { id: "active", label: "Ativo", description: "Exercício 6-7x/semana", factor: 1.725 },
  { id: "very_active", label: "Muito Ativo", description: "Exercício intenso diário", factor: 1.9 },
];

// IMC Classification
type BMICategory = "underweight" | "normal" | "overweight" | "obese_1" | "obese_2" | "obese_3";

function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  if (bmi < 35) return "obese_1";
  if (bmi < 40) return "obese_2";
  return "obese_3";
}

function getBMICategoryLabel(category: BMICategory): string {
  const labels: Record<BMICategory, string> = {
    underweight: "Baixo peso",
    normal: "Peso normal",
    overweight: "Sobrepeso",
    obese_1: "Obesidade grau I",
    obese_2: "Obesidade grau II",
    obese_3: "Obesidade grau III",
  };
  return labels[category];
}

type HealthRisk = {
  level: "info" | "warning" | "danger";
  title: string;
  message: string;
  suggestion?: string;
};

/**
 * Calculate the maximum realistic muscular weight for a person
 * Adjusted based on activity level - athletes can carry more muscle mass
 * 
 * For very active/active people (athletes, bodybuilders):
 * - Men: BMI up to 32-33 is achievable with significant muscle mass
 * - Women: BMI up to 28-29 is achievable with significant muscle mass
 * 
 * For sedentary/moderate activity:
 * - Men: BMI ~28 is realistic maximum for natural muscle
 * - Women: BMI ~25 is realistic maximum
 */
function getMaxRealisticMuscularWeight(
  heightCm: number, 
  sex: "male" | "female" | null,
  activityLevel: string
): number {
  const heightM = heightCm / 100;
  const isHighlyActive = activityLevel === "active" || activityLevel === "very_active";
  
  let maxMuscularBMI: number;
  if (sex === "male") {
    // Athletes/bodybuilders can reach higher BMI with muscle
    maxMuscularBMI = isHighlyActive ? 32 : 28;
  } else {
    maxMuscularBMI = isHighlyActive ? 28 : 25;
  }
  
  return Math.round(maxMuscularBMI * heightM * heightM);
}

/**
 * Get a healthy weight range for a given height (BMI 18.5-24.9)
 */
function getHealthyWeightRange(heightCm: number): { min: number; max: number } {
  const heightM = heightCm / 100;
  return {
    min: Math.round(18.5 * heightM * heightM),
    max: Math.round(24.9 * heightM * heightM),
  };
}

/**
 * Validate if a nutritional strategy is compatible with activity level
 * Based on scientific evidence for muscle preservation and body composition
 */
type StrategyActivityWarning = {
  strategyKey: string;
  incompatibleLevels: string[];
  level: "warning" | "danger";
  title: string;
  message: string;
  suggestion: string;
};

const STRATEGY_ACTIVITY_VALIDATIONS: StrategyActivityWarning[] = [
  {
    strategyKey: "cutting",
    incompatibleLevels: ["sedentary", "light"],
    level: "danger",
    title: "Cutting requer treino de força",
    message: "Cutting sem exercício resulta em perda de músculo, não de gordura. Estudos mostram que déficit calórico sem treino de resistência causa perda de 25-50% de massa magra.",
    suggestion: "Aumente para pelo menos 'Moderado' (3-5x/semana com treino de força) ou escolha 'Emagrecimento' que é mais flexível.",
  },
  {
    strategyKey: "fitness",
    incompatibleLevels: ["sedentary", "light"],
    level: "danger",
    title: "Recomposição corporal requer treino de força",
    message: "A estratégia Fitness (recomposição) só funciona com estímulo muscular adequado. Sem treino, não há como ganhar músculo enquanto perde gordura.",
    suggestion: "Aumente para pelo menos 'Moderado' (3-5x/semana com foco em musculação) ou escolha 'Manutenção'.",
  },
  {
    strategyKey: "gain_weight",
    incompatibleLevels: ["sedentary", "light"],
    level: "warning",
    title: "Risco de ganho de gordura",
    message: "Sem exercício, o excedente calórico de +400kcal será convertido majoritariamente em gordura, não músculo. Pesquisas indicam que apenas 30-40% do ganho será massa magra sem treino.",
    suggestion: "Inicie treino de força 3-5x/semana para que o ganho seja principalmente muscular, ou reduza o superávit.",
  },
];

function calculateHealthRisks(data: WeightGoalData, strategyKey?: string): HealthRisk[] {
  const risks: HealthRisk[] = [];
  
  if (!data.weight_current || !data.weight_goal || !data.height || !data.goal_mode) {
    return risks;
  }

  const heightInMeters = data.height / 100;
  const currentBMI = data.weight_current / (heightInMeters * heightInMeters);
  const goalBMI = data.weight_goal / (heightInMeters * heightInMeters);
  
  const currentCategory = getBMICategory(currentBMI);
  const goalCategory = getBMICategory(goalBMI);
  
  const isSedentaryOrLight = data.activity_level === "sedentary" || data.activity_level === "light";
  const weightDiff = data.weight_goal - data.weight_current;
  
  // Calculate realistic limits based on sex, height, and activity level
  const maxMuscularWeight = getMaxRealisticMuscularWeight(data.height, data.sex, data.activity_level);
  const healthyRange = getHealthyWeightRange(data.height);
  const sexLabel = data.sex === "female" ? "uma mulher" : data.sex === "male" ? "um homem" : "uma pessoa";
  const isHighlyActive = data.activity_level === "active" || data.activity_level === "very_active";

  // ============================================================
  // VALIDAÇÃO DE ESTRATÉGIA vs NÍVEL DE ATIVIDADE (CIENTÍFICO)
  // ============================================================
  if (strategyKey) {
    const validation = STRATEGY_ACTIVITY_VALIDATIONS.find(v => v.strategyKey === strategyKey);
    if (validation && validation.incompatibleLevels.includes(data.activity_level)) {
      risks.push({
        level: validation.level,
        title: validation.title,
        message: validation.message,
        suggestion: validation.suggestion,
      });
      
      // Se for danger, retorna imediatamente (bloqueia)
      if (validation.level === "danger") {
        return risks;
      }
    }
  }

  // CRITICAL: Check for contradictory goal vs weight combination FIRST
  
  // "Emagrecer" but goal weight is >= current weight
  if (data.goal_mode === "lose" && data.weight_goal >= data.weight_current) {
    risks.push({
      level: "danger",
      title: "Objetivo contraditório",
      message: `Para emagrecer, o peso desejado (${data.weight_goal}kg) precisa ser menor que o peso atual (${data.weight_current}kg).`,
      suggestion: "Ajuste o peso desejado para um valor menor ou mude o objetivo para 'Ganhar Peso'.",
    });
    return risks;
  }

  // "Ganhar Peso" but goal weight is <= current weight
  if (data.goal_mode === "gain" && data.weight_goal <= data.weight_current) {
    risks.push({
      level: "danger",
      title: "Objetivo contraditório",
      message: `Para ganhar peso, o peso desejado (${data.weight_goal}kg) precisa ser maior que o peso atual (${data.weight_current}kg).`,
      suggestion: "Ajuste o peso desejado para um valor maior ou mude o objetivo para 'Emagrecer'.",
    });
    return risks;
  }

  // Check if goal weight exceeds realistic muscular limits
  if (data.goal_mode === "gain" && data.weight_goal > maxMuscularWeight) {
    
    // Severe obesity (BMI 40+) - absolutely dangerous regardless of activity
    if (goalBMI >= 40) {
      risks.push({
        level: "danger",
        title: "Peso fisicamente impossível",
        message: `Para ${sexLabel} de ${data.height}cm, ${data.weight_goal}kg (IMC ${goalBMI.toFixed(1)}) excede limites saudáveis mesmo para atletas de elite.`,
        suggestion: `Peso máximo atlético sugerido: ~${maxMuscularWeight}kg.`,
      });
      return risks;
    }
    
    // For highly active people, BMI 30-40 is just a warning (could be muscle)
    if (isHighlyActive) {
      risks.push({
        level: "warning",
        title: "Peso elevado para sua altura",
        message: `${data.weight_goal}kg (IMC ${goalBMI.toFixed(1)}) é alto, mas pode ser alcançável com massa muscular significativa.`,
        suggestion: `Acompanhe com profissional de saúde. Meta atlética sugerida: ~${maxMuscularWeight}kg.`,
      });
    } else {
      // For sedentary/moderate, BMI 30+ is still a danger (likely fat, not muscle)
      risks.push({
        level: goalBMI >= 35 ? "danger" : "warning",
        title: goalBMI >= 35 ? "Risco de obesidade" : "Atenção ao peso",
        message: `${data.weight_goal}kg = IMC ${goalBMI.toFixed(1)} (${getBMICategoryLabel(goalCategory)}). Sem exercício intenso, é difícil atingir esse peso com músculo.`,
        suggestion: `Aumente a atividade física ou ajuste a meta para ~${maxMuscularWeight}kg.`,
      });
    }
  }

  // For cases without sex defined OR within muscular limits but still obese by BMI
  if (data.goal_mode === "gain" && goalCategory.startsWith("obese") && data.weight_goal <= maxMuscularWeight) {
    // This catches edge cases where someone might be within "muscular limits" but still obese
    risks.push({
      level: "warning",
      title: "Atenção: IMC elevado",
      message: `IMC projetado de ${goalBMI.toFixed(1)} está na faixa de ${getBMICategoryLabel(goalCategory)}.`,
      suggestion: "Este peso pode ser saudável para atletas musculosos, mas consulte um profissional.",
    });
  }

  // WARNING: Goal weight leads to overweight for sedentary
  if (data.goal_mode === "gain" && goalCategory === "overweight" && isSedentaryOrLight) {
    risks.push({
      level: "warning",
      title: "Atenção: Risco de sobrepeso",
      message: `IMC projetado de ${goalBMI.toFixed(1)} (${getBMICategoryLabel(goalCategory)}). Sem exercício, o ganho será principalmente gordura.`,
      suggestion: "Inicie exercícios de força para que o ganho seja de massa muscular.",
    });
  }

  // DANGER: Goal weight is underweight
  if (goalCategory === "underweight" && data.goal_mode === "lose") {
    risks.push({
      level: "danger",
      title: "Risco de baixo peso",
      message: `Com ${data.weight_goal}kg você teria IMC de ${goalBMI.toFixed(1)} (${getBMICategoryLabel(goalCategory)}). Isso pode causar desnutrição.`,
      suggestion: `Peso mínimo saudável para ${data.height}cm: ${healthyRange.min}kg.`,
    });
  }

  // Currently underweight trying to lose more
  if (currentCategory === "underweight" && data.goal_mode === "lose") {
    risks.push({
      level: "danger",
      title: "Não recomendado",
      message: `Seu IMC atual é ${currentBMI.toFixed(1)} (${getBMICategoryLabel(currentCategory)}). Perder mais peso é perigoso.`,
      suggestion: "Consulte um profissional de saúde. Você já está abaixo do peso ideal.",
    });
  }

  // WARNING: Extreme weight change (only if no danger risks)
  const hasDanger = risks.some(r => r.level === "danger");
  if (!hasDanger && Math.abs(weightDiff) > 20) {
    risks.push({
      level: "warning",
      title: "Meta ambiciosa",
      message: `Mudança de ${Math.abs(weightDiff)}kg é significativa. Metas distantes podem desmotivar.`,
      suggestion: "Considere dividir em metas menores de 5-10kg por vez.",
    });
  }

  // WARNING: Gaining weight while already overweight
  if (data.goal_mode === "gain" && (currentCategory === "overweight" || currentCategory.startsWith("obese"))) {
    risks.push({
      level: "warning",
      title: "Já acima do peso ideal",
      message: `Seu IMC atual é ${currentBMI.toFixed(1)} (${getBMICategoryLabel(currentCategory)}).`,
      suggestion: "Consulte um nutricionista esportivo se o objetivo for ganho de massa muscular.",
    });
  }

  // INFO: Good combination - healthy weight gain with exercise
  if (data.goal_mode === "gain" && goalCategory === "normal" && !isSedentaryOrLight) {
    risks.push({
      level: "info",
      title: "Combinação adequada",
      message: `IMC projetado de ${goalBMI.toFixed(1)} está saudável. Com exercício, você pode ganhar massa muscular.`,
    });
  }

  return risks;
}

export function calculateMacros(data: WeightGoalData): MacroCalculations | null {
  if (!data.weight_current || !data.weight_goal || !data.height || !data.age || !data.sex || !data.goal_mode) {
    return null;
  }

  // Mifflin-St Jeor Formula for BMR
  let tmb: number;
  if (data.sex === "male") {
    tmb = (10 * data.weight_current) + (6.25 * data.height) - (5 * data.age) + 5;
  } else {
    tmb = (10 * data.weight_current) + (6.25 * data.height) - (5 * data.age) - 161;
  }

  // Get activity factor
  const activityFactor = ACTIVITY_LEVELS.find(a => a.id === data.activity_level)?.factor || 1.55;
  
  // Total Daily Energy Expenditure
  const get = Math.round(tmb * activityFactor);
  
  // Use the user-selected goal mode
  const mode = data.goal_mode;
  let targetCalories: number;
  let protein: number;
  
  if (mode === "lose") {
    // Weight loss mode
    const deficit = 500; // 500 kcal deficit for ~0.5kg/week loss
    targetCalories = Math.max(get - deficit, data.sex === "male" ? 1500 : 1200);
    protein = Math.round(data.weight_goal * 2); // 2g/kg of goal weight
  } else if (mode === "gain") {
    // Weight gain mode
    const surplus = 400; // 400 kcal surplus for ~0.4kg/week gain
    targetCalories = get + surplus;
    protein = Math.round(data.weight_goal * 2.2); // 2.2g/kg for muscle synthesis
  } else {
    // Maintain mode
    targetCalories = get;
    protein = Math.round(data.weight_current * 1.6); // 1.6g/kg for maintenance
  }
  
  // Macro distribution
  const proteinCalories = protein * 4;
  
  // Fat: 25% for weight loss, 30% for gain/maintain
  const fatPercent = mode === "lose" ? 0.25 : 0.30;
  const fatCalories = targetCalories * fatPercent;
  const fat = Math.round(fatCalories / 9);
  
  // Carbs: remaining calories
  const carbCalories = targetCalories - proteinCalories - fatCalories;
  const carbs = Math.round(carbCalories / 4);
  
  // Weekly change estimation
  const calorieChange = Math.abs(get - targetCalories);
  const weeklyChange = Math.round((calorieChange * 7 / 7700) * 10) / 10;
  
  // Weeks to reach goal
  const weightDiff = Math.abs(data.weight_goal - data.weight_current);
  const weeksToGoal = weightDiff > 1 && weeklyChange > 0 
    ? Math.ceil(weightDiff / weeklyChange) 
    : 0;

  return {
    tmb: Math.round(tmb),
    get,
    targetCalories,
    protein,
    carbs,
    fat,
    weeklyChange,
    weeksToGoal,
    mode,
  };
}

export default function WeightGoalSetup({ onClose, onSave, onGeneratePlan, onOpenMealPlanGenerator, onPlanRegenerated, onRegenerateStart, onRegenerateEnd, initialData, hasExistingPlan }: WeightGoalSetupProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<WeightGoalData>({
    weight_current: initialData?.weight_current || null,
    weight_goal: initialData?.weight_goal || null,
    height: initialData?.height || null,
    age: initialData?.age || null,
    sex: initialData?.sex || null,
    activity_level: initialData?.activity_level || "moderate",
    goal_mode: initialData?.goal_mode || null,
    strategy_id: initialData?.strategy_id || null,
  });
  
  // Hook para carregar estratégias nutricionais do banco
  const { data: strategies, isLoading: isLoadingStrategies } = useNutritionalStrategies();
  
  // Hook compartilhado para validação de inputs físicos
  const {
    heightInput,
    handleWeightInput,
    handleHeightInput,
    handleHeightBlur,
    handleAgeInput,
  } = usePhysicalInputHandlers(initialData?.height || null);

  const calculations = calculateMacros(data);
  
  // Encontra a chave da estratégia selecionada para validações científicas
  const selectedStrategy = strategies?.find(s => s.id === data.strategy_id);
  const strategyKey = selectedStrategy?.key;
  
  const healthRisks = calculateHealthRisks(data, strategyKey);
  const isComplete = data.weight_current && data.weight_goal && data.height && data.age && data.sex && data.goal_mode && data.strategy_id;
  const hasDangerRisk = healthRisks.some(r => r.level === "danger");

  const scrollToErrorAndShake = () => {
    if (errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setShakeError(true);
      setTimeout(() => setShakeError(false), 600);
    }
    toast.error("Ajuste o objetivo contraditório antes de salvar");
  };

  const getModeInfo = () => {
    if (!calculations) return null;
    switch (calculations.mode) {
      case "lose":
        return {
          icon: TrendingDown,
          label: "Emagrecimento",
          color: "green",
          gradient: "from-green-500 to-emerald-500",
          bgGradient: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30",
          borderColor: "border-green-400/50",
          textColor: "text-green-600",
          changeLabel: "Perda estimada",
        };
      case "gain":
        return {
          icon: TrendingUp,
          label: "Ganho de Peso",
          color: "blue",
          gradient: "from-blue-500 to-indigo-500",
          bgGradient: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
          borderColor: "border-blue-400/50",
          textColor: "text-blue-600",
          changeLabel: "Ganho estimado",
        };
      case "maintain":
        return {
          icon: Minus,
          label: "Manutenção",
          color: "amber",
          gradient: "from-amber-500 to-orange-500",
          bgGradient: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
          borderColor: "border-amber-400/50",
          textColor: "text-amber-600",
          changeLabel: "Peso estável",
        };
    }
  };

  const modeInfo = getModeInfo();

  const saveToDatabase = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Não autenticado");

    // Map mode to goal enum (database stores English values)
    const goalMap = {
      lose: "lose_weight" as const,
      gain: "gain_weight" as const,
      maintain: "maintain" as const,
    };

    const updateData = {
      weight_current: Number(data.weight_current),
      weight_goal: Number(data.weight_goal),
      height: Number(data.height),
      age: Number(data.age),
      sex: data.sex,
      activity_level: data.activity_level,
      goal: goalMap[calculations!.mode],
      strategy_id: data.strategy_id,
    };

    console.log("Saving data:", updateData);

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", session.user.id);

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }
  };

  const handleSaveOnly = async () => {
    if (!isComplete || !calculations) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (hasDangerRisk) {
      scrollToErrorAndShake();
      return;
    }
    
    setIsSaving(true);
    try {
      await saveToDatabase();
      toast.success("Dados salvos com sucesso!");
      onSave({ ...data, calculations });
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar dados");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePlanClick = async () => {
    if (!isComplete || !calculations) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (hasDangerRisk) {
      scrollToErrorAndShake();
      return;
    }

    // Se já existe plano, mostra confirmação para regenerar
    if (hasExistingPlan) {
      setShowRegenerateConfirm(true);
      return;
    }

    // NOVO COMPORTAMENTO: Salvar dados e abrir MealPlanGenerator
    // em vez de gerar diretamente
    if (onOpenMealPlanGenerator) {
      setIsSaving(true);
      try {
        await saveToDatabase();
        onOpenMealPlanGenerator({ ...data, calculations });
      } catch (error) {
        console.error("Error saving before opening generator:", error);
        toast.error("Erro ao salvar dados");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Fallback: Se não tem onOpenMealPlanGenerator, gera direto (comportamento antigo)
    executeGeneratePlan();
  };

  const executeGeneratePlan = async () => {
    setShowRegenerateConfirm(false);
    setIsSaving(true);
    
    // Notifica início da regeneração para mostrar loading fullscreen
    if (hasExistingPlan && onRegenerateStart) {
      onRegenerateStart();
    }
    
    try {
      // SEMPRE excluir todos os planos existentes antes de criar um novo
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Buscar TODOS os planos do usuário
        const { data: existingPlans, error: fetchError } = await supabase
          .from("meal_plans")
          .select("id")
          .eq("user_id", session.user.id);
        
        if (fetchError) {
          console.error("[executeGeneratePlan] Erro ao buscar planos:", fetchError);
        }
        
        // Deletar cada plano existente
        if (existingPlans && existingPlans.length > 0) {
          console.log("[executeGeneratePlan] Excluindo", existingPlans.length, "planos existentes...");
          
          for (const plan of existingPlans) {
            // Deletar items do plano primeiro
            const { error: itemsError } = await supabase
              .from("meal_plan_items")
              .delete()
              .eq("meal_plan_id", plan.id);
            
            if (itemsError) {
              console.error("[executeGeneratePlan] Erro ao deletar items do plano", plan.id, ":", itemsError);
            }
            
            // Deletar o plano
            const { error: planError } = await supabase
              .from("meal_plans")
              .delete()
              .eq("id", plan.id);
            
            if (planError) {
              console.error("[executeGeneratePlan] Erro ao deletar plano", plan.id, ":", planError);
            } else {
              console.log("[executeGeneratePlan] Plano excluído:", plan.id);
            }
          }
          
          console.log("[executeGeneratePlan] Todos os planos antigos excluídos com sucesso");
        } else {
          console.log("[executeGeneratePlan] Nenhum plano existente para excluir");
        }
      }

      await saveToDatabase();
      
      // Generate the meal plan directly
      const startDate = new Date();
      const planName = `Plano ${format(startDate, "MMMM yyyy", { locale: ptBR })}`;
      
      let planCreatedSuccessfully = false;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Você precisa estar logado para gerar seu plano");
        }

        const { data: planData, error: planError } = await supabase.functions.invoke("generate-ai-meal-plan", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: {
            planName,
            startDate: startDate.toISOString().split('T')[0],
            daysCount: 7,
            existingPlanId: null,
            weekNumber: 1
          }
        });
        
        if (planError) throw planError;
        if (planData?.error) throw new Error(planData.error);
        
        planCreatedSuccessfully = true;
      } catch (edgeFunctionError) {
        console.warn("Edge function error, checking if plan was created anyway:", edgeFunctionError);
        
        // A edge function pode ter criado o plano mas a conexão foi fechada antes da resposta
        // Verificar se o plano existe no banco de dados
        const { data: recentPlans } = await supabase
          .from("meal_plans")
          .select("id, name, created_at")
          .eq("user_id", session.user.id)
          .gte("created_at", new Date(Date.now() - 60000).toISOString()) // Último minuto
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (recentPlans && recentPlans.length > 0) {
          console.log("Plan was created despite connection error:", recentPlans[0]);
          planCreatedSuccessfully = true;
        } else {
          throw edgeFunctionError; // Re-throw se o plano realmente não foi criado
        }
      }
      
      if (planCreatedSuccessfully) {
        toast.success("Plano alimentar criado com sucesso!");
        
        // Notifica o Dashboard para atualizar os dados
        if (hasExistingPlan && onPlanRegenerated) {
          onPlanRegenerated();
        }
        
        if (onGeneratePlan) {
          onGeneratePlan({ ...data, calculations: calculations! });
        }
      }
    } catch (error) {
      console.error("Error generating plan:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar plano alimentar");
    } finally {
      setIsSaving(false);
      // Notifica fim da regeneração para esconder loading
      if (hasExistingPlan && onRegenerateEnd) {
        onRegenerateEnd();
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            modeInfo ? `bg-gradient-to-r ${modeInfo.gradient}` : "bg-gradient-to-r from-primary to-primary/80"
          )}>
            {modeInfo ? <modeInfo.icon className="w-5 h-5 text-white" /> : <Target className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Meta de Peso Personalizada</h2>
            <p className="text-sm text-muted-foreground">Cálculos baseados na fórmula Mifflin-St Jeor</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Form */}
      <div className="grid gap-4">
        {/* Goal Mode Selection - Accordion com Estratégias Nutricionais */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            Objetivo (Estratégia Nutricional)
          </Label>
          {isLoadingStrategies ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <StrategyAccordion 
              strategies={strategies || []}
              selectedStrategyId={data.strategy_id}
              onSelectStrategy={(strategy) => {
                const derivedGoalMode = deriveGoalFromStrategy(strategy.key);
                // deriveGoalFromStrategy returns: "lose_weight" | "maintain" | "gain_weight"
                const goalModeMap: Record<string, GoalMode> = {
                  lose_weight: "lose",
                  maintain: "maintain",
                  gain_weight: "gain",
                };
                const goalMode = goalModeMap[derivedGoalMode] || "maintain";
                setData({ 
                  ...data, 
                  strategy_id: strategy.id,
                  goal_mode: goalMode,
                  weight_goal: goalMode === "maintain" ? data.weight_current : data.weight_goal
                });
              }}
            />
          )}
        </div>

        {/* Weight Row */}
        <div className={cn("grid gap-3", data.goal_mode === "maintain" ? "grid-cols-1" : "grid-cols-2")}>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-muted-foreground" />
              Peso Atual (kg)
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="75"
              value={data.weight_current || ""}
              onChange={(e) => {
                const newWeight = handleWeightInput(e.target.value);
                setData({ 
                  ...data, 
                  weight_current: newWeight,
                  // When in maintain mode, weight_goal equals weight_current
                  weight_goal: data.goal_mode === "maintain" ? newWeight : data.weight_goal
                });
              }}
              className={cn(
                "h-12 transition-colors",
                hasDangerRisk && "border-red-500 focus-visible:ring-red-500"
              )}
            />
          </div>
          {data.goal_mode !== "maintain" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                Peso Desejado (kg)
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="70"
                value={data.weight_goal || ""}
                onChange={(e) => {
                  setData({ ...data, weight_goal: handleWeightInput(e.target.value) });
                }}
                className={cn(
                  "h-12 transition-colors",
                  hasDangerRisk && "border-red-500 focus-visible:ring-red-500"
                )}
              />
            </div>
          )}
        </div>

        {/* Health Risk Alerts - Show right after weight fields */}
        {healthRisks.length > 0 && (
          <div className="space-y-2">
            {healthRisks.map((risk, index) => (
              <div
                key={index}
                ref={risk.level === "danger" ? errorRef : undefined}
                className={cn(
                  "rounded-xl p-3 border-2 animate-in fade-in slide-in-from-top-2 duration-300 transition-transform",
                  risk.level === "danger" && "bg-red-50 dark:bg-red-950/30 border-red-400/50",
                  risk.level === "warning" && "bg-amber-50 dark:bg-amber-950/30 border-amber-400/50",
                  risk.level === "info" && "bg-blue-50 dark:bg-blue-950/30 border-blue-400/50",
                  risk.level === "danger" && shakeError && "animate-shake"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                    risk.level === "danger" && "bg-red-500/20",
                    risk.level === "warning" && "bg-amber-500/20",
                    risk.level === "info" && "bg-blue-500/20"
                  )}>
                    {risk.level === "danger" && <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                    {risk.level === "warning" && <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                    {risk.level === "info" && <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-semibold text-sm",
                      risk.level === "danger" && "text-red-700 dark:text-red-300",
                      risk.level === "warning" && "text-amber-700 dark:text-amber-300",
                      risk.level === "info" && "text-blue-700 dark:text-blue-300"
                    )}>
                      {risk.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {risk.message}
                    </p>
                    {risk.suggestion && (
                      <p className={cn(
                        "text-xs mt-1.5 font-medium",
                        risk.level === "danger" && "text-red-600 dark:text-red-400",
                        risk.level === "warning" && "text-amber-600 dark:text-amber-400",
                        risk.level === "info" && "text-blue-600 dark:text-blue-400"
                      )}>
                        💡 {risk.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Height and Age Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-muted-foreground" />
              Altura (m)
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="1,75"
              value={heightInput}
              onChange={(e) => {
                const { heightInCm } = handleHeightInput(e.target.value);
                setData({ ...data, height: heightInCm });
              }}
              onBlur={() => handleHeightBlur(data.height)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Idade
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="30"
              value={data.age || ""}
              onChange={(e) => {
                setData({ ...data, age: handleAgeInput(e.target.value) });
              }}
              className="h-12"
            />
          </div>
        </div>

        {/* Sex Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Sexo Biológico
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setData({ ...data, sex: "male" })}
              className={cn(
                "p-4 rounded-xl border-2 text-center transition-all touch-manipulation",
                data.sex === "male"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <User className="w-6 h-6 mx-auto mb-1 text-blue-500 stroke-[1.5]" />
              <span className="font-medium text-sm">Masculino</span>
            </button>
            <button
              type="button"
              onClick={() => setData({ ...data, sex: "female" })}
              className={cn(
                "p-4 rounded-xl border-2 text-center transition-all touch-manipulation",
                data.sex === "female"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <User className="w-6 h-6 mx-auto mb-1 text-pink-500 stroke-[1.5]" />
              <span className="font-medium text-sm">Feminino</span>
            </button>
          </div>
        </div>

        {/* Activity Level */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            Nível de Atividade Física
          </Label>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map((level) => (
              <button
                type="button"
                key={level.id}
                onClick={() => setData({ ...data, activity_level: level.id as WeightGoalData["activity_level"] })}
                className={cn(
                  "w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between touch-manipulation",
                  data.activity_level === level.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div>
                  <span className="font-medium text-sm">{level.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{level.description}</span>
                </div>
                {data.activity_level === level.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calculations Preview - only show for new plans, not when editing existing */}
      {calculations && isComplete && modeInfo && !hasExistingPlan && (
        <Card className={cn("border-2", modeInfo.borderColor, `bg-gradient-to-r ${modeInfo.bgGradient}`)}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <modeInfo.icon className={cn("w-5 h-5", modeInfo.textColor)} />
              Seu Plano: {modeInfo.label}
            </CardTitle>
            <CardDescription>Baseado nos seus dados e na fórmula Mifflin-St Jeor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Calorie Speedometer */}
            <CalorieSpeedometer
              targetCalories={calculations.targetCalories}
              protein={calculations.protein}
              carbs={calculations.carbs}
              fat={calculations.fat}
              mode={calculations.mode}
            />

            {/* Weight Progress Bar - only show for lose/gain */}
            {calculations.mode !== "maintain" && data.weight_current && data.weight_goal && (
              <WeightProgressBar
                currentWeight={data.weight_current}
                goalWeight={data.weight_goal}
                weeklyChange={calculations.weeklyChange}
                weeksToGoal={calculations.weeksToGoal}
                mode={calculations.mode}
              />
            )}

            {/* Metabolism Info */}
            <div className="text-xs text-muted-foreground space-y-1 bg-white/40 dark:bg-white/5 p-3 rounded-lg">
              <p className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-primary stroke-[1.5]" /> <strong>TMB (Taxa Metabólica Basal):</strong> {calculations.tmb} kcal/dia</p>
              <p className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-500 stroke-[1.5]" /> <strong>GET (Gasto Energético Total):</strong> {calculations.get} kcal/dia</p>
              {calculations.mode === "lose" && (
                <p className="flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-green-500 stroke-[1.5]" /> <strong>Déficit calórico:</strong> {calculations.get - calculations.targetCalories} kcal/dia</p>
              )}
              {calculations.mode === "gain" && (
                <p className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-blue-500 stroke-[1.5]" /> <strong>Superávit calórico:</strong> {calculations.targetCalories - calculations.get} kcal/dia</p>
              )}
              {calculations.mode === "maintain" && (
                <p className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-amber-500 stroke-[1.5]" /> <strong>Calorias de manutenção:</strong> {calculations.get} kcal/dia</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              *Estimativas baseadas em médias. Resultados podem variar individualmente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog for Regenerate */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-sm w-full animate-in zoom-in-95 duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Substituir plano atual?
              </CardTitle>
              <CardDescription>
                Isso irá apagar seu plano alimentar atual e criar um novo baseado nas suas novas metas.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowRegenerateConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                  onClick={executeGeneratePlan}
                >
                  Sim, substituir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className={cn("gap-3", hasExistingPlan ? "flex" : "grid grid-cols-2")}>
        <Button 
          variant="outline" 
          onClick={handleSaveOnly} 
          disabled={!isComplete || isSaving || hasDangerRisk} 
          className={cn("h-12", hasExistingPlan && "flex-1")}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {hasExistingPlan ? "Salvar" : "Não gerar e salvar"}
        </Button>
        {!hasExistingPlan && (
          <Button
            onClick={handleGeneratePlanClick}
            disabled={!isComplete || isSaving || hasDangerRisk}
            className={cn(
              "h-12 border-0",
              modeInfo 
                ? `bg-gradient-to-r ${modeInfo.gradient} hover:opacity-90` 
                : "bg-gradient-to-r from-primary to-primary/80"
            )}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Criar Plano
          </Button>
        )}
      </div>
    </div>
  );
}
