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
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <img 
              src="/icons/icon-192x192.png" 
              alt="ReceitAI" 
              className="w-12 h-12 rounded-xl animate-pulse"
            />
            <Loader2 className="w-14 h-14 text-primary/30 animate-spin absolute inset-0 -m-1" />
          </div>
        </div>
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
          <div className="relative">
            <img 
              src="/icons/icon-192x192.png" 
              alt="ReceitAI" 
              className="w-16 h-16 rounded-xl animate-pulse"
            />
            <Loader2 className="w-20 h-20 text-primary/30 animate-spin absolute inset-0 -m-2" />
          </div>
          
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
        {/* Animated logo container */}
        <div className="relative">
          <img 
            src="/icons/icon-192x192.png" 
            alt="ReceitAI" 
            className="w-24 h-24 rounded-2xl animate-pulse"
          />
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
