import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ArrowLeft, CheckCircle2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type MealPlanGeneratorProps = {
  onClose: () => void;
  onPlanGenerated: () => void;
};

type WeekStatus = "pending" | "generating" | "completed";

interface WeekInfo {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  status: WeekStatus;
}

export default function MealPlanGenerator({ onClose, onPlanGenerated }: MealPlanGeneratorProps) {
  const [planName, setPlanName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [weeks, setWeeks] = useState<WeekInfo[]>([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [mealPlanId, setMealPlanId] = useState<string | null>(null);

  // Initialize 4 weeks starting from today
  useEffect(() => {
    const start = new Date();
    const newWeeks: WeekInfo[] = [];
    
    for (let i = 0; i < 4; i++) {
      const weekStart = addDays(start, i * 7);
      const weekEnd = addDays(weekStart, 6);
      
      newWeeks.push({
        weekNumber: i + 1,
        startDate: weekStart,
        endDate: weekEnd,
        status: "pending"
      });
    }
    setWeeks(newWeeks);
  }, []);

  const formatDateRange = (start: Date, end: Date) => {
    return `${format(start, "dd/MM", { locale: ptBR })} a ${format(end, "dd/MM", { locale: ptBR })}`;
  };

  const generateWeek = async (weekIndex: number, existingPlanId?: string) => {
    const week = weeks[weekIndex];
    if (!week) return;

    setIsGenerating(true);
    setWeeks(prev => prev.map((w, i) => 
      i === weekIndex ? { ...w, status: "generating" } : w
    ));

    try {
      const daysInWeek = differenceInDays(week.endDate, week.startDate) + 1;
      
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          planName: planName || `Plano ${format(new Date(), "MMMM yyyy", { locale: ptBR })}`,
          startDate: week.startDate.toISOString().split('T')[0],
          daysCount: daysInWeek,
          existingPlanId: existingPlanId || mealPlanId,
          weekNumber: week.weekNumber
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Save the plan ID for subsequent weeks
      if (data.mealPlan?.id && !mealPlanId) {
        setMealPlanId(data.mealPlan.id);
      }

      setWeeks(prev => prev.map((w, i) => 
        i === weekIndex ? { ...w, status: "completed" } : w
      ));

      toast.success(`Semana ${week.weekNumber} gerada com sucesso!`);

      // Check if there are more weeks to generate
      const nextWeekIndex = weekIndex + 1;
      if (nextWeekIndex < weeks.length) {
        setCurrentWeekIndex(nextWeekIndex);
        setShowContinueDialog(true);
      } else {
        // All weeks completed
        toast.success(`Plano "${planName}" completo!`);
        onPlanGenerated();
      }
    } catch (error) {
      console.error("Error generating meal plan:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar plano alimentar");
      setWeeks(prev => prev.map((w, i) => 
        i === weekIndex ? { ...w, status: "pending" } : w
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartGeneration = () => {
    if (!planName.trim()) {
      toast.error("Digite um nome para o plano");
      return;
    }
    generateWeek(0);
  };

  const handleContinue = () => {
    setShowContinueDialog(false);
    generateWeek(currentWeekIndex);
  };

  const handleStopHere = () => {
    setShowContinueDialog(false);
    toast.success(`Plano "${planName}" parcialmente criado!`);
    onPlanGenerated();
  };

  const completedWeeks = weeks.filter(w => w.status === "completed").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose} disabled={isGenerating}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Criar Plano Alimentar</h2>
          <p className="text-sm text-muted-foreground">A IA vai gerar um plano personalizado baseado no seu perfil</p>
        </div>
      </div>

      <Card className="glass-card border-primary/20">
        <CardContent className="p-6 space-y-6">
          {/* Plan Name */}
          <div className="space-y-2">
            <Label htmlFor="planName">Nome do Plano</Label>
            <Input
              id="planName"
              placeholder="Ex: Janeiro 2026"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              disabled={isGenerating || completedWeeks > 0}
            />
          </div>

          {/* Info Message */}
          <p className="text-sm text-muted-foreground text-center">
            Gere até 4 semanas de receitas personalizadas de acordo com o seu perfil
          </p>

          {/* Generate Button */}
          <Button
            className="w-full gradient-primary border-0 text-lg py-6"
            onClick={handleStartGeneration}
            disabled={isGenerating || !planName.trim() || completedWeeks > 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Gerando Semana {weeks.find(w => w.status === "generating")?.weekNumber || 1}...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Gerar Plano Alimentar
              </>
            )}
          </Button>

          {isGenerating && (
            <p className="text-sm text-muted-foreground text-center animate-pulse">
              ⏳ Isso pode levar até 30 segundos por semana...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="glass-card border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Como funciona?</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• O plano será gerado semana a semana</li>
                <li>• Após cada semana, você pode continuar ou parar</li>
                <li>• 4 refeições por dia (café, almoço, lanche, jantar)</li>
                <li>• Receitas variadas adaptadas ao seu perfil</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continue Dialog */}
      <AlertDialog open={showContinueDialog} onOpenChange={setShowContinueDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Semana {currentWeekIndex} criada!
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentWeekIndex < weeks.length && weeks[currentWeekIndex] && (
                <>
                  Deseja gerar a <strong>Semana {weeks[currentWeekIndex].weekNumber}</strong> ({formatDateRange(weeks[currentWeekIndex].startDate, weeks[currentWeekIndex].endDate)})?
                  <br /><br />
                  <span className="text-muted-foreground">
                    Progresso: {completedWeeks} de {weeks.length} semanas geradas
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStopHere}>
              Parar por aqui
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleContinue} className="gradient-primary">
              Gerar próxima semana
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
