import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChefHat, Clock, Flame, Users, ArrowLeft, RefreshCw, 
  Heart, Save, Check, Loader2, Beef, Wheat, Droplet, TrendingDown, Leaf, 
  Baby, Zap, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActivityLog } from "@/hooks/useActivityLog";
import LegalDisclaimer from "./LegalDisclaimer";

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
  is_kids_mode?: boolean;
  is_weight_loss_mode?: boolean;
  satiety_score?: number;
  satiety_tip?: string;
};

type RecipeResultProps = {
  recipe: Recipe;
  onBack: () => void;
  onGenerateAnother: () => void;
  isGenerating: boolean;
};

const COMPLEXITY_LABELS: Record<string, { label: string; color: string }> = {
  rapida: { label: "Rápida", color: "text-green-500" },
  equilibrada: { label: "Equilibrada", color: "text-yellow-500" },
  elaborada: { label: "Elaborada", color: "text-orange-500" },
};

const DEFAULT_COMPLEXITY = { label: "Equilibrada", color: "text-yellow-500" };

export default function RecipeResult({ recipe, onBack, onGenerateAnother, isGenerating }: RecipeResultProps) {
  const { logUserAction } = useActivityLog();
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

      // Log user action
      await logUserAction(
        asFavorite ? "recipe_favorited" : "recipe_saved",
        asFavorite 
          ? `Receita "${recipe.name}" adicionada aos favoritos`
          : `Receita "${recipe.name}" salva no histórico`,
        null,
        { recipe_name: recipe.name, calories: recipe.calories }
      );

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

  const isKidsMode = recipe.is_kids_mode;
  const isWeightLossMode = recipe.is_weight_loss_mode;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-display text-xl font-bold text-foreground flex-1 flex items-center gap-2">
          {isKidsMode ? (
            <>
              <Sparkles className="w-5 h-5 text-yellow-500 stroke-[1.5]" />
              Receita Divertida!
            </>
          ) : isWeightLossMode ? (
            <>
              <Flame className="w-5 h-5 text-orange-500 stroke-[1.5]" />
              Receita Saudável
            </>
          ) : (
            "Receita Gerada"
          )}
        </h2>
        {isKidsMode && (
          <span className="px-3 py-1 bg-gradient-to-r from-pink-500 to-yellow-500 text-white text-xs font-bold rounded-full animate-pulse flex items-center gap-1">
            <Baby className="w-3 h-3 stroke-[1.5]" /> Modo Kids
          </span>
        )}
        {isWeightLossMode && !isKidsMode && (
          <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
            <TrendingDown className="w-3 h-3 stroke-[1.5]" /> Emagrecer
          </span>
        )}
      </div>

      {/* Recipe Card */}
      <Card className={cn(
        "glass-card overflow-hidden",
        isKidsMode 
          ? "border-2 border-pink-400/50 shadow-[0_0_30px_-5px_rgba(236,72,153,0.3)]" 
          : "border-primary/20"
      )}>
        <div className={cn(
          "h-3",
          isKidsMode 
            ? "bg-gradient-to-r from-pink-400 via-yellow-400 to-green-400" 
            : "gradient-primary h-2"
        )} />
        <CardHeader className="pb-3">
          <CardTitle className={cn(
            "font-display",
            isKidsMode ? "text-3xl" : "text-2xl"
          )}>
            {recipe.name}
          </CardTitle>
          <p className={cn(
            "text-sm",
            isKidsMode ? "text-foreground/80 text-base" : "text-muted-foreground"
          )}>
            {recipe.description}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meta Info */}
          <div className={cn(
            "flex flex-wrap gap-4 text-sm",
            isKidsMode && "bg-gradient-to-r from-pink-50 to-yellow-50 dark:from-pink-950/30 dark:to-yellow-950/30 p-3 rounded-xl"
          )}>
            <div className="flex items-center gap-1.5">
              <Clock className={cn("w-4 h-4 stroke-[1.5]", isKidsMode ? "text-pink-500" : "text-muted-foreground")} />
              {isKidsMode && <Zap className="w-3 h-3 text-yellow-500 stroke-[1.5]" />}
              <span>{recipe.prep_time} min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className={cn("w-4 h-4 stroke-[1.5]", isKidsMode ? "text-yellow-500" : "text-muted-foreground")} />
              <span>{recipe.servings} porções</span>
            </div>
            <div className={cn("flex items-center gap-1.5", isKidsMode ? "text-green-500" : (COMPLEXITY_LABELS[recipe.complexity] || DEFAULT_COMPLEXITY).color)}>
              <ChefHat className="w-4 h-4" />
              <span>{isKidsMode ? "Super Fácil! 🌟" : (COMPLEXITY_LABELS[recipe.complexity] || DEFAULT_COMPLEXITY).label}</span>
            </div>
          </div>

          {/* Nutrition - Kids version is more colorful and playful */}
          <div className="grid grid-cols-4 gap-2">
            <div className={cn(
              "rounded-xl p-3 text-center transition-transform hover:scale-105",
              isKidsMode ? "bg-gradient-to-b from-orange-400/20 to-orange-500/10" : "bg-orange-500/10"
            )}>
              <Flame className={cn("w-5 h-5 mx-auto mb-1", isKidsMode ? "text-orange-400" : "text-orange-500")} />
              <p className="text-lg font-bold">{recipe.calories}</p>
              <p className="text-xs text-muted-foreground">{isKidsMode ? "🔥 kcal" : "kcal"}</p>
            </div>
            <div className={cn(
              "rounded-xl p-3 text-center transition-transform hover:scale-105",
              isKidsMode ? "bg-gradient-to-b from-red-400/20 to-red-500/10" : "bg-red-500/10"
            )}>
              <Beef className={cn("w-5 h-5 mx-auto mb-1", isKidsMode ? "text-red-400" : "text-red-500")} />
              <p className="text-lg font-bold">{recipe.protein}g</p>
              <p className="text-xs text-muted-foreground">{isKidsMode ? "💪 Força" : "Proteína"}</p>
            </div>
            <div className={cn(
              "rounded-xl p-3 text-center transition-transform hover:scale-105",
              isKidsMode ? "bg-gradient-to-b from-amber-400/20 to-amber-500/10" : "bg-amber-500/10"
            )}>
              <Wheat className={cn("w-5 h-5 mx-auto mb-1", isKidsMode ? "text-amber-400" : "text-amber-500")} />
              <p className="text-lg font-bold">{recipe.carbs}g</p>
              <p className="text-xs text-muted-foreground">{isKidsMode ? "⚡ Energia" : "Carbos"}</p>
            </div>
            <div className={cn(
              "rounded-xl p-3 text-center transition-transform hover:scale-105",
              isKidsMode ? "bg-gradient-to-b from-green-400/20 to-green-500/10" : "bg-green-500/10"
            )}>
              <Droplet className={cn("w-5 h-5 mx-auto mb-1", isKidsMode ? "text-green-400" : "text-green-500")} />
              <p className="text-lg font-bold">{recipe.fat}g</p>
              <p className="text-xs text-muted-foreground">{isKidsMode ? "🥑 Bom" : "Gordura"}</p>
            </div>
          </div>

          {/* Satiety Score - Weight Loss Mode */}
          {isWeightLossMode && recipe.satiety_score && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-200/50 dark:border-green-800/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-green-500" />
                  <h3 className="font-display font-bold text-foreground">Índice de Saciedade</h3>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-2.5 h-6 rounded-sm transition-all",
                        i < (recipe.satiety_score || 0)
                          ? "bg-gradient-to-t from-green-500 to-emerald-400"
                          : "bg-gray-200 dark:bg-gray-700"
                      )}
                    />
                  ))}
                  <span className="ml-2 font-bold text-green-600">{recipe.satiety_score}/10</span>
                </div>
              </div>
              {recipe.satiety_tip && (
                <div className="bg-white/60 dark:bg-white/10 rounded-lg p-3">
                  <p className="text-sm text-foreground flex items-start gap-2">
                    <TrendingDown className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span><strong>Dica:</strong> {recipe.satiety_tip}</span>
                  </p>
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/60 dark:bg-white/10 rounded-lg p-2 text-center">
                  <p className="font-bold text-green-600">~0.5kg/semana</p>
                  <p className="text-muted-foreground">Perda estimada*</p>
                </div>
                <div className="bg-white/60 dark:bg-white/10 rounded-lg p-2 text-center">
                  <p className="font-bold text-green-600">Déficit saudável</p>
                  <p className="text-muted-foreground">300-500 kcal/dia</p>
                </div>
              </div>
            </div>
          )}

          {/* Ingredients */}
          <div className={cn(
            isKidsMode && "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-4 rounded-xl"
          )}>
            <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
              {isKidsMode ? "🛒 O que vamos precisar:" : "🥗 Ingredientes"}
            </h3>
            <ul className="space-y-2">
              {(recipe.ingredients || []).length > 0 ? (
                recipe.ingredients.map((ing, idx) => (
                  <li key={idx} className={cn(
                    "flex items-center gap-2 text-sm",
                    isKidsMode && "text-base"
                  )}>
                    <span className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      isKidsMode 
                        ? ["bg-pink-400", "bg-yellow-400", "bg-green-400", "bg-blue-400", "bg-purple-400"][idx % 5]
                        : "bg-primary"
                    )} />
                    <span>
                      {ing.quantity || ing.unit ? (
                        <><span className="font-medium">{ing.quantity} {ing.unit}</span> de {ing.item}</>
                      ) : (
                        <span>{ing.item || String(ing)}</span>
                      )}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground text-sm italic">Ingredientes não disponíveis</li>
              )}
            </ul>
          </div>

          {/* Instructions */}
          <div className={cn(
            isKidsMode && "bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30 p-4 rounded-xl"
          )}>
            <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
              {isKidsMode ? "👨‍🍳 Vamos cozinhar!" : "👨‍🍳 Modo de Preparo"}
            </h3>
            <ol className="space-y-3">
              {recipe.instructions.map((step, idx) => (
                <li key={idx} className="flex gap-3 text-sm">
                  <span className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                    isKidsMode 
                      ? "bg-gradient-to-r from-pink-500 to-yellow-500 text-white text-base" 
                      : "bg-primary/20 text-primary w-6 h-6 text-xs"
                  )}>
                    {isKidsMode ? ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"][idx] || idx + 1 : idx + 1}
                  </span>
                  <span className={cn("pt-0.5", isKidsMode && "text-base")}>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Kids mode fun message */}
          {isKidsMode && (
            <div className="text-center p-4 bg-gradient-to-r from-pink-100 to-yellow-100 dark:from-pink-950/50 dark:to-yellow-950/50 rounded-xl">
              <p className="text-lg font-bold text-foreground">🎉 Parabéns, chefinho!</p>
              <p className="text-sm text-muted-foreground">Você está pronto para fazer uma receita deliciosa!</p>
            </div>
          )}
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

      {/* Legal Disclaimer */}
      <LegalDisclaimer className="mt-4" />
    </div>
  );
}
