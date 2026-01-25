import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  classifyIngredient,
  calculateMatchScore,
  calculateEquivalentPortion,
  filterByRestrictions,
  type IngredientSubstitute,
  type NutritionalProfile
} from "../_shared/ingredientClassifier.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Parse request
    const {
      ingredientId,
      ingredientName,
      currentGrams,
      currentCaloriesPer100g,
      currentProteinPer100g,
      currentCarbsPer100g,
      currentFatPer100g,
      userIntolerances = [],
      dietaryPreference = null,
      excludedIngredients = [],
      currentMealIngredients = [],
      maxResults = 10
    } = await req.json();

    console.log("Finding substitutes for:", {
      ingredientId,
      ingredientName,
      currentGrams,
      currentCaloriesPer100g
    });

    // Calcular macros totais do ingrediente atual
    const originalMacros: NutritionalProfile = {
      calories: (currentGrams / 100) * currentCaloriesPer100g,
      protein: (currentGrams / 100) * currentProteinPer100g,
      carbs: (currentGrams / 100) * currentCarbsPer100g,
      fat: (currentGrams / 100) * currentFatPer100g
    };

    // Classificar categoria do ingrediente original
    const originalCategory = classifyIngredient(ingredientName, {
      calories: currentCaloriesPer100g,
      protein: currentProteinPer100g,
      carbs: currentCarbsPer100g,
      fat: currentFatPer100g
    });

    console.log("Original ingredient category:", originalCategory);

    // Buscar ingredientes candidatos da mesma categoria no canonical_ingredients
    // Tolerância de ±30% nas calorias para busca inicial (filtraremos depois)
    const minCalories = currentCaloriesPer100g * 0.7;
    const maxCalories = currentCaloriesPer100g * 1.3;

    const { data: candidates, error: candidatesError } = await supabaseClient
      .from("canonical_ingredients")
      .select("*")
      .gte("calories_per_100g", minCalories)
      .lte("calories_per_100g", maxCalories)
      .neq("id", ingredientId) // Excluir o próprio ingrediente
      .limit(100); // Buscar mais para filtrar depois

    if (candidatesError) {
      throw new Error(`Error fetching candidates: ${candidatesError.message}`);
    }

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({
          substitutes: [],
          message: "Nenhuma substituição encontrada no pool"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${candidates.length} initial candidates`);

    // Filtrar por categoria (classificar cada candidato)
    const sameCategoryCandidates = candidates.filter(candidate => {
      const candidateCategory = classifyIngredient(candidate.name, {
        calories: candidate.calories_per_100g,
        protein: candidate.protein_per_100g,
        carbs: candidate.carbs_per_100g,
        fat: candidate.fat_per_100g
      });
      return candidateCategory === originalCategory;
    });

    console.log(`${sameCategoryCandidates.length} candidates in same category (${originalCategory})`);

    // Filtrar por restrições do usuário
    const filteredCandidates = filterByRestrictions(
      sameCategoryCandidates,
      userIntolerances,
      dietaryPreference,
      [...excludedIngredients, ...currentMealIngredients] // Evitar duplicatas na refeição
    );

    console.log(`${filteredCandidates.length} candidates after restrictions filter`);

    // Calcular substituições com porções ajustadas
    const substitutes: IngredientSubstitute[] = filteredCandidates.map(candidate => {
      // Calcular porção equivalente em calorias
      const equivalentGrams = calculateEquivalentPortion(
        currentGrams,
        currentCaloriesPer100g,
        candidate.calories_per_100g
      );

      // Calcular macros do substituto na porção ajustada
      const substituteMacros: NutritionalProfile = {
        calories: (equivalentGrams / 100) * candidate.calories_per_100g,
        protein: (equivalentGrams / 100) * candidate.protein_per_100g,
        carbs: (equivalentGrams / 100) * candidate.carbs_per_100g,
        fat: (equivalentGrams / 100) * candidate.fat_per_100g
      };

      // Calcular score de compatibilidade
      const matchScore = calculateMatchScore(
        originalMacros,
        substituteMacros,
        originalCategory
      );

      // Calcular diferenças percentuais
      const caloriesDiff = ((substituteMacros.calories - originalMacros.calories) / originalMacros.calories) * 100;
      const proteinDiff = ((substituteMacros.protein - originalMacros.protein) / Math.max(originalMacros.protein, 1)) * 100;

      return {
        id: candidate.id,
        name: candidate.name,
        category: originalCategory,
        suggestedGrams: equivalentGrams,
        calories: Math.round(substituteMacros.calories),
        protein: Math.round(substituteMacros.protein * 10) / 10,
        carbs: Math.round(substituteMacros.carbs * 10) / 10,
        fat: Math.round(substituteMacros.fat * 10) / 10,
        fiber: candidate.fiber_per_100g ? Math.round((equivalentGrams / 100) * candidate.fiber_per_100g * 10) / 10 : undefined,
        caloriesDiff: Math.round(caloriesDiff),
        proteinDiff: Math.round(proteinDiff),
        matchScore: Math.round(matchScore)
      };
    });

    // Ordenar por match score (melhor primeiro)
    substitutes.sort((a, b) => b.matchScore - a.matchScore);

    // Limitar resultados
    const topSubstitutes = substitutes.slice(0, maxResults);

    console.log(`Returning ${topSubstitutes.length} substitutes`);

    return new Response(
      JSON.stringify({
        substitutes: topSubstitutes,
        originalCategory,
        totalCandidates: candidates.length,
        sameCategoryCount: sameCategoryCandidates.length,
        afterRestrictionsCount: filteredCandidates.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-ingredient-substitutes:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

