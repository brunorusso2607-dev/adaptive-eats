import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { recalculatePer100g } from "../_shared/calorieTable.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whitelist de categorias que são INGREDIENTES PUROS (não pratos prontos)
const ALLOWED_INGREDIENT_CATEGORIES = [
  'carnes',
  'legumes',
  'verduras',
  'frutas',
  'temperos',
  'laticinios',
  'graos',
  'farinhas',
  'oleos',
  'ovos',
  'cogumelos',
  'frutos do mar',
  'castanhas',
  'frutas secas',
  'bebidas vegetais',
  'adocantes',
  'conservas',
  'cereais',
  'peixes',
  'aves',
  'suplementos',
  'ervas',
  'especiarias',
  'sementes',
  'leguminosas',
  'tuberculos',
  'raizes',
  'folhas',
  'brotos',
  'queijos',
  'manteigas',
  'cremes',
  'leites',
  'iogurtes',
  // Categorias adicionais de ingredientes válidos
  'oleaginosas',
  'proteinas vegetais',
  'embutidos',
  'cereais matinais',
  'complementos',
  'enlatados',
  'fibras',
  'paes',
  'molhos',
];

// Mapeamento de país para fontes prioritárias
const COUNTRY_SOURCE_PRIORITY: Record<string, string[]> = {
  'BR': ['TBCA', 'taco', 'curated', 'BAM', 'usda'],
  'MX': ['BAM', 'TBCA', 'curated', 'taco', 'usda'],
  'AR': ['usda', 'curated', 'TBCA', 'BAM', 'taco'], // Argentina - USDA como fallback (sem fonte nativa)
  'CL': ['usda', 'curated', 'TBCA', 'BAM', 'taco'], // Chile - USDA como fallback
  'CO': ['usda', 'curated', 'TBCA', 'BAM', 'taco'], // Colômbia - USDA como fallback
  'PE': ['usda', 'curated', 'TBCA', 'BAM', 'taco'], // Peru - USDA como fallback
  'US': ['usda', 'curated', 'TBCA', 'BAM', 'taco'],
  'DEFAULT': ['usda', 'curated', 'TBCA', 'taco', 'BAM'], // USDA como fallback universal
};

// Mapeamento de país para cuisine_origin prioritário
const COUNTRY_CUISINE_PRIORITY: Record<string, string[]> = {
  'BR': ['brasileira', 'latina'],
  'MX': ['mexicana', 'latina'],
  'AR': ['argentina', 'latina'],
  'CL': ['chilena', 'latina'],
  'CO': ['colombiana', 'latina'],
  'PE': ['peruana', 'latina'],
  'US': ['americana', 'international'],
  'DEFAULT': ['international'],
};

// Função para ordenar resultados por prioridade de país
function sortByCountryPriority(results: any[], userCountry: string): any[] {
  const sourcePriority = COUNTRY_SOURCE_PRIORITY[userCountry] || COUNTRY_SOURCE_PRIORITY['DEFAULT'];
  const cuisinePriority = COUNTRY_CUISINE_PRIORITY[userCountry] || COUNTRY_CUISINE_PRIORITY['DEFAULT'];

  return results.sort((a, b) => {
    // 1. Prioridade por source
    const sourceIndexA = sourcePriority.indexOf(a.source || '');
    const sourceIndexB = sourcePriority.indexOf(b.source || '');
    const sourcePriorityA = sourceIndexA === -1 ? 999 : sourceIndexA;
    const sourcePriorityB = sourceIndexB === -1 ? 999 : sourceIndexB;

    if (sourcePriorityA !== sourcePriorityB) {
      return sourcePriorityA - sourcePriorityB;
    }

    // 2. Prioridade por cuisine_origin
    const cuisineIndexA = cuisinePriority.findIndex(c => 
      a.cuisine_origin?.toLowerCase().includes(c)
    );
    const cuisineIndexB = cuisinePriority.findIndex(c => 
      b.cuisine_origin?.toLowerCase().includes(c)
    );
    const cuisinePriorityA = cuisineIndexA === -1 ? 999 : cuisineIndexA;
    const cuisinePriorityB = cuisineIndexB === -1 ? 999 : cuisineIndexB;

    if (cuisinePriorityA !== cuisinePriorityB) {
      return cuisinePriorityA - cuisinePriorityB;
    }

    // 3. Por verificação
    if (a.verified !== b.verified) {
      return a.verified ? -1 : 1;
    }

    return 0;
  });
}

