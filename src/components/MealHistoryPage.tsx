import { useState } from "react";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Clock,
  ChevronDown,
  Leaf,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  FileSpreadsheet,
  SkipForward,
  ArrowLeft,
  Flame,
  Beef,
  Wheat,
} from "lucide-react";
import { useMealHistory, MealStatus, MealHistoryItem, MealHistoryFilters } from "@/hooks/useMealHistory";
import { SymptomIcon } from "./SymptomIcon";
import { cn } from "@/lib/utils";
import { exportMealHistoryToCSV, exportMealHistoryToPDF } from "@/lib/exportMealHistory";
import { toast } from "sonner";

interface MealHistoryPageProps {
  onBack: () => void;
}

const statusConfig = {
  well: { 
    label: "OK", 
    dot: "bg-green-500", 
    icon: CheckCircle2,
    iconColor: "text-green-600",
  },
  auto_well: { 
    label: "OK", 
    dot: "bg-green-500", 
    icon: CheckCircle2,
    iconColor: "text-green-600",
  },
  symptoms: { 
    label: "Com sintomas", 
    dot: "bg-orange-500", 
    icon: AlertCircle,
    iconColor: "text-orange-600",
  },
  pending: { 
    label: "Pendente", 
    dot: "bg-gray-400", 
    icon: HelpCircle,
    iconColor: "text-muted-foreground",
  },
  skipped: { 
    label: "Pulada", 
    dot: "bg-amber-400", 
    icon: SkipForward,
    iconColor: "text-amber-600",
  },
};

const severityConfig = {
  leve: { label: "Leve", color: "text-yellow-600" },
  moderado: { label: "Moderado", color: "text-orange-600" },
  severo: { label: "Severo", color: "text-red-600" },
};

