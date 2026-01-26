import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Utensils, Globe, Target, AlertCircle, Scale, Ruler, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAllNutritionalStrategies, deriveGoalFromStrategy } from "@/hooks/useNutritionalStrategies";
import { useOnboardingOptions } from "@/hooks/useOnboardingOptions";
import { useSafetyLabels } from "@/hooks/useSafetyLabels";
import { FALLBACK_DIETARY_PREFERENCES } from "@/lib/safetyFallbacks";

// Validação de peso baseada na estratégia
function validateWeightGoal(
  strategyKey: string | undefined,
  weightCurrent: number,
  weightGoal: number
): { isValid: boolean; error: string | null } {
  if (!strategyKey || !weightCurrent || !weightGoal) {
    return { isValid: true, error: null };
  }

  // Estratégias de emagrecimento: meta deve ser MENOR que atual
  if (strategyKey === "lose_weight" || strategyKey === "weight_loss" || strategyKey === "cutting") {
    if (weightGoal >= weightCurrent) {
      return {
        isValid: false,
        error: `Para ${strategyKey === "cutting" ? "Cutting" : "Emagrecimento"}, a meta de peso deve ser menor que o peso atual.`
      };
    }
  }

  // Estratégias de ganho de peso: meta deve ser MAIOR que atual
  if (strategyKey === "gain_weight" || strategyKey === "weight_gain") {
    if (weightGoal <= weightCurrent) {
      return {
        isValid: false,
        error: "Para Ganhar Peso (Bulk), a meta de peso deve ser maior que o peso atual."
      };
    }
  }

  return { isValid: true, error: null };
}

const COUNTRIES = [
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "DE", name: "Deutschland", flag: "🇩🇪" },
  { code: "IT", name: "Italia", flag: "🇮🇹" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
];

const MEAL_TYPES = [
  { value: "breakfast", label: "Café da Manhã" },
  { value: "morning_snack", label: "Lanche da Manhã" },
  { value: "lunch", label: "Almoço" },
  { value: "afternoon_snack", label: "Lanche da Tarde" },
  { value: "dinner", label: "Jantar" },
  { value: "supper", label: "Ceia" },
];

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentário", description: "Pouco ou nenhum exercício" },
  { value: "light", label: "Leve", description: "Exercício 1-3 dias/semana" },
  { value: "moderate", label: "Moderado", description: "Exercício 3-5 dias/semana" },
  { value: "active", label: "Ativo", description: "Exercício 6-7 dias/semana" },
  { value: "very_active", label: "Muito Ativo", description: "Atleta, trabalho físico" },
];

const SEX_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Feminino" },
];

interface FoodItem {
  name: string;
  grams: number;
}

interface MealOption {
  title: string;
  foods: FoodItem[] | string[];
  calories_kcal: number;
  calculated_calories?: number;
}

interface Meal {
  meal_type: string;
  label: string;
  target_calories: number;
  options: MealOption[];
}

interface DayPlan {
  day: number;
  day_name: string;
  meals: Meal[];
  total_calories: number;
}

interface GeneratedPlan {
  daily_calories: number;
  options_per_meal: number;
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
    goal: string;
  };
  regional: {
    country: string;
    language: string;
    measurement_system: string;
  };
  days: DayPlan[];
}

// Cálculo de calorias (simplificado para exibição - o cálculo real é feito na edge function)
function calculateEstimatedCalories(
  weight: number,
  height: number,
  age: number,
  sex: string,
  activityLevel: string,
  calorieModifier: number
): number | null {
  if (!weight || !height || !age) return null;

  const isMale = sex === "male";
  
  // Mifflin-St Jeor
  const bmr = isMale
    ? (10 * weight) + (6.25 * height) - (5 * age) + 5
    : (10 * weight) + (6.25 * height) - (5 * age) - 161;

  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const tdee = bmr * (multipliers[activityLevel] || 1.55);
  return Math.max(1200, Math.round(tdee + calorieModifier));
}

