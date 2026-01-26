import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ArrowLeft, Calendar, CheckCircle2, Ban } from "lucide-react";
import LegalDisclaimer from "./LegalDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CustomMealTimesEditor, type CustomMealTimes } from "@/components/CustomMealTimesEditor";
import type { Json } from "@/integrations/supabase/types";

type MealPlanGeneratorProps = {
  onClose: () => void;
  onPlanGenerated: () => void;
};

export default function MealPlanGenerator({ onClose, onPlanGenerated }: MealPlanGeneratorProps) {
  const [planName, setPlanName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [customMealTimes, setCustomMealTimes] = useState<CustomMealTimes | null>(null);
  const [enabledMeals, setEnabledMeals] = useState<string[] | null>(null);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  // Fetch user profile to get excluded ingredients, default meal times, and enabled meals
  useEffect(() => {
    const fetchProfileAndTemplate = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsProfileLoaded(true);
        return;
      }
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("excluded_ingredients, default_meal_times, enabled_meals")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.excluded_ingredients) {
        setExcludedIngredients(profile.excluded_ingredients);
      }
      
      // Usar refeições ativas do perfil
      if (profile?.enabled_meals) {
        setEnabledMeals(profile.enabled_meals);
      }
      
      // Usar horários padrão do perfil como template
      if (profile?.default_meal_times) {
        setCustomMealTimes(profile.default_meal_times as CustomMealTimes);
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
          setCustomMealTimes(lastPlan.custom_meal_times as CustomMealTimes);
        }
      }
      
      setIsProfileLoaded(true);
    };
    
    fetchProfileAndTemplate();
  }, []);

  // Calculate remaining days from today until end of current month
  // Always target current month - user creates plan for remaining days
  const { remainingDays, monthName, defaultPlanName, targetStartDate } = useMemo(() => {
    const today = new Date();
    const lastDayOfMonth = endOfMonth(today);
    const daysLeftCurrentMonth = differenceInDays(lastDayOfMonth, today) + 1; // +1 to include today
    
    const month = format(today, "MMMM", { locale: ptBR });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    const year = format(today, "yyyy");
    
    return {
      remainingDays: daysLeftCurrentMonth,
      monthName: capitalizedMonth,
      defaultPlanName: `${capitalizedMonth} ${year}`,
      targetStartDate: today
    };
  }, []);

  const handleGenerate = async () => {
    const finalPlanName = planName.trim() || defaultPlanName;
    
    if (remainingDays <= 0) {
      toast.error("Não há dias restantes neste mês para gerar um plano.");
      return;
    }

    // Log para debug
    console.log("[MealPlanGenerator] Gerando plano com customMealTimes:", customMealTimes);

    setIsGenerating(true);
    setProgress(0);

    try {
      // Generate in batches of 3 days max to avoid edge function timeout
      const batchSize = 3;
      const totalBatches = Math.ceil(remainingDays / batchSize);
      let mealPlanId: string | null = null;
      let currentDayOffset = 0;

      console.log(`[MealPlanGenerator] Starting generation:`, {
        remainingDays,
        batchSize,
        totalBatches,
        monthName
      });

      for (let batch = 0; batch < totalBatches; batch++) {
        const daysInThisBatch = Math.min(batchSize, remainingDays - currentDayOffset);
        // Usar targetStartDate (primeiro dia do próximo mês se isNextMonth, ou hoje)
        const batchStartDate = new Date(targetStartDate);
        batchStartDate.setDate(targetStartDate.getDate() + currentDayOffset);

        console.log(`[MealPlanGenerator] Processing batch ${batch + 1}/${totalBatches}:`, {
          daysInThisBatch,
          currentDayOffset,
          batchStartDate: batchStartDate.toISOString().split('T')[0]
        });

        setProgress(Math.round((batch / totalBatches) * 100));

        // Normalizar nomes de refeições: valores antigos em português para inglês
        const normalizedMealTypes = enabledMeals?.map((meal: string) => {
          // Manter retrocompatibilidade com valores antigos
          if (meal === "lanche" || meal === "lanche_tarde") return "afternoon_snack";
          return meal;
        }) || null;

        // Filtrar customMealTimes para incluir apenas refeições ativas
        const filteredMealTimes = customMealTimes ? 
          Object.fromEntries(
            Object.entries(customMealTimes).filter(([key]) => 
              !enabledMeals || enabledMeals.includes(key)
            )
          ) : null;

        console.log("[MealPlanGenerator] Enviando para API:", {
          enabledMeals,
          normalizedMealTypes,
          filteredMealTimes
        });

        let batchSuccess = false;
        
        try {
          // Primeiro, tentar refresh da sessão para garantir token válido
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('[DEBUG] Refresh error:', refreshError);
          }
          
          const { data: { session } } = await supabase.auth.getSession();
          console.log('[DEBUG] Session:', session ? 'EXISTS' : 'NULL');
          console.log('[DEBUG] Access token:', session?.access_token ? `${session.access_token.substring(0, 50)}...` : 'NULL');
          console.log('[DEBUG] Token expires_at:', session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'NULL');
          console.log('[DEBUG] User ID:', session?.user?.id || 'NULL');
          
          if (!session) {
            throw new Error("Você precisa estar logado para gerar planos");
          }

          console.log('[DEBUG] Calling Edge Function with fetch (direct)');
          console.log('[DEBUG] Token being sent:', session.access_token.substring(0, 50) + '...');
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          
          // IMPORTANTE: Supabase Gateway requer apikey para autenticar a requisição
          // mas o Authorization header é usado pela Edge Function para identificar o usuário
          const response = await fetch(`${supabaseUrl}/functions/v1/generate-ai-meal-plan`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,  // Anon key para autenticar com o Gateway
              'Authorization': `Bearer ${session.access_token}`,  // User token para a Edge Function
            },
            body: JSON.stringify({
              planName: finalPlanName,
              startDate: `${batchStartDate.getFullYear()}-${String(batchStartDate.getMonth() + 1).padStart(2, '0')}-${String(batchStartDate.getDate()).padStart(2, '0')}`,
              daysCount: daysInThisBatch,
              existingPlanId: mealPlanId,
              weekNumber: batch + 1,
              customMealTimes: filteredMealTimes,
              mealTypes: normalizedMealTypes,
              optionsPerMeal: 1,
              dayOffset: currentDayOffset
            })
          });
          
          const data = await response.json();
          const error = response.ok ? null : new Error(data.error || `HTTP ${response.status}`);

          if (error) throw error;
          if (data?.error) throw new Error(data.error);

          // Save the plan ID for subsequent batches
          if (data.mealPlan?.id && !mealPlanId) {
            mealPlanId = data.mealPlan.id;
          }
          batchSuccess = true;
        } catch (edgeFunctionError) {
          console.warn("Edge function error, checking if plan was created anyway:", edgeFunctionError);
          
          // Check if plan was created despite connection error
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data: recentPlans } = await supabase
              .from("meal_plans")
              .select("id, name, created_at")
              .eq("user_id", session.user.id)
              .gte("created_at", new Date(Date.now() - 60000).toISOString())
              .order("created_at", { ascending: false })
              .limit(1);
            
            if (recentPlans && recentPlans.length > 0) {
              console.log("Plan was created despite connection error:", recentPlans[0]);
              if (!mealPlanId) {
                mealPlanId = recentPlans[0].id;
              }
              batchSuccess = true;
            } else {
              throw edgeFunctionError;
            }
          } else {
            throw edgeFunctionError;
          }
        }
        
        if (batchSuccess) {
          currentDayOffset += daysInThisBatch;
          console.log(`[MealPlanGenerator] Batch ${batch + 1} completed successfully`, {
            mealPlanId,
            currentDayOffset,
            remainingDays: remainingDays - currentDayOffset
          });
        } else {
          console.error(`[MealPlanGenerator] Batch ${batch + 1} failed, stopping generation`);
          break;
        }
      }
      
      console.log(`[MealPlanGenerator] Generation loop finished`, {
        totalBatchesProcessed: currentDayOffset / batchSize,
        totalDaysGenerated: currentDayOffset
      });

      setProgress(100);
      
      // Save customMealTimes as default template in user profile
      if (customMealTimes) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase
            .from("profiles")
            .update({ default_meal_times: customMealTimes as Json })
            .eq("id", session.user.id);
          console.log("[MealPlanGenerator] Saved meal times template to profile");
        }
      }
      
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

          {/* Custom Meal Times Editor - pass loaded template and enabled meals */}
          {isProfileLoaded && (
            <div className="space-y-1">
              <CustomMealTimesEditor
                customTimes={customMealTimes}
                enabledMeals={enabledMeals}
                onChange={setCustomMealTimes}
                onEnabledMealsChange={setEnabledMeals}
                disabled={isGenerating}
                compact
                showEnableToggle
              />
              <p className="text-xs text-muted-foreground text-center">
                Toque para personalizar os horários de cada refeição
              </p>
            </div>
          )}

          {/* Dynamic Info Message */}
          <div className="text-center space-y-1">
            <p className="text-base font-medium text-foreground">
              Complete seu mês de {monthName}
            </p>
            <p className="text-sm text-muted-foreground">
              com <span className="font-semibold text-primary">{remainingDays} dias</span> de refeições personalizadas
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
                Gerando refeições... {progress}%
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
                  Esses alimentos serão evitados em todas as refeições
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
              <li>• {remainingDays} dias de refeições serão gerados automaticamente</li>
              <li>• Refeições personalizadas conforme seus horários</li>
              <li>• Cardápio variado adaptado ao seu perfil</li>
              <li>• Um novo plano poderá ser criado no próximo mês</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Disclaimer */}
      <LegalDisclaimer className="mt-4" />
    </div>
  );
}
