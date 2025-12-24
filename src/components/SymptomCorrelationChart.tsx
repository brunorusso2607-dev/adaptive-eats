import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useSymptomAnalysis } from "@/hooks/useSymptomAnalysis";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TrendingDown } from "lucide-react";

const COLORS = [
  "hsl(var(--destructive))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function SymptomCorrelationChart() {
  const { analysis, isLoading, error } = useSymptomAnalysis(30);

  const chartData = useMemo(() => {
    if (!analysis?.correlations) return [];

    // Flatten correlations: symptom -> food -> count
    const foodCounts: Record<string, number> = {};

    analysis.correlations.forEach((correlation) => {
      correlation.foods.forEach(({ food, count }) => {
        foodCounts[food] = (foodCounts[food] || 0) + count;
      });
    });

    // Sort and take top 5
    return Object.entries(foodCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([food, count]) => ({
        food: food.length > 12 ? food.slice(0, 12) + "…" : food,
        fullName: food,
        count,
      }));
  }, [analysis]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (error || !analysis) {
    return null;
  }

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
        <TrendingDown className="h-6 w-6 mb-1 text-green-500" />
        <p className="text-xs text-center">Sem correlações identificadas</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
        Alimentos associados a sintomas
      </h4>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="food"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, _name: string, props: any) => [
                `${value}x associado`,
                props.payload.fullName,
              ]}
              labelFormatter={() => ""}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Baseado nos últimos 30 dias
      </p>
    </div>
  );
}
