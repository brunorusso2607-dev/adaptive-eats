import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Shield, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDynamicDietaryCompatibility } from "@/hooks/useDynamicDietaryCompatibility";
import { useUserProfileContext } from "@/hooks/useUserProfileContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Ingredient = { item: string; quantity: string; unit: string };

interface MealItem {
  id: string;
  recipe_name: string;
  recipe_ingredients: Ingredient[];
}

interface DietaryCompatibilityPanelProps {
  mealPlanId: string;
  className?: string;
}

/**
 * Painel de Compatibilidade Dietética - ISOLADO
 * 
 * Este componente busca dados diretamente do banco de dados,
 * garantindo que sempre mostre informações atualizadas.
 * 
 * Usa o hook useDynamicDietaryCompatibility para validação
 * que está alinhado com o backend globalSafetyEngine.
 */
export function DietaryCompatibilityPanel({ mealPlanId, className }: DietaryCompatibilityPanelProps) {
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  const { getMealCompatibility, hasRestrictions, isLoading: hookLoading } = useDynamicDietaryCompatibility();
  const { intolerances } = useUserProfileContext();
  
  // Buscar refeições diretamente do banco
  const fetchMeals = async () => {
    if (!mealPlanId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("meal_plan_items")
        .select("id, recipe_name, recipe_ingredients")
        .eq("meal_plan_id", mealPlanId);
      
      if (fetchError) throw fetchError;
      
      const mealsData: MealItem[] = (data || []).map(item => ({
        id: item.id,
        recipe_name: item.recipe_name,
        recipe_ingredients: (item.recipe_ingredients || []) as Ingredient[]
      }));
      
      setMeals(mealsData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("[DietaryCompatibilityPanel] Erro ao buscar refeições:", err);
      setError("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Buscar dados quando o mealPlanId mudar
  useEffect(() => {
    fetchMeals();
  }, [mealPlanId]);
  
  // Calcular compatibilidade para todas as refeições
  const compatibilityCounts = useMemo(() => {
    const counts = { good: 0, moderate: 0, incompatible: 0, unknown: 0, total: 0 };
    
    if (!hasRestrictions || hookLoading || meals.length === 0) {
      return counts;
    }
    
    for (const meal of meals) {
      const compatibility = getMealCompatibility(meal.recipe_ingredients);
      counts.total++;
      
      if (compatibility === 'good') counts.good++;
      else if (compatibility === 'moderate') counts.moderate++;
      else if (compatibility === 'incompatible') counts.incompatible++;
      else counts.unknown++;
    }
    
    return counts;
  }, [meals, getMealCompatibility, hasRestrictions, hookLoading]);
  
  // Se não tem restrições configuradas, mostrar painel informativo
  if (!hasRestrictions) {
    return (
      <div className={cn("bg-card rounded-xl border p-4", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">COMPATIBILIDADE DO PLANO</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xl font-bold text-green-600">{meals.length || '—'}</span>
            </div>
            <span className="text-xs text-muted-foreground">Compatíveis</span>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xl font-bold text-amber-600">0</span>
            </div>
            <span className="text-xs text-muted-foreground">Moderadas</span>
          </div>
          <div className="bg-red-500/10 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-xl font-bold text-red-600">0</span>
            </div>
            <span className="text-xs text-muted-foreground">Incompatíveis</span>
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>100% do plano é seguro para você</span>
          <span>{meals.length || 0}/{meals.length || 0}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
          <div className="h-full bg-green-500 w-full" />
        </div>
        <div className="mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            Nenhuma restrição alimentar configurada
          </span>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (isLoading || hookLoading) {
    return (
      <div className={cn("bg-card rounded-xl border p-4", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={cn("bg-card rounded-xl border p-4", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-destructive">{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchMeals}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }
  
  const { good, moderate, incompatible, total } = compatibilityCounts;
  const safePercentage = total > 0 ? Math.round((good / total) * 100) : 0;
  
  // Determinar cor da barra de progresso
  const getProgressColor = () => {
    if (incompatible > 0) return "bg-red-500";
    if (moderate > 0) return "bg-amber-500";
    return "bg-green-500";
  };
  
  return (
    <div className={cn("bg-card rounded-xl border p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">COMPATIBILIDADE DO PLANO</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchMeals}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Atualizar
        </Button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Compatíveis */}
        <div className="bg-green-500/10 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xl font-bold text-green-600">{good}</span>
          </div>
          <span className="text-xs text-muted-foreground">Compatíveis</span>
        </div>
        
        {/* Moderadas */}
        <div className="bg-amber-500/10 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-xl font-bold text-amber-600">{moderate}</span>
          </div>
          <span className="text-xs text-muted-foreground">Moderadas</span>
        </div>
        
        {/* Incompatíveis */}
        <div className="bg-red-500/10 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-xl font-bold text-red-600">{incompatible}</span>
          </div>
          <span className="text-xs text-muted-foreground">Incompatíveis</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {incompatible > 0 
              ? `⚠️ ${incompatible} refeição(ões) com restrições` 
              : "100% do plano é seguro para você"}
          </span>
          <span>{good}/{total}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500", getProgressColor())}
            style={{ width: `${safePercentage}%` }}
          />
        </div>
      </div>
      
      {/* Intolerâncias ativas */}
      {intolerances && intolerances.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            Verificando: {intolerances.filter(i => i !== 'nenhuma').join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}

export default DietaryCompatibilityPanel;
