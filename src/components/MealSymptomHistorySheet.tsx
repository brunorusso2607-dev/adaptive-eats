import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Utensils,
  Ban,
  TrendingUp,
} from "lucide-react";
import {
  useMealSymptomHistory,
  SymptomHistoryFilters,
  MealWithSymptoms,
} from "@/hooks/useMealSymptomHistory";
import { exportToCSV, exportToPDF } from "@/lib/exportSymptomReport";
import { SymptomIcon } from "./SymptomIcon";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MealSymptomHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const severityConfig = {
  leve: { label: "Leve", class: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  moderado: { label: "Moderado", class: "bg-orange-500/10 text-orange-700 border-orange-500/20" },
  severo: { label: "Severo", class: "bg-red-500/10 text-red-700 border-red-500/20" },
};

export function MealSymptomHistorySheet({
  open,
  onOpenChange,
}: MealSymptomHistorySheetProps) {
  const [filters, setFilters] = useState<SymptomHistoryFilters>({
    days: 30,
  });

  const { meals, foodCorrelations, suspectFoods, isLoading } =
    useMealSymptomHistory(filters);

  const handleExportCSV = () => {
    exportToCSV(meals, foodCorrelations);
    toast.success("Relatório CSV exportado!");
  };

  const handleExportPDF = () => {
    exportToPDF(meals, foodCorrelations, suspectFoods, filters.days);
  };

  const handleExcludeFood = async (food: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("excluded_ingredients")
        .eq("id", session.user.id)
        .single();

      const currentExcluded = profile?.excluded_ingredients || [];
      
      if (currentExcluded.includes(food)) {
        toast.info(`${food} já está na lista de exclusões`);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          excluded_ingredients: [...currentExcluded, food],
        })
        .eq("id", session.user.id);

      if (error) throw error;

      toast.success(`${food} adicionado à lista de exclusões`);
    } catch (err) {
      console.error("Error excluding food:", err);
      toast.error("Erro ao excluir alimento");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-6">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Refeições que causaram sintomas
          </SheetTitle>
        </SheetHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 py-4 border-b">
          <Select
            value={filters.days.toString()}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, days: parseInt(v) as 7 | 14 | 21 | 30 }))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="21">21 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.severity || "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, severity: v === "all" ? undefined : v }))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="leve">Leve</SelectItem>
              <SelectItem value="moderado">Moderado</SelectItem>
              <SelectItem value="severo">Severo</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            {/* Suspect Foods Summary */}
            {suspectFoods.length > 0 && (
              <div className="py-4 border-b">
                <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-destructive" />
                  Alimentos Suspeitos
                  <span className="text-xs text-muted-foreground font-normal">
                    (&gt;30% dos casos)
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {suspectFoods.map((food) => (
                    <div
                      key={food.food}
                      className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm font-medium">{food.food}</span>
                      <Badge variant="destructive" className="text-xs">
                        {food.percentage}%
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/20"
                        onClick={() => handleExcludeFood(food.food)}
                        title="Adicionar à lista de exclusões"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meals List */}
            <div className="py-4 space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Histórico de Refeições ({meals.length})
              </h3>

              {meals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-10 w-10 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">Nenhuma refeição associada a sintomas</p>
                  <p className="text-xs">Isso é ótimo! Continue assim.</p>
                </div>
              ) : (
                meals.map((meal, index) => (
                  <MealCard
                    key={`${meal.mealId}-${index}`}
                    meal={meal}
                    isSuspect={(food: string) =>
                      suspectFoods.some((s) => s.food === food)
                    }
                  />
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MealCard({
  meal,
  isSuspect,
}: {
  meal: MealWithSymptoms;
  isSuspect: (food: string) => boolean;
}) {
  const severity = severityConfig[meal.severity as keyof typeof severityConfig];

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">
            {format(new Date(meal.mealDate), "dd/MM • HH:mm", { locale: ptBR })}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Sintoma após {meal.timeDiffHours}h
          </p>
        </div>
        <Badge variant="outline" className={cn("text-xs", severity?.class)}>
          {severity?.label || meal.severity}
        </Badge>
      </div>

      {/* Foods */}
      <div className="flex flex-wrap gap-1">
        {meal.foods.map((food, i) => (
          <span
            key={i}
            className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              isSuspect(food)
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : "bg-muted"
            )}
          >
            {food}
          </span>
        ))}
      </div>

      {/* Symptoms */}
      <div className="flex flex-wrap gap-1">
        {meal.symptoms.map((symptom, i) => (
          <span
            key={i}
            className="flex items-center gap-1 text-xs bg-orange-500/10 text-orange-700 px-2 py-0.5 rounded-full"
          >
            <SymptomIcon name={symptom} size={10} />
            {symptom}
          </span>
        ))}
      </div>

      {meal.notes && (
        <p className="text-xs text-muted-foreground italic">{meal.notes}</p>
      )}
    </div>
  );
}
