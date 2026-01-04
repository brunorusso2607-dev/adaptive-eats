import { useState } from "react";
import { Check, Target, TrendingDown, TrendingUp, Scale, Dumbbell, Utensils, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Helper para obter ícone da estratégia
export const getStrategyIcon = (key: string) => {
  switch (key) {
    case "lose_weight":
    case "weight_loss": return TrendingDown;
    case "cutting": return Dumbbell;
    case "maintain":
    case "maintenance": return Scale;
    case "fitness": return Dumbbell;
    case "gain_weight":
    case "weight_gain": return TrendingUp;
    case "flexible_diet": return Utensils;
    default: return Sparkles;
  }
};

export type NutritionalStrategy = {
  id: string;
  key: string;
  label: string;
  description: string | null;
};

type StrategyAccordionProps = {
  strategies: NutritionalStrategy[];
  selectedStrategyId: string | null | undefined;
  onSelectStrategy: (strategy: NutritionalStrategy) => void;
};

export function StrategyAccordion({ strategies, selectedStrategyId, onSelectStrategy }: StrategyAccordionProps) {
  const [accordionValue, setAccordionValue] = useState<string>("");
  
  const selectedStrategy = strategies.find(s => s.id === selectedStrategyId);
  const SelectedIcon = selectedStrategy ? getStrategyIcon(selectedStrategy.key) : Target;
  
  return (
    <Accordion 
      type="single" 
      collapsible 
      value={accordionValue}
      onValueChange={setAccordionValue}
      className="w-full"
    >
      <AccordionItem value="strategies" className="border rounded-lg overflow-hidden">
        <AccordionTrigger className="px-3 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180">
          <div className="flex items-center gap-3 flex-1">
            <SelectedIcon className={cn(
              "w-4 h-4 shrink-0",
              selectedStrategy ? "text-primary" : "text-muted-foreground"
            )} />
            <div className="flex-1 min-w-0 text-left">
              {selectedStrategy ? (
                <>
                  <span className="font-medium text-sm block text-primary">{selectedStrategy.label}</span>
                  {selectedStrategy.description && (
                    <span className="text-xs text-muted-foreground line-clamp-1">{selectedStrategy.description}</span>
                  )}
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Selecione uma estratégia...</span>
              )}
            </div>
            {selectedStrategy && (
              <Check className="w-4 h-4 text-primary shrink-0 mr-2" />
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-2 pb-2">
          <div className="grid grid-cols-1 gap-1 pt-1">
            {strategies.map((strategy) => {
              const IconComponent = getStrategyIcon(strategy.key);
              const isSelected = selectedStrategyId === strategy.id;
              
              return (
                <button
                  type="button"
                  key={strategy.id}
                  onClick={() => {
                    onSelectStrategy(strategy);
                    setAccordionValue(""); // Fecha o accordion após seleção
                  }}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all touch-manipulation flex items-center gap-3",
                    isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <IconComponent className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <span className={cn("font-medium text-sm block", isSelected && "text-primary")}>{strategy.label}</span>
                    {strategy.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">{strategy.description}</span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
