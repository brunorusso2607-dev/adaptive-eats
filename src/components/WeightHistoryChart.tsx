import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingDown, TrendingUp, ArrowLeft, Loader2, Scale, Trophy, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeightRecord {
  id: string;
  weight: number;
  recorded_at: string;
  goal_weight: number | null;
}

interface WeightHistoryChartProps {
  onBack: () => void;
  goalWeight: number;
  goalMode: "lose" | "gain" | "maintain" | null;
  currentWeight: number;
}

export default function WeightHistoryChart({ 
  onBack, 
  goalWeight, 
  goalMode,
  currentWeight 
}: WeightHistoryChartProps) {
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("weight_history")
        .select("*")
        .eq("user_id", session.user.id)
        .order("recorded_at", { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching weight history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isLoseMode = goalMode === "lose";

  // Calculate stats
  const getStats = () => {
    if (records.length === 0) return null;
    
    const firstWeight = records[0].weight;
    const lastWeight = records[records.length - 1].weight;
    const totalChange = lastWeight - firstWeight;
    const highestWeight = Math.max(...records.map(r => r.weight));
    const lowestWeight = Math.min(...records.map(r => r.weight));
    const remainingToGoal = isLoseMode ? lastWeight - goalWeight : goalWeight - lastWeight;
    
    return {
      totalChange,
      highestWeight,
      lowestWeight,
      remainingToGoal,
      isGoalAchieved: isLoseMode ? lastWeight <= goalWeight : lastWeight >= goalWeight
    };
  };

  const stats = getStats();

  // Format data for chart
  const chartData = records.map(record => ({
    date: format(new Date(record.recorded_at), "dd/MM", { locale: ptBR }),
    fullDate: format(new Date(record.recorded_at), "dd 'de' MMMM", { locale: ptBR }),
    weight: Number(record.weight),
    goal: goalWeight,
  }));

  // Calculate Y axis domain
  const weights = records.map(r => Number(r.weight));
  const minWeight = Math.min(...weights, goalWeight) - 2;
  const maxWeight = Math.max(...weights, goalWeight) + 2;

  const accentColor = isLoseMode ? "#22c55e" : "#3b82f6";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Histórico de Peso
          </h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe sua evolução ao longo do tempo
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : records.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display text-lg font-bold text-foreground mb-2">
              Nenhum registro ainda
            </h3>
            <p className="text-sm text-muted-foreground">
              Use o botão "Novo Peso" para registrar seu primeiro peso e começar a acompanhar sua evolução.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className={cn(
              "glass-card border-2",
              stats?.isGoalAchieved 
                ? "border-yellow-400/50 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30"
                : isLoseMode
                  ? "border-green-400/30"
                  : "border-blue-400/30"
            )}>
              <CardContent className="p-4 text-center">
                {stats?.isGoalAchieved ? (
                  <Trophy className="w-6 h-6 mx-auto text-yellow-500 mb-1" />
                ) : (
                  <Target className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                )}
                <p className={cn(
                  "text-lg font-bold",
                  stats?.isGoalAchieved ? "text-yellow-600" : isLoseMode ? "text-green-600" : "text-blue-600"
                )}>
                  {stats?.isGoalAchieved ? "Meta atingida!" : `${Math.abs(stats?.remainingToGoal || 0).toFixed(1)}kg`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats?.isGoalAchieved ? "🎉" : "Faltam"}
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                {isLoseMode ? (
                  <TrendingDown className={cn(
                    "w-6 h-6 mx-auto mb-1",
                    (stats?.totalChange || 0) < 0 ? "text-green-500" : "text-red-500"
                  )} />
                ) : (
                  <TrendingUp className={cn(
                    "w-6 h-6 mx-auto mb-1",
                    (stats?.totalChange || 0) > 0 ? "text-blue-500" : "text-red-500"
                  )} />
                )}
                <p className={cn(
                  "text-lg font-bold",
                  isLoseMode
                    ? (stats?.totalChange || 0) < 0 ? "text-green-600" : "text-red-500"
                    : (stats?.totalChange || 0) > 0 ? "text-blue-600" : "text-red-500"
                )}>
                  {(stats?.totalChange || 0) > 0 ? "+" : ""}{stats?.totalChange?.toFixed(1)}kg
                </p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold text-foreground">{stats?.lowestWeight?.toFixed(1)}kg</p>
                <p className="text-xs text-muted-foreground">Menor peso</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold text-foreground">{stats?.highestWeight?.toFixed(1)}kg</p>
                <p className="text-xs text-muted-foreground">Maior peso</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">Evolução do Peso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[minWeight, maxWeight]}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}kg`}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg">
                              <p className="text-sm text-muted-foreground">{payload[0].payload.fullDate}</p>
                              <p className="text-lg font-bold" style={{ color: accentColor }}>
                                {payload[0].value}kg
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine 
                      y={goalWeight} 
                      stroke={accentColor}
                      strokeDasharray="5 5"
                      label={{ 
                        value: `Meta: ${goalWeight}kg`, 
                        position: "right",
                        fill: accentColor,
                        fontSize: 12
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke={accentColor}
                      strokeWidth={3}
                      dot={{ fill: accentColor, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: accentColor }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Records List */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">Registros</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="space-y-2 max-h-64 overflow-y-auto"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                }}
                onTouchStart={(e) => {
                  const el = e.currentTarget;
                  (el as any)._startY = e.touches[0].clientY;
                }}
                onTouchMove={(e) => {
                  const el = e.currentTarget;
                  const startY = (el as any)._startY || 0;
                  const currentY = e.touches[0].clientY;
                  const deltaY = startY - currentY;
                  const isScrollingDown = deltaY > 0;
                  const isScrollingUp = deltaY < 0;
                  const isAtTop = el.scrollTop <= 0;
                  const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
                  if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
                    e.preventDefault();
                  }
                  e.stopPropagation();
                }}
              >
                {[...records].reverse().map((record, index) => {
                  const prevRecord = records[records.length - index - 2];
                  const change = prevRecord ? Number(record.weight) - Number(prevRecord.weight) : 0;
                  
                  return (
                    <div 
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{Number(record.weight).toFixed(1)}kg</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(record.recorded_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {change !== 0 && (
                        <span className={cn(
                          "text-sm font-medium px-2 py-1 rounded-full",
                          isLoseMode
                            ? change < 0 
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : change > 0
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                          {change > 0 ? "+" : ""}{change.toFixed(1)}kg
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}