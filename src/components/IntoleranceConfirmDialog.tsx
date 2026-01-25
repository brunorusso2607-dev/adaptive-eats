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
import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { ConflictDetail } from "@/hooks/useIntoleranceWarning";

interface IntoleranceConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictDetail[];
  foodName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function IntoleranceConfirmDialog({
  open,
  onOpenChange,
  conflicts,
  foodName,
  onConfirm,
  onCancel,
}: IntoleranceConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 p-3 rounded-full bg-amber-500/10">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
          </div>
          <AlertDialogTitle className="text-center">
            Alimento com Restrição
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3">
            <p>
              <span className="font-semibold text-foreground">{foodName}</span> pode conflitar com suas restrições alimentares:
            </p>
            <div className="space-y-2 mt-3">
              {conflicts.map((conflict, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-3 py-2 text-sm"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400">
                    {conflict.message}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Deseja registrar este alimento mesmo assim?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleCancel} className="w-full sm:w-auto">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white"
          >
            Registrar mesmo assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
