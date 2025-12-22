import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, LogOut, Sparkles, Crown, Loader2, Star, Check, Calendar, Heart, History, UtensilsCrossed, Zap, Baby, TrendingDown, User, Download, Scale, ArrowLeft, X, Shield } from "lucide-react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import RecipeResult from "@/components/RecipeResult";
import RecipeList from "@/components/RecipeList";
import WeightGoalSetup, { calculateMacros } from "@/components/WeightGoalSetup";
import WeightProgressBar from "@/components/WeightProgressBar";
import CalorieSpeedometer from "@/components/CalorieSpeedometer";
import UserAccountMenu from "@/components/UserAccountMenu";
import MealPlanSection from "@/components/MealPlanSection";
import IngredientTagInput from "@/components/IngredientTagInput";
import MobileBottomNav, { type MobileNavTab } from "@/components/MobileBottomNav";
import RecipeCategorySheet from "@/components/RecipeCategorySheet";
import FoodPhotoAnalyzer from "@/components/FoodPhotoAnalyzer";
import PhotoModeSelector, { type PhotoMode } from "@/components/PhotoModeSelector";
import PendingMealsList from "@/components/PendingMealsList";

import WeightUpdateModal from "@/components/WeightUpdateModal";
import WeightHistoryChart from "@/components/WeightHistoryChart";
import { Beef, Wheat, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/hooks/useAdmin";
import { Link } from "react-router-dom";
import { useActivityLog } from "@/hooks/useActivityLog";
import { usePendingMeals, getMealStatus } from "@/hooks/usePendingMeals";
import { useGamification } from "@/hooks/useGamification";
import HealthProgressStrip from "@/components/HealthProgressStrip";
import PlanDetailsSheet from "@/components/PlanDetailsSheet";

type Recipe = {
  name: string;
  description: string;
  ingredients: { item: string; quantity: string; unit: string }[];
  instructions: string[];
  prep_time: number;
  complexity: "rapida" | "equilibrada" | "elaborada";
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  input_ingredients?: string | null;
  is_kids_mode?: boolean;
  is_weight_loss_mode?: boolean;
  satiety_score?: number;
  satiety_tip?: string;
};

const plans = {
  essencial: {
    name: "Essencial",
    price: "19,90",
    icon: Star,
    features: ["5 receitas por dia", "Calorias por receita", "Respeito às intolerâncias"],
  },
  premium: {
    name: "Premium",
    price: "29,90",
    icon: Crown,
    features: ["Receitas ilimitadas", "Rotina semanal automática", "Modo Kids", "Macros detalhados"],
  },
};

type SubscriptionInfo = {
  subscribed: boolean;
  plan: string | null;
  status: string | null;
  subscription_end: string | null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logUserAction } = useActivityLog();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [userContext, setUserContext] = useState<string | null>(null);
  const [userGoal, setUserGoal] = useState<string | null>(null);
  const [showWeightLossSetup, setShowWeightLossSetup] = useState(false);
  const [weightData, setWeightData] = useState<{
    weight_current: number | null;
    weight_goal: number | null;
    height: number | null;
    age: number | null;
    sex: "male" | "female" | null;
    activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
    goal_mode: "lose" | "gain" | "maintain" | null;
  } | null>(null);
  
  // Recipe generation state
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [showRecipe, setShowRecipe] = useState(false);
  const [showList, setShowList] = useState<"history" | "favorites" | null>(null);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [hasMealPlan, setHasMealPlan] = useState(false);
  const [showWeightUpdateModal, setShowWeightUpdateModal] = useState(false);
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileNavTab>("home");
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showFoodAnalyzer, setShowFoodAnalyzer] = useState(false);
  const [selectedPhotoMode, setSelectedPhotoMode] = useState<PhotoMode | null>(null);
  const [showPlanSheet, setShowPlanSheet] = useState(false);
  // User profile for ingredient validation
  const [userProfile, setUserProfile] = useState<{
    intolerances?: string[] | null;
    dietary_preference?: string | null;
  } | null>(null);
  
  
  // Admin check
  const { isAdmin } = useAdmin();
  
  // Pending meals hook for badge
  const { pendingMeals, hasMealPlan: hasActiveMealPlan } = usePendingMeals();
  const nextMealStatus = pendingMeals.length > 0 
    ? getMealStatus(pendingMeals[0].meal_type, pendingMeals[0].actual_date, pendingMeals[0].completed_at)
    : "on_time";
  
  // User gamification hook
  const gamification = useGamification();
  
  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const checkOnboarding = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed, context, goal, weight_current, weight_goal, height, age, sex, activity_level, intolerances, dietary_preference")
      .eq("id", userId)
      .maybeSingle();
    
    if (data && !data.onboarding_completed) {
      navigate("/onboarding");
    } else {
      setOnboardingCompleted(true);
      setUserContext(data?.context || "individual");
      setUserGoal(data?.goal || "manter");
      
      // Salvar dados do perfil para validação de ingredientes
      setUserProfile({
        intolerances: data?.intolerances,
        dietary_preference: data?.dietary_preference,
      });
      
      if (data?.weight_current) {
        const goalToMode = (goal: string): "lose" | "gain" | "maintain" | null => {
          if (goal === "emagrecer") return "lose";
          if (goal === "ganhar_peso") return "gain";
          if (goal === "manter") return "maintain";
          return null;
        };
        setWeightData({
          weight_current: data.weight_current,
          weight_goal: data.weight_goal,
          height: data.height,
          age: data.age,
          sex: data.sex as "male" | "female" | null,
          activity_level: (data.activity_level as any) || "moderate",
          goal_mode: goalToMode(data.goal || "manter"),
        });
      }
    }
  };

  const toggleKidsMode = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const newContext = userContext === "modo_kids" ? "individual" : "modo_kids";
    const { error } = await supabase
      .from("profiles")
      .update({ context: newContext })
      .eq("id", session.user.id);
    
    if (!error) {
      setUserContext(newContext);
      toast.success(newContext === "modo_kids" ? "🎉 Modo Kids ativado!" : "Modo Kids desativado");
      
      // Log user action
      await logUserAction(
        "kids_mode_toggle",
        newContext === "modo_kids" ? "Modo Kids ativado" : "Modo Kids desativado",
        { context: userContext },
        { context: newContext }
      );
    }
  };

  const toggleWeightLossMode = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    // Desativar o modo atual
    const { error } = await supabase
      .from("profiles")
      .update({ goal: "manter" })
      .eq("id", session.user.id);
    
    if (!error) {
      setUserGoal("manter");
      toast.success("Meta de peso desativada");
      
      // Log user action
      await logUserAction(
        "weight_goal_toggle",
        "Meta de peso desativada",
        { goal: userGoal },
        { goal: "manter" }
      );
    }
  };

  // Track the last used ingredients and category for "Gerar Outra"
  const [lastUsedIngredients, setLastUsedIngredients] = useState<string | null>(null);
  const [lastUsedCategoryContext, setLastUsedCategoryContext] = useState<{ 
    category: string; 
    subcategory: string;
    filters?: {
      culinaria?: string;
      tempo?: string;
      metodo?: string;
    };
  } | null>(null);

  const generateRecipe = async (
    type: "com_ingredientes" | "automatica", 
    useLastIngredients = false, 
    categoryContext?: { 
      category: string; 
      subcategory: string;
      filters?: {
        culinaria?: string;
        tempo?: string;
        metodo?: string;
      };
    }
  ) => {
    const ingredientsToUse = useLastIngredients ? lastUsedIngredients : ingredients.join(", ");
    
    if (type === "com_ingredientes" && (!ingredientsToUse || ingredientsToUse.trim() === "")) {
      toast.error("Adicione alguns ingredientes primeiro");
      return;
    }

    setIsGeneratingRecipe(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipe", {
        body: { 
          type,
          ingredients: type === "com_ingredientes" ? ingredientsToUse : null,
          categoryContext: categoryContext || null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Store the recipe with the input ingredients for "Gerar Outra"
      const recipeWithIngredients = {
        ...data.recipe,
        input_ingredients: type === "com_ingredientes" ? ingredientsToUse : null,
      };
      
      setGeneratedRecipe(recipeWithIngredients);
      setShowRecipe(true);
      
      // Log user action
      await logUserAction(
        "recipe_generated",
        `Receita gerada: "${data.recipe.name}"${categoryContext ? ` (${categoryContext.category}/${categoryContext.subcategory})` : type === "com_ingredientes" ? " (com ingredientes)" : " (automática)"}`,
        null,
        { 
          recipe_name: data.recipe.name, 
          type, 
          ingredients: ingredientsToUse,
          category: categoryContext?.category,
          subcategory: categoryContext?.subcategory 
        }
      );
      
      // Save ingredients and category for "Gerar Outra" and clear input
      if (type === "com_ingredientes") {
        setLastUsedIngredients(ingredientsToUse);
      }
      if (categoryContext) {
        setLastUsedCategoryContext(categoryContext);
      }
      setIngredients([]);
    } catch (error) {
      console.error("Error generating recipe:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar receita. Tente novamente.");
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  const handleCategorySelect = (category: string, subcategory: string, filters?: { culinaria?: string; tempo?: string; metodo?: string }) => {
    generateRecipe("automatica", false, { category, subcategory, filters });
  };

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) {
        console.error("Error checking subscription:", error);
        return;
      }

      setSubscription(data);
    } catch (err) {
      console.error("Failed to check subscription:", err);
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const checkMealPlans = async (userId: string) => {
    const { data } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    
    setHasMealPlan(data && data.length > 0);
  };

  // PWA install prompt detection
  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      toast.info("Use o menu do navegador para instalar o app");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      toast.success("App instalado com sucesso!");
      setIsAppInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        setIsLoading(false);
        // Check onboarding and subscription when user logs in
        setTimeout(() => {
          checkOnboarding(session.user.id);
          checkSubscription();
          checkMealPlans(session.user.id);
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        setIsLoading(false);
        // Check onboarding and subscription on initial load
        setTimeout(() => {
          checkOnboarding(session.user.id);
          checkSubscription();
          checkMealPlans(session.user.id);
        }, 0);
      }
    });

    return () => authSub.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Assinatura ativada com sucesso! Aproveite seu trial de 7 dias.");
      // Refresh subscription status after successful checkout
      checkSubscription();
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Checkout cancelado. Você pode tentar novamente quando quiser.");
    }
  }, [searchParams]);

  // Toast de alerta para refeição pendente ao abrir o app
  useEffect(() => {
    if (hasActiveMealPlan && (nextMealStatus === "delayed" || nextMealStatus === "critical")) {
      const message = nextMealStatus === "critical" 
        ? "⚠️ Você tem uma refeição pendente há mais de 1 hora!"
        : "🍽️ Você tem uma refeição pendente!";
      toast.warning(message, { duration: 5000 });
    }
  }, [hasActiveMealPlan, nextMealStatus]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  const handleStartSubscription = async (planKey: "essencial" | "premium") => {
    setIsCheckingSubscription(planKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Você precisa estar logado para assinar");
        navigate("/auth");
        return;
      }

      const response = await supabase.functions.invoke("create-checkout", {
        body: { 
          returnUrl: `${window.location.origin}/dashboard`,
          plan: planKey,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setIsCheckingSubscription(null);
    }
  };

  // Handle back to home for mobile
  const handleBackToHome = () => {
    setMobileActiveTab("home");
    setShowRecipe(false);
    setShowList(null);
    setShowMealPlan(false);
    setShowWeightLossSetup(false);
    setShowWeightHistory(false);
    setShowProfileSheet(false);
    setShowFoodAnalyzer(false);
    setSelectedPhotoMode(null);
  };

  // Check if we're in a sub-view that needs a back button
  const isInSubView = mobileActiveTab !== "home" || showMealPlan || showList || showProfileSheet || showFoodAnalyzer;

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSubscribed = subscription?.subscribed;
  const activePlan = subscription?.plan as "essencial" | "premium" | null;

  // Handle mobile tab navigation
  const handleMobileTabChange = (tab: MobileNavTab) => {
    setMobileActiveTab(tab);
    // Reset other views when changing tabs
    setShowRecipe(false);
    setShowList(null);
    setShowWeightLossSetup(false);
    setShowWeightHistory(false);
    setShowProfileSheet(false);
    setSelectedPhotoMode(null);
    setShowFoodAnalyzer(false);
    
    if (tab === "meal-plan") {
      setShowMealPlan(true);
    } else {
      setShowMealPlan(false);
    }
    
    if (tab === "favorites") {
      setShowList("favorites");
    }
    
    if (tab === "profile") {
      setShowProfileSheet(true);
    }
    
    if (tab === "scan") {
      setShowFoodAnalyzer(true);
    }
  };
  
  // Determine back button type: X for modal-like views, arrow for section views
  const getBackButtonType = (): "x" | "arrow" | null => {
    if (mobileActiveTab === "profile" || mobileActiveTab === "favorites" || showProfileSheet || showList) {
      return "x";
    }
    if (mobileActiveTab === "meal-plan" || showMealPlan || mobileActiveTab === "scan" || showFoodAnalyzer) {
      return "arrow";
    }
    return null;
  };

  return (
    <div className="min-h-screen gradient-hero pb-20 md:pb-0">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="space-y-8">
          {isLoadingSubscription ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : isSubscribed ? (
            showWeightLossSetup ? (
              <WeightGoalSetup
                onClose={() => setShowWeightLossSetup(false)}
                onSave={(data) => {
                  setWeightData({
                    weight_current: data.weight_current,
                    weight_goal: data.weight_goal,
                    height: data.height,
                    age: data.age,
                    sex: data.sex,
                    activity_level: data.activity_level,
                    goal_mode: data.calculations.mode,
                  });
                  // Goal is set based on user selection
                  if (data.calculations.mode === "lose") {
                    setUserGoal("emagrecer");
                  } else if (data.calculations.mode === "gain") {
                    setUserGoal("ganhar_peso");
                  } else {
                    setUserGoal("manter");
                  }
                  setShowWeightLossSetup(false);
                }}
                onGeneratePlan={(data) => {
                  setWeightData({
                    weight_current: data.weight_current,
                    weight_goal: data.weight_goal,
                    height: data.height,
                    age: data.age,
                    sex: data.sex,
                    activity_level: data.activity_level,
                    goal_mode: data.calculations.mode,
                  });
                  // Goal is set based on user selection
                  if (data.calculations.mode === "lose") {
                    setUserGoal("emagrecer");
                  } else if (data.calculations.mode === "gain") {
                    setUserGoal("ganhar_peso");
                  } else {
                    setUserGoal("manter");
                  }
                  setShowWeightLossSetup(false);
                  // Update hasMealPlan and navigate to meal plan section
                  setHasMealPlan(true);
                  setShowMealPlan(true);
                }}
                initialData={weightData || undefined}
              />
            ) : showRecipe && generatedRecipe ? (
              <RecipeResult
                recipe={generatedRecipe}
                onBack={() => setShowRecipe(false)}
                onGenerateAnother={() => generateRecipe(
                  generatedRecipe.input_ingredients ? "com_ingredientes" : "automatica",
                  true, // Use last ingredients when generating another
                  lastUsedCategoryContext || undefined // Preserve the category context
                )}
                isGenerating={isGeneratingRecipe}
              />
            ) : showList ? (
              <RecipeList
                type={showList}
                onBack={() => setShowList(null)}
                onSelectRecipe={(recipe) => {
                  setGeneratedRecipe(recipe);
                  setShowRecipe(true);
                  setShowList(null);
                }}
              />
            ) : showMealPlan ? (
              <MealPlanSection onBack={() => setShowMealPlan(false)} />
            ) : showFoodAnalyzer ? (
              selectedPhotoMode ? (
                <FoodPhotoAnalyzer 
                  initialMode={selectedPhotoMode} 
                  hideModeTabs={true} 
                />
              ) : (
                <PhotoModeSelector 
                  onSelectMode={(mode) => setSelectedPhotoMode(mode)}
                />
              )
            ) : showWeightHistory && weightData?.weight_goal ? (
              <WeightHistoryChart 
                onBack={() => setShowWeightHistory(false)}
                goalWeight={weightData.weight_goal}
                goalMode={weightData.goal_mode}
                currentWeight={weightData.weight_current || 0}
              />
            ) : (
            <>
              {/* Home Principal */}
              <div className="space-y-4">
                {/* Premium Header - Clicável para abrir detalhes do plano */}
                <button 
                  onClick={() => isSubscribed && setShowPlanSheet(true)}
                  className="flex items-center justify-between w-full px-1 py-1 -mx-1 rounded-lg hover:bg-muted/30 transition-colors"
                  disabled={!isSubscribed}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-foreground">
                      Olá{user?.user_metadata?.first_name ? `, ${user.user_metadata.first_name}` : ""}
                    </span>
                    {isSubscribed && (
                      <Crown className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  {isSubscribed && (
                    <span className="text-xs text-muted-foreground">
                      {subscription?.status === "trialing" ? "Trial" : plans[activePlan!]?.name}
                    </span>
                  )}
                </button>

                {/* Plan Details Sheet */}
                {isSubscribed && activePlan && (
                  <PlanDetailsSheet
                    open={showPlanSheet}
                    onOpenChange={setShowPlanSheet}
                    planName={plans[activePlan]?.name || ""}
                    planPrice={plans[activePlan]?.price || ""}
                    features={plans[activePlan]?.features || []}
                    isTrialing={subscription?.status === "trialing"}
                    trialEndDate={subscription?.subscription_end || null}
                    isActive={isSubscribed}
                  />
                )}

                {/* Gamification Strip - XP + Streak */}
                <HealthProgressStrip
                  level={gamification.level}
                  totalXp={gamification.totalXp}
                  xpInLevel={gamification.xpInLevel}
                  xpForNextLevel={gamification.xpForNextLevel}
                  levelProgress={gamification.levelProgress}
                  currentStreak={gamification.currentStreak}
                  longestStreak={gamification.longestStreak}
                  weeklyAdherence={gamification.weeklyAdherence}
                  mealsCompletedThisWeek={gamification.mealsCompletedThisWeek}
                  mealsPlannedThisWeek={gamification.mealsPlannedThisWeek}
                  totalMealsCompleted={gamification.totalMealsCompleted}
                  unlockedAchievements={gamification.unlockedAchievements}
                  newAchievements={gamification.newAchievements}
                  isLoading={gamification.isLoading}
                />

                {/* Opção Principal: Gerar Receita com Ingredientes */}
                <Card className="glass-card border-2 border-primary/30 shadow-glow overflow-visible relative z-20">
                  <CardContent className="p-6 space-y-4 overflow-visible">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shrink-0">
                        <UtensilsCrossed className="w-7 h-7 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display text-lg font-bold text-foreground">
                          Gerar Receita
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Com ingredientes ou automática
                        </p>
                      </div>
                    </div>
                    
                    {/* Botão Surpreenda-me - Abre o Sheet */}
                    <Button
                      variant="outline"
                      className="w-full gradient-accent border-0 text-accent-foreground hover:opacity-90"
                      onClick={() => setShowCategorySheet(true)}
                      disabled={isGeneratingRecipe}
                    >
                      {isGeneratingRecipe ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <Zap className="w-5 h-5 mr-2" />
                      )}
                      Surpreenda-me!
                    </Button>
                    
                    {/* Sheet de Categorias */}
                    <RecipeCategorySheet
                      open={showCategorySheet}
                      onOpenChange={setShowCategorySheet}
                      onSelectCategory={handleCategorySelect}
                      isLoading={isGeneratingRecipe}
                    />
                    
                    {/* Divisor */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">ou digite ingredientes</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    
                    {/* Input de ingredientes com tags */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <IngredientTagInput
                          value={ingredients}
                          onChange={setIngredients}
                          placeholder="Digite um ingrediente..."
                          disabled={isGeneratingRecipe}
                          onSubmit={() => generateRecipe("com_ingredientes")}
                          userProfile={userProfile}
                        />
                      </div>
                      <Button 
                        className="gradient-primary border-0 h-12 w-full sm:w-auto sm:px-6 shrink-0"
                        onClick={() => generateRecipe("com_ingredientes")}
                        disabled={isGeneratingRecipe || ingredients.length === 0}
                      >
                        {isGeneratingRecipe ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5 mr-2 sm:mr-0" />
                            <span className="sm:hidden">Gerar Receita</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>


                {/* Meta de Peso Banner - Design discreto e informativo */}
                {(userGoal === "emagrecer" || userGoal === "ganhar_peso" || userGoal === "manter") && weightData?.weight_current && (
                  <Card className="bg-[hsl(var(--surface-subtle))] border border-border/30 overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center">
                            {userGoal === "ganhar_peso" 
                              ? <TrendingUp className="w-4 h-4 text-muted-foreground" />
                              : userGoal === "manter"
                                ? <Scale className="w-4 h-4 text-muted-foreground" />
                                : <TrendingDown className="w-4 h-4 text-muted-foreground" />
                            }
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">
                              {userGoal === "ganhar_peso" 
                                ? "Ganho de Peso" 
                                : userGoal === "manter"
                                  ? "Manutenção"
                                  : "Emagrecimento"}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {userGoal === "manter"
                                ? `Mantendo ${weightData.weight_current}kg`
                                : `${weightData.weight_current}kg → ${weightData.weight_goal}kg`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Button 
                            variant="ghost"
                            size="sm" 
                            onClick={() => setShowWeightUpdateModal(true)}
                            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                          >
                            <Scale className="w-3 h-3 mr-1" />
                            Peso
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowWeightLossSetup(true)}
                            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                          >
                            Editar
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={toggleWeightLossMode}
                            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                      {weightData?.weight_current ? (
                        <>
                          {/* Personalized Data */}
                          {(() => {
                            const calcs = calculateMacros(weightData);
                            if (!calcs) return null;
                            return (
                              <>
                                {/* Calorie Speedometer */}
                                <div className="mt-3">
                                  <CalorieSpeedometer
                                    targetCalories={calcs.targetCalories}
                                    protein={calcs.protein}
                                    carbs={calcs.carbs}
                                    fat={calcs.fat}
                                    mode={calcs.mode}
                                  />
                                </div>
                                
                                {/* Weight Progress Bar */}
                                <div className="mt-4">
                                  <WeightProgressBar
                                    currentWeight={weightData?.weight_current || 0}
                                    goalWeight={weightData?.weight_goal || 0}
                                    weeklyChange={calcs.weeklyChange}
                                    weeksToGoal={calcs.weeksToGoal}
                                    mode={calcs.mode}
                                  />
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setShowWeightHistory(true)}
                                  className="w-full mt-3 text-muted-foreground hover:text-foreground"
                                >
                                  📈 Ver Evolução
                                </Button>
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <div className="bg-muted/40 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-foreground">{userGoal === "ganhar_peso" ? "~0.3kg" : "~0.5kg"}</p>
                              <p className="text-xs text-muted-foreground">por semana*</p>
                            </div>
                            <div className="bg-muted/40 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-foreground">{userGoal === "ganhar_peso" ? "~1.2kg" : "~2kg"}</p>
                              <p className="text-xs text-muted-foreground">por mês*</p>
                            </div>
                            <div className="bg-muted/40 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-foreground">{userGoal === "ganhar_peso" ? "600-800" : "300-450"}</p>
                              <p className="text-xs text-muted-foreground">kcal/porção</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowWeightLossSetup(true)}
                            className="w-full mt-3 text-muted-foreground hover:text-foreground"
                          >
                            Configure seu peso para metas personalizadas
                          </Button>
                        </>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        *Estimativa baseada em {
                          userGoal === "ganhar_peso" 
                            ? "superávit calórico saudável" 
                            : userGoal === "manter"
                              ? "balanço calórico equilibrado"
                              : "déficit calórico saudável"
                        }. Resultados variam individualmente.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Lista de Refeições Pendentes */}
                <PendingMealsList onStreakRefresh={gamification.refresh} />

                {/* Grid de Opções */}
                <div className="grid grid-cols-2 gap-4">

                  {/* Meta de Peso Toggle - só aparece quando não há meta ativa ou não tem dados configurados */}
                  {(userGoal !== "emagrecer" && userGoal !== "ganhar_peso" && userGoal !== "manter") || !weightData?.weight_current ? (
                    !weightData?.weight_current && (
                      <Card 
                        className="glass-card border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
                        onClick={() => setShowWeightLossSetup(true)}
                      >
                        <CardContent className="p-5 text-center space-y-3">
                          <div className="w-12 h-12 mx-auto bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <TrendingDown className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-foreground">
                              Meta de Peso
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              Emagrecer ou ganhar
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  ) : null}

                  {/* Plano Semanal - Só aparece se tem plano criado - Escondido no mobile */}
                  {hasMealPlan && (
                    <Card 
                      className="glass-card border-border/50 hover:border-primary/30 transition-all cursor-pointer group hidden md:block"
                      onClick={() => setShowMealPlan(true)}
                    >
                      <CardContent className="p-5 text-center space-y-3">
                        <div className="w-12 h-12 mx-auto bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Calendar className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-foreground">
                            Plano Semanal
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Sua rotina alimentar
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Favoritas - Escondido no mobile */}
                  <Card 
                    className="glass-card border-border/50 hover:border-primary/30 transition-all cursor-pointer group hidden md:block"
                    onClick={() => setShowList("favorites")}
                  >
                    <CardContent className="p-5 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto bg-rose-500/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Heart className="w-6 h-6 text-rose-500" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground">
                          Favoritas
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Suas receitas salvas
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Histórico e Modo Kids - Versão compacta no mobile */}
                  <div className="md:hidden grid grid-cols-2 gap-2 col-span-2">
                    <button 
                      className="flex items-center gap-3 p-3 glass-card border-border/50 hover:border-primary/30 transition-all rounded-xl"
                      onClick={() => setShowList("history")}
                    >
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                        <History className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="text-left min-w-0">
                        <h3 className="font-display font-semibold text-foreground text-sm truncate">
                          Histórico
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          Receitas anteriores
                        </p>
                      </div>
                    </button>

                    {/* Modo Kids - Mobile */}
                    {isSubscribed && activePlan === "premium" ? (
                      <button 
                        className={cn(
                          "flex items-center gap-3 p-3 glass-card transition-all rounded-xl",
                          userContext === "modo_kids" 
                            ? "border-pink-500/50 bg-pink-500/10" 
                            : "border-border/50 hover:border-primary/30"
                        )}
                        onClick={toggleKidsMode}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          userContext === "modo_kids" ? "bg-pink-500/20" : "bg-pink-500/10"
                        )}>
                          <Baby className={cn(
                            "w-5 h-5",
                            userContext === "modo_kids" ? "text-pink-500" : "text-pink-400"
                          )} />
                        </div>
                        <div className="text-left min-w-0">
                          <h3 className={cn(
                            "font-display font-semibold text-sm truncate",
                            userContext === "modo_kids" ? "text-pink-600 dark:text-pink-400" : "text-foreground"
                          )}>
                            Modo Kids
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {userContext === "modo_kids" ? "Ativado" : "Desativado"}
                          </p>
                        </div>
                      </button>
                    ) : (
                      <div className="glass-card border-border/30 rounded-xl p-3 flex items-center justify-center opacity-50">
                        <p className="text-xs text-muted-foreground text-center">Premium</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Histórico - Card desktop */}
                  <Card 
                    className="glass-card border-border/50 hover:border-primary/30 transition-all cursor-pointer group hidden md:block"
                    onClick={() => setShowList("history")}
                  >
                    <CardContent className="p-5 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                        <History className="w-6 h-6 text-purple-500" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground">
                          Histórico
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Receitas anteriores
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Modo Kids - Card desktop */}
                  {isSubscribed && activePlan === "premium" && (
                    <Card 
                      className={cn(
                        "glass-card transition-all cursor-pointer group hidden md:block",
                        userContext === "modo_kids" 
                          ? "border-pink-500/50 bg-pink-500/5" 
                          : "border-border/50 hover:border-primary/30"
                      )}
                      onClick={toggleKidsMode}
                    >
                      <CardContent className="p-5 text-center space-y-3">
                        <div className={cn(
                          "w-12 h-12 mx-auto rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform",
                          userContext === "modo_kids" ? "bg-pink-500/20" : "bg-pink-500/10"
                        )}>
                          <Baby className={cn(
                            "w-6 h-6",
                            userContext === "modo_kids" ? "text-pink-500" : "text-pink-400"
                          )} />
                        </div>
                        <div>
                          <h3 className={cn(
                            "font-display font-bold",
                            userContext === "modo_kids" ? "text-pink-600 dark:text-pink-400" : "text-foreground"
                          )}>
                            Modo Kids
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {userContext === "modo_kids" ? "✓ Ativado" : "Toque para ativar"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                </div>

              </div>
            </>
            )
          ) : (
            <>
              {/* Plans */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Plano Essencial */}
                <Card className="glass-card border-2 border-border/50">
                  <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4">
                      <Star className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="font-display text-2xl">
                      Plano {plans.essencial.name}
                    </CardTitle>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="font-display text-3xl font-bold">R${plans.essencial.price}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <CardDescription className="text-sm italic">
                      "Para quem quer decidir o que cozinhar"
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plans.essencial.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="w-full"
                      onClick={() => handleStartSubscription("essencial")}
                      disabled={isCheckingSubscription !== null}
                    >
                      {isCheckingSubscription === "essencial" ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        "Começar 7 dias grátis"
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Plano Premium */}
                <Card className="glass-card border-2 border-primary/30 shadow-glow relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
                  <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 gradient-accent rounded-2xl flex items-center justify-center mb-4">
                      <Crown className="w-8 h-8 text-accent-foreground" />
                    </div>
                    <CardTitle className="font-display text-2xl">
                      Plano {plans.premium.name}
                    </CardTitle>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="font-display text-3xl font-bold">R${plans.premium.price}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <CardDescription className="text-sm italic">
                      "Para quem quer resultado e organização"
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plans.premium.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-accent" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      size="lg" 
                      className="w-full gradient-primary border-0 shadow-glow"
                      onClick={() => handleStartSubscription("premium")}
                      disabled={isCheckingSubscription !== null}
                    >
                      {isCheckingSubscription === "premium" ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Começar 7 dias grátis
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Cancele quando quiser • Sem compromisso • Cartão necessário apenas para ativar o trial
              </p>

              {/* Feature Preview */}
              <div className="grid md:grid-cols-2 gap-6 pt-4">
                <Card className="glass-card border-border/50 opacity-60">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-muted rounded-2xl flex items-center justify-center">
                      <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground">
                        Gerar Receitas
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Receitas personalizadas com IA
                      </p>
                    </div>
                    <Button variant="secondary" disabled className="w-full">
                      Ative um plano para acessar
                    </Button>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border/50 opacity-60">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-muted rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground">
                        Plano Semanal
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Organize sua semana alimentar
                      </p>
                    </div>
                    <Button variant="secondary" disabled className="w-full">
                      Ative um plano para acessar
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Weight Update Modal */}
      {weightData?.weight_current && weightData?.weight_goal && (
        <WeightUpdateModal
          open={showWeightUpdateModal}
          onOpenChange={setShowWeightUpdateModal}
          currentWeight={weightData.weight_current}
          goalWeight={weightData.weight_goal}
          goalMode={weightData.goal_mode}
          onWeightUpdated={(newWeight) => {
            setWeightData(prev => prev ? { ...prev, weight_current: newWeight } : null);
          }}
        />
      )}

      {/* Mobile Bottom Navigation */}
      {isSubscribed && (
        <MobileBottomNav
          activeTab={mobileActiveTab}
          onTabChange={handleMobileTabChange}
          hasMealPlan={hasMealPlan}
          hasPendingMeal={hasActiveMealPlan && (nextMealStatus === "delayed" || nextMealStatus === "critical")}
        />
      )}
    </div>
  );
}
