import { useState, useEffect, useCallback } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Minus, X, Flame, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFoodsSearch, type Food } from "@/hooks/useFoodsSearch";
import { useMealConsumption, type ConsumedItem } from "@/hooks/useMealConsumption";
import { useIngredientConflictCheck } from "@/hooks/useIngredientConflictCheck";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MEAL_TYPE_LABELS: Record<string, string> = {
  cafe_da_manha: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  ceia: "Ceia",
};

interface FoodSearchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlanItemId: string;
  mealType?: string;
  onSuccess: () => void;
}

interface SelectedFood extends Food {
  quantity: number;
}

export default function FoodSearchDrawer({
  open,
  onOpenChange,
  mealPlanItemId,
  mealType,
  onSuccess,
}: FoodSearchDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [userProfile, setUserProfile] = useState<{ intolerances: string[] | null; dietary_preference: string | null } | null>(null);
  const [conflictDialog, setConflictDialog] = useState<{ open: boolean; food: Food | null; conflict: { ingredient: string; restriction: string; restrictionLabel: string } | null }>({
    open: false,
    food: null,
    conflict: null,
  });
  const [isSaving, setIsSaving] = useState(false);

  const { foods, isLoading, searchFoods, clearFoods } = useFoodsSearch();
  const { saveConsumption } = useMealConsumption();
  const { checkConflict } = useIngredientConflictCheck(userProfile);

  // Fetch user profile for conflict checking
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("intolerances, dietary_preference")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setUserProfile(data);
      }
    };

    if (open) {
      fetchProfile();
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchFoods(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchFoods]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedFoods([]);
      clearFoods();
    }
  }, [open, clearFoods]);

  const handleAddFood = useCallback((food: Food) => {
    // Check for conflicts
    const conflict = checkConflict(food.name);
    
    if (conflict) {
      setConflictDialog({ open: true, food, conflict });
      return;
    }

    addFoodToList(food);
  }, [checkConflict]);

  const addFoodToList = (food: Food) => {
    setSelectedFoods((prev) => {
      const existing = prev.find((f) => f.id === food.id);
      if (existing) {
        return prev.map((f) =>
          f.id === food.id ? { ...f, quantity: f.quantity + 100 } : f
        );
      }
      return [...prev, { ...food, quantity: 100 }];
    });
    setSearchQuery("");
    clearFoods();
  };

  const handleConfirmConflict = () => {
    if (conflictDialog.food) {
      addFoodToList(conflictDialog.food);
    }
    setConflictDialog({ open: false, food: null, conflict: null });
  };

  const updateQuantity = (foodId: string, delta: number) => {
    setSelectedFoods((prev) =>
      prev
        .map((f) =>
          f.id === foodId
            ? { ...f, quantity: Math.max(10, f.quantity + delta) }
            : f
        )
        .filter((f) => f.quantity > 0)
    );
  };

  const removeFood = (foodId: string) => {
    setSelectedFoods((prev) => prev.filter((f) => f.id !== foodId));
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

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[95vh] max-h-[95vh] flex flex-col">
          <DrawerHeader className="pb-1 pt-2 flex-shrink-0">
            <DrawerTitle className="text-base">
              {mealType ? `${MEAL_TYPE_LABELS[mealType] || mealType} - O que você comeu?` : "Registrar o que você comeu"}
            </DrawerTitle>
          </DrawerHeader>

          {/* Search input with dropdown results */}
          <div className="px-4 pb-3 flex-shrink-0 relative z-20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar alimento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Search results dropdown - positioned absolutely */}
            {(isLoading || foods.length > 0) && (
              <div 
                className="absolute left-4 right-4 top-full mt-1 bg-background rounded-lg border shadow-lg z-50 max-h-64 overflow-y-auto"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                }}
                onTouchStart={(e) => {
                  const el = e.currentTarget;
                  (el as any)._startY = e.touches[0].clientY;
                }}
                onTouchMove={(e) => {
                  const el = e.currentTarget;
                  const startY = (el as any)._startY || 0;
                  const currentY = e.touches[0].clientY;
                  const deltaY = startY - currentY;
                  const isScrollingDown = deltaY > 0;
                  const isScrollingUp = deltaY < 0;
                  const isAtTop = el.scrollTop <= 0;
                  const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
                  if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
                    e.preventDefault();
                  }
                  e.stopPropagation();
                }}
              >
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                    Buscando...
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {foods.map((food) => (
                      <button
                        key={food.id}
                        onClick={() => handleAddFood(food)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-md transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">{food.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">adicionar</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scrollable content area */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 pb-4">

              {/* Selected foods */}
              {selectedFoods.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Alimentos selecionados
                  </h4>
                  <div className="space-y-2">
                    {selectedFoods.map((food) => {
                      const macros = calculateMacros(food);
                      return (
                        <div
                          key={food.id}
                          className="bg-card border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{food.name}</span>
                            <button
                              onClick={() => removeFood(food.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Quantity controls */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(food.id, -10)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-sm font-medium w-16 text-center">
                                {food.quantity}g
                              </span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(food.id, 10)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Macros display */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Flame className="w-3 h-3 text-orange-500" />
                                {macros.calories}
                              </span>
                              <span>P: {macros.protein}g</span>
                              <span>C: {macros.carbs}g</span>
                              <span>G: {macros.fat}g</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add more foods button */}
              {selectedFoods.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>('input[placeholder="Buscar alimento..."]');
                    input?.focus();
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar alimento
                </Button>
              )}

              {/* Totals */}
              {selectedFoods.length > 0 && (
                <div className="bg-primary/10 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">Total</h4>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-primary">{totals.calories}</p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-500">{totals.protein.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Proteína</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-500">{totals.carbs.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Carbos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-500">{totals.fat.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Gordura</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Save button - fixed at bottom */}
          <div className="px-4 py-4 border-t flex-shrink-0 bg-background">
            <Button
              className="w-full gradient-primary"
              onClick={handleSave}
              disabled={selectedFoods.length === 0 || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Salvar consumo
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Conflict Dialog - Design sutil */}
      <AlertDialog
        open={conflictDialog.open}
        onOpenChange={(open) =>
          !open && setConflictDialog({ open: false, food: null, conflict: null })
        }
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-medium">
              {conflictDialog.food?.name}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
                  Contém {conflictDialog.conflict?.restrictionLabel?.toLowerCase()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Você indicou ter restrição a este tipo de alimento. Deseja adicionar mesmo assim?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmConflict}>
              Adicionar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
