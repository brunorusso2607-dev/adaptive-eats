import { useState, useEffect, useMemo } from "react";
import { Clock, RotateCcw, Check, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMealTimeSettings } from "@/hooks/useMealTimeSettings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  isNew?: boolean; // Flag para identificar extras recém-adicionados (não salvos)
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
  const [useCustomTimes, setUseCustomTimes] = useState(customTimes != null && Object.keys(customTimes).length > 0);
  const [localTimes, setLocalTimes] = useState<Record<string, string>>({});
  const [extraMeals, setExtraMeals] = useState<ExtraMeal[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);

  // Inicializar horários locais e extras com valores existentes ou globais
  useEffect(() => {
    if (globalSettings.length === 0) return;

    const initialTimes: Record<string, string> = {};
    globalSettings.forEach(setting => {
      const customValue = customTimes?.[setting.meal_type];
      if (typeof customValue === 'string') {
        initialTimes[setting.meal_type] = customValue;
      } else {
        initialTimes[setting.meal_type] = `${setting.start_hour.toString().padStart(2, '0')}:00`;
      }
    });
    setLocalTimes(initialTimes);
    
    // Carregar extras se existirem
    const extras = customTimes?.extras;
    if (Array.isArray(extras)) {
      setExtraMeals(extras);
    } else {
      setExtraMeals([]);
    }
    
    setUseCustomTimes(customTimes != null && Object.keys(customTimes).length > 0);
  }, [globalSettings, customTimes]);

  // Combina refeições padrão + extras
  // Extras novos (não salvos) ficam no final, extras salvos são ordenados por horário
  const allMealsSorted = useMemo(() => {
    const standardMeals = globalSettings.map(setting => ({
      id: setting.meal_type,
      name: setting.label,
      time: localTimes[setting.meal_type] || `${setting.start_hour.toString().padStart(2, '0')}:00`,
      isExtra: false,
      isNew: false,
    }));

    // Separa extras novos dos já salvos
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

    // Ordena padrão + extras salvos por horário, depois adiciona extras novos no final
    const sortedMeals = [...standardMeals, ...savedExtras].sort((a, b) => 
      timeToMinutes(a.time) - timeToMinutes(b.time)
    );

    return [...sortedMeals, ...newExtras];
  }, [globalSettings, localTimes, extraMeals]);

  // Gera dados para salvar
  const getDataToSave = (): CustomMealTimesWithExtras | null => {
    if (!useCustomTimes) return null;
    
    const data: CustomMealTimesWithExtras = { ...localTimes };
    if (extraMeals.length > 0) {
      data.extras = extraMeals;
    }
    return data;
  };

  const handleTimeChange = (mealId: string, value: string, isExtra: boolean) => {
    setHasChanges(true);
    
    if (isExtra) {
      const newExtras = extraMeals.map(extra =>
        extra.id === mealId ? { ...extra, time: value } : extra
      );
      setExtraMeals(newExtras);
      
      if (onChange && useCustomTimes) {
        const data: CustomMealTimesWithExtras = { ...localTimes };
        data.extras = newExtras;
        onChange(data);
      }
    } else {
      const newTimes = { ...localTimes, [mealId]: value };
      setLocalTimes(newTimes);
      
      if (onChange && useCustomTimes) {
        const data: CustomMealTimesWithExtras = { ...newTimes };
        if (extraMeals.length > 0) {
          data.extras = extraMeals;
        }
        onChange(data);
      }
    }
  };

  const handleExtraNameChange = (mealId: string, name: string) => {
    setHasChanges(true);
    const newExtras = extraMeals.map(extra =>
      extra.id === mealId ? { ...extra, name } : extra
    );
    setExtraMeals(newExtras);
    
    if (onChange && useCustomTimes) {
      const data: CustomMealTimesWithExtras = { ...localTimes };
      data.extras = newExtras;
      onChange(data);
    }
  };

  const handleAddExtra = () => {
    const newExtraId = `extra_${Date.now()}`;
    const newExtra: ExtraMeal = {
      id: newExtraId,
      name: "Refeição Extra",
      time: "15:00",
      isNew: true, // Marca como novo para ficar no final da lista
    };
    const newExtras = [...extraMeals, newExtra];
    setExtraMeals(newExtras);
    setHasChanges(true);
    setOpenAccordion(newExtraId); // Abre o accordion do novo extra automaticamente
    
    if (onChange && useCustomTimes) {
      const data: CustomMealTimesWithExtras = { ...localTimes };
      data.extras = newExtras;
      onChange(data);
    }
  };

  const handleRemoveExtra = (mealId: string) => {
    const newExtras = extraMeals.filter(extra => extra.id !== mealId);
    setExtraMeals(newExtras);
    setHasChanges(true);
    
    if (onChange && useCustomTimes) {
      const data: CustomMealTimesWithExtras = { ...localTimes };
      if (newExtras.length > 0) {
        data.extras = newExtras;
      }
      onChange(data);
    }
  };

  // Confirma/salva um extra individual (remove a flag isNew)
  const handleConfirmExtra = (mealId: string) => {
    const newExtras = extraMeals.map(extra =>
      extra.id === mealId ? { ...extra, isNew: false } : extra
    );
    setExtraMeals(newExtras);
    setHasChanges(true);
    
    if (onChange && useCustomTimes) {
      const data: CustomMealTimesWithExtras = { ...localTimes };
      data.extras = newExtras;
      onChange(data);
    }
    
    toast.success("Refeição extra adicionada");
  };

  const handleToggleCustomTimes = (enabled: boolean) => {
    setUseCustomTimes(enabled);
    setHasChanges(true);
    if (onChange) {
      onChange(enabled ? getDataToSave() : null);
    }
  };

  const handleResetToGlobal = () => {
    const resetTimes: Record<string, string> = {};
    globalSettings.forEach(setting => {
      resetTimes[setting.meal_type] = `${setting.start_hour.toString().padStart(2, '0')}:00`;
    });
    setLocalTimes(resetTimes);
    setExtraMeals([]);
    setHasChanges(true);
    
    if (onChange && useCustomTimes) {
      onChange(resetTimes);
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      const dataToSave = getDataToSave();
      const success = await onSave(dataToSave);
      
      if (success) {
        // Remove a flag isNew de todos os extras após salvar
        const savedExtras = extraMeals.map(extra => ({
          ...extra,
          isNew: false,
        }));
        setExtraMeals(savedExtras);
        
        toast.success(useCustomTimes ? "Horários personalizados salvos" : "Usando horários padrão");
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
      {/* Toggle para habilitar horários personalizados */}
      <div className="flex items-center justify-between py-2">
        <div className="space-y-0.5">
          <Label htmlFor="custom-times-toggle" className="text-sm font-medium">
            Horários personalizados
          </Label>
          <p className="text-xs text-muted-foreground">
            {useCustomTimes ? "Usando horários deste plano" : "Usando horários padrão do sistema"}
          </p>
        </div>
        <Switch
          id="custom-times-toggle"
          checked={useCustomTimes}
          onCheckedChange={handleToggleCustomTimes}
          disabled={isLoading || isSaving || disabled}
        />
      </div>

      {/* Lista de horários em Accordion - ordenada por horário */}
      <div className={cn(
        "transition-opacity duration-200",
        !useCustomTimes && "opacity-50 pointer-events-none"
      )}>
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
                    {/* Ícone de lixeira para extras salvos (não novos) */}
                    {meal.isExtra && !meal.isNew && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveExtra(meal.id);
                        }}
                        disabled={!useCustomTimes || isLoading || isSaving || disabled}
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
                  {/* Nome editável para extras */}
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
                        disabled={!useCustomTimes || isLoading || isSaving || disabled}
                      />
                    </div>
                  )}
                  
                  {/* Seletor de horário */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Horário da refeição
                    </Label>
                    <Select
                      value={meal.time || ""}
                      onValueChange={(value) => handleTimeChange(meal.id, value, meal.isExtra)}
                      disabled={!useCustomTimes || isLoading || isSaving || disabled}
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
                  
                  {/* Botão salvar apenas para extras novos */}
                  {meal.isExtra && meal.isNew && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleConfirmExtra(meal.id)}
                      disabled={!useCustomTimes || isLoading || isSaving || disabled}
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
          disabled={!useCustomTimes || isLoading || isSaving || disabled}
          className="w-full mt-3 border-dashed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Refeição Extra
        </Button>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetToGlobal}
          disabled={!useCustomTimes || isLoading || isSaving || disabled}
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
                  {useCustomTimes && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Personalizado
                    </span>
                  )}
                  {extraMeals.length > 0 && (
                    <span className="text-xs bg-secondary/50 text-secondary-foreground px-2 py-0.5 rounded-full">
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
          Configure horários específicos para este plano ou use os padrões do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
