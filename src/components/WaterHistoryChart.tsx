import { useState } from "react";
import { ArrowLeft, Droplets, TrendingUp, Target, Flame, Calendar, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWaterHistory } from "@/hooks/useWaterHistory";
import { WaterAchievements } from "./WaterAchievements";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface WaterHistoryChartProps {
  onBack: () => void;
}

export function WaterHistoryChart({ onBack }: WaterHistoryChartProps) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  
  const { history, stats, dailyGoal, isLoading } = useWaterHistory(
    period === "week" ? 7 : 30
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded w-32" />
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  const chartData = history.map((day) => ({
    ...day,
    total_L: day.total_ml / 1000,
    goal_L: day.goal_ml / 1000,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            Histórico de Água
          </h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe sua hidratação
          </p>
        </div>
      </div>

      {/* Period Tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as "week" | "month")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="week">Últimos 7 dias</TabsTrigger>
          <TabsTrigger value="month">Últimos 30 dias</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-4 mt-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-600">
                  {(stats.averageDaily / 1000).toFixed(1)}L
                </p>
                <p className="text-xs text-muted-foreground">Média diária</p>
              </CardContent>
            </Card>

            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-4 text-center">
                <Target className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-600">
                  {stats.daysOnGoal}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dias na meta
                </p>
              </CardContent>
            </Card>

            <Card className="bg-orange-500/10 border-orange-500/20">
              <CardContent className="p-4 text-center">
                <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-600">
                  {stats.currentStreak}
                </p>
                <p className="text-xs text-muted-foreground">Sequência atual</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-500/10 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <Calendar className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-purple-600">
                  {stats.bestDay ? (stats.bestDay.total_ml / 1000).toFixed(1) : 0}L
                </p>
                <p className="text-xs text-muted-foreground">Melhor dia</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Consumo diário (litros)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey={period === "week" ? "dayOfWeek" : "dateLabel"}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                      tickFormatter={(value) => `${value}L`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-3">
                              <p className="font-medium text-sm">
                                {data.dateLabel} ({data.dayOfWeek})
                              </p>
                              <p className="text-blue-500 font-bold">
                                {(data.total_ml / 1000).toFixed(1)}L consumidos
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {data.percentage}% da meta
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {data.entries} registros
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={dailyGoal / 1000}
                      stroke="hsl(var(--primary))"
                      strokeDasharray="5 5"
                      label={{
                        value: "Meta",
                        position: "right",
                        fontSize: 10,
                        fill: "hsl(var(--primary))",
                      }}
                    />
                    <Bar
                      dataKey="total_L"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={period === "week" ? 40 : 15}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.percentage >= 100
                              ? "hsl(142, 76%, 46%)" // green
                              : entry.percentage >= 70
                                ? "hsl(217, 91%, 60%)" // blue
                                : entry.percentage >= 30
                                  ? "hsl(38, 92%, 50%)" // amber
                                  : "hsl(0, 84%, 60%)" // red
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span className="text-muted-foreground">≥100%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span className="text-muted-foreground">70-99%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-amber-500" />
                  <span className="text-muted-foreground">30-69%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span className="text-muted-foreground">&lt;30%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Detalhes por dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[...history].reverse().map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium",
                          day.percentage >= 100
                            ? "bg-green-500/20 text-green-600"
                            : day.percentage >= 70
                              ? "bg-blue-500/20 text-blue-600"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {day.dayOfWeek}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{day.dateLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {day.entries} registros
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {(day.total_ml / 1000).toFixed(1)}L
                      </p>
                      <p
                        className={cn(
                          "text-xs",
                          day.percentage >= 100
                            ? "text-green-600"
                            : "text-muted-foreground"
                        )}
                      >
                        {day.percentage}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Achievements Section */}
          <WaterAchievements />
        </TabsContent>
      </Tabs>
    </div>
  );
}
