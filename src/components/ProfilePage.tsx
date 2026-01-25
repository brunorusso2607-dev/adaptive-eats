import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SafeAreaFooter } from "@/components/ui/safe-area-footer";
import { 
  User, Crown, Star, Mail, Scale, Ruler, Calendar, 
  Activity, Target, AlertCircle, Utensils, LogOut,
  TrendingDown, TrendingUp, Pencil, X, Check, Loader2, Plus, Ban, ArrowLeft, FileText, Shield, ExternalLink, Bell, Heart, Clock, Dumbbell, Sparkles, Globe
} from "lucide-react";
import PhysicalDataInputs from "./PhysicalDataInputs";
import { Link } from "react-router-dom";
import LegalDisclaimer from "./LegalDisclaimer";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import RecipeList from "./RecipeList";
import { useOnboardingOptions, getOptionLabel } from "@/hooks/useOnboardingOptions";
import { CustomMealTimesEditor, type CustomMealTimes } from "@/components/CustomMealTimesEditor";
import { Json } from "@/integrations/supabase/types";
import { useNutritionalStrategies, deriveGoalFromStrategy } from "@/hooks/useNutritionalStrategies";
import { StrategyAccordion } from "@/components/StrategyAccordion";
import { useActiveOnboardingCountries } from "@/hooks/useOnboardingCountries";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type UserProfile = {
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
  default_meal_times: CustomMealTimes | null;
  enabled_meals: string[] | null;
  country: string | null;
};

// Fallback countries with their food sources (used when database is loading)
const FALLBACK_COUNTRIES = [
  { code: "BR", label: "🇧🇷 Brasil", sources: "TBCA, TACO" },
  { code: "US", label: "🇺🇸 Estados Unidos", sources: "USDA" },
  { code: "PT", label: "🇵🇹 Portugal", sources: "TBCA, TACO" },
  { code: "GB", label: "🇬🇧 Reino Unido", sources: "McCance" },
  { code: "FR", label: "🇫🇷 França", sources: "CIQUAL" },
  { code: "MX", label: "🇲🇽 México", sources: "BAM" },
  { code: "ES", label: "🇪🇸 Espanha", sources: "AESAN" },
  { code: "DE", label: "🇩🇪 Alemanha", sources: "BLS" },
  { code: "IT", label: "🇮🇹 Itália", sources: "CREA" },
  { code: "AR", label: "🇦🇷 Argentina", sources: "TBCA" },
  { code: "CO", label: "🇨🇴 Colômbia", sources: "TBCA" },
];

// Map nutritional sources to country codes
const COUNTRY_SOURCES: Record<string, string> = {
  "BR": "TBCA, TACO",
  "US": "USDA",
  "PT": "TBCA, TACO",
  "GB": "McCance",
  "FR": "CIQUAL",
  "MX": "BAM",
  "ES": "AESAN",
  "DE": "BLS",
  "IT": "CREA",
  "AR": "TBCA",
  "CO": "TBCA",
};

type SubscriptionInfo = {
  subscribed: boolean;
  plan: string | null;
  status: string | null;
  subscription_end: string | null;
};

type ProfilePageProps = {
  user: SupabaseUser | null;
  subscription: SubscriptionInfo | null;
  onLogout: () => void;
  onBack?: () => void;
  onProfileUpdated?: () => void;
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentário",
  light: "Leve",
  moderate: "Moderado",
  active: "Ativo",
  very_active: "Muito ativo",
};

const SEX_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Feminino",
};

