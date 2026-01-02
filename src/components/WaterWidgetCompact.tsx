import { useState } from "react";
import { Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWaterConsumption } from "@/hooks/useWaterConsumption";
import { WaterTracker } from "@/components/WaterTracker";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function WaterWidgetCompact() {
  const [open, setOpen] = useState(false);
  const { percentage, isLoading } = useWaterConsumption();

  const isGoalReached = percentage >= 100;
  const cappedPercentage = Math.min(percentage, 100);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "relative flex items-center justify-center w-8 h-8 rounded-full",
            "bg-blue-500/10 hover:bg-blue-500/20 transition-colors",
            isGoalReached && "bg-green-500/10 hover:bg-green-500/20"
          )}
        >
          {/* Circular progress */}
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted/30"
            />
            <circle
              cx="16"
              cy="16"
              r="13"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${cappedPercentage * 0.817} 100`}
              className={cn(
                "transition-all duration-300",
                isGoalReached ? "stroke-green-500" : "stroke-blue-500"
              )}
            />
          </svg>
          
          {/* Icon in center */}
          <Droplets 
            className={cn(
              "absolute h-3.5 w-3.5",
              isGoalReached ? "text-green-500" : "text-blue-500"
            )} 
          />
        </button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            Hidratação
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
          <WaterTracker />
        </div>
      </SheetContent>
    </Sheet>
  );
}