import { useState, useEffect } from 'react';
import { RefreshCw, Check, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIngredientSubstitutes, type SubstituteRequest } from '@/hooks/useIngredientSubstitutes';
import { Loader2 } from 'lucide-react';

interface IngredientSubstituteDropdownProps {
  mealPlanItemId: string;
  componentIndex: number;
  ingredient: {
    id: string;
    name: string;
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  userProfile: {
    intolerances?: string[];
    dietary_preference?: string;
    excluded_ingredients?: string[];
  };
  currentMealIngredients: string[];
  onSubstituted?: () => void;
}

export function IngredientSubstituteDropdown({
  mealPlanItemId,
  componentIndex,
  ingredient,
  userProfile,
  currentMealIngredients,
  onSubstituted
}: IngredientSubstituteDropdownProps) {
  const { substitutes, isLoading, fetchSubstitutes, applySubstitute } = useIngredientSubstitutes();
  const [isOpen, setIsOpen] = useState(false);

  // Buscar substituições quando o dropdown abrir
  useEffect(() => {
    if (isOpen && substitutes.length === 0 && !isLoading) {
      const request: SubstituteRequest = {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        currentGrams: ingredient.grams,
        currentCaloriesPer100g: (ingredient.calories / ingredient.grams) * 100,
        currentProteinPer100g: (ingredient.protein / ingredient.grams) * 100,
        currentCarbsPer100g: (ingredient.carbs / ingredient.grams) * 100,
        currentFatPer100g: (ingredient.fat / ingredient.grams) * 100,
        userIntolerances: userProfile.intolerances || [],
        dietaryPreference: userProfile.dietary_preference || undefined,
        excludedIngredients: userProfile.excluded_ingredients || [],
        currentMealIngredients: currentMealIngredients,
        maxResults: 10
      };

      fetchSubstitutes(request);
    }
  }, [isOpen]);

  const handleSubstitute = async (substitute: any) => {
    const success = await applySubstitute(mealPlanItemId, componentIndex, substitute);
    if (success) {
      setIsOpen(false);
      if (onSubstituted) {
        onSubstituted();
      }
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      protein: 'Proteína',
      carbohydrate: 'Carboidrato',
      vegetable: 'Vegetal',
      fruit: 'Fruta',
      fat: 'Gordura',
      dairy: 'Laticínio',
      grain: 'Grão',
      legume: 'Leguminosa',
      beverage: 'Bebida',
      condiment: 'Condimento',
      other: 'Outro'
    };
    return labels[category] || category;
  };

  const getMatchBadge = (matchScore: number) => {
    if (matchScore >= 90) {
      return <Badge variant="default" className="bg-green-500">Perfeito</Badge>;
    } else if (matchScore >= 75) {
      return <Badge variant="default" className="bg-blue-500">Ótimo</Badge>;
    } else if (matchScore >= 60) {
      return <Badge variant="secondary">Bom</Badge>;
    } else {
      return <Badge variant="outline">Regular</Badge>;
    }
  };

  const getDiffIcon = (diff: number) => {
    if (Math.abs(diff) <= 10) {
      return <Check className="h-3 w-3 text-green-500" />;
    } else if (Math.abs(diff) <= 20) {
      return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    } else {
      return <AlertTriangle className="h-3 w-3 text-orange-500" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-primary/10"
        >
          <RefreshCw className="h-4 w-4 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Substituir por:</span>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Buscando substituições...
          </div>
        )}

        {!isLoading && substitutes.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma substituição disponível
          </div>
        )}

        {!isLoading && substitutes.map((substitute, index) => (
          <DropdownMenuItem
            key={substitute.id}
            onClick={() => handleSubstitute(substitute)}
            className="flex flex-col items-start p-3 cursor-pointer hover:bg-accent"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="font-medium text-sm">{substitute.name}</span>
              {getMatchBadge(substitute.matchScore)}
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              {substitute.suggestedGrams}g • {getCategoryLabel(substitute.category)}
            </div>
            
            <div className="grid grid-cols-2 gap-2 w-full text-xs">
              <div className="flex items-center gap-1">
                {getDiffIcon(substitute.caloriesDiff)}
                <span>
                  {substitute.calories} kcal
                  {substitute.caloriesDiff !== 0 && (
                    <span className={substitute.caloriesDiff > 0 ? "text-orange-500" : "text-green-500"}>
                      {' '}({substitute.caloriesDiff > 0 ? '+' : ''}{substitute.caloriesDiff}%)
                    </span>
                  )}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                {getDiffIcon(substitute.proteinDiff)}
                <span>
                  {substitute.protein}g P
                  {substitute.proteinDiff !== 0 && (
                    <span className={substitute.proteinDiff > 0 ? "text-green-500" : "text-orange-500"}>
                      {' '}({substitute.proteinDiff > 0 ? '+' : ''}{substitute.proteinDiff}%)
                    </span>
                  )}
                </span>
              </div>
              
              <div className="text-muted-foreground">
                {substitute.carbs}g C
              </div>
              
              <div className="text-muted-foreground">
                {substitute.fat}g G
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