export function MealHistoryPage({ onBack }: MealHistoryPageProps) {
  const [filters, setFilters] = useState<MealHistoryFilters>({
    days: 30,
    status: "all",
  });

  const { meals, isLoading, counts } = useMealHistory(filters);

  const handleExportCSV = () => {
    exportMealHistoryToCSV(meals, filters.days);
    toast.success("Relatório CSV exportado!");
  };

  const handleExportPDF = () => {
    exportMealHistoryToPDF(meals, filters.days);
  };

  const getDaysLabel = (days: number) => {
    if (days === 0) return "Hoje";
    return `${days} dias`;
  };

  const getStatusLabel = (status: MealStatus) => {
    switch (status) {
      case "ok": return "OK ✓";
      case "symptoms": return "Sintomas";
      case "pending": return "Pendentes";
      case "skipped": return "Puladas";
      default: return "Todas";
    }
  };

  // Group meals by date
  const groupedMeals = meals.reduce<Record<string, MealHistoryItem[]>>((acc, meal) => {
    const dateKey = startOfDay(new Date(meal.consumedAt)).toISOString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(meal);
    return acc;
  }, {});

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "EEEE, dd/MM", { locale: ptBR });
  };

  // Calculate totals
  const totalCalories = meals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
  const totalMeals = meals.length;
  const completedMeals = meals.filter(m => m.feedbackStatus === "well" || m.feedbackStatus === "auto_well").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Histórico de Refeições</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe todas as suas refeições
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-card rounded-xl p-3 border">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs">Calorias</span>
          </div>
          <p className="font-bold text-lg">{totalCalories.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-3 border">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs">Feitas</span>
          </div>
          <p className="font-bold text-lg">{completedMeals}/{totalMeals}</p>
        </div>
        <div className="bg-card rounded-xl p-3 border">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs">Sintomas</span>
          </div>
          <p className="font-bold text-lg">{counts.symptoms}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Select
          value={filters.days.toString()}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, days: parseInt(v) as 0 | 7 | 14 | 21 | 30 }))
          }
        >
          <SelectTrigger className="w-28 h-9">
            <SelectValue>{getDaysLabel(filters.days)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Hoje</SelectItem>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="14">14 dias</SelectItem>
            <SelectItem value="21">21 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, status: v as MealStatus }))
          }
        >
          <SelectTrigger className="w-32 h-9">
            <SelectValue>{getStatusLabel(filters.status)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="ok">OK ✓</SelectItem>
            <SelectItem value="symptoms">Com sintomas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="skipped">Puladas</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleExportCSV}>
          <FileSpreadsheet className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleExportPDF}>
          <FileText className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {meals.length === 0 ? (
            <div className="text-center py-16">
              <Leaf className="h-12 w-12 mx-auto mb-3 text-primary/40" />
              <p className="text-sm text-muted-foreground">Nenhuma refeição encontrada</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {filters.status !== "all" ? "Tente outro filtro" : "Registre suas refeições"}
              </p>
            </div>
          ) : (
            Object.entries(groupedMeals)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([dateKey, dateMeals]) => (
                <div key={dateKey}>
                  {/* Date header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground capitalize">
                      {getDateLabel(dateKey)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {dateMeals.length} refeição{dateMeals.length > 1 ? 'ões' : ''}
                    </span>
                  </div>

                  {/* Meals for this date */}
                  <div className="space-y-2">
                    {dateMeals.map((meal) => (
                      <MealCard key={meal.id} meal={meal} />
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
      
      {/* Disclaimer */}
      <div className="pt-3 mt-3 border-t">
        <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
          ⚠️ Este rastreamento é apenas informativo e não substitui orientação médica profissional.
        </p>
      </div>
    </div>
  );
}

function MealCard({ meal }: { meal: MealHistoryItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const status = statusConfig[meal.feedbackStatus as keyof typeof statusConfig] || statusConfig.pending;
  const hasSymptoms = meal.symptoms.length > 0;
  const hasDetails = hasSymptoms || meal.totalProtein || meal.totalCarbs || meal.totalFat;
  const StatusIcon = status.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl border transition-all",
            "bg-card hover:bg-accent/50",
            isOpen && "bg-accent/30 border-primary/20",
            meal.feedbackStatus === "skipped" && "opacity-60"
          )}>
            {/* Status indicator */}
            <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", status.dot)} />
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{meal.recipeName}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{format(new Date(meal.consumedAt), "HH:mm", { locale: ptBR })}</span>
                {meal.totalCalories > 0 && (
                  <>
                    <span className="opacity-50">•</span>
                    <span>{meal.totalCalories} kcal</span>
                  </>
                )}
                {meal.feedbackStatus === "skipped" && (
                  <>
                    <span className="opacity-50">•</span>
                    <span className="text-amber-600">Pulada</span>
                  </>
                )}
                {(meal.feedbackStatus === "well" || meal.feedbackStatus === "auto_well") && (
                  <>
                    <span className="opacity-50">•</span>
                    <span className="text-green-600">Concluída</span>
                  </>
                )}
              </div>
            </div>

            {/* Status icon */}
            <StatusIcon className={cn("h-4 w-4 shrink-0", status.iconColor)} />

            {hasDetails && (
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      {hasDetails && (
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-2 space-y-3 ml-5 border-l border-dashed border-border">
            {/* Macros */}
            {(meal.totalProtein || meal.totalCarbs || meal.totalFat) && (
              <div className="flex gap-3 text-xs">
                {meal.totalProtein && (
                  <div className="flex items-center gap-1 text-red-600">
                    <Beef className="w-3 h-3" />
                    <span>{Math.round(meal.totalProtein * 10) / 10}g prot</span>
                  </div>
                )}
                {meal.totalCarbs && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <Wheat className="w-3 h-3" />
                    <span>{Math.round(meal.totalCarbs * 10) / 10}g carb</span>
                  </div>
                )}
                {meal.totalFat && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <span>🧈</span>
                    <span>{Math.round(meal.totalFat * 10) / 10}g gord</span>
                  </div>
                )}
              </div>
            )}

            {/* Symptoms */}
            {hasSymptoms && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs text-muted-foreground">Sintomas</p>
                  {meal.severity && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      severityConfig[meal.severity as keyof typeof severityConfig]?.color || "text-muted-foreground"
                    )}>
                      • {severityConfig[meal.severity as keyof typeof severityConfig]?.label || meal.severity}
                    </span>
                  )}
                  {meal.timeSinceSymptom !== null && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
                      <Clock className="h-3 w-3" />
                      após {meal.timeSinceSymptom}h
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {meal.symptoms.map((symptom, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 text-xs text-foreground/80 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-md"
                    >
                      <SymptomIcon name={symptom} size={12} />
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {meal.symptomNotes && (
              <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                "{meal.symptomNotes}"
              </p>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export default MealHistoryPage;
