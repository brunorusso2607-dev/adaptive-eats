import { cn } from "@/lib/utils";
import { Flame, Beef, Wheat, Droplets } from "lucide-react";
import { useEffect, useState } from "react";

interface CalorieSpeedometerProps {
  targetCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  mode: "lose" | "gain" | "maintain";
  className?: string;
}

export default function CalorieSpeedometer({
  targetCalories,
  protein,
  carbs,
  fat,
  mode,
  className,
}: CalorieSpeedometerProps) {
  const [isAnimated, setIsAnimated] = useState(false);
  const [displayCalories, setDisplayCalories] = useState(0);

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Animate calorie counter
  useEffect(() => {
    if (!isAnimated) return;
    
    const duration = 1200;
    const steps = 30;
    const increment = targetCalories / steps;
    let current = 0;
    
    const interval = setInterval(() => {
      current += increment;
      if (current >= targetCalories) {
        setDisplayCalories(targetCalories);
        clearInterval(interval);
      } else {
        setDisplayCalories(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(interval);
  }, [isAnimated, targetCalories]);

  // Colors based on mode
  const isGaining = mode === "gain";
  const primaryColor = isGaining ? "#3b82f6" : "#22c55e";
  const secondaryColor = isGaining ? "#60a5fa" : "#4ade80";
  const bgGradient = isGaining 
    ? "from-blue-500/20 to-blue-600/10" 
    : "from-green-500/20 to-green-600/10";
  const accentClass = isGaining ? "text-blue-600" : "text-green-600";

  // Calculate arc progress (assuming 3000 kcal is max for visual purposes)
  const maxCalories = 3500;
  const percentage = Math.min((targetCalories / maxCalories) * 100, 100);
  
  // SVG arc calculations
  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI; // Only half circle
  const strokeDashoffset = isAnimated 
    ? circumference - (percentage / 100) * circumference 
    : circumference; // Start from empty

  // Calculate macro percentages for mini bars
  const totalMacrosCal = (protein * 4) + (carbs * 4) + (fat * 9);
  const proteinPercent = totalMacrosCal > 0 ? ((protein * 4) / totalMacrosCal) * 100 : 33;
  const carbsPercent = totalMacrosCal > 0 ? ((carbs * 4) / totalMacrosCal) * 100 : 33;
  const fatPercent = totalMacrosCal > 0 ? ((fat * 9) / totalMacrosCal) * 100 : 34;

  return (
    <div className={cn(
      "flex flex-col items-center transition-all duration-500",
      isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      className
    )}>
      {/* Speedometer */}
      <div className={cn(
        "relative w-full flex justify-center pb-2 pt-4 rounded-2xl bg-gradient-to-b transition-transform duration-700",
        isAnimated ? "scale-100" : "scale-95",
        bgGradient
      )}>
        <svg
          height={radius + 20}
          width={radius * 2 + 20}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`calorieGradient-${mode}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={secondaryColor} />
              <stop offset="100%" stopColor={primaryColor} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background arc */}
          <path
            d={`M ${10 + strokeWidth/2} ${radius + 10} 
                A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + 10 - strokeWidth/2} ${radius + 10}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
            strokeLinecap="round"
          />
          
          {/* Progress arc */}
          <path
            d={`M ${10 + strokeWidth/2} ${radius + 10} 
                A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + 10 - strokeWidth/2} ${radius + 10}`}
            fill="none"
            stroke={`url(#calorieGradient-${mode})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            filter="url(#glow)"
          />

          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = (tick / 100) * 180;
            const radian = (angle * Math.PI) / 180;
            const x1 = radius + 10 - Math.cos(radian) * (normalizedRadius - 18);
            const y1 = radius + 10 - Math.sin(radian) * (normalizedRadius - 18);
            const x2 = radius + 10 - Math.cos(radian) * (normalizedRadius - 24);
            const y2 = radius + 10 - Math.sin(radian) * (normalizedRadius - 24);
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={2}
                className="text-muted-foreground/40"
              />
            );
          })}
        </svg>

        {/* Center content */}
        <div className={cn(
          "absolute bottom-2 left-1/2 -translate-x-1/2 text-center transition-all duration-700 delay-300",
          isAnimated ? "opacity-100 scale-100" : "opacity-0 scale-90"
        )}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <Flame className={cn("w-5 h-5 animate-pulse", accentClass)} />
          </div>
          <p className={cn("text-4xl font-bold tracking-tight tabular-nums", accentClass)}>
            {displayCalories.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground font-medium">kcal/dia</p>
        </div>
      </div>

      {/* Macro distribution bar */}
      <div className={cn(
        "w-full mt-3 px-1 transition-all duration-500 delay-500",
        isAnimated ? "opacity-100" : "opacity-0"
      )}>
        <div className="h-2 rounded-full overflow-hidden flex bg-muted/20">
          <div 
            className="bg-red-500 transition-all duration-700 delay-600" 
            style={{ width: isAnimated ? `${proteinPercent}%` : "0%" }} 
          />
          <div 
            className="bg-amber-500 transition-all duration-700 delay-700" 
            style={{ width: isAnimated ? `${carbsPercent}%` : "0%" }} 
          />
          <div 
            className="bg-emerald-500 transition-all duration-700 delay-800" 
            style={{ width: isAnimated ? `${fatPercent}%` : "0%" }} 
          />
        </div>
      </div>

      {/* Macros below */}
      <div className={cn(
        "grid grid-cols-3 gap-2 w-full mt-3 transition-all duration-500",
        isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}>
        <div 
          className="flex items-center gap-2 bg-red-500/10 rounded-lg p-2 transition-all duration-500"
          style={{ transitionDelay: isAnimated ? "600ms" : "0ms" }}
        >
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <Beef className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-base font-bold text-red-500">{protein}g</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Proteína</p>
          </div>
        </div>
        
        <div 
          className="flex items-center gap-2 bg-amber-500/10 rounded-lg p-2 transition-all duration-500"
          style={{ transitionDelay: isAnimated ? "700ms" : "0ms" }}
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Wheat className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-base font-bold text-amber-500">{carbs}g</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Carbos</p>
          </div>
        </div>
        
        <div 
          className="flex items-center gap-2 bg-emerald-500/10 rounded-lg p-2 transition-all duration-500"
          style={{ transitionDelay: isAnimated ? "800ms" : "0ms" }}
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-base font-bold text-emerald-500">{fat}g</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Gordura</p>
          </div>
        </div>
      </div>
    </div>
  );
}
