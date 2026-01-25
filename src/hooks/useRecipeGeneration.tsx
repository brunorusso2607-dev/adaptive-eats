import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActivityLog } from "@/hooks/useActivityLog";
import { devLog } from "@/lib/devLog";

export interface Recipe {
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
  is_kids_mode?: boolean;
  is_weight_loss_mode?: boolean;
  satiety_score?: number;
  satiety_tip?: string;
}

export interface CategoryContext {
  category: string;
  subcategory: string;
  filters?: {
    culinaria?: string;
    tempo?: string;
    metodo?: string;
  };
}

interface UseRecipeGenerationReturn {
  // State
  ingredients: string[];
  isGeneratingRecipe: boolean;
  generatedRecipe: Recipe | null;
  showRecipe: boolean;
  lastUsedIngredients: string | null;
  lastUsedCategoryContext: CategoryContext | null;
  
  // Actions
  setIngredients: (ingredients: string[]) => void;
  setShowRecipe: (show: boolean) => void;
  setGeneratedRecipe: (recipe: Recipe | null) => void;
  generateRecipe: (
    type: "com_ingredientes" | "automatica",
    useLastIngredients?: boolean,
    categoryContext?: CategoryContext
  ) => Promise<void>;
  generateRecipeWithIngredients: (ingredientsList: string[]) => Promise<void>;
  generateAnother: (type: "ingredients" | "category" | "auto") => Promise<void>;
}

const MAX_RETRIES = 3;

export function useRecipeGeneration(): UseRecipeGenerationReturn {
  const { logUserAction } = useActivityLog();
  
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [showRecipe, setShowRecipe] = useState(false);
  const [lastUsedIngredients, setLastUsedIngredients] = useState<string | null>(null);
  const [lastUsedCategoryContext, setLastUsedCategoryContext] = useState<CategoryContext | null>(null);

  const executeGeneration = useCallback(async (
    ingredientsToUse: string | null,
    categoryContext: CategoryContext | null,
    type: "com_ingredientes" | "automatica"
  ): Promise<Recipe | null> => {
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
      attempt++;
      
      try {
        const { data, error } = await supabase.functions.invoke("generate-recipe", {
          body: { 
            type,
            ingredients: type === "com_ingredientes" ? ingredientsToUse : null,
            categoryContext: categoryContext || null,
          },
        });

        if (error) throw error;
        
        // Check for safety block
        if (data.safety_blocked && data.should_retry && attempt < MAX_RETRIES) {
          devLog(`[Recipe Safety] Attempt ${attempt}/${MAX_RETRIES} blocked, retrying...`, data.conflicts);
          toast.info(`Receita insegura detectada, gerando alternativa... (${attempt}/${MAX_RETRIES})`);
          continue;
        }
        
        if (data.error) throw new Error(data.error);

        return {
          ...data.recipe,
          input_ingredients: type === "com_ingredientes" ? ingredientsToUse : null,
        };
        
      } catch (error) {
        if (attempt >= MAX_RETRIES) {
          throw error;
        }
      }
    }
    
    return null;
  }, []);

  const generateRecipe = useCallback(async (
    type: "com_ingredientes" | "automatica",
    useLastIngredients = false,
    categoryContext?: CategoryContext
  ) => {
    const ingredientsToUse = useLastIngredients ? lastUsedIngredients : ingredients.join(", ");
    
    if (type === "com_ingredientes" && (!ingredientsToUse || ingredientsToUse.trim() === "")) {
      toast.error("Adicione alguns ingredientes primeiro");
      return;
    }

    setIsGeneratingRecipe(true);
    
    try {
      const recipe = await executeGeneration(ingredientsToUse, categoryContext || null, type);
      
      if (recipe) {
        setGeneratedRecipe(recipe);
        setShowRecipe(true);
        
        await logUserAction(
          "recipe_generated",
          `Receita gerada: "${recipe.name}"${categoryContext ? ` (${categoryContext.category}/${categoryContext.subcategory})` : type === "com_ingredientes" ? " (com ingredientes)" : " (automática)"}`,
          null,
          { 
            recipe_name: recipe.name, 
            type, 
            ingredients: ingredientsToUse,
            category: categoryContext?.category,
            subcategory: categoryContext?.subcategory 
          }
        );
        
        if (type === "com_ingredientes") {
          setLastUsedIngredients(ingredientsToUse);
        }
        if (categoryContext) {
          setLastUsedCategoryContext(categoryContext);
        }
        setIngredients([]);
      }
    } catch (error) {
      devLog("Error generating recipe after all retries:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar receita. Tente novamente.");
    } finally {
      setIsGeneratingRecipe(false);
    }
  }, [ingredients, lastUsedIngredients, executeGeneration, logUserAction]);

  const generateRecipeWithIngredients = useCallback(async (ingredientsList: string[]) => {
    if (ingredientsList.length === 0) {
      toast.error("Adicione alguns ingredientes primeiro");
      return;
    }

    const ingredientsToUse = ingredientsList.join(", ");
    setIsGeneratingRecipe(true);
    
    try {
      const recipe = await executeGeneration(ingredientsToUse, null, "com_ingredientes");
      
      if (recipe) {
        setGeneratedRecipe(recipe);
        setShowRecipe(true);
        
        await logUserAction(
          "recipe_generated",
          `Receita gerada: "${recipe.name}" (com ingredientes)`,
          null,
          { recipe_name: recipe.name, type: "com_ingredientes", ingredients: ingredientsToUse }
        );
        
        setLastUsedIngredients(ingredientsToUse);
        setIngredients([]);
      }
    } catch (error) {
      devLog("Error generating recipe after all retries:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar receita. Tente novamente.");
    } finally {
      setIsGeneratingRecipe(false);
    }
  }, [executeGeneration, logUserAction]);

  const generateAnother = useCallback(async (type: "ingredients" | "category" | "auto") => {
    if (type === "ingredients" && lastUsedIngredients) {
      await generateRecipe("com_ingredientes", true);
    } else if (type === "category" && lastUsedCategoryContext) {
      await generateRecipe("automatica", false, lastUsedCategoryContext);
    } else {
      await generateRecipe("automatica");
    }
  }, [lastUsedIngredients, lastUsedCategoryContext, generateRecipe]);

  return {
    ingredients,
    isGeneratingRecipe,
    generatedRecipe,
    showRecipe,
    lastUsedIngredients,
    lastUsedCategoryContext,
    setIngredients,
    setShowRecipe,
    setGeneratedRecipe,
    generateRecipe,
    generateRecipeWithIngredients,
    generateAnother,
  };
}
