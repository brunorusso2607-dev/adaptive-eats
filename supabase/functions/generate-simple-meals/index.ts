import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  'Tradicional brasileiro',
  'Fitness/Light',
  'Reconfortante',
  'Rápido e prático',
  'Vegetariano',
  'Rico em proteínas',
  'Low carb',
  'Comfort food',
  'Regional nordestino',
  'Regional mineiro',
  'Regional sulista',
  'Regional paulista',
];

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
      languageCode = 'pt-BR' 
    } = await req.json();

    const selectedMealType = MEAL_TYPES.find(m => m.key === mealType) || MEAL_TYPES[Math.floor(Math.random() * MEAL_TYPES.length)];
    const selectedCategory = category || RECIPE_CATEGORIES[Math.floor(Math.random() * RECIPE_CATEGORIES.length)];

    console.log(`Gerando ${quantity} receitas: ${selectedMealType.label} - ${selectedCategory}`);

    // Buscar receitas existentes para evitar duplicatas
    const { data: existingMeals } = await supabase
      .from('simple_meals')
      .select('name')
      .eq('country_code', countryCode);

    const existingNames = existingMeals?.map(m => m.name.toLowerCase()) || [];

    const systemPrompt = `Você é um nutricionista brasileiro especialista em criar receitas saudáveis e saborosas.
Suas receitas são:
- Autênticas e populares no Brasil
- Com ingredientes fáceis de encontrar em supermercados brasileiros
- Balanceadas nutricionalmente
- Com instruções claras e objetivas

IMPORTANTE: Responda APENAS com o JSON válido, sem markdown, sem explicações.`;

    const userPrompt = `Gere exatamente ${quantity} receitas brasileiras DIFERENTES para ${selectedMealType.label}.
Categoria: ${selectedCategory}
Faixa de calorias: ${selectedMealType.calorieRange[0]}-${selectedMealType.calorieRange[1]} kcal

${existingNames.length > 0 ? `EVITE estas receitas já existentes: ${existingNames.slice(0, 50).join(', ')}` : ''}

Retorne um JSON com esta estrutura EXATA:
{
  "recipes": [
    {
      "name": "Nome da Receita",
      "description": "Descrição curta e apetitosa",
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

Gere receitas VARIADAS e ÚNICAS. Não repita nomes ou conceitos similares.`;

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
      console.error("Erro na API:", response.status, errorText);
      
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
    
    // Limpar markdown se houver
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log("Resposta da IA (primeiros 500 chars):", content.substring(0, 500));

    let recipes;
    try {
      const parsed = JSON.parse(content);
      recipes = parsed.recipes || parsed;
    } catch (parseError) {
      console.error("Erro ao parsear JSON:", parseError);
      console.error("Conteúdo recebido:", content);
      throw new Error("Formato de resposta inválido da IA");
    }

    if (!Array.isArray(recipes) || recipes.length === 0) {
      throw new Error("Nenhuma receita gerada");
    }

    // Preparar dados para inserção
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

    // Inserir no banco
    const { data: insertedData, error: insertError } = await supabase
      .from('simple_meals')
      .insert(mealsToInsert)
      .select('id, name');

    if (insertError) {
      console.error("Erro ao inserir:", insertError);
      throw new Error(`Erro ao salvar receitas: ${insertError.message}`);
    }

    console.log(`Inseridas ${insertedData?.length || 0} receitas com sucesso`);

    return new Response(JSON.stringify({
      success: true,
      inserted: insertedData?.length || 0,
      mealType: selectedMealType.label,
      category: selectedCategory,
      recipes: insertedData?.map(r => r.name) || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro geral:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
