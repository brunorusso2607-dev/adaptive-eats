import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ChefHat, ArrowRight, ArrowLeft, Check, Loader2, LogOut, X, Plus, Bell, BellOff, Globe, Dumbbell, TrendingDown, TrendingUp, Scale, Utensils, Sparkles, Info, Ruler, Calendar, User
} from "lucide-react";
import PhysicalDataInputs, { type PhysicalData } from "@/components/PhysicalDataInputs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useOnboardingOptions, useRestrictionCategories, type OnboardingOption, type OnboardingOptionsMap } from "@/hooks/useOnboardingOptions";
import { getOnboardingIcon } from "@/lib/iconUtils";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useNutritionalStrategies, deriveGoalFromStrategy, type NutritionalStrategy } from "@/hooks/useNutritionalStrategies";
import { useActiveOnboardingCountries } from "@/hooks/useOnboardingCountries";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { RestrictionCategoryStep } from "@/components/onboarding/RestrictionCategoryStep";

const PUSH_PROMPT_DISMISSED_KEY = "push_prompt_dismissed";

type ProfileData = {
  country: string;
  intolerances: string[];
  excluded_ingredients: string[];
  goal: string;
  strategy_id: string | null;
  // Physical data
  weight_current: number | null;
  weight_goal: number | null;
  height: number | null;
  age: number | null;
  sex: string | null;
  activity_level: string | null;
};

