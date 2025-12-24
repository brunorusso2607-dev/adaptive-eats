import { useState } from "react";
import { Droplets, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWaterConsumption } from "@/hooks/useWaterConsumption";
import { WaterTracker } from "@/components/WaterTracker";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function CompactHealthCircles() {
  const [waterSheetOpen, setWaterSheetOpen] = useState(false);
  const [weightSheetOpen, setWeightSheetOpen] = useState(false);
  const { percentage: waterPercentage, isLoading: waterLoading } = useWaterConsumption();

  const isWaterGoalReached = waterPercentage >= 100;
  const cappedWaterPercentage = Math.min(waterPercentage, 100);

  // Weight progress placeholder (future premium feature)
  const weightProgress = 0; // Will be connected to weight tracking later

  return (
    <>
      <div className="flex items-center justify-center gap-6 py-4">
        {/* Water Circle */}
        <button
          onClick={() => setWaterSheetOpen(true)}
          className={cn(
            "relative flex items-center justify-center w-14 h-14 rounded-full",
            "bg-blue-500/5 hover:bg-blue-500/10 transition-all duration-300",
            "hover:scale-105 active:scale-95"
          )}
          aria-label="Abrir rastreador de água"
        >
          {/* Circular progress ring */}
          <svg className="w-14 h-14 -rotate-90 absolute" viewBox="0 0 56 56">
            {/* Background ring */}
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-blue-500/20"
            />
            {/* Progress ring */}
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${cappedWaterPercentage * 1.508} 150.8`}
              className={cn(
                "transition-all duration-500",
                isWaterGoalReached ? "stroke-green-500" : "stroke-blue-500"
              )}
            />
          </svg>
          
          {/* Icon in center */}
          <Droplets 
            className={cn(
              "relative z-10 h-5 w-5 transition-colors duration-300",
              isWaterGoalReached ? "text-green-500" : "text-blue-500"
            )} 
          />
        </button>

        {/* Weight Circle (Premium - future feature) */}
        <button
          onClick={() => setWeightSheetOpen(true)}
          className={cn(
            "relative flex items-center justify-center w-14 h-14 rounded-full",
            "bg-muted/50 hover:bg-muted/80 transition-all duration-300",
            "hover:scale-105 active:scale-95"
          )}
          aria-label="Módulo de peso (em breve)"
        >
          {/* Circular progress ring */}
          <svg className="w-14 h-14 -rotate-90 absolute" viewBox="0 0 56 56">
            {/* Background ring */}
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted-foreground/20"
            />
            {/* Progress ring - empty for now */}
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${weightProgress * 1.508} 150.8`}
              className="stroke-muted-foreground/40 transition-all duration-500"
            />
          </svg>
          
          {/* Icon in center */}
          <Scale className="relative z-10 h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Water Tracker Sheet */}
      <Sheet open={waterSheetOpen} onOpenChange={setWaterSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Hidratação
            </SheetTitle>
          </SheetHeader>
          
          <div className="overflow-y-auto h-[calc(85vh-80px)]">
            <WaterTracker />
          </div>
        </SheetContent>
      </Sheet>

      {/* Weight Sheet (Coming Soon) */}
      <Sheet open={weightSheetOpen} onOpenChange={setWeightSheetOpen}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-muted-foreground" />
              Controle de Peso
            </SheetTitle>
          </SheetHeader>
          
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Scale className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              Módulo em desenvolvimento
            </p>
            <p className="text-xs text-muted-foreground/70">
              Em breve disponível como upgrade
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
