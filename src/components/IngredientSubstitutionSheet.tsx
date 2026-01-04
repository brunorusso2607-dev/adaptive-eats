import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Flame, Beef, Wheat, Loader2, Check, CheckCircle, Sparkles, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { IngredientResult, OriginalIngredient } from "@/hooks/useIngredientSubstitution";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface SmartSubstitute {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  reason: string;
  isFlexible?: boolean; // Flag para opções de "comfort food"
}

interface IngredientSubstitutionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalIngredient: OriginalIngredient | null;
  mealType?: string;
  onSubstitute: (
    newIngredient: IngredientResult, 
    originalItem: string, 
    originalNutrition: IngredientResult | null
  ) => void;
}

const MACRO_CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  proteina: { label: 'Proteína', icon: '🥩', color: 'text-red-500' },
  carboidrato: { label: 'Carboidrato', icon: '🍞', color: 'text-amber-500' },
  gordura: { label: 'Gordura', icon: '🥑', color: 'text-yellow-500' },
  vegetal: { label: 'Vegetal', icon: '🥬', color: 'text-green-500' },
  fruta: { label: 'Fruta', icon: '🍎', color: 'text-pink-500' },
  bebida: { label: 'Bebida', icon: '🥤', color: 'text-blue-500' },
  outro: { label: 'Outro', icon: '🍽️', color: 'text-muted-foreground' },
};

