import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ChefHat, ArrowRight, ArrowLeft, Check, Loader2, LogOut, X, Plus, Bell, BellOff, Globe, Dumbbell, TrendingDown, TrendingUp, Scale, Utensils, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useOnboardingOptions, type OnboardingOption } from "@/hooks/useOnboardingOptions";
import { getOnboardingIcon } from "@/lib/iconUtils";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useNutritionalStrategies, getStrategiesForGoal, type NutritionalStrategy } from "@/hooks/useNutritionalStrategies";

const PUSH_PROMPT_DISMISSED_KEY = "push_prompt_dismissed";

const STEPS = [
  { id: 1, title: "Sua região", description: "De qual país você é?" },
  { id: 2, title: "Intolerâncias", description: "Quais são suas restrições alimentares?" },
  { id: 3, title: "Preferência", description: "Qual sua preferência alimentar?" },
  { id: 4, title: "Alimentos", description: "Tem algum alimento que você não consome?" },
  { id: 5, title: "Objetivo", description: "Qual seu objetivo?" },
  { id: 6, title: "Estratégia", description: "Como você quer alcançar seu objetivo?" },
  { id: 7, title: "Notificações", description: "Receba lembretes importantes" },
];

const COUNTRIES = [
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "JP", name: "Japão", flag: "🇯🇵" },
  { code: "IT", name: "Itália", flag: "🇮🇹" },
  { code: "FR", name: "França", flag: "🇫🇷" },
  { code: "DE", name: "Alemanha", flag: "🇩🇪" },
  { code: "ES", name: "Espanha", flag: "🇪🇸" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧" },
  { code: "CO", name: "Colômbia", flag: "🇨🇴" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "IN", name: "Índia", flag: "🇮🇳" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "KR", name: "Coreia do Sul", flag: "🇰🇷" },
  { code: "TH", name: "Tailândia", flag: "🇹🇭" },
  { code: "VN", name: "Vietnã", flag: "🇻🇳" },
  { code: "AU", name: "Austrália", flag: "🇦🇺" },
];

