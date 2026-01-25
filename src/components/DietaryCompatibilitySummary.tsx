import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, XCircle, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

type Compatibility = 'good' | 'moderate' | 'incompatible' | 'unknown';

type CompatibilityCounts = {
  good: number;
  moderate: number;
  incompatible: number;
  unknown: number;
  total: number;
};

type DietaryCompatibilitySummaryProps = {
  counts: CompatibilityCounts;
  isLoading?: boolean;
  hasProfile?: boolean;
  onReplaceIncompatible?: () => void;
  isReplacing?: boolean;
  replaceProgress?: { current: number; total: number };
};

export function DietaryCompatibilitySummary({ 
  counts, 
  isLoading = false,
  hasProfile = false,
  onReplaceIncompatible,
  isReplacing = false,
  replaceProgress = { current: 0, total: 0 }
}: DietaryCompatibilitySummaryProps) {
  // Don't show if no dietary profile configured
  if (!hasProfile || counts.total === 0) {
    return null;
  }

  const safePercentage = useMemo(() => {
    if (counts.total === 0) return 0;
    return Math.round((counts.good / counts.total) * 100);
  }, [counts]);

  const hasIssues = counts.moderate > 0 || counts.incompatible > 0;
  const hasIncompatible = counts.incompatible > 0;

  return (
    <Card className={cn(
      "glass-card border transition-all",
      counts.incompatible > 0 
        ? "border-destructive/30 bg-destructive/5" 
        : counts.moderate > 0 
          ? "border-yellow-500/30 bg-yellow-500/5" 
          : "border-primary/30 bg-primary/5"
    )}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className={cn(
            "w-4 h-4",
            counts.incompatible > 0 
              ? "text-destructive" 
              : counts.moderate > 0 
                ? "text-yellow-500" 
                : "text-primary"
          )} />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Compatibilidade do Plano
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* Compatible */}
          <div className="flex items-center gap-2 bg-primary/10 rounded-lg p-2 sm:p-3">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-lg text-primary">{counts.good}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Compatíveis</p>
            </div>
          </div>

          {/* Moderate */}
          <div className="flex items-center gap-2 bg-yellow-500/10 rounded-lg p-2 sm:p-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-lg text-yellow-600 dark:text-yellow-400">{counts.moderate}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Moderadas</p>
            </div>
          </div>

          {/* Incompatible */}
          <div className="flex items-center gap-2 bg-destructive/10 rounded-lg p-2 sm:p-3">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-lg text-destructive">{counts.incompatible}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Incompatíveis</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
            <span>{safePercentage}% do plano é seguro para você</span>
            <span>{counts.good}/{counts.total}</span>
          </div>
          <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden flex">
            {counts.total > 0 && (
              <>
                <div 
                  className="bg-primary transition-all" 
                  style={{ width: `${(counts.good / counts.total) * 100}%` }} 
                />
                <div 
                  className="bg-yellow-500 transition-all" 
                  style={{ width: `${(counts.moderate / counts.total) * 100}%` }} 
                />
                <div 
                  className="bg-destructive transition-all" 
                  style={{ width: `${(counts.incompatible / counts.total) * 100}%` }} 
                />
              </>
            )}
          </div>
        </div>

        {/* Warning message and Replace button */}
        {hasIssues && (
          <div className="mt-3 space-y-2">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {counts.incompatible > 0 
                ? `⚠️ ${counts.incompatible} refeição(ões) não são recomendadas para seu perfil.`
                : `ℹ️ ${counts.moderate} refeição(ões) requerem atenção moderada.`
              }
            </p>

            {/* Replace button - only for incompatible meals */}
            {hasIncompatible && onReplaceIncompatible && (
              <>
                {isReplacing ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Substituindo {replaceProgress.current}/{replaceProgress.total}...</span>
                    </div>
                    <Progress 
                      value={replaceProgress.total > 0 ? (replaceProgress.current / replaceProgress.total) * 100 : 0} 
                      className="h-1.5"
                    />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReplaceIncompatible}
                    className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Substituir {counts.incompatible} refeição(ões) incompatível(eis)
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