export default function IngredientSubstitutionSheet({
  open,
  onOpenChange,
  originalIngredient,
  mealType = 'lunch',
  onSubstitute,
}: IngredientSubstitutionSheetProps) {
  const [selectedSubstitute, setSelectedSubstitute] = useState<SmartSubstitute | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch user profile for restrictions and strategy (dados completos como generate-ai-meal-plan)
  const { data: profile } = useQuery({
    queryKey: ["profile-for-substitution"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("profiles")
        .select("intolerances, dietary_preference, excluded_ingredients, strategy_id, goal, country")
        .eq("id", user.id)
        .single();
      
      // Se tem strategy_id, buscar a chave da estratégia
      if (data?.strategy_id) {
        const { data: strategy } = await supabase
          .from("nutritional_strategies")
          .select("key")
          .eq("id", data.strategy_id)
          .single();
        
        return { ...data, strategyKey: strategy?.key as string | undefined };
      }
      
      return { ...data, strategyKey: undefined as string | undefined };
    },
  });

  // Build restrictions array
  // Database now stores dietary_preference as: "omnivore" | "vegetarian" | "vegan" | etc.
  const restrictions = [
    ...(profile?.intolerances || []),
    ...(profile?.dietary_preference && profile.dietary_preference !== 'omnivore' ? [profile.dietary_preference] : []),
    ...(profile?.excluded_ingredients || [])
  ];

  // Parse grams from original ingredient
  const parseGrams = (quantity: string): number => {
    const match = quantity?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 100;
  };

  // Fetch smart substitutes from edge function (usando mesmos parâmetros que generate-ai-meal-plan)
  const { data: smartData, isLoading, refetch } = useQuery({
    queryKey: ["smart-substitutes", originalIngredient?.item, mealType, originalIngredient?.protein, originalIngredient?.grams],
    queryFn: async () => {
      if (!originalIngredient) return null;
      
      const grams = originalIngredient.grams || parseGrams(originalIngredient.quantity);
      
      // Use the macros from the original ingredient if available
      const ingredientProtein = originalIngredient.protein || 0;
      const ingredientCarbs = originalIngredient.carbs || 0;
      const ingredientFat = originalIngredient.fat || 0;
      const ingredientCalories = originalIngredient.calories || 0;
      
      console.log('[IngredientSubstitutionSheet] Calling smart-substitutes with:', {
        ingredientName: originalIngredient.item,
        ingredientGrams: grams,
        ingredientProtein,
        ingredientCarbs,
        ingredientFat,
        ingredientCalories,
        mealType,
        strategyKey: profile?.strategyKey,
        intolerances: profile?.intolerances,
        dietaryPreference: profile?.dietary_preference,
        goal: profile?.goal,
        userCountry: profile?.country
      });
      
      const { data, error } = await supabase.functions.invoke('suggest-smart-substitutes', {
        body: {
          ingredientName: originalIngredient.item,
          ingredientGrams: grams,
          ingredientProtein,
          ingredientCarbs,
          ingredientFat,
          ingredientCalories,
          mealType: mealType || 'lunch',
          restrictions,
          strategyKey: profile?.strategyKey,
          // Novos campos para usar mesma lógica do generate-ai-meal-plan
          intolerances: profile?.intolerances || [],
          dietaryPreference: profile?.dietary_preference || 'omnivore',
          excludedIngredients: profile?.excluded_ingredients || [],
          goal: profile?.goal || 'maintain',
          userCountry: profile?.country || 'BR',
          existingFoods: [] // Pode ser expandido para receber os alimentos já na refeição
        }
      });
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!originalIngredient,
    staleTime: 0,
  });

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedSubstitute(null);
    }
  }, [open, originalIngredient?.item]);

  const handleSelect = (substitute: SmartSubstitute) => {
    setSelectedSubstitute(substitute);
  };

  const handleConfirmSubstitution = async () => {
    if (!originalIngredient || !selectedSubstitute) return;
    
    setIsSaving(true);
    try {
      // Convert SmartSubstitute to IngredientResult format
      const newIngredient: IngredientResult = {
        id: `smart-${Date.now()}`,
        name: selectedSubstitute.name,
        calories_per_100g: Math.round((selectedSubstitute.calories / selectedSubstitute.grams) * 100),
        protein_per_100g: Math.round((selectedSubstitute.protein / selectedSubstitute.grams) * 100 * 10) / 10,
        carbs_per_100g: Math.round((selectedSubstitute.carbs / selectedSubstitute.grams) * 100 * 10) / 10,
        fat_per_100g: Math.round((selectedSubstitute.fat / selectedSubstitute.grams) * 100 * 10) / 10,
      };
      
      await onSubstitute(newIngredient, originalIngredient.item, null);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!originalIngredient) return null;

  const suggestions: SmartSubstitute[] = smartData?.suggestions || [];
  const originalCategory = smartData?.originalCategory;
  const mainMacro = smartData?.mainMacro;
  const mainMacroValue = smartData?.mainMacroValue;
  const mealTypeLabel = smartData?.mealType;
  const categoryInfo = MACRO_CATEGORY_LABELS[originalCategory] || MACRO_CATEGORY_LABELS.outro;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Substituir Alimento
          </DialogTitle>
          <DialogDescription asChild>
            <span className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {originalIngredient.quantity}
              </Badge>
              <span className="font-medium">{originalIngredient.item}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Category Info */}
        {!isLoading && originalCategory && (
          <div className="px-6 pb-3 shrink-0 space-y-2">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-lg">{categoryInfo.icon}</span>
              <span className={cn("font-medium", categoryInfo.color)}>
                Categoria: {categoryInfo.label}
              </span>
              {mainMacro && mainMacroValue !== undefined && (
                <Badge variant="outline" className="text-xs bg-primary/5">
                  <Scale className="w-3 h-3 mr-1" />
                  Igualando {mainMacroValue}g de {mainMacro}
                </Badge>
              )}
            </div>
            {mealTypeLabel && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>🍽️</span>
                <span>Sugestões adequadas para <strong className="text-foreground">{mealTypeLabel}</strong></span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Gramagem calculada para igualar seus macros originais
            </p>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full px-6">
            <div className="space-y-3 pb-6">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                  <span className="text-sm text-muted-foreground">Calculando substitutos inteligentes...</span>
                  <span className="text-xs text-muted-foreground mt-1">Ajustando gramagens para igualar macros</span>
                </div>
              )}

              {!isLoading && suggestions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">Nenhum substituto encontrado</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => refetch()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              )}

              {!isLoading && suggestions.map((substitute, index) => {
                const isSelected = selectedSubstitute?.name === substitute.name;
                const isFlexible = substitute.isFlexible;
                
                return (
                  <Card 
                    key={index} 
                    className={cn(
                      "cursor-pointer transition-all",
                      isSelected 
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
                        : isFlexible
                          ? "border-orange-400 bg-orange-50/50 dark:bg-orange-950/20 hover:border-orange-500"
                          : "hover:border-primary/50"
                    )}
                    onClick={() => handleSelect(substitute)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm flex items-center gap-1.5">
                            {isFlexible && <span className="text-base">🍕</span>}
                            {substitute.name}
                            {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              <Scale className="w-3 h-3 mr-1" />
                              {substitute.grams}g
                            </Badge>
                            {isFlexible && (
                              <Badge className="text-xs bg-orange-500 hover:bg-orange-600 text-white">
                                Comfort Food
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={isSelected ? "default" : "outline"} 
                          className="shrink-0"
                        >
                          {isSelected ? "✓ Selecionado" : "Selecionar"}
                        </Badge>
                      </div>

                      {/* Macros Grid */}
                      <div className="grid grid-cols-4 gap-2 text-center mb-3">
                        <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-1 text-orange-500">
                            <Flame className="w-3 h-3" />
                            <span className="font-semibold text-sm">{substitute.calories}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">kcal</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-1 text-red-500">
                            <Beef className="w-3 h-3" />
                            <span className="font-semibold text-sm">{substitute.protein}g</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">prot</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-1 text-amber-500">
                            <Wheat className="w-3 h-3" />
                            <span className="font-semibold text-sm">{substitute.carbs}g</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">carb</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-1 text-yellow-500">
                            <span className="text-xs">🧈</span>
                            <span className="font-semibold text-sm">{substitute.fat}g</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">gord</span>
                        </div>
                      </div>

                      {/* Reason */}
                      {substitute.reason && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                          💡 {substitute.reason}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Confirm Button */}
        {selectedSubstitute && (
          <div className="p-6 pt-4 border-t shrink-0 bg-background">
            <div className="flex items-center gap-3 mb-3 text-sm">
              <span className="text-muted-foreground">Substituindo:</span>
              <Badge variant="outline">{originalIngredient.item}</Badge>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <Badge variant="default" className="flex items-center gap-1">
                {selectedSubstitute.name}
                <span className="opacity-70">({selectedSubstitute.grams}g)</span>
              </Badge>
            </div>
            <Button 
              onClick={handleConfirmSubstitution} 
              className="w-full"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar Substituição
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
