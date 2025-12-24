import { useState, useEffect } from "react";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  isFavorite: boolean;
  isLoading?: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FavoriteButton({
  isFavorite,
  isLoading = false,
  onClick,
  disabled = false,
  size = "md",
  className,
}: FavoriteButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [wasClicked, setWasClicked] = useState(false);

  // Trigger animation when isFavorite becomes true after a click
  useEffect(() => {
    if (wasClicked && isFavorite) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isFavorite, wasClicked]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading || disabled) return;
    setWasClicked(true);
    onClick();
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <button
      className={cn(
        "p-1 transition-colors disabled:opacity-50",
        isFavorite 
          ? "text-rose-500 hover:text-rose-600" 
          : "text-muted-foreground hover:text-rose-500",
        className
      )}
      onClick={handleClick}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <Loader2 className={cn(iconSizes[size], "animate-spin")} />
      ) : (
        <Heart 
          className={cn(
            iconSizes[size],
            "transition-all stroke-[1.5]",
            isFavorite && "fill-current",
            isAnimating && "animate-heart-pulse"
          )} 
        />
      )}
    </button>
  );
}
