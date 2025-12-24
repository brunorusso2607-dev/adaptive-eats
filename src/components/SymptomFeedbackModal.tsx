import { useState } from "react";
import { Check, AlertTriangle, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSymptomTracker, SymptomType } from "@/hooks/useSymptomTracker";
import { SymptomIcon } from "./SymptomIcon";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PendingMealFeedback } from "@/hooks/usePendingSymptomFeedback";
import { useToast } from "@/hooks/use-toast";

interface SymptomFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: PendingMealFeedback | null;
  onMarkWell: (mealId: string) => Promise<boolean>;
  onMarkSymptoms: (
    mealId: string,
    symptoms: string[],
    severity: "leve" | "moderado" | "severo",
    notes?: string
  ) => Promise<boolean>;
}

const SEVERITY_OPTIONS = [
  { value: "leve", label: "Leve", color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" },
  { value: "moderado", label: "Moderado", color: "bg-orange-500/20 text-orange-700 border-orange-500/30" },
  { value: "severo", label: "Severo", color: "bg-red-500/20 text-red-700 border-red-500/30" },
] as const;

const mealTypeLabels: Record<string, string> = {
  cafe_da_manha: "Café da Manhã",
  lanche_manha: "Lanche da Manhã",
  almoco: "Almoço",
  lanche_tarde: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia",
};

export function SymptomFeedbackModal({
  open,
  onOpenChange,
  meal,
  onMarkWell,
  onMarkSymptoms,
}: SymptomFeedbackModalProps) {
  const { symptomTypes } = useSymptomTracker();
  const { toast } = useToast();
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<"leve" | "moderado" | "severo">("leve");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSymptom = (symptomName: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptomName)
        ? prev.filter(s => s !== symptomName)
        : [...prev, symptomName]
    );
  };

  const handleWell = async () => {
    if (!meal) return;
    setIsSubmitting(true);
    const success = await onMarkWell(meal.id);
    setIsSubmitting(false);
    
    if (success) {
      toast({
        title: "Registrado!",
        description: "Que bom que você se sentiu bem 😊",
      });
      resetAndClose();
    }
  };

  const handleSymptoms = async () => {
    if (!meal || selectedSymptoms.length === 0) return;
    setIsSubmitting(true);
    const success = await onMarkSymptoms(meal.id, selectedSymptoms, severity, notes);
    setIsSubmitting(false);
    
    if (success) {
      toast({
        title: "Sintomas registrados",
        description: "Vamos analisar padrões para ajudá-lo.",
      });
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setShowSymptoms(false);
    setSelectedSymptoms([]);
    setSeverity("leve");
    setNotes("");
    onOpenChange(false);
  };

  // Group symptoms by category
  const groupedSymptoms = symptomTypes.reduce((acc, symptom) => {
    if (!acc[symptom.category]) {
      acc[symptom.category] = [];
    }
    acc[symptom.category].push(symptom);
    return acc;
  }, {} as Record<string, SymptomType[]>);

  const categoryLabels: Record<string, string> = {
    digestivo: "Digestivos",
    neurologico: "Neurológicos",
    energia: "Energia",
    pele: "Pele",
    respiratorio: "Respiratórios",
  };

  if (!meal) return null;

  const mealLabel = mealTypeLabels[meal.meal_type] || meal.meal_type;
  const consumedTime = format(new Date(meal.consumed_at), "HH:mm", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Como você se sentiu?
          </DialogTitle>
          <DialogDescription>
            Após o <strong>{mealLabel}</strong> às {consumedTime}
            {meal.meal_name && (
              <span className="block text-xs mt-1 text-muted-foreground">
                {meal.meal_name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {!showSymptoms ? (
          // Initial choice
          <div className="space-y-4 py-4">
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex items-center gap-3 justify-start border-green-500/30 hover:bg-green-500/10"
              onClick={handleWell}
              disabled={isSubmitting}
            >
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-medium">Me senti bem</p>
                <p className="text-xs text-muted-foreground">Nenhum desconforto</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto py-4 flex items-center gap-3 justify-start border-orange-500/30 hover:bg-orange-500/10"
              onClick={() => setShowSymptoms(true)}
              disabled={isSubmitting}
            >
              <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-left">
                <p className="font-medium">Passei mal</p>
                <p className="text-xs text-muted-foreground">Tive algum desconforto</p>
              </div>
            </Button>

            {/* Info message */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Se você não responder em 24h, consideraremos que a refeição foi tranquila 😊
              </p>
            </div>
          </div>
        ) : (
          // Symptoms selection
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Symptoms Selection */}
            {Object.entries(groupedSymptoms).map(([category, symptoms]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {categoryLabels[category] || category}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {symptoms.map((symptom) => {
                    const isSelected = selectedSymptoms.includes(symptom.name);
                    return (
                      <button
                        key={symptom.id}
                        onClick={() => toggleSymptom(symptom.name)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all",
                          "border",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 hover:bg-muted border-transparent"
                        )}
                      >
                        <SymptomIcon
                          name={symptom.name}
                          category={symptom.category}
                          className={isSelected ? "text-primary-foreground" : undefined}
                          size={14}
                        />
                        <span>{symptom.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Severity Selection */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Intensidade
              </h4>
              <div className="flex gap-2">
                {SEVERITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSeverity(option.value)}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all border",
                      severity === option.value
                        ? option.color
                        : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Observações (opcional)
              </h4>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowSymptoms(false)}
                disabled={isSubmitting}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSymptoms}
                disabled={selectedSymptoms.length === 0 || isSubmitting}
              >
                {isSubmitting ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
