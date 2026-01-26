import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, Target, Flag } from "lucide-react";
import { useEffect, useState } from "react";

interface WeightProgressBarProps {
  currentWeight: number;
  goalWeight: number;
  startWeight?: number;
  weeklyChange: number;
  weeksToGoal: number;
  mode: "lose" | "gain" | "maintain";
  className?: string;
}

export default function WeightProgressBar({
  currentWeight,
  goalWeight,
  startWeight,
  weeklyChange,
  weeksToGoal,
  mode,
  className,
}: WeightProgressBarProps) {
  const [isAnimated, setIsAnimated] = useState(false);
  const [displayCurrentWeight, setDisplayCurrentWeight] = useState(goalWeight);
  const [displayGoalWeight, setDisplayGoalWeight] = useState(goalWeight);

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Animate weight counters
  useEffect(() => {
    if (!isAnimated) return;
    
    const duration = 1000;
    const steps = 25;
    
    // Animate current weight
    const currentIncrement = (currentWeight - goalWeight) / steps;
    let currentStep = 0;
    
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayCurrentWeight(currentWeight);
        setDisplayGoalWeight(goalWeight);
        clearInterval(interval);
      } else {
        setDisplayCurrentWeight(goalWeight + currentIncrement * currentStep);
      }
    }, duration / steps);
    
    return () => clearInterval(interval);
  }, [isAnimated, currentWeight, goalWeight]);

  // Use startWeight if provided, otherwise estimate based on mode
  const effectiveStartWeight = startWeight || (mode === "lose" 
    ? Math.max(currentWeight, goalWeight + (goalWeight - currentWeight) * 0.1)
    : Math.min(currentWeight, goalWeight - (currentWeight - goalWeight) * 0.1));
  
  // Calculate progress percentage
  const totalDistance = Math.abs(effectiveStartWeight - goalWeight);
  const currentDistance = Math.abs(currentWeight - goalWeight);
  const progressPercent = totalDistance > 0 
    ? Math.max(0, Math.min(100, ((totalDistance - currentDistance) / totalDistance) * 100))
    : 0;

  // Colors based on mode
  const isGaining = mode === "gain";
  const gradientClass = isGaining 
    ? "from-blue-400 via-blue-500 to-blue-600" 
    : "from-green-400 via-green-500 to-green-600";
  const accentColor = isGaining ? "text-blue-600" : "text-green-600";
  const bgAccent = isGaining ? "bg-blue-500" : "bg-green-500";
  const bgLight = isGaining ? "bg-blue-100 dark:bg-blue-900/30" : "bg-green-100 dark:bg-green-900/30";

  // Format months
  const monthsToGoal = Math.ceil(weeksToGoal / 4);

  return (
    <div className={cn(
      "space-y-3 transition-all duration-500",
      isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      className
    )}>
      {/* Main Progress Container */}
      <div className="relative">
        {/* Labels */}
        <div className="flex justify-between items-end mb-2">
          <div className={cn(
            "text-center transition-all duration-500 delay-100",
            isAnimated ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
          )}>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Target className="w-3 h-3" />
              <span className="text-xs font-medium">Atual</span>
            </div>
            <p className={cn("text-xl font-bold tabular-nums", accentColor)}>
              {displayCurrentWeight.toFixed(1)}kg
            </p>
          </div>
          
          {/* Center - Weekly change badge */}
          <div className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded-full text-white text-sm font-medium shadow-lg transition-all duration-500 delay-200",
            isAnimated ? "opacity-100 scale-100" : "opacity-0 scale-75",
            bgAccent
          )}>
            {isGaining ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{isGaining ? "+" : "-"}{weeklyChange}kg/sem</span>
          </div>
          
          <div className={cn(
            "text-center transition-all duration-500 delay-100",
            isAnimated ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
          )}>
            <div className="flex items-center gap-1 text-muted-foreground justify-end">
              <span className="text-xs font-medium">Meta</span>
              <Flag className="w-3 h-3" />
            </div>
            <p className={cn("text-xl font-bold tabular-nums", accentColor)}>{goalWeight}kg</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={cn(
          "relative h-4 rounded-full overflow-hidden transition-all duration-500 delay-300",
          isAnimated ? "opacity-100" : "opacity-0",
          bgLight
        )}>
          {/* Progress Fill */}
          <div 
            className={cn(
              "absolute left-0 top-0 h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out delay-500",
              gradientClass
            )}
            style={{ width: isAnimated ? `${Math.max(5, progressPercent)}%` : "0%" }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
          </div>
          
          {/* Current position indicator */}
          <div 
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-lg transition-all duration-1000 ease-out",
              isAnimated ? "opacity-100 scale-100" : "opacity-0 scale-0"
            )}
            style={{ 
              left: isAnimated ? `calc(${Math.max(2, Math.min(98, progressPercent))}% - 10px)` : "0%",
              borderColor: isGaining ? "#3b82f6" : "#22c55e",
              borderWidth: "3px",
              transitionDelay: "600ms"
            }}
          />
          
          {/* Goal flag at end */}
          <div className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2 transition-all duration-500 delay-700",
            isAnimated ? "opacity-100" : "opacity-0"
          )}>
            <Flag className={cn("w-3 h-3", accentColor)} />
          </div>
        </div>

        {/* Progress percentage */}
        <div className={cn(
          "flex justify-center mt-2 transition-all duration-500 delay-700",
          isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}>
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", bgLight, accentColor)}>
            {progressPercent.toFixed(0)}% concluído
          </span>
        </div>
      </div>

      {/* Timeline Info */}
      <div className={cn(
        "flex items-center justify-center gap-4 py-2 px-3 rounded-lg transition-all duration-500 delay-800",
        isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        bgLight
      )}>
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full animate-pulse", bgAccent)} />
          <span className="text-sm">
            <strong className={accentColor}>~{weeksToGoal} semanas</strong>
            <span className="text-muted-foreground ml-1">
              ({monthsToGoal} {monthsToGoal === 1 ? "mês" : "meses"})
            </span>
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground">
          Diferença: <strong className={accentColor}>{Math.abs(goalWeight - currentWeight).toFixed(1)}kg</strong>
        </span>
      </div>
    </div>
  );
}
