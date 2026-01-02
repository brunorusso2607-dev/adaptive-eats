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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileText,
  FileSpreadsheet,
  Clock,
  ChevronDown,
  Utensils,
  Leaf,
} from "lucide-react";
import {
  useMealSymptomHistory,
  SymptomHistoryFilters,
  MealWithSymptoms,
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
  leve: { label: "Leve", dot: "bg-yellow-400" },
  moderado: { label: "Moderado", dot: "bg-orange-400" },
  severo: { label: "Severo", dot: "bg-red-400" },
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
    isTrulySuspect,
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
      <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
        <SheetHeader className="p-6 pb-0 flex-shrink-0">
          <SheetTitle className="text-lg font-semibold">
            Histórico de Sintomas
          </SheetTitle>
        </SheetHeader>

        {/* Filters */}
        <div className="flex items-center gap-2 px-6 py-4 flex-shrink-0">
          <Select
            value={filters.days.toString()}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, days: parseInt(v) as 0 | 7 | 14 | 21 | 30 }))
            }
          >
            <SelectTrigger className="w-28 h-9">
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
            <SelectTrigger className="w-28 h-9">
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

          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleExportPDF}>
            <FileText className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {meals.length === 0 ? (
                <div className="text-center py-16">
                  <Leaf className="h-12 w-12 mx-auto mb-3 text-primary/40" />
                  <p className="text-sm text-muted-foreground">Nenhum sintoma registrado</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Continue assim!</p>
                </div>
              ) : (
                meals.map((meal, index) => (
                  <MealCard
                    key={`${meal.mealId}-${index}`}
                    meal={meal}
                    isTrulySuspect={isTrulySuspect}
                    onExcludeFood={handleExcludeFood}
                    userIntolerances={userProfile.intolerances}
                  />
                ))
              )}
            </div>
          )}
        </div>
        
        {/* Disclaimer - Fixed Footer */}
        <div className="p-4 border-t flex-shrink-0">
          <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
            ⚠️ Este rastreamento é apenas informativo e não substitui orientação médica profissional.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MealCard({
  meal,
  isTrulySuspect,
  onExcludeFood,
  userIntolerances,
}: {
  meal: MealWithSymptoms;
  isTrulySuspect: (food: string) => boolean;
  onExcludeFood: (food: string) => void;
  userIntolerances: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const severity = severityConfig[meal.severity as keyof typeof severityConfig];
  const displayName = meal.recipeName || "Refeição";

  // Get all ingredients
  const ingredients = meal.recipeIngredients.length > 0 
    ? meal.recipeIngredients.map(i => i.item) 
    : meal.foods;
  
  // Count only TRULY problematic ingredients (related to intolerances)
  const suspectIngredients = ingredients.filter(food => isTrulySuspect(food));
  const hasSuspects = suspectIngredients.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left">
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-xl border transition-all",
            "bg-card hover:bg-accent/50",
            isOpen && "bg-accent/30 border-primary/20"
          )}>
            {/* Severity dot */}
            <div className={cn("w-2 h-2 rounded-full shrink-0", severity?.dot || "bg-gray-400")} />
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{displayName}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{format(new Date(meal.mealDate), "dd/MM • HH:mm", { locale: ptBR })}</span>
                <span className="opacity-50">•</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {meal.timeDiffHours}h
                </span>
              </div>
            </div>

            {/* Indicators */}
            <div className="flex items-center gap-2 shrink-0">
              {hasSuspects && (
                <span className="text-xs text-orange-600 bg-orange-500/10 px-2 py-0.5 rounded-full">
                  {suspectIngredients.length} suspeito{suspectIngredients.length > 1 ? 's' : ''}
                </span>
              )}
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-4 pt-2 space-y-4 ml-5 border-l border-dashed">
          {/* Symptoms */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Sintomas</p>
            <div className="flex flex-wrap gap-1.5">
              {meal.symptoms.map((symptom, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 text-xs text-foreground/80 bg-muted px-2 py-1 rounded-md"
                >
                  <SymptomIcon name={symptom} size={12} />
                  {symptom}
                </span>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Ingredientes
                {hasSuspects && (
                  <span className="text-orange-500 ml-1">
                    • {suspectIngredients.length} relacionado{suspectIngredients.length > 1 ? 's' : ''} às suas intolerâncias
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(meal.recipeIngredients.length > 0 
                  ? meal.recipeIngredients 
                  : meal.foods.map(f => ({ item: f, quantity: '', unit: '' }))
                ).map((ingredient, i) => {
                  const item = typeof ingredient === 'string' ? ingredient : ingredient.item;
                  const isSuspect = isTrulySuspect(item);
                  
                  return (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isSuspect) {
                          onExcludeFood(item);
                        }
                      }}
                      disabled={isSuspect}
                      className={cn(
                        "text-xs px-2 py-1 rounded-md transition-colors",
                        isSuspect 
                          ? "bg-orange-500/15 text-orange-700 border border-orange-500/30" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                      title={isSuspect ? "Relacionado à sua intolerância" : "Clique para adicionar à lista de exclusões"}
                    >
                      {item}
                      {typeof ingredient !== 'string' && ingredient.quantity && (
                        <span className="opacity-60 ml-1">
                          {ingredient.quantity}{ingredient.unit}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No suspects message */}
          {!hasSuspects && ingredients.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <span className="font-medium">ℹ️ Nenhum ingrediente suspeito identificado.</span>
                <br />
                <span className="opacity-80">
                  O sintoma pode ter outra causa (estresse, quantidade consumida, horário, 
                  {userIntolerances.length > 0 
                    ? " ou ingrediente não mapeado para suas intolerâncias)." 
                    : " ou atualize suas intolerâncias no perfil)."}
                </span>
              </p>
            </div>
          )}

          {/* Notes */}
          {meal.notes && (
            <p className="text-xs text-muted-foreground italic">{meal.notes}</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
