import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, ArrowRight, ArrowLeft, Check, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Intolerâncias", description: "Quais são suas restrições alimentares?" },
  { id: 2, title: "Preferência", description: "Qual sua preferência alimentar?" },
  { id: 3, title: "Objetivo", description: "Qual seu objetivo?" },
  { id: 4, title: "Meta Calórica", description: "Como quer gerenciar suas calorias?" },
  { id: 5, title: "Receitas", description: "Que tipo de receitas prefere?" },
  { id: 6, title: "Contexto", description: "Para quem você cozinha?" },
  { id: 7, title: "Confirmação", description: "Revise suas escolhas" },
];

const INTOLERANCES = [
  { id: "lactose", label: "Sem Lactose", emoji: "🥛" },
  { id: "gluten", label: "Sem Glúten", emoji: "🌾" },
  { id: "acucar", label: "Sem Açúcar", emoji: "🍬" },
  { id: "amendoim", label: "Alergia a Amendoim", emoji: "🥜" },
  { id: "frutos_mar", label: "Alergia a Frutos do Mar", emoji: "🦐" },
  { id: "ovo", label: "Alergia a Ovo", emoji: "🥚" },
  { id: "nenhuma", label: "Nenhuma Intolerância", emoji: "✅" },
];

const DIETARY_PREFERENCES = [
  { id: "comum", label: "Comum", description: "Sem restrições específicas", emoji: "🍽️" },
  { id: "vegetariana", label: "Vegetariana", description: "Sem carnes", emoji: "🥗" },
  { id: "vegana", label: "Vegana", description: "Sem produtos animais", emoji: "🌱" },
  { id: "low_carb", label: "Low Carb", description: "Baixo carboidrato", emoji: "🥩" },
];

const GOALS = [
  { id: "emagrecer", label: "Emagrecer", description: "Perder peso de forma saudável", emoji: "📉" },
  { id: "manter", label: "Manter Peso", description: "Manter o peso atual", emoji: "⚖️" },
  { id: "ganhar_peso", label: "Ganhar Peso", description: "Aumentar massa corporal", emoji: "📈" },
];

const CALORIE_GOALS = [
  { id: "reduzir", label: "Reduzir Calorias", description: "Déficit calórico", emoji: "🔥" },
  { id: "manter", label: "Manter Calorias", description: "Equilíbrio", emoji: "⚖️" },
  { id: "aumentar", label: "Aumentar Calorias", description: "Superávit calórico", emoji: "💪" },
  { id: "definir_depois", label: "Definir Depois", description: "Vou decidir mais tarde", emoji: "⏳" },
];

const COMPLEXITY = [
  { id: "rapida", label: "Receitas Rápidas", description: "Até 20 minutos", emoji: "⚡" },
  { id: "equilibrada", label: "Equilibradas", description: "20-45 minutos", emoji: "⏱️" },
  { id: "elaborada", label: "Elaboradas", description: "Mais de 45 minutos", emoji: "👨‍🍳" },
];

const CONTEXT = [
  { id: "individual", label: "Individual", description: "Só para mim", emoji: "👤" },
  { id: "familia", label: "Família", description: "Para toda a família", emoji: "👨‍👩‍👧‍👦" },
  { id: "modo_kids", label: "Modo Kids", description: "Receitas para crianças", emoji: "👶" },
];

type DietaryPreference = "comum" | "vegetariana" | "vegana" | "low_carb";
type UserGoal = "emagrecer" | "manter" | "ganhar_peso";
type CalorieGoal = "reduzir" | "manter" | "aumentar" | "definir_depois";
type RecipeComplexity = "rapida" | "equilibrada" | "elaborada";
type UserContext = "individual" | "familia" | "modo_kids";

