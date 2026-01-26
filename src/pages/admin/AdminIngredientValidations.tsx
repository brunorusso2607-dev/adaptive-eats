import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, TrendingUp, AlertTriangle, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ValidationStats {
  total: number;
  valid: number;
  invalid: number;
  validRate: number;
  uniqueUsers: number;
  todayCount: number;
  weekCount: number;
  helpfulFeedback: number;
  notHelpfulFeedback: number;
  feedbackRate: number;
}

interface TopProblematicPair {
  pair: string[];
  count: number;
}

interface TopSuggestion {
  suggestion: string;
  count: number;
}

interface RecentValidation {
  id: string;
  ingredients: string[];
  is_valid: boolean;
  confidence: string | null;
  message: string | null;
  problematic_pair: string[] | null;
  user_feedback: string | null;
  created_at: string;
}

export default function AdminIngredientValidations() {
  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<ValidationStats>({
    queryKey: ['admin-ingredient-validation-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      const [totalResult, validResult, invalidResult, uniqueUsersResult, todayResult, weekResult, helpfulResult, notHelpfulResult] = await Promise.all([
        supabase.from('ingredient_validation_history').select('id', { count: 'exact', head: true }),
        supabase.from('ingredient_validation_history').select('id', { count: 'exact', head: true }).eq('is_valid', true),
        supabase.from('ingredient_validation_history').select('id', { count: 'exact', head: true }).eq('is_valid', false),
        supabase.from('ingredient_validation_history').select('user_id', { count: 'exact', head: true }),
        supabase.from('ingredient_validation_history').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        supabase.from('ingredient_validation_history').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
        supabase.from('ingredient_validation_history').select('id', { count: 'exact', head: true }).eq('user_feedback', 'helpful'),
        supabase.from('ingredient_validation_history').select('id', { count: 'exact', head: true }).eq('user_feedback', 'not_helpful'),
      ]);

      const total = totalResult.count || 0;
      const valid = validResult.count || 0;
      const invalid = invalidResult.count || 0;
      const helpful = helpfulResult.count || 0;
      const notHelpful = notHelpfulResult.count || 0;
      const totalFeedback = helpful + notHelpful;

      return {
        total,
        valid,
        invalid,
        validRate: total > 0 ? Math.round((valid / total) * 100) : 0,
        uniqueUsers: uniqueUsersResult.count || 0,
        todayCount: todayResult.count || 0,
        weekCount: weekResult.count || 0,
        helpfulFeedback: helpful,
        notHelpfulFeedback: notHelpful,
        feedbackRate: totalFeedback > 0 ? Math.round((helpful / totalFeedback) * 100) : 0,
      };
    },
  });

  // Fetch top problematic pairs
  const { data: topProblematicPairs } = useQuery<TopProblematicPair[]>({
    queryKey: ['admin-top-problematic-pairs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ingredient_validation_history')
        .select('problematic_pair')
        .eq('is_valid', false)
        .not('problematic_pair', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!data) return [];

      // Count occurrences
      const pairCounts = new Map<string, number>();
      data.forEach((item) => {
        if (item.problematic_pair && Array.isArray(item.problematic_pair)) {
          const key = item.problematic_pair.sort().join(' + ');
          pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        }
      });

      return Array.from(pairCounts.entries())
        .map(([pair, count]) => ({ pair: pair.split(' + '), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
  });

  // Fetch top suggestions
  const { data: topSuggestions } = useQuery<TopSuggestion[]>({
    queryKey: ['admin-top-suggestions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ingredient_validation_history')
        .select('suggestions')
        .eq('is_valid', false)
        .not('suggestions', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!data) return [];

      // Count occurrences
      const suggestionCounts = new Map<string, number>();
      data.forEach((item) => {
        if (item.suggestions && Array.isArray(item.suggestions)) {
          item.suggestions.forEach((suggestion: string) => {
            suggestionCounts.set(suggestion, (suggestionCounts.get(suggestion) || 0) + 1);
          });
        }
      });

      return Array.from(suggestionCounts.entries())
        .map(([suggestion, count]) => ({ suggestion, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  // Fetch recent validations
  const { data: recentValidations, isLoading: recentLoading } = useQuery<RecentValidation[]>({
    queryKey: ['admin-recent-validations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ingredient_validation_history')
        .select('id, ingredients, is_valid, confidence, message, problematic_pair, user_feedback, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      return (data || []) as RecentValidation[];
    },
  });

  const pieData = stats ? [
    { name: 'Válidas', value: stats.valid, color: 'hsl(var(--primary))' },
    { name: 'Inválidas', value: stats.invalid, color: 'hsl(var(--destructive))' },
  ] : [];

  const barData = topProblematicPairs?.map((item) => ({
    name: item.pair.join(' + '),
    count: item.count,
  })) || [];

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up max-w-6xl">
      <h1 className="text-3xl font-semibold text-foreground tracking-tight">
        Validações de Ingredientes
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border border-border/60 shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-medium text-blue-600">{stats?.total || 0}</p>
              <p className="text-xs text-muted-foreground">Total de validações</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border/60 shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/50 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-medium text-green-600">{stats?.validRate || 0}%</p>
              <p className="text-xs text-muted-foreground">Taxa de aprovação</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border/60 shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/50 text-orange-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-medium text-orange-600">{stats?.todayCount || 0}</p>
              <p className="text-xs text-muted-foreground">Hoje</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border/60 shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/50 text-purple-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-medium text-purple-600">{stats?.uniqueUsers || 0}</p>
              <p className="text-xs text-muted-foreground">Usuários únicos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Feedback Stats */}
      {(stats?.helpfulFeedback || 0) + (stats?.notHelpfulFeedback || 0) > 0 && (
        <Card className="p-5 bg-card border border-border/60 shadow-none">
          <h3 className="text-sm font-medium text-foreground mb-4">Feedback dos Usuários</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-medium text-green-600">{stats?.helpfulFeedback || 0}</p>
              <p className="text-xs text-muted-foreground">Útil 👍</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-medium text-red-600">{stats?.notHelpfulFeedback || 0}</p>
              <p className="text-xs text-muted-foreground">Não útil 👎</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-medium text-foreground">{stats?.feedbackRate || 0}%</p>
              <p className="text-xs text-muted-foreground">Satisfação</p>
            </div>
          </div>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart - Valid vs Invalid */}
        <Card className="p-5 bg-card border border-border/60 shadow-none">
          <h3 className="text-sm font-medium text-foreground mb-4">Distribuição de Resultados</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Válidas ({stats?.valid || 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-xs text-muted-foreground">Inválidas ({stats?.invalid || 0})</span>
            </div>
          </div>
        </Card>

        {/* Bar Chart - Top Problematic Pairs */}
        <Card className="p-5 bg-card border border-border/60 shadow-none">
          <h3 className="text-sm font-medium text-foreground mb-4">Combinações Problemáticas</h3>
          {barData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={120} 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Nenhuma combinação problemática registrada
            </div>
          )}
        </Card>
      </div>

      {/* Top Suggestions */}
      {topSuggestions && topSuggestions.length > 0 && (
        <Card className="p-5 bg-card border border-border/60 shadow-none">
          <h3 className="text-sm font-medium text-foreground mb-4">Sugestões Mais Frequentes</h3>
          <div className="flex flex-wrap gap-2">
            {topSuggestions.map((item, index) => (
              <Badge 
                key={index} 
                variant="secondary"
                className="text-xs"
              >
                {item.suggestion} ({item.count})
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Validations Table */}
      <Card className="bg-card border border-border/60 shadow-none overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40">
          <h3 className="text-sm font-medium text-foreground">Validações Recentes</h3>
        </div>
        
        {recentLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Ingredientes</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px]">Feedback</TableHead>
                <TableHead className="w-[100px]">Confiança</TableHead>
                <TableHead>Problema</TableHead>
                <TableHead className="w-[120px]">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentValidations?.map((validation) => (
                <TableRow key={validation.id}>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {validation.ingredients.slice(0, 3).map((ing, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {ing}
                        </Badge>
                      ))}
                      {validation.ingredients.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{validation.ingredients.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {validation.is_valid ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Válida
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inválida
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {validation.user_feedback === 'helpful' ? (
                      <span className="text-green-600 text-xs">👍</span>
                    ) : validation.user_feedback === 'not_helpful' ? (
                      <span className="text-red-600 text-xs">👎</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground capitalize">
                      {validation.confidence || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {validation.problematic_pair ? (
                      <span className="text-xs text-destructive">
                        {validation.problematic_pair.join(' + ')}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(validation.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