const logStep = (step: string, details?: any) => {
  console.log(`[SEARCH-INGREDIENT] ${step}`, details ? JSON.stringify(details) : '');
};

// Normalize text: remove accents, lowercase
function normalizeText(text: string | undefined | null): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// ============= PROTEÇÃO ANTI-FALSO MATCH =============
const BEVERAGE_TERMS_SEARCH = ['cha', 'cafe', 'suco', 'agua', 'leite', 'vitamina', 'smoothie', 'infusao', 'refrigerante'];
const SOLID_FOOD_TERMS_SEARCH = ['batata', 'arroz', 'feijao', 'carne', 'frango', 'peixe', 'ovo', 'pao', 'bolo', 'queijo', 'macarrao'];

function isBeverageQuerySearch(query: string): boolean {
  const normalized = normalizeText(query);
  return BEVERAGE_TERMS_SEARCH.some(b => normalized.includes(b));
}

function isSolidFoodResultSearch(foodName: string): boolean {
  const normalized = normalizeText(foodName);
  return SOLID_FOOD_TERMS_SEARCH.some(s => normalized.includes(s));
}

function filterCategoryMismatch(results: any[], query: string): any[] {
  const isBeverage = isBeverageQuerySearch(query);
  if (!isBeverage) return results; // Sem filtro se não for bebida
  
  return results.filter(food => !isSolidFoodResultSearch(food.name || ''));
}

// Calculate similarity between two strings (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  
  // Simple Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[s1.length][s2.length];
  return 1 - distance / maxLen;
}

