import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Sparkles, Flame, Beef, Wheat, Scale, CheckCircle, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import UnifiedFoodSearchBlock, { type SelectedFoodItem } from "./UnifiedFoodSearchBlock";
import { IngredientResult, OriginalIngredient } from "@/hooks/useIngredientSubstitution";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import ManualFoodModal from "./ManualFoodModal";

interface IngredientSearchSheetProps {
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

interface SmartSubstitute {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  reason: string;
  isFlexible?: boolean;
}

export default function IngredientSearchSheet({
  open,
  onOpenChange,
  originalIngredient,
  mealType = 'lunch',
  onSubstitute,
}: IngredientSearchSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [selectedSubstitute, setSelectedSubstitute] = useState<SmartSubstitute | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  
  // Fetch user profile for restrictions
  const { data: profile } = useQuery({
    queryKey: ["profile-for-search-substitution"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("profiles")
        .select("intolerances, dietary_preference, excluded_ingredients, strategy_id, goal, country")
        .eq("id", user.id)
        .single();
      
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

  const restrictions = [
    ...(profile?.intolerances || []),
    ...(profile?.dietary_preference && profile.dietary_preference !== 'omnivore' ? [profile.dietary_preference] : []),
    ...(profile?.excluded_ingredients || [])
  ];

  const parseGrams = (quantity: string): number => {
    const match = quantity?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 100;
  };

  // Fetch substitutes by category (ingredientes individuais da mesma categoria nutricional)
  const { data: poolSubstitutes, isLoading: isLoadingPool, error: poolError } = useQuery({
    queryKey: ["category-substitutes-search", originalIngredient?.item, mealType],
    queryFn: async () => {
      if (!originalIngredient) return null;
      
      // Calcular calorias do ingrediente original (se disponível)
      const originalCalories = originalIngredient.calories || 100;
      
      console.log('[IngredientSearchSheet] Fetching category substitutes:', {
        query: originalIngredient.item,
        originalCalories,
        country: profile?.country || 'BR'
      });
      
      const { data, error } = await supabase.functions.invoke('lookup-ingredient', {
        body: {
          query: originalIngredient.item,
          searchByCategory: true, // Buscar ingredientes da mesma CATEGORIA
          originalCalories: originalCalories,
          calorieTolerancePercent: 50, // Tolerância de 50% nas calorias
          limit: 10,
          country: profile?.country || 'BR',
          userIntolerances: profile?.intolerances || [],
        }
      });
      
      if (error) {
        console.error('[IngredientSearchSheet] Error:', error);
        throw error;
      }
      
      console.log('[IngredientSearchSheet] Results:', data);
      return data;
    },
    enabled: false, // Desabilitado - não mostrar sugestões automáticas ao abrir
    staleTime: 0,
  });
  
  // Log para debug
  if (poolError) {
    console.error('[IngredientSearchSheet] Query error:', poolError);
  }

  // Pool results - desabilitado, lista vazia
  const poolSuggestions: SmartSubstitute[] = [];

  const isLoading = false; // Nunca mostra loading já que não busca automaticamente

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedSubstitute(null);
      setSearchQuery("");
      setShowManualSearch(false);
    }
  }, [open, originalIngredient?.item]);

  // Criar objeto de nutrição do ingrediente original para cálculo correto da diferença
  const getOriginalNutrition = (): IngredientResult | null => {
    if (!originalIngredient) return null;
    
    // Se temos os macros do ingrediente original, calcular per 100g
    const grams = originalIngredient.grams || 100;
    
    // Se não temos macros, retornar null (vai adicionar em vez de calcular diferença)
    if (!originalIngredient.calories && !originalIngredient.protein) {
      return null;
    }
    
    return {
      id: 'original',
      name: originalIngredient.item,
      calories_per_100g: Math.round(((originalIngredient.calories || 0) / grams) * 100),
      protein_per_100g: Math.round(((originalIngredient.protein || 0) / grams) * 100 * 10) / 10,
      carbs_per_100g: Math.round(((originalIngredient.carbs || 0) / grams) * 100 * 10) / 10,
      fat_per_100g: Math.round(((originalIngredient.fat || 0) / grams) * 100 * 10) / 10,
    };
  };

  const handleSelectFood = (food: SelectedFoodItem) => {
    if (!originalIngredient) return;

    const ingredientResult: IngredientResult = {
      id: food.id,
      name: food.name,
      calories_per_100g: food.food.calories_per_100g,
      protein_per_100g: food.food.protein_per_100g,
      carbs_per_100g: food.food.carbs_per_100g,
      fat_per_100g: food.food.fat_per_100g,
      fiber_per_100g: food.food.fiber_per_100g,
      category: food.food.category || undefined,
    };
    
    onSubstitute(ingredientResult, originalIngredient.item, getOriginalNutrition());
    onOpenChange(false);
  };

  const handleSelectSmartSubstitute = (substitute: SmartSubstitute) => {
    setSelectedSubstitute(substitute);
  };

  const handleConfirmSubstitution = async () => {
    console.log('[IngredientSearchSheet] handleConfirmSubstitution START');
    if (!originalIngredient || !selectedSubstitute) {
      console.log('[IngredientSearchSheet] Missing data:', { originalIngredient, selectedSubstitute });
      return;
    }
    
    console.log('[IngredientSearchSheet] handleConfirmSubstitution:', {
      originalItem: originalIngredient.item,
      newName: selectedSubstitute.name,
      grams: selectedSubstitute.grams,
      calories: selectedSubstitute.calories
    });
    
    // Para refeições completas do pool (grams = 0), usar os macros totais diretamente
    // Para ingredientes individuais, calcular per 100g
    const grams = selectedSubstitute.grams || 100;
    
    const newIngredient: IngredientResult = {
      id: `smart-${Date.now()}`,
      name: selectedSubstitute.name,
      calories_per_100g: Math.round((selectedSubstitute.calories / grams) * 100),
      protein_per_100g: Math.round((selectedSubstitute.protein / grams) * 100 * 10) / 10,
      carbs_per_100g: Math.round((selectedSubstitute.carbs / grams) * 100 * 10) / 10,
      fat_per_100g: Math.round((selectedSubstitute.fat / grams) * 100 * 10) / 10,
    };
    
    console.log('[IngredientSearchSheet] Calling onSubstitute with:', newIngredient);
    
    onSubstitute(newIngredient, originalIngredient.item, getOriginalNutrition());
    onOpenChange(false);
  };

  const handleManualFoodCreated = (food: any) => {
    if (!originalIngredient) return;
    
    const ingredientResult: IngredientResult = {
      id: food.id || `manual-${Date.now()}`,
      name: food.name,
      calories_per_100g: food.calories_per_100g,
      protein_per_100g: food.protein_per_100g,
      carbs_per_100g: food.carbs_per_100g,
      fat_per_100g: food.fat_per_100g,
    };
    
    onSubstitute(ingredientResult, originalIngredient.item, getOriginalNutrition());
    setShowManualModal(false);
    onOpenChange(false);
  };

  if (!originalIngredient) return null;

  const suggestions: SmartSubstitute[] = poolSuggestions;
  const originalCaloriesPer100g = originalIngredient.calories || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md mx-auto h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Substituir Alimento
            </DialogTitle>
            <DialogDescription asChild>
              <span className="flex flex-col gap-2">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">Substituindo:</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {originalIngredient.item}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground">
                  💡 Use a busca abaixo para encontrar um substituto
                </span>
              </span>
            </DialogDescription>
          </DialogHeader>

          {/* Search Input - Sempre vazio inicialmente */}
          <div className="px-6 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar outro alimento..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.length >= 2) {
                    setShowManualSearch(true);
                  } else {
                    setShowManualSearch(false);
                  }
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {showManualSearch ? (
              // Modo de busca manual
              <div className="px-6 pb-6 h-full overflow-y-auto">
                <UnifiedFoodSearchBlock
                  onSelectFood={handleSelectFood}
                  scrollHeight="h-[calc(100%-60px)]"
                  autoFocus={false}
                  confirmButtonLabel="Confirmar Substituição"
                  initialQuery={searchQuery}
                  searchByCategory={false}
                  originalCalories={originalCaloriesPer100g}
                />
              </div>
            ) : (
              // Modo de sugestões inteligentes (5 opções)
              <ScrollArea className="h-full px-6">
                <div className="space-y-3 pb-6">
                  {isLoading && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                      <span className="text-sm text-muted-foreground">Buscando substitutos...</span>
                    </div>
                  )}

                  {!isLoading && suggestions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">Nenhum substituto encontrado</p>
                      <p className="text-xs mt-2">Use a busca acima para encontrar outros alimentos</p>
                    </div>
                  )}

