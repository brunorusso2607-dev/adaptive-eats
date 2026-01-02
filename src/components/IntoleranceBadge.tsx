import { AlertTriangle, ShieldAlert, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RestrictionType } from "@/hooks/useIntoleranceWarning";

interface IntoleranceBadgeProps {
  label: string;
  type?: RestrictionType;
  size?: "sm" | "md" | "lg";
  variant?: "inline" | "card";
  showIcon?: boolean;
  className?: string;
}

export default function IntoleranceBadge({
  label,
  type = "intolerance",
  size = "sm",
  variant = "inline",
  showIcon = true,
  className,
}: IntoleranceBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-xs px-2 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  const variantClasses = {
    inline: "inline-flex items-center rounded-full font-medium",
    card: "flex items-center rounded-lg",
  };

  // Cores baseadas no tipo de restrição
  const typeStyles = {
    allergy: {
      bg: "bg-red-500/10 dark:bg-red-950/30",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-500/20",
      icon: ShieldX,
    },
    intolerance: {
      bg: "bg-amber-500/10 dark:bg-amber-950/30",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/20",
      icon: AlertTriangle,
    },
    sensitivity: {
      bg: "bg-orange-500/10 dark:bg-orange-950/30",
      text: "text-orange-600 dark:text-orange-400",
      border: "border-orange-500/20",
      icon: AlertTriangle,
    },
    dietary: {
      bg: "bg-purple-500/10 dark:bg-purple-950/30",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-500/20",
      icon: ShieldAlert,
    },
    excluded: {
      bg: "bg-gray-500/10 dark:bg-gray-800/30",
      text: "text-gray-600 dark:text-gray-400",
      border: "border-gray-500/20",
      icon: ShieldAlert,
    },
  };

  const style = typeStyles[type] || typeStyles.intolerance;
  const Icon = style.icon;

  return (
    <span
      className={cn(
        variantClasses[variant],
        sizeClasses[size],
        style.bg,
        style.text,
        "border",
        style.border,
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{label}</span>
    </span>
  );
}
