import { cn } from "@/lib/utils";
import { getOnboardingIcon } from "@/lib/iconUtils";
import type { OnboardingOption } from "@/hooks/useOnboardingOptions";
import { Check } from "lucide-react";

interface RestrictionCategoryStepProps {
  categoryLabel: string;
  categoryDescription?: string;
  options: OnboardingOption[];
  selectedItems: string[];
  onToggle: (optionId: string) => void;
  colorScheme: {
    dot: string;
    border: string;
    bg: string;
    hover: string;
  };
}

export function RestrictionCategoryStep({
  categoryLabel,
  categoryDescription,
  options,
  selectedItems,
  onToggle,
  colorScheme,
}: RestrictionCategoryStepProps) {
  // Filter out "none" option - we handle this separately in footer
  const filteredOptions = options.filter(item => item.option_id !== 'none');

  if (filteredOptions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma opção disponível para esta categoria.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <div className={cn("w-3 h-3 rounded-full mx-auto mb-3", colorScheme.dot)} />
        {categoryDescription && (
          <p className="text-sm text-muted-foreground">
            {categoryDescription}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
        {filteredOptions.map((item) => {
          const IconComponent = getOnboardingIcon(item);
          const isSelected = selectedItems.includes(item.option_id);
          
          return (
            <button
              key={item.option_id}
              onClick={() => onToggle(item.option_id)}
              className={cn(
                "p-4 rounded-xl border text-left transition-all relative",
                isSelected
                  ? cn(colorScheme.border, colorScheme.bg)
                  : cn("border-border/80 bg-card", colorScheme.hover)
              )}
            >
              {isSelected && (
                <div className={cn(
                  "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center",
                  colorScheme.bg.replace('/10', '/20')
                )}>
                  <Check className="w-3 h-3" style={{ color: colorScheme.dot.replace('bg-', '').includes('amber') ? '#f59e0b' : colorScheme.dot.replace('bg-', '').includes('red') ? '#ef4444' : '#a855f7' }} />
                </div>
              )}
              <div className="w-8 h-8 mb-2 flex items-center justify-center">
                {IconComponent ? (
                  <IconComponent className="w-6 h-6 text-foreground stroke-[1.5]" />
                ) : (
                  <span className="text-xl">{item.emoji || "•"}</span>
                )}
              </div>
              <span className="font-medium text-sm block">{item.label}</span>
              {item.description && (
                <span className="text-xs text-muted-foreground line-clamp-1">{item.description}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
