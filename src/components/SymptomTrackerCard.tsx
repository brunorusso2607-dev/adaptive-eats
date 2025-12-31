import { useState } from "react";
import { AlertCircle, Bell, TrendingUp, History, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSymptomTracker } from "@/hooks/useSymptomTracker";
import { useHealthStats } from "@/hooks/useHealthStats";
import { SymptomIcon } from "./SymptomIcon";
import { SymptomCorrelationChart } from "./SymptomCorrelationChart";
import { MealSymptomHistorySheet } from "./MealSymptomHistorySheet";
import { cn } from "@/lib/utils";

interface SymptomTrackerCardProps {
  pendingCount: number;
  onOpenFeedback: () => void;
}

const severityColors = {
  leve: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  moderado: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  severo: "bg-red-500/10 text-red-700 border-red-500/20",
};

export function SymptomTrackerCard({ pendingCount, onOpenFeedback }: SymptomTrackerCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const { recentLogs, isLoading, symptomTypes } = useSymptomTracker();
  const { wellMealsCount, isLoading: isLoadingWellMeals } = useHealthStats(7);

  // Calculate stats
  const totalLogsThisWeek = recentLogs.length;
  const mostCommonSymptom = recentLogs.length > 0
    ? recentLogs
        .flatMap(log => log.symptoms)
        .reduce((acc, symptom) => {
          acc[symptom] = (acc[symptom] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
    : {};

  const topSymptom = Object.entries(mostCommonSymptom)
    .sort(([, a], [, b]) => b - a)[0];

  // Get category for symptom
  const getSymptomCategory = (name: string) => {
    const type = symptomTypes.find(t => t.name === name);
    return type?.category;
  };

  if (isLoading || isLoadingWellMeals) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-6 bg-muted rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Bem-estar
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pending Feedback Alert */}
        {pendingCount > 0 && (
          <Button
            variant="outline"
            className="w-full h-auto py-3 flex items-center gap-3 justify-between border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10"
            onClick={onOpenFeedback}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Bell className="h-4 w-4 text-orange-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">
                  {pendingCount} {pendingCount === 1 ? "refeição aguarda" : "refeições aguardam"} feedback
                </p>
                <p className="text-xs text-muted-foreground">Toque para responder</p>
              </div>
            </div>
            <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">
              {pendingCount}
            </span>
          </Button>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          {/* Well meals counter */}
          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-2xl font-bold text-green-700">{wellMealsCount}</p>
            </div>
            <p className="text-xs text-green-600/80">Refeições bem (7 dias)</p>
          </div>
          
          {/* Symptoms counter */}
          <div className={cn(
            "rounded-lg p-3 border",
            totalLogsThisWeek > 0 
              ? "bg-orange-500/10 border-orange-500/20" 
              : "bg-muted/50 border-transparent"
          )}>
            <p className={cn(
              "text-2xl font-bold",
              totalLogsThisWeek > 0 ? "text-orange-700" : "text-foreground"
            )}>{totalLogsThisWeek}</p>
            <p className="text-xs text-muted-foreground">Sintomas (7 dias)</p>
          </div>
        </div>

        {/* Top symptom indicator */}
        {topSymptom && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <SymptomIcon
                name={topSymptom[0]}
                category={getSymptomCategory(topSymptom[0])}
                size={16}
              />
              <span className="truncate">{topSymptom[0]}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                Mais frequente ({topSymptom[1]}x)
              </span>
            </p>
          </div>
        )}

        {/* Recent symptoms preview (read-only) */}
        {recentLogs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Últimos registros
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {recentLogs.slice(0, 3).flatMap(log => 
                log.symptoms.slice(0, 2).map((symptom, i) => (
                  <span
                    key={`${log.id}-${i}`}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full text-xs border",
                      severityColors[log.severity]
                    )}
                  >
                    <SymptomIcon
                      name={symptom}
                      category={getSymptomCategory(symptom)}
                      size={12}
                      className="opacity-70"
                    />
                    {symptom}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {/* Correlation Chart - clickable to open history */}
        <div 
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setHistoryOpen(true)}
        >
          <SymptomCorrelationChart />
        </div>

        {/* View History Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setHistoryOpen(true)}
        >
          <History className="h-4 w-4 mr-2" />
          Ver histórico completo
        </Button>

        {/* Empty state */}
        {recentLogs.length === 0 && pendingCount === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
            <p className="text-sm">Tudo tranquilo por aqui!</p>
            <p className="text-xs">Nenhum sintoma registrado recentemente</p>
          </div>
        )}

        {/* History Sheet */}
        <MealSymptomHistorySheet
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />

      </CardContent>
    </Card>
  );
}
