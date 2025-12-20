import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Loader2, Trash2, Eye, ArrowLeft, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MealPlanGenerator from "./MealPlanGenerator";
import MealPlanCalendar from "./MealPlanCalendar";
import MealRecipeDetail from "./MealRecipeDetail";
import ShoppingList from "./ShoppingList";
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
};

type MealPlan = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  items: MealPlanItem[];
};

type MealPlanSectionProps = {
  onBack?: () => void;
};

export default function MealPlanSection({ onBack }: MealPlanSectionProps) {
  const [view, setView] = useState<"list" | "create" | "calendar" | "recipe" | "shopping">("list");
  const [isLoading, setIsLoading] = useState(true);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealPlanItem | null>(null);

  const fetchMealPlans = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch meal plans - using any to handle new tables before types regenerate
      const { data: plans, error: plansError } = await (supabase as any)
        .from("meal_plans")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (plansError) throw plansError;

      // Fetch items for each plan
      const plansWithItems: MealPlan[] = await Promise.all(
        (plans || []).map(async (plan: any) => {
          const { data: items, error: itemsError } = await (supabase as any)
            .from("meal_plan_items")
            .select("*")
            .eq("meal_plan_id", plan.id)
            .order("day_of_week", { ascending: true });

          if (itemsError) throw itemsError;

          return {
            id: plan.id,
            name: plan.name,
            start_date: plan.start_date,
            end_date: plan.end_date,
            is_active: plan.is_active,
            items: (items || []).map((item: any) => ({
              ...item,
              recipe_ingredients: item.recipe_ingredients as Ingredient[],
              recipe_instructions: item.recipe_instructions as string[]
            }))
          };
        })
      );

      setMealPlans(plansWithItems);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      toast.error("Erro ao carregar planos alimentares");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMealPlans();
  }, []);

  const handleDeletePlan = async (planId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("meal_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;

      setMealPlans(prev => prev.filter(p => p.id !== planId));
      toast.success("Plano excluído com sucesso");
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
    setSelectedMeal(meal);
    setView("recipe");
  };

  if (view === "create") {
    return (
      <MealPlanGenerator
        onClose={() => setView("list")}
        onPlanGenerated={() => {
          fetchMealPlans();
          setView("list");
        }}
      />
    );
  }

  if (view === "calendar" && selectedPlan) {
    return (
      <MealPlanCalendar
        mealPlan={selectedPlan}
        onClose={() => {
          setSelectedPlan(null);
          setView("list");
        }}
        onSelectMeal={handleSelectMeal}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  }

  if (view === "recipe" && selectedMeal && selectedPlan) {
    return (
      <MealRecipeDetail
        meal={selectedMeal}
        onBack={() => setView("calendar")}
        onToggleFavorite={() => handleToggleFavorite(selectedMeal.id)}
      />
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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
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
          {mealPlans.some(p => p.is_active) && (
            <Button 
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => {
                const activePlan = mealPlans.find(p => p.is_active);
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
          <Button className="gradient-primary border-0 text-xs sm:text-sm" size="sm" onClick={() => setView("create")}>
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo Plano</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

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
            <Button className="gradient-primary border-0" onClick={() => setView("create")}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Plano
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {mealPlans.map((plan) => (
            <Card key={plan.id} className="glass-card hover:border-primary/30 transition-all">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-semibold text-sm sm:text-base text-foreground flex items-center flex-wrap gap-2">
                        <span className="truncate">{plan.name}</span>
                        {plan.is_active && (
                          <span className="text-[10px] sm:text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
                            Ativo
                          </span>
                        )}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(plan.start_date).toLocaleDateString('pt-BR')} - {new Date(plan.end_date).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                        {plan.items.length} refeições planejadas
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm"
                      onClick={() => handleViewPlan(plan)}
                    >
                      <Eye className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Ver Plano</span>
                      <span className="sm:hidden">Ver</span>
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
          ))}
        </div>
      )}
    </div>
  );
}
