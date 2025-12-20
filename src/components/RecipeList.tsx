import { useState, useEffect } from "react";
import { useSwipeToClose } from "@/hooks/use-swipe-to-close";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, Flame, Heart, Loader2, ChefHat, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
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
  const [recipes, setRecipes] = useState<RecipeFromDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Swipe to close with visual feedback
  const { handlers: swipeHandlers, style: swipeStyle, isDragging } = useSwipeToClose({
    onClose: onBack,
    direction: "right",
    threshold: 100,
  });

  useEffect(() => {
    fetchRecipes();
  }, [type]);

  const fetchRecipes = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });

      if (type === "favorites") {
        query = query.eq("is_favorite", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      toast.error("Erro ao carregar receitas");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (recipeId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("recipes")
        .update({ is_favorite: !currentValue })
        .eq("id", recipeId);

      if (error) throw error;

      setRecipes(prev => 
        prev.map(r => r.id === recipeId ? { ...r, is_favorite: !currentValue } : r)
          .filter(r => type === "history" || r.is_favorite)
      );

      toast.success(currentValue ? "Removido dos favoritos" : "Adicionado aos favoritos");
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Erro ao atualizar favorito");
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    try {
      const { error } = await supabase
        .from("recipes")
        .delete()
        .eq("id", recipeId);

      if (error) throw error;

      setRecipes(prev => prev.filter(r => r.id !== recipeId));
      toast.success("Receita deletada com sucesso");
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error("Erro ao deletar receita");
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

  return (
    <div 
      {...swipeHandlers} 
      style={swipeStyle} 
      className={cn("space-y-6 animate-in fade-in duration-300", isDragging && "select-none")}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-display text-xl font-bold text-foreground flex-1">
          {type === "history" ? "Histórico de Receitas" : "Receitas Favoritas"}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : recipes.length === 0 ? (
        <Card className="glass-card border-border/30">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
              {type === "favorites" ? (
                <Heart className="w-8 h-8 text-muted-foreground" />
              ) : (
                <ChefHat className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="font-display font-bold text-foreground mb-2">
              {type === "favorites" ? "Nenhuma receita favorita" : "Nenhuma receita salva"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {type === "favorites" 
                ? "Adicione receitas aos favoritos para vê-las aqui" 
                : "Gere e salve receitas para vê-las aqui"}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(recipe.id, recipe.is_favorite);
                      }}
                    >
                      <Heart 
                        className={cn(
                          "w-5 h-5 transition-colors",
                          recipe.is_favorite 
                            ? "text-rose-500 fill-rose-500" 
                            : "text-muted-foreground"
                        )} 
                      />
                    </Button>
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
                            onClick={() => deleteRecipe(recipe.id)}
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
      )}
    </div>
  );
}
