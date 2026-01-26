import { useState } from "react";
import { useMealTimeDetection } from "@/hooks/useMealTimeDetection";
import MealNameDialog from "./MealNameDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FoodItem {
  item: string;
  porcao_estimada: string;
  calorias: number;
  macros: {
    proteinas: number;
    carboidratos: number;
    gorduras: number;
  };
  // Nutritional data source tracking
  calculo_fonte?: "tabela_foods" | "estimativa_ia";
  alimento_encontrado?: string;
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
  const [isSaving, setIsSaving] = useState(false);

  // Usar detecção automática de tipo de refeição
  const {
    detectedMealType,
    pendingMeal,
    hasPendingMeal,
  } = useMealTimeDetection();

  // Get suggested meal name from photo analysis
  const suggestedName = foodAnalysis.prato_identificado?.nome || 
    foodAnalysis.alimentos?.[0]?.item || 
    "Refeição analisada";

  // Get food names for display
  const foodNames = (foodAnalysis.alimentos || []).map(item => item.item);

  // Get totals from analysis
  const totals = {
    calories: foodAnalysis.total_geral?.calorias_totais || 0,
    protein: foodAnalysis.total_geral?.proteinas_totais || 0,
    carbs: foodAnalysis.total_geral?.carboidratos_totais || 0,
    fat: foodAnalysis.total_geral?.gorduras_totais || 0,
  };

  // Convert food items to consumption items format
  const getConsumptionItems = () => {
    return (foodAnalysis.alimentos || []).map((item) => {
      // Parse quantity safely
      let quantity = 100;
      if (item.porcao_estimada != null) {
        if (typeof item.porcao_estimada === 'number') {
          quantity = item.porcao_estimada;
        } else if (typeof item.porcao_estimada === 'string') {
          quantity = parseFloat(item.porcao_estimada.replace(/[^\d.]/g, '')) || 100;
        }
      }

      return {
        food_id: null,
        food_name: item.item || "Item",
        quantity_grams: Math.max(1, Math.min(quantity, 10000)),
        calories: Math.round(item.calorias || 0),
        protein: Math.round((item.macros?.proteinas || 0) * 10) / 10,
        carbs: Math.round((item.macros?.carboidratos || 0) * 10) / 10,
        fat: Math.round((item.macros?.gorduras || 0) * 10) / 10,
      };
    });
  };

  // Handle meal name confirmation - same logic as FreeFormMealLogger
  const handleMealNameConfirm = async (mealName: string, shouldReplace: boolean) => {
    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessão expirada. Faça login novamente.");
        setIsSaving(false);
        return;
      }

      const consumedAt = new Date();
      const currentTime = `${String(consumedAt.getHours()).padStart(2, '0')}:${String(consumedAt.getMinutes()).padStart(2, '0')}`;
      const mealType = detectedMealType || 'extra';

      // Se shouldReplace=true e há refeição pendente, marcar como completada (substituída)
      if (shouldReplace && pendingMeal) {
        const { error: updateError } = await supabase
          .from("meal_plan_items")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", pendingMeal.id);
        
        if (updateError) {
          console.error("[RegisterMealFromPhotoSheet] Error marking meal as replaced:", updateError);
        }
      }

      // Create meal consumption record
      const { data: consumption, error: consumptionError } = await supabase
        .from("meal_consumption")
        .insert({
          user_id: user.id,
          meal_plan_item_id: shouldReplace && pendingMeal ? pendingMeal.id : null,
          followed_plan: false,
          total_calories: Math.round(totals.calories || 0),
          total_protein: Math.round((totals.protein || 0) * 10) / 10,
          total_carbs: Math.round((totals.carbs || 0) * 10) / 10,
          total_fat: Math.round((totals.fat || 0) * 10) / 10,
          consumed_at: consumedAt.toISOString(),
          source_type: 'photo',
          custom_meal_name: mealName.slice(0, 255),
          meal_time: currentTime + ':00',
          detected_meal_type: mealType,
        })
        .select()
        .single();

      if (consumptionError) {
        console.error("[RegisterMealFromPhotoSheet] Consumption insert error:", consumptionError);
        throw new Error(`Erro ao salvar refeição: ${consumptionError.message}`);
      }

      // Insert consumption items
      const items = getConsumptionItems();
      if (items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          meal_consumption_id: consumption.id,
          food_id: item.food_id,
          food_name: String(item.food_name || "Item").slice(0, 255),
          quantity_grams: item.quantity_grams,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        }));

        const { error: itemsError } = await supabase
          .from("consumption_items")
          .insert(itemsToInsert);

        if (itemsError) {
          console.error("[RegisterMealFromPhotoSheet] Items insert error:", itemsError);
          toast.warning("Refeição registrada, mas alguns detalhes não foram salvos.");
        }
      }

      toast.success("Refeição registrada com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("[RegisterMealFromPhotoSheet] Error:", error);
      const message = error?.message || "Erro desconhecido ao registrar refeição";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MealNameDialog
      open={open}
      onOpenChange={onOpenChange}
      suggestedName={suggestedName}
      foodNames={foodNames}
      onConfirm={handleMealNameConfirm}
      pendingMeal={pendingMeal}
      hasPendingMeal={hasPendingMeal}
    />
  );
}
