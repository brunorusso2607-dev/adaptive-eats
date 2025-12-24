import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface LegalDisclaimerProps {
  variant?: "compact" | "full";
  className?: string;
}

export default function LegalDisclaimer({ variant = "compact", className }: LegalDisclaimerProps) {
  if (variant === "full") {
    return (
      <div className={cn(
        "bg-muted/50 border border-border/50 rounded-lg p-4",
        className
      )}>
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Aviso Importante
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              As informações nutricionais e recomendações alimentares fornecidas por este aplicativo são geradas por inteligência artificial e têm caráter meramente informativo. <strong>Não substituem</strong> orientação médica, nutricional ou de qualquer profissional de saúde qualificado.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Se você possui alergias alimentares, condições de saúde específicas ou está em tratamento médico, consulte sempre um profissional antes de fazer alterações na sua dieta.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 text-xs text-muted-foreground",
      className
    )}>
      <Info className="h-3.5 w-3.5 flex-shrink-0" />
      <p>
        Informações geradas por IA. Não substituem orientação profissional de saúde.
      </p>
    </div>
  );
}