// Base steps - step 1 (country) may be skipped based on feature flag
const BASE_STEPS = [
  { id: 1, title: "Sua região", description: "De qual país você é?", skippable: true },
  { id: 2, title: "Intolerâncias", description: "Você tem alguma intolerância?", skippable: false, categoryKey: "intolerances" },
  { id: 3, title: "Alimentos", description: "Tem algum alimento que você não consome?", skippable: false },
  { id: 4, title: "Objetivo", description: "Defina sua estratégia e seus dados físicos", skippable: false },
  { id: 5, title: "Notificações", description: "Receba lembretes importantes", skippable: false },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    country: "BR",
    intolerances: [],
    excluded_ingredients: [],
    goal: "maintain",
    strategy_id: null,
    weight_current: null,
    weight_goal: null,
    height: null,
    age: null,
    sex: null,
    activity_level: null,
  });
  const [ingredientInput, setIngredientInput] = useState("");

  const { data: options, isLoading: isLoadingOptions } = useOnboardingOptions();
  const { data: restrictionCategories, isLoading: isLoadingCategories } = useRestrictionCategories();
  const { data: strategies, isLoading: isLoadingStrategies } = useNutritionalStrategies();
  const { data: activeCountries, isLoading: isLoadingCountries } = useActiveOnboardingCountries();
  const { isEnabled: showCountrySelection, isLoading: isLoadingFlag } = useFeatureFlag("show_country_selection");
  const { 
    isSupported: isPushSupported, 
    isSubscribed: isPushSubscribed, 
    permission: pushPermission,
    subscribe: subscribePush 
  } = usePushSubscription();

  // Compute visible steps based on country selection visibility
  const STEPS = useMemo(() => {
    if (showCountrySelection) {
      return BASE_STEPS;
    }
    // Skip country step - renumber remaining steps
    return BASE_STEPS.filter(s => !s.skippable).map((s, idx) => ({
      ...s,
      id: idx + 1,
    }));
  }, [showCountrySelection]);

  const totalSteps = STEPS.length;

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
    if (currentStep < totalSteps) {
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
          excluded_ingredients: profile.excluded_ingredients,
          goal: profile.goal as any,
          strategy_id: profile.strategy_id,
          weight_current: profile.weight_current,
          weight_goal: profile.weight_goal,
          height: profile.height,
          age: profile.age,
          sex: profile.sex,
          activity_level: profile.activity_level,
          timezone: detectedTimezone,
          onboarding_completed: true,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      toast.success("Perfil configurado com sucesso!");
      // Redirecionar para página de instalação do app (com instruções iOS/Android)
      navigate("/ativar");
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
    if (isLoadingOptions || isLoadingCategories || !options) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }

    // Map current step to original step logic based on whether country selection is shown
    const getOriginalStepNumber = () => {
      if (showCountrySelection) {
        return currentStep;
      }
      // If country selection is hidden, step 1 becomes step 2, etc.
      return currentStep + 1;
    };

    const originalStep = getOriginalStepNumber();

    switch (originalStep) {
      case 1:
        // Country selection - only shown if flag is enabled
        if (!showCountrySelection) return null;
        
        return (
          <div className="space-y-4">
            <div className="text-center py-2">
              <Globe className="w-12 h-12 mx-auto mb-3 text-primary" />
              <p className="text-sm text-muted-foreground">
                Isso nos ajuda a sugerir alimentos e refeições populares na sua região.
              </p>
            </div>
            {isLoadingCountries ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto">
                {activeCountries?.map((country) => (
                  <button
                    key={country.country_code}
                    onClick={() => setProfile({ ...profile, country: country.country_code })}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all flex items-center gap-3",
                      profile.country === country.country_code
                        ? "border-primary bg-primary/5"
                        : "border-border/80 hover:border-primary/50 bg-card"
                    )}
                  >
                    <span className="text-2xl">{country.flag_emoji}</span>
                    <span className="font-medium text-sm">{country.country_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 2:
        // Intolerances step only
        const intoleranceColors = { 
          dot: "bg-amber-500", 
          border: "border-amber-500", 
          bg: "bg-amber-500/10", 
          hover: "hover:border-amber-500/50" 
        };
        const intoleranceOptions = options.intolerances || [];
        const intoleranceInfo = restrictionCategories?.find(c => c.category_key === "intolerances");

        return (
          <RestrictionCategoryStep
            categoryLabel={intoleranceInfo?.label || "Intolerâncias"}
            categoryDescription={intoleranceInfo?.description || undefined}
            options={intoleranceOptions}
            selectedItems={profile.intolerances}
            onToggle={toggleIntolerance}
            colorScheme={intoleranceColors}
          />
        );

      case 3:
        return (
          <div className="space-y-5">
            {/* Info callout about automatic exclusions */}
            <div className="flex gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">
                O sistema já está excluindo automaticamente todos os ingredientes relacionados às suas intolerâncias.
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Aqui você pode adicionar alimentos que simplesmente não gosta ou prefere evitar por outras razões.
            </p>
            
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
                <p className="text-xs text-muted-foreground font-medium">Adicionados:</p>
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
          </div>
        );

      case 4:
        const getStrategyIcon = (key: string) => {
          switch (key) {
            case "lose_weight":
            case "weight_loss": return TrendingDown;
            case "cutting": return Dumbbell;
            case "maintain":
            case "maintenance": return Scale;
            case "fitness": return Dumbbell;
            case "gain_weight":
            case "weight_gain": return TrendingUp;
            case "flexible_diet": return Utensils;
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

        const handleStrategySelect = (strategy: NutritionalStrategy) => {
          const derivedGoal = deriveGoalFromStrategy(strategy.key);
          setProfile({ 
            ...profile, 
            strategy_id: strategy.id,
            goal: derivedGoal
          });
        };

        const handlePhysicalDataChange = (physicalData: PhysicalData) => {
          setProfile({
            ...profile,
            ...physicalData,
          });
        };

        // Determine if we should show weight_goal based on strategy
        const selectedStrategy = strategies.find(s => s.id === profile.strategy_id);
        const showWeightGoal = selectedStrategy?.key === 'weight_loss' || selectedStrategy?.key === 'weight_gain';

        return (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
            {/* Strategy Selection */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Escolha sua estratégia nutricional
              </p>
              <div className="grid grid-cols-1 gap-2">
                {strategies.map((strategy) => {
                  const IconComponent = getStrategyIcon(strategy.key);
                  return (
                    <button
                      key={strategy.id}
                      onClick={() => handleStrategySelect(strategy)}
                      className={cn(
                        "w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3",
                        profile.strategy_id === strategy.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border/80 hover:border-primary/50 bg-card"
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 flex items-center justify-center rounded-lg shrink-0",
                        profile.strategy_id === strategy.id ? "bg-primary/10" : "bg-muted/50"
                      )}>
                        <IconComponent className={cn(
                          "w-4 h-4",
                          profile.strategy_id === strategy.id ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium block text-sm">{strategy.label}</span>
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

            {/* Physical Data - Only show after strategy is selected */}
            {profile.strategy_id && (
              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Seus dados físicos</p>
                </div>
                <PhysicalDataInputs
                  data={{
                    weight_current: profile.weight_current,
                    weight_goal: profile.weight_goal,
                    height: profile.height,
                    age: profile.age,
                    sex: profile.sex,
                    activity_level: profile.activity_level,
                  }}
                  onChange={handlePhysicalDataChange}
                  showWeightGoal={showWeightGoal}
                />
              </div>
            )}
          </div>
        );

      case 5:
        // Helper to complete onboarding from this step
        const handleCompleteFromNotifications = async () => {
          localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, "true");
          await handleComplete();
        };

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
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <BellOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Notificações não são suportadas neste navegador
                  </p>
                </div>
                <Button
                  size="lg"
                  className="w-full h-14"
                  onClick={handleCompleteFromNotifications}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Concluir
                </Button>
              </div>
            ) : pushPermission === "denied" ? (
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm text-destructive text-center">
                    Notificações foram bloqueadas. Para ativar, vá nas configurações do navegador.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="w-full h-14"
                  onClick={handleCompleteFromNotifications}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Concluir
                </Button>
              </div>
            ) : isPushSubscribed ? (
              <div className="space-y-4">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm text-primary text-center flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Notificações ativadas!
                  </p>
                </div>
                <Button
                  size="lg"
                  className="w-full h-14"
                  onClick={handleCompleteFromNotifications}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Concluir
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  size="lg"
                  className="w-full h-14"
                  onClick={async () => {
                    const success = await subscribePush();
                    if (success) {
                      localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, "true");
                      await handleComplete();
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className="w-5 h-5 mr-2" />}
                  Ativar Notificações
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full h-12 text-muted-foreground hover:text-foreground"
                  onClick={handleCompleteFromNotifications}
                  disabled={isLoading}
                >
                  Pular
                </Button>
              </div>
            )}
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

      {/* Footer Navigation - Hidden on last step (notifications) */}
      {currentStep < totalSteps && (
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
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {(() => {
              // Dynamic button text based on step
              const getOriginalStep = () => showCountrySelection ? currentStep : currentStep + 1;
              const origStep = getOriginalStep();
              
              // Step 2: Intolerâncias - única categoria de restrição
              if (origStep === 2) {
                const intoleranceOptions = options?.intolerances || [];
                const hasSelectedIntolerances = profile.intolerances.some(
                  id => intoleranceOptions.some((opt: OnboardingOption) => opt.option_id === id && opt.option_id !== 'none')
                );
                
                if (hasSelectedIntolerances) {
                  return (
                    <>
                      Próximo
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  );
                }
                
                return "Não tenho nenhuma intolerância";
              }
              
              // Step 3: Alimentos excluídos - pode pular
              if (origStep === 3) {
                if (profile.excluded_ingredients.length === 0) {
                  return "Pular";
                }
                return (
                  <>
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                );
              }
              
              // Step 4: Objetivo - sempre "Continuar"
              if (origStep === 4) {
                return (
                  <>
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                );
              }
              
              // Default: Próximo (para step 1 - país)
              return (
                <>
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              );
            })()}
          </Button>
        </footer>
      )}
    </div>
  );
}
