import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Scale, Ruler, Calendar, User, Activity, Target, 
  TrendingDown, Flame, Beef, Wheat, Loader2, Check, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type WeightLossData = {
  weight_current: number | null;
  weight_goal: number | null;
  height: number | null;
  age: number | null;
  sex: "male" | "female" | null;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
};

type WeightLossSetupProps = {
  onClose: () => void;
  onSave: (data: WeightLossData & { calculations: MacroCalculations }) => void;
  initialData?: Partial<WeightLossData>;
};

type MacroCalculations = {
  tmb: number;
  get: number;
  targetCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  weeklyLoss: number;
  weeksToGoal: number;
};

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentário", description: "Pouco ou nenhum exercício", factor: 1.2 },
  { id: "light", label: "Leve", description: "Exercício 1-3x/semana", factor: 1.375 },
  { id: "moderate", label: "Moderado", description: "Exercício 3-5x/semana", factor: 1.55 },
  { id: "active", label: "Ativo", description: "Exercício 6-7x/semana", factor: 1.725 },
  { id: "very_active", label: "Muito Ativo", description: "Exercício intenso diário", factor: 1.9 },
];

export function calculateMacros(data: WeightLossData): MacroCalculations | null {
  if (!data.weight_current || !data.weight_goal || !data.height || !data.age || !data.sex) {
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
  
  // Target calories (500 kcal deficit for ~0.5kg/week loss)
  const deficit = 500;
  const targetCalories = Math.max(get - deficit, data.sex === "male" ? 1500 : 1200); // Minimum safe calories
  
  // Macro distribution for weight loss
  // Protein: 2g per kg of goal weight (to preserve muscle)
  const protein = Math.round(data.weight_goal * 2);
  const proteinCalories = protein * 4;
  
  // Fat: 25% of calories
  const fatCalories = targetCalories * 0.25;
  const fat = Math.round(fatCalories / 9);
  
  // Carbs: remaining calories
  const carbCalories = targetCalories - proteinCalories - fatCalories;
  const carbs = Math.round(carbCalories / 4);
  
  // Weekly loss estimation (500 kcal deficit = ~0.5kg/week)
  const actualDeficit = get - targetCalories;
  const weeklyLoss = Math.round((actualDeficit * 7 / 7700) * 10) / 10; // 7700 kcal = 1kg fat
  
  // Weeks to reach goal
  const weightToLose = data.weight_current - data.weight_goal;
  const weeksToGoal = weightToLose > 0 && weeklyLoss > 0 
    ? Math.ceil(weightToLose / weeklyLoss) 
    : 0;

  return {
    tmb: Math.round(tmb),
    get,
    targetCalories,
    protein,
    carbs,
    fat,
    weeklyLoss,
    weeksToGoal,
  };
}

export default function WeightLossSetup({ onClose, onSave, initialData }: WeightLossSetupProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<WeightLossData>({
    weight_current: initialData?.weight_current || null,
    weight_goal: initialData?.weight_goal || null,
    height: initialData?.height || null,
    age: initialData?.age || null,
    sex: initialData?.sex || null,
    activity_level: initialData?.activity_level || "moderate",
  });

  const calculations = calculateMacros(data);
  const isComplete = data.weight_current && data.weight_goal && data.height && data.age && data.sex;

  const handleSave = async () => {
    if (!isComplete || !calculations) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const updateData = {
        weight_current: Number(data.weight_current),
        weight_goal: Number(data.weight_goal),
        height: Number(data.height),
        age: Number(data.age),
        sex: data.sex,
        activity_level: data.activity_level,
        goal: "emagrecer" as const,
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

      toast.success("Dados salvos com sucesso!");
      onSave({ ...data, calculations });
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
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Configurar Emagrecimento</h2>
            <p className="text-sm text-muted-foreground">Cálculos baseados na fórmula Mifflin-St Jeor</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Form */}
      <div className="grid gap-4">
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
              onClick={() => setData({ ...data, sex: "male" })}
              className={cn(
                "p-4 rounded-xl border-2 text-center transition-all",
                data.sex === "male"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-2xl mb-1 block">👨</span>
              <span className="font-medium text-sm">Masculino</span>
            </button>
            <button
              onClick={() => setData({ ...data, sex: "female" })}
              className={cn(
                "p-4 rounded-xl border-2 text-center transition-all",
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
                key={level.id}
                onClick={() => setData({ ...data, activity_level: level.id as WeightLossData["activity_level"] })}
                className={cn(
                  "w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between",
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
      {calculations && isComplete && (
        <Card className="border-2 border-green-400/50 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-green-500" />
              Seu Plano Personalizado
            </CardTitle>
            <CardDescription>Baseado nos seus dados e na fórmula Mifflin-St Jeor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/60 dark:bg-white/10 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Meta Diária</p>
                <p className="text-2xl font-bold text-green-600">{calculations.targetCalories}</p>
                <p className="text-xs text-muted-foreground">kcal/dia</p>
              </div>
              <div className="bg-white/60 dark:bg-white/10 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Perda Estimada</p>
                <p className="text-2xl font-bold text-green-600">~{calculations.weeklyLoss}kg</p>
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

            {/* Timeline */}
            <div className="bg-white/60 dark:bg-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{data.weight_current}kg → {data.weight_goal}kg</span>
                <span className="text-sm text-green-600 font-bold">
                  ~{calculations.weeksToGoal} semanas
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: "10%" }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {calculations.weeksToGoal > 0 && (
                  <>Aproximadamente {Math.ceil(calculations.weeksToGoal / 4)} meses para atingir sua meta</>
                )}
              </p>
            </div>

            {/* Metabolism Info */}
            <div className="text-xs text-muted-foreground space-y-1 bg-white/40 dark:bg-white/5 p-3 rounded-lg">
              <p>📊 <strong>TMB (Taxa Metabólica Basal):</strong> {calculations.tmb} kcal/dia</p>
              <p>🔥 <strong>GET (Gasto Energético Total):</strong> {calculations.get} kcal/dia</p>
              <p>📉 <strong>Déficit calórico:</strong> {calculations.get - calculations.targetCalories} kcal/dia</p>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              *Estimativas baseadas em médias. Resultados podem variar individualmente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onClose} className="h-12">
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isComplete || isSaving}
          className="h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Salvar Plano
        </Button>
      </div>
    </div>
  );
}
