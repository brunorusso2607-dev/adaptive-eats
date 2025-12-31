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
  // Combinações com "com" ou "c/" indicam pratos prontos
  ' com ', ' c/ ', ' c/', ' s/ ', ' s/',
  // Preparo
  'à grega', 'a grega', 'cozido', 'cozida', 'frito', 'frita', 
  'grelhado', 'grelhada', 'assado', 'assada', 'refogado', 'refogada', 
  'temperado', 'temperada', 'ao molho', 'gratinado', 'gratinada', 
  'empanado', 'empanada', 'à milanesa', 'a milanesa', 
  'à parmegiana', 'a parmegiana', 'à dorê', 'a dore', 
  'à romana', 'a romana', 'à bolonhesa', 'a bolonhesa',
  'recheado', 'recheada', 'preparado', 'preparada', 'pronto', 'pronta',
  'caseiro', 'caseira', 'tradicional',
  // Pratos típicos
  'chop suey', 'chopsuey', 'risoto', 'risotto', 'paella', 'feijoada',
  'strogonoff', 'stroganoff', 'yakisoba', 'yakissoba', 'carbonara',
  'lasanha', 'lasagna', 'macarronada', 'espaguete à', 'espaguete a',
  'moqueca', 'bobó', 'vatapá', 'acarajé', 'escondidinho',
  'virado', 'tutu', 'tropeiro', 'baião', 'galinhada', 'canjica',
  'cuscuz paulista', 'cuscuz nordestino', 'torta de',
  // English patterns
  'cooked', 'fried', 'grilled', 'baked', 'roasted', 'sauteed', 'seasoned',
  'with sauce', 'with gravy', 'stuffed', 'prepared', 'homemade',
  'casserole', 'stew', 'soup', 'curry', 'stir-fry',
];

// Ingredients that should NEVER be filtered out even if they match patterns
// These are BASE ingredients that can have variations
const SAFE_BASE_INGREDIENTS = [
  'arroz', 'feijao', 'macarrao', 'espaguete', 'penne', 'fusilli', 'farfalle',
  'carne', 'frango', 'peixe', 'ovo', 'leite', 'queijo', 'batata', 'mandioca',
  'milho', 'trigo', 'aveia', 'quinoa', 'lentilha', 'grao de bico',
  'banana', 'maca', 'laranja', 'limao', 'tomate', 'cebola', 'alho',
  'cenoura', 'brocolis', 'couve', 'alface', 'repolho', 'pepino',
  'abobrinha', 'berinjela', 'pimentao', 'abobora', 'chuchu',
  'cafe', 'cha', 'suco', 'agua', 'iogurte', 'cream cheese', 'ricota',
  'peito de frango', 'file de frango', 'coxa de frango', 'sobrecoxa',
  'carne moida', 'patinho', 'acem', 'alcatra', 'maminha', 'picanha',
  'salmao', 'tilapia', 'atum', 'sardinha', 'bacalhau', 'camarao',
];

const ALLOWED_PREPARED_CATEGORIES = ['fast-food', 'fast food', 'lanche', 'sanduíche', 'graos', 'cereais'];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isPreparedDish(food: any): boolean {
  const name = food.name || '';
  const nameLower = name.toLowerCase();
  const nameNormalized = normalizeText(name);
  const categoryLower = (food.category || '').toLowerCase();
  
  // Allow fast-food category and base ingredient categories
  if (ALLOWED_PREPARED_CATEGORIES.some(cat => categoryLower.includes(cat))) {
    return false;
  }
  
  // Check if name STARTS WITH a safe base ingredient - allow these through
  for (const safe of SAFE_BASE_INGREDIENTS) {
    const safeNormalized = normalizeText(safe);
    if (nameNormalized.startsWith(safeNormalized)) {
      // This is a variation of a base ingredient, allow it
      return false;
    }
  }
  
  // Check for prepared dish patterns
  for (const pattern of PREPARED_DISH_PATTERNS) {
    if (nameLower.includes(pattern)) {
      return true;
    }
  }
  
  // Check for "ingredient + ingredient" combinations (e.g., "Arroz com Feijão")
  // This pattern: "Food com Food" or "Food, c/ Food" indicates a prepared dish
  const comboPatterns = [
    /\w+\s+com\s+\w+/i,    // "X com Y"
    /\w+,?\s*c\/\s*\w+/i,  // "X, c/ Y" or "X c/ Y"
  ];
  
  for (const regex of comboPatterns) {
    if (regex.test(nameLower)) {
      return true;
    }
  }
  
  return false;
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
    const { query, limit = 25, country = 'BR' } = await req.json();

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

    // STEP 1: Search "starts with" in preferred sources ONLY
    const { data: startsWithPriority } = await supabase
      .from('foods')
      .select('*')
      .eq('is_verified', true)
      .eq('is_recipe', false)
      .in('source', preferredSources)
      .or(`name_normalized.ilike.${normalizedQuery}%,name.ilike.${query}%`)
      .order('name')
      .limit(limit * 2);

    if (startsWithPriority && startsWithPriority.length > 0) {
      const filtered = startsWithPriority.filter(f => !isPreparedDish(f));
      allFoods = [...allFoods, ...filtered];
      logStep('Found starts-with in country sources', { count: filtered.length, sources: preferredSources });
    }

    // STEP 2: If still not enough, try "contains" search in preferred sources ONLY
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
        logStep('Found contains in country sources', { added: newFoods.length });
      }
    }

    // STEP 3: Search in ingredient aliases (filtered by country sources)
    if (allFoods.length < limit) {
      const { data: aliasResults } = await supabase
        .from('ingredient_aliases')
        .select('food_id, alias, foods!inner(*)')
        .or(`alias.ilike.${normalizedQuery}%,alias.ilike.%${normalizedQuery}%`)
        .limit(limit * 2);

      if (aliasResults && aliasResults.length > 0) {
        const existingIds = new Set(allFoods.map(f => f.id));
        const aliasFoods = aliasResults
          .map((a: any) => a.foods)
          .filter((f: any) => f && f.is_verified && !existingIds.has(f.id))
          .filter((f: any) => preferredSources.includes(f.source)) // Filter by country sources
          .filter((f: any) => !isPreparedDish(f));
        
        allFoods = [...allFoods, ...aliasFoods];
        logStep('Found via alias (filtered by country)', { added: aliasFoods.length });
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
