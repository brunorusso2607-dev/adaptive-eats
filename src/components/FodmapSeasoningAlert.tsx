import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUserProfileContext } from "@/hooks/useUserProfileContext";

// Temperos FODMAP que o usuário deve evitar ao preparar refeições
const FODMAP_SEASONINGS = [
  "Alho",
  "Cebola", 
  "Alho-poró",
  "Chalota",
  "Alho em pó",
  "Cebola em pó",
  "Cebolinha (parte branca)",
  "Molho de soja com trigo",
];

interface FodmapSeasoningAlertProps {
  className?: string;
  compact?: boolean;
}

export function FodmapSeasoningAlert({ className, compact = false }: FodmapSeasoningAlertProps) {
  const { intolerances, isLoading } = useUserProfileContext();
  
  // Verifica se o usuário tem intolerância FODMAP
  const hasFodmap = intolerances?.some(
    (intol: string) => intol.toLowerCase().includes('fodmap')
  );
  
  // Não exibe se não tem FODMAP ou está carregando
  if (isLoading || !hasFodmap) {
    return null;
  }
  
  if (compact) {
    return (
      <div className={`flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg ${className}`}>
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs">
          <span className="font-medium text-amber-600 dark:text-amber-400">
            Temperos a evitar (FODMAP):
          </span>
          <span className="text-muted-foreground ml-1">
            {FODMAP_SEASONINGS.slice(0, 4).join(", ")}...
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <Alert className={`border-amber-500/30 bg-amber-500/5 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-600 dark:text-amber-400 text-sm">
        Temperos a evitar (FODMAP)
      </AlertTitle>
      <AlertDescription className="text-xs text-muted-foreground mt-1">
        Ao preparar suas refeições, evite:{" "}
        <span className="font-medium">
          {FODMAP_SEASONINGS.join(", ")}
        </span>
      </AlertDescription>
    </Alert>
  );
}
