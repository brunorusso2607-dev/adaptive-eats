import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Clock, Flame, Beef, Wheat, Droplets, UtensilsCrossed, Loader2, AlertTriangle } from "lucide-react";
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

interface FoodItem {
  item: string;
  porcao_estimada: string;
  calorias: number;
  macros: {
    proteinas: number;
    carboidratos: number;
    gorduras: number;
  };
}

interface FoodAnalysis {
  alimentos: FoodItem[];
  total_geral: {
    calorias_totais: number;
    proteinas_totais: number;
    carboidratos_totais: number;
    gorduras_totais: number;
  };
  prato_identificado?: {
    nome?: string;
  };
}

interface DuplicateMeal {
  id: string;
  custom_meal_name: string;
  consumed_at: string;
  total_calories: number;
}

interface RegisterMealFromPhotoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  foodAnalysis: FoodAnalysis;
  onSuccess?: () => void;
}

export default function RegisterMealFromPhotoSheet({
  open,
  onOpenChange,
  foodAnalysis,
  onSuccess,
}: RegisterMealFromPhotoSheetProps) {
  const [step, setStep] = useState<'meal-type' | 'time'>('meal-type');
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateMeal, setDuplicateMeal] = useState<DuplicateMeal | null>(null);

  const mealLabels = getMealLabelsSync();
  const mealOrder = getMealOrderSync();

  // Reset on close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep('meal-type');
      setSelectedMealType(null);
      const now = new Date();
      setSelectedTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }
    onOpenChange(newOpen);
  };

  const handleSelectMealType = (mealType: string) => {
    setSelectedMealType(mealType);
    setStep('time');
  };

  // Check for duplicate meals
  const checkForDuplicate = async (): Promise<DuplicateMeal | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get meal name
      const mealName = foodAnalysis.prato_identificado?.nome || 
        foodAnalysis.alimentos?.[0]?.item || 
        mealLabels[selectedMealType!] || 
        selectedMealType;

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

      const currentCalories = Math.round(foodAnalysis.total_geral.calorias_totais || 0);
      
      // Find a meal with similar name or similar calories (within 10%)
      for (const meal of recentMeals) {
        const caloriesDiff = Math.abs(meal.total_calories - currentCalories);
        const caloriesMatch = caloriesDiff <= currentCalories * 0.1;
        const nameMatch = meal.custom_meal_name?.toLowerCase() === mealName.toLowerCase();
        
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
      console.error("[RegisterMealFromPhoto] Error checking duplicates:", error);
      return null;
    }
  };

  const handleSave = async (skipDuplicateCheck = false) => {
    if (!selectedMealType) {
      toast.error("Selecione o tipo de refeição");
      return;
    }

    // Validate food analysis data
    if (!foodAnalysis?.total_geral) {
      toast.error("Dados da análise incompletos. Tente analisar a foto novamente.");
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

      // Get meal name from analysis or use meal type label
      const mealName = foodAnalysis.prato_identificado?.nome || 
        foodAnalysis.alimentos?.[0]?.item || 
        mealLabels[selectedMealType] || 
        selectedMealType;

      console.log("[RegisterMealFromPhoto] Saving meal:", {
        mealType: selectedMealType,
        mealName,
        calories: foodAnalysis.total_geral.calorias_totais,
        consumedAt: consumedAt.toISOString(),
        itemsCount: foodAnalysis.alimentos?.length || 0,
      });

      // Create meal consumption record
      const { data: consumption, error: consumptionError } = await supabase
        .from("meal_consumption")
        .insert({
          user_id: user.id,
          meal_plan_item_id: null, // Not linked to plan
          followed_plan: false,
          total_calories: Math.round(foodAnalysis.total_geral.calorias_totais || 0),
          total_protein: Math.round((foodAnalysis.total_geral.proteinas_totais || 0) * 10) / 10,
          total_carbs: Math.round((foodAnalysis.total_geral.carboidratos_totais || 0) * 10) / 10,
          total_fat: Math.round((foodAnalysis.total_geral.gorduras_totais || 0) * 10) / 10,
          consumed_at: consumedAt.toISOString(),
          source_type: 'photo',
          custom_meal_name: mealName.slice(0, 255), // Limit name length
          meal_time: selectedTime + ':00',
        })
        .select()
        .single();

      if (consumptionError) {
        console.error("[RegisterMealFromPhoto] Consumption insert error:", consumptionError);
        throw new Error(`Erro ao salvar refeição: ${consumptionError.message}`);
      }

      // Insert consumption items
      if (foodAnalysis.alimentos && foodAnalysis.alimentos.length > 0) {
        const itemsToInsert = foodAnalysis.alimentos.map((item) => {
          // Parse quantity safely - handle both string and number
          let quantity = 100;
          if (item.porcao_estimada != null) {
            if (typeof item.porcao_estimada === 'number') {
              quantity = item.porcao_estimada;
            } else if (typeof item.porcao_estimada === 'string') {
              quantity = parseFloat(item.porcao_estimada.replace(/[^\d.]/g, '')) || 100;
            }
          }
          
          return {
            meal_consumption_id: consumption.id,
            food_id: null,
            food_name: String(item.item || "Item").slice(0, 255),
            quantity_grams: Math.max(1, Math.min(quantity, 10000)),
            calories: Math.round(item.calorias || 0),
            protein: Math.round((item.macros?.proteinas || 0) * 10) / 10,
            carbs: Math.round((item.macros?.carboidratos || 0) * 10) / 10,
            fat: Math.round((item.macros?.gorduras || 0) * 10) / 10,
          };
        });

        console.log("[RegisterMealFromPhoto] Inserting items:", itemsToInsert.length);

        const { error: itemsError } = await supabase
          .from("consumption_items")
          .insert(itemsToInsert);

        if (itemsError) {
          console.error("[RegisterMealFromPhoto] Items insert error:", itemsError);
          // Don't throw - meal was saved, just items failed
          toast.warning("Refeição registrada, mas alguns detalhes não foram salvos.");
        }
      }

      toast.success("Refeição registrada com sucesso!");
      handleOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("[RegisterMealFromPhoto] Error:", error);
      const message = error?.message || "Erro desconhecido ao registrar refeição";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDuplicate = () => {
    setDuplicateDialogOpen(false);
    handleSave(true); // Skip duplicate check
  };

  const totals = foodAnalysis.total_geral;

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
            {step === 'meal-type' && "Qual refeição?"}
            {step === 'time' && "Que horas foi?"}
          </SheetTitle>
        </SheetHeader>

        {/* Summary of the analyzed meal */}
        <div className="px-4 py-3 bg-muted/30 border-b">
          <p className="text-sm font-medium mb-2">
            {foodAnalysis.prato_identificado?.nome || foodAnalysis.alimentos[0]?.item || "Refeição analisada"}
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              {Math.round(totals.calorias_totais)} kcal
            </span>
            <span className="flex items-center gap-1">
              <Beef className="w-3.5 h-3.5 text-red-500" />
              {Math.round(totals.proteinas_totais)}g
            </span>
            <span className="flex items-center gap-1">
              <Wheat className="w-3.5 h-3.5 text-amber-500" />
              {Math.round(totals.carboidratos_totais)}g
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-yellow-500" />
              {Math.round(totals.gorduras_totais)}g
            </span>
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-4 py-4">
            {/* Step 1: Select meal type */}
            {step === 'meal-type' && (
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
            )}

            {/* Step 2: Select time */}
            {step === 'time' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="flex-1 text-lg"
                  />
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Selecione o horário aproximado da refeição
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with action buttons */}
        <div className="px-4 py-4 border-t flex-shrink-0 space-y-2">
          {step === 'time' && (
            <>
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
              <Button
                variant="ghost"
                onClick={() => setStep('meal-type')}
                className="w-full"
                size="sm"
              >
                Voltar
              </Button>
            </>
          )}
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
