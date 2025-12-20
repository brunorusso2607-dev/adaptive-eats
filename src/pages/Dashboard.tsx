import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, LogOut, Sparkles, Crown, Loader2, Star, Check, Calendar, Heart, History, UtensilsCrossed, Zap, Baby, TrendingDown, User, Download, Scale, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import RecipeResult from "@/components/RecipeResult";
import RecipeList from "@/components/RecipeList";
import WeightGoalSetup, { calculateMacros } from "@/components/WeightGoalSetup";
import UserAccountMenu from "@/components/UserAccountMenu";
import MealPlanSection from "@/components/MealPlanSection";
import WorkoutSection from "@/components/WorkoutSection";
import WeightUpdateModal from "@/components/WeightUpdateModal";
import WeightHistoryChart from "@/components/WeightHistoryChart";
import { Beef, Wheat, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [ingredients, setIngredients] = useState("");
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [showRecipe, setShowRecipe] = useState(false);
  const [showList, setShowList] = useState<"history" | "favorites" | null>(null);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [hasMealPlan, setHasMealPlan] = useState(false);
  const [showWeightUpdateModal, setShowWeightUpdateModal] = useState(false);
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [showWorkout, setShowWorkout] = useState(false);
  
  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const checkOnboarding = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed, context, goal, weight_current, weight_goal, height, age, sex, activity_level")
      .eq("id", userId)
      .maybeSingle();
    
    if (data && !data.onboarding_completed) {
      navigate("/onboarding");
    } else {
      setOnboardingCompleted(true);
      setUserContext(data?.context || "individual");
      setUserGoal(data?.goal || "manter");
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
    }
  };

  // Track the last used ingredients for "Gerar Outra"
  const [lastUsedIngredients, setLastUsedIngredients] = useState<string | null>(null);

  const generateRecipe = async (type: "com_ingredientes" | "automatica", useLastIngredients = false) => {
    const ingredientsToUse = useLastIngredients ? lastUsedIngredients : ingredients;
    
    if (type === "com_ingredientes" && !ingredientsToUse?.trim()) {
      toast.error("Digite alguns ingredientes primeiro");
      return;
    }

    setIsGeneratingRecipe(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipe", {
        body: { 
          type,
          ingredients: type === "com_ingredientes" ? ingredientsToUse : null,
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
      
      // Save ingredients for "Gerar Outra" and clear input
      if (type === "com_ingredientes") {
        setLastUsedIngredients(ingredientsToUse);
      }
      setIngredients("");
    } catch (error) {
      console.error("Error generating recipe:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar receita. Tente novamente.");
    } finally {
      setIsGeneratingRecipe(false);
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSubscribed = subscription?.subscribed;
  const activePlan = subscription?.plan as "essencial" | "premium" | null;

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="glass-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <ChefHat className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">ReceitAI</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Kids Mode Toggle */}
            {isSubscribed && activePlan === "premium" && (
              <div 
                className={cn(
                  "flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full cursor-pointer transition-all",
                  userContext === "modo_kids" 
                    ? "bg-pink-500/20" 
                    : "bg-muted/50 hover:bg-muted"
                )}
                onClick={toggleKidsMode}
              >
                <Baby className={cn(
                  "w-4 h-4",
                  userContext === "modo_kids" ? "text-pink-600 dark:text-pink-400" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xs font-medium hidden sm:inline",
                  userContext === "modo_kids" ? "text-pink-600 dark:text-pink-400" : "text-muted-foreground"
                )}>
                  Modo Kids
                </span>
                <div className={cn(
                  "relative w-8 h-5 rounded-full transition-colors",
                  userContext === "modo_kids" ? "bg-pink-500" : "bg-muted-foreground/30"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    userContext === "modo_kids" ? "translate-x-3.5" : "translate-x-0.5"
                  )} />
                </div>
              </div>
            )}
            
            {/* Install App Button */}
            {showInstallButton && !isAppInstalled && (
              <Button
                onClick={handleInstallPWA}
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs sm:text-sm border-primary/30 text-primary hover:bg-primary/10"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Instalar App</span>
              </Button>
            )}
            
            <span className="text-sm text-muted-foreground hidden md:block">
              {user?.email}
            </span>
            <UserAccountMenu 
              user={user} 
              subscription={subscription} 
              onLogout={handleLogout} 
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="space-y-8">
          {/* Welcome */}
          <div className="text-center space-y-2">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              {isSubscribed ? `Olá! Você está no Plano ${plans[activePlan!]?.name} 🎉` : "Bem-vindo ao ReceitAI! 🎉"}
            </h1>
            <p className="text-muted-foreground">
              {isSubscribed 
                ? "Aproveite todas as funcionalidades do seu plano."
                : "Escolha seu plano e comece a transformar ingredientes em receitas incríveis."}
            </p>
            {subscription?.status === "trialing" && subscription?.subscription_end && (
              <p className="text-sm text-primary font-medium">
                Trial ativo até {new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>

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
                  true // Use last ingredients when generating another
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
            ) : showWorkout ? (
              <WorkoutSection onBack={() => setShowWorkout(false)} />
            ) : showWeightHistory && weightData?.weight_goal ? (
              <WeightHistoryChart 
                onBack={() => setShowWeightHistory(false)}
                goalWeight={weightData.weight_goal}
                goalMode={weightData.goal_mode}
                currentWeight={weightData.weight_current || 0}
              />
            ) : (
            <>
              {/* Home Principal - 5 Opções */}
              <div className="space-y-6">
                {/* Opção Principal: Gerar Receita com Ingredientes */}
                <Card className="glass-card border-2 border-primary/30 shadow-glow overflow-hidden">
                  <CardContent className="p-6 space-y-4">
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
                    
                    {/* Botão Surpreenda-me */}
                    <Button
                      variant="outline"
                      className="w-full gradient-accent border-0 text-accent-foreground hover:opacity-90"
                      onClick={() => !isGeneratingRecipe && generateRecipe("automatica")}
                      disabled={isGeneratingRecipe}
                    >
                      {isGeneratingRecipe ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <Zap className="w-5 h-5 mr-2" />
                      )}
                      Surpreenda-me!
                    </Button>
                    
                    {/* Divisor */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">ou digite ingredientes</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    
                    {/* Input de ingredientes */}
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={ingredients}
                        onChange={(e) => setIngredients(e.target.value)}
                        placeholder="Ex: frango, batata, cebola..."
                        className="flex-1 px-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        disabled={isGeneratingRecipe}
                        onKeyDown={(e) => e.key === "Enter" && generateRecipe("com_ingredientes")}
                      />
                      <Button 
                        className="gradient-primary border-0 px-6"
                        onClick={() => generateRecipe("com_ingredientes")}
                        disabled={isGeneratingRecipe}
                      >
                        {isGeneratingRecipe ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>


                {/* Meta de Peso Banner - quando ativo (emagrecer ou ganhar peso) */}
                {(userGoal === "emagrecer" || userGoal === "ganhar_peso") && (
                  <Card className={`glass-card border-2 overflow-hidden ${
                    userGoal === "ganhar_peso" 
                      ? "border-blue-400/50 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30"
                      : "border-green-400/50 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30"
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            userGoal === "ganhar_peso"
                              ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                              : "bg-gradient-to-r from-green-500 to-emerald-500"
                          }`}>
                            {userGoal === "ganhar_peso" 
                              ? <TrendingUp className="w-5 h-5 text-white" />
                              : <TrendingDown className="w-5 h-5 text-white" />
                            }
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-foreground">
                              {userGoal === "ganhar_peso" ? "💪 Modo Ganho de Peso Ativo!" : "🔥 Modo Emagrecimento Ativo!"}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {weightData?.weight_current 
                                ? `${weightData.weight_current}kg → ${weightData.weight_goal}kg` 
                                : userGoal === "ganhar_peso"
                                  ? "Receitas com foco em calorias e proteínas"
                                  : "Receitas com foco em saciedade e déficit calórico"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {weightData?.weight_current && (
                            <Button 
                              size="sm" 
                              onClick={() => setShowWeightUpdateModal(true)}
                              className={`${
                                userGoal === "ganhar_peso"
                                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                                  : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                              }`}
                            >
                              <Scale className="w-4 h-4 mr-1" />
                              Novo Peso
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowWeightLossSetup(true)}
                            className={`${
                              userGoal === "ganhar_peso"
                                ? "border-blue-400/50 text-blue-600 hover:bg-blue-50"
                                : "border-green-400/50 text-green-600 hover:bg-green-50"
                            }`}
                          >
                            {weightData?.weight_current ? "Editar" : "Configurar"}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={toggleWeightLossMode}
                            className={`${
                              userGoal === "ganhar_peso"
                                ? "border-blue-400/50 text-blue-600 hover:bg-blue-50"
                                : "border-green-400/50 text-green-600 hover:bg-green-50"
                            }`}
                          >
                            Desativar
                          </Button>
                        </div>
                      </div>
                      
                      {weightData?.weight_current ? (
                        <>
                          {/* Personalized Data */}
                          {(() => {
                            const calcs = calculateMacros(weightData);
                            if (!calcs) return null;
                            const accentColor = userGoal === "ganhar_peso" ? "text-blue-600" : "text-green-600";
                            return (
                              <>
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                  <div className="bg-white/60 dark:bg-white/10 rounded-lg p-2 text-center">
                                    <p className={`text-lg font-bold ${accentColor}`}>{calcs.targetCalories}</p>
                                    <p className="text-xs text-muted-foreground">kcal/dia</p>
                                  </div>
                                  <div className="bg-white/60 dark:bg-white/10 rounded-lg p-2 text-center">
                                    <p className="text-lg font-bold text-red-500">{calcs.protein}g</p>
                                    <p className="text-xs text-muted-foreground">Proteína</p>
                                  </div>
                                  <div className="bg-white/60 dark:bg-white/10 rounded-lg p-2 text-center">
                                    <p className="text-lg font-bold text-amber-500">{calcs.carbs}g</p>
                                    <p className="text-xs text-muted-foreground">Carbos</p>
                                  </div>
                                  <div className="bg-white/60 dark:bg-white/10 rounded-lg p-2 text-center">
                                    <p className="text-lg font-bold text-green-500">{calcs.fat}g</p>
                                    <p className="text-xs text-muted-foreground">Gordura</p>
                                  </div>
                                </div>
                                <div className="mt-3 bg-white/40 dark:bg-white/5 rounded-lg p-3">
                                  <div className="flex justify-between text-sm">
                                    <span>Mudança estimada: <strong className={accentColor}>~{calcs.weeklyChange}kg/semana</strong></span>
                                    <span>Meta em: <strong className={accentColor}>~{calcs.weeksToGoal} semanas</strong></span>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setShowWeightHistory(true)}
                                  className={`w-full mt-3 ${userGoal === "ganhar_peso" ? "text-blue-600 hover:bg-blue-50" : "text-green-600 hover:bg-green-50"}`}
                                >
                                  📈 Ver Evolução do Peso
                                </Button>
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            {userGoal === "ganhar_peso" ? (
                              <>
                                <div className="bg-white/60 dark:bg-white/10 rounded-lg p-2 text-center">
                                  <p className="text-lg font-bold text-blue-600">~0.3kg</p>
                                  <p className="text-xs text-muted-foreground">por semana*</p>
                                </div>
                                <div className="bg-white/60 dark:bg-white/10 rounded-lg p-2 text-center">
                                  <p className="text-lg font-bold text-blue-600">~1.2kg</p>
                                  <p className="text-xs text-muted-foreground">por mês*</p>
                                </div>
                                <div className="bg-white/60 dark:bg-white/10 rounded-lg p-2 text-center">
                                  <p className="text-lg font-bold text-blue-600">600-800</p>
                                  <p className="text-xs text-muted-foreground">kcal/porção</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="bg-white/60 dark:bg-white/10 rounded-lg p-2 text-center">
                                  <p className="text-lg font-bold text-green-600">~0.5kg</p>
                                  <p className="text-xs text-muted-foreground">por semana*</p>
                                </div>
                                <div className="bg-white/60 dark:bg-white/10 rounded-lg p-2 text-center">
                                  <p className="text-lg font-bold text-green-600">~2kg</p>
                                  <p className="text-xs text-muted-foreground">por mês*</p>
                                </div>
                                <div className="bg-white/60 dark:bg-white/10 rounded-lg p-2 text-center">
                                  <p className="text-lg font-bold text-green-600">300-450</p>
                                  <p className="text-xs text-muted-foreground">kcal/porção</p>
                                </div>
                              </>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowWeightLossSetup(true)}
                            className={`w-full mt-3 ${userGoal === "ganhar_peso" ? "text-blue-600 hover:bg-blue-50" : "text-green-600 hover:bg-green-50"}`}
                          >
                            👆 Configure seu peso para metas personalizadas
                          </Button>
                        </>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        *Estimativa baseada em {userGoal === "ganhar_peso" ? "superávit calórico saudável" : "déficit calórico saudável"}. Resultados variam individualmente.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Grid de Opções */}
                <div className="grid grid-cols-2 gap-4">

                  {/* Meta de Peso Toggle - só aparece quando não há meta ativa */}
                  {userGoal !== "emagrecer" && userGoal !== "ganhar_peso" && (
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
                  )}

                  {/* Plano Semanal - Só aparece se tem plano criado */}
                  {hasMealPlan && (
                    <Card 
                      className="glass-card border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
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

                  {/* Favoritas */}
                  <Card 
                    className="glass-card border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
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

                  {/* Histórico */}
                  <Card 
                    className="glass-card border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
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

                  {/* Treino */}
                  <Card 
                    className="glass-card border-border/50 hover:border-orange-500/30 transition-all cursor-pointer group"
                    onClick={() => setShowWorkout(true)}
                  >
                    <CardContent className="p-5 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto bg-orange-500/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Dumbbell className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground">
                          Treino
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Exercícios com GIFs
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Info do Plano */}
                <Card className="glass-card border-border/30">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {activePlan === "premium" ? (
                        <Crown className="w-5 h-5 text-accent" />
                      ) : (
                        <Star className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">Plano {plans[activePlan!]?.name}</span>
                      {subscription?.status === "trialing" && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          Trial
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {subscription?.subscription_end && 
                        `até ${new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}`
                      }
                    </span>
                  </CardContent>
                </Card>
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
    </div>
  );
}
