import { useState, useEffect, useMemo, useCallback } from "react";
import { Clock, RotateCcw, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

export type CustomMealTimes = Record<string, string>;

interface CustomMealTimesEditorProps {
  customTimes?: CustomMealTimes | null;
  onSave?: (customTimes: CustomMealTimes | null) => Promise<boolean>;
  onChange?: (customTimes: CustomMealTimes | null) => void;
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
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sincronizar com customTimes do prop (perfil) sempre que mudar
  useEffect(() => {
    if (globalSettings.length === 0) return;
    
    const newTimes: Record<string, string> = {};
    globalSettings.forEach(setting => {
      const customValue = customTimes?.[setting.meal_type];
      if (typeof customValue === 'string') {
        newTimes[setting.meal_type] = customValue;
      } else {
        newTimes[setting.meal_type] = `${setting.start_hour.toString().padStart(2, '0')}:00`;
      }
    });
    
    // Só atualiza se realmente mudou (evita loops)
    const hasChanged = Object.keys(newTimes).some(key => newTimes[key] !== localTimes[key]);
    if (hasChanged || Object.keys(localTimes).length === 0) {
      setLocalTimes(newTimes);
    }
    
    setIsInitialized(true);
  }, [globalSettings, customTimes]);

  // Emitir dados sempre que houver mudanças
  useEffect(() => {
    if (!onChange || globalSettings.length === 0) return;
    if (Object.keys(localTimes).length === 0) return;
    if (!isInitialized) return;
    
    onChange(localTimes);
  }, [localTimes, globalSettings.length, onChange, isInitialized]);

  // Lista de refeições ordenadas por horário
  const allMealsSorted = useMemo(() => {
    return globalSettings.map(setting => ({
      id: setting.meal_type,
      name: setting.label,
      time: localTimes[setting.meal_type] || `${setting.start_hour.toString().padStart(2, '0')}:00`,
    })).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [globalSettings, localTimes]);

  // Gera dados para salvar
  const getDataToSave = useCallback((): CustomMealTimes => {
    return { ...localTimes };
  }, [localTimes]);

  // Salvar template no perfil do usuário
  const saveTemplateToProfile = useCallback(async (dataToSave: CustomMealTimes) => {
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

      return true;
    } catch (error) {
      console.error("[CustomMealTimesEditor] Exception saving to profile:", error);
      return false;
    }
  }, []);

  const handleTimeChange = async (mealId: string, value: string) => {
    setHasChanges(true);
    
    const newTimes = { ...localTimes, [mealId]: value };
    setLocalTimes(newTimes);
    
    // Salvar automaticamente no perfil do usuário
    const saved = await saveTemplateToProfile(newTimes);
    if (saved) {
      toast.success("Horário atualizado", { duration: 1500 });
    }
  };

  const handleResetToGlobal = async () => {
    const resetTimes: Record<string, string> = {};
    globalSettings.forEach(setting => {
      resetTimes[setting.meal_type] = `${setting.start_hour.toString().padStart(2, '0')}:00`;
    });
    setLocalTimes(resetTimes);
    setHasChanges(true);

    // Salvar reset no perfil
    await saveTemplateToProfile(resetTimes);
    toast.success("Horários restaurados ao padrão");
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      const dataToSave = getDataToSave();
      const success = await onSave(dataToSave);
      
      if (success) {
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
            className="border border-border/50 rounded-lg px-4 data-[state=open]:bg-muted/50 bg-muted/30"
          >
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{meal.name}</span>
                </div>
                <span className="text-sm text-muted-foreground font-mono">
                  {meal.time || "--:--"}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Horário da refeição
                  </Label>
                  <Select
                    value={meal.time || ""}
                    onValueChange={(value) => handleTimeChange(meal.id, value)}
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
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

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
