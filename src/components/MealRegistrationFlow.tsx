import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Clock, Flame, Beef, Wheat, Droplets, UtensilsCrossed, Loader2, AlertTriangle, ArrowRightLeft, Plus, Database, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getMealLabelsSync, getMealOrderSync } from "@/lib/mealTimeConfig";
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
import { format, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type PendingMealForReplacement } from "@/hooks/useMealTimeDetection";

export interface MealData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ConsumptionItem {
  food_id: string | null;
  food_name: string;
  quantity_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // Nutritional data source tracking
  calculo_fonte?: "tabela_foods" | "estimativa_ia";
  alimento_encontrado?: string;
}

interface DuplicateMeal {
  id: string;
  custom_meal_name: string;
  consumed_at: string;
  total_calories: number;
}

interface MealRegistrationFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealData: MealData;
  items?: ConsumptionItem[];
  sourceType: 'photo' | 'manual';
  onSuccess?: () => void;
  onBack?: () => void;
  // Novas props para fluxo automático
  autoDetectedMealType?: string;
  autoDetectedMealLabel?: string;
  pendingMealToReplace?: PendingMealForReplacement | null;
}

export default function MealRegistrationFlow({
  open,
  onOpenChange,
  mealData,
  items = [],
  sourceType,
  onSuccess,
  onBack,
  autoDetectedMealType,
  autoDetectedMealLabel,
  pendingMealToReplace,
}: MealRegistrationFlowProps) {
  // Se temos detecção automática, pular a seleção de meal type
  const hasAutoDetection = !!autoDetectedMealType && autoDetectedMealType !== 'extra';
  // Determinar step inicial baseado em detecção automática
  const [step, setStep] = useState<'meal-type' | 'time' | 'replace-confirm'>(() => {
    // Se temos refeição pendente para substituir, mostrar confirmação
    if (hasAutoDetection && pendingMealToReplace) {
      return 'replace-confirm';
    }
    // Se temos detecção automática, pular direto para horário
    if (hasAutoDetection) {
      return 'time';
    }
    return 'meal-type';
  });
  const [selectedMealType, setSelectedMealType] = useState<string | null>(() => {
    return hasAutoDetection ? autoDetectedMealType : null;
  });
  const [replaceChoice, setReplaceChoice] = useState<'replace' | 'extra' | null>(null);
  const [customMealName, setCustomMealName] = useState("");
  const [selectedTime, setSelectedTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateMeal, setDuplicateMeal] = useState<DuplicateMeal | null>(null);

  const mealLabels = getMealLabelsSync();
  const mealOrder = getMealOrderSync();

  // Resetar estado quando abre com novas props
  useEffect(() => {
    if (open) {
      console.log("[MealRegistrationFlow] Opening with:", {
        hasAutoDetection,
        autoDetectedMealType,
        pendingMealToReplace,
      });

      // MealRegistrationFlow só abre quando há refeição pendente (lógica no FreeFormMealLogger)
      if (hasAutoDetection && pendingMealToReplace) {
        console.log("[MealRegistrationFlow] Has pending meal, showing replace-confirm");
        setStep('replace-confirm');
        setSelectedMealType(autoDetectedMealType);
        setReplaceChoice(null);
      }
    }
  }, [open, hasAutoDetection, autoDetectedMealType, pendingMealToReplace]);

  // Reset on close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep(hasAutoDetection ? (pendingMealToReplace ? 'replace-confirm' : 'time') : 'meal-type');
      setSelectedMealType(hasAutoDetection ? autoDetectedMealType : null);
      setReplaceChoice(null);
      setCustomMealName("");
      const now = new Date();
      setSelectedTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }
    onOpenChange(newOpen);
  };

  const handleSelectMealType = (mealType: string) => {
    setSelectedMealType(mealType);
    setCustomMealName("");
    setStep('time');
  };

  const handleSelectCustomMeal = () => {
    if (!customMealName.trim()) {
      toast.error("Digite um nome para a refeição");
      return;
    }
    setSelectedMealType('extra');
    setStep('time');
  };

  const handleBack = () => {
    if (step === 'time') {
      if (hasAutoDetection && pendingMealToReplace) {
        setStep('replace-confirm');
      } else if (!hasAutoDetection) {
        setStep('meal-type');
      } else if (onBack) {
        onBack();
        handleOpenChange(false);
      }
    } else if (step === 'replace-confirm') {
      if (onBack) {
        onBack();
        handleOpenChange(false);
      }
    } else if (onBack) {
      onBack();
      handleOpenChange(false);
    }
  };

  // Handlers para escolha de substituição - salva diretamente
  const handleReplaceChoice = async (choice: 'replace' | 'extra') => {
    console.log("[MealRegistrationFlow] handleReplaceChoice:", choice);
    
    // Setar estados antes de salvar
    if (choice === 'extra') {
      setSelectedMealType('extra');
    } else {
      setSelectedMealType(autoDetectedMealType || 'extra');
    }
    setReplaceChoice(choice);
    
    // Salvar diretamente usando horário atual (sem ir para tela de horário)
    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessão expirada. Faça login novamente.");
        setIsSaving(false);
        return;
      }

      // Usar horário atual
      const consumedAt = new Date();
      const currentTime = `${String(consumedAt.getHours()).padStart(2, '0')}:${String(consumedAt.getMinutes()).padStart(2, '0')}`;

      // Get final meal name - priorizar mealData.name que vem do FreeFormMealLogger
      const finalMealName = mealData.name || customMealName || mealLabels[autoDetectedMealType || 'extra'] || 'Refeição';
      const mealType = choice === 'extra' ? 'extra' : (autoDetectedMealType || 'extra');

      console.log("[MealRegistrationFlow] Saving meal directly:", {
        mealType,
        mealName: finalMealName,
        calories: mealData.calories,
        consumedAt: consumedAt.toISOString(),
        choice,
      });

      // Determinar se está substituindo refeição do plano
      const isReplacingPlanMeal = choice === 'replace' && pendingMealToReplace;

      // Create meal consumption record
      const { data: consumption, error: consumptionError } = await supabase
        .from("meal_consumption")
        .insert({
          user_id: user.id,
          meal_plan_item_id: isReplacingPlanMeal ? pendingMealToReplace.id : null,
          followed_plan: false,
          total_calories: Math.round(mealData.calories || 0),
          total_protein: Math.round((mealData.protein || 0) * 10) / 10,
          total_carbs: Math.round((mealData.carbs || 0) * 10) / 10,
          total_fat: Math.round((mealData.fat || 0) * 10) / 10,
          consumed_at: consumedAt.toISOString(),
          source_type: sourceType,
          custom_meal_name: finalMealName.slice(0, 255),
          meal_time: currentTime + ':00',
          detected_meal_type: mealType,
        })
        .select()
        .single();

      if (consumptionError) {
        console.error("[MealRegistrationFlow] Consumption insert error:", consumptionError);
        throw new Error(`Erro ao salvar refeição: ${consumptionError.message}`);
      }

      console.log("[MealRegistrationFlow] Meal saved successfully:", consumption.id);

      // Se está substituindo, marcar meal_plan_item como completed
      if (isReplacingPlanMeal) {
        const { error: updateError } = await supabase
          .from("meal_plan_items")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", pendingMealToReplace.id);

        if (updateError) {
          console.warn("[MealRegistrationFlow] Error marking plan item as completed:", updateError);
        }
      }

      // Insert consumption items if provided
      if (items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          meal_consumption_id: consumption.id,
          food_id: item.food_id,
          food_name: String(item.food_name || "Item").slice(0, 255),
          quantity_grams: Math.max(1, Math.min(item.quantity_grams, 10000)),
          calories: Math.round(item.calories || 0),
          protein: Math.round((item.protein || 0) * 10) / 10,
          carbs: Math.round((item.carbs || 0) * 10) / 10,
          fat: Math.round((item.fat || 0) * 10) / 10,
        }));

        console.log("[MealRegistrationFlow] Inserting items:", itemsToInsert.length);

        const { error: itemsError } = await supabase
          .from("consumption_items")
          .insert(itemsToInsert);

        if (itemsError) {
          console.error("[MealRegistrationFlow] Items insert error:", itemsError);
          toast.warning("Refeição registrada, mas alguns detalhes não foram salvos.");
        }
      }

      toast.success("Refeição registrada com sucesso!");
      handleOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("[MealRegistrationFlow] Error:", error);
      const message = error?.message || "Erro desconhecido ao registrar refeição";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Check for duplicate meals
  const checkForDuplicate = async (): Promise<DuplicateMeal | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get meal name
      const finalMealName = customMealName || mealData.name;

      // Parse selected time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const selectedDateTime = new Date();
      selectedDateTime.setHours(hours, minutes, 0, 0);

      // Check for meals in the last hour with similar calories (within 10%)
      const oneHourAgo = new Date(selectedDateTime);
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const oneHourLater = new Date(selectedDateTime);
      oneHourLater.setHours(oneHourLater.getHours() + 1);

      const { data: recentMeals } = await supabase
        .from("meal_consumption")
        .select("id, custom_meal_name, consumed_at, total_calories")
        .eq("user_id", user.id)
        .gte("consumed_at", oneHourAgo.toISOString())
        .lte("consumed_at", oneHourLater.toISOString())
        .order("consumed_at", { ascending: false });

      if (!recentMeals || recentMeals.length === 0) return null;

      const currentCalories = Math.round(mealData.calories || 0);
      
      // Find a meal with similar name or similar calories (within 10%)
      for (const meal of recentMeals) {
        const caloriesDiff = Math.abs(meal.total_calories - currentCalories);
        const caloriesMatch = caloriesDiff <= currentCalories * 0.1;
        const nameMatch = meal.custom_meal_name?.toLowerCase() === finalMealName.toLowerCase();
        
        // Check time proximity (within 10 minutes)
        const mealTime = new Date(meal.consumed_at);
        const timeDiff = Math.abs(differenceInMinutes(mealTime, selectedDateTime));
        const timeMatch = timeDiff <= 10;

        if ((nameMatch || caloriesMatch) && timeMatch) {
          return meal;
        }
      }

      return null;
    } catch (error) {
      console.error("[MealRegistrationFlow] Error checking duplicates:", error);
      return null;
    }
  };

  const handleSave = async (skipDuplicateCheck = false) => {
    if (!selectedMealType) {
      toast.error("Selecione o tipo de refeição");
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      // Check for duplicates unless skipped
      if (!skipDuplicateCheck) {
        const duplicate = await checkForDuplicate();
        if (duplicate) {
          setDuplicateMeal(duplicate);
          setDuplicateDialogOpen(true);
          setIsSaving(false);
          return;
        }
      }

      // Parse time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const consumedAt = new Date();
      consumedAt.setHours(hours, minutes, 0, 0);

      // Get final meal name - priorizar mealData.name que vem do FreeFormMealLogger
      const finalMealName = mealData.name || customMealName || mealLabels[selectedMealType] || selectedMealType;

      console.log("[MealRegistrationFlow] Saving meal:", {
        mealType: selectedMealType,
        mealName: finalMealName,
        calories: mealData.calories,
        consumedAt: consumedAt.toISOString(),
        itemsCount: items.length,
        sourceType,
      });

      // Determinar se está substituindo refeição do plano
      const isReplacingPlanMeal = replaceChoice === 'replace' && pendingMealToReplace;

      // Create meal consumption record
      const { data: consumption, error: consumptionError } = await supabase
        .from("meal_consumption")
        .insert({
          user_id: user.id,
          meal_plan_item_id: isReplacingPlanMeal ? pendingMealToReplace.id : null,
          followed_plan: isReplacingPlanMeal ? false : false,
          total_calories: Math.round(mealData.calories || 0),
          total_protein: Math.round((mealData.protein || 0) * 10) / 10,
          total_carbs: Math.round((mealData.carbs || 0) * 10) / 10,
          total_fat: Math.round((mealData.fat || 0) * 10) / 10,
          consumed_at: consumedAt.toISOString(),
          source_type: sourceType,
          custom_meal_name: finalMealName.slice(0, 255),
          meal_time: selectedTime + ':00',
          detected_meal_type: autoDetectedMealType || selectedMealType,
        })
        .select()
        .single();

      if (consumptionError) {
        console.error("[MealRegistrationFlow] Consumption insert error:", consumptionError);
        throw new Error(`Erro ao salvar refeição: ${consumptionError.message}`);
      }

      // Se está substituindo, marcar meal_plan_item como completed
      if (isReplacingPlanMeal) {
        const { error: updateError } = await supabase
          .from("meal_plan_items")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", pendingMealToReplace.id);

        if (updateError) {
          console.warn("[MealRegistrationFlow] Error marking plan item as completed:", updateError);
        }
      }

      // Insert consumption items if provided
      if (items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          meal_consumption_id: consumption.id,
          food_id: item.food_id,
          food_name: String(item.food_name || "Item").slice(0, 255),
          quantity_grams: Math.max(1, Math.min(item.quantity_grams, 10000)),
          calories: Math.round(item.calories || 0),
          protein: Math.round((item.protein || 0) * 10) / 10,
          carbs: Math.round((item.carbs || 0) * 10) / 10,
          fat: Math.round((item.fat || 0) * 10) / 10,
        }));

        console.log("[MealRegistrationFlow] Inserting items:", itemsToInsert.length);

        const { error: itemsError } = await supabase
          .from("consumption_items")
          .insert(itemsToInsert);

        if (itemsError) {
          console.error("[MealRegistrationFlow] Items insert error:", itemsError);
          toast.warning("Refeição registrada, mas alguns detalhes não foram salvos.");
        }
      }

      toast.success("Refeição registrada com sucesso!");
      handleOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("[MealRegistrationFlow] Error:", error);
      const message = error?.message || "Erro desconhecido ao registrar refeição";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDuplicate = () => {
    setDuplicateDialogOpen(false);
    handleSave(true);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] flex flex-col p-0">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="px-4 pb-3 flex-shrink-0 border-b">
          <SheetTitle className="text-base flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            {step === 'replace-confirm' && "Registrar Refeição"}
            {step === 'meal-type' && "Qual refeição?"}
            {step === 'time' && "Que horas foi?"}
          </SheetTitle>
        </SheetHeader>

        {/* Summary header with meal info and macros */}
        <div className="px-4 py-3 bg-muted/30 border-b">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium truncate flex-1">
              {mealData.name || "Refeição"}
            </p>
            {/* Data source indicator */}
            {items.length > 0 && (() => {
              const fontes = items.map(i => i.calculo_fonte || 'estimativa_ia');
              const hasTabela = fontes.some(f => f === 'tabela_foods');
              const hasIA = fontes.some(f => f === 'estimativa_ia');
              const fonteMista = hasTabela && hasIA;
              
              return (
                <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                  {fonteMista ? (
                    <>
                      <Database className="w-3 h-3" />
                      <span>+</span>
                      <Sparkles className="w-3 h-3" />
                    </>
                  ) : hasTabela ? (
                    <Database className="w-3 h-3 text-green-500" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-blue-500" />
                  )}
                </span>
              );
            })()}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              {Math.round(mealData.calories)} kcal
            </span>
            <span className="flex items-center gap-1">
              <Beef className="w-3.5 h-3.5 text-red-500" />
              {Math.round(mealData.protein)}g
            </span>
            <span className="flex items-center gap-1">
              <Wheat className="w-3.5 h-3.5 text-amber-500" />
              {Math.round(mealData.carbs)}g
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-yellow-500" />
              {Math.round(mealData.fat)}g
            </span>
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-4 py-4">
            {/* Step: Replace confirmation */}
            {step === 'replace-confirm' && pendingMealToReplace && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Você tem uma refeição planejada para agora:
                </p>

                {/* Pending meal card */}
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <p className="font-medium text-sm">{pendingMealToReplace.recipe_name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span>{pendingMealToReplace.recipe_calories} kcal</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Deseja substituir por <span className="font-medium text-foreground">"{mealData.name}"</span>?
                </p>

                {/* Action buttons side by side */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleReplaceChoice('extra')}
                    variant="outline"
                    className="flex-1"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Não, manter
                  </Button>
                  <Button
                    onClick={() => handleReplaceChoice('replace')}
                    className="flex-1"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Sim, substituir
                  </Button>
                </div>
              </div>
            )}

            {/* Step 1: Select meal type */}
            {step === 'meal-type' && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Selecione o tipo de refeição:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {mealOrder.map((mealType) => (
                      <button
                        key={mealType}
                        onClick={() => handleSelectMealType(mealType)}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all text-left",
                          selectedMealType === mealType
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <p className="font-medium text-sm">{mealLabels[mealType] || mealType}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom meal name option */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Ou dê um nome personalizado:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: Lanche da tarde, Pós-treino..."
                      value={customMealName}
                      onChange={(e) => setCustomMealName(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={!customMealName.trim()}
                      onClick={handleSelectCustomMeal}
                    >
                      OK
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Select time */}
            {step === 'time' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Selecione o horário aproximado da refeição
                </p>
                
                <div className="flex items-center justify-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-32 text-center text-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with action buttons */}
        <div className="px-4 py-4 border-t flex-shrink-0 space-y-2">
          {step === 'time' && (
            <Button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="w-full gradient-primary"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Registrar Refeição
                </>
              )}
            </Button>
          )}
          
          <Button
            variant="ghost"
            onClick={handleBack}
            className="w-full"
            size="sm"
          >
            Voltar
          </Button>
        </div>

        {/* Duplicate confirmation dialog */}
        <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Refeição similar encontrada
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Já existe uma refeição similar registrada recentemente:
                </p>
                {duplicateMeal && (
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <p className="font-medium">{duplicateMeal.custom_meal_name}</p>
                    <p className="text-muted-foreground">
                      {format(parseISO(duplicateMeal.consumed_at), "HH:mm", { locale: ptBR })} • {duplicateMeal.total_calories} kcal
                    </p>
                  </div>
                )}
                <p>Deseja registrar novamente?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDuplicate}>
                Registrar mesmo assim
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
