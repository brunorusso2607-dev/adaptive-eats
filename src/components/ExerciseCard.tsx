import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Dumbbell, Target, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Exercise = {
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

type ExerciseCardProps = {
  exercise: Exercise;
  isActive?: boolean;
  showFullDetails?: boolean;
  onClick?: () => void;
};

const BODY_PART_PT: Record<string, string> = {
  "chest": "Peito",
  "back": "Costas",
  "shoulders": "Ombros",
  "upper arms": "Braços",
  "lower arms": "Antebraços",
  "upper legs": "Pernas",
  "lower legs": "Panturrilhas",
  "waist": "Abdômen",
  "cardio": "Cardio",
};

const TARGET_PT: Record<string, string> = {
  "pectorals": "Peitorais",
  "lats": "Dorsais",
  "traps": "Trapézio",
  "delts": "Deltoides",
  "biceps": "Bíceps",
  "triceps": "Tríceps",
  "forearms": "Antebraços",
  "abs": "Abdominais",
  "quads": "Quadríceps",
  "hamstrings": "Posteriores",
  "glutes": "Glúteos",
  "calves": "Panturrilhas",
  "adductors": "Adutores",
  "abductors": "Abdutores",
  "cardiovascular system": "Cardiovascular",
};

export default function ExerciseCard({ 
  exercise, 
  isActive = false,
  showFullDetails = false,
  onClick 
}: ExerciseCardProps) {
  const bodyPartPt = BODY_PART_PT[exercise.body_part?.toLowerCase()] || exercise.body_part;
  const targetPt = TARGET_PT[exercise.target_muscle?.toLowerCase()] || exercise.target_muscle;

  return (
    <Card 
      className={cn(
        "glass-card transition-all overflow-hidden",
        isActive && "border-orange-500/50 shadow-lg shadow-orange-500/10",
        onClick && "cursor-pointer hover:border-orange-500/30"
      )}
      onClick={onClick}
    >
      <CardContent className={cn("p-0", showFullDetails ? "" : "p-4")}>
        {showFullDetails ? (
          <div className="space-y-4">
            {/* Large GIF */}
            <div className="aspect-square bg-muted relative overflow-hidden">
              {exercise.gif_url ? (
                <img 
                  src={exercise.gif_url} 
                  alt={exercise.exercise_name}
                  className="w-full h-full object-contain bg-white"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Dumbbell className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* Exercise name */}
              <div>
                <h3 className="font-display text-xl font-bold text-foreground capitalize">
                  {exercise.exercise_name}
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-600">
                    {bodyPartPt}
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-600">
                    {targetPt}
                  </Badge>
                  {exercise.equipment && (
                    <Badge variant="outline" className="capitalize">
                      {exercise.equipment}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-orange-500">{exercise.sets}</p>
                  <p className="text-xs text-muted-foreground">séries</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-orange-500">{exercise.reps}</p>
                  <p className="text-xs text-muted-foreground">repetições</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-orange-500">{exercise.rest_seconds}s</p>
                  <p className="text-xs text-muted-foreground">descanso</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
              {exercise.gif_url ? (
                <img 
                  src={exercise.gif_url} 
                  alt={exercise.exercise_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Dumbbell className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground capitalize truncate">
                {exercise.exercise_name}
              </h4>
              <p className="text-sm text-muted-foreground capitalize">
                {targetPt}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  {exercise.sets}x{exercise.reps}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {exercise.rest_seconds}s
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
