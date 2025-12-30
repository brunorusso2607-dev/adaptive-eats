import { forwardRef } from "react";
import { 
  Circle, 
  Wind, 
  Frown, 
  Zap, 
  Droplets, 
  Lock, 
  Flame, 
  Brain, 
  BatteryLow, 
  Hand, 
  CircleDot,
  CloudFog,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mapeamento de nomes de sintomas para ícones Lucide
const symptomIconMap: Record<string, LucideIcon> = {
  // Digestivos
  "Inchaço abdominal": Circle,
  "Gases": Wind,
  "Náusea": Frown,
  "Dor abdominal": Zap,
  "Diarreia": Droplets,
  "Constipação": Lock,
  "Azia/Refluxo": Flame,
  
  // Neurológicos
  "Dor de cabeça": Brain,
  
  // Energia
  "Fadiga": BatteryLow,
  
  // Pele
  "Coceira na pele": Hand,
  "Urticária": CircleDot,
  
  // Respiratórios
  "Congestão nasal": CloudFog,
};

// Cores por categoria para dar contexto visual
const categoryColors: Record<string, string> = {
  digestivo: "text-orange-500",
  neurologico: "text-purple-500",
  energia: "text-blue-500",
  pele: "text-pink-500",
  respiratorio: "text-cyan-500",
};

interface SymptomIconProps {
  name: string;
  category?: string;
  className?: string;
  size?: number;
}

export const SymptomIcon = forwardRef<SVGSVGElement, SymptomIconProps>(
  ({ name, category, className, size = 16 }, ref) => {
    const Icon = symptomIconMap[name] || Frown;
    const colorClass = category ? categoryColors[category] || "text-muted-foreground" : "text-muted-foreground";
    
    return (
      <Icon 
        ref={ref}
        className={cn(colorClass, className)} 
        size={size}
        strokeWidth={2}
      />
    );
  }
);

SymptomIcon.displayName = "SymptomIcon";

// Exportar o mapa para uso em outros lugares se necessário
export { symptomIconMap, categoryColors };
