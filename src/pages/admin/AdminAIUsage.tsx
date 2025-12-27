import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  DollarSign, 
  Zap, 
  TrendingUp, 
  Calendar,
  Camera,
  Utensils,
  MessageSquare,
  Sparkles,
  ScanLine,
  RefreshCw,
  ChefHat,
  Heart,
  Search,
  FileText,
  Smile
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Module configuration with icons and labels
const MODULE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  "analyze-food-photo": { label: "Foto de Prato", icon: Camera, color: "#22c55e" },
  "analyze-label-photo": { label: "Código de Barras", icon: ScanLine, color: "#3b82f6" },
  "analyze-fridge-photo": { label: "Geladeira", icon: RefreshCw, color: "#8b5cf6" },
  "chat-assistant": { label: "Chat Assistente", icon: MessageSquare, color: "#f59e0b" },
  "suggest-ingredient-substitutes": { label: "Substituir Ingredientes", icon: RefreshCw, color: "#ec4899" },
  "validate-ingredients": { label: "Validar Ingredientes", icon: Sparkles, color: "#14b8a6" },
  "generate-recipe": { label: "Gerar Receita", icon: ChefHat, color: "#f97316" },
  "regenerate-meal": { label: "Regenerar Refeição", icon: RefreshCw, color: "#6366f1" },
  "analyze-symptom-patterns": { label: "Análise de Sintomas", icon: Heart, color: "#ef4444" },
  "suggest-food-ai": { label: "Sugestão de Alimentos", icon: Search, color: "#84cc16" },
  "generate-simple-meals": { label: "Gerar Refeições Simples", icon: Utensils, color: "#06b6d4" },
  "generate-description": { label: "Gerar Descrição", icon: FileText, color: "#a855f7" },
  "generate-emoji": { label: "Gerar Emoji/Ícone", icon: Smile, color: "#eab308" },
  "generate-meal-plan": { label: "Plano Alimentar", icon: Calendar, color: "#0ea5e9" },
};

type PeriodFilter = "7d" | "30d" | "90d" | "all";

