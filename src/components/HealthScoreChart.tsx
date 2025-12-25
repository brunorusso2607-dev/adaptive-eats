import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useHealthScoreHistory } from "@/hooks/useHealthScoreHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface HealthScoreChartProps {
  days?: number;
}

export function HealthScoreChart({ days = 7 }: HealthScoreChartProps) {
  const { history, trend, isLoading } = useHealthScoreHistory(days);

  const chartData = useMemo(() => {
    return history.map(item => ({
      ...item,
      // Color coding for the score
      fill: item.score >= 80 ? "#22c55e" : item.score >= 60 ? "#f59e0b" : "#ef4444",
    }));
  }, [history]);

  const averageScore = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.round(history.reduce((acc, item) => acc + item.score, 0) / history.length);
  }, [history]);

  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }

  if (history.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
        Sem dados suficientes
      </div>
    );
  }

  const TrendIcon = trend > 5 ? TrendingUp : trend < -5 ? TrendingDown : Minus;
  const trendColor = trend > 5 ? "text-green-600" : trend < -5 ? "text-red-600" : "text-muted-foreground";
  const trendLabel = trend > 5 ? "Melhorando" : trend < -5 ? "Atenção" : "Estável";

  return (
    <div className="space-y-2">
      {/* Trend indicator */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <TrendIcon className={cn("h-4 w-4", trendColor)} />
          <span className={cn("text-xs font-medium", trendColor)}>{trendLabel}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Média: <span className="font-medium text-foreground">{averageScore}</span>
        </span>
      </div>

      {/* Chart */}
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              ticks={[0, 50, 100]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-xs">
                      <p className="font-medium">{data.score}%</p>
                      <p className="text-muted-foreground">
                        {data.wellMeals}/{data.totalMeals} refeições OK
                      </p>
                      {data.symptoms > 0 && (
                        <p className="text-orange-600">{data.symptoms} sintoma(s)</p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={80} stroke="hsl(var(--muted))" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                const color = payload.score >= 80 ? "#22c55e" : payload.score >= 60 ? "#f59e0b" : "#ef4444";
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={color}
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
