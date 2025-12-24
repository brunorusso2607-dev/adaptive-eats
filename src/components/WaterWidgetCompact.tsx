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
  const { totalToday, settings, percentage, isLoading } = useWaterConsumption();

  const isGoalReached = percentage >= 100;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full",
            "bg-blue-500/10 hover:bg-blue-500/20 transition-colors",
            "border border-blue-500/20",
            isGoalReached && "bg-green-500/10 border-green-500/20 hover:bg-green-500/20"
          )}
        >
          <Droplets 
            className={cn(
              "h-4 w-4",
              isGoalReached ? "text-green-500" : "text-blue-500"
            )} 
          />
          
          {/* Mini progress bar */}
          <div className="relative w-8 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "absolute left-0 top-0 h-full rounded-full transition-all duration-300",
                isGoalReached ? "bg-green-500" : "bg-blue-500"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          <span 
            className={cn(
              "text-xs font-medium",
              isGoalReached ? "text-green-600" : "text-blue-600"
            )}
          >
            {isLoading ? "..." : `${Math.round(percentage)}%`}
          </span>
        </button>
      </SheetTrigger>
      
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
  );
}
