import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RecipeRenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  originalIngredient: string;
  newIngredient: string;
  onConfirm: (newName: string) => Promise<void>;
}

function generateSuggestedName(
  currentName: string,
  originalIngredient: string,
  newIngredient: string
): string {
  // Try to replace the original ingredient in the recipe name
  const lowerName = currentName.toLowerCase();
  const lowerOriginal = originalIngredient.toLowerCase();
  
  // Check if the original ingredient appears in the name
  if (lowerName.includes(lowerOriginal)) {
    // Replace it with the new ingredient
    const regex = new RegExp(originalIngredient, "gi");
    return currentName.replace(regex, newIngredient);
  }
  
  // If not found, try common patterns
  // Pattern: "X com Y" -> "X com NewIngredient"
  const comPattern = /\s+com\s+/i;
  if (comPattern.test(currentName)) {
    const parts = currentName.split(comPattern);
    if (parts.length >= 2) {
      // Check if the second part contains the original ingredient
      if (parts[1].toLowerCase().includes(lowerOriginal)) {
        const newSecond = parts[1].replace(new RegExp(originalIngredient, "gi"), newIngredient);
        return `${parts[0]} com ${newSecond}`;
      }
    }
  }
  
  // If no match found, suggest adding the new ingredient
  return `${currentName} com ${newIngredient}`;
}

export default function RecipeRenameDialog({
  open,
  onOpenChange,
  currentName,
  originalIngredient,
  newIngredient,
  onConfirm,
}: RecipeRenameDialogProps) {
  const [recipeName, setRecipeName] = useState("");
  const [suggestedName, setSuggestedName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Track if we've initialized for this open session
  const hasInitializedRef = useRef(false);
  const prevOpenRef = useRef(false);

  // Generate suggestion ONLY when dialog opens (not on every prop change)
  useEffect(() => {
    // Detect transition from closed to open
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    
    if (justOpened) {
      const suggestion = generateSuggestedName(currentName, originalIngredient, newIngredient);
      setSuggestedName(suggestion);
      setRecipeName(suggestion);
      hasInitializedRef.current = true;
    }
    
    // Reset flag when dialog closes
    if (!open) {
      hasInitializedRef.current = false;
    }
  }, [open, currentName, originalIngredient, newIngredient]);

  const handleConfirm = async () => {
    if (!recipeName.trim()) return;
    
    setIsSaving(true);
    try {
      await onConfirm(recipeName.trim());
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  const handleUseSuggestion = () => {
    setRecipeName(suggestedName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Atualizar Nome da Receita?
          </DialogTitle>
          <DialogDescription>
            Você substituiu um ingrediente. Deseja atualizar o nome da receita?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Substitution summary */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline" className="line-through text-muted-foreground">
              {originalIngredient}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="default">
              {newIngredient}
            </Badge>
          </div>

          {/* Current name display */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nome atual</Label>
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              {currentName}
            </p>
          </div>

          {/* Editable name input */}
          <div className="space-y-2">
            <Label htmlFor="recipe-name">Novo nome</Label>
            <Input
              id="recipe-name"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="Digite o novo nome da receita"
              autoFocus
            />
            {recipeName !== suggestedName && (
              <button
                type="button"
                onClick={handleUseSuggestion}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 p-1 transition-colors"
                title={suggestedName}
              >
                <Sparkles className="w-3 h-3 flex-shrink-0" />
                <span>Usar sugestão</span>
              </button>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={isSaving}
            className="sm:order-1"
          >
            <X className="w-4 h-4 mr-2" />
            Manter nome atual
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving || !recipeName.trim()}
            className="sm:order-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Salvar novo nome
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
