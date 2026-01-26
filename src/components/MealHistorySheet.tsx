import { useState, useEffect } from "react";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
} from "lucide-react";
import { useMealHistory, MealStatus, MealHistoryItem, MealHistoryFilters } from "@/hooks/useMealHistory";
import { SymptomIcon } from "./SymptomIcon";
import { cn } from "@/lib/utils";
import { exportMealHistoryToCSV, exportMealHistoryToPDF } from "@/lib/exportMealHistory";
import { toast } from "sonner";

interface MealHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: MealStatus;
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
};

const severityConfig = {
  leve: { label: "Leve", color: "text-yellow-600" },
  moderado: { label: "Moderado", color: "text-orange-600" },
  severo: { label: "Severo", color: "text-red-600" },
};

export function MealHistorySheet({
  open,
  onOpenChange,
  defaultStatus = "all",
}: MealHistorySheetProps) {
  // Determine if this is the wellness diary context (only evaluated meals)
  const isWellnessDiary = defaultStatus === "evaluated" || defaultStatus === "ok" || defaultStatus === "symptoms";
  
  const [filters, setFilters] = useState<MealHistoryFilters>({
    days: 30,
    status: defaultStatus,
  });

  // Update filters when defaultStatus changes (e.g., clicking different cards)
  useEffect(() => {
    setFilters(prev => ({ ...prev, status: defaultStatus }));
  }, [defaultStatus]);

  const { meals, isLoading } = useMealHistory(filters);

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
      case "evaluated": return "Avaliadas";
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

  // Calculate wellness summary counts
  const wellnessSummary = isWellnessDiary ? {
    okCount: meals.filter(m => m.feedbackStatus === "well" || m.feedbackStatus === "auto_well").length,
    symptomsCount: meals.filter(m => m.feedbackStatus === "symptoms").length,
  } : null;

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "EEEE, dd/MM", { locale: ptBR });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
        <SheetHeader className="p-6 pb-0 flex-shrink-0">
          <SheetTitle className="text-lg font-semibold">
            {isWellnessDiary ? "Diário de Bem-estar" : "Histórico de Refeições"}
          </SheetTitle>
          {isWellnessDiary && (
            <div className="mt-1 space-y-1">
              <p className="text-xs text-muted-foreground">
                Suas avaliações após as refeições
              </p>
              {wellnessSummary && !isLoading && (
                <p className="text-xs font-medium">
                  <span className="text-green-600">✅ {wellnessSummary.okCount} OK</span>
                  <span className="text-muted-foreground mx-2">•</span>
                  <span className="text-orange-600">⚠️ {wellnessSummary.symptomsCount} com sintomas</span>
                  <span className="text-muted-foreground ml-1">
                    ({filters.days === 0 ? "hoje" : `últimos ${filters.days} dias`})
                  </span>
                </p>
              )}
            </div>
          )}
        </SheetHeader>

        {/* Filters */}
        <div className="flex items-center gap-2 px-6 py-4 flex-shrink-0">
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

          {/* Hide status filter in wellness diary mode */}
          {!isWellnessDiary && (
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
                <SelectItem value="evaluated">Avaliadas</SelectItem>
                <SelectItem value="ok">OK ✓</SelectItem>
                <SelectItem value="symptoms">Com sintomas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="flex-1" />

          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleExportPDF}>
            <FileText className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-4 pb-4">
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
                          <MealCard key={meal.id} meal={meal} isWellnessMode={isWellnessDiary} />
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
        
        {/* Disclaimer - Fixed Footer */}
        <div className="p-4 border-t flex-shrink-0">
          <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
            ⚠️ Este rastreamento é apenas informativo e não substitui orientação médica profissional.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface MealCardProps {
  meal: MealHistoryItem;
  isWellnessMode?: boolean;
}

function MealCard({ meal, isWellnessMode = false }: MealCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const status = statusConfig[meal.feedbackStatus as keyof typeof statusConfig] || statusConfig.pending;
  const hasSymptoms = meal.symptoms.length > 0;
  const StatusIcon = status.icon;

  // In wellness mode, show status as main info
  const mainLabel = isWellnessMode 
    ? (hasSymptoms ? "Tive sintomas" : "Me senti bem")
    : meal.recipeName;

  const cardBg = isWellnessMode
    ? hasSymptoms 
      ? "bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10" 
      : "bg-green-500/5 border-green-500/20 hover:bg-green-500/10"
    : "bg-card hover:bg-accent/50";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl border transition-all",
            cardBg,
            isOpen && "border-primary/20"
          )}>
            {/* Status indicator */}
            <StatusIcon className={cn("h-5 w-5 shrink-0", status.iconColor)} />
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              {isWellnessMode ? (
                <>
                  <p className={cn(
                    "font-medium text-sm",
                    hasSymptoms ? "text-orange-700" : "text-green-700"
                  )}>
                    {hasSymptoms ? "⚠️ Tive sintomas" : "✅ Me senti bem"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {meal.recipeName} • {format(new Date(meal.consumedAt), "HH:mm", { locale: ptBR })}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-sm truncate">{meal.recipeName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{format(new Date(meal.consumedAt), "HH:mm", { locale: ptBR })}</span>
                    {meal.totalCalories > 0 && (
                      <>
                        <span className="opacity-50">•</span>
                        <span>{meal.totalCalories} kcal</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {hasSymptoms && (
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      {hasSymptoms && (
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-2 space-y-3 ml-5 border-l border-dashed border-orange-300">
            {/* Symptoms */}
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
