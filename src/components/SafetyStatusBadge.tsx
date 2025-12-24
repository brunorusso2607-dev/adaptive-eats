import { Shield, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RestrictionIcon } from "./RestrictionIcon";

interface SafetyStatusBadgeProps {
  intolerances: string[];
  excludedIngredients: string[];
  dietaryPreference: string;
  isLoading?: boolean;
}

// Mapeamento de intolerâncias para labels amigáveis
const INTOLERANCE_LABELS: Record<string, string> = {
  lactose: "Sem Lactose",
  gluten: "Sem Glúten",
  amendoim: "Sem Amendoim",
  oleaginosas: "Sem Oleaginosas",
  frutos_do_mar: "Sem Frutos do Mar",
  peixe: "Sem Peixe",
  ovo: "Sem Ovo",
  soja: "Sem Soja",
  acucar: "Sem Açúcar",
};

const DIET_LABELS: Record<string, string> = {
  vegetariana: "Vegetariana",
  vegana: "Vegana",
  low_carb: "Low Carb",
  pescetariana: "Pescetariana",
  cetogenica: "Cetogênica",
  flexitariana: "Flexitariana",
};

export function SafetyStatusBadge({
  intolerances,
  excludedIngredients,
  dietaryPreference,
  isLoading = false,
}: SafetyStatusBadgeProps) {
  const hasRestrictions = intolerances.length > 0 || excludedIngredients.length > 0 || (dietaryPreference && dietaryPreference !== "comum");

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 animate-pulse">
        <div className="w-5 h-5 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    );
  }

  if (!hasRestrictions) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
        <Shield className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Nenhuma restrição alimentar configurada
        </span>
      </div>
    );
  }

  const activeRestrictions: Array<{ 
    label: string; 
    key: string; 
    type: "intolerance" | "excluded" | "diet" 
  }> = [];

  // Adicionar intolerâncias
  for (const intolerance of intolerances) {
    const key = intolerance.toLowerCase();
    const label = INTOLERANCE_LABELS[key];
    if (label) {
      activeRestrictions.push({ label, key, type: "intolerance" });
    } else {
      activeRestrictions.push({ 
        label: `Sem ${intolerance}`, 
        key: "excluded",
        type: "intolerance" 
      });
    }
  }

  // Adicionar ingredientes excluídos
  for (const ingredient of excludedIngredients) {
    activeRestrictions.push({
      label: `Sem ${ingredient}`,
      key: "excluded",
      type: "excluded",
    });
  }

  // Adicionar preferência alimentar
  if (dietaryPreference && dietaryPreference !== "comum") {
    const label = DIET_LABELS[dietaryPreference];
    if (label) {
      activeRestrictions.push({ label, key: dietaryPreference, type: "diet" });
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          Proteção Ativa
        </span>
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {activeRestrictions.map((restriction, index) => (
          <Badge
            key={`${restriction.label}-${index}`}
            variant="secondary"
            className={`text-xs px-2 py-0.5 flex items-center gap-1 ${
              restriction.type === "intolerance" 
                ? "bg-destructive/10 text-destructive border-destructive/20" 
                : restriction.type === "excluded"
                ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                : "bg-primary/10 text-primary border-primary/20"
            }`}
          >
            <RestrictionIcon 
              restriction={restriction.key} 
              type={restriction.type}
              size={12}
            />
            {restriction.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
