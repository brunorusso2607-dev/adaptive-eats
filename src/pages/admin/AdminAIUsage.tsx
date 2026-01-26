import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Smile,
  Users,
  X,
  Download
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Module configuration with icons and labels
const MODULE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  "analyze-food-photo": { label: "Foto de Prato", icon: Camera, color: "#22c55e" },
  "analyze-label-photo": { label: "Código de Barras", icon: ScanLine, color: "#3b82f6" },
  "analyze-fridge-photo": { label: "Geladeira", icon: RefreshCw, color: "#8b5cf6" },
  "chat-assistant": { label: "Chat Assistente", icon: MessageSquare, color: "#f59e0b" },
  "suggest-ingredient-substitutes": { label: "Substituir Alimentos", icon: RefreshCw, color: "#ec4899" },
  "validate-ingredients": { label: "Validar Ingredientes", icon: Sparkles, color: "#14b8a6" },
  "generate-recipe": { label: "Gerar Receita", icon: ChefHat, color: "#f97316" },
  "regenerate-meal": { label: "Regenerar Refeição", icon: RefreshCw, color: "#6366f1" },
  "analyze-symptom-patterns": { label: "Análise de Sintomas", icon: Heart, color: "#ef4444" },
  "suggest-food-ai": { label: "Sugestão de Alimentos", icon: Search, color: "#84cc16" },
  "generate-description": { label: "Gerar Descrição", icon: FileText, color: "#a855f7" },
  "generate-emoji": { label: "Gerar Emoji/Ícone", icon: Smile, color: "#eab308" },
  "generate-meal-plan": { label: "Plano Alimentar", icon: Calendar, color: "#0ea5e9" },
};

type PeriodFilter = "7d" | "30d" | "90d" | "all";

interface UserUsageData {
  userId: string;
  email: string;
  firstName: string | null;
  requests: number;
  tokens: number;
  cost: number;
}

interface UserModuleUsage {
  module: string;
  label: string;
  requests: number;
  tokens: number;
  cost: number;
  color: string;
}

