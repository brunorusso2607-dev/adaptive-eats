import { cn } from "@/lib/utils";
import { Beef, Wheat, Droplets } from "lucide-react";
import { useEffect, useState } from "react";

interface CalorieSpeedometerProps {
  targetCalories: number;
  consumedCalories?: number;
  protein: number;
  consumedProtein?: number;
  carbs: number;
  consumedCarbs?: number;
  fat: number;
  consumedFat?: number;
  mode: "lose" | "gain" | "maintain";
  className?: string;
}

export default function CalorieSpeedometer({
  targetCalories,
  consumedCalories = 0,
  protein,
  consumedProtein = 0,
  carbs,
  consumedCarbs = 0,
  fat,
  consumedFat = 0,
  mode,
  className,
}: CalorieSpeedometerProps) {
  const [isAnimated, setIsAnimated] = useState(false);
  const [displayCalories, setDisplayCalories] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAnimated) return;
    
    const duration = 1000;
    const steps = 25;
    const increment = consumedCalories / steps;
    let current = 0;
    
    const interval = setInterval(() => {
      current += increment;
      if (current >= consumedCalories) {
        setDisplayCalories(consumedCalories);
        clearInterval(interval);
      } else {
        setDisplayCalories(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(interval);
  }, [isAnimated, consumedCalories]);

  // Subtle colors based on mode
  const isGaining = mode === "gain";
  const primaryColor = isGaining ? "#3b82f6" : "#22c55e";
  const accentClass = isGaining ? "text-blue-600" : "text-green-600";

  // Calculate arc progress based on consumed vs target
  const percentage = targetCalories > 0 
    ? Math.min((consumedCalories / targetCalories) * 100, 100) 
    : 0;
  
  // SVG arc calculations - thin stroke
  const radius = 72;
  const strokeWidth = 3;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI;
  const strokeDashoffset = isAnimated 
    ? circumference - (percentage / 100) * circumference 
    : circumference;

  // Calculate macro percentages for consumed
  const consumedMacrosCal = (consumedProtein * 4) + (consumedCarbs * 4) + (consumedFat * 9);
  const targetMacrosCal = (protein * 4) + (carbs * 4) + (fat * 9);
  
  // Show consumed progress against target
  const proteinPercent = protein > 0 ? Math.min((consumedProtein / protein) * 100, 100) : 0;
  const carbsPercent = carbs > 0 ? Math.min((consumedCarbs / carbs) * 100, 100) : 0;
  const fatPercent = fat > 0 ? Math.min((consumedFat / fat) * 100, 100) : 0;

  return (
    <div className={cn(
      "flex flex-col items-center transition-all duration-500",
      isAnimated ? "opacity-100" : "opacity-0",
      className
    )}>
      {/* Arc Speedometer - Clean, thin lines */}
      <div className="relative w-full flex justify-center py-4">
        <svg
          height={radius + 16}
          width={radius * 2 + 16}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`calorieGradient-${mode}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={primaryColor} />
            </linearGradient>
          </defs>
          
          {/* Background arc - very subtle */}
          <path
            d={`M ${8 + strokeWidth/2} ${radius + 8} 
                A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + 8 - strokeWidth/2} ${radius + 8}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
            strokeLinecap="round"
          />
          
          {/* Progress arc - thin gradient */}
          <path
            d={`M ${8 + strokeWidth/2} ${radius + 8} 
                A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + 8 - strokeWidth/2} ${radius + 8}`}
            fill="none"
            stroke={`url(#calorieGradient-${mode})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content - minimal */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
          <p className={cn("text-3xl font-semibold tracking-tight tabular-nums", accentClass)}>
            {displayCalories.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            de {targetCalories.toLocaleString()} kcal
          </p>
        </div>
      </div>

      {/* Motivational message based on progress */}
      <p className="text-xs text-muted-foreground/70 text-center -mt-1">
        {percentage === 0 && "Comece seu dia com energia"}
        {percentage > 0 && percentage < 25 && "Bom começo, continue assim"}
        {percentage >= 25 && percentage < 50 && "Você está no caminho certo"}
        {percentage >= 50 && percentage < 75 && "Mais da metade! Ótimo ritmo"}
        {percentage >= 75 && percentage < 100 && "Quase lá, finalize bem"}
        {percentage >= 100 && "Meta atingida ✓"}
      </p>

      {/* Macros - horizontal clean layout */}
      <div className={cn(
        "w-full mt-2 transition-all duration-500",
        isAnimated ? "opacity-100" : "opacity-0"
      )}>
        {/* Thin progress bar showing consumed vs target */}
        <div className="h-1 rounded-full overflow-hidden flex bg-border mb-4">
          <div 
            className="bg-red-400 transition-all duration-700 relative" 
            style={{ width: `${100/3}%` }}
          >
            <div 
              className="absolute inset-0 bg-red-600 origin-left transition-all duration-700"
              style={{ transform: isAnimated ? `scaleX(${proteinPercent / 100})` : "scaleX(0)" }}
            />
          </div>
          <div 
            className="bg-amber-400 transition-all duration-700 relative" 
            style={{ width: `${100/3}%` }}
          >
            <div 
              className="absolute inset-0 bg-amber-600 origin-left transition-all duration-700"
              style={{ transform: isAnimated ? `scaleX(${carbsPercent / 100})` : "scaleX(0)" }}
            />
          </div>
          <div 
            className="bg-emerald-400 transition-all duration-700 relative" 
            style={{ width: `${100/3}%` }}
          >
            <div 
              className="absolute inset-0 bg-emerald-600 origin-left transition-all duration-700"
              style={{ transform: isAnimated ? `scaleX(${fatPercent / 100})` : "scaleX(0)" }}
            />
          </div>
        </div>

        {/* Horizontal macro metrics - show consumed/target */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Beef className="w-4 h-4 text-red-400" strokeWidth={1.5} />
            <div>
              <span className="text-sm font-medium text-foreground">{consumedProtein}g</span>
              <span className="text-xs text-muted-foreground ml-1">prot</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Wheat className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
            <div>
              <span className="text-sm font-medium text-foreground">{consumedCarbs}g</span>
              <span className="text-xs text-muted-foreground ml-1">carb</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
            <div>
              <span className="text-sm font-medium text-foreground">{consumedFat}g</span>
              <span className="text-xs text-muted-foreground ml-1">gord</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
