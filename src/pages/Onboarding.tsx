import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChefHat, ArrowRight, ArrowLeft, Check, Loader2, LogOut,
  Wheat, Milk, Nut, Fish, Egg, Bean, CircleSlash, Leaf, Salad, 
  Scale, TrendingDown, TrendingUp, Minus, Clock, Flame, Timer,
  User, Users, Baby, type LucideIcon
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useOnboardingOptions, type OnboardingOption } from "@/hooks/useOnboardingOptions";

// Mapeamento de ícones line-art por option_id
const ICON_MAP: Record<string, LucideIcon> = {
  // Intolerâncias
  gluten: Wheat,
  lactose: Milk,
  nuts: Nut,
  seafood: Fish,
  eggs: Egg,
  soy: Bean,
  none: Check,
  nenhuma: Check,
  // Preferências alimentares
  comum: Salad,
  vegetariana: Leaf,
  vegana: Leaf,
  low_carb: Flame,
  // Objetivos
  emagrecer: TrendingDown,
  manter: Minus,
  ganhar_peso: TrendingUp,
  // Meta calórica
  reduzir: TrendingDown,
  aumentar: TrendingUp,
  definir_depois: Clock,
  // Complexidade
  rapida: Timer,
  equilibrada: Scale,
  elaborada: ChefHat,
  // Contexto
  individual: User,
  familia: Users,
  modo_kids: Baby,
};

const getIcon = (optionId: string): LucideIcon | null => {
  return ICON_MAP[optionId] || null;
};

const STEPS = [
  { id: 1, title: "Intolerâncias", description: "Quais são suas restrições alimentares?" },
  { id: 2, title: "Preferência", description: "Qual sua preferência alimentar?" },
  { id: 3, title: "Objetivo", description: "Qual seu objetivo?" },
  { id: 4, title: "Meta Calórica", description: "Como quer gerenciar suas calorias?" },
  { id: 5, title: "Receitas", description: "Que tipo de receitas prefere?" },
  { id: 6, title: "Contexto", description: "Para quem você cozinha?" },
  { id: 7, title: "Confirmação", description: "Revise suas escolhas" },
];