// Componente para editar alimentos excluídos
function ExcludedIngredientsEditor({ 
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

export default function ProfilePage({ user, subscription, onLogout, onBack, onProfileUpdated }: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSendingTestNotification, setIsSendingTestNotification] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [conflictPulse, setConflictPulse] = useState(false);
  const conflictAlertRef = useRef<HTMLDivElement>(null);

  const sendTestNotification = async () => {
    setIsSendingTestNotification(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-test-notification");
      if (error) throw error;
      toast.success("Notificação de teste enviada! Verifique seu dispositivo.");
    } catch (err) {
      console.error("Error sending test notification:", err);
      toast.error("Erro ao enviar notificação de teste");
    } finally {
      setIsSendingTestNotification(false);
    }
  };

  const { data: onboardingOptions } = useOnboardingOptions();
  const { data: strategies } = useNutritionalStrategies();
  const { data: activeCountries, isLoading: isLoadingCountries } = useActiveOnboardingCountries();

  // Merge active countries from DB with fallback for display
  const displayCountries = activeCountries?.map(c => ({
    code: c.country_code,
    label: `${c.flag_emoji} ${c.country_name}`,
    sources: COUNTRY_SOURCES[c.country_code] || "Padrão"
  })) || FALLBACK_COUNTRIES;

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("goal, strategy_id, weight_current, weight_goal, height, age, sex, activity_level, intolerances, excluded_ingredients, default_meal_times, enabled_meals, country")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        const profileData: UserProfile = {
          ...data,
          strategy_id: data.strategy_id,
          default_meal_times: data.default_meal_times as CustomMealTimes | null,
          enabled_meals: data.enabled_meals,
          country: data.country,
        };
        setProfile(profileData);
        setEditedProfile(profileData);
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
          default_meal_times: editedProfile.default_meal_times as any,
          enabled_meals: editedProfile.enabled_meals,
          country: editedProfile.country,
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile(editedProfile);
      setIsEditing(false);
      toast.success("Dados atualizados com sucesso!");
      
      // Notificar o Dashboard para atualizar seus estados
      onProfileUpdated?.();
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

  const getProfileLabel = (category: "goals", value: string | null) => {
    if (!value) return "Não definido";
    return getOptionLabel(onboardingOptions, category, value);
  };

  const handleSaveDefaultMealTimes = async (times: CustomMealTimes | null, enabledMeals?: string[] | null): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          default_meal_times: times as Json,
          enabled_meals: enabledMeals ?? null
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, default_meal_times: times, enabled_meals: enabledMeals ?? null } : prev);
      toast.success("Horários padrão salvos!");
      
      // Notificar o Dashboard para atualizar seus estados
      onProfileUpdated?.();
      
      return true;
    } catch (err) {
      console.error("Error saving default meal times:", err);
      toast.error("Erro ao salvar horários");
      return false;
    }
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
          {(() => {
            // Verifica se a estratégia selecionada é "maintenance" para esconder o campo de peso meta
            const selectedStrategy = strategies?.find(s => s.id === editedProfile.strategy_id);
            const isMaintenance = selectedStrategy?.key === "maintain" || selectedStrategy?.key === "maintenance";
            
            return (
              <PhysicalDataInputs
                data={{
                  weight_current: editedProfile.weight_current,
                  weight_goal: isMaintenance ? editedProfile.weight_current : editedProfile.weight_goal,
                  height: editedProfile.height,
                  age: editedProfile.age,
                  sex: editedProfile.sex,
                  activity_level: editedProfile.activity_level,
                }}
                onChange={(newData) => setEditedProfile({
                  ...editedProfile,
                  ...newData,
                  // Se for manutenção, peso meta = peso atual
                  weight_goal: isMaintenance ? newData.weight_current : newData.weight_goal,
                })}
                showWeightGoal={!isMaintenance}
              />
            );
          })()}
        </div>

        {/* Objetivo (Estratégia Nutricional) */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Objetivo (Estratégia Nutricional)
          </h3>
          <StrategyAccordion
            strategies={strategies || []}
            selectedStrategyId={editedProfile.strategy_id}
            onSelectStrategy={(strategy) => {
              const derivedGoal = deriveGoalFromStrategy(strategy.key);
              setEditedProfile({ 
                ...editedProfile, 
                strategy_id: strategy.id,
                goal: derivedGoal
              });
            }}
          />
        </div>

        {/* Restrições - 3 categorias */}
        <div className="space-y-4">
          {/* Intolerâncias */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              Intolerâncias
              <span className="text-xs text-muted-foreground font-normal">(digestivas)</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {onboardingOptions?.intolerances
                .filter(opt => opt.option_id !== "none" && opt.option_id !== "nenhuma")
                .map((opt) => {
                  const isSelected = (editedProfile.intolerances || []).includes(opt.option_id);
                  return (
                    <button
                      type="button"
                      key={opt.option_id}
                      onClick={() => toggleIntolerance(opt.option_id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation",
                        isSelected 
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30" 
                          : "bg-muted text-muted-foreground border border-border hover:border-amber-500/50"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
            </div>
          </div>

        </div>

        {/* Alimentos que não consome */}
        <ExcludedIngredientsEditor 
          value={editedProfile.excluded_ingredients || []}
          onChange={(ingredients) => setEditedProfile({ ...editedProfile, excluded_ingredients: ingredients })}
        />

        {/* País / Região para busca de alimentos */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            País / Região
          </h3>
          <p className="text-xs text-muted-foreground">
            A busca de alimentos mostrará ingredientes da base de dados do país selecionado
          </p>
          <div className="grid grid-cols-2 gap-2">
            {displayCountries.map((country) => (
              <button
                type="button"
                key={country.code}
                onClick={() => setEditedProfile({ ...editedProfile, country: country.code })}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all touch-manipulation",
                  editedProfile.country === country.code 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="font-medium text-sm block">{country.label}</span>
                <span className="text-xs text-muted-foreground">{country.sources}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Validação de conflito de peso */}
        {(() => {
          const selectedStrategy = strategies?.find(s => s.id === editedProfile.strategy_id);
          const strategyKey = selectedStrategy?.key;
          const currentWeight = editedProfile.weight_current;
          const goalWeight = editedProfile.weight_goal;
          
          // Verifica conflitos apenas se temos pesos definidos
          if (currentWeight && goalWeight && strategyKey) {
            const isLossGoal = strategyKey === "lose_weight" || strategyKey === "weight_loss" || strategyKey === "cutting";
            const isGainGoal = strategyKey === "gain_weight" || strategyKey === "weight_gain" || strategyKey === "fitness";
            
            const hasConflict = 
              (isLossGoal && goalWeight >= currentWeight) ||
              (isGainGoal && goalWeight <= currentWeight);
            
            if (hasConflict) {
              return (
                <div 
                  ref={conflictAlertRef}
                  className={cn(
                    "p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm transition-all",
                    conflictPulse && "animate-[pulse-alert_0.3s_ease-in-out_2]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-medium">Objetivo contraditório</span>
                  </div>
                  <p className="mt-1 text-xs opacity-90">
                    {isLossGoal 
                      ? "Para emagrecer, o peso meta deve ser menor que o peso atual."
                      : "Para ganhar peso, o peso meta deve ser maior que o peso atual."}
                  </p>
                </div>
              );
            }
          }
          return null;
        })()}

        {/* Botões de ação */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1 h-12" onClick={handleCancel} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            className="flex-1 h-12" 
            onClick={() => {
              // Verifica se há conflito
              const selectedStrategy = strategies?.find(s => s.id === editedProfile.strategy_id);
              const strategyKey = selectedStrategy?.key;
              const currentWeight = editedProfile.weight_current;
              const goalWeight = editedProfile.weight_goal;
              
              if (currentWeight && goalWeight && strategyKey) {
                const isLossGoal = strategyKey === "lose_weight" || strategyKey === "weight_loss" || strategyKey === "cutting";
                const isGainGoal = strategyKey === "gain_weight" || strategyKey === "weight_gain" || strategyKey === "fitness";
                
                const hasConflict = 
                  (isLossGoal && goalWeight >= currentWeight) ||
                  (isGainGoal && goalWeight <= currentWeight);
                
                if (hasConflict) {
                  // Scroll até o alerta e piscar
                  conflictAlertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  setConflictPulse(true);
                  setTimeout(() => setConflictPulse(false), 600);
                  return;
                }
              }
              
              handleSave();
            }} 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </div>
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
      <div className="space-y-6">
        {/* Receitas Favoritas - Acesso rápido */}
        <button
          onClick={() => setShowFavorites(true)}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-xl",
            "bg-rose-500/5 border border-rose-500/20",
            "hover:bg-rose-500/10 hover:border-rose-500/30",
            "transition-all duration-200 active:scale-[0.98]"
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold text-sm text-foreground">Receitas Favoritas</p>
            <p className="text-xs text-muted-foreground">Suas receitas salvas</p>
          </div>
          <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
        </button>

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
                      {selectedStrategy?.label || getProfileLabel("goals", profile.goal)}
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
                  <p className="text-sm font-medium">{SEX_LABELS[profile.sex] || profile.sex}</p>
                  <p className="text-xs text-muted-foreground">Sexo</p>
                </div>
              )}
            </div>
            {profile.activity_level && (
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Nível de atividade</p>
                <p className="text-sm font-medium">{ACTIVITY_LABELS[profile.activity_level] || profile.activity_level}</p>
              </div>
            )}
          </div>
        )}

        {/* Restrições e Condições - Exibição */}
        {profile.intolerances && profile.intolerances.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Restrições e Condições
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.intolerances.map((item) => {
                const isIntolerance = onboardingOptions?.intolerances.some(o => o.option_id === item);
                const colorClasses = isIntolerance
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                  : "bg-destructive/10 text-destructive border-destructive/20";

                let label = item;
                const intoleranceOpt = onboardingOptions?.intolerances.find(o => o.option_id === item);
                label = intoleranceOpt?.label || item;

                return (
                  <span 
                    key={item} 
                    className={cn("px-3 py-1 rounded-full text-xs font-medium border", colorClasses)}
                  >
                    {label}
                  </span>
                );
              })}
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

        {/* País / Região */}
        {profile.country && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              País / Região
            </h3>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">
                {displayCountries.find(c => c.code === profile.country)?.label || profile.country}
              </p>
              <p className="text-xs text-muted-foreground">
                Base de dados: {displayCountries.find(c => c.code === profile.country)?.sources || COUNTRY_SOURCES[profile.country || "BR"] || "Padrão"}
              </p>
            </div>
          </div>
        )}

        {/* Horários Personalizados - Template para novos planos (Colapsável) */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="meal-times" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Horários das Refeições</span>
                <Badge variant="secondary" className="text-xs ml-1">
                  {profile.enabled_meals?.length || 6} ativas
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground mb-3">
                Defina seus horários preferidos. Eles serão usados como padrão ao criar novos planos alimentares.
              </p>
              <CustomMealTimesEditor
                customTimes={profile.default_meal_times}
                enabledMeals={profile.enabled_meals}
                onSave={handleSaveDefaultMealTimes}
                compact
                showEnableToggle
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Termos e Avisos Legais */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Termos e Avisos Legais
          </h3>
          <LegalDisclaimer variant="full" />
          
          {/* Links para páginas legais */}
          <div className="flex flex-col gap-2 pt-2">
            <Link 
              to="/termos-de-uso" 
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <FileText className="w-4 h-4" />
              Termos de Uso
              <ExternalLink className="w-3 h-3 ml-auto" />
            </Link>
            <Link 
              to="/politica-privacidade" 
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Shield className="w-4 h-4" />
              Política de Privacidade
              <ExternalLink className="w-3 h-3 ml-auto" />
            </Link>
          </div>
        </div>

        {/* Logout */}
        <Button 
          className="w-full bg-primary text-primary-foreground hover:bg-[#D3D3D3] hover:text-foreground" 
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da conta
        </Button>
      </div>
    );
  };

  // Se está mostrando favoritos, renderiza o RecipeList
  if (showFavorites) {
    return (
      <RecipeList
        type="favorites"
        onBack={() => setShowFavorites(false)}
        onSelectRecipe={() => {}}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        {/* Desktop back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="hidden md:flex items-center justify-center w-9 h-9 rounded-full hover:bg-accent transition-colors -ml-2"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <User className="w-5 h-5" />
        <h2 className="text-xl font-bold">{isEditing ? "Editar Perfil" : "Minha Conta"}</h2>
      </div>

      {/* Email */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
        <Mail className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="font-medium text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Test Notification Button */}
      {!isEditing && (
        <Button
          variant="outline"
          size="sm"
          onClick={sendTestNotification}
          disabled={isSendingTestNotification}
          className="w-full"
        >
          {isSendingTestNotification ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Bell className="h-4 w-4 mr-2" />
          )}
          Testar notificação push
        </Button>
      )}

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
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Carregando dados...
        </div>
      ) : isEditing ? (
        renderEditMode()
      ) : (
        renderViewMode()
      )}
    </div>
  );
}
