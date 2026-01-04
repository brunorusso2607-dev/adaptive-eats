import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useIntoleranceWarning, type ConflictType } from "@/hooks/useIntoleranceWarning";
import { useSafetyLabels } from "@/hooks/useSafetyLabels";
import { useMemo } from "react";

interface Ingredient {
  item: string;
  quantity?: string | number;
  unit?: string;
}

interface MealSubstanceBadgesProps {
  ingredients: Ingredient[] | unknown;
  userProfile: {
    intolerances?: string[] | null;
    dietary_preference?: string | null;
    excluded_ingredients?: string[] | null;
  } | null;
  compact?: boolean;
}

export default function MealSubstanceBadges({ 
  ingredients, 
  userProfile,
  compact = false 
}: MealSubstanceBadgesProps) {
  const { checkConflict } = useIntoleranceWarning();
  const { getIntoleranceLabel, getDietaryLabel } = useSafetyLabels();
  
  // Check if user has any restrictions configured
  const hasUserRestrictions = useMemo(() => {
    if (!userProfile) return false;
    const hasIntolerances = (userProfile.intolerances?.length ?? 0) > 0;
    const hasExcluded = (userProfile.excluded_ingredients?.length ?? 0) > 0;
    const hasDietaryRestriction = userProfile.dietary_preference && 
      userProfile.dietary_preference !== "omnivore" &&
      userProfile.dietary_preference !== "comum";
    return hasIntolerances || hasExcluded || hasDietaryRestriction;
  }, [userProfile]);
  
  const conflicts = useMemo(() => {
    if (!userProfile || !ingredients) return [];
    
    const ingredientList = Array.isArray(ingredients) ? ingredients : [];
    const conflictMap = new Map<string, ConflictType>();
    
    for (const ing of ingredientList) {
      const itemName = typeof ing === "string" ? ing : ing?.item;
      if (!itemName) continue;
      
      // Check intolerance/dietary conflicts
      const conflict = checkConflict(itemName);
      if (conflict && !conflictMap.has(conflict.restriction)) {
        conflictMap.set(conflict.restriction, conflict);
      }
      
      // Check excluded ingredients
      const excludedList = userProfile.excluded_ingredients || [];
      const normalizedItem = itemName.toLowerCase().trim();
      
      for (const excluded of excludedList) {
        if (normalizedItem.includes(excluded.toLowerCase().trim())) {
          if (!conflictMap.has(`excluded_${excluded}`)) {
            conflictMap.set(`excluded_${excluded}`, {
              ingredient: normalizedItem,
              restriction: "excluded",
              restrictionLabel: excluded,
            });
          }
        }
      }
    }
    
    return Array.from(conflictMap.values());
  }, [ingredients, userProfile, checkConflict]);
  
  // Show "Safe for you" badge when user has restrictions but meal has no conflicts
  const isSafeForUser = hasUserRestrictions && conflicts.length === 0;
  
  // Modo compacto: apenas um ícone com tooltip/número
  if (compact) {
    if (isSafeForUser) {
      return (
        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (conflicts.length === 0) return null;
    return (
      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span className="text-[10px] font-medium">{conflicts.length}</span>
      </div>
    );
  }
  
  // Show safe badge when applicable
  if (isSafeForUser) {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3 h-3" />
          Seguro para você
        </span>
      </div>
    );
  }
  
  if (conflicts.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {conflicts.slice(0, 2).map((conflict, index) => {
        // Determinar o label baseado no tipo de conflito
        const getConflictLabel = () => {
          if (conflict.restriction === "excluded") {
            return `Contém ${conflict.restrictionLabel}`;
          }
          // Verificar se é uma preferência dietética
          const dietaryKeys = ['vegana', 'vegetariana', 'low_carb', 'pescetariana', 'cetogenica'];
          if (dietaryKeys.includes(conflict.restriction)) {
            return `Incompatível: ${getDietaryLabel(conflict.restriction)}`;
          }
          // É uma intolerância
          return `Contém ${getIntoleranceLabel(conflict.restriction)}`;
        };
        
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
          >
            <AlertTriangle className="w-3 h-3" />
            {getConflictLabel()}
          </span>
        );
      })}
      {conflicts.length > 2 && (
        <span className="text-[10px] text-amber-600 dark:text-amber-400 px-1">
          +{conflicts.length - 2}
        </span>
      )}
    </div>
  );
}
