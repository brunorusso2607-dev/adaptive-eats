import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Utensils, Globe, Target, Flame, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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

const GOALS = [
  { value: "emagrecer", label: "Emagrecer / Weight Loss", icon: "📉" },
  { value: "manter", label: "Manter / Maintenance", icon: "⚖️" },
  { value: "ganhar_peso", label: "Ganhar Peso / Weight Gain", icon: "📈" },
];

const DIETARY_PREFERENCES = [
  { value: "comum", label: "Comum / Omnivore" },
  { value: "vegetariana", label: "Vegetariana" },
  { value: "vegana", label: "Vegana" },
  { value: "low_carb", label: "Low Carb" },
  { value: "pescetariana", label: "Pescetariana" },
  { value: "cetogenica", label: "Cetogenica / Keto" },
  { value: "flexitariana", label: "Flexitariana" },
];

const INTOLERANCES = [
  { value: "lactose", label: "Lactose" },
  { value: "gluten", label: "Gluten" },
  { value: "amendoim", label: "Amendoim / Peanuts" },
  { value: "frutos_do_mar", label: "Frutos do Mar / Shellfish" },
  { value: "peixe", label: "Peixe / Fish" },
  { value: "ovos", label: "Ovos / Eggs" },
  { value: "soja", label: "Soja / Soy" },
  { value: "cafeina", label: "Cafeina / Caffeine" },
  { value: "milho", label: "Milho / Corn" },
  { value: "leguminosas", label: "Leguminosas / Legumes" },
];

const MEAL_TYPES = [
  { value: "cafe_manha", label: "Cafe da Manha" },
  { value: "lanche_manha", label: "Lanche da Manha" },
  { value: "almoco", label: "Almoco" },
  { value: "lanche_tarde", label: "Lanche da Tarde" },
  { value: "jantar", label: "Jantar" },
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

export default function AdminAIMealPlanTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [country, setCountry] = useState("BR");
  const [dailyCalories, setDailyCalories] = useState(1800);
  const [goal, setGoal] = useState("emagrecer");
  const [dietaryPreference, setDietaryPreference] = useState("comum");
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>(["cafe_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar"]);
  const [optionsPerMeal, setOptionsPerMeal] = useState(3);
  const [daysCount, setDaysCount] = useState(1);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

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
    if (selectedMealTypes.length === 0) {
      toast.error("Selecione pelo menos uma refeicao");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedPlan(null);
    const startTime = Date.now();

    try {
      // First update the user profile with test settings
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario nao autenticado");

      // Update profile with test settings
      await supabase
        .from("profiles")
        .update({
          country,
          goal: goal as "emagrecer" | "manter" | "ganhar_peso",
          dietary_preference: dietaryPreference as "comum" | "vegetariana" | "vegana" | "low_carb" | "pescetariana" | "cetogenica" | "flexitariana",
          intolerances: selectedIntolerances,
        })
        .eq("id", user.id);

      // Call the AI meal plan generator
      const { data, error: fnError } = await supabase.functions.invoke("generate-ai-meal-plan", {
        body: {
          dailyCalories,
          daysCount,
          optionsPerMeal,
          mealTypes: selectedMealTypes,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Utensils className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">AI Meal Plan Tester</h1>
          <p className="text-muted-foreground">Teste o gerador de cardapios inteligente</p>
        </div>
      </div>

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

            {/* Calories */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Flame className="h-4 w-4" />
                Calorias Diarias
              </Label>
              <Input
                type="number"
                value={dailyCalories}
                onChange={e => setDailyCalories(Number(e.target.value))}
                min={1200}
                max={4000}
              />
              <p className="text-xs text-muted-foreground">1200 - 4000 kcal</p>
            </div>

            {/* Goal */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Objetivo
              </Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOALS.map(g => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.icon} {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dietary Preference */}
            <div className="space-y-2">
              <Label>Preferencia Alimentar</Label>
              <Select value={dietaryPreference} onValueChange={setDietaryPreference}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIETARY_PREFERENCES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Intolerances */}
            <div className="space-y-2">
              <Label>Intolerancias</Label>
              <div className="grid grid-cols-2 gap-2">
                {INTOLERANCES.map(i => (
                  <div key={i.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={i.value}
                      checked={selectedIntolerances.includes(i.value)}
                      onCheckedChange={() => handleIntoleranceToggle(i.value)}
                    />
                    <label htmlFor={i.value} className="text-sm cursor-pointer">
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
              disabled={isLoading}
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
                                          // Handle both string and object formats
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
    </div>
  );
}