export default function AdminAIMealPlanTest() {
  const { data: strategies, isLoading: isLoadingStrategies } = useAllNutritionalStrategies();
  const { data: onboardingOptions, isLoading: isLoadingOptions } = useOnboardingOptions();
  
  const [isLoading, setIsLoading] = useState(false);
  const [country, setCountry] = useState("BR");
  
  // Dados físicos
  const [weightCurrent, setWeightCurrent] = useState(70);
  const [weightGoal, setWeightGoal] = useState(65);
  const [height, setHeight] = useState(170);
  const [age, setAge] = useState(30);
  const [sex, setSex] = useState("male");
  const [activityLevel, setActivityLevel] = useState("moderate");
  
  // Estratégia nutricional
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");
  
  const [dietaryPreference, setDietaryPreference] = useState("omnivore");
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>(["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"]);
  const [optionsPerMeal, setOptionsPerMeal] = useState(3);
  const [daysCount, setDaysCount] = useState(1);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  // Obter estratégia selecionada e calcular calorias
  const selectedStrategy = useMemo(() => {
    if (!strategies || !selectedStrategyId) return null;
    return strategies.find(s => s.id === selectedStrategyId) || null;
  }, [strategies, selectedStrategyId]);

  const estimatedCalories = useMemo(() => {
    const calorieModifier = selectedStrategy?.calorie_modifier || 0;
    return calculateEstimatedCalories(weightCurrent, height, age, sex, activityLevel, calorieModifier);
  }, [weightCurrent, height, age, sex, activityLevel, selectedStrategy]);

  // Validação de peso
  const weightValidation = useMemo(() => {
    return validateWeightGoal(selectedStrategy?.key, weightCurrent, weightGoal);
  }, [selectedStrategy?.key, weightCurrent, weightGoal]);

  // Intolerâncias do banco de dados
  const intoleranceOptions = useMemo(() => {
    if (!onboardingOptions) return [];
    return onboardingOptions.intolerances.filter(i => i.option_id !== "none");
  }, [onboardingOptions]);

  // Verificar se pode gerar
  const canGenerate = useMemo(() => {
    return selectedStrategyId && 
           selectedMealTypes.length > 0 && 
           weightValidation.isValid &&
           weightCurrent > 0 &&
           weightGoal > 0 &&
           height > 0 &&
           age > 0;
  }, [selectedStrategyId, selectedMealTypes.length, weightValidation.isValid, weightCurrent, weightGoal, height, age]);

  const handleIntoleranceToggle = (intolerance: string) => {
    setSelectedIntolerances(prev => 
      prev.includes(intolerance) 
        ? prev.filter(i => i !== intolerance)
        : [...prev, intolerance]
    );
  };

  const handleMealTypeToggle = (mealType: string) => {
    setSelectedMealTypes(prev => 
      prev.includes(mealType) 
        ? prev.filter(m => m !== mealType)
        : [...prev, mealType]
    );
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      if (!weightValidation.isValid) {
        toast.error("Corrija o conflito de peso antes de gerar");
      } else {
        toast.error("Preencha todos os campos obrigatórios");
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedPlan(null);
    const startTime = Date.now();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario nao autenticado");

      // Deriva o goal a partir da estratégia
      // deriveGoalFromStrategy now returns: "lose_weight" | "maintain" | "gain_weight"
      const derivedGoal = selectedStrategy 
        ? deriveGoalFromStrategy(selectedStrategy.key)
        : "maintain";

      // Update profile with test settings
      await supabase
        .from("profiles")
        .update({
          country,
          goal: derivedGoal,
          dietary_preference: dietaryPreference as "omnivore" | "vegetarian" | "vegan" | "low_carb" | "pescatarian" | "ketogenic" | "flexitarian",
          intolerances: selectedIntolerances,
          weight_current: weightCurrent,
          weight_goal: weightGoal,
          height,
          age,
          sex,
          activity_level: activityLevel,
          strategy_id: selectedStrategyId,
        })
        .eq("id", user.id);

      // Call the AI meal plan generator (calorias são calculadas automaticamente na edge function)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Você precisa estar logado para rodar este teste');
      }

      const { data, error: fnError } = await supabase.functions.invoke("generate-ai-meal-plan", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: {
          daysCount,
          optionsPerMeal,
          countryCode: country,
          mealType: selectedMealTypes,
          intolerances: selectedIntolerances,
        },
      });

      const endTime = Date.now();
      setExecutionTime(endTime - startTime);

      if (fnError) throw fnError;

      if (data?.success) {
        setGeneratedPlan(data.plan);
        toast.success(`Cardapio gerado em ${((endTime - startTime) / 1000).toFixed(1)}s`);
      } else {
        throw new Error(data?.error || "Erro ao gerar cardapio");
      }
    } catch (err: any) {
      console.error("Error generating meal plan:", err);
      setError(err.message || "Erro desconhecido");
      toast.error(err.message || "Erro ao gerar cardapio");
    } finally {
      setIsLoading(false);
    }
  };

  const isLoadingData = isLoadingStrategies || isLoadingOptions;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Utensils className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">AI Meal Plan Tester</h1>
          <p className="text-muted-foreground">Teste o gerador de cardapios inteligente</p>
        </div>
      </div>

      {isLoadingData ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Configuracoes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Country */}
              <div className="space-y-2">
                <Label>Pais / Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Physical Data Section */}
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  Dados Físicos
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Weight Current */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Peso Atual (kg)
                    </Label>
                    <Input
                      type="number"
                      value={weightCurrent}
                      onChange={e => setWeightCurrent(Number(e.target.value))}
                      min={30}
                      max={300}
                    />
                  </div>

                  {/* Weight Goal */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Meta de Peso (kg)
                    </Label>
                    <Input
                      type="number"
                      value={weightGoal}
                      onChange={e => setWeightGoal(Number(e.target.value))}
                      min={30}
                      max={300}
                      className={!weightValidation.isValid ? "border-destructive" : ""}
                    />
                  </div>
                </div>

                {/* Weight Validation Alert */}
                {!weightValidation.isValid && weightValidation.error && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Objetivo Contraditório</AlertTitle>
                    <AlertDescription>{weightValidation.error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Height */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Altura (cm)
                    </Label>
                    <Input
                      type="number"
                      value={height}
                      onChange={e => setHeight(Number(e.target.value))}
                      min={100}
                      max={250}
                    />
                  </div>

                  {/* Age */}
                  <div className="space-y-2">
                    <Label>Idade</Label>
                    <Input
                      type="number"
                      value={age}
                      onChange={e => setAge(Number(e.target.value))}
                      min={10}
                      max={120}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Sex */}
                  <div className="space-y-2">
                    <Label>Sexo</Label>
                    <Select value={sex} onValueChange={setSex}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEX_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Activity Level */}
                  <div className="space-y-2">
                    <Label>Nível de Atividade</Label>
                    <Select value={activityLevel} onValueChange={setActivityLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_LEVELS.map(a => (
                          <SelectItem key={a.value} value={a.value}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Nutritional Strategy */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Estratégia Nutricional
                </Label>
                <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma estrategia" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies?.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          {s.icon} {s.label}
                          {s.calorie_modifier !== null && (
                            <span className="text-xs text-muted-foreground">
                              ({s.calorie_modifier > 0 ? "+" : ""}{s.calorie_modifier} kcal)
                            </span>
                          )}
                          {!s.is_active && (
                            <span className="ml-1 text-xs text-orange-500 font-medium">(Inativa)</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedStrategy && (
                  <p className="text-xs text-muted-foreground">{selectedStrategy.description}</p>
                )}
              </div>

              {/* Estimated Calories */}
              {estimatedCalories && (
                <div className="rounded-lg bg-primary/10 p-3">
                  <p className="text-sm font-medium text-primary">
                    Calorias Estimadas: {estimatedCalories} kcal/dia
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Calculado com base nos dados físicos e estratégia
                  </p>
                </div>
              )}

              {/* Dietary Preference */}
              <div className="space-y-2">
                <Label>Preferencia Alimentar</Label>
                <Select value={dietaryPreference} onValueChange={setDietaryPreference}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FALLBACK_DIETARY_PREFERENCES.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Intolerances (from database) */}
              <div className="space-y-2">
                <Label>Intolerancias ({intoleranceOptions.length} opcoes)</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {intoleranceOptions.map(i => (
                    <div key={i.option_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={i.option_id}
                        checked={selectedIntolerances.includes(i.option_id)}
                        onCheckedChange={() => handleIntoleranceToggle(i.option_id)}
                      />
                      <label htmlFor={i.option_id} className="text-sm cursor-pointer flex items-center gap-1">
                        {i.emoji && <span>{i.emoji}</span>}
                        {i.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meal Types */}
              <div className="space-y-2">
                <Label>Refeicoes</Label>
                <div className="flex flex-wrap gap-2">
                  {MEAL_TYPES.map(m => (
                    <div key={m.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={m.value}
                        checked={selectedMealTypes.includes(m.value)}
                        onCheckedChange={() => handleMealTypeToggle(m.value)}
                      />
                      <label htmlFor={m.value} className="text-sm cursor-pointer">
                        {m.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options per meal */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Opcoes por Refeicao</Label>
                  <Select value={String(optionsPerMeal)} onValueChange={v => setOptionsPerMeal(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 opcao</SelectItem>
                      <SelectItem value="2">2 opcoes</SelectItem>
                      <SelectItem value="3">3 opcoes</SelectItem>
                      <SelectItem value="4">4 opcoes</SelectItem>
                      <SelectItem value="5">5 opcoes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Dias</Label>
                  <Select value={String(daysCount)} onValueChange={v => setDaysCount(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 dia</SelectItem>
                      <SelectItem value="2">2 dias</SelectItem>
                      <SelectItem value="3">3 dias</SelectItem>
                      <SelectItem value="7">7 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isLoading || !canGenerate}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando cardapio...
                  </>
                ) : (
                  <>
                    <Utensils className="mr-2 h-4 w-4" />
                    Gerar Cardapio
                  </>
                )}
              </Button>

              {executionTime && (
                <p className="text-center text-sm text-muted-foreground">
                  Tempo de execucao: {(executionTime / 1000).toFixed(1)}s
                </p>
              )}
            </CardContent>
          </Card>

          {/* Results Panel */}
          <Card className="lg:row-span-2">
            <CardHeader>
              <CardTitle>Resultado</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              )}

              {!generatedPlan && !error && !isLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Utensils className="mb-4 h-12 w-12 opacity-20" />
                  <p>Configure os parametros e clique em Gerar Cardapio</p>
                </div>
              )}

              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Gerando cardapio com IA...</p>
                  <p className="text-xs text-muted-foreground mt-2">Isso pode levar alguns segundos</p>
                </div>
              )}

              {generatedPlan && (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    {/* Plan Summary */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {generatedPlan.regional.country} - {generatedPlan.regional.language}
                      </Badge>
                      <Badge variant="outline">
                        {generatedPlan.daily_calories} kcal/dia
                      </Badge>
                      <Badge variant="outline">
                        {generatedPlan.options_per_meal} opcoes/refeicao
                      </Badge>
                    </div>

                    {/* Days */}
                    {generatedPlan.days.map((day, dayIndex) => (
                      <div key={dayIndex} className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">
                          {day.day_name} (Dia {day.day})
                        </h3>

                        {/* Meals */}
                        {day.meals.map((meal, mealIndex) => (
                          <div key={mealIndex} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-primary">{meal.label}</h4>
                              <Badge variant="secondary">{meal.target_calories} kcal</Badge>
                            </div>

                            {/* Options */}
                            <div className="space-y-2 pl-4">
                              {meal.options.map((option, optIndex) => (
                                <Card key={optIndex} className="bg-muted/30">
                                  <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">
                                          Opcao {optIndex + 1}: {option.title}
                                        </p>
                                        <ul className="mt-1 space-y-0.5">
                                          {option.foods.map((food, foodIndex) => {
                                            const foodText = typeof food === 'string' 
                                              ? food 
                                              : `${food.name} (${food.grams}g)`;
                                            return (
                                              <li key={foodIndex} className="text-xs text-muted-foreground">
                                                - {foodText}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                      <Badge variant="outline" className="text-xs shrink-0">
                                        {option.calories_kcal} kcal
                                      </Badge>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        ))}

                        <div className="text-right text-sm font-medium">
                          Total do dia: {day.total_calories} kcal
                        </div>
                      </div>
                    ))}

                    {/* Raw JSON */}
                    <details className="mt-6">
                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                        Ver JSON completo
                      </summary>
                      <pre className="mt-2 overflow-auto rounded-lg bg-muted p-4 text-xs">
                        {JSON.stringify(generatedPlan, null, 2)}
                      </pre>
                    </details>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
