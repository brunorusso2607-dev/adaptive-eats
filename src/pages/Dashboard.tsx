import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, LogOut, Sparkles, Crown, Loader2, Star, Check, Calendar, Heart, History, UtensilsCrossed, Zap, Baby, TrendingDown, User, Download, Scale, ArrowLeft, X, Shield, Settings } from "lucide-react";
import { DesktopProfileDropdown } from "@/components/DesktopProfileDropdown";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import RecipeResult from "@/components/RecipeResult";
import RecipeList from "@/components/RecipeList";
import WeightGoalSetup, { calculateMacros } from "@/components/WeightGoalSetup";
import WeightProgressBar from "@/components/WeightProgressBar";
import CalorieSpeedometer from "@/components/CalorieSpeedometer";
import { useDailyConsumption } from "@/hooks/useDailyConsumption";
import UserAccountMenu from "@/components/UserAccountMenu";
import ProfilePage from "@/components/ProfilePage";
import MealPlanSection from "@/components/MealPlanSection";
import RecipeLoadingScreen from "@/components/RecipeLoadingScreen";

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
import { WaterTracker } from "@/components/WaterTracker";
import { WaterWidgetCompact } from "@/components/WaterWidgetCompact";
import { SafetyStatusBadge } from "@/components/SafetyStatusBadge";
import { SymptomTrackerCard } from "@/components/SymptomTrackerCard";
import { SafetyScoreCard } from "@/components/SafetyScoreCard";

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
  const [kidsMode, setKidsMode] = useState(false);
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
  const [isRegeneratingPlan, setIsRegeneratingPlan] = useState(false);
  const [mealPlanKey, setMealPlanKey] = useState(0); // Key to force MealPlanSection remount
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
    excluded_ingredients?: string[] | null;
    dietary_preference?: string | null;
  } | null>(null);
  
  
  // Admin check
  const { isAdmin } = useAdmin();
  
  // Pending meals hook for badge
  const { pendingMeals, hasMealPlan: hasActiveMealPlan, refetch: refetchPendingMeals } = usePendingMeals();
  const nextMealStatus = pendingMeals.length > 0 
    ? getMealStatus(pendingMeals[0].meal_type, pendingMeals[0].actual_date, pendingMeals[0].completed_at)
    : "on_time";
  
  // User gamification hook
  const gamification = useGamification();
  
  // Daily consumption hook
  const { consumption: dailyConsumption, refetch: refetchDailyConsumption } = useDailyConsumption();
  
  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const checkOnboarding = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed, goal, weight_current, weight_goal, height, age, sex, activity_level, intolerances, excluded_ingredients, dietary_preference, kids_mode")
      .eq("id", userId)
      .maybeSingle();
    
    if (data && !data.onboarding_completed) {
      navigate("/onboarding");
    } else {
      setOnboardingCompleted(true);
      setUserContext("individual"); // App is individual by default
      setKidsMode(data?.kids_mode || false);
      setUserGoal(data?.goal || "manter");
      
      // Salvar dados do perfil para validação de ingredientes
      setUserProfile({
        intolerances: data?.intolerances,
        excluded_ingredients: data?.excluded_ingredients,
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

  const toggleKidsMode = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const newKidsMode = !kidsMode;
    const { error } = await supabase
      .from("profiles")
      .update({ kids_mode: newKidsMode })
      .eq("id", session.user.id);
    
    if (!error) {
      setKidsMode(newKidsMode);
      toast.success(newKidsMode ? "Modo Kids ativado" : "Modo Kids desativado");
      
      await logUserAction(
        "kids_mode_toggle",
        newKidsMode ? "Modo Kids ativado" : "Modo Kids desativado",
        { kids_mode: kidsMode },
        { kids_mode: newKidsMode }
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

  // Generate recipe with ingredients passed directly (avoids state sync issues)
  const generateRecipeWithIngredients = async (ingredientsList: string[]) => {
    if (ingredientsList.length === 0) {
      toast.error("Adicione alguns ingredientes primeiro");
      return;
    }

    const ingredientsToUse = ingredientsList.join(", ");
    
    setIsGeneratingRecipe(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipe", {
        body: { 
          type: "com_ingredientes",
          ingredients: ingredientsToUse,
          categoryContext: null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const recipeWithIngredients = {
        ...data.recipe,
        input_ingredients: ingredientsToUse,
      };
      
      setGeneratedRecipe(recipeWithIngredients);
      setShowRecipe(true);
      
      await logUserAction(
        "recipe_generated",
        `Receita gerada: "${data.recipe.name}" (com ingredientes)`,
        null,
        { recipe_name: data.recipe.name, type: "com_ingredientes", ingredients: ingredientsToUse }
      );
      
      setLastUsedIngredients(ingredientsToUse);
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
        ? "Você tem uma refeição pendente há mais de 1 hora!"
        : "Você tem uma refeição pendente!";
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
      {/* Recipe Loading Screen - Fullscreen overlay */}
      {isGeneratingRecipe && <RecipeLoadingScreen />}
      
      {/* Plan Regeneration Loading Screen - Fullscreen overlay */}
      {isRegeneratingPlan && <RecipeLoadingScreen message="Gerando seu novo plano alimentar..." />}
      
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
                  setMealPlanKey(prev => prev + 1); // Força remontagem do MealPlanSection
                  setShowMealPlan(true);
                }}
                initialData={weightData || undefined}
                hasExistingPlan={hasMealPlan || hasActiveMealPlan}
                onPlanRegenerated={() => {
                  // Força refresh dos dados do Dashboard após regeneração
                  refetchPendingMeals();
                  // Incrementa key para forçar remontagem do MealPlanSection
                  setMealPlanKey(prev => prev + 1);
                }}
                onRegenerateStart={() => setIsRegeneratingPlan(true)}
                onRegenerateEnd={() => setIsRegeneratingPlan(false)}
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
              <MealPlanSection key={mealPlanKey} onBack={() => setShowMealPlan(false)} />
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
            ) : showProfileSheet ? (
              <ProfilePage
                user={user}
                subscription={subscription}
                onLogout={handleLogout}
                onBack={() => setShowProfileSheet(false)}
              />
            ) : (
            <>
              {/* Home Principal */}
              <div className="space-y-4">
                {/* Premium Header - Clean, minimal */}
                <div className="flex items-center justify-between w-full py-1">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => isSubscribed && setShowPlanSheet(true)}
                      className="flex items-center gap-2 rounded-lg hover:bg-accent/50 transition-colors px-2 py-1 -ml-2"
                      disabled={!isSubscribed}
                    >
                      <span className="text-sm font-normal text-muted-foreground tracking-wide">
                        Olá{user?.user_metadata?.first_name ? `, ${user.user_metadata.first_name}` : ""}
                      </span>
                      {isSubscribed && (
                        <span className="badge-pro">
                          <Crown className="w-3 h-3" />
                          PRO
                        </span>
                      )}
                    </button>
                    <WaterWidgetCompact />
                  </div>
                  
                  {/* Desktop Profile Dropdown */}
                  <DesktopProfileDropdown
                    user={user}
                    isSubscribed={isSubscribed}
                    subscriptionStatus={subscription?.status}
                    onOpenProfile={() => setShowProfileSheet(true)}
                    onLogout={handleLogout}
                  />
                </div>

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
                  mealXp={gamification.mealXp}
                  waterXp={gamification.waterXp}
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
                  waterAchievements={gamification.waterAchievements}
                  newAchievements={gamification.newAchievements}
                  isLoading={gamification.isLoading}
                />

                {/* Safety Status Badge - Proteção de Intolerâncias */}
                <SafetyStatusBadge
                  intolerances={userProfile?.intolerances || []}
                  excludedIngredients={userProfile?.excluded_ingredients || []}
                  dietaryPreference={userProfile?.dietary_preference || "comum"}
                  isLoading={!userProfile}
                />

                {/* Main Recipe Card - Clean white card */}
                <Card className="bg-card border border-border shadow-sm overflow-visible">
                  <CardContent className="p-5 space-y-4 overflow-visible">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <UtensilsCrossed className="w-5 h-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-foreground tracking-wide">
                          Gerar Receita
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Com ingredientes ou automática
                        </p>
                      </div>
                    </div>
                    
                    {/* CTA Button - Primary orange, only saturated element */}
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                      onClick={() => setShowCategorySheet(true)}
                      disabled={isGeneratingRecipe}
                    >
                      {isGeneratingRecipe ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      )}
                      Surpreenda-me!
                    </Button>
                    
                    {/* Category Sheet */}
                    <RecipeCategorySheet
                      open={showCategorySheet}
                      onOpenChange={setShowCategorySheet}
                      onSelectCategory={handleCategorySelect}
                      onGenerateWithIngredients={(ingredientsList) => {
                        generateRecipeWithIngredients(ingredientsList);
                      }}
                      isLoading={isGeneratingRecipe}
                      userProfile={userProfile}
                    />
                  </CardContent>
                </Card>


                {/* Meta de Peso Banner - Design discreto e informativo */}
                {(userGoal === "emagrecer" || userGoal === "ganhar_peso" || userGoal === "manter") && weightData?.weight_current && (
                  <Card className="bg-card border border-border overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                            {userGoal === "ganhar_peso" 
                              ? <TrendingUp className="w-4 h-4 text-muted-foreground" />
                              : userGoal === "manter"
                                ? <Scale className="w-4 h-4 text-muted-foreground" />
                                : <TrendingDown className="w-4 h-4 text-muted-foreground" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
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
                          <button 
                            onClick={() => setShowWeightLossSetup(true)}
                            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors py-1 shrink-0"
                          >
                            <Settings className="w-4 h-4 text-primary stroke-[1.5]" />
                            Editar
                          </button>
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
                                    consumedCalories={Math.round(dailyConsumption.totalCalories)}
                                    protein={calcs.protein}
                                    consumedProtein={Math.round(dailyConsumption.totalProtein)}
                                    carbs={calcs.carbs}
                                    consumedCarbs={Math.round(dailyConsumption.totalCarbs)}
                                    fat={calcs.fat}
                                    consumedFat={Math.round(dailyConsumption.totalFat)}
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
                                <div className="flex items-center justify-center gap-4 mt-3">
                                  <button 
                                    onClick={() => setShowWeightUpdateModal(true)}
                                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                                  >
                                    <Scale className="w-4 h-4 text-primary stroke-[1.5]" />
                                    Atualizar Peso
                                  </button>
                                  <span className="text-muted-foreground/40">|</span>
                                  <button 
                                    onClick={() => setShowWeightHistory(true)}
                                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                                  >
                                    <TrendingUp className="w-4 h-4 text-primary stroke-[1.5]" />
                                    Ver Evolução
                                  </button>
                                </div>
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
                      <div className="border-t border-border/40 mt-4 pt-3">
                        <p className="text-xs text-muted-foreground text-center">
                          *Estimativa baseada em {
                            userGoal === "ganhar_peso" 
                              ? "superávit calórico saudável" 
                              : userGoal === "manter"
                                ? "balanço calórico equilibrado"
                                : "déficit calórico saudável"
                          }. Resultados variam individualmente.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lista de Refeições Pendentes */}
                <PendingMealsList onStreakRefresh={gamification.refresh} userProfile={userProfile} />

                {/* Controle de Água */}
                <WaterTracker />

                {/* Rastreador de Sintomas */}
                <SymptomTrackerCard />

                {/* Score de Segurança Alimentar */}
                <SafetyScoreCard />

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

                    {/* Modo Kids - Mobile Toggle */}
                    {isSubscribed && activePlan === "premium" && (
                      <button 
                        className={cn(
                          "flex items-center gap-3 p-3 glass-card transition-all rounded-xl",
                          kidsMode 
                            ? "border-pink-500/50 bg-pink-500/5" 
                            : "border-border/50 hover:border-primary/30"
                        )}
                        onClick={toggleKidsMode}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          kidsMode ? "bg-pink-500/20" : "bg-muted"
                        )}>
                          <Baby className={cn(
                            "w-5 h-5",
                            kidsMode ? "text-pink-500" : "text-muted-foreground"
                          )} />
                        </div>
                        <div className="text-left min-w-0">
                          <h3 className={cn(
                            "font-display font-semibold text-sm truncate",
                            kidsMode ? "text-pink-600 dark:text-pink-400" : "text-foreground"
                          )}>
                            Modo Kids
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {kidsMode ? "✓ Ativado" : "Receitas infantis"}
                          </p>
                        </div>
                      </button>
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
                        kidsMode 
                          ? "border-pink-500/50 bg-pink-500/5" 
                          : "border-border/50 hover:border-primary/30"
                      )}
                      onClick={toggleKidsMode}
                    >
                      <CardContent className="p-5 text-center space-y-3">
                        <div className={cn(
                          "w-12 h-12 mx-auto rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform",
                          kidsMode ? "bg-pink-500/20" : "bg-muted"
                        )}>
                          <Baby className={cn(
                            "w-6 h-6",
                            kidsMode ? "text-pink-500" : "text-muted-foreground"
                          )} />
                        </div>
                        <div>
                          <h3 className={cn(
                            "font-display font-bold",
                            kidsMode ? "text-pink-600 dark:text-pink-400" : "text-foreground"
                          )}>
                            Modo Kids
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {kidsMode ? "✓ Ativado" : "Toque para ativar"}
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
