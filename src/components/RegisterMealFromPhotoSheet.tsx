import MealRegistrationFlow, { MealData, ConsumptionItem } from "./MealRegistrationFlow";
import { useMealTimeDetection } from "@/hooks/useMealTimeDetection";

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
  // Usar detecção automática de tipo de refeição
  const {
    detectedMealType,
    detectedMealLabel,
    pendingMeal,
  } = useMealTimeDetection();

  // Convert food analysis to MealData format
  const mealData: MealData = {
    name: foodAnalysis.prato_identificado?.nome || 
          foodAnalysis.alimentos?.[0]?.item || 
          "Refeição analisada",
    calories: foodAnalysis.total_geral?.calorias_totais || 0,
    protein: foodAnalysis.total_geral?.proteinas_totais || 0,
    carbs: foodAnalysis.total_geral?.carboidratos_totais || 0,
    fat: foodAnalysis.total_geral?.gorduras_totais || 0,
  };

  // Convert food items to ConsumptionItem format
  const items: ConsumptionItem[] = (foodAnalysis.alimentos || []).map((item) => {
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
      // Pass through data source info
      calculo_fonte: item.calculo_fonte,
      alimento_encontrado: item.alimento_encontrado,
    };
  });

  return (
    <MealRegistrationFlow
      open={open}
      onOpenChange={onOpenChange}
      mealData={mealData}
      items={items}
      sourceType="photo"
      onSuccess={onSuccess}
      autoDetectedMealType={detectedMealType}
      autoDetectedMealLabel={detectedMealLabel}
      pendingMealToReplace={pendingMeal}
    />
  );
}
