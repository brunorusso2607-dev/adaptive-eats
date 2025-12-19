import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, LogOut, Camera, Sparkles, Crown, Loader2, Star, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

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
        // Check subscription when user logs in
        setTimeout(() => checkSubscription(), 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        setIsLoading(false);
        // Check subscription on initial load
        setTimeout(() => checkSubscription(), 0);
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
            <>
              {/* Active Plan Features */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="glass-card border-2 border-primary/30 shadow-glow">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto gradient-primary rounded-2xl flex items-center justify-center">
                      <Camera className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground">
                        Escanear Ingredientes
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tire uma foto e deixe a IA identificar
                      </p>
                    </div>
                    <Button className="w-full gradient-primary border-0">
                      <Camera className="mr-2 h-5 w-5" />
                      Escanear Agora
                    </Button>
                  </CardContent>
                </Card>

                <Card className="glass-card border-2 border-primary/30 shadow-glow">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto gradient-accent rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground">
                        Gerar Receitas com IA
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Receitas personalizadas em segundos
                      </p>
                    </div>
                    <Button className="w-full gradient-accent border-0">
                      <Sparkles className="mr-2 h-5 w-5" />
                      Gerar Receitas
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Current Plan Info */}
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    {activePlan === "premium" ? (
                      <Crown className="w-5 h-5 text-accent" />
                    ) : (
                      <Star className="w-5 h-5 text-muted-foreground" />
                    )}
                    Seu Plano: {plans[activePlan!]?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-2 gap-2">
                    {plans[activePlan!]?.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
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
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground">
                        Escanear Ingredientes
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tire uma foto e deixe a IA identificar
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
                        Gerar Receitas com IA
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Receitas personalizadas em segundos
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
