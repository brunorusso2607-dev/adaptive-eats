import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Utensils,
  Ban,
  TrendingUp,
  ChefHat,
  AlertCircle,
  Scale,
} from "lucide-react";
import {
  useMealSymptomHistory,
  SymptomHistoryFilters,
  MealWithSymptoms,
  RecipeIngredient,
} from "@/hooks/useMealSymptomHistory";
import { exportToCSV, exportToPDF } from "@/lib/exportSymptomReport";
import { SymptomIcon } from "./SymptomIcon";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MealSymptomHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const severityConfig = {
  leve: { label: "Leve", class: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  moderado: { label: "Moderado", class: "bg-orange-500/10 text-orange-700 border-orange-500/20" },
  severo: { label: "Severo", class: "bg-red-500/10 text-red-700 border-red-500/20" },
};

export function MealSymptomHistorySheet({
  open,
  onOpenChange,
}: MealSymptomHistorySheetProps) {
  const [filters, setFilters] = useState<SymptomHistoryFilters>({
    days: 30,
  });

  const { 
    meals, 
    foodCorrelations, 
    suspectFoods, 
    userProfile,
    isLoading,
    isIntoleranceFood,
    isExcludedFood,
  } = useMealSymptomHistory(filters);

  const handleExportCSV = () => {
    exportToCSV(meals, foodCorrelations);
    toast.success("Relatório CSV exportado!");
  };

  const handleExportPDF = () => {
    exportToPDF(meals, foodCorrelations, suspectFoods, filters.days, userProfile);
  };

  const handleExcludeFood = async (food: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("excluded_ingredients")
        .eq("id", session.user.id)
        .single();

      const currentExcluded = profile?.excluded_ingredients || [];
      
      if (currentExcluded.includes(food)) {
        toast.info(`${food} já está na lista de exclusões`);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          excluded_ingredients: [...currentExcluded, food],
        })
        .eq("id", session.user.id);

      if (error) throw error;

      toast.success(`${food} adicionado à lista de exclusões`);
    } catch (err) {
      console.error("Error excluding food:", err);
      toast.error("Erro ao excluir alimento");
    }
  };

  const getDaysLabel = (days: number) => {
    if (days === 0) return "Hoje";
    return `${days} dias`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-6">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Refeições que causaram sintomas
          </SheetTitle>
        </SheetHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 py-4 border-b">
          <Select
            value={filters.days.toString()}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, days: parseInt(v) as 0 | 7 | 14 | 21 | 30 }))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue>{getDaysLabel(filters.days)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Hoje</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="21">21 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.severity || "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, severity: v === "all" ? undefined : v }))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="leve">Leve</SelectItem>
              <SelectItem value="moderado">Moderado</SelectItem>
              <SelectItem value="severo">Severo</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            {/* Suspect Foods Summary */}
            {suspectFoods.length > 0 && (
              <div className="py-4 border-b">
                <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-destructive" />
                  Alimentos Suspeitos
                  <span className="text-xs text-muted-foreground font-normal">
                    (&gt;30% dos casos)
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {suspectFoods.map((food) => (
                    <div
                      key={food.food}
                      className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm font-medium">{food.food}</span>
                      <Badge variant="destructive" className="text-xs">
                        {food.percentage}%
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/20"
                        onClick={() => handleExcludeFood(food.food)}
                        title="Adicionar à lista de exclusões"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Intolerances Info */}
            {userProfile.intolerances.length > 0 && (
              <div className="py-3 border-b bg-orange-50/50 -mx-6 px-6">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Suas intolerâncias: {userProfile.intolerances.join(", ")}
                  <span className="ml-1 text-orange-600">⚠️</span>
                </p>
              </div>
            )}

            {/* Meals List */}
            <div className="py-4 space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Histórico de Refeições ({meals.length})
              </h3>

              {meals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-10 w-10 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">Nenhuma refeição associada a sintomas</p>
                  <p className="text-xs">Isso é ótimo! Continue assim.</p>
                </div>
              ) : (
                meals.map((meal, index) => (
                  <MealCard
                    key={`${meal.mealId}-${index}`}
                    meal={meal}
                    isSuspect={(food: string) =>
                      suspectFoods.some((s) => s.food === food)
                    }
                    isIntoleranceFood={isIntoleranceFood}
                    isExcludedFood={isExcludedFood}
                    onExcludeFood={handleExcludeFood}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MealCard({
  meal,
  isSuspect,
  isIntoleranceFood,
  isExcludedFood,
  onExcludeFood,
}: {
  meal: MealWithSymptoms;
  isSuspect: (food: string) => boolean;
  isIntoleranceFood: (food: string) => boolean;
  isExcludedFood: (food: string) => boolean;
  onExcludeFood: (food: string) => void;
}) {
  const severity = severityConfig[meal.severity as keyof typeof severityConfig];

  const getIngredientClass = (food: string) => {
    if (isExcludedFood(food)) {
      return "bg-red-500/20 text-red-700 border border-red-500/30";
    }
    if (isSuspect(food)) {
      return "bg-destructive/10 text-destructive border border-destructive/20";
    }
    if (isIntoleranceFood(food)) {
      return "bg-orange-500/15 text-orange-700 border border-orange-500/25";
    }
    return "bg-muted text-muted-foreground";
  };

  const getIngredientIcon = (food: string) => {
    if (isExcludedFood(food)) return "🚫";
    if (isSuspect(food)) return "🔴";
    if (isIntoleranceFood(food)) return "⚠️";
    return null;
  };

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-card shadow-sm">
      {/* Recipe Name Header */}
      {meal.recipeName && (
        <div className="flex items-start gap-2 pb-2 border-b border-dashed">
          <ChefHat className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-tight">{meal.recipeName}</p>
          </div>
        </div>
      )}

      {/* Date and Severity */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {format(new Date(meal.mealDate), "dd/MM • HH:mm", { locale: ptBR })}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Sintoma após {meal.timeDiffHours}h
          </p>
        </div>
        <Badge variant="outline" className={cn("text-xs shrink-0", severity?.class)}>
          {severity?.label || meal.severity}
        </Badge>
      </div>

      {/* Recipe Ingredients with quantities */}
      {meal.recipeIngredients.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Scale className="h-3 w-3" />
            Ingredientes da receita:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {meal.recipeIngredients.map((ingredient, i) => {
              const icon = getIngredientIcon(ingredient.item);
              return (
                <div
                  key={i}
                  className={cn(
                    "text-xs px-2 py-1 rounded-lg flex items-center gap-1",
                    getIngredientClass(ingredient.item)
                  )}
                >
                  {icon && <span className="text-[10px]">{icon}</span>}
                  <span className="font-medium">{ingredient.item}</span>
                  <span className="opacity-70">
                    {ingredient.quantity} {ingredient.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Consumed Foods (if different from recipe) */}
      {meal.foods.length > 0 && meal.recipeIngredients.length === 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Alimentos consumidos:</p>
          <div className="flex flex-wrap gap-1.5">
            {meal.foods.map((food, i) => {
              const icon = getIngredientIcon(food);
              return (
                <span
                  key={i}
                  className={cn(
                    "text-xs px-2 py-1 rounded-lg flex items-center gap-1",
                    getIngredientClass(food)
                  )}
                >
                  {icon && <span className="text-[10px]">{icon}</span>}
                  {food}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Calories */}
      {meal.totalCalories > 0 && (
        <p className="text-xs text-muted-foreground">
          🔥 {meal.totalCalories} kcal
        </p>
      )}

      {/* Symptoms */}
      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground mb-1.5">Sintomas:</p>
        <div className="flex flex-wrap gap-1.5">
          {meal.symptoms.map((symptom, i) => (
            <span
              key={i}
              className="flex items-center gap-1 text-xs bg-orange-500/10 text-orange-700 px-2 py-1 rounded-lg"
            >
              <SymptomIcon name={symptom} size={12} />
              {symptom}
            </span>
          ))}
        </div>
      </div>

      {meal.notes && (
        <p className="text-xs text-muted-foreground italic border-t pt-2">{meal.notes}</p>
      )}
    </div>
  );
}
