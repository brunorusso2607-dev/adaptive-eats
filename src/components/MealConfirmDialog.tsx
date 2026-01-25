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
import { Check, X } from "lucide-react";

interface MealConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealName: string;
  onConfirmAsPlanned: () => void;
  onConfirmDifferent: () => void;
}

export default function MealConfirmDialog({
  open,
  onOpenChange,
  mealName,
  onConfirmAsPlanned,
  onConfirmDifferent,
}: MealConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você fez a refeição como planejado?</AlertDialogTitle>
          <AlertDialogDescription>
            A refeição planejada era: <strong>"{mealName}"</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmDifferent}
            className="w-full sm:w-auto bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground border border-input"
          >
            <X className="w-4 h-4 mr-2" />
            Não, comi diferente
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onConfirmAsPlanned}
            className="w-full sm:w-auto gradient-primary border-0"
          >
            <Check className="w-4 h-4 mr-2" />
            Sim, fiz igual
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
