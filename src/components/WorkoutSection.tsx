import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Dumbbell, Loader2, Plus, Trash2, Play, Clock, Target } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ExerciseCard from "./ExerciseCard";
import WorkoutGenerator from "./WorkoutGenerator";

type WorkoutPlan = {
  id: string;
  name: string;
  target_muscle_group: string;
  difficulty: string;
  is_active: boolean;
  created_at: string;
  workout_exercises: WorkoutExercise[];
};

type WorkoutExercise = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  body_part: string;
  target_muscle: string;
  equipment: string;
  gif_url: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  order_index: number;
};

type WorkoutSectionProps = {
  onBack: () => void;
};

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  "peito": "Peito",
  "costas": "Costas",
  "ombros": "Ombros",
  "braços": "Braços",
  "pernas": "Pernas",
  "abdômen": "Abdômen",
  "corpo_todo": "Corpo Todo",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  "beginner": "Iniciante",
  "intermediate": "Intermediário",
  "advanced": "Avançado",
};

export default function WorkoutSection({ onBack }: WorkoutSectionProps) {
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutPlan | null>(null);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [isWorkoutMode, setIsWorkoutMode] = useState(false);

  const fetchWorkouts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("workout_plans")
        .select(`
          *,
          workout_exercises (*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Sort exercises by order_index
      const sortedData = (data || []).map(workout => ({
        ...workout,
        workout_exercises: (workout.workout_exercises || []).sort(
          (a: WorkoutExercise, b: WorkoutExercise) => a.order_index - b.order_index
        ),
      }));
      
      setWorkouts(sortedData);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      toast.error("Erro ao carregar treinos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const handleDeleteWorkout = async (workoutId: string) => {
    try {
      const { error } = await supabase
        .from("workout_plans")
        .delete()
        .eq("id", workoutId);

      if (error) throw error;
      
      toast.success("Treino excluído");
      fetchWorkouts();
    } catch (error) {
      console.error("Error deleting workout:", error);
      toast.error("Erro ao excluir treino");
    }
  };

  const handleStartWorkout = (workout: WorkoutPlan) => {
    setSelectedWorkout(workout);
    setActiveExerciseIndex(0);
    setIsWorkoutMode(true);
  };

  const handleNextExercise = () => {
    if (selectedWorkout && activeExerciseIndex < selectedWorkout.workout_exercises.length - 1) {
      setActiveExerciseIndex(activeExerciseIndex + 1);
    } else {
      toast.success("🎉 Treino concluído! Parabéns!");
      setIsWorkoutMode(false);
      setSelectedWorkout(null);
    }
  };

  const handlePrevExercise = () => {
    if (activeExerciseIndex > 0) {
      setActiveExerciseIndex(activeExerciseIndex - 1);
    }
  };

  if (isWorkoutMode && selectedWorkout) {
    const currentExercise = selectedWorkout.workout_exercises[activeExerciseIndex];
    const progress = ((activeExerciseIndex + 1) / selectedWorkout.workout_exercises.length) * 100;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setIsWorkoutMode(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Sair do Treino
          </Button>
          <span className="text-sm text-muted-foreground">
            {activeExerciseIndex + 1} / {selectedWorkout.workout_exercises.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ExerciseCard 
          exercise={currentExercise} 
          isActive={true}
          showFullDetails={true}
        />

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrevExercise}
            disabled={activeExerciseIndex === 0}
            className="flex-1"
          >
            Anterior
          </Button>
          <Button
            onClick={handleNextExercise}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white"
          >
            {activeExerciseIndex === selectedWorkout.workout_exercises.length - 1 
              ? "Finalizar" 
              : "Próximo"
            }
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h2 className="font-display text-xl font-bold">Meus Treinos</h2>
        <Button 
          onClick={() => setShowGenerator(true)}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : workouts.length === 0 ? (
        <Card className="glass-card border-dashed border-2 border-border/50">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-orange-500/20 rounded-2xl flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">Nenhum treino ainda</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Crie seu primeiro treino com exercícios animados
              </p>
            </div>
            <Button 
              onClick={() => setShowGenerator(true)}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Treino
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workouts.map((workout) => (
            <Card 
              key={workout.id} 
              className="glass-card border-border/50 hover:border-orange-500/30 transition-all"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shrink-0">
                      <Dumbbell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-foreground">
                        {workout.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {MUSCLE_GROUP_LABELS[workout.target_muscle_group] || workout.target_muscle_group}
                        </span>
                        <span>•</span>
                        <span>{DIFFICULTY_LABELS[workout.difficulty] || workout.difficulty}</span>
                        <span>•</span>
                        <span>{workout.workout_exercises?.length || 0} exercícios</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleStartWorkout(workout)}
                      className="bg-gradient-to-r from-orange-500 to-red-500 text-white"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Iniciar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteWorkout(workout.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

{/* Exercise preview */}
                {workout.workout_exercises && workout.workout_exercises.length > 0 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                    {workout.workout_exercises.slice(0, 4).map((exercise, index) => (
                      <div 
                        key={exercise.id}
                        className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 flex items-center justify-center"
                        title={exercise.exercise_name}
                      >
                        <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                    {workout.workout_exercises.length > 4 && (
                      <div className="shrink-0 w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">
                          +{workout.workout_exercises.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generator Dialog */}
      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Treino</DialogTitle>
          </DialogHeader>
          <WorkoutGenerator 
            onSuccess={() => {
              setShowGenerator(false);
              fetchWorkouts();
            }}
            onCancel={() => setShowGenerator(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
