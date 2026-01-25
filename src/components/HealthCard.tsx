import { useState } from "react";
import { Shield, ChevronRight, Lightbulb, Bell, TrendingUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSymptomAnalysis } from "@/hooks/useSymptomAnalysis";
import { useHealthStats, HealthPeriod } from "@/hooks/useHealthStats";
import { useSymptomTracker } from "@/hooks/useSymptomTracker";
import { MealHistorySheet } from "./MealHistorySheet";
import { MealStatus } from "@/hooks/useMealHistory";
import { HealthScoreChart } from "./HealthScoreChart";
import { SymptomIcon } from "./SymptomIcon";
import { cn } from "@/lib/utils";

interface HealthCardProps {
  pendingCount?: number;
  onOpenFeedback?: () => void;
}

const PERIOD_OPTIONS: { value: HealthPeriod; label: string }[] = [
  { value: 7, label: "7d" },
  { value: 14, label: "14d" },
  { value: 21, label: "21d" },
  { value: 30, label: "30d" },
];

export function HealthCard({ pendingCount = 0, onOpenFeedback }: HealthCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<MealStatus>("evaluated");
  const [chartOpen, setChartOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<HealthPeriod>(7);

  const openHistoryWithFilter = (filter: MealStatus) => {
    setHistoryFilter(filter);
    setHistoryOpen(true);
  };
  
  const { analysis, isLoading: isLoadingAnalysis } = useSymptomAnalysis(30); // Always 30 days for main score
  const { 
    wellMealsCount, 
    totalMealsCount, 
    symptomsCount, 
    isLoading: isLoadingStats 
  } = useHealthStats(selectedPeriod);
  const { recentLogs, symptomTypes } = useSymptomTracker();

  const isLoading = isLoadingAnalysis || isLoadingStats;
  
  // Use safetyScore from analysis for main display
  const score = analysis?.safetyScore ?? 100;

  // Filter recent logs by selected period
  const filteredLogs = recentLogs.filter(log => {
    const logDate = new Date(log.logged_at);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - selectedPeriod);
    return logDate >= startDate;
  });

  // Calculate most common symptom from filtered logs
  const mostCommonSymptom = filteredLogs.length > 0
    ? Object.entries(
        filteredLogs
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
  
  // Score color and status
  const scoreColor = score >= 80 
    ? "text-green-500" 
    : score >= 60 
      ? "text-amber-500" 
      : "text-red-500";

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
          <div className="flex items-center gap-1">
            {pendingCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                onClick={onOpenFeedback}
              >
                <Bell className="h-3.5 w-3.5 mr-1" />
                {pendingCount}
              </Button>
            )}
          </div>
        </CardTitle>
        
        {/* Period Filter */}
        <div className="flex items-center gap-1 mt-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedPeriod(option.value)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full transition-colors",
                selectedPeriod === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
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
              <div className="flex items-baseline">
                <span className={cn("text-3xl font-bold", scoreColor)}>{score}</span>
                <span className={cn("text-lg font-medium text-muted-foreground")}>/100</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">{statusMessage}</p>
          
          {/* Contextual Info */}
          <p className="text-xs text-muted-foreground mt-1">
            {totalMealsCount > 0 ? (
              <span className="font-medium text-foreground">{wellMealsCount} de {totalMealsCount}</span>
            ) : (
              <span>Nenhuma</span>
            )} refeições OK nos últimos {selectedPeriod} dias
          </p>
        </div>

        {/* Metrics Row - Clickable */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => openHistoryWithFilter("ok")}
            className="text-center p-3 rounded-lg bg-muted/30 hover:bg-green-500/10 hover:ring-1 hover:ring-green-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xl font-semibold text-green-600">{wellMealsCount}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">refeições OK ({selectedPeriod}d)</p>
          </button>
          
          <button
            onClick={() => openHistoryWithFilter("symptoms")}
            className="text-center p-3 rounded-lg bg-muted/30 hover:bg-orange-500/10 hover:ring-1 hover:ring-orange-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className={cn(
                "text-xl font-semibold",
                symptomsCount > 0 ? "text-orange-600" : "text-foreground"
              )}>{symptomsCount}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">com sintomas ({selectedPeriod}d)</p>
          </button>
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
        {filteredLogs.length === 0 && score >= 80 && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">
              ✨ Nenhum sintoma nos últimos {selectedPeriod} dias
            </p>
          </div>
        )}

        {/* Evolution Chart - Collapsible */}
        <Collapsible open={chartOpen} onOpenChange={setChartOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-2 px-1 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                <span>Ver evolução</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                chartOpen && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-2 pb-1">
              <HealthScoreChart days={selectedPeriod} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Button */}
        <button
          onClick={() => openHistoryWithFilter("evaluated")}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          Ver diário de bem-estar
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* History Sheet - With dynamic filter */}
        <MealHistorySheet
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          defaultStatus={historyFilter}
        />
      </CardContent>
    </Card>
  );
}
