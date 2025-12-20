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
import { AlertTriangle } from "lucide-react";
import { ConflictType } from "@/hooks/useIngredientConflictCheck";

interface IngredientConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ConflictType | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function IngredientConflictDialog({
  open,
  onOpenChange,
  conflict,
  onConfirm,
  onCancel,
}: IngredientConflictDialogProps) {
  if (!conflict) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-lg">
              Ingrediente conflitante detectado
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base pt-2">
            Você é <strong className="text-foreground">{conflict.restrictionLabel}</strong>.
            <br />
            <br />
            O ingrediente "<strong className="text-foreground">{conflict.ingredient}</strong>" pode não ser adequado para sua dieta.
            <br />
            <br />
            Deseja adicionar mesmo assim?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={onCancel}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Sim, adicionar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
