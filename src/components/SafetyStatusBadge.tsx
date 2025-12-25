import { useState } from "react";
import { Shield, ShieldCheck, Settings, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RestrictionIcon } from "./RestrictionIcon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useOnboardingOptions } from "@/hooks/useOnboardingOptions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SafetyStatusBadgeProps {
  intolerances: string[];
  excludedIngredients: string[];
  dietaryPreference: string;
  isLoading?: boolean;
  onUpdate?: () => void;
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
  onUpdate,
}: SafetyStatusBadgeProps) {
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>(intolerances);
  const [isSaving, setIsSaving] = useState(false);
  
  const { data: options, isLoading: optionsLoading } = useOnboardingOptions();
  
  const hasRestrictions = intolerances.length > 0 || excludedIngredients.length > 0 || (dietaryPreference && dietaryPreference !== "comum");

  const handleOpenEdit = () => {
    setSelectedIntolerances(intolerances);
    setEditSheetOpen(true);
  };

  const toggleIntolerance = (optionId: string) => {
    if (optionId === "none") {
      setSelectedIntolerances([]);
      return;
    }
    
    setSelectedIntolerances(prev => {
      if (prev.includes(optionId)) {
        return prev.filter(i => i !== optionId);
      }
      return [...prev, optionId];
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ intolerances: selectedIntolerances })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Intolerâncias atualizadas!");
      setEditSheetOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error updating intolerances:", error);
      toast.error("Erro ao atualizar intolerâncias");
    } finally {
      setIsSaving(false);
    }
  };

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
      <>
        <button
          onClick={handleOpenEdit}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Nenhuma restrição alimentar configurada
            </span>
          </div>
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
        
        <EditSheet 
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          options={options}
          optionsLoading={optionsLoading}
          selectedIntolerances={selectedIntolerances}
          toggleIntolerance={toggleIntolerance}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </>
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
    <>
      <div className="flex flex-col gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-foreground">
              Proteção Ativa
            </span>
          </div>
          <button
            onClick={handleOpenEdit}
            className="p-1.5 rounded-md hover:bg-emerald-500/10 transition-colors"
            aria-label="Editar intolerâncias"
          >
            <Settings className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          {activeRestrictions.map((restriction, index) => (
            <Badge
              key={`${restriction.label}-${index}`}
              variant="secondary"
              className="text-xs px-2 py-0.5 flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 cursor-default"
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
      
      <EditSheet 
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        options={options}
        optionsLoading={optionsLoading}
        selectedIntolerances={selectedIntolerances}
        toggleIntolerance={toggleIntolerance}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </>
  );
}

// Componente Sheet separado para edição
function EditSheet({
  open,
  onOpenChange,
  options,
  optionsLoading,
  selectedIntolerances,
  toggleIntolerance,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ReturnType<typeof useOnboardingOptions>["data"];
  optionsLoading: boolean;
  selectedIntolerances: string[];
  toggleIntolerance: (id: string) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Editar Intolerâncias
          </SheetTitle>
        </SheetHeader>
        
        <div className="overflow-y-auto h-[calc(70vh-140px)] space-y-4">
          {optionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Selecione suas intolerâncias alimentares. Receitas e refeições serão adaptadas automaticamente.
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                {options?.intolerances
                  .filter(opt => opt.option_id !== "none")
                  .map((option) => {
                    const isSelected = selectedIntolerances.includes(option.option_id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => toggleIntolerance(option.option_id)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border transition-all text-left",
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted/30 border-border/50 hover:bg-muted/50"
                        )}
                      >
                        <span className="text-lg">{option.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{option.label}</p>
                          {option.description && (
                            <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
              </div>
              
              {selectedIntolerances.length === 0 && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhuma intolerância selecionada
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="pt-4 border-t border-border/50">
          <Button 
            onClick={onSave} 
            className="w-full"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Salvar alterações
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
