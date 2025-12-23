import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  UtensilsCrossed, 
  Calendar, 
  TrendingUp,
  Loader2,
  UserPlus,
  ChefHat,
  Target
} from "lucide-react";

type Stats = {
  totalUsers: number;
  totalRecipes: number;
  totalMealPlans: number;
  activeMealPlans: number;
  usersThisWeek: number;
  recipesThisWeek: number;
};

export default function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoISO = oneWeekAgo.toISOString();

        // Fetch all stats in parallel
        const [
          usersResult,
          recipesResult,
          mealPlansResult,
          activePlansResult,
          recentUsersResult,
          recentRecipesResult,
        ] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("recipes").select("id", { count: "exact", head: true }),
          supabase.from("meal_plans").select("id", { count: "exact", head: true }),
          supabase.from("meal_plans").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgoISO),
          supabase.from("recipes").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgoISO),
        ]);

        setStats({
          totalUsers: usersResult.count || 0,
          totalRecipes: recipesResult.count || 0,
          totalMealPlans: mealPlansResult.count || 0,
          activeMealPlans: activePlansResult.count || 0,
          usersThisWeek: recentUsersResult.count || 0,
          recipesThisWeek: recentRecipesResult.count || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total de Usuários",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      title: "Receitas Criadas",
      value: stats?.totalRecipes || 0,
      icon: UtensilsCrossed,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      title: "Planos de Refeição",
      value: stats?.totalMealPlans || 0,
      icon: Calendar,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      title: "Planos Ativos",
      value: stats?.activeMealPlans || 0,
      icon: Target,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      title: "Novos Usuários (7 dias)",
      value: stats?.usersThisWeek || 0,
      icon: UserPlus,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      title: "Receitas Criadas (7 dias)",
      value: stats?.recipesThisWeek || 0,
      icon: ChefHat,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Visão Geral</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Estatísticas gerais do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="glass-card border-border/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={cn(card.bgColor, "p-2 rounded-lg")}>
                <card.icon className={cn("w-4 h-4", card.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {card.value.toLocaleString("pt-BR")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
