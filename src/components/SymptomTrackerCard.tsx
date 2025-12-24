import { useState } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSymptomTracker } from "@/hooks/useSymptomTracker";
import { SymptomLogSheet } from "./SymptomLogSheet";
import { SymptomIcon } from "./SymptomIcon";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const severityColors = {
  leve: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  moderado: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  severo: "bg-red-500/10 text-red-700 border-red-500/20",
};

const severityLabels = {
  leve: "Leve",
  moderado: "Moderado",
  severo: "Severo",
};

export function SymptomTrackerCard() {
  const { recentLogs, isLoading, deleteLog, symptomTypes } = useSymptomTracker();
  const [sheetOpen, setSheetOpen] = useState(false);

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

  if (isLoading) {
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
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Rastreador de Sintomas
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setSheetOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Registrar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-2xl font-bold">{totalLogsThisWeek}</p>
              <p className="text-xs text-muted-foreground">Registros (7 dias)</p>
            </div>
            {topSymptom && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-lg font-medium flex items-center gap-1.5">
                  <SymptomIcon 
                    name={topSymptom[0]} 
                    category={getSymptomCategory(topSymptom[0])}
                    size={18}
                  />
                  <span className="truncate">{topSymptom[0]}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Mais frequente ({topSymptom[1]}x)
                </p>
              </div>
            )}
          </div>

          {/* Recent Logs */}
          {recentLogs.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Registros recentes
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.symptoms.slice(0, 3).map((symptom, i) => (
                          <SymptomIcon 
                            key={i}
                            name={symptom} 
                            category={getSymptomCategory(symptom)}
                            size={16}
                          />
                        ))}
                        {log.symptoms.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{log.symptoms.length - 3}
                          </span>
                        )}
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full border",
                          severityColors[log.severity]
                        )}>
                          {severityLabels[log.severity]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(log.logged_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover registro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteLog(log.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum sintoma registrado</p>
              <p className="text-xs">Registre como você se sente após as refeições</p>
            </div>
          )}

          {/* CTA Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSheetOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Como você está se sentindo?
          </Button>
        </CardContent>
      </Card>

      <SymptomLogSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
