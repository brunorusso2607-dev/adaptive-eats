import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, LogOut, Sparkles, Crown, Loader2, Star, Check, Calendar, Heart, History, UtensilsCrossed, Zap, Baby, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import RecipeResult from "@/components/RecipeResult";
import RecipeList from "@/components/RecipeList";

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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [userContext, setUserContext] = useState<string | null>(null);
  const [userGoal, setUserGoal] = useState<string | null>(null);
  
  // Recipe generation state
  const [ingredients, setIngredients] = useState("");
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [showRecipe, setShowRecipe] = useState(false);
  const [showList, setShowList] = useState<"history" | "favorites" | null>(null);

  const checkOnboarding = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed, context, goal")
      .eq("id", userId)
      .maybeSingle();
    
    if (data && !data.onboarding_completed) {
      navigate("/onboarding");
    } else {
      setOnboardingCompleted(true);
      setUserContext(data?.context || "individual");
      setUserGoal(data?.goal || "manter");
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
    
    const newGoal = userGoal === "emagrecer" ? "manter" : "emagrecer";
    const { error } = await supabase
      .from("profiles")
      .update({ goal: newGoal })
      .eq("id", session.user.id);
    
    if (!error) {
      setUserGoal(newGoal);
      toast.success(newGoal === "emagrecer" ? "🔥 Modo Emagrecimento ativado!" : "Modo Emagrecimento desativado");
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
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
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
            showRecipe && generatedRecipe ? (
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
                          Gerar Receita com Ingredientes
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Digite os ingredientes que você tem em casa
                        </p>
                      </div>
                    </div>
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

                {/* Modo Kids Banner - quando ativo */}
                {userContext === "modo_kids" && (
                  <Card className="glass-card border-2 border-pink-400/50 bg-gradient-to-r from-pink-50 to-yellow-50 dark:from-pink-950/30 dark:to-yellow-950/30 overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-yellow-500 rounded-xl flex items-center justify-center animate-pulse">
                          <Baby className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-foreground">👶 Modo Kids Ativo!</h3>
                          <p className="text-xs text-muted-foreground">Receitas divertidas para crianças</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={toggleKidsMode}
                        className="border-pink-400/50 text-pink-600 hover:bg-pink-50"
                      >
                        Desativar
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Modo Emagrecimento Banner - quando ativo */}
                {userGoal === "emagrecer" && (
                  <Card className="glass-card border-2 border-green-400/50 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-foreground">🔥 Modo Emagrecimento Ativo!</h3>
                            <p className="text-xs text-muted-foreground">Receitas com foco em saciedade e déficit calórico</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={toggleWeightLossMode}
                          className="border-green-400/50 text-green-600 hover:bg-green-50"
                        >
                          Desativar
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3">
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
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        *Estimativa baseada em déficit calórico saudável. Resultados variam individualmente.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Grid de Opções */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Gerar Receita Automática */}
                  <Card 
                    className="glass-card border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
                    onClick={() => !isGeneratingRecipe && generateRecipe("automatica")}
                  >
                    <CardContent className="p-5 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto gradient-accent rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                        {isGeneratingRecipe ? (
                          <Loader2 className="w-6 h-6 text-accent-foreground animate-spin" />
                        ) : (
                          <Zap className="w-6 h-6 text-accent-foreground" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground">
                          Receita Automática
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Surpreenda-me!
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Modo Kids Toggle */}
                  <Card 
                    className={`glass-card transition-all cursor-pointer group ${
                      userContext === "modo_kids" 
                        ? "border-2 border-pink-400/50 bg-gradient-to-b from-pink-50 to-yellow-50 dark:from-pink-950/30 dark:to-yellow-950/30" 
                        : "border-border/50 hover:border-pink-400/30"
                    }`}
                    onClick={toggleKidsMode}
                  >
                    <CardContent className="p-5 text-center space-y-3">
                      <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                        userContext === "modo_kids" 
                          ? "bg-gradient-to-r from-pink-500 to-yellow-500" 
                          : "bg-pink-500/20"
                      }`}>
                        <Baby className={`w-6 h-6 ${userContext === "modo_kids" ? "text-white" : "text-pink-500"}`} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground">
                          Modo Kids
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {userContext === "modo_kids" ? "✅ Ativo" : "Receitas divertidas"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Modo Emagrecimento Toggle */}
                  <Card 
                    className={`glass-card transition-all cursor-pointer group ${
                      userGoal === "emagrecer" 
                        ? "border-2 border-green-400/50 bg-gradient-to-b from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30" 
                        : "border-border/50 hover:border-green-400/30"
                    }`}
                    onClick={toggleWeightLossMode}
                  >
                    <CardContent className="p-5 text-center space-y-3">
                      <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                        userGoal === "emagrecer" 
                          ? "bg-gradient-to-r from-green-500 to-emerald-500" 
                          : "bg-green-500/20"
                      }`}>
                        <TrendingDown className={`w-6 h-6 ${userGoal === "emagrecer" ? "text-white" : "text-green-500"}`} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground">
                          Emagrecer
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {userGoal === "emagrecer" ? "✅ Ativo" : "Foco em saciedade"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Plano Semanal */}
                  <Card className="glass-card border-border/50 hover:border-primary/30 transition-all cursor-pointer group">
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
    </div>
  );
}
