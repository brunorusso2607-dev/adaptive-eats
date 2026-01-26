import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export type MealPlanMode = "ai" | "custom";

type ModeOption = {
  id: MealPlanMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  recommended?: boolean;
};

type MealPlanModeSelectorProps = {
  onSelectMode: (mode: MealPlanMode) => void;
  onClose: () => void;
};

const modeOptions: ModeOption[] = [
  {
    id: "ai",
    title: "IA Personalizada",
    description: "A inteligência artificial cria seu plano completo",
    icon: <Sparkles className="w-6 h-6" />,
    features: [
      "Geração automática baseada no seu perfil",
      "Respeita intolerâncias e preferências",
      "Balanceamento de macros otimizado",
      "Variedade de receitas garantida"
    ],
    recommended: true
  },
  {
    id: "custom",
    title: "Montar Meu Plano",
    description: "Controle total com máxima flexibilidade",
    icon: <Pencil className="w-6 h-6" />,
    features: [
      "Use suas receitas favoritas",
      "Escolha do catálogo ou favoritos",
      "IA completa dias vazios",
      "Preview de macros em tempo real"
    ]
  }
];

export default function MealPlanModeSelector({ onSelectMode, onClose }: MealPlanModeSelectorProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Criar Plano Alimentar</h2>
          <p className="text-sm text-muted-foreground">Como você quer montar seu plano?</p>
        </div>
      </div>

      {/* Mode Options */}
      <div className="space-y-4">
        {modeOptions.map((mode) => (
          <Card
            key={mode.id}
            className={cn(
              "glass-card cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
              mode.recommended && "border-primary/50 bg-primary/5"
            )}
            onClick={() => onSelectMode(mode.id)}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  mode.recommended 
                    ? "gradient-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {mode.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{mode.title}</h3>
                    {mode.recommended && (
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{mode.description}</p>
                  
                  {/* Features */}
                  <ul className="space-y-1">
                    {mode.features.map((feature, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Arrow */}
                <div className="text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info */}
      <p className="text-xs text-center text-muted-foreground px-4">
        Todos os modos respeitam suas restrições alimentares e preferências do perfil
      </p>
    </div>
  );
}
