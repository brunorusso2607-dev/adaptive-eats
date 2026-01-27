import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingVariant = "fullscreen" | "inline" | "compact";

interface AppLoadingScreenProps {
  message?: string;
  subtitle?: string;
  className?: string;
  variant?: LoadingVariant;
}

export default function AppLoadingScreen({ 
  message = "Carregando...",
  subtitle = "Isso pode levar alguns segundos",
  className,
  variant = "fullscreen"
}: AppLoadingScreenProps) {
  
  // Compact variant - simple spinner for Suspense fallbacks
  if (variant === "compact") {
    return (
      <div className={cn(
        "flex justify-center py-8",
        className
      )}>
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Inline variant - for containers and sections
  if (variant === "inline") {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-12",
        className
      )}>
        <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          
          {message && (
            <p className="text-sm font-medium text-foreground">
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Fullscreen variant - default, for major loading states
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm",
      className
    )}>
      <div className="flex flex-col items-center gap-6 p-8 max-w-sm text-center animate-fade-in">
        {/* Spinning loader */}
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        
        {/* Message */}
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">
            {message}
          </p>
          <p className="text-sm text-muted-foreground">
            {subtitle}
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

// Backward compatibility export
export { AppLoadingScreen as RecipeLoadingScreen };