                  {!isLoading && suggestions.map((substitute, index) => {
                    const isSelected = selectedSubstitute?.name === substitute.name;
                    
                    return (
                      <Card 
                        key={index} 
                        className={cn(
                          "cursor-pointer transition-all",
                          isSelected 
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
                            : "hover:border-primary/50"
                        )}
                        onClick={() => handleSelectSmartSubstitute(substitute)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm flex items-center gap-1.5">
                                {substitute.name}
                                {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                              </h4>
                              <Badge variant="secondary" className="text-xs mt-1">
                                <Scale className="w-3 h-3 mr-1" />
                                {substitute.grams}g
                              </Badge>
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

                          {substitute.reason && (
                            <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                              💡 {substitute.reason}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Botão para adicionar manualmente */}
                  {!isLoading && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => setShowManualModal(true)}
                    >
                      <PenLine className="w-4 h-4 mr-2" />
                      Cadastrar alimento manualmente
                    </Button>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Confirm Button */}
          {selectedSubstitute && !showManualSearch && (
            <div className="p-6 pt-4 border-t shrink-0 bg-background">
              <Button 
                onClick={handleConfirmSubstitution} 
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Confirmar: {selectedSubstitute.name} ({selectedSubstitute.grams}g)
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de cadastro manual */}
      <ManualFoodModal
        open={showManualModal}
        onOpenChange={setShowManualModal}
        initialName=""
        onFoodCreated={handleManualFoodCreated}
      />
    </>
  );
}
