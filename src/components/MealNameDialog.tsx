import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Check, Loader2 } from "lucide-react";

interface MealNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedName: string;
  foodNames: string[];
  onConfirm: (mealName: string) => void;
  onBack?: () => void;
}

export default function MealNameDialog({
  open,
  onOpenChange,
  suggestedName,
  foodNames,
  onConfirm,
  onBack,
}: MealNameDialogProps) {
  const [mealName, setMealName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate suggested name when dialog opens
  useEffect(() => {
    if (open && foodNames.length > 0) {
      // Generate a simple name based on foods
      const generatedName = generateMealName(foodNames);
      setMealName(generatedName);
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
    onConfirm(mealName.trim());
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
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
