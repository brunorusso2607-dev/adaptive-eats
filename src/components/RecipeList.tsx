import { useState, useEffect } from "react";
import { useSwipeToClose } from "@/hooks/use-swipe-to-close";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, Flame, Loader2, ChefHat, Trash2, UtensilsCrossed, Calendar, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./FavoriteButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { useUnifiedFavorites, type UnifiedFavorite } from "@/hooks/useUnifiedFavorites";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type RecipeFromDB = {
  id: string;
  name: string;
  description: string | null;
  prep_time: number;
  complexity: "rapida" | "equilibrada" | "elaborada";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  is_favorite: boolean;
  created_at: string | null;
  ingredients: Json;
  instructions: Json;
  input_ingredients: string | null;
};

type Recipe = {
  name: string;
  description: string;
  ingredients: { item: string; quantity: string; unit: string }[];
  instructions: string[];
  prep_time: number;
  complexity: "rapida" | "equilibrada" | "elaborada";
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  input_ingredients?: string | null;
};

type RecipeListProps = {
  type: "history" | "favorites";
  onBack: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
};

const COMPLEXITY_LABELS = {
  rapida: { label: "Rápida", color: "text-green-500" },
  equilibrada: { label: "Equilibrada", color: "text-yellow-500" },
  elaborada: { label: "Elaborada", color: "text-orange-500" },
};

export default function RecipeList({ type, onBack, onSelectRecipe }: RecipeListProps) {
  const [historyRecipes, setHistoryRecipes] = useState<RecipeFromDB[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  // Hook unificado para favoritos
  const { 
    favorites, 
    isLoading: isLoadingFavorites, 
    toggleFavorite: toggleUnifiedFavorite,
    deleteRecipe: deleteUnifiedRecipe 
  } = useUnifiedFavorites();

  // Swipe to close with visual feedback
  const { handlers: swipeHandlers, style: swipeStyle, isDragging } = useSwipeToClose({
    onClose: onBack,
    direction: "right",
    threshold: 100,
  });

  useEffect(() => {
    if (type === "history") {
      fetchHistoryRecipes();
    }
  }, [type]);

  const fetchHistoryRecipes = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistoryRecipes(data || []);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      toast.error("Erro ao carregar refeições");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleHistoryFavorite = async (recipeId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("recipes")
        .update({ is_favorite: !currentValue })
        .eq("id", recipeId);

      if (error) throw error;

      setHistoryRecipes(prev => 
        prev.map(r => r.id === recipeId ? { ...r, is_favorite: !currentValue } : r)
      );

      toast.success(currentValue ? "Removido dos favoritos" : "Adicionado aos favoritos");
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Erro ao atualizar favorito");
    }
  };

  const deleteHistoryRecipe = async (recipeId: string) => {
    try {
      const { error } = await supabase
        .from("recipes")
        .delete()
        .eq("id", recipeId);

      if (error) throw error;

      setHistoryRecipes(prev => prev.filter(r => r.id !== recipeId));
      toast.success("Refeição deletada com sucesso");
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error("Erro ao deletar refeição");
    }
  };

  const handleSelectRecipe = (recipe: RecipeFromDB) => {
    const formattedRecipe: Recipe = {
      name: recipe.name,
      description: recipe.description || "",
      ingredients: recipe.ingredients as { item: string; quantity: string; unit: string }[],
      instructions: recipe.instructions as string[],
      prep_time: recipe.prep_time,
      complexity: recipe.complexity,
      servings: recipe.servings,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      input_ingredients: recipe.input_ingredients,
    };
    onSelectRecipe(formattedRecipe);
  };

  const handleSelectUnifiedFavorite = (favorite: UnifiedFavorite) => {
    const formattedRecipe: Recipe = {
      name: favorite.name,
      description: favorite.description || "",
      ingredients: favorite.ingredients as { item: string; quantity: string; unit: string }[],
      instructions: favorite.instructions as string[],
      prep_time: favorite.prep_time,
      complexity: favorite.complexity,
      servings: favorite.servings,
      calories: favorite.calories,
      protein: favorite.protein,
      carbs: favorite.carbs,
      fat: favorite.fat,
      input_ingredients: favorite.input_ingredients,
    };
    onSelectRecipe(formattedRecipe);
  };

  const isLoading = type === "favorites" ? isLoadingFavorites : isLoadingHistory;
  const recipes = type === "favorites" ? [] : historyRecipes; // History usa o estado local

  return (
    <div 
      {...swipeHandlers} 
      style={swipeStyle} 
      className={cn(
        "space-y-6 animate-in fade-in duration-300 min-h-[calc(100vh-140px)]",
        isDragging && "select-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-display text-xl font-bold text-foreground flex-1">
          {type === "history" ? "Histórico de Refeições" : "Refeições Favoritas"}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : type === "favorites" ? (
        // Renderização de favoritos unificados
        favorites.length === 0 ? (
          <Card className="glass-card border-border/30">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display font-bold text-foreground mb-2">
                Nenhuma refeição favorita
              </h3>
              <p className="text-sm text-muted-foreground">
                Adicione refeições aos favoritos para vê-las aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {favorites.map((favorite) => (
              <Card 
                key={`${favorite.source}-${favorite.id}`}
                className="glass-card border-border/30 hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
                onClick={() => handleSelectUnifiedFavorite(favorite)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-foreground truncate">
                          {favorite.name}
                        </h3>
                        {favorite.source === "meal_plan" && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                            <Calendar className="w-2.5 h-2.5 mr-1" />
                            Plano
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {favorite.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {favorite.prep_time} min
                        </span>
                        <span className="flex items-center gap-1 text-orange-500">
                          <Flame className="w-3.5 h-3.5" />
                          {favorite.calories} kcal
                        </span>
                        {favorite.source === "recipe" && (
                          <span className={cn("text-xs", COMPLEXITY_LABELS[favorite.complexity].color)}>
                            {COMPLEXITY_LABELS[favorite.complexity].label}
                          </span>
                        )}
                        {favorite.source === "meal_plan" && favorite.meal_plan_name && (
                          <span className="text-xs text-primary">
                            {favorite.meal_plan_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <FavoriteButton
                        isFavorite={true}
                        onClick={() => toggleUnifiedFavorite(favorite)}
                        size="lg"
                      />
                      {favorite.source === "recipe" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar refeição?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar "{favorite.name}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUnifiedRecipe(favorite)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        // Renderização de histórico (código original)
        recipes.length === 0 ? (
          <Card className="glass-card border-border/30">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                <ChefHat className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display font-bold text-foreground mb-2">
                Nenhuma refeição salva
              </h3>
              <p className="text-sm text-muted-foreground">
                Gere e salve refeições para vê-las aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recipes.map((recipe) => (
              <Card 
                key={recipe.id} 
                className="glass-card border-border/30 hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
                onClick={() => handleSelectRecipe(recipe)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-foreground truncate">
                        {recipe.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {recipe.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {recipe.prep_time} min
                        </span>
                        <span className="flex items-center gap-1 text-orange-500">
                          <Flame className="w-3.5 h-3.5" />
                          {recipe.calories} kcal
                        </span>
                        <span className={cn("text-xs", COMPLEXITY_LABELS[recipe.complexity].color)}>
                          {COMPLEXITY_LABELS[recipe.complexity].label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <FavoriteButton
                        isFavorite={recipe.is_favorite}
                        onClick={() => toggleHistoryFavorite(recipe.id, recipe.is_favorite)}
                        size="lg"
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deletar receita?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja deletar "{recipe.name}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteHistoryRecipe(recipe.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Deletar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
