import { useState, useEffect } from "react";
import { Clock, RotateCcw, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useMealTimeSettings } from "@/hooks/useMealTimeSettings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type CustomMealTimes = Record<string, string>;

interface CustomMealTimesEditorProps {
  customTimes: CustomMealTimes | null;
  onSave: (customTimes: CustomMealTimes | null) => Promise<boolean>;
  isLoading?: boolean;
  compact?: boolean;
  className?: string;
}

export function CustomMealTimesEditor({
  customTimes,
  onSave,
  isLoading = false,
  compact = false,
  className,
}: CustomMealTimesEditorProps) {
  const { settings: globalSettings, isLoading: globalLoading } = useMealTimeSettings();
  const [isOpen, setIsOpen] = useState(!compact);
  const [useCustomTimes, setUseCustomTimes] = useState(customTimes !== null && Object.keys(customTimes).length > 0);
  const [localTimes, setLocalTimes] = useState<CustomMealTimes>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Inicializar horários locais com valores existentes ou globais
  useEffect(() => {
    if (globalSettings.length === 0) return;

    const initialTimes: CustomMealTimes = {};
    globalSettings.forEach(setting => {
      const customValue = customTimes?.[setting.meal_type];
      if (customValue) {
        initialTimes[setting.meal_type] = customValue;
      } else {
        // Converter hora para formato HH:MM
        initialTimes[setting.meal_type] = `${setting.start_hour.toString().padStart(2, '0')}:00`;
      }
    });
    setLocalTimes(initialTimes);
    setUseCustomTimes(customTimes !== null && Object.keys(customTimes).length > 0);
  }, [globalSettings, customTimes]);

  const handleTimeChange = (mealType: string, value: string) => {
    setLocalTimes(prev => ({
      ...prev,
      [mealType]: value,
    }));
    setHasChanges(true);
  };

  const handleToggleCustomTimes = (enabled: boolean) => {
    setUseCustomTimes(enabled);
    setHasChanges(true);
  };

  const handleResetToGlobal = () => {
    const resetTimes: CustomMealTimes = {};
    globalSettings.forEach(setting => {
      resetTimes[setting.meal_type] = `${setting.start_hour.toString().padStart(2, '0')}:00`;
    });
    setLocalTimes(resetTimes);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const timesToSave = useCustomTimes ? localTimes : null;
      const success = await onSave(timesToSave);
      
      if (success) {
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
          disabled={isLoading || isSaving}
        />
      </div>

      {/* Lista de horários */}
      <div className={cn(
        "space-y-3 transition-opacity duration-200",
        !useCustomTimes && "opacity-50 pointer-events-none"
      )}>
        {globalSettings.map(setting => (
          <div 
            key={setting.meal_type} 
            className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50 border border-border/50"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">{setting.label}</span>
            </div>
            <Input
              type="time"
              value={localTimes[setting.meal_type] || ""}
              onChange={(e) => handleTimeChange(setting.meal_type, e.target.value)}
              className="w-28 text-center"
              disabled={!useCustomTimes || isLoading || isSaving}
            />
          </div>
        ))}
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetToGlobal}
          disabled={!useCustomTimes || isLoading || isSaving}
          className="text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Restaurar padrão
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || isLoading || isSaving}
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
