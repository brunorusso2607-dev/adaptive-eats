import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChefHat, Clock, Flame, Users, ArrowLeft, RefreshCw, 
  Heart, Save, Check, Loader2, Beef, Wheat, Droplet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Ingredient = {
  item: string;
  quantity: string;
  unit: string;
};

type Recipe = {
  name: string;
  description: string;
  ingredients: Ingredient[];
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

type RecipeResultProps = {
  recipe: Recipe;
  onBack: () => void;
  onGenerateAnother: () => void;
  isGenerating: boolean;
};

const COMPLEXITY_LABELS = {
  rapida: { label: "Rápida", color: "text-green-500" },
  equilibrada: { label: "Equilibrada", color: "text-yellow-500" },
  elaborada: { label: "Elaborada", color: "text-orange-500" },
};

export default function RecipeResult({ recipe, onBack, onGenerateAnother, isGenerating }: RecipeResultProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const saveRecipe = async (asFavorite: boolean) => {
    if (asFavorite) {
      setIsFavoriting(true);
    } else {
      setIsSaving(true);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { error } = await supabase.from("recipes").insert({
        user_id: session.user.id,
        name: recipe.name,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prep_time: recipe.prep_time,
        complexity: recipe.complexity,
        servings: recipe.servings,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        is_favorite: asFavorite,
        input_ingredients: recipe.input_ingredients,
      });

      if (error) throw error;

      if (asFavorite) {
        setIsFavorited(true);
        toast.success("Receita adicionada aos favoritos!");
      } else {
        setIsSaved(true);
        toast.success("Receita salva no histórico!");
      }
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast.error("Erro ao salvar receita");
    } finally {
      setIsSaving(false);
      setIsFavoriting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-display text-xl font-bold text-foreground flex-1">
          Receita Gerada
        </h2>
      </div>

      {/* Recipe Card */}
      <Card className="glass-card border-primary/20 overflow-hidden">
        <div className="h-2 gradient-primary" />
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-2xl">{recipe.name}</CardTitle>
          <p className="text-muted-foreground text-sm">{recipe.description}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{recipe.prep_time} min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{recipe.servings} porções</span>
            </div>
            <div className={cn("flex items-center gap-1.5", COMPLEXITY_LABELS[recipe.complexity].color)}>
              <ChefHat className="w-4 h-4" />
              <span>{COMPLEXITY_LABELS[recipe.complexity].label}</span>
            </div>
          </div>

          {/* Nutrition */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-orange-500/10 rounded-xl p-3 text-center">
              <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold">{recipe.calories}</p>
              <p className="text-xs text-muted-foreground">kcal</p>
            </div>
            <div className="bg-red-500/10 rounded-xl p-3 text-center">
              <Beef className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-lg font-bold">{recipe.protein}g</p>
              <p className="text-xs text-muted-foreground">Proteína</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-3 text-center">
              <Wheat className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold">{recipe.carbs}g</p>
              <p className="text-xs text-muted-foreground">Carbos</p>
            </div>
            <div className="bg-green-500/10 rounded-xl p-3 text-center">
              <Droplet className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold">{recipe.fat}g</p>
              <p className="text-xs text-muted-foreground">Gordura</p>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
              🥗 Ingredientes
            </h3>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                  <span>
                    <span className="font-medium">{ing.quantity} {ing.unit}</span> de {ing.item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
              👨‍🍳 Modo de Preparo
            </h3>
            <ol className="space-y-3">
              {recipe.instructions.map((step, idx) => (
                <li key={idx} className="flex gap-3 text-sm">
                  <span className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center shrink-0 text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={onGenerateAnother}
          disabled={isGenerating}
          className="h-12"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Gerar Outra
        </Button>
        <Button
          onClick={() => saveRecipe(false)}
          disabled={isSaving || isSaved}
          className="h-12"
          variant={isSaved ? "secondary" : "default"}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : isSaved ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isSaved ? "Salva" : "Salvar"}
        </Button>
      </div>

      <Button
        onClick={() => saveRecipe(true)}
        disabled={isFavoriting || isFavorited}
        variant={isFavorited ? "secondary" : "outline"}
        className={cn(
          "w-full h-12",
          !isFavorited && "border-rose-500/50 text-rose-500 hover:bg-rose-500/10"
        )}
      >
        {isFavoriting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Heart className={cn("w-4 h-4 mr-2", isFavorited && "fill-current")} />
        )}
        {isFavorited ? "Favoritada" : "Adicionar aos Favoritos"}
      </Button>
    </div>
  );
}
