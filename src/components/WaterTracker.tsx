import { useState } from "react";
import { Droplets, Plus, Minus, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWaterConsumption } from "@/hooks/useWaterConsumption";
import { WaterSettingsSheet } from "./WaterSettingsSheet";
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

const QUICK_AMOUNTS = [150, 200, 250, 300, 500];

export function WaterTracker() {
  const {
    settings,
    todayConsumption,
    totalToday,
    percentage,
    remaining,
    isLoading,
    addWater,
    removeWater,
    updateSettings,
  } = useWaterConsumption();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddWater = async (amount: number) => {
    setIsAdding(true);
    await addWater(amount);
    setIsAdding(false);
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-6 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Droplets className="h-5 w-5 text-blue-500" />
              Consumo de Água
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Circle */}
          <div className="flex flex-col items-center py-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${percentage * 3.52} 352`}
                  strokeLinecap="round"
                  className={cn(
                    "transition-all duration-500",
                    percentage >= 100 ? "text-green-500" : "text-blue-500"
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">
                  {(totalToday / 1000).toFixed(1)}L
                </span>
                <span className="text-xs text-muted-foreground">
                  de {(settings.daily_goal_ml / 1000).toFixed(1)}L
                </span>
              </div>
            </div>
            
            {percentage >= 100 ? (
              <p className="text-sm text-green-600 font-medium mt-2">
                🎉 Meta atingida!
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                Faltam {remaining}ml para sua meta
              </p>
            )}
          </div>

          {/* Quick Add Buttons */}
          <div className="grid grid-cols-5 gap-2">
            {QUICK_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                className="flex flex-col h-auto py-2 text-xs"
                onClick={() => handleAddWater(amount)}
                disabled={isAdding}
              >
                <Droplets className="h-3 w-3 mb-1 text-blue-500" />
                {amount}ml
              </Button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={() => handleAddWater(250)}
              disabled={isAdding}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar 250ml
            </Button>
          </div>

          {/* Today's History */}
          {todayConsumption.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Histórico de hoje
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {todayConsumption.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm py-1 px-2 bg-muted/50 rounded"
                  >
                    <span className="flex items-center gap-2">
                      <Droplets className="h-3 w-3 text-blue-400" />
                      {item.amount_ml}ml
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(item.consumed_at), "HH:mm", { locale: ptBR })}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover registro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Deseja remover este registro de {item.amount_ml}ml?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeWater(item.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <WaterSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSave={updateSettings}
      />
    </>
  );
}