type ProfileData = {
  intolerances: string[];
  dietary_preference: string;
  goal: string;
  calorie_goal: string;
  recipe_complexity: string;
  context: string;
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    intolerances: [],
    dietary_preference: "comum",
    goal: "manter",
    calorie_goal: "definir_depois",
    recipe_complexity: "equilibrada",
    context: "individual",
  });

  const { data: options, isLoading: isLoadingOptions } = useOnboardingOptions();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .maybeSingle();

      if (existingProfile?.onboarding_completed) {
        navigate("/dashboard");
      }
    };

    checkAuth();
  }, [navigate]);

  const toggleIntolerance = (id: string) => {
    const noneOption = options?.intolerances.find(o => o.option_id === "none" || o.option_id === "nenhuma");
    const noneId = noneOption?.option_id || "none";
    
    if (id === noneId) {
      setProfile({ ...profile, intolerances: profile.intolerances.includes(noneId) ? [] : [noneId] });
    } else {
      const filtered = profile.intolerances.filter(i => i !== noneId && i !== "none" && i !== "nenhuma");
      if (filtered.includes(id)) {
        setProfile({ ...profile, intolerances: filtered.filter(i => i !== id) });
      } else {
        setProfile({ ...profile, intolerances: [...filtered, id] });
      }
    }
  };

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          intolerances: profile.intolerances,
          dietary_preference: profile.dietary_preference as any,
          goal: profile.goal as any,
          calorie_goal: profile.calorie_goal as any,
          recipe_complexity: profile.recipe_complexity as any,
          context: profile.context as any,
          onboarding_completed: true,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      toast.success("Perfil configurado com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Erro ao salvar perfil. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const getLabel = (category: keyof typeof options, optionId: string): string => {
    if (!options) return optionId;
    const categoryOptions = options[category as keyof typeof options];
    const option = categoryOptions?.find((o: OnboardingOption) => o.option_id === optionId);
    return option?.label || optionId;
  };

  const renderStepContent = () => {
    if (isLoadingOptions || !options) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="grid grid-cols-2 gap-3">
            {options.intolerances.map((item) => {
              const IconComponent = getIcon(item.option_id);
              return (
                <button
                  key={item.option_id}
                  onClick={() => toggleIntolerance(item.option_id)}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    profile.intolerances.includes(item.option_id)
                      ? "border-primary bg-primary/5"
                      : "border-border/80 hover:border-primary/50 bg-card"
                  )}
                >
                  <div className="w-8 h-8 mb-2 flex items-center justify-center">
                    {IconComponent ? (
                      <IconComponent className="w-6 h-6 text-foreground stroke-[1.5]" />
                    ) : (
                      <span className="text-xl">{item.emoji || "•"}</span>
                    )}
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              );
            })}
          </div>
        );

      case 2:
        return (
          <div className="grid grid-cols-2 gap-3">
            {options.dietary_preferences.map((item) => {
              const IconComponent = getIcon(item.option_id);
              return (
                <button
                  key={item.option_id}
                  onClick={() => setProfile({ ...profile, dietary_preference: item.option_id })}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    profile.dietary_preference === item.option_id
                      ? "border-primary bg-primary/5"
                      : "border-border/80 hover:border-primary/50 bg-card"
                  )}
                >
                  <div className="w-8 h-8 mb-2 flex items-center justify-center">
                    {IconComponent ? (
                      <IconComponent className="w-6 h-6 text-foreground stroke-[1.5]" />
                    ) : (
                      <span className="text-xl">{item.emoji || "•"}</span>
                    )}
                  </div>
                  <span className="font-medium text-sm block">{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  )}
                </button>
              );
            })}
          </div>
        );

      case 3:
        return (
          <div className="space-y-3">
            {options.goals.map((item) => {
              const IconComponent = getIcon(item.option_id);
              return (
                <button
                  key={item.option_id}
                  onClick={() => setProfile({ ...profile, goal: item.option_id })}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4",
                    profile.goal === item.option_id
                      ? "border-primary bg-primary/5"
                      : "border-border/80 hover:border-primary/50 bg-card"
                  )}
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted/50">
                    {IconComponent ? (
                      <IconComponent className="w-6 h-6 text-foreground stroke-[1.5]" />
                    ) : (
                      <span className="text-xl">{item.emoji || "•"}</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium block">{item.label}</span>
                    {item.description && (
                      <span className="text-sm text-muted-foreground">{item.description}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 4:
        return (
          <div className="grid grid-cols-2 gap-3">
            {options.calorie_goals.map((item) => {
              const IconComponent = getIcon(item.option_id);
              return (
                <button
                  key={item.option_id}
                  onClick={() => setProfile({ ...profile, calorie_goal: item.option_id })}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    profile.calorie_goal === item.option_id
                      ? "border-primary bg-primary/5"
                      : "border-border/80 hover:border-primary/50 bg-card"
                  )}
                >
                  <div className="w-8 h-8 mb-2 flex items-center justify-center">
                    {IconComponent ? (
                      <IconComponent className="w-6 h-6 text-foreground stroke-[1.5]" />
                    ) : (
                      <span className="text-xl">{item.emoji || "•"}</span>
                    )}
                  </div>
                  <span className="font-medium text-sm block">{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  )}
                </button>
              );
            })}
          </div>
        );

      case 5:
        return (
          <div className="space-y-3">
            {options.complexity.map((item) => {
              const IconComponent = getIcon(item.option_id);
              return (
                <button
                  key={item.option_id}
                  onClick={() => setProfile({ ...profile, recipe_complexity: item.option_id })}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4",
                    profile.recipe_complexity === item.option_id
                      ? "border-primary bg-primary/5"
                      : "border-border/80 hover:border-primary/50 bg-card"
                  )}
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted/50">
                    {IconComponent ? (
                      <IconComponent className="w-6 h-6 text-foreground stroke-[1.5]" />
                    ) : (
                      <span className="text-xl">{item.emoji || "•"}</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium block">{item.label}</span>
                    {item.description && (
                      <span className="text-sm text-muted-foreground">{item.description}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 6:
        return (
          <div className="space-y-3">
            {options.context.map((item) => {
              const IconComponent = getIcon(item.option_id);
              return (
                <button
                  key={item.option_id}
                  onClick={() => setProfile({ ...profile, context: item.option_id })}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4",
                    profile.context === item.option_id
                      ? "border-primary bg-primary/5"
                      : "border-border/80 hover:border-primary/50 bg-card"
                  )}
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted/50">
                    {IconComponent ? (
                      <IconComponent className="w-6 h-6 text-foreground stroke-[1.5]" />
                    ) : (
                      <span className="text-xl">{item.emoji || "•"}</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium block">{item.label}</span>
                    {item.description && (
                      <span className="text-sm text-muted-foreground">{item.description}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-border/50">
                <span className="text-sm text-muted-foreground">Intolerâncias</span>
                <span className="font-medium text-sm text-right max-w-[60%]">
                  {profile.intolerances.length === 0 
                    ? "Nenhuma" 
                    : profile.intolerances.map(i => getLabel("intolerances", i)).join(", ")}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-border/50">
                <span className="text-sm text-muted-foreground">Preferência</span>
                <span className="font-medium text-sm">
                  {getLabel("dietary_preferences", profile.dietary_preference)}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-border/50">
                <span className="text-sm text-muted-foreground">Objetivo</span>
                <span className="font-medium text-sm">
                  {getLabel("goals", profile.goal)}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-border/50">
                <span className="text-sm text-muted-foreground">Meta Calórica</span>
                <span className="font-medium text-sm">
                  {getLabel("calorie_goals", profile.calorie_goal)}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-border/50">
                <span className="text-sm text-muted-foreground">Tipo de Receitas</span>
                <span className="font-medium text-sm">
                  {getLabel("complexity", profile.recipe_complexity)}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-border/50">
                <span className="text-sm text-muted-foreground">Contexto</span>
                <span className="font-medium text-sm">
                  {getLabel("context", profile.context)}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground tracking-tight">ReceitAI</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </header>

      {/* Progress */}
      <div className="px-5 py-3">
        <div className="flex gap-1.5">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                step.id <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Passo {currentStep} de {STEPS.length}
        </p>
      </div>

      {/* Content */}
      <main className="flex-1 px-5 py-4">
        <Card className="bg-card border border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription className="text-sm">
              {STEPS[currentStep - 1].description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>
      </main>

      {/* Footer Navigation */}
      <footer className="p-5 flex gap-3">
        {currentStep > 1 && (
          <Button variant="outline" size="lg" onClick={handleBack} className="flex-1 h-12">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}
        {currentStep < 7 ? (
          <Button size="lg" onClick={handleNext} className="flex-1 h-12 bg-primary hover:bg-primary/90">
            Próximo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            size="lg" 
            onClick={handleComplete} 
            disabled={isLoading}
            className="flex-1 h-12 bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Concluir
          </Button>
        )}
      </footer>
    </div>
  );
}
