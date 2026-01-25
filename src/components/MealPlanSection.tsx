import { useState, useEffect, useMemo } from "react";
import { useSwipeToClose } from "@/hooks/use-swipe-to-close";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Loader2, Trash2, Eye, ArrowLeft, ShoppingCart, CheckCircle2, Clock, Settings2, Copy, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import MealPlanModeSelector, { MealPlanMode } from "./MealPlanModeSelector";
import MealPlanGenerator from "./MealPlanGenerator";

import CustomMealPlanBuilder from "./CustomMealPlanBuilder";
import MealPlanCalendar from "./MealPlanCalendar";
import MealDetailSheet from "./MealDetailSheet";
import ShoppingList from "./ShoppingList";
import MealPlanEditor from "./MealPlanEditor";
import DuplicatePlanDialog from "./DuplicatePlanDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Ingredient = { item: string; quantity: string; unit: string };

type MealPlanItem = {
  id: string;
  day_of_week: number;
  week_number: number;
  meal_type: string;
  recipe_name: string;
  recipe_calories: number;
  recipe_protein: number;
  recipe_carbs: number;
  recipe_fat: number;
  recipe_prep_time: number;
  recipe_ingredients: Ingredient[];
  recipe_instructions: string[];
  is_favorite: boolean;
  completed_at?: string | null;
};

type MealPlan = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  status?: string;
  completion_percentage?: number;
  unlocks_at?: string | null;
  source_plan_id?: string | null;
  items: MealPlanItem[];
};

type MealPlanSectionProps = {
  onBack?: () => void;
  onPlanDeleted?: () => void;
  autoSelectLatestPlan?: boolean;
  onAutoSelectComplete?: () => void;
};

// Helper to check if a date is in the same month
const isSameMonth = (date1: Date, date2: Date) => {
  return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
};

