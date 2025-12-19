import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Loader2, Sparkles, ArrowLeft, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type MealPlanGeneratorProps = {
  onClose: () => void;
  onPlanGenerated: () => void;
};

export default function MealPlanGenerator({ onClose, onPlanGenerated }: MealPlanGeneratorProps) {
  const [planName, setPlanName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekNumber, setWeekNumber] = useState<1 | 2 | 3 | 4>(1);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!planName.trim()) {
      toast.error("Digite um nome para o plano");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          planName: `${planName} - Semana ${weekNumber}`,
          startDate,
          daysCount: 7
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Plano "${planName} - Semana ${weekNumber}" gerado com sucesso!`);
      onPlanGenerated();
    } catch (error) {
      console.error("Error generating meal plan:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar plano alimentar");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
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
              placeholder="Ex: Minha Semana Saudável"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Data de Início</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Week Selection */}
          <div className="space-y-3">
            <Label>Qual Semana Gerar?</Label>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((week) => (
                <Button
                  key={week}
                  type="button"
                  variant={weekNumber === week ? "default" : "outline"}
                  className={weekNumber === week ? "gradient-primary border-0" : ""}
                  onClick={() => setWeekNumber(week as 1 | 2 | 3 | 4)}
                  disabled={isGenerating}
                >
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Semana {week}
                </Button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            className="w-full gradient-primary border-0 text-lg py-6"
            onClick={handleGenerate}
            disabled={isGenerating || !planName.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Gerando Semana {weekNumber}...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Gerar Plano com IA
              </>
            )}
          </Button>

          {isGenerating && (
            <p className="text-sm text-muted-foreground text-center animate-pulse">
              ⏳ Isso pode levar até 30 segundos...
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
              <h4 className="font-semibold text-foreground">O que será gerado?</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• 7 dias de refeições completas</li>
                <li>• 4 refeições por dia (café, almoço, lanche, jantar)</li>
                <li>• Receitas variadas e diferentes a cada dia</li>
                <li>• Adaptado às suas preferências e metas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