type ProfileData = {
  country: string;
  intolerances: string[];
  dietary_preference: string;
  excluded_ingredients: string[];
  goal: string;
  strategy_id: string | null;
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    country: "BR",
    intolerances: [],
    dietary_preference: "comum",
    excluded_ingredients: [],
    goal: "manter",
    strategy_id: null,
  });
  const [ingredientInput, setIngredientInput] = useState("");

  const { data: options, isLoading: isLoadingOptions } = useOnboardingOptions();
  const { data: strategies, isLoading: isLoadingStrategies } = useNutritionalStrategies();
  const { 
    isSupported: isPushSupported, 
    isSubscribed: isPushSubscribed, 
    permission: pushPermission,
    subscribe: subscribePush 
  } = usePushSubscription();

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
    } else {
      handleComplete();
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

      // Detectar timezone automaticamente do navegador
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
      console.log("[Onboarding] Timezone detectado:", detectedTimezone);

      const { error } = await supabase
        .from("profiles")
        .update({
          country: profile.country,
          intolerances: profile.intolerances,
          dietary_preference: profile.dietary_preference as any,
          excluded_ingredients: profile.excluded_ingredients,
          goal: profile.goal as any,
          strategy_id: profile.strategy_id,
          timezone: detectedTimezone,
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
          <div className="space-y-4">
            <div className="text-center py-2">
              <Globe className="w-12 h-12 mx-auto mb-3 text-primary" />
              <p className="text-sm text-muted-foreground">
                Isso nos ajuda a sugerir alimentos e receitas populares na sua região.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto">
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  onClick={() => setProfile({ ...profile, country: country.code })}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all flex items-center gap-3",
                    profile.country === country.code
                      ? "border-primary bg-primary/5"
                      : "border-border/80 hover:border-primary/50 bg-card"
                  )}
                >
                  <span className="text-2xl">{country.flag}</span>
                  <span className="font-medium text-sm">{country.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="grid grid-cols-2 gap-3">
            {options.intolerances.map((item) => {
              const IconComponent = getOnboardingIcon(item);
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

      case 3:
        return (
          <div className="grid grid-cols-2 gap-3">
            {options.dietary_preferences.map((item) => {
              const IconComponent = getOnboardingIcon(item);
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

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione ou adicione alimentos específicos que você não consome (opcional).
            </p>
            
            {/* Sugestões como chips clicáveis */}
            {options.excluded_ingredients && options.excluded_ingredients.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Sugestões:</p>
                <div className="flex flex-wrap gap-2">
                  {options.excluded_ingredients.map((item) => {
                    const isSelected = profile.excluded_ingredients.includes(item.label.toLowerCase());
                    const IconComponent = getOnboardingIcon(item);
                    return (
                      <button
                        key={item.option_id}
                        onClick={() => {
                          const label = item.label.toLowerCase();
                          if (isSelected) {
                            setProfile({
                              ...profile,
                              excluded_ingredients: profile.excluded_ingredients.filter(i => i !== label)
                            });
                          } else {
                            setProfile({
                              ...profile,
                              excluded_ingredients: [...profile.excluded_ingredients, label]
                            });
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5",
                          isSelected
                            ? "bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-700"
                            : "bg-muted text-muted-foreground border border-border hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                        )}
                      >
                        {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divisor */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou adicione outros</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            
            {/* Input para adicionar ingredientes personalizados */}
            <div className="flex gap-2">
              <Input
                placeholder="Ex: jiló, quiabo, beterraba..."
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && ingredientInput.trim()) {
                    e.preventDefault();
                    const ingredient = ingredientInput.trim().toLowerCase();
                    if (!profile.excluded_ingredients.includes(ingredient)) {
                      setProfile({
                        ...profile,
                        excluded_ingredients: [...profile.excluded_ingredients, ingredient]
                      });
                    }
                    setIngredientInput("");
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  if (ingredientInput.trim()) {
                    const ingredient = ingredientInput.trim().toLowerCase();
                    if (!profile.excluded_ingredients.includes(ingredient)) {
                      setProfile({
                        ...profile,
                        excluded_ingredients: [...profile.excluded_ingredients, ingredient]
                      });
                    }
                    setIngredientInput("");
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Lista de ingredientes selecionados */}
            {profile.excluded_ingredients.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Selecionados:</p>
                <div className="flex flex-wrap gap-2">
                  {profile.excluded_ingredients.map((ingredient) => (
                    <Badge
                      key={ingredient}
                      variant="secondary"
                      className="pl-3 pr-1.5 py-1.5 flex items-center gap-1.5 bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800"
                    >
                      <span className="capitalize">{ingredient}</span>
                      <button
                        onClick={() => setProfile({
                          ...profile,
                          excluded_ingredients: profile.excluded_ingredients.filter(i => i !== ingredient)
                        })}
                        className="hover:bg-orange-200 dark:hover:bg-orange-900 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.excluded_ingredients.length === 0 && (
              <p className="text-xs text-muted-foreground/60 text-center py-2">
                Nenhum alimento adicionado. Você pode pular esta etapa se quiser.
              </p>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-3">
            {options.goals.map((item) => {
              const IconComponent = getOnboardingIcon(item);
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

      case 6:
        const strategyGroups = getStrategiesForGoal(profile.goal, strategies || []);
        const getStrategyIcon = (key: string) => {
          switch (key) {
            case "emagrecer": return TrendingDown;
            case "cutting": return Dumbbell;
            case "manter": return Scale;
            case "fitness": return Dumbbell;
            case "ganhar_peso": return TrendingUp;
            case "dieta_flexivel": return Utensils;
            default: return Sparkles;
          }
        };
        
        if (isLoadingStrategies || !strategies) {
          return (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Escolha a estratégia que melhor se adapta ao seu estilo de vida
            </p>

            {/* Recomendadas */}
            {strategyGroups.recommended.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-primary flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Recomendadas para você
                </p>
                <div className="space-y-2">
                  {strategyGroups.recommended.map((strategy) => {
                    const IconComponent = getStrategyIcon(strategy.key);
                    return (
                      <button
                        key={strategy.id}
                        onClick={() => setProfile({ ...profile, strategy_id: strategy.id })}
                        className={cn(
                          "w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4",
                          profile.strategy_id === strategy.id
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border/80 hover:border-primary/50 bg-card"
                        )}
                      >
                        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10">
                          <IconComponent className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium block">{strategy.label}</span>
                          {strategy.description && (
                            <span className="text-sm text-muted-foreground line-clamp-2">{strategy.description}</span>
                          )}
                        </div>
                        {profile.strategy_id === strategy.id && (
                          <Check className="w-5 h-5 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Outras */}
            {strategyGroups.others.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Outras opções</p>
                <div className="space-y-2">
                  {strategyGroups.others.map((strategy) => {
                    const IconComponent = getStrategyIcon(strategy.key);
                    return (
                      <button
                        key={strategy.id}
                        onClick={() => setProfile({ ...profile, strategy_id: strategy.id })}
                        className={cn(
                          "w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3",
                          profile.strategy_id === strategy.id
                            ? "border-primary bg-primary/5"
                            : "border-border/80 hover:border-primary/50 bg-card"
                        )}
                      >
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted/50">
                          <IconComponent className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-sm block">{strategy.label}</span>
                          {strategy.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">{strategy.description}</span>
                          )}
                        </div>
                        {profile.strategy_id === strategy.id && (
                          <Check className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-medium text-lg mb-2">Fique por dentro!</h3>
              <p className="text-sm text-muted-foreground">
                Receba lembretes de hidratação e alertas sobre suas refeições para manter sua saúde em dia.
              </p>
            </div>

            {!isPushSupported ? (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <BellOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Notificações não são suportadas neste navegador
                </p>
              </div>
            ) : pushPermission === "denied" ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive text-center">
                  Notificações foram bloqueadas. Para ativar, vá nas configurações do navegador.
                </p>
              </div>
            ) : isPushSubscribed ? (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-primary text-center flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Notificações ativadas!
                </p>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full h-14"
                onClick={async () => {
                  const success = await subscribePush();
                  if (success) {
                    localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, "true");
                  }
                }}
              >
                <Bell className="w-5 h-5 mr-2" />
                Ativar Notificações
              </Button>
            )}

            <button
              onClick={() => {
                localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, new Date().toISOString());
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
            >
              Agora não
            </button>
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
        <Button 
          size="lg" 
          onClick={handleNext} 
          disabled={isLoading}
          className="flex-1 h-12 bg-primary hover:bg-primary/90"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : currentStep === 7 ? (
            <Check className="w-4 h-4 mr-2" />
          ) : null}
          {currentStep === 7 ? "Concluir" : "Próximo"}
          {currentStep < 7 && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </footer>
    </div>
  );
}
