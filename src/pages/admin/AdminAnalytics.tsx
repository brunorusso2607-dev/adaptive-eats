import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  Loader2,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Calendar
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSafetyLabels } from "@/hooks/useSafetyLabels";

type DailyData = {
  date: string;
  users: number;
  recipes: number;
};

type GoalDistribution = {
  name: string;
  value: number;
  color: string;
};

type DietDistribution = {
  name: string;
  value: number;
};

export default function AdminAnalytics() {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [goalDistribution, setGoalDistribution] = useState<GoalDistribution[]>([]);
  const [dietDistribution, setDietDistribution] = useState<DietDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Hook para labels do banco de dados
  const { getDietaryLabel } = useSafetyLabels();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const last30Days = eachDayOfInterval({
          start: subDays(new Date(), 29),
          end: new Date(),
        });

        // Fetch users and recipes for last 30 days
        const [usersResult, recipesResult, profilesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("created_at")
            .gte("created_at", subDays(new Date(), 30).toISOString()),
          supabase
            .from("recipes")
            .select("created_at")
            .gte("created_at", subDays(new Date(), 30).toISOString()),
          supabase
            .from("profiles")
            .select("goal, dietary_preference"),
        ]);

        // Process daily data
        const dailyMap = new Map<string, { users: number; recipes: number }>();
        
        last30Days.forEach((day) => {
          const key = format(day, "yyyy-MM-dd");
          dailyMap.set(key, { users: 0, recipes: 0 });
        });

        usersResult.data?.forEach((user) => {
          if (user.created_at) {
            const key = format(new Date(user.created_at), "yyyy-MM-dd");
            const existing = dailyMap.get(key);
            if (existing) {
              existing.users += 1;
            }
          }
        });

        recipesResult.data?.forEach((recipe) => {
          if (recipe.created_at) {
            const key = format(new Date(recipe.created_at), "yyyy-MM-dd");
            const existing = dailyMap.get(key);
            if (existing) {
              existing.recipes += 1;
            }
          }
        });

        const chartData = Array.from(dailyMap.entries()).map(([date, data]) => ({
          date: format(new Date(date), "dd/MM", { locale: ptBR }),
          users: data.users,
          recipes: data.recipes,
        }));

        setDailyData(chartData);

        // Process goal distribution (database now stores English values)
        const goalCounts = { lose_weight: 0, maintain: 0, gain_weight: 0 };
        profilesResult.data?.forEach((profile) => {
          if (profile.goal && profile.goal in goalCounts) {
            goalCounts[profile.goal as keyof typeof goalCounts] += 1;
          }
        });

        setGoalDistribution([
          { name: "Emagrecer", value: goalCounts.lose_weight, color: "hsl(var(--primary))" },
          { name: "Manter", value: goalCounts.maintain, color: "hsl(var(--accent))" },
          { name: "Ganhar Peso", value: goalCounts.gain_weight, color: "hsl(152 60% 45%)" },
        ]);

        // Process diet distribution (database now stores English values)
        const dietCounts: Record<string, number> = {};
        profilesResult.data?.forEach((profile) => {
          const diet = profile.dietary_preference || "omnivore";
          dietCounts[diet] = (dietCounts[diet] || 0) + 1;
        });

        setDietDistribution(
          Object.entries(dietCounts).map(([key, value]) => ({
            name: getDietaryLabel(key),
            value,
          }))
        );
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Relatórios</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Análise de crescimento e engajamento
        </p>
      </div>

      {/* Growth Chart */}
      <Card className="glass-card border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            Crescimento (Últimos 30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRecipes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  name="Novos Usuários"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
                <Area
                  type="monotone"
                  dataKey="recipes"
                  name="Receitas Criadas"
                  stroke="hsl(var(--accent))"
                  fillOpacity={1}
                  fill="url(#colorRecipes)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goal Distribution */}
        <Card className="glass-card border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-muted-foreground" />
              Distribuição de Objetivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={goalDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {goalDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Diet Distribution */}
        <Card className="glass-card border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
              Preferências Alimentares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dietDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    name="Usuários"
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
