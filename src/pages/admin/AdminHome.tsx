import { Card } from "@/components/ui/card";
import { Users, TrendingUp, Utensils, AlertCircle, ChevronRight, Info, Brain, DollarSign, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subDays, format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function AdminHome() {
  const navigate = useNavigate();

  // Fetch basic stats
  const { data: stats } = useQuery({
    queryKey: ['admin-home-stats'],
    queryFn: async () => {
      const [usersResult, recipesResult, plansResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('recipes').select('id', { count: 'exact', head: true }),
        supabase.from('meal_plans').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);
      return {
        users: usersResult.count || 0,
        recipes: recipesResult.count || 0,
        activePlans: plansResult.count || 0,
      };
    },
  });

  // Fetch AI usage stats
  const { data: aiStats } = useQuery({
    queryKey: ['admin-home-ai-stats'],
    queryFn: async () => {
      const today = new Date();
      const startOfToday = format(today, 'yyyy-MM-dd');
      const startOfCurrentMonth = format(startOfMonth(today), 'yyyy-MM-dd');
      const last7Days = format(subDays(today, 7), 'yyyy-MM-dd');

      const [todayResult, monthResult, weekResult] = await Promise.all([
        supabase
          .from('ai_usage_logs')
          .select('estimated_cost_usd, total_tokens')
          .gte('created_at', startOfToday),
        supabase
          .from('ai_usage_logs')
          .select('estimated_cost_usd, total_tokens')
          .gte('created_at', startOfCurrentMonth),
        supabase
          .from('ai_usage_logs')
          .select('estimated_cost_usd, total_tokens')
          .gte('created_at', last7Days),
      ]);

      const calculateTotals = (data: any[]) => ({
        cost: data?.reduce((sum, log) => sum + (log.estimated_cost_usd || 0), 0) || 0,
        tokens: data?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0,
        requests: data?.length || 0,
      });

      return {
        today: calculateTotals(todayResult.data || []),
        month: calculateTotals(monthResult.data || []),
        week: calculateTotals(weekResult.data || []),
      };
    },
  });

  const quickStats = [
    { label: "Usuários", value: stats?.users || 0, icon: Users, color: "text-blue-600" },
    { label: "Receitas", value: stats?.recipes || 0, icon: Utensils, color: "text-green-600" },
    { label: "Planos ativos", value: stats?.activePlans || 0, icon: TrendingUp, color: "text-purple-600" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className="space-y-8 animate-fade-up max-w-5xl">
      {/* Title - Large and elegant like reference */}
      <h1 className="text-3xl font-semibold text-foreground tracking-tight">
        Início
      </h1>

      {/* Quick Stats Cards - Horizontal layout like reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickStats.map((stat) => (
          <Card 
            key={stat.label}
            className="p-4 bg-card border border-border/60 shadow-none hover:border-border transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-lg font-medium ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground font-normal">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Metrics Section - Clean horizontal metrics like reference */}
      <Card className="p-0 bg-card border border-border/60 shadow-none overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border/40">
          <span className="text-sm font-medium text-foreground">Hoje</span>
          <span className="text-sm text-muted-foreground">Ontem</span>
          <span className="text-sm text-muted-foreground">Esta semana</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/40">
          {[
            { label: "Novos usuários", value: "0" },
            { label: "Receitas geradas", value: "0" },
            { label: "Planos criados", value: "0" },
            { label: "Erros de IA", value: "0" },
          ].map((metric) => (
            <div key={metric.label} className="p-5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs text-muted-foreground font-normal">{metric.label}</span>
                <Info className="w-3 h-3 text-muted-foreground/50" />
              </div>
              <p className="text-xl font-medium text-foreground">{metric.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Usage Summary Card */}
      <Card 
        className="p-0 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-500/20 shadow-none overflow-hidden cursor-pointer hover:border-violet-500/40 transition-colors"
        onClick={() => navigate('/admin/ai-usage')}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-violet-500/20">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-medium text-foreground">Uso de IA</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-violet-500/20">
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3 h-3 text-violet-600" />
              <span className="text-xs text-muted-foreground font-normal">Custo Hoje</span>
            </div>
            <p className="text-lg font-semibold text-violet-600">{formatCurrency(aiStats?.today.cost || 0)}</p>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3 h-3 text-purple-600" />
              <span className="text-xs text-muted-foreground font-normal">Custo Mês</span>
            </div>
            <p className="text-lg font-semibold text-purple-600">{formatCurrency(aiStats?.month.cost || 0)}</p>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3 h-3 text-amber-600" />
              <span className="text-xs text-muted-foreground font-normal">Tokens Mês</span>
            </div>
            <p className="text-lg font-semibold text-amber-600">{formatNumber(aiStats?.month.tokens || 0)}</p>
          </div>
        </div>
        <div className="px-5 py-2.5 bg-violet-500/5 border-t border-violet-500/20">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{aiStats?.month.requests || 0}</span> requisições este mês • 
            <span className="font-medium text-foreground ml-1">{aiStats?.week.requests || 0}</span> nos últimos 7 dias
          </p>
        </div>
      </Card>

      {/* Recommendations Section - Like reference */}
      <div className="space-y-3">
        <h2 className="text-base font-medium text-foreground">Recomendações</h2>
        <Card className="divide-y divide-border/40 bg-card border border-border/60 shadow-none overflow-hidden">
          {[
            { icon: AlertCircle, title: "Configure as integrações", description: "Configure o Gemini e Stripe para ativar todas as funcionalidades." },
            { icon: Users, title: "Gerencie usuários", description: "Visualize e gerencie os usuários cadastrados na plataforma." },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground font-normal">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
