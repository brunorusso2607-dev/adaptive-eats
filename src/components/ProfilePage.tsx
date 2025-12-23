import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SafeAreaFooter } from "@/components/ui/safe-area-footer";
import { 
  User, Crown, Star, Mail, Scale, Ruler, Calendar, 
  Activity, Target, AlertCircle, Utensils, LogOut,
  TrendingDown, TrendingUp, Pencil, X, Check, Loader2, Plus, Ban
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useOnboardingOptions, getOptionLabel } from "@/hooks/useOnboardingOptions";

type UserProfile = {
  dietary_preference: string | null;
  goal: string | null;
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

type ProfilePageProps = {
  user: SupabaseUser | null;
  subscription: SubscriptionInfo | null;
  onLogout: () => void;
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

export default function ProfilePage({ user, subscription, onLogout }: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { data: onboardingOptions } = useOnboardingOptions();

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
        .select("dietary_preference, goal, weight_current, weight_goal, height, age, sex, activity_level, intolerances, excluded_ingredients")
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

  const getProfileLabel = (category: "dietary_preferences" | "goals", value: string | null) => {
    if (!value) return "Não definido";
    return getOptionLabel(onboardingOptions, category, value);
  };

  const planName = subscription?.plan === "premium" ? "Premium" : subscription?.plan === "essencial" ? "Essencial" : null;
  const PlanIcon = subscription?.plan === "premium" ? Crown : Star;

  const renderEditMode = () => {
    if (!editedProfile) return null;

    return (
      <div className="space-y-6">
        {/* Dados Físicos */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Dados Físicos
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Peso Atual (kg)</Label>
              <Input
                type="number"
                value={editedProfile.weight_current || ""}
                onChange={(e) => setEditedProfile({ ...editedProfile, weight_current: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="75"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Peso Meta (kg)</Label>
              <Input
                type="number"
                value={editedProfile.weight_goal || ""}
                onChange={(e) => setEditedProfile({ ...editedProfile, weight_goal: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="70"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Altura (cm)</Label>
              <Input
                type="number"
                value={editedProfile.height || ""}
                onChange={(e) => setEditedProfile({ ...editedProfile, height: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="175"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Idade</Label>
              <Input
                type="number"
                value={editedProfile.age || ""}
                onChange={(e) => setEditedProfile({ ...editedProfile, age: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="30"
              />
            </div>
          </div>

          {/* Sexo */}
          <div className="space-y-1">
            <Label className="text-xs">Sexo Biológico</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "male", label: "Masculino", color: "text-blue-500" }, 
                { id: "female", label: "Feminino", color: "text-pink-500" }
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setEditedProfile({ ...editedProfile, sex: opt.id })}
                  className={cn(
                    "p-2 rounded-lg border-2 text-center transition-all text-sm touch-manipulation flex items-center justify-center gap-1.5",
                    editedProfile.sex === opt.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  )}
                >
                  <User className={cn("w-4 h-4 stroke-[1.5]", opt.color)} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nível de Atividade */}
          <div className="space-y-1">
            <Label className="text-xs">Nível de Atividade</Label>
            <div className="grid grid-cols-1 gap-1">
              {Object.entries(ACTIVITY_LABELS).map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setEditedProfile({ ...editedProfile, activity_level: id })}
                  className={cn(
                    "p-2 rounded-lg border text-left text-sm transition-all flex items-center justify-between touch-manipulation",
                    editedProfile.activity_level === id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  )}
                >
                  <span>{label}</span>
                  {editedProfile.activity_level === id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Objetivo */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Objetivo
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "emagrecer", label: "Emagrecer", icon: TrendingDown, color: "green" },
              { id: "manter", label: "Manter", icon: null, color: "amber" },
              { id: "ganhar_peso", label: "Ganhar", icon: TrendingUp, color: "blue" },
            ].map((opt) => (
              <button
                type="button"
                key={opt.id}
                onClick={() => setEditedProfile({ ...editedProfile, goal: opt.id })}
                className={cn(
                  "p-2 rounded-lg border-2 text-center transition-all text-xs touch-manipulation",
                  editedProfile.goal === opt.id 
                    ? `border-${opt.color}-500 bg-${opt.color}-50 dark:bg-${opt.color}-950/30` 
                    : "border-border hover:border-primary/50"
                )}
              >
                {opt.icon && <opt.icon className={cn("w-4 h-4 mx-auto mb-1", editedProfile.goal === opt.id ? `text-${opt.color}-600` : "text-muted-foreground")} />}
                {opt.label}
              </button>
            ))}
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
              {onboardingOptions?.dietary_preferences.map((opt) => (
                <button
                  type="button"
                  key={opt.option_id}
                  onClick={() => setEditedProfile({ ...editedProfile, dietary_preference: opt.option_id })}
                  className={cn(
                    "p-2 rounded-lg border text-sm transition-all touch-manipulation",
                    editedProfile.dietary_preference === opt.option_id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  )}
                >
                  {opt.label}
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
        <ExcludedIngredientsEditor 
          value={editedProfile.excluded_ingredients || []}
          onChange={(ingredients) => setEditedProfile({ ...editedProfile, excluded_ingredients: ingredients })}
        />

        {/* Botões de ação */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1 h-12" onClick={handleCancel} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button className="flex-1 h-12" onClick={handleSave} disabled={isSaving}>
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
        {/* Botão Editar */}
        <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
          <Pencil className="w-4 h-4 mr-2" />
          Editar dados
        </Button>

        {/* Meta de Peso */}
        {profile.goal && profile.goal !== "manter" && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Meta de Peso
            </h3>
            <div className={cn(
              "p-3 rounded-xl border",
              profile.goal === "emagrecer" 
                ? "border-green-400/50 bg-green-50/50 dark:bg-green-950/20"
                : "border-blue-400/50 bg-blue-50/50 dark:bg-blue-950/20"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {profile.goal === "emagrecer" ? (
                  <TrendingDown className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                )}
                <span className="font-medium text-sm">{getProfileLabel("goals", profile.goal)}</span>
              </div>
              {profile.weight_current && profile.weight_goal && (
                <p className="text-xs text-muted-foreground">
                  {profile.weight_current}kg → {profile.weight_goal}kg
                </p>
              )}
            </div>
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

        {/* Preferências Alimentares */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Utensils className="w-4 h-4 text-primary" />
            Preferências Alimentares
          </h3>
          <div className="space-y-2">
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Dieta</p>
              <p className="text-sm font-medium">{getProfileLabel("dietary_preferences", profile.dietary_preference)}</p>
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
                  {getOptionLabel(onboardingOptions, "intolerances", item)}
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
          variant="outline" 
          className="w-full" 
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da conta
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
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
