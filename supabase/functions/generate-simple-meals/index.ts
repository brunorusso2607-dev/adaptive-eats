import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  getCountryConfig,
  getMealExamples,
  getIngredientPriority,
  buildGoalContextInstructions,
  FORBIDDEN_INGREDIENTS,
  MEAL_TYPE_LABELS,
  type UserProfile,
} from "../_shared/recipeConfig.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MEAL_TYPES = [
  { key: 'cafe_manha', label: 'Café da manhã', calorieRange: [200, 450] },
  { key: 'almoco', label: 'Almoço', calorieRange: [400, 700] },
  { key: 'lanche', label: 'Lanche da tarde', calorieRange: [150, 350] },
  { key: 'jantar', label: 'Jantar', calorieRange: [300, 550] },
  { key: 'ceia', label: 'Ceia', calorieRange: [80, 200] },
];

const RECIPE_CATEGORIES = [
  'Tradicional regional',
  'Fitness/Light',
  'Reconfortante',
  'Rápido e prático',
  'Vegetariano',
  'Rico em proteínas',
  'Low carb',
  'Comfort food',
];

// Build intolerance-aware instructions
function buildIntoleranceInstructions(intolerances: string[] | null): string {
  if (!intolerances || intolerances.length === 0) {
    return "";
  }

  const forbiddenList: string[] = [];
  for (const intolerance of intolerances) {
    const forbidden = FORBIDDEN_INGREDIENTS[intolerance.toLowerCase()];
    if (forbidden) {
      forbiddenList.push(...forbidden);
    }
  }

  if (forbiddenList.length === 0) return "";

  const uniqueForbidden = [...new Set(forbiddenList)];
  return `

⚠️ INGREDIENTES ABSOLUTAMENTE PROIBIDOS (intolerâncias do usuário):
${uniqueForbidden.slice(0, 50).join(', ')}

NUNCA inclua NENHUM destes ingredientes ou derivados nas receitas!
Sempre use alternativas seguras.`;
}

