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
import { ConflictType } from "@/hooks/useIntoleranceWarning";

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
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-medium">
            {conflict.ingredient}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
                {conflict.message || `Contém ${conflict.restrictionLabel}`}
              </p>
              <p className="text-sm text-muted-foreground">
                Deseja adicionar este ingrediente mesmo assim?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={onCancel}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Adicionar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
