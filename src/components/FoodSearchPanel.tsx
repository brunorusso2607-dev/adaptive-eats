import UnifiedFoodSearchBlock, { type SelectedFoodItem as UnifiedSelectedFoodItem } from "./UnifiedFoodSearchBlock";
import { cn } from "@/lib/utils";

// Re-export the interface for backward compatibility
export interface SelectedFoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  ingredients: any;
  instructions: any;
}

interface FoodSearchPanelProps {
  onSelectFood: (food: SelectedFoodItem) => void;
  className?: string;
}

export default function FoodSearchPanel({ onSelectFood, className }: FoodSearchPanelProps) {
  const handleSelectFood = (food: UnifiedSelectedFoodItem) => {
    // Convert unified format to FoodSearchPanel legacy format
    const legacyFood: SelectedFoodItem = {
      id: food.id,
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      prep_time: 5,
      ingredients: [{ name: food.name, quantity: `${food.quantity_grams}${food.food.serving_unit || 'g'}` }],
      instructions: ["Preparar conforme preferência"],
    };
    onSelectFood(legacyFood);
  };

  return (
    <UnifiedFoodSearchBlock
      onSelectFood={handleSelectFood}
      className={className}
      scrollHeight="h-[calc(100vh-340px)]"
      confirmButtonLabel="Adicionar Refeição"
    />
  );
}
