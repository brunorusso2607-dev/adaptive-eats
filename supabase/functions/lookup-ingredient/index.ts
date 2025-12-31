import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const USDA_API_KEY = Deno.env.get('USDA_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Country to preferred data sources mapping
const COUNTRY_SOURCE_PRIORITY: Record<string, string[]> = {
  'BR': ['TBCA', 'taco', 'curated'],
  'PT': ['TBCA', 'taco', 'curated'],
  'US': ['usda', 'curated'],
  'GB': ['McCance', 'curated'],
  'UK': ['McCance', 'curated'],
  'FR': ['CIQUAL', 'curated'],
  'MX': ['BAM', 'curated'],
  'ES': ['AESAN Spain', 'curated'],
  'DE': ['BLS Germany', 'curated'],
  'IT': ['CREA', 'curated'],
};

// Patterns that indicate a prepared dish (not a raw ingredient)
const PREPARED_DISH_PATTERNS = [
  'à grega', 'a grega', 'c/ sal', 's/ sal', 'c/sal', 's/sal',
  'cozido', 'cozida', 'frito', 'frita', 'grelhado', 'grelhada',
  'assado', 'assada', 'refogado', 'refogada', 'temperado', 'temperada',
  'com molho', 'ao molho', 'gratinado', 'gratinada', 'empanado', 'empanada',
  'à milanesa', 'a milanesa', 'à parmegiana', 'a parmegiana',
  'à dorê', 'a dore', 'à romana', 'a romana', 'à bolonhesa', 'a bolonhesa',
  'ao alho', 'com alho', 'com cebola', 'com legumes', 'com verduras',
  'recheado', 'recheada', 'preparado', 'preparada', 'pronto', 'pronta',
  'caseiro', 'caseira', 'tradicional', 'típico', 'típica',
  'cooked', 'fried', 'grilled', 'baked', 'roasted', 'sauteed', 'seasoned',
  'with sauce', 'with gravy', 'stuffed', 'prepared', 'homemade',
];

const ALLOWED_PREPARED_CATEGORIES = ['fast-food', 'fast food', 'lanche', 'sanduíche'];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isPreparedDish(food: any): boolean {
  const nameLower = (food.name || '').toLowerCase();
  const categoryLower = (food.category || '').toLowerCase();
  
  if (ALLOWED_PREPARED_CATEGORIES.some(cat => categoryLower.includes(cat))) {
    return false;
  }
  
  return PREPARED_DISH_PATTERNS.some(pattern => nameLower.includes(pattern));
}

function logStep(step: string, data?: any) {
  console.log(`[lookup-ingredient] ${step}`, data ? JSON.stringify(data) : '');
}

interface AIFoodSuggestion {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
}

// Generate food suggestions using AI when database has no results
async function generateAIFoodSuggestions(query: string, country: string): Promise<AIFoodSuggestion[]> {
  if (!LOVABLE_API_KEY) {
    logStep('LOVABLE_API_KEY not configured, skipping AI suggestions');
    return [];
  }

  try {
    logStep('Generating AI food suggestions', { query, country });
    
    const languageMap: Record<string, string> = {
      'BR': 'português brasileiro',
      'PT': 'português',
      'US': 'English',
      'GB': 'English',
      'MX': 'español mexicano',
      'ES': 'español',
      'FR': 'français',
      'DE': 'Deutsch',
      'IT': 'italiano',
    };
    
    const language = languageMap[country] || 'português brasileiro';
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `Você é um nutricionista especializado em alimentos. Gere variações de ingredientes crus baseados na busca do usuário.
            
REGRAS:
- Retorne APENAS ingredientes CRUS (não pratos prontos)
- Use o idioma: ${language}
- Gere de 5 a 8 variações do alimento buscado
- Inclua valores nutricionais REALISTAS por 100g
- Formato JSON obrigatório`
          },
          {
            role: 'user',
            content: `Gere variações do ingrediente "${query}" em ${language}.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_foods',
              description: 'Retorna sugestões de alimentos com valores nutricionais',
              parameters: {
                type: 'object',
                properties: {
                  foods: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Nome do alimento' },
                        calories_per_100g: { type: 'number' },
                        protein_per_100g: { type: 'number' },
                        carbs_per_100g: { type: 'number' },
                        fat_per_100g: { type: 'number' },
                        fiber_per_100g: { type: 'number' }
                      },
                      required: ['name', 'calories_per_100g', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g', 'fiber_per_100g']
                    }
                  }
                },
                required: ['foods']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_foods' } }
      })
    });

    if (!response.ok) {
      logStep('AI API error', { status: response.status });
      return [];
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      logStep('AI suggestions generated', { count: parsed.foods?.length || 0 });
      return parsed.foods || [];
    }
    
    return [];
  } catch (error: any) {
    logStep('AI suggestion error', { error: error?.message || String(error) });
    return [];
  }
}

// Save AI-generated foods to database
async function saveAIFoodsToDatabase(supabase: any, foods: AIFoodSuggestion[], country: string): Promise<any[]> {
  const savedFoods: any[] = [];
  
  for (const food of foods) {
    const nameNormalized = normalizeText(food.name);
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('foods')
      .select('*')
      .eq('name_normalized', nameNormalized)
      .maybeSingle();
    
    if (existing) {
      savedFoods.push(existing);
      continue;
    }
    
    const insertData = {
      name: food.name,
      name_normalized: nameNormalized,
      calories_per_100g: food.calories_per_100g,
      protein_per_100g: food.protein_per_100g,
      carbs_per_100g: food.carbs_per_100g,
      fat_per_100g: food.fat_per_100g,
      fiber_per_100g: food.fiber_per_100g,
      sodium_per_100g: 0,
      source: 'ai-generated',
      is_verified: false,
      is_recipe: false,
      category: 'ingrediente',
    };

    const { data, error } = await supabase
      .from('foods')
      .insert(insertData)
      .select()
      .single();

    if (!error && data) {
      savedFoods.push(data);
    }
  }
  
  logStep('Saved AI foods to database', { count: savedFoods.length });
  return savedFoods;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 10, country = 'BR' } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query deve ter pelo menos 2 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const normalizedQuery = normalizeText(query);
    const upperCountry = country.toUpperCase();
    
    const preferredSources = COUNTRY_SOURCE_PRIORITY[upperCountry] || COUNTRY_SOURCE_PRIORITY['BR'];
    
    logStep('Starting lookup', { query, normalizedQuery, country: upperCountry, preferredSources });

    let allFoods: any[] = [];

    // STEP 1: Search "starts with" in preferred sources
    const { data: startsWithPriority } = await supabase
      .from('foods')
      .select('*')
      .eq('is_verified', true)
      .eq('is_recipe', false)
      .in('source', preferredSources)
      .or(`name_normalized.ilike.${normalizedQuery}%,name.ilike.${query}%`)
      .order('name')
      .limit(limit);

    if (startsWithPriority && startsWithPriority.length > 0) {
      const filtered = startsWithPriority.filter(f => !isPreparedDish(f));
      allFoods = [...allFoods, ...filtered];
      logStep('Found starts-with in priority sources', { count: filtered.length });
    }

    // STEP 2: If not enough, search "starts with" in ALL sources (no source filter)
    if (allFoods.length < limit) {
      const { data: startsWithAll } = await supabase
        .from('foods')
        .select('*')
        .eq('is_verified', true)
        .eq('is_recipe', false)
        .or(`name_normalized.ilike.${normalizedQuery}%,name.ilike.${query}%`)
        .order('name')
        .limit(limit * 2);

      if (startsWithAll && startsWithAll.length > 0) {
        const existingIds = new Set(allFoods.map(f => f.id));
        const newFoods = startsWithAll
          .filter(f => !existingIds.has(f.id))
          .filter(f => !isPreparedDish(f));
        allFoods = [...allFoods, ...newFoods];
        logStep('Found starts-with in all sources', { added: newFoods.length });
      }
    }

    // STEP 3: If still not enough, try "contains" search in preferred sources
    if (allFoods.length < limit) {
      const { data: containsPriority } = await supabase
        .from('foods')
        .select('*')
        .eq('is_verified', true)
        .eq('is_recipe', false)
        .in('source', preferredSources)
        .or(`name_normalized.ilike.%${normalizedQuery}%,name.ilike.%${query}%`)
        .order('name')
        .limit(limit * 2);

      if (containsPriority && containsPriority.length > 0) {
        const existingIds = new Set(allFoods.map(f => f.id));
        const newFoods = containsPriority
          .filter(f => !existingIds.has(f.id))
          .filter(f => !isPreparedDish(f));
        allFoods = [...allFoods, ...newFoods];
        logStep('Found contains in priority sources', { added: newFoods.length });
      }
    }

    // STEP 4: If still not enough, try "contains" in ALL sources
    if (allFoods.length < limit) {
      const { data: containsAll } = await supabase
        .from('foods')
        .select('*')
        .eq('is_verified', true)
        .eq('is_recipe', false)
        .or(`name_normalized.ilike.%${normalizedQuery}%,name.ilike.%${query}%`)
        .order('name')
        .limit(limit * 2);

      if (containsAll && containsAll.length > 0) {
        const existingIds = new Set(allFoods.map(f => f.id));
        const newFoods = containsAll
          .filter(f => !existingIds.has(f.id))
          .filter(f => !isPreparedDish(f));
        allFoods = [...allFoods, ...newFoods];
        logStep('Found contains in all sources', { added: newFoods.length });
      }
    }

    // STEP 5: Search in ingredient aliases
    if (allFoods.length < limit) {
      const { data: aliasResults } = await supabase
        .from('ingredient_aliases')
        .select('food_id, alias, foods!inner(*)')
        .or(`alias.ilike.${normalizedQuery}%,alias.ilike.%${normalizedQuery}%`)
        .limit(limit);

      if (aliasResults && aliasResults.length > 0) {
        const existingIds = new Set(allFoods.map(f => f.id));
        const aliasFoods = aliasResults
          .map((a: any) => a.foods)
          .filter((f: any) => f && f.is_verified && !existingIds.has(f.id))
          .filter((f: any) => !isPreparedDish(f));
        
        allFoods = [...allFoods, ...aliasFoods];
        logStep('Found via alias', { added: aliasFoods.length });
      }
    }

    // Return results if we have any
    if (allFoods.length > 0) {
      const finalResults = allFoods.slice(0, limit);
      logStep('Returning database results', { count: finalResults.length });
      return new Response(
        JSON.stringify({ 
          results: finalResults, 
          source: 'local',
          count: finalResults.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 6: No database results - use AI to generate suggestions
    logStep('No database results, trying AI suggestions');
    const aiSuggestions = await generateAIFoodSuggestions(query, upperCountry);
    
    if (aiSuggestions.length > 0) {
      const savedFoods = await saveAIFoodsToDatabase(supabase, aiSuggestions, upperCountry);
      
      if (savedFoods.length > 0) {
        logStep('Returning AI-generated results', { count: savedFoods.length });
        return new Response(
          JSON.stringify({ 
            results: savedFoods.slice(0, limit), 
            source: 'ai',
            count: Math.min(savedFoods.length, limit)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // No results found
    logStep('No results found for country', { country: upperCountry });
    return new Response(
      JSON.stringify({ 
        results: [], 
        source: 'none',
        count: 0,
        message: 'Nenhum ingrediente encontrado' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logStep('Unhandled error', { error: error?.message || String(error) });
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
