import { useState, useEffect, useCallback, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flame, Loader2, Trash2, UtensilsCrossed, AlertTriangle, Check, Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIntoleranceWarning, type ConflictDetail } from "@/hooks/useIntoleranceWarning";
import UnifiedFoodSearchBlock, { type SelectedFoodItem } from "./UnifiedFoodSearchBlock";
import MealRegistrationFlow, { MealData, ConsumptionItem } from "./MealRegistrationFlow";
import IntoleranceConfirmDialog from "./IntoleranceConfirmDialog";
import IntoleranceBadge from "./IntoleranceBadge";
import MealNameDialog from "./MealNameDialog";
import { useMealTimeDetection } from "@/hooks/useMealTimeDetection";
import { supabase } from "@/integrations/supabase/client";

interface FreeFormMealLoggerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
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

export default function FreeFormMealLogger({
  open,
  onOpenChange,
  onSuccess,
}: FreeFormMealLoggerProps) {
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [customMealName, setCustomMealName] = useState("");
  const [showRegistrationFlow, setShowRegistrationFlow] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictDetail[]>([]);
  const [showMealNameDialog, setShowMealNameDialog] = useState(false);
  const [isSavingDirectly, setIsSavingDirectly] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { checkFood, checkMeal } = useIntoleranceWarning();
  
  // Detectar automaticamente o tipo de refeição e refeição pendente
  const {
    detectedMealType,
    detectedMealLabel,
    pendingMeal,
    hasPendingMeal,
    isLoading: isDetectionLoading,
    refresh: refreshDetection,
  } = useMealTimeDetection();

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
      setCustomMealName("");
      setShowRegistrationFlow(false);
      setShowMealNameDialog(false);
    } else {
      // Refresh detection when opening
      refreshDetection();
    }
  }, [open, refreshDetection]);

  const handleSelectFood = useCallback((item: SelectedFoodItem) => {
    setSelectedFoods((prev) => {
      const existing = prev.find((f) => f.id === item.id);
      if (existing) {
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

  const getUnitLabel = (unit: string, quantity: number) => {
    if (unit === 'fatia') return quantity === 1 ? 'fatia' : 'fatias';
    if (unit === 'un') return 'un';
    return unit;
  };

  const foodsWithZeroQuantity = selectedFoods.filter(f => f.displayQuantity <= 0);
  const hasZeroQuantityFoods = foodsWithZeroQuantity.length > 0;

  // Verificar conflitos de todos os alimentos selecionados
  const getAllConflicts = useCallback((): ConflictDetail[] => {
    const allConflicts: ConflictDetail[] = [];
    for (const food of selectedFoods) {
      const result = checkFood(food.name);
      if (result.hasConflict) {
        result.conflictDetails.forEach(conflict => {
          if (!allConflicts.find(c => c.restrictionKey === conflict.restrictionKey)) {
            allConflicts.push(conflict);
          }
        });
      }
    }
    return allConflicts;
  }, [selectedFoods, checkFood]);

  const handleContinue = () => {
    if (selectedFoods.length === 0) {
      toast.error("Adicione pelo menos um alimento");
      return;
    }
    if (hasZeroQuantityFoods) return;
    
    // Verificar conflitos antes de continuar
    const conflicts = getAllConflicts();
    if (conflicts.length > 0) {
      setPendingConflicts(conflicts);
      setShowConfirmDialog(true);
    } else {
      // Abrir dialog para nomear a refeição
      setShowMealNameDialog(true);
    }
  };

  const handleConfirmWithConflicts = () => {
    setShowConfirmDialog(false);
    setPendingConflicts([]);
    // Abrir dialog para nomear a refeição
    setShowMealNameDialog(true);
  };

  const handleMealNameConfirm = async (mealName: string) => {
    console.log("[FreeFormMealLogger] handleMealNameConfirm:", mealName, "hasPendingMeal:", hasPendingMeal);
    setCustomMealName(mealName);
    setShowMealNameDialog(false);
    
    // Se NÃO há refeição pendente, salvar diretamente sem abrir MealRegistrationFlow
    if (!hasPendingMeal) {
      console.log("[FreeFormMealLogger] No pending meal, saving directly");
      await saveDirectly(mealName);
      return;
    }
    
    // Se há refeição pendente, abrir MealRegistrationFlow para perguntar substituição
    console.log("[FreeFormMealLogger] Has pending meal, opening MealRegistrationFlow");
    setTimeout(() => {
      setShowRegistrationFlow(true);
    }, 0);
  };

  // Salvar diretamente sem abrir MealRegistrationFlow
  const saveDirectly = async (mealName: string) => {
    setIsSavingDirectly(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessão expirada. Faça login novamente.");
        setIsSavingDirectly(false);
        return;
      }

      const consumedAt = new Date();
      const currentTime = `${String(consumedAt.getHours()).padStart(2, '0')}:${String(consumedAt.getMinutes()).padStart(2, '0')}`;
      const mealType = detectedMealType || 'extra';

      console.log("[FreeFormMealLogger] Saving meal directly:", {
        mealType,
        mealName,
        calories: totals.calories,
      });

      // Create meal consumption record
      const { data: consumption, error: consumptionError } = await supabase
        .from("meal_consumption")
        .insert({
          user_id: user.id,
          meal_plan_item_id: null,
          followed_plan: false,
          total_calories: Math.round(totals.calories || 0),
          total_protein: Math.round((totals.protein || 0) * 10) / 10,
          total_carbs: Math.round((totals.carbs || 0) * 10) / 10,
          total_fat: Math.round((totals.fat || 0) * 10) / 10,
          consumed_at: consumedAt.toISOString(),
          source_type: 'manual',
          custom_meal_name: mealName.slice(0, 255),
          meal_time: currentTime + ':00',
          detected_meal_type: mealType,
        })
        .select()
        .single();

      if (consumptionError) {
        console.error("[FreeFormMealLogger] Consumption insert error:", consumptionError);
        throw new Error(`Erro ao salvar refeição: ${consumptionError.message}`);
      }

      console.log("[FreeFormMealLogger] Meal saved successfully:", consumption.id);

      // Insert consumption items
      if (selectedFoods.length > 0) {
        const itemsToInsert = selectedFoods.map((food) => {
          const macros = calculateMacros(food);
          // Validar se food_id é um UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
          const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(food.id);
          return {
            meal_consumption_id: consumption.id,
            food_id: isValidUUID ? food.id : null, // Se não for UUID válido, usa null
            food_name: String(food.name || "Item").slice(0, 255),
            quantity_grams: Math.max(1, Math.min(food.quantity, 10000)),
            calories: Math.round(macros.calories || 0),
            protein: Math.round((macros.protein || 0) * 10) / 10,
            carbs: Math.round((macros.carbs || 0) * 10) / 10,
            fat: Math.round((macros.fat || 0) * 10) / 10,
          };
        });

        console.log("[FreeFormMealLogger] Inserting items:", JSON.stringify(itemsToInsert, null, 2));

        const { error: itemsError } = await supabase
          .from("consumption_items")
          .insert(itemsToInsert);

        if (itemsError) {
          console.error("[FreeFormMealLogger] Items insert error:", itemsError);
          console.error("[FreeFormMealLogger] Error details:", JSON.stringify(itemsError, null, 2));
          toast.warning("Refeição registrada, mas alguns detalhes não foram salvos.");
        }
      }

      toast.success("Refeição registrada com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("[FreeFormMealLogger] Error:", error);
      const message = error?.message || "Erro desconhecido ao registrar refeição";
      toast.error(message);
    } finally {
      setIsSavingDirectly(false);
    }
  };

  const handleMealNameBack = () => {
    setShowMealNameDialog(false);
  };

  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
    setPendingConflicts([]);
  };

  const handleRegistrationSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  // Nome da refeição: usar nome personalizado, ou gerar baseado nos alimentos
  const mealDisplayName = customMealName.trim() || 
    (selectedFoods.length === 1 ? selectedFoods[0].name : `${selectedFoods.length} alimentos`);

  console.log("[FreeFormMealLogger] mealDisplayName:", mealDisplayName, "customMealName:", customMealName);

  const mealData: MealData = {
    name: mealDisplayName,
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
  };

  const consumptionItems: ConsumptionItem[] = selectedFoods.map((food) => {
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

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <>
      <Sheet open={open && !showRegistrationFlow} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          
          <SheetHeader className="px-4 pb-2 flex-shrink-0 border-b">
            <SheetTitle className="text-base flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              Registrar Refeição Livre
            </SheetTitle>
          </SheetHeader>

          {/* Main scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2">
            {/* Detected meal type badge */}
            {!isDetectionLoading && (
              <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Detectado como:</span>
                    <span className="text-sm font-medium text-primary">{detectedMealLabel}</span>
                  </div>
                  {hasPendingMeal && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      Substituirá plano
                    </span>
                  )}
                </div>
                {hasPendingMeal && pendingMeal && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Irá substituir: <span className="font-medium">{pendingMeal.recipe_name}</span>
                  </p>
                )}
              </div>
            )}

            {/* Search area */}
            <UnifiedFoodSearchBlock
              onSelectFood={handleSelectFood}
              scrollHeight="h-[calc(100vh-380px)]"
              confirmButtonLabel="Adicionar"
              hasSelectedFoods={selectedFoods.length > 0}
              inputRef={searchInputRef}
            />

            {/* Selected foods list */}
            {selectedFoods.length > 0 && (
              <div className="mt-3 space-y-2">
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
                          "bg-card border rounded-lg p-2.5 transition-all",
                          conflict && "border-amber-200 bg-amber-50/30"
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
                          
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Input 
                              type="number" 
                              value={food.displayQuantity} 
                              onChange={(e) => updateDisplayQuantity(food.id, e.target.value)} 
                              className="w-14 h-7 text-center text-xs px-1" 
                              min="0" 
                            />
                            <span className="text-xs text-muted-foreground w-6">{unitLabel}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Flame className="w-3 h-3 text-orange-500" />
                              {macros.calories}
                            </span>
                            <button 
                              onClick={() => removeFood(food.id)} 
                              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
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
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar mais
                </button>
              </div>
            )}
          </div>

          {/* Bottom section - Macro summary + Continue button */}
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

              {/* Continue button */}
              <Button 
                className="w-full" 
                onClick={handleContinue} 
                disabled={hasZeroQuantityFoods}
              >
                <Check className="w-4 h-4 mr-2" />
                Continuar
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <MealRegistrationFlow
        open={showRegistrationFlow}
        onOpenChange={setShowRegistrationFlow}
        mealData={mealData}
        items={consumptionItems}
        sourceType="manual"
        onSuccess={handleRegistrationSuccess}
        onBack={() => setShowRegistrationFlow(false)}
        autoDetectedMealType={detectedMealType}
        autoDetectedMealLabel={detectedMealLabel}
        pendingMealToReplace={pendingMeal}
      />

      <IntoleranceConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        conflicts={pendingConflicts}
        foodName={selectedFoods.length === 1 ? selectedFoods[0].name : `${selectedFoods.length} alimentos`}
        onConfirm={handleConfirmWithConflicts}
        onCancel={handleCancelConfirm}
      />

      <MealNameDialog
        open={showMealNameDialog}
        onOpenChange={setShowMealNameDialog}
        suggestedName={mealDisplayName}
        foodNames={selectedFoods.map(f => f.name)}
        onConfirm={handleMealNameConfirm}
        onBack={handleMealNameBack}
      />

    </>
  );
}
