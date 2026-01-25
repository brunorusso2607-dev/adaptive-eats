import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeRatingStarsProps {
  rating: number | null;
  ratingCount?: number | null;
  size?: "sm" | "md";
  showCount?: boolean;
  className?: string;
}

export function RecipeRatingStars({ 
  rating, 
  ratingCount,
  size = "sm",
  showCount = true,
  className 
}: RecipeRatingStarsProps) {
  if (!rating || rating <= 0) return null;

  const starSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  
  // Calculate filled stars (0-5)
  const filledStars = Math.min(5, Math.max(0, Math.round(rating)));
  
  // Format rating count
  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return count.toString();
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              starSize,
              i < filledStars 
                ? "fill-yellow-400 text-yellow-400" 
                : "fill-muted text-muted"
            )}
          />
        ))}
      </div>
      <span className={cn("text-muted-foreground", textSize)}>
        {rating.toFixed(1)}
        {showCount && ratingCount && ratingCount > 0 && (
          <span className="ml-0.5">({formatCount(ratingCount)})</span>
        )}
      </span>
    </div>
  );
}

export default RecipeRatingStars;
