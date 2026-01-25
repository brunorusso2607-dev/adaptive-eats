import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, HelpCircle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Compatibility = 'good' | 'moderate' | 'incompatible' | 'unknown';

interface DietaryCompatibilityBadgeProps {
  compatibility: Compatibility;
  notes?: string | null;
  compact?: boolean;
  showLabel?: boolean;
}

const COMPATIBILITY_CONFIG: Record<Compatibility, {
  label: string;
  shortLabel: string;
  icon: typeof Check;
  className: string;
  iconClassName: string;
}> = {
  good: {
    label: 'Compatível com suas restrições',
    shortLabel: 'Compatível',
    icon: Check,
    className: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
    iconClassName: 'text-green-600 dark:text-green-400',
  },
  moderate: {
    label: 'Moderação recomendada',
    shortLabel: 'Moderado',
    icon: Minus,
    className: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    iconClassName: 'text-yellow-600 dark:text-yellow-400',
  },
  incompatible: {
    label: 'Incompatível com suas restrições',
    shortLabel: 'Incompatível',
    icon: AlertTriangle,
    className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    iconClassName: 'text-red-600 dark:text-red-400',
  },
  unknown: {
    label: 'Compatibilidade não verificada',
    shortLabel: 'Não verificado',
    icon: HelpCircle,
    className: 'bg-muted text-muted-foreground border-muted-foreground/30',
    iconClassName: 'text-muted-foreground',
  },
};

export function DietaryCompatibilityBadge({ 
  compatibility, 
  notes, 
  compact = false,
  showLabel = true 
}: DietaryCompatibilityBadgeProps) {
  const config = COMPATIBILITY_CONFIG[compatibility];
  const Icon = config.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center",
              compatibility === 'good' && "bg-green-500/20",
              compatibility === 'moderate' && "bg-yellow-500/20",
              compatibility === 'incompatible' && "bg-red-500/20",
              compatibility === 'unknown' && "bg-muted"
            )}>
              <Icon className={cn("w-3 h-3", config.iconClassName)} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="font-medium text-sm">{config.label}</p>
            {notes && <p className="text-xs text-muted-foreground mt-1">{notes}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 text-[10px] sm:text-xs font-medium px-1.5 py-0.5",
              config.className
            )}
          >
            <Icon className="w-3 h-3" />
            {showLabel && <span className="hidden sm:inline">{config.shortLabel}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium text-sm">{config.label}</p>
          {notes && <p className="text-xs text-muted-foreground mt-1">{notes}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
