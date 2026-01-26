import { 
  Milk,
  Wheat,
  Ban,
  Leaf,
  Fish,
  Egg,
  Candy,
  Nut,
  Salad,
  Beef,
  Carrot,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mapeamento de restrições para ícones Lucide
const restrictionIconMap: Record<string, LucideIcon> = {
  // Intolerâncias
  lactose: Milk,
  gluten: Wheat,
  amendoim: Nut,
  oleaginosas: Nut,
  frutos_do_mar: Fish,
  peixe: Fish,
  ovo: Egg,
  soja: Leaf,
  acucar: Candy,
  
  // Dietas
  vegetariana: Salad,
  vegana: Leaf,
  low_carb: Beef,
  pescetariana: Fish,
  cetogenica: Beef,
  flexitariana: Carrot,
};

// Cores por tipo de restrição
const typeColors: Record<string, string> = {
  intolerance: "text-destructive",
  excluded: "text-orange-500",
  diet: "text-primary",
};

interface RestrictionIconProps {
  restriction: string;
  type: "intolerance" | "excluded" | "diet";
  className?: string;
  size?: number;
}

export function RestrictionIcon({ restriction, type, className, size = 14 }: RestrictionIconProps) {
  const key = restriction.toLowerCase();
  const Icon = restrictionIconMap[key] || Ban;
  const colorClass = typeColors[type] || "text-muted-foreground";
  
  return (
    <Icon 
      className={cn(colorClass, className)} 
      size={size}
      strokeWidth={2}
    />
  );
}

// Exportar o mapa para uso em outros lugares se necessário
export { restrictionIconMap, typeColors };
