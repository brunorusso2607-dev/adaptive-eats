import { useState, useEffect, useMemo } from "react";
import { useSwipeToClose } from "@/hooks/use-swipe-to-close";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SafeAreaFooter } from "@/components/ui/safe-area-footer";
import { 
  User, Crown, Star, Mail, Scale, Ruler, Calendar, 
  Activity, Target, AlertCircle, Utensils, LogOut,
  TrendingDown, TrendingUp, Pencil, X, Check, Loader2, Plus, Ban, Dumbbell, Sparkles
} from "lucide-react";
import PhysicalDataInputs from "./PhysicalDataInputs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useNutritionalStrategies, deriveGoalFromStrategy } from "@/hooks/useNutritionalStrategies";
import { useSafetyLabels } from "@/hooks/useSafetyLabels";
import { useOnboardingOptions } from "@/hooks/useOnboardingOptions";

type UserProfile = {
  dietary_preference: string | null;
  goal: string | null;
  strategy_id: string | null;
  weight_current: number | null;
  weight_goal: number | null;
  height: number | null;
  age: number | null;
  sex: string | null;
  activity_level: string | null;
  intolerances: string[] | null;
  excluded_ingredients: string[] | null;
};

type SubscriptionInfo = {
  subscribed: boolean;
  plan: string | null;
  status: string | null;
  subscription_end: string | null;
};

type UserAccountMenuProps = {
  user: SupabaseUser | null;
  subscription: SubscriptionInfo | null;
  onLogout: () => void;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
};

// Labels estáticos que não vêm do DB (activity, sex, goal display)
const STATIC_LABELS = {
  goal: {
    lose_weight: "Emagrecer",
    maintain: "Manter peso",
    gain_weight: "Ganhar peso",
  },
  activity_level: {
    sedentary: "Sedentário",
    light: "Leve",
    moderate: "Moderado",
    active: "Ativo",
    very_active: "Muito ativo",
  },
  sex: {
    male: "Masculino",
    female: "Feminino",
  },
};

