import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Scale, Ruler, Calendar, User, Activity, Target, 
  TrendingDown, TrendingUp, Minus, Flame, Beef, Wheat, Loader2, Check, X, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type GoalMode = "lose" | "gain" | "maintain";

type WeightGoalData = {
  weight_current: number | null;
  weight_goal: number | null;
  height: number | null;
  age: number | null;
  sex: "male" | "female" | null;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal_mode: GoalMode | null;
};

type WeightGoalSetupProps = {
  onClose: () => void;
  onSave: (data: WeightGoalData & { calculations: MacroCalculations }) => void;
  onGeneratePlan?: (data: WeightGoalData & { calculations: MacroCalculations }) => void;
  initialData?: Partial<WeightGoalData>;
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

export default function WeightGoalSetup({ onClose, onSave, onGeneratePlan, initialData }: WeightGoalSetupProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<WeightGoalData>({
    weight_current: initialData?.weight_current || null,
    weight_goal: initialData?.weight_goal || null,
    height: initialData?.height || null,
    age: initialData?.age || null,
    sex: initialData?.sex || null,
    activity_level: initialData?.activity_level || "moderate",
    goal_mode: initialData?.goal_mode || null,
  });

  const calculations = calculateMacros(data);
  const isComplete = data.weight_current && data.weight_goal && data.height && data.age && data.sex && data.goal_mode;

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

    // Map mode to goal enum
    const goalMap = {
      lose: "emagrecer" as const,
      gain: "ganhar_peso" as const,
      maintain: "manter" as const,
    };

    const updateData = {
      weight_current: Number(data.weight_current),
      weight_goal: Number(data.weight_goal),
      height: Number(data.height),
      age: Number(data.age),
      sex: data.sex,
      activity_level: data.activity_level,
      goal: goalMap[calculations!.mode],
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

  const handleGeneratePlan = async () => {
    if (!isComplete || !calculations) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    setIsSaving(true);
    try {
      await saveToDatabase();
      toast.success("Dados salvos! Vamos criar seu plano alimentar.");
      if (onGeneratePlan) {
        onGeneratePlan({ ...data, calculations });
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar dados");
    } finally {
      setIsSaving(false);
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
        {/* Goal Mode Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            Qual é o seu objetivo?
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setData({ ...data, goal_mode: "lose" })}
              className={cn(
                "p-4 rounded-xl border-2 text-center transition-all touch-manipulation",
                data.goal_mode === "lose"
                  ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                  : "border-border hover:border-green-400/50"
              )}
            >
              <TrendingDown className={cn("w-6 h-6 mx-auto mb-2", data.goal_mode === "lose" ? "text-green-600" : "text-muted-foreground")} />
              <span className="font-medium text-sm">Emagrecer</span>
            </button>
            <button
              type="button"
              onClick={() => setData({ ...data, goal_mode: "maintain" })}
              className={cn(
                "p-4 rounded-xl border-2 text-center transition-all touch-manipulation",
                data.goal_mode === "maintain"
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                  : "border-border hover:border-amber-400/50"
              )}
            >
              <Minus className={cn("w-6 h-6 mx-auto mb-2", data.goal_mode === "maintain" ? "text-amber-600" : "text-muted-foreground")} />
              <span className="font-medium text-sm">Manter</span>
            </button>
            <button
              type="button"
              onClick={() => setData({ ...data, goal_mode: "gain" })}
              className={cn(
                "p-4 rounded-xl border-2 text-center transition-all touch-manipulation",
                data.goal_mode === "gain"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "border-border hover:border-blue-400/50"
              )}
            >
              <TrendingUp className={cn("w-6 h-6 mx-auto mb-2", data.goal_mode === "gain" ? "text-blue-600" : "text-muted-foreground")} />
              <span className="font-medium text-sm">Ganhar Peso</span>
            </button>
          </div>
        </div>

        {/* Weight Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-muted-foreground" />
              Peso Atual (kg)
            </Label>
            <Input
              type="number"
              placeholder="75"
              value={data.weight_current || ""}
              onChange={(e) => setData({ ...data, weight_current: e.target.value ? parseFloat(e.target.value) : null })}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              Peso Desejado (kg)
            </Label>
            <Input
              type="number"
              placeholder="70"
              value={data.weight_goal || ""}
              onChange={(e) => setData({ ...data, weight_goal: e.target.value ? parseFloat(e.target.value) : null })}
              className="h-12"
            />
          </div>
        </div>

        {/* Height and Age Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-muted-foreground" />
              Altura (cm)
            </Label>
            <Input
              type="number"
              placeholder="175"
              value={data.height || ""}
              onChange={(e) => setData({ ...data, height: e.target.value ? parseInt(e.target.value) : null })}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Idade
            </Label>
            <Input
              type="number"
              placeholder="30"
              value={data.age || ""}
              onChange={(e) => setData({ ...data, age: e.target.value ? parseInt(e.target.value) : null })}
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
              <span className="text-2xl mb-1 block">👨</span>
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
              <span className="text-2xl mb-1 block">👩</span>
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

      {/* Calculations Preview */}
      {calculations && isComplete && modeInfo && (
        <Card className={cn("border-2", modeInfo.borderColor, `bg-gradient-to-r ${modeInfo.bgGradient}`)}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <modeInfo.icon className={cn("w-5 h-5", modeInfo.textColor)} />
              Seu Plano: {modeInfo.label}
            </CardTitle>
            <CardDescription>Baseado nos seus dados e na fórmula Mifflin-St Jeor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/60 dark:bg-white/10 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Meta Diária</p>
                <p className={cn("text-2xl font-bold", modeInfo.textColor)}>{calculations.targetCalories}</p>
                <p className="text-xs text-muted-foreground">kcal/dia</p>
              </div>
              <div className="bg-white/60 dark:bg-white/10 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{modeInfo.changeLabel}</p>
                {calculations.mode === "maintain" ? (
                  <p className={cn("text-2xl font-bold", modeInfo.textColor)}>—</p>
                ) : (
                  <p className={cn("text-2xl font-bold", modeInfo.textColor)}>~{calculations.weeklyChange}kg</p>
                )}
                <p className="text-xs text-muted-foreground">por semana</p>
              </div>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-red-500/10 rounded-xl p-3 text-center">
                <Beef className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{calculations.protein}g</p>
                <p className="text-xs text-muted-foreground">Proteína</p>
              </div>
              <div className="bg-amber-500/10 rounded-xl p-3 text-center">
                <Wheat className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{calculations.carbs}g</p>
                <p className="text-xs text-muted-foreground">Carboidratos</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-3 text-center">
                <Flame className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{calculations.fat}g</p>
                <p className="text-xs text-muted-foreground">Gordura</p>
              </div>
            </div>

            {/* Timeline - only show for lose/gain */}
            {calculations.mode !== "maintain" && (
              <div className="bg-white/60 dark:bg-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{data.weight_current}kg → {data.weight_goal}kg</span>
                  <span className={cn("text-sm font-bold", modeInfo.textColor)}>
                    ~{calculations.weeksToGoal} semanas
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className={cn("h-2 rounded-full bg-gradient-to-r", modeInfo.gradient)} style={{ width: "10%" }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {calculations.weeksToGoal > 0 && (
                    <>Aproximadamente {Math.ceil(calculations.weeksToGoal / 4)} meses para atingir sua meta</>
                  )}
                </p>
              </div>
            )}

            {/* Metabolism Info */}
            <div className="text-xs text-muted-foreground space-y-1 bg-white/40 dark:bg-white/5 p-3 rounded-lg">
              <p>📊 <strong>TMB (Taxa Metabólica Basal):</strong> {calculations.tmb} kcal/dia</p>
              <p>🔥 <strong>GET (Gasto Energético Total):</strong> {calculations.get} kcal/dia</p>
              {calculations.mode === "lose" && (
                <p>📉 <strong>Déficit calórico:</strong> {calculations.get - calculations.targetCalories} kcal/dia</p>
              )}
              {calculations.mode === "gain" && (
                <p>📈 <strong>Superávit calórico:</strong> {calculations.targetCalories - calculations.get} kcal/dia</p>
              )}
              {calculations.mode === "maintain" && (
                <p>⚖️ <strong>Calorias de manutenção:</strong> {calculations.get} kcal/dia</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              *Estimativas baseadas em médias. Resultados podem variar individualmente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={handleSaveOnly} disabled={!isComplete || isSaving} className="h-12">
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Não gerar e salvar
        </Button>
        <Button
          onClick={handleGeneratePlan}
          disabled={!isComplete || isSaving}
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
          Gerar Plano Alimentar
        </Button>
      </div>
    </div>
  );
}
