import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import UnifiedFoodSearchBlock, { type SelectedFoodItem } from "./UnifiedFoodSearchBlock";
import { IngredientResult, OriginalIngredient } from "@/hooks/useIngredientSubstitution";

interface IngredientSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalIngredient: OriginalIngredient | null;
  onSubstitute: (
    newIngredient: IngredientResult, 
    originalItem: string, 
    originalNutrition: IngredientResult | null
  ) => void;
}

export default function IngredientSearchSheet({
  open,
  onOpenChange,
  originalIngredient,
  onSubstitute,
}: IngredientSearchSheetProps) {
  
  const handleSelectFood = (food: SelectedFoodItem) => {
    if (!originalIngredient) return;

    // Convert unified format to IngredientResult
    const ingredientResult: IngredientResult = {
      id: food.id,
      name: food.name,
      calories_per_100g: food.food.calories_per_100g,
      protein_per_100g: food.food.protein_per_100g,
      carbs_per_100g: food.food.carbs_per_100g,
      fat_per_100g: food.food.fat_per_100g,
      fiber_per_100g: food.food.fiber_per_100g,
      category: food.food.category || undefined,
    };
    
    onSubstitute(ingredientResult, originalIngredient.item, null);
    onOpenChange(false);
  };

  if (!originalIngredient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Substituir Alimento
          </DialogTitle>
          <DialogDescription asChild>
            <span className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Substituindo:</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {originalIngredient.quantity}
              </Badge>
              <span className="font-medium">{originalIngredient.item}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
          <UnifiedFoodSearchBlock
            onSelectFood={handleSelectFood}
            scrollHeight="h-full"
            autoFocus
            confirmButtonLabel="Confirmar Substituição"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
