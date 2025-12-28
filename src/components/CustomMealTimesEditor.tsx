import { useState, useEffect, useMemo, useCallback } from "react";
import { Clock, RotateCcw, Check, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMealTimeSettings } from "@/hooks/useMealTimeSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";

// Gera opções de horário com intervalos de 15 minutos
const generateTimeOptions = () => {
  const options: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push({ value, label: value });
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

// Tipo para refeições extras
export interface ExtraMeal {
  id: string;
  name: string;
  time: string;
  isNew?: boolean;
}

// Tipo expandido para custom_meal_times com suporte a extras
export interface CustomMealTimesWithExtras {
  [key: string]: string | ExtraMeal[] | undefined;
  extras?: ExtraMeal[];
}

export type CustomMealTimes = Record<string, string>;

interface CustomMealTimesEditorProps {
  customTimes?: CustomMealTimesWithExtras | null;
  onSave?: (customTimes: CustomMealTimesWithExtras | null) => Promise<boolean>;
  onChange?: (customTimes: CustomMealTimesWithExtras | null) => void;
  isLoading?: boolean;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

// Converte horário HH:MM para minutos para ordenação
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export function CustomMealTimesEditor({
  customTimes,
  onSave,
  onChange,
  isLoading = false,
  compact = false,
  disabled = false,
  className,
}: CustomMealTimesEditorProps) {
  const { settings: globalSettings, isLoading: globalLoading } = useMealTimeSettings();
  const [isOpen, setIsOpen] = useState(!compact);
  const [localTimes, setLocalTimes] = useState<Record<string, string>>({});
  const [extraMeals, setExtraMeals] = useState<ExtraMeal[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialCustomTimes, setInitialCustomTimes] = useState<CustomMealTimesWithExtras | null>(null);

  // Capturar customTimes inicial apenas uma vez
  useEffect(() => {
    if (!isInitialized && customTimes !== undefined) {
      setInitialCustomTimes(customTimes);
    }
  }, [customTimes, isInitialized]);

  // Inicializar horários locais e extras - apenas uma vez quando globalSettings estiver pronto
  useEffect(() => {
    if (globalSettings.length === 0) return;
    if (isInitialized) return; // Não re-inicializar

    const initialTimes: Record<string, string> = {};
    globalSettings.forEach(setting => {
      const customValue = initialCustomTimes?.[setting.meal_type];
      if (typeof customValue === 'string') {
        initialTimes[setting.meal_type] = customValue;
      } else {
        initialTimes[setting.meal_type] = `${setting.start_hour.toString().padStart(2, '0')}:00`;
      }
    });
    setLocalTimes(initialTimes);
    
    // Carregar extras se existirem no template inicial
    const extras = initialCustomTimes?.extras;
    if (Array.isArray(extras) && extras.length > 0) {
      // Extras carregados do perfil são considerados "salvos" (isNew: false)
      const cleanedExtras = extras.map(extra => ({
        ...extra,
        isNew: false
      }));
      setExtraMeals(cleanedExtras);
      console.log("[CustomMealTimesEditor] Loaded extras from profile:", cleanedExtras);
    }
    
    setIsInitialized(true);
  }, [globalSettings, initialCustomTimes, isInitialized]);

  // Emitir dados sempre que houver mudanças (sem depender de toggle)
  useEffect(() => {
    if (!onChange || globalSettings.length === 0) return;
    if (Object.keys(localTimes).length === 0) return;
    if (!isInitialized) return; // Não emitir antes de inicializar
    
    const dataToEmit: CustomMealTimesWithExtras = { ...localTimes };
    if (extraMeals.length > 0) {
      dataToEmit.extras = extraMeals;
    }
    
    onChange(dataToEmit);
  }, [localTimes, extraMeals, globalSettings.length, onChange, isInitialized]);

  // Combina refeições padrão + extras, ordenadas por horário
  const allMealsSorted = useMemo(() => {
    const standardMeals = globalSettings.map(setting => ({
      id: setting.meal_type,
      name: setting.label,
      time: localTimes[setting.meal_type] || `${setting.start_hour.toString().padStart(2, '0')}:00`,
      isExtra: false,
      isNew: false,
    }));

    const savedExtras = extraMeals.filter(extra => !extra.isNew).map(extra => ({
      id: extra.id,
      name: extra.name,
      time: extra.time,
      isExtra: true,
      isNew: false,
    }));

    const newExtras = extraMeals.filter(extra => extra.isNew).map(extra => ({
      id: extra.id,
      name: extra.name,
      time: extra.time,
      isExtra: true,
      isNew: true,
    }));

    const sortedMeals = [...standardMeals, ...savedExtras].sort((a, b) => 
      timeToMinutes(a.time) - timeToMinutes(b.time)
    );

    return [...sortedMeals, ...newExtras];
  }, [globalSettings, localTimes, extraMeals]);

  // Gera dados para salvar
  const getDataToSave = useCallback((): CustomMealTimesWithExtras => {
    const data: CustomMealTimesWithExtras = { ...localTimes };
    if (extraMeals.length > 0) {
      data.extras = extraMeals.map(e => ({ ...e, isNew: false }));
    }
    return data;
  }, [localTimes, extraMeals]);

  // Salvar template no perfil do usuário
  const saveTemplateToProfile = useCallback(async (dataToSave: CustomMealTimesWithExtras) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const { error } = await supabase
        .from("profiles")
        .update({ default_meal_times: dataToSave as Json })
        .eq("id", session.user.id);

      if (error) {
        console.error("[CustomMealTimesEditor] Error saving to profile:", error);
        return false;
      }

      console.log("[CustomMealTimesEditor] Saved template to profile:", dataToSave);
      return true;
    } catch (error) {
      console.error("[CustomMealTimesEditor] Exception saving to profile:", error);
      return false;
    }
  }, []);

  const handleTimeChange = async (mealId: string, value: string, isExtra: boolean) => {
    setHasChanges(true);
    
    let newExtras = extraMeals;
    let newTimes = localTimes;
    
    if (isExtra) {
      newExtras = extraMeals.map(extra =>
        extra.id === mealId ? { ...extra, time: value } : extra
      );
      setExtraMeals(newExtras);
    } else {
      newTimes = { ...localTimes, [mealId]: value };
      setLocalTimes(newTimes);
    }
    
    // Salvar automaticamente no perfil do usuário
    const dataToSave: CustomMealTimesWithExtras = { ...newTimes };
    if (newExtras.length > 0) {
      dataToSave.extras = newExtras.map(e => ({ ...e, isNew: false }));
    }
    
    const saved = await saveTemplateToProfile(dataToSave);
    if (saved) {
      toast.success("Horário atualizado", { duration: 1500 });
    }
  };

  const handleExtraNameChange = (mealId: string, name: string) => {
    setHasChanges(true);
    const newExtras = extraMeals.map(extra =>
      extra.id === mealId ? { ...extra, name } : extra
    );
    setExtraMeals(newExtras);
  };

  const handleAddExtra = () => {
    const newExtraId = `extra_${Date.now()}`;
    const newExtra: ExtraMeal = {
      id: newExtraId,
      name: "Refeição Extra",
      time: "15:00",
      isNew: true,
    };
    const newExtras = [...extraMeals, newExtra];
    setExtraMeals(newExtras);
    setHasChanges(true);
    setOpenAccordion(newExtraId);
  };

  const handleRemoveExtra = async (mealId: string) => {
    const newExtras = extraMeals.filter(extra => extra.id !== mealId);
    setExtraMeals(newExtras);
    setHasChanges(true);

    // Salvar automaticamente no perfil
    const dataToSave: CustomMealTimesWithExtras = { ...localTimes };
    if (newExtras.length > 0) {
      dataToSave.extras = newExtras.map(e => ({ ...e, isNew: false }));
    }
    
    const saved = await saveTemplateToProfile(dataToSave);
    if (saved) {
      toast.success("Refeição extra removida do seu perfil");
    }
  };

  const handleConfirmExtra = async (mealId: string) => {
    const newExtras = extraMeals.map(extra =>
      extra.id === mealId ? { ...extra, isNew: false } : extra
    );
    setExtraMeals(newExtras);
    setHasChanges(true);
    setOpenAccordion(undefined);

    // Salvar automaticamente no perfil
    const dataToSave: CustomMealTimesWithExtras = { ...localTimes };
    dataToSave.extras = newExtras.map(e => ({ ...e, isNew: false }));
    
    const saved = await saveTemplateToProfile(dataToSave);
    if (saved) {
      toast.success("Refeição extra salva no seu perfil");
    } else {
      toast.success("Refeição extra adicionada");
    }
  };

  const handleResetToGlobal = async () => {
    const resetTimes: Record<string, string> = {};
    globalSettings.forEach(setting => {
      resetTimes[setting.meal_type] = `${setting.start_hour.toString().padStart(2, '0')}:00`;
    });
    setLocalTimes(resetTimes);
    setExtraMeals([]);
    setHasChanges(true);

    // Salvar reset no perfil
    await saveTemplateToProfile(resetTimes as CustomMealTimesWithExtras);
    toast.success("Horários restaurados ao padrão");
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      const dataToSave = getDataToSave();
      const success = await onSave(dataToSave);
      
      if (success) {
        const savedExtras = extraMeals.map(extra => ({
          ...extra,
          isNew: false,
        }));
        setExtraMeals(savedExtras);
        toast.success("Horários salvos com sucesso");
        setHasChanges(false);
      } else {
        toast.error("Erro ao salvar horários");
      }
    } catch (error) {
      console.error("Error saving custom times:", error);
      toast.error("Erro ao salvar horários");
    } finally {
      setIsSaving(false);
    }
  };

  if (globalLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="pb-3">
          <div className="h-5 bg-muted rounded w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const content = (
    <div className="space-y-4">
      {/* Lista de horários em Accordion - ordenada por horário */}
      <Accordion type="single" collapsible className="space-y-2" value={openAccordion} onValueChange={setOpenAccordion}>
        {allMealsSorted.map(meal => (
          <AccordionItem 
            key={meal.id} 
            value={meal.id}
            className={cn(
              "border border-border/50 rounded-lg px-4 data-[state=open]:bg-muted/50",
              meal.isExtra ? "bg-primary/5 border-primary/20" : "bg-muted/30"
            )}
          >
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-3">
                  <Clock className={cn("h-4 w-4", meal.isExtra ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-medium">{meal.name}</span>
                  {meal.isExtra && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      Extra
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-mono">
                    {meal.time || "--:--"}
                  </span>
                  {meal.isExtra && !meal.isNew && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveExtra(meal.id);
                      }}
                      disabled={isLoading || isSaving || disabled}
                      className="p-1 text-destructive hover:bg-destructive/10 rounded disabled:opacity-50"
                      title="Remover refeição extra"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-3 pt-2">
                {meal.isExtra && (
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Nome da refeição
                    </Label>
                    <Input
                      value={meal.name}
                      onChange={(e) => handleExtraNameChange(meal.id, e.target.value)}
                      className="w-40 h-8 text-sm"
                      placeholder="Nome da refeição"
                      disabled={isLoading || isSaving || disabled}
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Horário da refeição
                  </Label>
                  <Select
                    value={meal.time || ""}
                    onValueChange={(value) => handleTimeChange(meal.id, value, meal.isExtra)}
                    disabled={isLoading || isSaving || disabled}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[240px]">
                      {TIME_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {meal.isExtra && meal.isNew && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleConfirmExtra(meal.id)}
                    disabled={isLoading || isSaving || disabled}
                    className="w-full"
                  >
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Salvar refeição
                  </Button>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Botão adicionar refeição extra */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddExtra}
        disabled={isLoading || isSaving || disabled}
        className="w-full mt-3 border-dashed"
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Refeição Extra
      </Button>

      {/* Ações */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetToGlobal}
          disabled={isLoading || isSaving || disabled}
          className="text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Restaurar padrão
        </Button>
        {onSave && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isLoading || isSaving || disabled}
            className="min-w-20"
          >
            {isSaving ? (
              <span className="animate-pulse">Salvando...</span>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Salvar
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-medium">Horários das Refeições</CardTitle>
                  {extraMeals.length > 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      +{extraMeals.length} extra{extraMeals.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4">
              {content}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Horários das Refeições</CardTitle>
        </div>
        <CardDescription>
          Configure os horários das suas refeições.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