export default function AdminAIUsage() {
  const [period, setPeriod] = useState<PeriodFilter>("30d");

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "7d":
        return { start: subDays(now, 7), end: now };
      case "30d":
        return { start: subDays(now, 30), end: now };
      case "90d":
        return { start: subDays(now, 90), end: now };
      default:
        return { start: null, end: now };
    }
  }, [period]);

  // Fetch AI usage logs
  const { data: usageLogs, isLoading } = useQuery({
    queryKey: ["admin-ai-usage", period],
    queryFn: async () => {
      let query = supabase
        .from("ai_usage_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (dateRange.start) {
        query = query.gte("created_at", dateRange.start.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!usageLogs) return null;

    const totalCost = usageLogs.reduce((sum, log) => sum + (log.estimated_cost_usd || 0), 0);
    const totalTokens = usageLogs.reduce((sum, log) => sum + (log.total_tokens || 0), 0);
    const totalRequests = usageLogs.length;
    const avgTokensPerRequest = totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0;

    // Group by module
    const byModule: Record<string, { requests: number; tokens: number; cost: number }> = {};
    usageLogs.forEach((log) => {
      const module = log.function_name;
      if (!byModule[module]) {
        byModule[module] = { requests: 0, tokens: 0, cost: 0 };
      }
      byModule[module].requests += 1;
      byModule[module].tokens += log.total_tokens || 0;
      byModule[module].cost += log.estimated_cost_usd || 0;
    });

    // Group by day for trend
    const byDay: Record<string, { date: string; requests: number; cost: number; tokens: number }> = {};
    usageLogs.forEach((log) => {
      const day = format(parseISO(log.created_at), "yyyy-MM-dd");
      if (!byDay[day]) {
        byDay[day] = { date: day, requests: 0, cost: 0, tokens: 0 };
      }
      byDay[day].requests += 1;
      byDay[day].cost += log.estimated_cost_usd || 0;
      byDay[day].tokens += log.total_tokens || 0;
    });

    // Group by model
    const byModel: Record<string, { requests: number; tokens: number; cost: number }> = {};
    usageLogs.forEach((log) => {
      const model = log.model_used || "unknown";
      if (!byModel[model]) {
        byModel[model] = { requests: 0, tokens: 0, cost: 0 };
      }
      byModel[model].requests += 1;
      byModel[model].tokens += log.total_tokens || 0;
      byModel[model].cost += log.estimated_cost_usd || 0;
    });

    return {
      totalCost,
      totalTokens,
      totalRequests,
      avgTokensPerRequest,
      byModule,
      byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
      byModel,
    };
  }, [usageLogs]);

  // Prepare chart data
  const moduleChartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byModule)
      .map(([module, data]) => ({
        name: MODULE_CONFIG[module]?.label || module,
        requests: data.requests,
        cost: data.cost,
        tokens: data.tokens,
        color: MODULE_CONFIG[module]?.color || "#6b7280",
      }))
      .sort((a, b) => b.requests - a.requests);
  }, [stats]);

  const pieChartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byModule)
      .map(([module, data]) => ({
        name: MODULE_CONFIG[module]?.label || module,
        value: data.cost,
        color: MODULE_CONFIG[module]?.color || "#6b7280",
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const modelChartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byModel)
      .map(([model, data]) => ({
        name: model.replace("gemini-", "").replace("google/", ""),
        requests: data.requests,
        cost: data.cost,
        tokens: data.tokens,
      }))
      .sort((a, b) => b.requests - a.requests);
  }, [stats]);

  const periodButtons: { value: PeriodFilter; label: string }[] = [
    { value: "7d", label: "7 dias" },
    { value: "30d", label: "30 dias" },
    { value: "90d", label: "90 dias" },
    { value: "all", label: "Tudo" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">Uso de IA</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">Uso de IA</h1>
        
        {/* Period Filter */}
        <div className="flex gap-2">
          {periodButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={period === btn.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(btn.value)}
              className="text-xs"
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border border-border/60 shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-green-600">
                ${stats?.totalCost.toFixed(4) || "0.0000"}
              </p>
              <p className="text-xs text-muted-foreground">Custo Total</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border/60 shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Zap className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-blue-600">
                {stats?.totalTokens.toLocaleString() || 0}
              </p>
              <p className="text-xs text-muted-foreground">Tokens Totais</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border/60 shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-purple-600">
                {stats?.totalRequests.toLocaleString() || 0}
              </p>
              <p className="text-xs text-muted-foreground">Requisições</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border/60 shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Sparkles className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-orange-600">
                {stats?.avgTokensPerRequest.toLocaleString() || 0}
              </p>
              <p className="text-xs text-muted-foreground">Tokens/Req Média</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card className="p-6 bg-card border border-border/60 shadow-none">
        <h2 className="text-base font-medium text-foreground mb-4">Tendência de Uso</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.byDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => format(parseISO(value), "dd/MM", { locale: ptBR })}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `$${value.toFixed(3)}`}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px"
                }}
                labelFormatter={(value) => format(parseISO(value as string), "dd/MM/yyyy", { locale: ptBR })}
                formatter={(value: number, name: string) => {
                  if (name === "cost") return [`$${value.toFixed(4)}`, "Custo"];
                  if (name === "requests") return [value, "Requisições"];
                  return [value.toLocaleString(), "Tokens"];
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="requests" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
                name="Requisições"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cost" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={false}
                name="Custo ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Module - Bar Chart */}
        <Card className="p-6 bg-card border border-border/60 shadow-none">
          <h2 className="text-base font-medium text-foreground mb-4">Requisições por Módulo</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120} 
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "requests") return [value, "Requisições"];
                    return [value, name];
                  }}
                />
                <Bar dataKey="requests" radius={[0, 4, 4, 0]}>
                  {moduleChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Cost Distribution - Pie Chart */}
        <Card className="p-6 bg-card border border-border/60 shadow-none">
          <h2 className="text-base font-medium text-foreground mb-4">Distribuição de Custos</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                  formatter={(value: number) => [`$${value.toFixed(4)}`, "Custo"]}
                />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  iconSize={10}
                  wrapperStyle={{ fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Module Details Table */}
      <Card className="p-6 bg-card border border-border/60 shadow-none">
        <h2 className="text-base font-medium text-foreground mb-4">Detalhes por Módulo</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Módulo</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Requisições</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Tokens</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Custo</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Média Tokens</th>
              </tr>
            </thead>
            <tbody>
              {moduleChartData.map((module) => {
                const config = MODULE_CONFIG[Object.keys(MODULE_CONFIG).find(
                  key => MODULE_CONFIG[key].label === module.name
                ) || ""] || { icon: Sparkles, color: "#6b7280" };
                const Icon = config.icon;
                const avgTokens = module.requests > 0 ? Math.round(module.tokens / module.requests) : 0;

                return (
                  <tr key={module.name} className="border-b border-border/20 hover:bg-muted/30">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="p-1.5 rounded-md"
                          style={{ backgroundColor: `${module.color}15` }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: module.color }} />
                        </div>
                        <span className="font-medium text-foreground">{module.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2 text-foreground">
                      {module.requests.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-2 text-muted-foreground">
                      {module.tokens.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        ${module.cost.toFixed(4)}
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-2 text-muted-foreground">
                      {avgTokens.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Model Usage */}
      <Card className="p-6 bg-card border border-border/60 shadow-none">
        <h2 className="text-base font-medium text-foreground mb-4">Uso por Modelo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modelChartData.map((model) => (
            <div 
              key={model.name}
              className="p-4 rounded-lg border border-border/40 bg-muted/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground text-sm">{model.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {model.requests} reqs
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tokens:</span>
                  <span className="text-foreground">{model.tokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Custo:</span>
                  <span className="text-green-600 font-medium">${model.cost.toFixed(4)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
