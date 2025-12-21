import { useState, useEffect } from "react";
import { useSwipeToClose } from "@/hooks/use-swipe-to-close";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  User, Crown, Star, Mail, Scale, Ruler, Calendar, 
  Activity, Target, AlertCircle, Utensils, LogOut,
  TrendingDown, TrendingUp, Pencil, X, Check, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type UserProfile = {
  dietary_preference: string | null;
  goal: string | null;
  calorie_goal: string | null;
  recipe_complexity: string | null;
  context: string | null;
  weight_current: number | null;
  weight_goal: number | null;
  height: number | null;
  age: number | null;
  sex: string | null;
  activity_level: string | null;
  intolerances: string[] | null;
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

const LABELS = {
  dietary_preference: {
    comum: "Comum",
    vegetariana: "Vegetariana",
    vegana: "Vegana",
    low_carb: "Low Carb",
  },
  goal: {
    emagrecer: "Emagrecer",
    manter: "Manter peso",
    ganhar_peso: "Ganhar peso",
  },
  calorie_goal: {
    reduzir: "Reduzir calorias",
    manter: "Manter calorias",
    aumentar: "Aumentar calorias",
    definir_depois: "Definir depois",
  },
  recipe_complexity: {
    rapida: "Receitas rápidas",
    equilibrada: "Equilibrada",
    elaborada: "Receitas elaboradas",
  },
  context: {
    individual: "Individual",
    familia: "Família",
    modo_kids: "Modo Kids",
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

const INTOLERANCES_OPTIONS = [
  { id: "lactose", label: "Lactose" },
  { id: "gluten", label: "Glúten" },
  { id: "acucar", label: "Açúcar" },
  { id: "amendoim", label: "Amendoim" },
  { id: "frutos_mar", label: "Frutos do mar" },
  { id: "ovo", label: "Ovo" },
];

const INTOLERANCES_LABELS: Record<string, string> = {
  lactose: "Lactose",
  gluten: "Glúten",
  acucar: "Açúcar",
  amendoim: "Amendoim",
  frutos_mar: "Frutos do mar",
  ovo: "Ovo",
};

export default function UserAccountMenu({ user, subscription, onLogout, externalOpen, onExternalOpenChange }: UserAccountMenuProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
        .select("dietary_preference, goal, calorie_goal, recipe_complexity, context, weight_current, weight_goal, height, age, sex, activity_level, intolerances")
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
          recipe_complexity: editedProfile.recipe_complexity as any,
          context: editedProfile.context as any,
          weight_current: editedProfile.weight_current ? Number(editedProfile.weight_current) : null,
          weight_goal: editedProfile.weight_goal ? Number(editedProfile.weight_goal) : null,
          height: editedProfile.height ? Number(editedProfile.height) : null,
          age: editedProfile.age ? Number(editedProfile.age) : null,
          sex: editedProfile.sex,
          activity_level: editedProfile.activity_level,
          intolerances: editedProfile.intolerances,
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

  const getLabel = (category: keyof typeof LABELS, value: string | null) => {
    if (!value) return "Não definido";
    return (LABELS[category] as Record<string, string>)[value] || value;
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
              {[{ id: "male", label: "Masculino", emoji: "👨" }, { id: "female", label: "Feminino", emoji: "👩" }].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setEditedProfile({ ...editedProfile, sex: opt.id })}
                  className={cn(
                    "p-2 rounded-lg border-2 text-center transition-all text-sm touch-manipulation",
                    editedProfile.sex === opt.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="mr-1">{opt.emoji}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nível de Atividade */}
          <div className="space-y-1">
            <Label className="text-xs">Nível de Atividade</Label>
            <div className="grid grid-cols-1 gap-1">
              {Object.entries(LABELS.activity_level).map(([id, label]) => (
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
              {Object.entries(LABELS.dietary_preference).map(([id, label]) => (
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

          {/* Complexidade */}
          <div className="space-y-1">
            <Label className="text-xs">Complexidade das Receitas</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(LABELS.recipe_complexity).map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setEditedProfile({ ...editedProfile, recipe_complexity: id })}
                  className={cn(
                    "p-2 rounded-lg border text-xs transition-all touch-manipulation",
                    editedProfile.recipe_complexity === id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Contexto */}
          <div className="space-y-1">
            <Label className="text-xs">Contexto</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(LABELS.context).map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setEditedProfile({ ...editedProfile, context: id })}
                  className={cn(
                    "p-2 rounded-lg border text-xs transition-all touch-manipulation",
                    editedProfile.context === id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
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
            {INTOLERANCES_OPTIONS.map((opt) => {
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

        {/* Botões de ação */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1" onClick={handleCancel} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
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
      <>
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
                <span className="font-medium text-sm">{getLabel("goal", profile.goal)}</span>
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
              <p className="text-sm font-medium">{getLabel("dietary_preference", profile.dietary_preference)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Complexidade das receitas</p>
              <p className="text-sm font-medium">{getLabel("recipe_complexity", profile.recipe_complexity)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Contexto</p>
              <p className="text-sm font-medium">{getLabel("context", profile.context)}</p>
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
                  {INTOLERANCES_LABELS[item] || item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Logout */}
        <Button 
          variant="outline" 
          className="w-full" 
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
