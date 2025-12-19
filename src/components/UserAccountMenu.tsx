import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  User, Crown, Star, Mail, Scale, Ruler, Calendar, 
  Activity, Target, Heart, AlertCircle, Utensils, LogOut,
  TrendingDown, TrendingUp, Minus, ChefHat
} from "lucide-react";
import { cn } from "@/lib/utils";
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

const INTOLERANCES_LABELS: Record<string, string> = {
  gluten: "Glúten",
  lactose: "Lactose",
  amendoim: "Amendoim",
  frutos_do_mar: "Frutos do mar",
  ovos: "Ovos",
  soja: "Soja",
  diabetes: "Diabetes",
  hipertensao: "Hipertensão",
};

export default function UserAccountMenu({ user, subscription, onLogout }: UserAccountMenuProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

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
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getLabel = (category: keyof typeof LABELS, value: string | null) => {
    if (!value) return "Não definido";
    return (LABELS[category] as Record<string, string>)[value] || value;
  };

  const planName = subscription?.plan === "premium" ? "Premium" : subscription?.plan === "essencial" ? "Essencial" : null;
  const PlanIcon = subscription?.plan === "premium" ? Crown : Star;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <User className="w-5 h-5" />
          {subscription?.subscribed && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Minha Conta
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
          {subscription?.subscribed && (
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
          ) : profile ? (
            <>
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
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Perfil não encontrado
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
