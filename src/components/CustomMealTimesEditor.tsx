import { useState, useEffect, useMemo, useCallback } from "react";
import { Clock, RotateCcw, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMealTimeSettings } from "@/hooks/useMealTimeSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";
import { formatMealTime } from "@/lib/mealTimeConfig";

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
  enabledMeals?: string[] | null;
  onSave?: (customTimes: CustomMealTimes | null, enabledMeals?: string[] | null) => Promise<boolean>;
  onChange?: (customTimes: CustomMealTimes | null) => void;
  onEnabledMealsChange?: (enabledMeals: string[]) => void;
  isLoading?: boolean;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
  showEnableToggle?: boolean;
}

// Converte horário HH:MM para minutos para ordenação
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export function CustomMealTimesEditor({
  customTimes,
  enabledMeals,
  onSave,
  onChange,
  onEnabledMealsChange,
  isLoading = false,
  compact = false,
  disabled = false,
  className,
  showEnableToggle = true,
}: CustomMealTimesEditorProps) {
  const { settings: globalSettings, isLoading: globalLoading } = useMealTimeSettings();
  const [isOpen, setIsOpen] = useState(!compact);
  const [localTimes, setLocalTimes] = useState<Record<string, string>>({});
  const [localEnabledMeals, setLocalEnabledMeals] = useState<string[]>([]);
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar com customTimes e enabledMeals do prop
  useEffect(() => {
    if (globalSettings.length === 0) return;
    
    const newTimes: Record<string, string> = {};
    const allMealTypes: string[] = [];
    
    globalSettings.forEach(setting => {
      allMealTypes.push(setting.meal_type);
      const customValue = customTimes?.[setting.meal_type];
      if (typeof customValue === 'string') {
        newTimes[setting.meal_type] = customValue;
      } else {
        newTimes[setting.meal_type] = formatMealTime(setting.start_hour);
      }
    });
    
    // Só atualiza se realmente mudou (evita loops)
    const hasChanged = Object.keys(newTimes).some(key => newTimes[key] !== localTimes[key]);
    if (hasChanged || Object.keys(localTimes).length === 0) {
      setLocalTimes(newTimes);
    }
    
    // Inicializar enabledMeals - se null/undefined, todos estão habilitados
    if (enabledMeals === undefined || enabledMeals === null) {
      setLocalEnabledMeals(allMealTypes);
    } else {
      setLocalEnabledMeals(enabledMeals);
    }
    
    setIsInitialized(true);
  }, [globalSettings, customTimes, enabledMeals]);

  // Emitir dados sempre que houver mudanças
  useEffect(() => {
    if (!onChange || globalSettings.length === 0) return;
    if (Object.keys(localTimes).length === 0) return;
    if (!isInitialized) return;
    
    onChange(localTimes);
  }, [localTimes, globalSettings.length, onChange, isInitialized]);

  // Emitir enabledMeals sempre que mudar
  useEffect(() => {
    if (!onEnabledMealsChange || !isInitialized) return;
    onEnabledMealsChange(localEnabledMeals);
  }, [localEnabledMeals, onEnabledMealsChange, isInitialized]);

  // Lista de refeições ordenadas por sort_order (ordem lógica do dia)
  const allMealsSorted = useMemo(() => {
    // globalSettings já vem ordenado por sort_order do banco
    return globalSettings.map((setting, index) => ({
      id: setting.meal_type,
      name: setting.label,
      time: localTimes[setting.meal_type] || `${setting.start_hour.toString().padStart(2, '0')}:00`,
      enabled: localEnabledMeals.includes(setting.meal_type),
      sortOrder: setting.sort_order,
      index, // posição na lista ordenada
    }));
  }, [globalSettings, localTimes, localEnabledMeals]);

  // Validação: verifica se o horário proposto não inverte a ordem lógica
  const validateTimeChange = useCallback((mealId: string, newTime: string): { valid: boolean; message?: string } => {
    const mealIndex = allMealsSorted.findIndex(m => m.id === mealId);
    if (mealIndex === -1) return { valid: true };

    const newMinutes = timeToMinutes(newTime);
    
    // Verificar refeição anterior (se existir e estiver habilitada)
    for (let i = mealIndex - 1; i >= 0; i--) {
      const prevMeal = allMealsSorted[i];
      if (prevMeal.enabled) {
        const prevMinutes = timeToMinutes(prevMeal.time);
        if (newMinutes <= prevMinutes) {
          return { 
            valid: false, 
            message: `O horário deve ser depois de ${prevMeal.name} (${prevMeal.time})` 
          };
        }
        break; // só precisa verificar a refeição habilitada mais próxima
      }
    }

    // Verificar próxima refeição (se existir e estiver habilitada)
    for (let i = mealIndex + 1; i < allMealsSorted.length; i++) {
      const nextMeal = allMealsSorted[i];
      if (nextMeal.enabled) {
        const nextMinutes = timeToMinutes(nextMeal.time);
        if (newMinutes >= nextMinutes) {
          return { 
            valid: false, 
            message: `O horário deve ser antes de ${nextMeal.name} (${nextMeal.time})` 
          };
        }
        break; // só precisa verificar a refeição habilitada mais próxima
      }
    }

    return { valid: true };
  }, [allMealsSorted]);

  // Gera dados para salvar (não usado mais, mas mantido para compatibilidade)
  const getDataToSave = useCallback((): CustomMealTimes => {
    return { ...localTimes };
  }, [localTimes]);

  // Atualiza estado local com validação de ordem lógica
  const handleTimeChange = (mealId: string, value: string) => {
    const validation = validateTimeChange(mealId, value);
    if (!validation.valid) {
      toast.error(validation.message || "Horário inválido");
      return;
    }
    const newTimes = { ...localTimes, [mealId]: value };
    setLocalTimes(newTimes);
  };

  // Apenas atualiza estado local - salva só quando clicar em "Salvar Alterações"
  const handleToggleMeal = (mealId: string, enabled: boolean) => {
    if (!enabled && localEnabledMeals.length <= 1) {
      toast.error("Você deve ter pelo menos uma refeição ativa");
      return;
    }
    
    const newEnabledMeals = enabled
      ? [...localEnabledMeals, mealId]
      : localEnabledMeals.filter(m => m !== mealId);
    
    setLocalEnabledMeals(newEnabledMeals);
  };

  // Restaurar ao padrão global (apenas estado local)
  const handleResetToGlobal = () => {
    const resetTimes: Record<string, string> = {};
    const allMealTypes: string[] = [];
    globalSettings.forEach(setting => {
      resetTimes[setting.meal_type] = `${setting.start_hour.toString().padStart(2, '0')}:00`;
      allMealTypes.push(setting.meal_type);
    });
    setLocalTimes(resetTimes);
    setLocalEnabledMeals(allMealTypes);
    toast.success("Horários e refeições restaurados ao padrão");
  };

  // Salvar no perfil do usuário e fechar o Collapsible
  const handleSaveToProfile = async () => {
    setIsSaving(true);
    try {
      const allMealTypes = globalSettings.map(s => s.meal_type);
      const isAllEnabled = allMealTypes.every(m => localEnabledMeals.includes(m));
      const enabledMealsToSave = isAllEnabled ? null : localEnabledMeals;

      // Se tiver callback onSave, usar ele (ProfilePage)
      if (onSave) {
        const success = await onSave(localTimes, enabledMealsToSave);
        if (success && compact) {
          setIsOpen(false);
        }
        return;
      }

      // Caso contrário, salvar diretamente (MealPlanGenerator)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ 
          default_meal_times: localTimes as Json,
          enabled_meals: enabledMealsToSave 
        })
        .eq("id", session.user.id);

      if (error) {
        console.error("[CustomMealTimesEditor] Error saving to profile:", error);
        toast.error("Erro ao salvar configurações");
        return;
      }

      toast.success("Configurações salvas com sucesso");
      
      // Fechar o Collapsible (se compact)
      if (compact) {
        setIsOpen(false);
      }
    } catch (error) {
      console.error("[CustomMealTimesEditor] Exception saving to profile:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  // Contagem de refeições ativas
  const activeCount = localEnabledMeals.length;
  const totalCount = globalSettings.length;

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
      {/* Badge com contagem de refeições ativas */}
      {showEnableToggle && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pb-2 border-b border-border/50">
          <span>Refeições ativas</span>
          <span className="font-medium text-foreground">{activeCount} de {totalCount}</span>
        </div>
      )}

      {/* Lista de horários em Accordion - ordenada por horário */}
      <Accordion type="single" collapsible className="space-y-2" value={openAccordion} onValueChange={setOpenAccordion}>
        {allMealsSorted.map(meal => (
          <AccordionItem 
            key={meal.id} 
            value={meal.id}
            className={cn(
              "border border-border/50 rounded-lg px-4 data-[state=open]:bg-muted/50",
              meal.enabled ? "bg-muted/30" : "bg-muted/10 opacity-60"
            )}
          >
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-3">
                  {showEnableToggle && (
                    <Switch
                      checked={meal.enabled}
                      onCheckedChange={(checked) => {
                        handleToggleMeal(meal.id, checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      disabled={isLoading || disabled}
                      className="data-[state=checked]:bg-primary"
                    />
                  )}
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className={cn(
                    "text-sm font-medium",
                    !meal.enabled && "text-muted-foreground"
                  )}>{meal.name}</span>
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
                    disabled={isLoading || disabled || !meal.enabled}
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
          disabled={isLoading || disabled || isSaving}
          className="text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Restaurar padrão
        </Button>
        <Button
          size="sm"
          onClick={handleSaveToProfile}
          disabled={isLoading || disabled || isSaving}
          className="gradient-primary border-0"
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
                  {showEnableToggle && (
                    <span className="text-xs text-muted-foreground">({activeCount} ativas)</span>
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
          {showEnableToggle && (
            <span className="text-xs text-muted-foreground">({activeCount} ativas)</span>
          )}
        </div>
        <CardDescription>
          Configure os horários e ative/desative as refeições que deseja incluir no seu plano.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