// Build dietary preference instructions
function buildDietaryInstructions(dietaryPreference: string | null): string {
  if (!dietaryPreference) return "";

  const instructions: Record<string, string> = {
    vegetariana: `
🥗 PREFERÊNCIA: VEGETARIANA
- SEM carne, frango, peixe ou frutos do mar
- Pode incluir ovos e laticínios
- Priorize proteínas vegetais: leguminosas, tofu, cogumelos`,
    vegana: `
🌱 PREFERÊNCIA: VEGANA
- SEM produtos de origem animal (carne, ovos, laticínios, mel)
- Use proteínas vegetais: grão-de-bico, lentilha, tofu, seitan
- Substitua laticínios por leites vegetais`,
    low_carb: `
🥩 PREFERÊNCIA: LOW CARB
- Minimize carboidratos (máx 30g por refeição)
- Priorize proteínas e gorduras saudáveis
- Evite arroz, pão, massa, batata, açúcar`,
    cetogenica: `
🧈 PREFERÊNCIA: CETOGÊNICA
- Ultra low carb (máx 20g por refeição)
- Alta gordura, proteína moderada
- Evite todos os carboidratos, incluindo frutas`,
    pescetariana: `
🐟 PREFERÊNCIA: PESCETARIANA
- SEM carne vermelha ou frango
- Pode incluir peixe e frutos do mar
- Ovos e laticínios permitidos`,
  };

  return instructions[dietaryPreference] || "";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase não configurado");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { 
      mealType, 
      category, 
      quantity = 10, 
      countryCode = 'BR',
      languageCode = 'pt-BR',
      intolerances = [],
      dietaryPreference = null,
      goal = null,
    } = await req.json();

    // Get country-specific configuration
    const countryConfig = getCountryConfig(countryCode);
    const selectedMealType = MEAL_TYPES.find(m => m.key === mealType) || MEAL_TYPES[Math.floor(Math.random() * MEAL_TYPES.length)];
    const selectedCategory = category || RECIPE_CATEGORIES[Math.floor(Math.random() * RECIPE_CATEGORIES.length)];
    const mealExamples = getMealExamples(selectedMealType.key, countryCode);
    const ingredientPriority = getIngredientPriority(countryCode);

    console.log(`[generate-simple-meals] Gerando ${quantity} receitas: ${selectedMealType.label} - ${selectedCategory} para ${countryConfig.name}`);

    // Fetch existing recipes to avoid duplicates
    const { data: existingMeals } = await supabase
      .from('simple_meals')
      .select('name')
      .eq('country_code', countryCode);

    const existingNames = existingMeals?.map(m => m.name.toLowerCase()) || [];

    // Build profile for goal context
    const mockProfile: UserProfile = {
      id: 'system',
      goal,
      dietary_preference: dietaryPreference,
      intolerances,
      country: countryCode,
    };

    const goalInstructions = buildGoalContextInstructions(mockProfile);
    const intoleranceInstructions = buildIntoleranceInstructions(intolerances);
    const dietaryInstructions = buildDietaryInstructions(dietaryPreference);

    const systemPrompt = `Você é o MAIOR ESPECIALISTA MUNDIAL em culinária de ${countryConfig.name}.

## SUA MISSÃO
Criar receitas AUTÊNTICAS, SABOROSAS e NUTRITIVAS para ${countryConfig.name}.

## CONHECIMENTO ENCICLOPÉDICO
- Culinária típica de ${countryConfig.name}
- Ingredientes locais e sazonais
- Técnicas tradicionais de preparo
- Valores nutricionais precisos

## EXEMPLOS DE ${selectedMealType.label.toUpperCase()} EM ${countryConfig.name.toUpperCase()}:
${mealExamples.join(', ')}

## INGREDIENTES
${ingredientPriority}

${goalInstructions}
${dietaryInstructions}
${intoleranceInstructions}

IMPORTANTE: 
- Responda em ${countryConfig.language === 'pt-BR' ? 'Português Brasileiro' : countryConfig.language}
- Responda APENAS com JSON válido, sem markdown
- Valores nutricionais REALISTAS baseados em porções padrão`;

    const userPrompt = `Gere exatamente ${quantity} receitas DIFERENTES e AUTÊNTICAS de ${countryConfig.name} para ${selectedMealType.label}.

Categoria: ${selectedCategory}
Faixa de calorias: ${selectedMealType.calorieRange[0]}-${selectedMealType.calorieRange[1]} kcal por porção

${existingNames.length > 0 ? `EVITE estas receitas já existentes: ${existingNames.slice(0, 30).join(', ')}` : ''}

Retorne um JSON com esta estrutura EXATA:
{
  "recipes": [
    {
      "name": "Nome da Receita (nome típico local)",
      "description": "Descrição curta e apetitosa (1 frase)",
      "calories": 350,
      "protein": 25,
      "carbs": 30,
      "fat": 12,
      "prep_time": 20,
      "ingredients": [
        {"name": "ingrediente 1", "quantity": "200g"},
        {"name": "ingrediente 2", "quantity": "1 unidade"}
      ],
      "compatible_meal_times": ["${selectedMealType.key}"]
    }
  ]
}

REGRAS:
1. Receitas VARIADAS e ÚNICAS - não repita conceitos
2. Nomes em ${countryConfig.language === 'pt-BR' ? 'português' : 'idioma local'}
3. Ingredientes típicos e acessíveis em ${countryConfig.name}
4. Valores nutricionais REALISTAS
5. Tempo de preparo realista
6. 3-8 ingredientes por receita`;

    console.log(`[generate-simple-meals] Chamando API com country: ${countryCode}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-simple-meals] Erro na API:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    let content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Clean markdown if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log("[generate-simple-meals] Resposta recebida, parseando JSON...");

    let recipes;
    try {
      const parsed = JSON.parse(content);
      recipes = parsed.recipes || parsed;
    } catch (parseError) {
      console.error("[generate-simple-meals] Erro ao parsear JSON:", parseError);
      console.error("[generate-simple-meals] Conteúdo:", content.substring(0, 500));
      throw new Error("Formato de resposta inválido da IA");
    }

    if (!Array.isArray(recipes) || recipes.length === 0) {
      throw new Error("Nenhuma receita gerada");
    }

    // Prepare data for insertion
    const mealsToInsert = recipes
      .filter(r => r.name && !existingNames.includes(r.name.toLowerCase()))
      .map((recipe, index) => ({
        name: recipe.name,
        description: recipe.description || null,
        calories: Math.round(recipe.calories) || 300,
        protein: Math.round(recipe.protein) || 15,
        carbs: Math.round(recipe.carbs) || 30,
        fat: Math.round(recipe.fat) || 10,
        prep_time: recipe.prep_time || 15,
        ingredients: recipe.ingredients || [],
        meal_type: selectedMealType.key,
        compatible_meal_times: recipe.compatible_meal_times || [selectedMealType.key],
        country_code: countryCode,
        language_code: languageCode,
        is_active: true,
        ai_generated: true,
        component_type: 'main',
        sort_order: index,
      }));

    if (mealsToInsert.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Todas as receitas geradas já existem no banco",
        inserted: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert into database
    const { data: insertedData, error: insertError } = await supabase
      .from('simple_meals')
      .insert(mealsToInsert)
      .select('id, name');

    if (insertError) {
      console.error("[generate-simple-meals] Erro ao inserir:", insertError);
      throw new Error(`Erro ao salvar receitas: ${insertError.message}`);
    }

    console.log(`[generate-simple-meals] Inseridas ${insertedData?.length || 0} receitas com sucesso`);

    return new Response(JSON.stringify({
      success: true,
      inserted: insertedData?.length || 0,
      mealType: selectedMealType.label,
      category: selectedCategory,
      country: countryConfig.name,
      recipes: insertedData?.map(r => r.name) || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[generate-simple-meals] Erro geral:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
