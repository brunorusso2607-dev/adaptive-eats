import { useState } from "react";
import { Shield, TrendingUp, ChevronRight, Lightbulb, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSymptomAnalysis } from "@/hooks/useSymptomAnalysis";
import { useWellMealsCount } from "@/hooks/useWellMealsCount";
import { useSymptomTracker } from "@/hooks/useSymptomTracker";
import { MealSymptomHistorySheet } from "./MealSymptomHistorySheet";
import { SymptomIcon } from "./SymptomIcon";
import { cn } from "@/lib/utils";

interface HealthCardProps {
  pendingCount?: number;
  onOpenFeedback?: () => void;
}

export function HealthCard({ pendingCount = 0, onOpenFeedback }: HealthCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const { analysis, isLoading: isLoadingAnalysis } = useSymptomAnalysis(30);
  const { count: wellMealsCount, isLoading: isLoadingWellMeals } = useWellMealsCount(7);
  const { recentLogs, symptomTypes } = useSymptomTracker();

  const isLoading = isLoadingAnalysis || isLoadingWellMeals;

  // Calculate most common symptom
  const mostCommonSymptom = recentLogs.length > 0
    ? Object.entries(
        recentLogs
          .flatMap(log => log.symptoms)
          .reduce((acc, symptom) => {
            acc[symptom] = (acc[symptom] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
      ).sort(([, a], [, b]) => b - a)[0]
    : null;

  const getSymptomCategory = (name: string) => {
    return symptomTypes.find(t => t.name === name)?.category;
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-5 bg-muted rounded w-24" />
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const score = analysis?.safetyScore ?? 100;
  const symptomsCount = recentLogs.length;
  
  // Score color and status
  const scoreColor = score >= 80 
    ? "text-green-500" 
    : score >= 60 
      ? "text-amber-500" 
      : "text-red-500";

  const statusLabel = score >= 80 
    ? "Excelente" 
    : score >= 60 
      ? "Atenção" 
      : "Cuidado";

  const statusMessage = score >= 90
    ? "Seu corpo está em harmonia"
    : score >= 80
      ? "Continue assim, está indo muito bem"
      : score >= 60
        ? "Alguns sintomas detectados, fique atento"
        : "Vamos identificar o que está causando desconforto";

  // Calculate stroke dash for circular progress
  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Get correlation insight if exists
  const correlationInsight = analysis?.correlations?.[0];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-medium">
            <Shield className="h-4 w-4 text-primary" />
            Saúde
          </div>
          {pendingCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
              onClick={onOpenFeedback}
            >
              <Bell className="h-3.5 w-3.5 mr-1" />
              {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Circle - Centered */}
        <div className="flex flex-col items-center py-2">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted/50"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn("transition-all duration-1000", scoreColor)}
                style={{ stroke: "currentColor" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-3xl font-bold", scoreColor)}>{score}</span>
              <span className="text-[10px] text-muted-foreground">de 100</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{statusMessage}</p>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xl font-semibold text-green-600">{wellMealsCount}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">refeições OK (7d)</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-center gap-1.5">
              <span className={cn(
                "text-xl font-semibold",
                symptomsCount > 0 ? "text-orange-600" : "text-foreground"
              )}>{symptomsCount}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">sintomas (7d)</p>
          </div>
        </div>

        {/* Insight Card */}
        {(correlationInsight || mostCommonSymptom) && (
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {correlationInsight ? (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{correlationInsight.symptom}</span>
                    {" aparece após consumo de "}
                    <span className="font-medium text-foreground">
                      {correlationInsight.foods.slice(0, 2).map(f => f.food).join(", ")}
                    </span>
                  </p>
                ) : mostCommonSymptom ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <SymptomIcon
                      name={mostCommonSymptom[0]}
                      category={getSymptomCategory(mostCommonSymptom[0])}
                      size={14}
                    />
                    <span className="font-medium text-foreground">{mostCommonSymptom[0]}</span>
                    {` — sintoma mais frequente (${mostCommonSymptom[1]}x)`}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {recentLogs.length === 0 && score >= 80 && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">
              ✨ Nenhum sintoma nos últimos 7 dias
            </p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => setHistoryOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          Ver histórico
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* History Sheet */}
        <MealSymptomHistorySheet
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />
      </CardContent>
    </Card>
  );
}
