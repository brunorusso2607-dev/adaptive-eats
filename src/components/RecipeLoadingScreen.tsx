import { ChefHat, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeLoadingScreenProps {
  message?: string;
  className?: string;
}

export default function RecipeLoadingScreen({ 
  message = "Estamos criando a sua receita personalizada...",
  className 
}: RecipeLoadingScreenProps) {
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm",
      className
    )}>
      <div className="flex flex-col items-center gap-6 p-8 max-w-sm text-center animate-fade-in">
        {/* Animated icon container */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <ChefHat className="w-12 h-12 text-primary" />
          </div>
          {/* Spinning loader ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-28 h-28 text-primary/30 animate-spin" />
          </div>
        </div>
        
        {/* Message */}
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">
            {message}
          </p>
          <p className="text-sm text-muted-foreground">
            Isso pode levar alguns segundos
          </p>
        </div>
        
        {/* Animated dots */}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