type ProfileData = {
  intolerances: string[];
  dietary_preference: DietaryPreference;
  goal: UserGoal;
  calorie_goal: CalorieGoal;
  recipe_complexity: RecipeComplexity;
  context: UserContext;
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

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user already completed onboarding
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
    if (id === "nenhuma") {
      setProfile({ ...profile, intolerances: profile.intolerances.includes("nenhuma") ? [] : ["nenhuma"] });
    } else {
      const filtered = profile.intolerances.filter(i => i !== "nenhuma");
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
          dietary_preference: profile.dietary_preference,
          goal: profile.goal,
          calorie_goal: profile.calorie_goal,
          recipe_complexity: profile.recipe_complexity,
          context: profile.context,
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid grid-cols-2 gap-3">
            {INTOLERANCES.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleIntolerance(item.id)}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  profile.intolerances.includes(item.id)
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-2xl mb-2 block">{item.emoji}</span>
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        );

      case 2:
        return (
          <div className="grid grid-cols-2 gap-3">
            {DIETARY_PREFERENCES.map((item) => (
              <button
                key={item.id}
                onClick={() => setProfile({ ...profile, dietary_preference: item.id as DietaryPreference })}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  profile.dietary_preference === item.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-2xl mb-2 block">{item.emoji}</span>
                <span className="font-medium text-sm block">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </button>
            ))}
          </div>
        );

      case 3:
        return (
          <div className="space-y-3">
            {GOALS.map((item) => (
              <button
                key={item.id}
                onClick={() => setProfile({ ...profile, goal: item.id as UserGoal })}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4",
                  profile.goal === item.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-3xl">{item.emoji}</span>
                <div>
                  <span className="font-medium block">{item.label}</span>
                  <span className="text-sm text-muted-foreground">{item.description}</span>
                </div>
              </button>
            ))}
          </div>
        );

      case 4:
        return (
          <div className="grid grid-cols-2 gap-3">
            {CALORIE_GOALS.map((item) => (
              <button
                key={item.id}
                onClick={() => setProfile({ ...profile, calorie_goal: item.id as CalorieGoal })}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  profile.calorie_goal === item.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-2xl mb-2 block">{item.emoji}</span>
                <span className="font-medium text-sm block">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </button>
            ))}
          </div>
        );

      case 5:
        return (
          <div className="space-y-3">
            {COMPLEXITY.map((item) => (
              <button
                key={item.id}
                onClick={() => setProfile({ ...profile, recipe_complexity: item.id as RecipeComplexity })}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4",
                  profile.recipe_complexity === item.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-3xl">{item.emoji}</span>
                <div>
                  <span className="font-medium block">{item.label}</span>
                  <span className="text-sm text-muted-foreground">{item.description}</span>
                </div>
              </button>
            ))}
          </div>
        );

      case 6:
        return (
          <div className="space-y-3">
            {CONTEXT.map((item) => (
              <button
                key={item.id}
                onClick={() => setProfile({ ...profile, context: item.id as UserContext })}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4",
                  profile.context === item.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-3xl">{item.emoji}</span>
                <div>
                  <span className="font-medium block">{item.label}</span>
                  <span className="text-sm text-muted-foreground">{item.description}</span>
                </div>
              </button>
            ))}
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                <span className="text-muted-foreground">Intolerâncias</span>
                <span className="font-medium">
                  {profile.intolerances.length === 0 
                    ? "Nenhuma" 
                    : profile.intolerances.map(i => INTOLERANCES.find(x => x.id === i)?.label).join(", ")}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                <span className="text-muted-foreground">Preferência</span>
                <span className="font-medium">
                  {DIETARY_PREFERENCES.find(x => x.id === profile.dietary_preference)?.label}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                <span className="text-muted-foreground">Objetivo</span>
                <span className="font-medium">
                  {GOALS.find(x => x.id === profile.goal)?.label}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                <span className="text-muted-foreground">Meta Calórica</span>
                <span className="font-medium">
                  {CALORIE_GOALS.find(x => x.id === profile.calorie_goal)?.label}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                <span className="text-muted-foreground">Tipo de Receitas</span>
                <span className="font-medium">
                  {COMPLEXITY.find(x => x.id === profile.recipe_complexity)?.label}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                <span className="text-muted-foreground">Contexto</span>
                <span className="font-medium">
                  {CONTEXT.find(x => x.id === profile.context)?.label}
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
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
            <ChefHat className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">ReceitAI</span>
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
      <div className="px-4 py-2">
        <div className="flex gap-1">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all",
                step.id <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Passo {currentStep} de {STEPS.length}
        </p>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-4">
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-xl">
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {STEPS[currentStep - 1].description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>
      </main>

      {/* Footer Navigation */}
      <footer className="p-4 flex gap-3">
        {currentStep > 1 && (
          <Button variant="outline" size="lg" onClick={handleBack} className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}
        {currentStep < 7 ? (
          <Button size="lg" onClick={handleNext} className="flex-1 gradient-primary border-0">
            Próximo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            size="lg" 
            onClick={handleComplete} 
            disabled={isLoading}
            className="flex-1 gradient-primary border-0"
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
