import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Clock, Flame, Beef, Wheat, Droplets, UtensilsCrossed, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getMealLabelsSync, getMealOrderSync } from "@/lib/mealTimeConfig";

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

  const handleSave = async () => {
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
          // Parse quantity safely
          const quantityStr = item.porcao_estimada || "100g";
          const quantity = parseFloat(quantityStr.replace(/[^\d.]/g, '')) || 100;
          
          return {
            meal_consumption_id: consumption.id,
            food_id: null,
            food_name: (item.item || "Item").slice(0, 255),
            quantity_grams: Math.max(1, Math.min(quantity, 10000)), // Between 1g and 10kg
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
                onClick={handleSave}
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
      </SheetContent>
    </Sheet>
  );
}