// Call Google Gemini AI directly for ingredient data
async function getIngredientFromAI(
  ingredientName: string, 
  context?: string
): Promise<any> {
  const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
  
  if (!GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY not configured');
  }

  const prompt = `Você é um banco de dados nutricional preciso. Retorne APENAS JSON válido, sem markdown.

Ingrediente buscado: "${ingredientName}"
${context ? `Contexto culinário: "${context}"` : ''}

REGRA CRÍTICA: Você deve retornar APENAS INGREDIENTES PUROS, nunca receitas prontas.

Exemplos de INGREDIENTES PUROS (permitidos):
- Leite, Farinha de trigo, Ovo, Açúcar, Manteiga, Frango, Arroz, Feijão, Tomate, Cebola

Exemplos de RECEITAS PRONTAS (NÃO PERMITIDOS):
- Pudim, Bolo, Pizza, Lasanha, Strogonoff, Brigadeiro, Coxinha, Feijoada, Moqueca, Risoto, Torta

Se o usuário buscar algo que é uma receita pronta (como "pudim", "bolo", "pizza"), você DEVE:
1. Retornar o ingrediente principal relacionado
2. Exemplo: "pudim" → retornar "Leite condensado" ou "Leite"
3. Exemplo: "bolo" → retornar "Farinha de trigo"
4. Exemplo: "pizza" → retornar "Massa de pizza" ou "Farinha de trigo"

Retorne exatamente neste formato JSON:
{
  "name": "nome do INGREDIENTE em português",
  "name_en": "nome em inglês",
  "aliases": ["sinônimo1", "sinônimo2"],
  "cuisine_origin": "origem culinária (brazilian, japanese, italian, etc)",
  "is_recipe": false,
  "per_100g": {
    "calories": número,
    "protein": número,
    "carbs": número,
    "fat": número,
    "fiber": número ou null
  },
  "confidence": 0.85,
  "notes": "observações se houver ou null"
}

IMPORTANTE: 
- Valores nutricionais devem ser por 100g do alimento
- Use valores realistas baseados em tabelas nutricionais conhecidas (TACO, USDA)
- Se não tiver certeza, use confidence menor que 0.7
- NUNCA retorne receitas prontas como pudim, bolo, pizza, etc.`;

  logStep('Calling Google Gemini AI directly', { ingredientName, context });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logStep('Google AI Error', { status: response.status, error: errorText });
    throw new Error(`Google AI request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('No content in AI response');
  }

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0];
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0];
  }

  const parsed = JSON.parse(jsonStr.trim());
  logStep('AI Response parsed', { name: parsed.name, calories: parsed.per_100g?.calories });
  
  return parsed;
}

// Save ingredient to database
async function saveIngredientToDatabase(
  supabase: any, 
  aiData: any
): Promise<any> {
  // Validate aiData.name before proceeding
  if (!aiData?.name || typeof aiData.name !== 'string') {
    logStep('Invalid AI data - missing name', { aiData });
    return null;
  }

  const normalizedName = normalizeText(aiData.name);
  
  // Validate data before saving
  if (!aiData.per_100g?.calories || aiData.per_100g.calories > 900) {
    logStep('Invalid calorie data, skipping save', { calories: aiData.per_100g?.calories });
    return null;
  }

  const insertData = {
    name: aiData.name,
    name_normalized: normalizedName,
    calories_per_100g: aiData.per_100g.calories,
    protein_per_100g: aiData.per_100g.protein || 0,
    carbs_per_100g: aiData.per_100g.carbs || 0,
    fat_per_100g: aiData.per_100g.fat || 0,
    fiber_per_100g: aiData.per_100g.fiber || null,
    aliases: aiData.aliases || [],
    cuisine_origin: aiData.cuisine_origin || null,
    source: 'ai_generated',
    confidence: aiData.confidence || 0.85,
    verified: false,
    search_count: 1,
    is_recipe: aiData.is_recipe === true, // Mark as recipe if AI detects it
  };

  const { data, error } = await supabase
    .from('foods')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    logStep('Error saving to database', { error: error.message });
    // If duplicate, try to find existing
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('foods')
        .select('*')
        .ilike('name_normalized', normalizedName)
        .limit(1)
        .maybeSingle();
      return existing;
    }
    return null;
  }

  logStep('Saved new ingredient', { id: data.id, name: data.name });
  return data;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, context, limit = 5, userCountry = 'DEFAULT' } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Search started', { query, context, limit, userCountry });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const normalizedQuery = normalizeText(query);
    
    // 1. Search in database - exact match (exclude recipes AND filter by allowed categories)
    let { data: exactMatches } = await supabase
      .from('foods')
      .select('*')
      .eq('is_recipe', false)
      .in('category', ALLOWED_INGREDIENT_CATEGORIES)
      .or(`name_normalized.ilike.%${normalizedQuery}%,aliases.cs.{${query}}`)
      .limit(limit);
    
    // If no results with category filter, try without category (for items without category set)
    if (!exactMatches || exactMatches.length === 0) {
      const { data: noCategory } = await supabase
        .from('foods')
        .select('*')
        .eq('is_recipe', false)
        .is('category', null)
        .or(`name_normalized.ilike.%${normalizedQuery}%,aliases.cs.{${query}}`)
        .limit(limit);
      
      if (noCategory && noCategory.length > 0) {
        exactMatches = noCategory;
        logStep('Found items without category', { count: noCategory.length });
      }
    }

    if (exactMatches && exactMatches.length > 0) {
      logStep('Found in database', { count: exactMatches.length, source: 'database' });
      
      // PROTEÇÃO ANTI-FALSO MATCH
      exactMatches = filterCategoryMismatch(exactMatches, query);
      
      if (exactMatches.length === 0) {
        logStep('All matches filtered due to category mismatch');
      } else {
        // Increment search count for the first result
        await supabase
          .from('foods')
          .update({ search_count: (exactMatches[0].search_count || 0) + 1 })
          .eq('id', exactMatches[0].id);

        // Sort by country priority first, then by similarity
        let sortedMatches = sortByCountryPriority(exactMatches, userCountry);
        sortedMatches.sort((a, b) => {
          const simA = calculateSimilarity(query, a.name);
          const simB = calculateSimilarity(query, b.name);
          return simB - simA;
        });

      return new Response(
        JSON.stringify({
          source: 'database',
          results: sortedMatches.map(food => ({
            id: food.id,
            name: food.name,
            calories_per_100g: food.calories_per_100g,
            protein_per_100g: food.protein_per_100g,
            carbs_per_100g: food.carbs_per_100g,
            fat_per_100g: food.fat_per_100g,
            fiber_per_100g: food.fiber_per_100g,
            cuisine_origin: food.cuisine_origin,
            source: food.source,
            confidence: food.confidence || 1,
            verified: food.verified,
          })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      }
    }

    // 2. Search in aliases table (filter by allowed categories)
    const { data: aliasMatches } = await supabase
      .from('ingredient_aliases')
      .select('food_id, alias, foods(*)')
      .ilike('alias', `%${normalizedQuery}%`)
      .limit(limit * 2); // Get more to filter

    if (aliasMatches && aliasMatches.length > 0) {
      // Filter foods by allowed categories
      const foods = aliasMatches
        .filter(a => a.foods && (
          ALLOWED_INGREDIENT_CATEGORIES.includes((a.foods as any).category) || 
          (a.foods as any).category === null
        ))
        .map(a => a.foods)
        .slice(0, limit);

      if (foods.length > 0) {
        logStep('Found via aliases', { count: foods.length, source: 'aliases' });
        
        return new Response(
          JSON.stringify({
            source: 'aliases',
            results: foods.map((food: any) => ({
              id: food.id,
              name: food.name,
              calories_per_100g: food.calories_per_100g,
              protein_per_100g: food.protein_per_100g,
              carbs_per_100g: food.carbs_per_100g,
              fat_per_100g: food.fat_per_100g,
              fiber_per_100g: food.fiber_per_100g,
              cuisine_origin: food.cuisine_origin,
              confidence: food.confidence || 1,
              verified: food.verified,
            })),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Fallback to AI
    logStep('Not found in database, calling AI', { query });
    
    const aiData = await getIngredientFromAI(query, context);
    
    // Save to database for future use
    const savedFood = await saveIngredientToDatabase(supabase, aiData);
    
    // Recalcular calorias usando tabela compartilhada
    const recalculated = recalculatePer100g(aiData.name, aiData.per_100g.calories);
    logStep('Calories recalculated', { 
      original: aiData.per_100g.calories, 
      final: recalculated.calories_per_100g,
      source: recalculated.calorie_source 
    });

    const result = {
      id: savedFood?.id || null,
      name: aiData.name,
      name_en: aiData.name_en,
      calories_per_100g: recalculated.calories_per_100g,
      protein_per_100g: aiData.per_100g.protein,
      carbs_per_100g: aiData.per_100g.carbs,
      fat_per_100g: aiData.per_100g.fat,
      fiber_per_100g: aiData.per_100g.fiber,
      cuisine_origin: aiData.cuisine_origin,
      confidence: aiData.confidence,
      verified: false,
      notes: aiData.notes,
      calorie_source: recalculated.calorie_source,
    };

    logStep('Returning AI result', { name: result.name, saved: !!savedFood });

    return new Response(
      JSON.stringify({
        source: 'ai',
        results: [result],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep('Error', { message: errorMessage, stack: errorStack });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