// Helper to get month name in Portuguese
const getMonthName = (date: Date) => {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

// Helper to check if plan is from a past month
const isPastMonth = (planEndDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = planEndDate.split('-').map(Number);
  const endDate = new Date(year, month - 1, day);
  return endDate < today && !isSameMonth(endDate, today);
};

// Helper to check if we're within 5 days of month end
const isNearMonthEnd = () => {
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysUntilEnd = lastDayOfMonth.getDate() - today.getDate();
  return daysUntilEnd <= 5;
};

// Helper to check if there's ANY plan for current month (regardless of status)
const hasAnyPlanThisMonth = (plans: MealPlan[]) => {
  const today = new Date();
  return plans.some(plan => {
    const [year, month, day] = plan.start_date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    return isSameMonth(startDate, today);
  });
};

// Helper to check if there's an active plan for current month
const hasActivePlanThisMonth = (plans: MealPlan[]) => {
  const today = new Date();
  return plans.some(plan => {
    const [year, month, day] = plan.start_date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    return isSameMonth(startDate, today) && plan.status === 'active';
  });
};

// Helper to check if there's already a plan for next month
const hasPlanForNextMonth = (plans: MealPlan[]) => {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return plans.some(plan => {
    const [year, month, day] = plan.start_date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    return isSameMonth(startDate, nextMonth);
  });
};

type UserProfile = {
  intolerances?: string[] | null;
  dietary_preference?: string | null;
  strategy_id?: string | null;
  excluded_ingredients?: string[] | null;
};

export default function MealPlanSection({ onBack, onPlanDeleted, autoSelectLatestPlan, onAutoSelectComplete }: MealPlanSectionProps) {
  const [view, setView] = useState<"list" | "select-mode" | "create-ai" | "create-custom" | "calendar" | "recipe" | "shopping" | "edit">("list");
  const [isLoading, setIsLoading] = useState(true);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealPlanItem | null>(null);
  const [showMealDetailSheet, setShowMealDetailSheet] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [duplicatingPlan, setDuplicatingPlan] = useState<MealPlan | null>(null);
  
  // Feature flag para mostrar/esconder opção "Montar Meu Plano"
  const { isEnabled: isManualPlanBuilderEnabled } = useFeatureFlag("manual_meal_plan_builder");
  
  // Estado elevado para preservar dia selecionado ao navegar calendar <-> recipe
  const [calendarSelectedWeek, setCalendarSelectedWeek] = useState<number | null>(null);
  const [calendarSelectedDayIndex, setCalendarSelectedDayIndex] = useState<number | null>(null);

  // Swipe to close with visual feedback
  const { handlers: swipeHandlers, style: swipeStyle, isDragging } = useSwipeToClose({
    onClose: () => onBack?.(),
    direction: "right",
    threshold: 100,
  });

  // Check if user can create a new plan
  const canCreateNewPlan = useMemo(() => {
    const hasPlanThisMonth = hasAnyPlanThisMonth(mealPlans);
    const nearMonthEnd = isNearMonthEnd();
    const hasNextMonthPlan = hasPlanForNextMonth(mealPlans);
    
    // Se estamos perto do fim do mês (5 dias ou menos)
    if (nearMonthEnd) {
      // Pode criar para o próximo mês se NÃO existe plano para ele
      return !hasNextMonthPlan;
    }
    
    // Fora do período de fim de mês, só pode criar se NÃO tem nenhum plano este mês
    return !hasPlanThisMonth;
  }, [mealPlans]);

  const getNewPlanDisabledReason = useMemo(() => {
    if (canCreateNewPlan) return null;
    const nearMonthEnd = isNearMonthEnd();
    const hasNextMonthPlan = hasPlanForNextMonth(mealPlans);
    if (nearMonthEnd && hasNextMonthPlan) {
      return "Você já tem um plano para o próximo mês";
    }
    return "Você já tem um plano este mês. Exclua-o para criar um novo.";
  }, [canCreateNewPlan, mealPlans]);

  const fetchMealPlans = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // OPTIMIZED: Single query with join, without heavy payload (ingredients/instructions)
      const { data: plansWithItemsData, error: plansError } = await supabase
        .from("meal_plans")
        .select(`
          id,
          name,
          start_date,
          end_date,
          is_active,
          status,
          completion_percentage,
          unlocks_at,
          source_plan_id,
          meal_plan_items (
            id,
            day_of_week,
            week_number,
            meal_type,
            recipe_name,
            recipe_calories,
            recipe_protein,
            recipe_carbs,
            recipe_fat,
            recipe_prep_time,
            recipe_ingredients,
            is_favorite,
            completed_at
          )
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (plansError) throw plansError;

      // Process plans with their items
      const plansWithItems: MealPlan[] = (plansWithItemsData || []).map((plan: any) => {
        const items = plan.meal_plan_items || [];
        
        // Sort items by day_of_week
        items.sort((a: any, b: any) => a.day_of_week - b.day_of_week);
        
        // Calculate completion percentage
        const totalItems = items.length;
        const completedItems = items.filter((i: any) => i.completed_at).length;
        const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        // Determine status based on end_date and completion
        let status = plan.status || 'active';
        if (isPastMonth(plan.end_date)) {
          status = completionPercentage === 100 ? 'completed' : 'expired';
        }

        return {
          id: plan.id,
          name: plan.name,
          start_date: plan.start_date,
          end_date: plan.end_date,
          is_active: plan.is_active,
          status,
          completion_percentage: completionPercentage,
          unlocks_at: plan.unlocks_at,
          source_plan_id: plan.source_plan_id,
          items: items.map((item: any) => ({
            ...item,
            // Usar ingredientes do banco se disponíveis, senão array vazio
            recipe_ingredients: (item.recipe_ingredients || []) as Ingredient[],
            recipe_instructions: (item.recipe_instructions || []) as string[]
          }))
        };
      });

      setMealPlans(plansWithItems);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      toast.error("Erro ao carregar planos alimentares");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("intolerances, dietary_preference, strategy_id, excluded_ingredients")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      setUserProfile(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  useEffect(() => {
    fetchMealPlans();
    fetchUserProfile();
  }, []);

  // Auto-select latest plan when autoSelectLatestPlan prop is true
  useEffect(() => {
    if (autoSelectLatestPlan && !hasAutoSelected && !isLoading && mealPlans.length > 0) {
      console.log("[MealPlanSection] Auto-selecting latest plan");
      const latestPlan = mealPlans[0]; // Already sorted by created_at desc
      setSelectedPlan(latestPlan);
      setView("calendar");
      setHasAutoSelected(true);
      onAutoSelectComplete?.();
    }
  }, [autoSelectLatestPlan, hasAutoSelected, isLoading, mealPlans, onAutoSelectComplete]);

  const handleDeletePlan = async (planId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("meal_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;

      setMealPlans(prev => prev.filter(p => p.id !== planId));
      toast.success("Plano excluído com sucesso");
      onPlanDeleted?.();
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      toast.error("Erro ao excluir plano");
    }
  };

  const handleToggleFavorite = async (mealId: string) => {
    try {
      const item = selectedPlan?.items.find(i => i.id === mealId);
      if (!item) return;

      const { error } = await (supabase as any)
        .from("meal_plan_items")
        .update({ is_favorite: !item.is_favorite })
        .eq("id", mealId);

      if (error) throw error;

      // Update local state
      if (selectedPlan) {
        const updatedItems = selectedPlan.items.map(i =>
          i.id === mealId ? { ...i, is_favorite: !i.is_favorite } : i
        );
        setSelectedPlan({ ...selectedPlan, items: updatedItems });
      }

      toast.success(item.is_favorite ? "Removido dos favoritos" : "Adicionado aos favoritos");
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Erro ao atualizar favorito");
    }
  };

  const handleViewPlan = (plan: MealPlan) => {
    setSelectedPlan(plan);
    setView("calendar");
  };

  const handleSelectMeal = (meal: MealPlanItem) => {
    // Usar MealDetailSheet (mesmo componente do Dashboard que funciona)
    setSelectedMeal(meal);
    setShowMealDetailSheet(true);
  };

  // Get status badge for a plan
  const getPlanStatusBadge = (plan: MealPlan) => {
    // Check if plan is locked (unlocks_at in the future)
    if (plan.unlocks_at) {
      const unlocksAt = new Date(plan.unlocks_at);
      const now = new Date();
      if (unlocksAt > now) {
        const daysUntilUnlock = Math.ceil((unlocksAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <span className="text-[10px] sm:text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
            <Lock className="w-3 h-3" />
            {daysUntilUnlock > 0 ? `Libera em ${daysUntilUnlock}d` : 'Liberando...'}
          </span>
        );
      }
    }
    if (plan.status === 'completed') {
      return (
        <span className="text-[10px] sm:text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Concluído
        </span>
      );
    }
    if (plan.status === 'expired') {
      return (
        <span className="text-[10px] sm:text-xs bg-muted text-muted-foreground px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
          {plan.completion_percentage}% concluído
        </span>
      );
    }
    if (plan.status === 'active' || plan.is_active) {
      return (
        <span className="text-[10px] sm:text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
          Ativo
        </span>
      );
    }
    return null;
  };

  // Check if a plan is locked
  const isPlanLocked = (plan: MealPlan) => {
    if (!plan.unlocks_at) return false;
    const unlocksAt = new Date(plan.unlocks_at);
    return unlocksAt > new Date();
  };

  // Check if a plan is from a past month (should be grayed out)
  const isPlanPast = (plan: MealPlan) => {
    return isPastMonth(plan.end_date);
  };

  // Check if user can duplicate to next month
  const canDuplicateToNextMonth = useMemo(() => {
    return !hasPlanForNextMonth(mealPlans);
  }, [mealPlans]);

  const handleModeSelect = (mode: MealPlanMode) => {
    if (mode === "ai") setView("create-ai");
    else if (mode === "custom") setView("create-custom");
  };

  // Função para iniciar criação de plano - pula seleção de modo se feature desabilitada
  const handleStartCreatePlan = () => {
    if (isManualPlanBuilderEnabled) {
      setView("select-mode"); // Mostra página com as duas opções
    } else {
      setView("create-ai"); // Pula direto para criação com IA
    }
  };

  if (view === "select-mode") {
    return (
      <MealPlanModeSelector
        onSelectMode={handleModeSelect}
        onClose={() => setView("list")}
      />
    );
  }

  if (view === "create-ai") {
    return (
      <MealPlanGenerator
        onClose={() => setView("list")}
        onPlanGenerated={async () => {
          console.log("[MealPlanSection] onPlanGenerated called - fetching plans and navigating to calendar");
          // Fetch plans and auto-select the newest one to navigate directly to calendar
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data: latestPlan } = await supabase
              .from("meal_plans")
              .select("id, name, start_date, end_date, is_active, status, completion_percentage, unlocks_at, source_plan_id")
              .eq("user_id", session.user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();
            
            if (latestPlan) {
              // Fetch plan items
              const { data: items } = await supabase
                .from("meal_plan_items")
                .select("*")
                .eq("meal_plan_id", latestPlan.id);
              
              const fullPlan: MealPlan = {
                ...latestPlan,
                items: (items || []).map(item => ({
                  ...item,
                  recipe_ingredients: item.recipe_ingredients as unknown as Ingredient[],
                  recipe_instructions: item.recipe_instructions as unknown as string[]
                })) as MealPlanItem[]
              };
              
              setSelectedPlan(fullPlan);
              setView("calendar");
              fetchMealPlans(); // Update the list in background
              return;
            }
          }
          // Fallback to list if something fails
          fetchMealPlans();
          setView("list");
        }}
      />
    );
  }


  if (view === "create-custom") {
    return (
      <CustomMealPlanBuilder
        onClose={() => setView("list")}
        onPlanGenerated={() => {
          fetchMealPlans();
          setView("list");
        }}
      />
    );
  }

  // Renderiza o calendário (usa MealDetailSheet como popup)
  const showCalendar = view === "calendar" && selectedPlan;
  
  if (showCalendar) {
    const handleMealUpdated = (updatedMeal: MealPlanItem) => {
      // Update the meal in the selected plan
      setSelectedPlan(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(item => 
            item.id === updatedMeal.id ? updatedMeal : item
          )
        };
      });
      // Also update in the main list
      setMealPlans(prev => prev.map(plan => {
        if (plan.id !== selectedPlan.id) return plan;
        return {
          ...plan,
          items: plan.items.map(item => 
            item.id === updatedMeal.id ? updatedMeal : item
          )
        };
      }));
    };

    return (
      <>
        <MealPlanCalendar
          mealPlan={selectedPlan}
          onClose={() => {
            setCalendarSelectedWeek(null);
            setCalendarSelectedDayIndex(null);
            setSelectedPlan(null);
            setView("list");
          }}
          onSelectMeal={handleSelectMeal}
          onToggleFavorite={handleToggleFavorite}
          onMealUpdated={handleMealUpdated}
          onEditPlan={() => {
            setEditingPlanId(selectedPlan.id);
            setView("edit");
          }}
          userProfile={userProfile}
          externalSelectedWeek={calendarSelectedWeek}
          externalSelectedDayIndex={calendarSelectedDayIndex}
          onSelectedWeekChange={setCalendarSelectedWeek}
          onSelectedDayIndexChange={setCalendarSelectedDayIndex}
        />
        
        {/* MealDetailSheet - mesmo componente do Dashboard que funciona */}
        {selectedMeal && (
          <MealDetailSheet
            meal={{
              id: selectedMeal.id,
              meal_plan_id: selectedPlan.id,
              day_of_week: selectedMeal.day_of_week,
              meal_type: selectedMeal.meal_type,
              recipe_name: selectedMeal.recipe_name,
              recipe_calories: selectedMeal.recipe_calories,
              recipe_protein: selectedMeal.recipe_protein,
              recipe_carbs: selectedMeal.recipe_carbs,
              recipe_fat: selectedMeal.recipe_fat,
              recipe_prep_time: selectedMeal.recipe_prep_time,
              is_favorite: selectedMeal.is_favorite,
              completed_at: selectedMeal.completed_at || null,
            }}
            open={showMealDetailSheet}
            onOpenChange={(open) => {
              setShowMealDetailSheet(open);
              if (!open) {
                setSelectedMeal(null);
                // Recarregar dados ao fechar para refletir substituições
                fetchMealPlans();
              }
            }}
            onRefetch={fetchMealPlans}
            isFutureMeal={true}
          />
        )}
      </>
    );
  }

  if (view === "shopping" && selectedPlan) {
    return (
      <ShoppingList
        mealPlan={selectedPlan}
        onBack={() => {
          setSelectedPlan(null);
          setView("list");
        }}
      />
    );
  }

  if (view === "edit" && editingPlanId) {
    return (
      <MealPlanEditor
        planId={editingPlanId}
        onClose={() => {
          setEditingPlanId(null);
          setView("list");
        }}
        onPlanUpdated={() => {
          fetchMealPlans();
        }}
        onPlanDeleted={() => {
          fetchMealPlans();
          setEditingPlanId(null);
          setView("list");
        }}
      />
    );
  }

  return (
    <div 
      {...swipeHandlers} 
      style={swipeStyle} 
      className={cn(
        "space-y-4 sm:space-y-6 animate-fade-in min-h-[calc(100vh-140px)]",
        isDragging && "select-none"
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {onBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack} 
              className="shrink-0 bg-primary hover:bg-[#D3D3D3] hover:text-foreground text-primary-foreground rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="w-12 h-12 sm:w-14 sm:h-14 gradient-primary rounded-2xl flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">Planos Alimentares</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Crie rotinas semanais ou mensais com IA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          {mealPlans.some(p => p.status === 'active') && (
            <Button 
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => {
                const activePlan = mealPlans.find(p => p.status === 'active');
                if (activePlan) {
                  setSelectedPlan(activePlan);
                  setView("shopping");
                }
              }}
            >
              <ShoppingCart className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Lista de Compras</span>
            </Button>
          )}
          <Button 
            className="gradient-primary border-0 text-xs sm:text-sm" 
            size="sm" 
            onClick={handleStartCreatePlan}
            disabled={!canCreateNewPlan}
            title={getNewPlanDisabledReason || undefined}
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo Plano</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Info message when near month end */}
      {isNearMonthEnd() && hasActivePlanThisMonth(mealPlans) && !hasPlanForNextMonth(mealPlans) && (
        <Card className="glass-card border-primary/30 bg-primary/5">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm text-foreground">
                Faltam poucos dias para o mês acabar. Você já pode criar seu plano para <strong>{getMonthName(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))}</strong>!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : mealPlans.length === 0 ? (
        <Card className="glass-card border-dashed border-2 border-muted-foreground/30">
          <CardContent className="p-6 sm:p-8 text-center">
            <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-base sm:text-lg mb-2">Nenhum plano criado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie seu primeiro plano alimentar e deixe a IA montar sua rotina semanal
            </p>
            <Button className="gradient-primary border-0" onClick={handleStartCreatePlan}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Plano
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {mealPlans.map((plan) => {
            const isPast = isPlanPast(plan);
            const isLocked = isPlanLocked(plan);
            
            return (
              <Card 
                key={plan.id} 
                className={cn(
                  "glass-card transition-all relative overflow-hidden",
                  isPast ? "opacity-60 border-muted" : "hover:border-primary/30",
                  isLocked && "border-amber-500/30"
                )}
              >
                {/* Locked overlay - click to view/edit - exclude action buttons area */}
                {isLocked && (
                  <div 
                    className="absolute inset-0 right-[140px] sm:right-[160px] bg-background/40 backdrop-blur-[1px] z-10 flex items-center justify-center cursor-pointer hover:bg-background/30 transition-colors"
                    onClick={() => handleViewPlan(plan)}
                  >
                    <div className="text-center p-4">
                      <Lock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                      <p className="text-xs font-medium text-foreground">Plano Agendado</p>
                      <p className="text-[10px] text-muted-foreground">
                        Disponível em {new Date(plan.start_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-[10px] text-primary mt-1">Toque para editar</p>
                    </div>
                  </div>
                )}
                
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0",
                        isPast ? "bg-muted" : isLocked ? "bg-amber-500/10" : "bg-primary/10"
                      )}>
                        {isLocked ? (
                          <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                        ) : (
                          <Calendar className={cn(
                            "w-5 h-5 sm:w-6 sm:h-6",
                            isPast ? "text-muted-foreground" : "text-primary"
                          )} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display font-semibold text-sm sm:text-base text-foreground flex items-center flex-wrap gap-2">
                          <span className="truncate">{plan.name}</span>
                          {getPlanStatusBadge(plan)}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {new Date(plan.start_date + 'T00:00:00').toLocaleDateString('pt-BR')} - {new Date(plan.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                          {plan.items.length} refeições planejadas
                          {plan.source_plan_id && " • Duplicado"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-auto">
                      {/* Duplicate button - only for active plans and if no next month plan exists */}
                      {!isPast && !isLocked && canDuplicateToNextMonth && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 sm:w-10 sm:h-10"
                          onClick={() => setDuplicatingPlan(plan)}
                          title="Duplicar para próximo mês"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() => handleViewPlan(plan)}
                      >
                        <Eye className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">{isLocked ? 'Editar' : 'Ver'}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 sm:w-10 sm:h-10"
                        onClick={() => {
                          setEditingPlanId(plan.id);
                          setView("edit");
                        }}
                        title="Configurar plano"
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive w-8 h-8 sm:w-10 sm:h-10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O plano "{plan.name}" e todas as suas refeições serão excluídos permanentemente.
                              {!isPast && " Após excluir, você poderá criar um novo plano para este mês."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePlan(plan.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Duplicate Plan Dialog */}
      {duplicatingPlan && (
        <DuplicatePlanDialog
          open={!!duplicatingPlan}
          onOpenChange={(open) => !open && setDuplicatingPlan(null)}
          plan={duplicatingPlan}
          onPlanDuplicated={() => {
            fetchMealPlans();
            setDuplicatingPlan(null);
          }}
        />
      )}
    </div>
  );
}