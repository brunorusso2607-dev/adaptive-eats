import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ArrowLeft, Calendar, CheckCircle2, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CustomMealTimesEditor, CustomMealTimesWithExtras } from "@/components/CustomMealTimesEditor";

type MealPlanGeneratorProps = {
  onClose: () => void;
  onPlanGenerated: () => void;
};

export default function MealPlanGenerator({ onClose, onPlanGenerated }: MealPlanGeneratorProps) {
  const [planName, setPlanName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [customMealTimes, setCustomMealTimes] = useState<CustomMealTimesWithExtras | null>(null);

  // Fetch user profile to get excluded ingredients and default meal times
  useEffect(() => {
    const fetchProfileAndTemplate = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("excluded_ingredients, default_meal_times")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.excluded_ingredients) {
        setExcludedIngredients(profile.excluded_ingredients);
      }
      
      // Usar horários padrão do perfil como template
      if (profile?.default_meal_times) {
        setCustomMealTimes(profile.default_meal_times as CustomMealTimesWithExtras);
      } else {
        // Se não há template no perfil, buscar do último plano criado
        const { data: lastPlan } = await supabase
          .from("meal_plans")
          .select("custom_meal_times")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (lastPlan?.custom_meal_times) {
          setCustomMealTimes(lastPlan.custom_meal_times as CustomMealTimesWithExtras);
        }
      }
    };
    
    fetchProfileAndTemplate();
  }, []);

  // Calculate remaining days and determine if we should use next month
  const { remainingDays, monthName, defaultPlanName } = useMemo(() => {
    const today = new Date();
    const lastDayOfMonth = endOfMonth(today);
    const daysLeft = differenceInDays(lastDayOfMonth, today) + 1; // +1 to include today
    
    // Se restam 5 dias ou menos, o plano é para o próximo mês
    const DAYS_BEFORE_UNLOCK = 5;
    const targetDate = daysLeft <= DAYS_BEFORE_UNLOCK 
      ? new Date(today.getFullYear(), today.getMonth() + 1, 1) // Primeiro dia do próximo mês
      : today;
    
    const month = format(targetDate, "MMMM", { locale: ptBR });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    const year = format(targetDate, "yyyy");
    
    return {
      remainingDays: daysLeft,
      monthName: capitalizedMonth,
      defaultPlanName: `${capitalizedMonth} ${year}`
    };
  }, []);

  const handleGenerate = async () => {
    const finalPlanName = planName.trim() || defaultPlanName;
    
    if (remainingDays <= 0) {
      toast.error("Não há dias restantes neste mês para gerar um plano.");
      return;
    }

    // Processar customMealTimes para garantir que extras não tenham isNew: true
    // Isso garante que refeições extras não confirmadas individualmente sejam salvas corretamente
    let processedMealTimes = customMealTimes;
    if (customMealTimes?.extras && Array.isArray(customMealTimes.extras)) {
      processedMealTimes = {
        ...customMealTimes,
        extras: customMealTimes.extras.map(extra => ({
          ...extra,
          isNew: false, // Remove flag isNew para garantir que sejam processadas
        })),
      };
    }
    
    // Log para debug
    console.log("[MealPlanGenerator] Gerando plano com customMealTimes:", processedMealTimes);

    setIsGenerating(true);
    setProgress(0);

    try {
      // Generate in batches of 7 days max (API limitation)
      const batchSize = 7;
      const totalBatches = Math.ceil(remainingDays / batchSize);
      let mealPlanId: string | null = null;
      let currentDayOffset = 0;

      for (let batch = 0; batch < totalBatches; batch++) {
        const daysInThisBatch = Math.min(batchSize, remainingDays - currentDayOffset);
        const today = new Date();
        const batchStartDate = new Date(today);
        batchStartDate.setDate(today.getDate() + currentDayOffset);

        setProgress(Math.round((batch / totalBatches) * 100));

        const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
          body: {
            planName: finalPlanName,
            startDate: batchStartDate.toISOString().split('T')[0],
            daysCount: daysInThisBatch,
            existingPlanId: mealPlanId,
            weekNumber: batch + 1,
            customMealTimes: processedMealTimes
          }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        // Save the plan ID for subsequent batches
        if (data.mealPlan?.id && !mealPlanId) {
          mealPlanId = data.mealPlan.id;
        }

        currentDayOffset += daysInThisBatch;
      }

      setProgress(100);
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span>Plano de {monthName} criado com sucesso!</span>
        </div>
      );
      
      // Small delay to show 100% progress, then close
      setTimeout(() => {
        onPlanGenerated();
      }, 500);

    } catch (error) {
      console.error("Error generating meal plan:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar plano alimentar");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose} disabled={isGenerating}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Criar Plano Alimentar</h2>
          <p className="text-sm text-muted-foreground">A IA vai gerar um plano personalizado baseado no seu perfil</p>
        </div>
      </div>

      <Card className="glass-card border-primary/20">
        <CardContent className="p-6 space-y-6">
          {/* Plan Name */}
          <div className="space-y-2">
            <Label htmlFor="planName">Nome do Plano</Label>
            <Input
              id="planName"
              placeholder={defaultPlanName}
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Custom Meal Times Editor */}
          <CustomMealTimesEditor
            onChange={setCustomMealTimes}
            disabled={isGenerating}
            compact
          />

          {/* Dynamic Info Message */}
          <div className="text-center space-y-1">
            <p className="text-base font-medium text-foreground">
              Complete seu mês de {monthName}
            </p>
            <p className="text-sm text-muted-foreground">
              com <span className="font-semibold text-primary">{remainingDays} dias</span> de receitas personalizadas
            </p>
          </div>

          {/* Progress bar when generating */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Gerando receitas... {progress}%
              </p>
            </div>
          )}

          {/* Generate Button */}
          <Button
            className="w-full gradient-primary border-0 text-lg py-6"
            onClick={handleGenerate}
            disabled={isGenerating || remainingDays <= 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Gerar Plano Alimentar
              </>
            )}
          </Button>

          {isGenerating && (
            <p className="text-sm text-muted-foreground text-center animate-pulse flex items-center justify-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              Isso pode levar alguns segundos...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Excluded Ingredients Card */}
      {excludedIngredients.length > 0 && (
        <Card className="glass-card border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">Ingredientes excluídos</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  Esses ingredientes serão evitados em todas as receitas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {excludedIngredients.map((item) => (
                    <Badge key={item} variant="outline" className="text-xs bg-destructive/10 border-destructive/30 text-destructive">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="glass-card border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Como funciona?</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              <li>• {remainingDays} dias de receitas serão gerados automaticamente</li>
              <li>• Refeições personalizadas conforme seus horários</li>
              <li>• Receitas variadas adaptadas ao seu perfil</li>
              <li>• Um novo plano poderá ser criado no próximo mês</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
