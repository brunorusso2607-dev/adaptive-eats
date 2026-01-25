import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Scale, Trophy, TrendingDown, TrendingUp, Sparkles, Target } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { useActivityLog } from "@/hooks/useActivityLog";

interface WeightUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeight: number;
  goalWeight: number;
  goalMode: "lose" | "gain" | "maintain" | null;
  onWeightUpdated: (newWeight: number) => void;
}

export default function WeightUpdateModal({
  open,
  onOpenChange,
  currentWeight,
  goalWeight,
  goalMode,
  onWeightUpdated,
}: WeightUpdateModalProps) {
  const { logUserAction } = useActivityLog();
  const [newWeight, setNewWeight] = useState<string>(currentWeight?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    achieved: boolean;
    message: string;
    lostKg?: number;
    gainedKg?: number;
    remaining?: number;
  } | null>(null);

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#22c55e", "#16a34a", "#15803d", "#fbbf24", "#f59e0b"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#22c55e", "#16a34a", "#15803d", "#fbbf24", "#f59e0b"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // Big burst first
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.6 },
      colors: ["#22c55e", "#16a34a", "#15803d", "#fbbf24", "#f59e0b"],
    });

    frame();
  };

  const handleSave = async () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight < 30 || weight > 300) {
      toast.error("Informe um peso válido (30-300 kg)");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      // Update profile weight
      const { error } = await supabase
        .from("profiles")
        .update({ weight_current: weight })
        .eq("id", session.user.id);

      if (error) throw error;

      // Save to weight history
      const { error: historyError } = await supabase
        .from("weight_history")
        .insert({
          user_id: session.user.id,
          weight: weight,
          goal_weight: goalWeight,
        });

      if (historyError) {
        console.error("Error saving weight history:", historyError);
      }

      // Calcular resultado
      const weightChange = currentWeight - weight;
      const isLoseMode = goalMode === "lose";
      const isGainMode = goalMode === "gain";

      let achieved = false;
      let message = "";
      let lostKg: number | undefined;
      let gainedKg: number | undefined;
      let remaining: number | undefined;

      if (isLoseMode) {
        // Modo emagrecimento: meta atingida se peso <= meta
        achieved = weight <= goalWeight;
        lostKg = weightChange > 0 ? weightChange : undefined;

        if (achieved) {
          message = weight < goalWeight
            ? `Você superou sua meta! 🎉 Está ${(goalWeight - weight).toFixed(1)}kg abaixo do objetivo!`
            : "Parabéns! Você atingiu sua meta de peso! 🏆";
        } else {
          remaining = weight - goalWeight;
          if (weightChange > 0) {
            message = `Ótimo progresso! Você perdeu ${weightChange.toFixed(1)}kg. Faltam ${remaining.toFixed(1)}kg para a meta!`;
          } else if (weightChange < 0) {
            message = `Não desanime! Faltam ${remaining.toFixed(1)}kg para sua meta. Continue firme! 💪`;
          } else {
            message = `Peso mantido. Faltam ${remaining.toFixed(1)}kg para sua meta. Vamos lá! 💪`;
          }
        }
      } else if (isGainMode) {
        // Modo ganho: meta atingida se peso >= meta
        achieved = weight >= goalWeight;
        gainedKg = weightChange < 0 ? Math.abs(weightChange) : undefined;

        if (achieved) {
          message = weight > goalWeight
            ? `Você superou sua meta! 🎉 Está ${(weight - goalWeight).toFixed(1)}kg acima do objetivo!`
            : "Parabéns! Você atingiu sua meta de peso! 🏆";
        } else {
          remaining = goalWeight - weight;
          if (weightChange < 0) {
            message = `Ótimo progresso! Você ganhou ${Math.abs(weightChange).toFixed(1)}kg. Faltam ${remaining.toFixed(1)}kg para a meta!`;
          } else if (weightChange > 0) {
            message = `Calma! Faltam ${remaining.toFixed(1)}kg para sua meta. Continue focado! 💪`;
          } else {
            message = `Peso mantido. Faltam ${remaining.toFixed(1)}kg para sua meta. Vamos lá! 💪`;
          }
        }
      }

      setCelebrationData({ achieved, message, lostKg, gainedKg, remaining });
      setShowCelebration(true);

      if (achieved) {
        triggerConfetti();
      }

      // Log user action
      await logUserAction(
        "weight_update",
        achieved 
          ? `Meta de peso atingida! Novo peso: ${weight}kg` 
          : `Peso atualizado: ${currentWeight}kg → ${weight}kg`,
        { weight: currentWeight, goal_weight: goalWeight },
        { weight: weight, goal_weight: goalWeight, achieved }
      );

      onWeightUpdated(weight);
    } catch (error) {
      console.error("Erro ao atualizar peso:", error);
      toast.error("Erro ao salvar peso. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setShowCelebration(false);
    setCelebrationData(null);
    setNewWeight(currentWeight?.toString() || "");
    onOpenChange(false);
  };

  const isLoseMode = goalMode === "lose";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!showCelebration ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Informar Novo Peso
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Peso atual: <strong className="text-foreground">{currentWeight}kg</strong></span>
                <span>Meta: <strong className={isLoseMode ? "text-green-600" : "text-blue-600"}>{goalWeight}kg</strong></span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-weight">Novo peso (kg)</Label>
                <Input
                  id="new-weight"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  value={newWeight}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    if (value.length <= 3) {
                      setNewWeight(value);
                    }
                  }}
                  placeholder="Ex: 75"
                  className="text-lg font-semibold text-center"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  className={cn(
                    "flex-1",
                    isLoseMode 
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600" 
                      : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                  )}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center space-y-6">
            {celebrationData?.achieved ? (
              <>
                <div className="relative">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center animate-scale-in shadow-lg">
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                  <Sparkles className="absolute top-0 right-1/4 w-6 h-6 text-yellow-500 animate-pulse" />
                  <Sparkles className="absolute bottom-0 left-1/4 w-5 h-5 text-amber-500 animate-pulse delay-150" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    Meta Atingida! 🎉
                  </h2>
                  <p className="text-muted-foreground">
                    {celebrationData.message}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4">
                  <p className="text-lg font-semibold text-green-600">
                    Novo peso: {newWeight}kg
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center animate-scale-in">
                  {isLoseMode ? (
                    <TrendingDown className="w-10 h-10 text-primary" />
                  ) : (
                    <TrendingUp className="w-10 h-10 text-blue-500" />
                  )}
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-display font-bold text-foreground">
                    Peso Atualizado!
                  </h2>
                  <p className="text-muted-foreground">
                    {celebrationData?.message}
                  </p>
                </div>
                <div className={cn(
                  "rounded-xl p-4",
                  isLoseMode 
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30"
                    : "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30"
                )}>
                  <div className="flex items-center justify-center gap-2">
                    <Target className={cn("w-5 h-5", isLoseMode ? "text-green-600" : "text-blue-600")} />
                    <p className={cn("text-lg font-semibold", isLoseMode ? "text-green-600" : "text-blue-600")}>
                      Faltam {celebrationData?.remaining?.toFixed(1)}kg
                    </p>
                  </div>
                </div>
              </>
            )}
            <Button 
              onClick={handleClose}
              className={cn(
                "w-full",
                celebrationData?.achieved
                  ? "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
                  : isLoseMode
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              )}
            >
              {celebrationData?.achieved ? "Celebrar! 🎉" : "Continuar 💪"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}