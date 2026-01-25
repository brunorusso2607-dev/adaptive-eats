import { useState, useEffect } from "react";
import { Droplets, Plus, Trash2, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWaterConsumption } from "@/hooks/useWaterConsumption";
import { useWaterReminder } from "@/hooks/useWaterReminder";
import { useWaterAchievements } from "@/hooks/useWaterAchievements";
import { WaterHistoryChart } from "./WaterHistoryChart";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

const QUICK_AMOUNTS = [150, 200, 250, 300, 500];

export function WaterTracker() {
  // Water achievements hook
  const { hydrationStreak, refresh: refreshAchievements } = useWaterAchievements();

  const {
    settings,
    todayConsumption,
    totalToday,
    percentage,
    remaining,
    isLoading,
    addWater,
    removeWater,
  } = useWaterConsumption(refreshAchievements);

  // Water reminder hook - apenas para lógica interna de lembretes
  useWaterReminder({
    settings,
    totalToday,
    percentage,
    onAddWater: addWater,
  });

  const [showHistory, setShowHistory] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(250);
  const [isPulsing, setIsPulsing] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);

  // Trigger pulse animation when amount changes
  useEffect(() => {
    setIsPulsing(true);
    const timer = setTimeout(() => setIsPulsing(false), 300);
    return () => clearTimeout(timer);
  }, [selectedAmount]);

  const handleAddWater = async () => {
    setIsAdding(true);
    await addWater(selectedAmount);
    setIsAdding(false);
  };

  const handleCustomAmountSubmit = () => {
    const amount = parseInt(customAmount);
    if (amount > 0 && amount <= 2000) {
      setSelectedAmount(amount);
      setCustomPopoverOpen(false);
      setCustomAmount("");
    }
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

  // Show history view
  if (showHistory) {
    return <WaterHistoryChart onBack={() => setShowHistory(false)} />;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Droplets className="h-5 w-5 text-blue-500" />
          Consumo de Água
        </CardTitle>
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

          {/* Streak indicator */}
          {hydrationStreak > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-orange-600">
              <Trophy className="h-3.5 w-3.5" />
              <span>{hydrationStreak} dias na meta</span>
            </div>
          )}
        </div>

        {/* Quick Amount Selection Buttons */}
        <div className="grid grid-cols-6 gap-2">
          {QUICK_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              variant={selectedAmount === amount ? "default" : "outline"}
              size="sm"
              className={cn(
                "flex flex-col h-auto py-2 text-xs transition-all duration-200",
                selectedAmount === amount 
                  ? "bg-blue-500 hover:bg-blue-600 text-white scale-105" 
                  : "hover:border-blue-400"
              )}
              onClick={() => setSelectedAmount(amount)}
            >
              <Droplets className={cn(
                "h-3 w-3 mb-1",
                selectedAmount === amount ? "text-white" : "text-blue-500"
              )} />
              {amount}ml
            </Button>
          ))}
          
          {/* Custom Amount Button */}
          <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={!QUICK_AMOUNTS.includes(selectedAmount) ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex flex-col h-auto py-2 text-xs transition-all duration-200",
                  !QUICK_AMOUNTS.includes(selectedAmount)
                    ? "bg-blue-500 hover:bg-blue-600 text-white scale-105" 
                    : "hover:border-blue-400"
                )}
              >
                <Plus className={cn(
                  "h-3 w-3 mb-1",
                  !QUICK_AMOUNTS.includes(selectedAmount) ? "text-white" : "text-blue-500"
                )} />
                {!QUICK_AMOUNTS.includes(selectedAmount) ? `${selectedAmount}ml` : "Outro"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="center">
              <div className="space-y-2">
                <p className="text-sm font-medium">Quantidade (ml)</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Ex: 350"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    min={1}
                    max={2000}
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleCustomAmountSubmit()}
                  />
                  <Button 
                    size="sm" 
                    className="h-8 px-3 bg-blue-500 hover:bg-blue-600"
                    onClick={handleCustomAmountSubmit}
                    disabled={!customAmount || parseInt(customAmount) <= 0}
                  >
                    OK
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Máx: 2000ml</p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            className={cn(
              "flex-1 bg-blue-500 hover:bg-blue-600 transition-all duration-200",
              isPulsing && "animate-[pulse_0.3s_ease-in-out] scale-105"
            )}
            onClick={handleAddWater}
            disabled={isAdding}
          >
            <Droplets className="h-4 w-4 mr-2" />
            Tomei {selectedAmount}ml
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowHistory(true)}
            className="shrink-0"
          >
            <TrendingUp className="h-4 w-4" />
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
  );
}
