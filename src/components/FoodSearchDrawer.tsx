import { useState, useEffect, useCallback, useRef } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, Flame, Check, Loader2, PenLine, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMealConsumption, type ConsumedItem } from "@/hooks/useMealConsumption";
import { useIntoleranceWarning } from "@/hooks/useIntoleranceWarning";
import { toast } from "sonner";
import UnifiedFoodSearchBlock, { type SelectedFoodItem, type LookupFood } from "./UnifiedFoodSearchBlock";

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche",
  dinner: "Jantar",
  supper: "Ceia",
};

interface FoodSearchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlanItemId: string;
  mealType?: string;
  onSuccess: () => void;
}

interface SelectedFood {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  quantity: number;
  displayQuantity: number;
  serving_unit: string;
  default_serving_size: number;
}

export default function FoodSearchDrawer({
  open,
  onOpenChange,
  mealPlanItemId,
  mealType,
  onSuccess,
}: FoodSearchDrawerProps) {
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [removingFoodIds, setRemovingFoodIds] = useState<Set<string>>(new Set());
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { saveConsumption } = useMealConsumption();
  const { checkFood } = useIntoleranceWarning();

  // Check food conflicts
  const checkFoodConflicts = useCallback((foodName: string) => {
    const result = checkFood(foodName);
    if (result.hasConflict && result.conflictDetails.length > 0) {
      const firstConflict = result.conflictDetails[0];
      return {
        ingredient: foodName,
        restriction: result.conflicts[0],
        restrictionLabel: firstConflict.label,
        type: firstConflict.type,
        message: firstConflict.message,
      };
    }
    return null;
  }, [checkFood]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedFoods([]);
      setRemovingFoodIds(new Set());
    }
  }, [open]);

  // Handle food selection from unified search block
  const handleSelectFood = useCallback((item: SelectedFoodItem) => {
    setSelectedFoods((prev) => {
      const existing = prev.find((f) => f.id === item.id);
      if (existing) {
        // If already exists, add the quantity
        return prev.map((f) =>
          f.id === item.id
            ? { 
                ...f, 
                quantity: f.quantity + item.quantity_grams,
                displayQuantity: f.displayQuantity + (item.food.serving_unit === 'g' || item.food.serving_unit === 'ml' 
                  ? item.quantity_grams 
                  : item.quantity_grams / (item.food.default_serving_size || 100))
              }
            : f
        );
      }
      // Add new food
      const isGramUnit = item.food.serving_unit === 'g' || item.food.serving_unit === 'ml';
      return [...prev, {
        id: item.id,
        name: item.name,
        calories_per_100g: item.food.calories_per_100g,
        protein_per_100g: item.food.protein_per_100g,
        carbs_per_100g: item.food.carbs_per_100g,
        fat_per_100g: item.food.fat_per_100g,
        quantity: item.quantity_grams,
        displayQuantity: isGramUnit ? item.quantity_grams : item.quantity_grams / (item.food.default_serving_size || 100),
        serving_unit: item.food.serving_unit,
        default_serving_size: item.food.default_serving_size,
      }];
    });
  }, []);

  const updateDisplayQuantity = (foodId: string, newValue: string) => {
    const numValue = newValue === '' ? 0 : parseFloat(newValue) || 0;
    setSelectedFoods((prev) =>
      prev.map((f) => {
        if (f.id === foodId) {
          const actualGrams = f.serving_unit === 'g' || f.serving_unit === 'ml' 
            ? numValue 
            : numValue * (f.default_serving_size || 100);
          return { ...f, displayQuantity: numValue, quantity: actualGrams };
        }
        return f;
      })
    );
  };

  const removeFood = (foodId: string, foodName: string) => {
    const foodToRemove = selectedFoods.find((f) => f.id === foodId);
    if (!foodToRemove) return;

    setRemovingFoodIds((prev) => new Set(prev).add(foodId));

    setTimeout(() => {
      setSelectedFoods((prev) => prev.filter((f) => f.id !== foodId));
      setRemovingFoodIds((prev) => {
        const next = new Set(prev);
        next.delete(foodId);
        return next;
      });
    }, 300);

    toast(`"${foodName}" removido`, {
      action: {
        label: "Desfazer",
        onClick: () => {
          setRemovingFoodIds((prev) => {
            const next = new Set(prev);
            next.delete(foodId);
            return next;
          });
          setSelectedFoods((prev) => {
            if (prev.find((f) => f.id === foodId)) return prev;
            return [...prev, foodToRemove];
          });
          toast.success(`"${foodName}" restaurado`);
        },
      },
      duration: 5000,
    });
  };

  const calculateMacros = (food: SelectedFood) => {
    const multiplier = food.quantity / 100;
    return {
      calories: Math.round(food.calories_per_100g * multiplier),
      protein: Math.round(food.protein_per_100g * multiplier * 10) / 10,
      carbs: Math.round(food.carbs_per_100g * multiplier * 10) / 10,
      fat: Math.round(food.fat_per_100g * multiplier * 10) / 10,
    };
  };

  const totals = selectedFoods.reduce(
    (acc, food) => {
      const macros = calculateMacros(food);
      return {
        calories: acc.calories + macros.calories,
        protein: acc.protein + macros.protein,
        carbs: acc.carbs + macros.carbs,
        fat: acc.fat + macros.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const handleSave = async () => {
    if (selectedFoods.length === 0) {
      toast.error("Adicione pelo menos um alimento");
      return;
    }

    setIsSaving(true);

    const items: ConsumedItem[] = selectedFoods.map((food) => {
      const macros = calculateMacros(food);
      return {
        food_id: food.id,
        food_name: food.name,
        quantity_grams: food.quantity,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      };
    });

    const result = await saveConsumption({
      mealPlanItemId,
      followedPlan: false,
      items,
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
    });

    setIsSaving(false);

    if (result.success) {
      toast.success("Consumo registrado com sucesso! 🎉");
      onOpenChange(false);
      onSuccess();
    } else {
      toast.error("Erro ao registrar consumo");
    }
  };

  const getUnitLabel = (unit: string, quantity: number) => {
    if (unit === 'fatia') {
      return quantity === 1 ? 'fatia' : 'fatias';
    }
    if (unit === 'un') {
      return 'un';
    }
    return unit;
  };

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[95vh] max-h-[95vh] flex flex-col">
        <DrawerHeader className="pb-2 pt-3 flex-shrink-0">
          <DrawerTitle className="text-base">
            {mealType ? `${MEAL_TYPE_LABELS[mealType] || mealType} - O que você comeu?` : "Registrar o que você comeu"}
          </DrawerTitle>
        </DrawerHeader>

        {/* Search area - compact, always at top */}
        <div className="px-4 pb-2 flex-shrink-0">
          <UnifiedFoodSearchBlock
            onSelectFood={handleSelectFood}
            scrollHeight="max-h-[30vh]"
            confirmButtonLabel="Adicionar"
            hasSelectedFoods={selectedFoods.length > 0}
            inputRef={searchInputRef}
          />
        </div>

        {/* Scrollable content area - selected foods list */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-3 pb-4">
            {/* Selected foods - compact list */}
            {selectedFoods.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Alimentos ({selectedFoods.length})
                </h4>
                <div className="space-y-1.5">
                  {selectedFoods.map((food) => {
                    const macros = calculateMacros(food);
                    const unitLabel = getUnitLabel(food.serving_unit, food.displayQuantity);
                    const conflict = checkFoodConflicts(food.name);
                    return (
                      <div
                        key={food.id}
                        className={cn(
                          "bg-card border rounded-lg p-2.5 transition-all duration-300",
                          conflict && "border-amber-200 bg-amber-50/30",
                          removingFoodIds.has(food.id) && "opacity-0 scale-95 -translate-x-4"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-medium text-sm truncate">{food.name}</span>
                            {conflict && (
                              <span className="flex items-center gap-0.5 text-[9px] text-amber-600 bg-amber-100 px-1 py-0.5 rounded flex-shrink-0">
                                <AlertTriangle className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          
                          {/* Quantity input inline */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Input
                              type="number"
                              value={food.displayQuantity}
                              onChange={(e) => updateDisplayQuantity(food.id, e.target.value)}
                              className="w-14 h-7 text-center text-xs px-1"
                              min="0"
                              step={food.serving_unit === 'g' || food.serving_unit === 'ml' ? "10" : "1"}
                            />
                            <span className="text-xs text-muted-foreground w-6">
                              {unitLabel}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Flame className="w-3 h-3 text-orange-500" />
                              {macros.calories}
                            </span>
                            <button
                              onClick={() => removeFood(food.id, food.name)}
                              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add more button */}
                <button
                  onClick={focusSearchInput}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar mais
                </button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Bottom section - Macro summary + Save button */}
        {selectedFoods.length > 0 && (
          <div className="px-4 py-3 border-t flex-shrink-0 bg-background space-y-3">
            {/* Macro summary - compact bar */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-4 py-2.5">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-base font-bold text-orange-500">{totals.calories}</p>
                  <p className="text-[10px] text-muted-foreground">kcal</p>
                </div>
                <div>
                  <p className="text-base font-bold text-blue-500">{totals.protein.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">Prot</p>
                </div>
                <div>
                  <p className="text-base font-bold text-amber-500">{totals.carbs.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">Carbs</p>
                </div>
                <div>
                  <p className="text-base font-bold text-red-500">{totals.fat.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">Gord</p>
                </div>
              </div>
            </div>

            {/* Save button */}
            <Button
              className="w-full gradient-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Continuar
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
