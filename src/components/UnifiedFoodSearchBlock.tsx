import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Loader2, Sparkles, PenLine, Flame, Database, Globe, Link2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLookupIngredient } from "@/hooks/useLookupIngredient";
import { useIntoleranceWarning } from "@/hooks/useIntoleranceWarning";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ManualFoodModal from "./ManualFoodModal";
import { suggestServingByName } from "@/lib/servingSuggestion";
import IntoleranceBadge from "./IntoleranceBadge";

// ===== INTERFACES =====
export interface LookupFood {
  id: string;
  name: string;
  name_normalized: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  sodium_per_100g: number;
  category: string | null;
  source: string;
  is_verified: boolean;
  default_serving_size: number;
  serving_unit: string;
}

export interface SelectedFoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity_grams: number;
  food: LookupFood;
}

interface AISuggestion {
  name: string;
  portion_description: string;
  portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: "alta" | "média" | "baixa";
}

export interface UnifiedFoodSearchBlockProps {
  onSelectFood: (food: SelectedFoodItem) => void;
  className?: string;
  scrollHeight?: string;
  autoFocus?: boolean;
  confirmButtonLabel?: string;
  hasSelectedFoods?: boolean; // Hide empty state when foods are already selected
  inputRef?: React.RefObject<HTMLInputElement>; // Ref to focus input from parent
  initialQuery?: string; // Pre-fill search input with this value
  searchByCategory?: boolean; // Buscar por categoria ao invés de nome
  originalCalories?: number; // Calorias do ingrediente original (para filtrar por range)
  hideInput?: boolean; // Hide the search input (when parent already has one)
}

