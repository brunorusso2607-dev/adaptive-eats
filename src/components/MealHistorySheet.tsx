import { useState } from "react";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
} from "lucide-react";
import { useMealHistory, MealStatus, MealHistoryItem, MealHistoryFilters } from "@/hooks/useMealHistory";
import { SymptomIcon } from "./SymptomIcon";
import { cn } from "@/lib/utils";

interface MealHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
}: MealHistorySheetProps) {
  const [filters, setFilters] = useState<MealHistoryFilters>({
    days: 30,
    status: "all",
  });

  const { meals, isLoading } = useMealHistory(filters);

  const getDaysLabel = (days: number) => {
    if (days === 0) return "Hoje";
    return `${days} dias`;
  };

  const getStatusLabel = (status: MealStatus) => {
    switch (status) {
      case "ok": return "OK ✓";
      case "symptoms": return "Sintomas";
      case "pending": return "Pendentes";
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg font-semibold">
            Histórico de Refeições
          </SheetTitle>
        </SheetHeader>

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
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : (
          <div className="overflow-y-auto h-[calc(80vh-200px)] space-y-4">
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
      </SheetContent>
    </Sheet>
  );
}

function MealCard({ meal }: { meal: MealHistoryItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const status = statusConfig[meal.feedbackStatus as keyof typeof statusConfig] || statusConfig.pending;
  const hasSymptoms = meal.symptoms.length > 0;
  const StatusIcon = status.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl border transition-all",
            "bg-card hover:bg-accent/50",
            isOpen && "bg-accent/30 border-primary/20"
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
              </div>
            </div>

            {/* Status icon */}
            <StatusIcon className={cn("h-4 w-4 shrink-0", status.iconColor)} />

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