export default function AdminAIUsage() {
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [selectedUser, setSelectedUser] = useState<UserUsageData | null>(null);

  // Export user usage data to CSV
  const exportToCSV = () => {
    if (!userUsageData.length) return;

    const headers = ["Usuário", "Email", "Requisições", "Tokens", "Custo (USD)", "% do Total"];
    const totalCost = stats?.totalCost || 0;

    const rows = userUsageData.map((user) => [
      user.firstName || (user.userId === "anonymous" ? "Sistema/Anônimo" : "Sem nome"),
      user.email,
      user.requests.toString(),
      user.tokens.toString(),
      user.cost.toFixed(6),
      totalCost > 0 ? ((user.cost / totalCost) * 100).toFixed(2) : "0",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uso-ia-por-usuario-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

  // Fetch user profiles for mapping user_id to names
  const { data: profiles } = useQuery({
    queryKey: ["admin-user-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Create a map of user_id to profile info
  const userProfileMap = useMemo(() => {
    const map: Record<string, { email: string; firstName: string | null }> = {};
    profiles?.forEach((profile) => {
      map[profile.id] = {
        email: profile.email || "Sem email",
        firstName: profile.first_name,
      };
    });
    return map;
  }, [profiles]);

  // Calculate usage by user
  const userUsageData = useMemo((): UserUsageData[] => {
    if (!usageLogs) return [];

    const byUser: Record<string, { requests: number; tokens: number; cost: number }> = {};
    
    usageLogs.forEach((log) => {
      const userId = log.user_id || "anonymous";
      if (!byUser[userId]) {
        byUser[userId] = { requests: 0, tokens: 0, cost: 0 };
      }
      byUser[userId].requests += 1;
      byUser[userId].tokens += log.total_tokens || 0;
      byUser[userId].cost += log.estimated_cost_usd || 0;
    });

    return Object.entries(byUser)
      .map(([userId, data]) => ({
        userId,
        email: userId === "anonymous" ? "Sistema/Anônimo" : (userProfileMap[userId]?.email || "Usuário desconhecido"),
        firstName: userId === "anonymous" ? null : (userProfileMap[userId]?.firstName || null),
        ...data,
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [usageLogs, userProfileMap]);

  // Calculate module usage for selected user
  const selectedUserModules = useMemo((): UserModuleUsage[] => {
    if (!usageLogs || !selectedUser) return [];

    const byModule: Record<string, { requests: number; tokens: number; cost: number }> = {};
    
    usageLogs
      .filter((log) => {
        const logUserId = log.user_id || "anonymous";
        return logUserId === selectedUser.userId;
      })
      .forEach((log) => {
        const module = log.function_name;
        if (!byModule[module]) {
          byModule[module] = { requests: 0, tokens: 0, cost: 0 };
        }
        byModule[module].requests += 1;
        byModule[module].tokens += log.total_tokens || 0;
        byModule[module].cost += log.estimated_cost_usd || 0;
      });

    return Object.entries(byModule)
      .map(([module, data]) => ({
        module,
        label: MODULE_CONFIG[module]?.label || module,
        color: MODULE_CONFIG[module]?.color || "#6b7280",
        ...data,
      }))
      .sort((a, b) => b.requests - a.requests);
  }, [usageLogs, selectedUser]);

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

      {/* Usage by User */}
      <Card className="p-6 bg-card border border-border/60 shadow-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-base font-medium text-foreground">Uso por Usuário</h2>
            <Badge variant="outline" className="ml-2">
              {userUsageData.filter(u => u.userId !== "anonymous").length} usuários
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={!userUsageData.length}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Usuário</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Requisições</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Tokens</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Custo</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">% do Total</th>
              </tr>
            </thead>
            <tbody>
              {userUsageData.slice(0, 20).map((user, index) => {
                const percentOfTotal = stats?.totalCost 
                  ? ((user.cost / stats.totalCost) * 100).toFixed(1) 
                  : "0";
                const isAnonymous = user.userId === "anonymous";

                return (
                  <tr 
                    key={user.userId} 
                    className="border-b border-border/20 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            isAnonymous 
                              ? "bg-muted text-muted-foreground" 
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {isAnonymous ? "?" : (user.firstName?.[0] || user.email[0]).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground text-xs">
                            {user.firstName || (isAnonymous ? "Sistema/Anônimo" : "Sem nome")}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                            {user.email}
                          </span>
                        </div>
                        {index < 3 && !isAnonymous && (
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] ml-1 ${
                              index === 0 ? "border-yellow-500 text-yellow-600" :
                              index === 1 ? "border-gray-400 text-gray-500" :
                              "border-orange-400 text-orange-500"
                            }`}
                          >
                            #{index + 1}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-3 px-2 text-foreground">
                      {user.requests.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-2 text-muted-foreground">
                      {user.tokens.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        ${user.cost.toFixed(4)}
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-2">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(parseFloat(percentOfTotal), 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {percentOfTotal}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {userUsageData.length > 20 && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Mostrando os 20 principais usuários de {userUsageData.length} total
            </p>
          )}
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

      {/* User Detail Sheet */}
      <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                {selectedUser?.userId === "anonymous" 
                  ? "?" 
                  : (selectedUser?.firstName?.[0] || selectedUser?.email?.[0] || "U").toUpperCase()
                }
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {selectedUser?.firstName || (selectedUser?.userId === "anonymous" ? "Sistema/Anônimo" : "Sem nome")}
                </p>
                <p className="text-sm text-muted-foreground font-normal">
                  {selectedUser?.email}
                </p>
              </div>
            </SheetTitle>
          </SheetHeader>

          {/* User Summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-lg font-bold text-primary">{selectedUser?.requests.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Requisições</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-lg font-bold text-blue-600">{selectedUser?.tokens.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Tokens</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-lg font-bold text-green-600">${selectedUser?.cost.toFixed(4)}</p>
              <p className="text-xs text-muted-foreground">Custo</p>
            </div>
          </div>

          {/* Module Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Uso por Módulo</h3>
            
            {/* Mini Bar Chart */}
            {selectedUserModules.length > 0 && (
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedUserModules.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis 
                      dataKey="label" 
                      type="category" 
                      width={100} 
                      tick={{ fontSize: 9 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "11px"
                      }}
                      formatter={(value: number) => [value, "Requisições"]}
                    />
                    <Bar dataKey="requests" radius={[0, 4, 4, 0]}>
                      {selectedUserModules.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Module List */}
            <div className="space-y-2">
              {selectedUserModules.map((module) => {
                const config = MODULE_CONFIG[module.module] || { icon: Sparkles, color: "#6b7280" };
                const Icon = config.icon;
                const percentOfUser = selectedUser?.requests 
                  ? ((module.requests / selectedUser.requests) * 100).toFixed(1)
                  : "0";

                return (
                  <div 
                    key={module.module}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/10"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-md"
                        style={{ backgroundColor: `${module.color}15` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: module.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{module.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {module.tokens.toLocaleString()} tokens
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{module.requests}</p>
                      <p className="text-xs text-muted-foreground">{percentOfUser}%</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedUserModules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum dado de uso encontrado para este usuário.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
