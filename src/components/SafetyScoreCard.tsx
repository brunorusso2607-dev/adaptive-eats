import { Shield, TrendingUp, TrendingDown, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSymptomAnalysis } from "@/hooks/useSymptomAnalysis";
import { cn } from "@/lib/utils";

export function SafetyScoreCard() {
  const { analysis, isLoading } = useSymptomAnalysis(30);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-6 bg-muted rounded w-40" />
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  const score = analysis.safetyScore;
  const scoreColor = score >= 80 
    ? "text-green-500" 
    : score >= 60 
      ? "text-yellow-500" 
      : "text-red-500";

  const scoreBgColor = score >= 80 
    ? "bg-green-500/10" 
    : score >= 60 
      ? "bg-yellow-500/10" 
      : "bg-red-500/10";

  const scoreLabel = score >= 80 
    ? "Excelente" 
    : score >= 60 
      ? "Atenção" 
      : "Crítico";

  // Mensagens motivacionais baseadas no score
  const motivationalMessage = score >= 90
    ? "Incrível! Seu corpo agradece cada escolha consciente que você faz."
    : score >= 80
      ? "Parabéns! Você está no caminho certo para uma vida mais saudável."
      : score >= 70
        ? "Muito bem! Continue assim e seu bem-estar vai melhorar cada dia mais."
        : score >= 60
          ? "Você está progredindo! Pequenas mudanças fazem grande diferença."
          : score >= 40
            ? "Cada passo conta. Vamos juntos identificar o que pode melhorar?"
            : "Estamos aqui para ajudar. Vamos descobrir o que está causando desconforto.";

  // Calculate stroke dash for circular progress
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Score de Segurança
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Circle */}
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn("transition-all duration-1000", scoreColor)}
                style={{ stroke: "currentColor" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-2xl font-bold", scoreColor)}>{score}</span>
              <span className="text-xs text-muted-foreground">de 100</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium", scoreBgColor, scoreColor)}>
              {score >= 80 ? (
                <TrendingUp className="h-4 w-4" />
              ) : score >= 60 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {scoreLabel}
            </div>
            <p className="text-sm text-muted-foreground">
              {analysis.totalSymptomDays === 0 
                ? "Nenhum sintoma registrado nos últimos 30 dias"
                : `${analysis.totalSymptomDays} dia(s) com sintomas nos últimos ${analysis.totalDays} dias`}
            </p>
          </div>
        </div>

        {/* Motivational Message */}
        <div className={cn(
          "rounded-lg px-4 py-3 text-sm",
          score >= 80 
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" 
            : score >= 60 
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" 
              : "bg-red-500/10 text-red-700 dark:text-red-400"
        )}>
          <p className="leading-relaxed">{motivationalMessage}</p>
        </div>

        {/* AI Insights */}
        {analysis.insights && analysis.insights.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Insights da IA
            </h4>
            <ul className="space-y-1.5">
              {analysis.insights.map((insight, i) => (
                <li 
                  key={i} 
                  className="text-sm bg-muted/50 rounded-lg px-3 py-2"
                >
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Correlations */}
        {analysis.correlations && analysis.correlations.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">
              Correlações detectadas
            </h4>
            <div className="space-y-2">
              {analysis.correlations.slice(0, 3).map((corr, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{corr.symptom}:</span>
                  <span className="text-muted-foreground ml-1">
                    {corr.foods.map(f => f.food).join(", ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {analysis.message && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {analysis.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