// ===== SOURCE BADGE =====
const SourceBadge = ({ source }: { source: string }) => {
  const config = {
    local: { icon: Database, label: "Local", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    alias: { icon: Link2, label: "Alias", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    usda: { icon: Globe, label: "USDA", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    taco: { icon: Database, label: "TACO", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    ai_suggestion: { icon: Sparkles, label: "IA", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    manual: { icon: PenLine, label: "Manual", className: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
  }[source?.toLowerCase()] || { icon: Database, label: source, className: "bg-muted text-muted-foreground" };

  const Icon = config.icon;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
      config.className
    )}>
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  );
};

// ===== MAIN COMPONENT =====
export default function UnifiedFoodSearchBlock({ 
  onSelectFood, 
  className,
  scrollHeight = "h-[calc(100vh-340px)]",
  autoFocus = false,
  confirmButtonLabel = "Adicionar",
  hasSelectedFoods = false,
  inputRef,
  initialQuery = "",
  searchByCategory = false,
  originalCalories = 0,
  hideInput = false
}: UnifiedFoodSearchBlockProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [analyzingFoodId, setAnalyzingFoodId] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  // Estado para seleção de porção (fluxo em 2 passos)
  const [selectedFood, setSelectedFood] = useState<LookupFood | null>(null);
  const [portionGrams, setPortionGrams] = useState<number>(100);
  const [portionSuggestion, setPortionSuggestion] = useState<string>("");
  
  // Estado para seleção de sugestão da IA (com quantidade)
  const [selectedAISuggestion, setSelectedAISuggestion] = useState<AISuggestion | null>(null);
  const [aiPortionGrams, setAiPortionGrams] = useState<number>(100);

  const { lookup, reset, results, source, isLoading, error, userCountry, searchPlaceholder, needsAiComplement } = useLookupIngredient(searchByCategory, originalCalories);
  const { checkFood, hasIntolerances, intolerances } = useIntoleranceWarning();

  // Sincronizar searchQuery com initialQuery quando a prop mudar
  useEffect(() => {
    if (initialQuery && initialQuery !== searchQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  const checkFoodConflicts = useCallback((foodName: string) => {
    const result = checkFood(foodName);
    if (result.hasConflict && result.conflictDetails.length > 0) {
      const firstConflict = result.conflictDetails[0];
      return {
        ingredient: foodName,
        restriction: result.conflicts[0],
        restrictionLabel: firstConflict.label,
        type: firstConflict.type,
        message: firstConflict.message,
      };
    }
    return null;
  }, [checkFood]);

  // Smart debounce - instant for first word, debounced for compound words
  useEffect(() => {
    // Check if it's a compound word (has space)
    const hasSpace = searchQuery.includes(' ');
    const delay = hasSpace ? 200 : 0; // 200ms only for compound words
    
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        lookup(searchQuery, 10);
        setSelectedFood(null);
      } else {
        reset();
      }
    }, delay);
    
    return () => clearTimeout(timer);
  }, [searchQuery, lookup, reset]);

  // Fetch AI suggestions - calls edge function with generateAiOnly flag
  const fetchAISuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) return;
    
    setIsLoadingAI(true);
    setShowAISuggestions(true);
    
    try {
      // Chamar lookup-ingredient com generateAiOnly para pular banco e ir direto para IA
      const { data, error } = await supabase.functions.invoke('lookup-ingredient', {
        body: { 
          query,
          limit: 10,
          country: userCountry,
          generateAiOnly: true // Skip database, generate AI suggestions only
        }
      });

      if (error) throw error;

      // Converter resultados para formato de sugestões
      if (data?.results && data.results.length > 0) {
        const suggestions = data.results.map((food: any) => ({
          name: food.name,
          portion_description: `${food.default_serving_size || 100}g`,
          portion_grams: food.default_serving_size || 100,
          calories: Math.round((food.calories_per_100g * (food.default_serving_size || 100)) / 100),
          protein: Math.round((food.protein_per_100g * (food.default_serving_size || 100)) / 100),
          carbs: Math.round((food.carbs_per_100g * (food.default_serving_size || 100)) / 100),
          fat: Math.round((food.fat_per_100g * (food.default_serving_size || 100)) / 100),
          confidence: 'média'
        }));
        setAiSuggestions(suggestions);
      } else {
        setAiSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      setAiSuggestions([]);
    } finally {
      setIsLoadingAI(false);
    }
  }, [userCountry]);

  // Trigger AI suggestions only when backend signals needsAiComplement
  useEffect(() => {
    if (!isLoading && searchQuery.length >= 2 && needsAiComplement) {
      // Set loading state immediately to show skeleton
      setIsLoadingAI(true);
      setShowAISuggestions(true);
      
      // Small delay to let user see DB results first
      const timer = setTimeout(() => {
        fetchAISuggestions(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    } else if (searchQuery.length < 2 || !needsAiComplement) {
      setShowAISuggestions(false);
      setAiSuggestions([]);
      setIsLoadingAI(false);
    }
  }, [results, isLoading, searchQuery, needsAiComplement, fetchAISuggestions]);

  const analyzeWithAI = useCallback(async (foodName: string) => {
    if (!hasIntolerances || intolerances.length === 0) return null;

    try {
      const { data, error } = await supabase.functions.invoke('analyze-food-intolerances', {
        body: { foodName, userIntolerances: intolerances }
      });

      if (error) {
        console.error("Erro na análise de IA:", error);
        return null;
      }

      return {
        hasConflicts: data.hasConflicts,
        conflicts: data.conflicts || [],
        ingredients: data.ingredients || [],
      };
    } catch (err) {
      console.error("Erro ao chamar análise de IA:", err);
      return null;
    }
  }, [hasIntolerances, intolerances]);

  const convertFoodToSelectedItem = (food: LookupFood, grams: number): SelectedFoodItem => {
    const multiplier = grams / 100;
    
    return {
      id: food.id,
      name: food.name,
      calories: Math.round(food.calories_per_100g * multiplier),
      protein: Math.round(food.protein_per_100g * multiplier * 10) / 10,
      carbs: Math.round(food.carbs_per_100g * multiplier * 10) / 10,
      fat: Math.round(food.fat_per_100g * multiplier * 10) / 10,
      quantity_grams: grams,
      food,
    };
  };

  // Step 1: Select food and expand
  const handleSelectFoodForPortion = useCallback(async (food: LookupFood) => {
    if (selectedFood?.id === food.id) {
      setSelectedFood(null);
      return;
    }

    const localConflict = checkFoodConflicts(food.name);
    
    if (localConflict) {
      toast.warning(
        `${food.name}: ${localConflict.message || `Contém ${localConflict.restrictionLabel}`}`,
        { duration: 4000 }
      );
    } else if (hasIntolerances) {
      setAnalyzingFoodId(food.id);
      const aiResult = await analyzeWithAI(food.name);
      setAnalyzingFoodId(null);
      
      if (aiResult?.hasConflicts && aiResult.conflicts.length > 0) {
        const conflictLabels = aiResult.conflicts.map((c: any) => c.intoleranceLabel).join(', ');
        toast.warning(`${food.name} contém ${conflictLabels}`, { duration: 4000 });
      }
    }

    const serving = suggestServingByName(food.name);
    const defaultPortion = food.default_serving_size || serving.defaultServingSize;
    
    setSelectedFood(food);
    setPortionGrams(defaultPortion);
    setPortionSuggestion(`${defaultPortion}${food.serving_unit || 'g'} (${serving.description})`);
  }, [selectedFood, checkFoodConflicts, hasIntolerances, analyzeWithAI]);

  // Step 2: Confirm addition
  const handleConfirmAddition = useCallback(() => {
    if (!selectedFood) return;

    onSelectFood(convertFoodToSelectedItem(selectedFood, portionGrams));
    setSearchQuery("");
    reset();
    setAiSuggestions([]);
    setShowAISuggestions(false);
    setSelectedFood(null);
    setPortionGrams(100);
    setPortionSuggestion("");
  }, [selectedFood, portionGrams, onSelectFood, reset]);

  const handleAddAISuggestion = async (suggestion: AISuggestion) => {
    const conflict = checkFoodConflicts(suggestion.name);
    // Use the user-selected portion or default to suggestion's portion
    const selectedPortion = selectedAISuggestion?.name === suggestion.name ? aiPortionGrams : suggestion.portion_grams;

    try {
      const normalizedName = suggestion.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const { data: existing } = await supabase
        .from("foods")
        .select("*")
        .eq("name_normalized", normalizedName)
        .maybeSingle();

      let food: LookupFood;

      if (existing) {
        food = {
          ...existing,
          serving_unit: existing.serving_unit || 'g',
          default_serving_size: existing.default_serving_size || 100,
          fiber_per_100g: existing.fiber_per_100g || 0,
          sodium_per_100g: existing.sodium_per_100g || 0,
        } as LookupFood;
      } else {
        const multiplier = 100 / suggestion.portion_grams;
        const servingSuggestion = suggestServingByName(suggestion.name);
        const finalServingSize = suggestion.portion_grams || servingSuggestion.defaultServingSize;
        const finalServingUnit = suggestion.portion_grams && suggestion.portion_grams !== 100 ? 'un' : servingSuggestion.servingUnit;
        
        const { data: newFood, error } = await supabase
          .from("foods")
          .insert({
            name: suggestion.name,
            name_normalized: normalizedName,
            calories_per_100g: Math.round(suggestion.calories * multiplier),
            protein_per_100g: Math.round(suggestion.protein * multiplier * 10) / 10,
            carbs_per_100g: Math.round(suggestion.carbs * multiplier * 10) / 10,
            fat_per_100g: Math.round(suggestion.fat * multiplier * 10) / 10,
            source: "ai_suggestion",
            verified: false,
            confidence: suggestion.confidence === "alta" ? 0.9 : suggestion.confidence === "média" ? 0.7 : 0.5,
            serving_unit: finalServingUnit,
            default_serving_size: finalServingSize,
          })
          .select()
          .single();

        if (error) throw error;
        food = {
          ...newFood,
          serving_unit: newFood.serving_unit || 'g',
          default_serving_size: newFood.default_serving_size || suggestion.portion_grams,
          fiber_per_100g: 0,
          sodium_per_100g: 0,
        } as LookupFood;
        toast.success(`${suggestion.name} adicionado ao banco de dados!`);
      }

      if (conflict) {
        toast.warning(
          `${suggestion.name}: ${conflict.message || `Contém ${conflict.restrictionLabel}`}`,
          { duration: 4000 }
        );
      }

      // Add food directly with selected portion instead of expanding
      onSelectFood(convertFoodToSelectedItem(food, selectedPortion));
      setSearchQuery("");
      reset();
      setAiSuggestions([]);
      setShowAISuggestions(false);
      setSelectedFood(null);
      setSelectedAISuggestion(null);
      setAiPortionGrams(100);
    } catch (error) {
      console.error("Error adding AI suggestion:", error);
      toast.error("Erro ao adicionar alimento");
    }
  };

  const handleManualFoodCreated = (food: { id: string; name: string; calories_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number }) => {
    const fullFood: LookupFood = {
      ...food,
      name_normalized: food.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      fiber_per_100g: 0,
      sodium_per_100g: 0,
      category: null,
      serving_unit: 'g',
      default_serving_size: 100,
      source: 'manual',
      is_verified: false,
    };
    
    handleSelectFoodForPortion(fullFood);
  };

  const calculateMacrosForPortion = (food: LookupFood, grams: number) => {
    const multiplier = grams / 100;
    return {
      calories: Math.round(food.calories_per_100g * multiplier),
      protein: Math.round(food.protein_per_100g * multiplier * 10) / 10,
      carbs: Math.round(food.carbs_per_100g * multiplier * 10) / 10,
      fat: Math.round(food.fat_per_100g * multiplier * 10) / 10,
    };
  };

  // Reset when component unmounts or search clears
  const resetSelection = useCallback(() => {
    setSearchQuery("");
    reset();
    setAiSuggestions([]);
    setShowAISuggestions(false);
    setSelectedFood(null);
    setPortionGrams(100);
    setPortionSuggestion("");
  }, [reset]);

  return (
    <>
      <div className={cn("space-y-3", className)}>
        {/* Search input - compact (hidden when parent provides input) */}
        {!hideInput && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={searchPlaceholder.placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
              autoFocus={autoFocus}
            />
          </div>
        )}

        {/* Results area - always full height */}
        <div className={cn("overflow-y-auto", scrollHeight)}>
          <div className="space-y-2">
            {/* Loading state */}
            {isLoading && searchQuery.length >= 2 && results.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                <p className="text-sm">Buscando alimentos...</p>
              </div>
            )}

            {/* Initial state - only show if no foods selected yet */}
            {searchQuery.length < 2 && !hasSelectedFoods && (
              <div className="text-center py-6 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Digite para buscar alimentos</p>
                <p className="text-xs opacity-70">Busca local + USDA + IA</p>
              </div>
            )}

            {/* Source indicator when results found */}
            {results.length > 0 && source && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span>Fonte:</span>
                <SourceBadge source={source} />
                <span className="text-muted-foreground/60">({results.length} resultado{results.length > 1 ? 's' : ''})</span>
              </div>
            )}

            {/* Lookup results */}
            {results.map((food) => {
              const conflict = checkFoodConflicts(food.name);
              const isSelected = selectedFood?.id === food.id;
              const macros = isSelected ? calculateMacrosForPortion(food, portionGrams) : null;
              
              return (
                <div
                  key={food.id}
                  className={cn(
                    "w-full bg-card border rounded-lg transition-all overflow-hidden",
                    conflict && "border-amber-500/50 bg-amber-500/5",
                    isSelected && "border-primary ring-1 ring-primary/20"
                  )}
                >
                  {/* Header - clickable to expand */}
                  <button
                    onClick={() => handleSelectFoodForPortion(food)}
                    disabled={analyzingFoodId !== null}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {analyzingFoodId === food.id ? (
                          <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                        ) : isSelected ? (
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        ) : (
                          <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate">{food.name}</span>
                        {food.is_verified && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-6 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-500" />
                          {food.calories_per_100g} kcal/100g
                        </span>
                        <SourceBadge source={food.source} />
                      </div>
                      {conflict && (
                        <div className="ml-6 mt-1">
                          <IntoleranceBadge 
                            label={conflict.restrictionLabel} 
                            type={conflict.type}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      {isSelected ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded section with portion selection - compact */}
                  {isSelected && (
                    <div className="px-3 pb-3 border-t bg-muted/30 space-y-2">
                      {/* Portion input */}
                      <div className="flex items-center gap-2 pt-2">
                        <span className="text-xs text-muted-foreground">Quantidade</span>
                        <Input
                          type="number"
                          value={portionGrams}
                          onChange={(e) => setPortionGrams(Number(e.target.value) || 0)}
                          className="h-8 w-20 text-center text-sm"
                          min={1}
                        />
                        <span className="text-xs text-muted-foreground">{food.serving_unit || 'g'}</span>
                      </div>
                      {/* Confirm button - full width for mobile */}
                      <Button
                        size="sm"
                        onClick={handleConfirmAddition}
                        className="w-full h-9"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {confirmButtonLabel}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* AI suggestions skeleton - show when loading more results */}
            {isLoadingAI && searchQuery.length >= 2 && (
              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <Sparkles className="w-3 h-3" />
                  <span>Buscando mais variações...</span>
                </div>
                {/* Skeleton placeholders */}
                {[1, 2, 3].map((i) => (
                  <div key={`skeleton-${i}`} className="p-3 bg-muted/30 border rounded-lg animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </div>
                    <div className="flex items-center gap-3 ml-6 mt-2">
                      <div className="h-3 bg-muted rounded w-16" />
                      <div className="h-3 bg-muted rounded w-12" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI suggestions - show actual results when loaded */}
            {!isLoadingAI && showAISuggestions && aiSuggestions.length > 0 && searchQuery.length >= 2 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Sparkles className="w-3 h-3" />
                  <span>Sugestões da IA ({aiSuggestions.length} resultado{aiSuggestions.length > 1 ? 's' : ''})</span>
                </div>
                {aiSuggestions.map((suggestion, idx) => {
                  const conflict = checkFoodConflicts(suggestion.name);
                  const isSelected = selectedAISuggestion?.name === suggestion.name;
                  const aiMacros = isSelected ? {
                    calories: Math.round((suggestion.calories / suggestion.portion_grams) * aiPortionGrams),
                    protein: Math.round((suggestion.protein / suggestion.portion_grams) * aiPortionGrams * 10) / 10,
                    carbs: Math.round((suggestion.carbs / suggestion.portion_grams) * aiPortionGrams * 10) / 10,
                    fat: Math.round((suggestion.fat / suggestion.portion_grams) * aiPortionGrams * 10) / 10,
                  } : null;
                  
                  return (
                    <div
                      key={`ai-${idx}`}
                      className={cn(
                        "w-full flex flex-col p-3 bg-card border rounded-lg transition-colors text-left",
                        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                        conflict && !isSelected && "border-amber-500/50 bg-amber-500/5"
                      )}
                    >
                      <button
                        onClick={() => {
                          if (isSelected) {
                            setSelectedAISuggestion(null);
                          } else {
                            setSelectedAISuggestion(suggestion);
                            setAiPortionGrams(suggestion.portion_grams);
                            // Deselect any DB food
                            setSelectedFood(null);
                          }
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            ) : (
                              <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium">{suggestion.name}</span>
                            {isSelected && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                ✓
                              </span>
                            )}
                          </div>
                          <ChevronDown className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            isSelected && "rotate-180"
                          )} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground ml-6 mt-1">
                          <span>{isSelected ? `${aiPortionGrams}g` : suggestion.portion_description}</span>
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-500" />
                            {isSelected ? aiMacros?.calories : suggestion.calories}kcal
                          </span>
                        </div>
                        {conflict && (
                          <div className="ml-6 mt-1">
                            <IntoleranceBadge 
                              label={conflict.restrictionLabel} 
                              type={conflict.type}
                              size="sm"
                            />
                          </div>
                        )}
                      </button>
                      
                      {/* Expanded portion selector for AI suggestion */}
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Quantidade</span>
                            <Input
                              type="number"
                              value={aiPortionGrams}
                              onChange={(e) => setAiPortionGrams(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-20 h-8 text-center text-sm"
                              min="1"
                            />
                            <span className="text-xs text-muted-foreground">g</span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddAISuggestion(suggestion)}
                            className="w-full h-9"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            {confirmButtonLabel}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* No results - manual entry option */}
            {searchQuery.length >= 2 && !isLoading && results.length === 0 && !isLoadingAI && aiSuggestions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">
                  Nenhum alimento encontrado
                </p>
                <button
                  onClick={() => setShowManualModal(true)}
                  className="flex items-center gap-2 mx-auto text-sm text-primary hover:underline"
                >
                  <PenLine className="w-4 h-4" />
                  Cadastrar "{searchQuery}" manualmente
                </button>
              </div>
            )}

            {/* Manual add option at the bottom when results exist */}
            {searchQuery.length >= 2 && !isLoading && (results.length > 0 || (!isLoadingAI && aiSuggestions.length > 0)) && (
              <div className="border-t mt-3 pt-3">
                <button
                  onClick={() => setShowManualModal(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 border border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <PenLine className="w-4 h-4" />
                  <span className="text-sm">Não encontrou? Adicionar manualmente</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual food modal */}
      <ManualFoodModal
        open={showManualModal}
        onOpenChange={setShowManualModal}
        initialName={searchQuery}
        onFoodCreated={handleManualFoodCreated}
      />
    </>
  );
}
