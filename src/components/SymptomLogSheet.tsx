import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSymptomTracker, SymptomType } from "@/hooks/useSymptomTracker";
import { SymptomIcon } from "./SymptomIcon";

interface SymptomLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealConsumptionId?: string;
  onSuccess?: () => void;
}

const SEVERITY_OPTIONS = [
  { value: "leve", label: "Leve", color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" },
  { value: "moderado", label: "Moderado", color: "bg-orange-500/20 text-orange-700 border-orange-500/30" },
  { value: "severo", label: "Severo", color: "bg-red-500/20 text-red-700 border-red-500/30" },
] as const;

export function SymptomLogSheet({ 
  open, 
  onOpenChange, 
  mealConsumptionId,
  onSuccess 
}: SymptomLogSheetProps) {
  const { symptomTypes, logSymptoms, isLoading } = useSymptomTracker();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<"leve" | "moderado" | "severo">("leve");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const toggleSymptom = (symptomName: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptomName) 
        ? prev.filter(s => s !== symptomName)
        : [...prev, symptomName]
    );
  };

  const handleSubmit = async () => {
    if (selectedSymptoms.length === 0) return;

    setIsSaving(true);
    const result = await logSymptoms(selectedSymptoms, severity, notes, mealConsumptionId);
    setIsSaving(false);

    if (result) {
      // Reset form
      setSelectedSymptoms([]);
      setSeverity("leve");
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const handleClose = () => {
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

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Como você está se sentindo?
          </SheetTitle>
          <SheetDescription>
            Registre sintomas para identificar padrões com sua alimentação
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 space-y-6 pb-4">
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
              placeholder="Descreva mais detalhes sobre como você está se sentindo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Submit Button - Fixed Footer */}
        <div className="p-4 border-t flex-shrink-0">
          <Button
            onClick={handleSubmit}
            disabled={selectedSymptoms.length === 0 || isSaving}
            className="w-full"
          >
            {isSaving ? "Salvando..." : `Registrar ${selectedSymptoms.length} sintoma(s)`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
