import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type WorkoutGeneratorProps = {
  onSuccess: () => void;
  onCancel: () => void;
};

const MUSCLE_GROUPS = [
  { id: "peito", label: "Peito", emoji: "💪" },
  { id: "costas", label: "Costas", emoji: "🔙" },
  { id: "ombros", label: "Ombros", emoji: "🎯" },
  { id: "braços", label: "Braços", emoji: "💪" },
  { id: "pernas", label: "Pernas", emoji: "🦵" },
  { id: "abdômen", label: "Abdômen", emoji: "🔥" },
  { id: "corpo_todo", label: "Corpo Todo", emoji: "🏋️" },
];

const DIFFICULTIES = [
  { id: "beginner", label: "Iniciante", description: "3 séries, 12 reps" },
  { id: "intermediate", label: "Intermediário", description: "4 séries, 10 reps" },
  { id: "advanced", label: "Avançado", description: "5 séries, 8 reps" },
];

export default function WorkoutGenerator({ onSuccess, onCancel }: WorkoutGeneratorProps) {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState("intermediate");
  const [planName, setPlanName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedMuscle) {
      toast.error("Selecione um grupo muscular");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-workout", {
        body: {
          muscleGroup: selectedMuscle,
          difficulty: selectedDifficulty,
          planName: planName.trim() || undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao gerar treino");

      toast.success("Treino criado com sucesso! 💪");
      onSuccess();
    } catch (error) {
      console.error("Error generating workout:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar treino");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Plan name */}
      <div className="space-y-2">
        <Label htmlFor="planName">Nome do treino (opcional)</Label>
        <Input
          id="planName"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder="Ex: Treino de Peito Segunda"
        />
      </div>

      {/* Muscle group selection */}
      <div className="space-y-2">
        <Label>Grupo Muscular</Label>
        <div className="grid grid-cols-2 gap-2">
          {MUSCLE_GROUPS.map((muscle) => (
            <Button
              key={muscle.id}
              variant="outline"
              onClick={() => setSelectedMuscle(muscle.id)}
              className={cn(
                "h-auto py-3 justify-start",
                selectedMuscle === muscle.id && "border-orange-500 bg-orange-500/10"
              )}
            >
              <span className="mr-2">{muscle.emoji}</span>
              {muscle.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Difficulty selection */}
      <div className="space-y-2">
        <Label>Dificuldade</Label>
        <div className="space-y-2">
          {DIFFICULTIES.map((diff) => (
            <Button
              key={diff.id}
              variant="outline"
              onClick={() => setSelectedDifficulty(diff.id)}
              className={cn(
                "w-full h-auto py-3 justify-between",
                selectedDifficulty === diff.id && "border-orange-500 bg-orange-500/10"
              )}
            >
              <span>{diff.label}</span>
              <span className="text-xs text-muted-foreground">{diff.description}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={!selectedMuscle || isGenerating}
          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Dumbbell className="w-4 h-4 mr-2" />
              Gerar Treino
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
