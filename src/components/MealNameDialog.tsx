import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Check, Loader2, Plus, Flame, RefreshCw } from "lucide-react";

interface PendingMeal {
  id: string;
  recipe_name: string;
  recipe_calories: number;
}

interface MealNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedName: string;
  foodNames: string[];
  onConfirm: (mealName: string, shouldReplace: boolean) => void;
  onBack?: () => void;
  pendingMeal?: PendingMeal | null;
  hasPendingMeal?: boolean;
}

export default function MealNameDialog({
  open,
  onOpenChange,
  suggestedName,
  foodNames,
  onConfirm,
  onBack,
  pendingMeal,
  hasPendingMeal = false,
}: MealNameDialogProps) {
  const [mealName, setMealName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReplaceChoice, setShowReplaceChoice] = useState(false);

  // Generate suggested name when dialog opens and reset state
  useEffect(() => {
    if (open && foodNames.length > 0) {
      // Generate a simple name based on foods
      const generatedName = generateMealName(foodNames);
      setMealName(generatedName);
      setShowReplaceChoice(false); // Reset replace choice when dialog opens
    }
  }, [open, foodNames]);

  // Simple name generation based on food names
  const generateMealName = (foods: string[]): string => {
    if (foods.length === 0) return "";
    if (foods.length === 1) return foods[0];
    if (foods.length === 2) return `${foods[0]} com ${foods[1]}`;
    
    // For 3+ foods, use first 2 and indicate there are more
    return `${foods[0]} com ${foods[1]} e mais`;
  };

  const handleConfirm = () => {
    if (!mealName.trim()) {
      return;
    }
    
    // Se há refeição pendente, mostrar escolha de substituição
    if (hasPendingMeal && pendingMeal && !showReplaceChoice) {
      setShowReplaceChoice(true);
      return;
    }
    
    // Se não há refeição pendente, salvar diretamente
    onConfirm(mealName.trim(), false);
  };

  const handleReplaceChoice = (shouldReplace: boolean) => {
    onConfirm(mealName.trim(), shouldReplace);
  };

  const handleBack = () => {
    onBack?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Registre o nome de sua refeição
          </DialogTitle>
        </DialogHeader>

        {!showReplaceChoice ? (
          <>
            <div className="space-y-4 py-2">
              {/* Food summary */}
              <div className="text-sm text-muted-foreground">
                <span>Alimentos: </span>
                <span className="font-medium text-foreground">
                  {foodNames.length === 1 
                    ? foodNames[0] 
                    : `${foodNames.slice(0, 3).join(", ")}${foodNames.length > 3 ? ` e mais ${foodNames.length - 3}` : ""}`
                  }
                </span>
              </div>

              {/* Meal name input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da refeição</label>
                <Input
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  placeholder="Ex: Café da manhã reforçado"
                  className="h-11"
                  autoFocus
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {onBack && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  Voltar
                </Button>
              )}
              <Button
                onClick={handleConfirm}
                disabled={!mealName.trim()}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-2" />
                {hasPendingMeal ? "Continuar" : "Salvar"}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Replace choice screen */}
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Você tem uma refeição planejada para agora:
              </p>

              {/* Pending meal card */}
              {pendingMeal && (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <p className="font-medium text-sm">{pendingMeal.recipe_name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span>{pendingMeal.recipe_calories} kcal</span>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Deseja substituir por <span className="font-medium text-foreground">"{mealName}"</span>?
              </p>
            </div>

            {/* Replace choice buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => handleReplaceChoice(false)}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Não, adicionar extra
              </Button>
              <Button
                onClick={() => handleReplaceChoice(true)}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sim, substituir
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