// Componente para editar alimentos excluídos no menu
function ExcludedIngredientsEditorMenu({ 
  value, 
  onChange 
}: { 
  value: string[]; 
  onChange: (ingredients: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  const addIngredient = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue("");
    }
  };

  const removeIngredient = (ingredient: string) => {
    onChange(value.filter(i => i !== ingredient));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addIngredient();
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Ban className="w-4 h-4 text-orange-500" />
        Alimentos que não consome
      </h3>
      <p className="text-xs text-muted-foreground">
        Adicione alimentos que você não consome por preferência pessoal
      </p>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ex: carne de porco, fígado..."
          className="flex-1"
        />
        <Button 
          type="button" 
          variant="outline" 
          size="icon"
          onClick={addIngredient}
          disabled={!inputValue.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((ingredient) => (
            <Badge
              key={ingredient}
              variant="secondary"
              className="bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800 pr-1"
            >
              {ingredient}
              <button
                type="button"
                onClick={() => removeIngredient(ingredient)}
                className="ml-1 hover:text-orange-900 dark:hover:text-orange-300"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UserAccountMenu({ user, subscription, onLogout, externalOpen, onExternalOpenChange }: UserAccountMenuProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { data: strategies } = useNutritionalStrategies();
  const { getIntoleranceLabel, getDietaryLabel, dietaryLabels } = useSafetyLabels();
  const { data: onboardingOptions } = useOnboardingOptions();

  // Memoize intolerance options from DB
  const intoleranceOptionsFormatted = useMemo(() => {
    const intolerances = onboardingOptions?.intolerances || [];
    return intolerances
      .filter(opt => opt.option_id !== 'nenhuma' && opt.option_id !== 'none')
      .map(opt => ({
        id: opt.option_id,
        label: opt.label
      }));
  }, [onboardingOptions]);

  // Memoize dietary labels from DB
  const dietaryPreferenceLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    const dietaryOptions = onboardingOptions?.dietary_preferences || [];
    dietaryOptions.forEach(opt => {
      labels[opt.option_id] = opt.label;
    });
    // Fallback comum se não tiver no DB
    if (!labels['comum']) labels['comum'] = 'Comum';
    return labels;
  }, [onboardingOptions]);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (onExternalOpenChange) {
      onExternalOpenChange(open);
    } else {
      setInternalOpen(open);
    }
  };

  // Swipe handler to close the sheet with visual feedback
  const { handlers: swipeHandlers, style: swipeStyle, isDragging, isExiting } = useSwipeToClose({
    onClose: () => setIsOpen(false),
    direction: "right",
    threshold: 100,
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchProfile();
    }
  }, [isOpen, user]);

  const fetchProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("dietary_preference, goal, strategy_id, weight_current, weight_goal, height, age, sex, activity_level, intolerances, excluded_ingredients")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        setEditedProfile(data);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !editedProfile) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          dietary_preference: editedProfile.dietary_preference as any,
          goal: editedProfile.goal as any,
          strategy_id: editedProfile.strategy_id,
          weight_current: editedProfile.weight_current ? Number(editedProfile.weight_current) : null,
          weight_goal: editedProfile.weight_goal ? Number(editedProfile.weight_goal) : null,
          height: editedProfile.height ? Number(editedProfile.height) : null,
          age: editedProfile.age ? Number(editedProfile.age) : null,
          sex: editedProfile.sex,
          activity_level: editedProfile.activity_level,
          intolerances: editedProfile.intolerances,
          excluded_ingredients: editedProfile.excluded_ingredients,
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile(editedProfile);
      setIsEditing(false);
      toast.success("Dados atualizados com sucesso!");
    } catch (err) {
      console.error("Error saving profile:", err);
      toast.error("Erro ao salvar dados");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const toggleIntolerance = (id: string) => {
    if (!editedProfile) return;
    const current = editedProfile.intolerances || [];
    const updated = current.includes(id)
      ? current.filter(i => i !== id)
      : [...current, id];
    setEditedProfile({ ...editedProfile, intolerances: updated });
  };

  const getLabel = (category: keyof typeof STATIC_LABELS, value: string | null) => {
    if (!value) return "Não definido";
    return (STATIC_LABELS[category] as Record<string, string>)[value] || value;
  };

  const planName = subscription?.plan === "premium" ? "Premium" : subscription?.plan === "essencial" ? "Essencial" : null;
  const PlanIcon = subscription?.plan === "premium" ? Crown : Star;

  const renderEditMode = () => {
    if (!editedProfile) return null;

    return (
      <div className="space-y-6">
        {/* Dados Físicos - Componente Reutilizável */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Dados Físicos
          </h3>
          <PhysicalDataInputs
            data={{
              weight_current: editedProfile.weight_current,
              weight_goal: editedProfile.weight_goal,
              height: editedProfile.height,
              age: editedProfile.age,
              sex: editedProfile.sex,
              activity_level: editedProfile.activity_level,
            }}
            onChange={(newData) => setEditedProfile({
              ...editedProfile,
              ...newData,
            })}
            showWeightGoal={true}
          />
        </div>

        {/* Objetivo (Estratégia Nutricional) */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Objetivo (Estratégia Nutricional)
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {strategies?.map((strategy) => {
              const getIcon = (key: string) => {
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
              const IconComponent = getIcon(strategy.key);
              return (
                <button
                  type="button"
                  key={strategy.id}
                  onClick={() => {
                    const derivedGoal = deriveGoalFromStrategy(strategy.key);
                    setEditedProfile({ 
                      ...editedProfile, 
                      strategy_id: strategy.id,
                      goal: derivedGoal
                    });
                  }}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all touch-manipulation flex items-center gap-3",
                    editedProfile.strategy_id === strategy.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  )}
                >
                  <IconComponent className={cn("w-4 h-4", editedProfile.strategy_id === strategy.id ? "text-primary" : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm block">{strategy.label}</span>
                    {strategy.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">{strategy.description}</span>
                    )}
                  </div>
                  {editedProfile.strategy_id === strategy.id && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferências Alimentares */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Utensils className="w-4 h-4 text-primary" />
            Preferências Alimentares
          </h3>
          
          {/* Dieta */}
          <div className="space-y-1">
            <Label className="text-xs">Dieta</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(dietaryPreferenceLabels).map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setEditedProfile({ ...editedProfile, dietary_preference: id })}
                  className={cn(
                    "p-2 rounded-lg border text-sm transition-all touch-manipulation",
                    editedProfile.dietary_preference === id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Restrições */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            Restrições e Condições
          </h3>
          <div className="flex flex-wrap gap-2">
            {intoleranceOptionsFormatted.map((opt) => {
              const isSelected = (editedProfile.intolerances || []).includes(opt.id);
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => toggleIntolerance(opt.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation",
                    isSelected 
                      ? "bg-destructive/20 text-destructive border border-destructive/30" 
                      : "bg-muted text-muted-foreground border border-border hover:border-destructive/50"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Alimentos que não consome */}
        <ExcludedIngredientsEditorMenu 
          value={editedProfile.excluded_ingredients || []}
          onChange={(ingredients) => setEditedProfile({ ...editedProfile, excluded_ingredients: ingredients })}
        />

        {/* Botões de ação - com safe-area para dispositivos móveis */}
        <SafeAreaFooter sticky className="mt-4 -mx-6 px-6">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12" onClick={handleCancel} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button className="flex-1 h-12" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </SafeAreaFooter>
      </div>
    );
  };

  const renderViewMode = () => {
    if (!profile) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Perfil não encontrado
        </div>
      );
    }

    return (
      <>
        {/* Botão Editar */}
        <Button 
          className="w-full bg-primary text-primary-foreground hover:bg-[#D3D3D3] hover:text-foreground" 
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Editar dados
        </Button>

        {/* Meta de Peso */}
        {(profile.strategy_id || (profile.goal && profile.goal !== "maintain")) && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Meta de Peso
            </h3>
            {(() => {
              const selectedStrategy = strategies?.find(s => s.id === profile.strategy_id);
              const derivedGoal = selectedStrategy ? deriveGoalFromStrategy(selectedStrategy.key) : profile.goal;
              const isLossGoal = derivedGoal === "lose_weight";
              
              return (
                <div className={cn(
                  "p-3 rounded-xl border",
                  isLossGoal 
                    ? "border-green-400/50 bg-green-50/50 dark:bg-green-950/20"
                    : "border-blue-400/50 bg-blue-50/50 dark:bg-blue-950/20"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {isLossGoal ? (
                      <TrendingDown className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    )}
                    <span className="font-medium text-sm">
                      {selectedStrategy?.label || getLabel("goal", profile.goal)}
                    </span>
                  </div>
                  {profile.weight_current && profile.weight_goal && (
                    <p className="text-xs text-muted-foreground">
                      {profile.weight_current}kg → {profile.weight_goal}kg
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Dados Físicos */}
        {(profile.height || profile.age || profile.sex) && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Dados Físicos
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {profile.height && (
                <div className="p-2 rounded-lg bg-muted/50 text-center">
                  <Ruler className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium">{profile.height}cm</p>
                  <p className="text-xs text-muted-foreground">Altura</p>
                </div>
              )}
              {profile.age && (
                <div className="p-2 rounded-lg bg-muted/50 text-center">
                  <Calendar className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium">{profile.age} anos</p>
                  <p className="text-xs text-muted-foreground">Idade</p>
                </div>
              )}
              {profile.weight_current && (
                <div className="p-2 rounded-lg bg-muted/50 text-center">
                  <Scale className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium">{profile.weight_current}kg</p>
                  <p className="text-xs text-muted-foreground">Peso atual</p>
                </div>
              )}
              {profile.sex && (
                <div className="p-2 rounded-lg bg-muted/50 text-center">
                  <User className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium">{getLabel("sex", profile.sex)}</p>
                  <p className="text-xs text-muted-foreground">Sexo</p>
                </div>
              )}
            </div>
            {profile.activity_level && (
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Nível de atividade</p>
                <p className="text-sm font-medium">{getLabel("activity_level", profile.activity_level)}</p>
              </div>
            )}
          </div>
        )}

        {/* Preferências Alimentares */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Utensils className="w-4 h-4 text-primary" />
            Preferências Alimentares
          </h3>
          <div className="space-y-2">
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Dieta</p>
              <p className="text-sm font-medium">{dietaryPreferenceLabels[profile.dietary_preference || ''] || getDietaryLabel(profile.dietary_preference || '') || 'Não definido'}</p>
            </div>
          </div>
        </div>

        {/* Intolerâncias e Restrições */}
        {profile.intolerances && profile.intolerances.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Restrições e Condições
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.intolerances.map((item) => (
                <span 
                  key={item} 
                  className="px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20"
                >
                  {getIntoleranceLabel(item)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Alimentos que não consome */}
        {profile.excluded_ingredients && profile.excluded_ingredients.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Ban className="w-4 h-4 text-orange-500" />
              Alimentos que não consome
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.excluded_ingredients.map((item) => (
                <span 
                  key={item} 
                  className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Logout */}
        <Button 
          className="w-full bg-primary text-primary-foreground hover:bg-[#D3D3D3] hover:text-foreground" 
          onClick={() => {
            setIsOpen(false);
            onLogout();
          }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da conta
        </Button>
      </>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) setIsEditing(false);
    }}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <User className="w-5 h-5" />
          {subscription?.subscribed && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto overflow-x-hidden">
        <div {...swipeHandlers} style={swipeStyle} className={`h-full ${isDragging ? 'select-none' : ''}`}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {isEditing ? "Editar Perfil" : "Minha Conta"}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
          {/* Email */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium text-sm">{user?.email}</p>
            </div>
          </div>

          {/* Plano */}
          {subscription?.subscribed && !isEditing && (
            <div className={cn(
              "p-4 rounded-xl border-2",
              subscription.plan === "premium" 
                ? "border-amber-400/50 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30"
                : "border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  subscription.plan === "premium" 
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500"
                    : "bg-gradient-to-r from-primary to-primary/80"
                )}>
                  <PlanIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold">Plano {planName}</p>
                  {subscription.status === "trialing" && (
                    <p className="text-xs text-muted-foreground">Período de trial</p>
                  )}
                  {subscription.subscription_end && (
                    <p className="text-xs text-muted-foreground">
                      Válido até {new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando dados...
            </div>
          ) : isEditing ? (
            renderEditMode()
          ) : (
            renderViewMode()
          )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
