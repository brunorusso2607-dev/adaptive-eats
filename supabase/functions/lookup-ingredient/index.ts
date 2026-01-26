import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { shouldShowSpecialFood } from "../_shared/filterSpecialDietFoods.ts";

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

const ALLOWED_PREPARED_CATEGORIES = ['fast-food', 'fast food', 'lanche', 'sanduíche'];

// Country to language mapping
const COUNTRY_LANGUAGE: Record<string, string> = {
  'BR': 'pt', 'PT': 'pt',
  'US': 'en', 'GB': 'en', 'UK': 'en', 'AU': 'en', 'CA': 'en',
  'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'CL': 'es', 'PE': 'es',
  'FR': 'fr',
  'IT': 'it',
  'DE': 'de',
};

// Language-specific terms that indicate a food is in that language
const LANGUAGE_INDICATORS: Record<string, string[]> = {
  'en': [
    // Cooking methods
    'cooked', 'raw', 'steamed', 'boiled', 'baked', 'fried', 'grilled', 'roasted',
    'sauteed', 'stir-fried', 'stewed', 'braised', 'poached', 'dried', 'canned',
    // Descriptors
    'long-grain', 'short-grain', 'medium-grain', 'enriched', 'unenriched', 'parboiled',
    'regular', 'instant', 'precooked', 'frozen', 'fresh', 'whole', 'ground',
    'sliced', 'diced', 'chopped', 'boneless', 'skinless', 'with skin', 'without',
    // Foods
    'rice,', 'chicken,', 'beef,', 'pork,', 'beans,', 'bread,', 'cheese,', 'milk,',
    'egg,', 'pasta,', 'noodle', 'flour,', 'meat', 'fish', 'poultry', 'vegetable',
  ],
  'pt': [
    'cozido', 'cru', 'assado', 'frito', 'grelhado', 'refogado', 'integral',
    'polido', 'parboilizado', 'branco', 'preto', 'carioca', 'vermelho',
    'moído', 'picado', 'fatiado', 'congelado', 'fresco', 'seco',
    'arroz,', 'feijão,', 'carne,', 'frango,', 'peixe,', 'ovo,', 'leite,',
  ],
  'es': [
    'cocido', 'crudo', 'asado', 'frito', 'a la plancha', 'hervido', 'integral',
    'blanco', 'negro', 'rojo', 'molido', 'picado', 'rebanado', 'congelado',
    'fresco', 'seco', 'arroz,', 'frijol', 'carne,', 'pollo,', 'pescado,',
    'huevo,', 'leche,', 'queso,', 'pan,',
  ],
  'fr': [
    'cuit', 'cru', 'rôti', 'frit', 'grillé', 'bouilli', 'complet', 'blanc',
    'noir', 'rouge', 'haché', 'tranché', 'congelé', 'frais', 'sec',
    'riz,', 'viande,', 'poulet,', 'poisson,', 'oeuf,', 'lait,', 'fromage,', 'pain,',
  ],
  'it': [
    'cotto', 'crudo', 'arrosto', 'fritto', 'alla griglia', 'bollito', 'integrale',
    'bianco', 'nero', 'rosso', 'macinato', 'affettato', 'congelato', 'fresco', 'secco',
    'riso,', 'carne,', 'pollo,', 'pesce,', 'uovo,', 'latte,', 'formaggio,', 'pane,',
  ],
  'de': [
    'gekocht', 'roh', 'gebraten', 'frittiert', 'gegrillt', 'gedünstet', 'vollkorn',
    'weiß', 'schwarz', 'rot', 'gemahlen', 'geschnitten', 'gefroren', 'frisch', 'trocken',
    'reis,', 'fleisch,', 'hähnchen,', 'fisch,', 'ei,', 'milch,', 'käse,', 'brot,',
  ],
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// ============= PROTEÇÃO ANTI-FALSO MATCH =============
// Palavras genéricas que causam falsos positivos
const GENERIC_MATCH_WORDS = new Set([
  'doce', 'erva', 'verde', 'natural', 'integral', 'light', 'zero',
  'com', 'sem', 'de', 'em', 'ao', 'a', 'e', 'ou', 'para',
]);

// Categorias de alimentos para validação cruzada
const BEVERAGE_SEARCH_TERMS = ['cha', 'cafe', 'suco', 'agua', 'leite', 'vitamina', 'smoothie', 'infusao', 'refrigerante'];
const SOLID_FOOD_SEARCH_TERMS = ['batata', 'arroz', 'feijao', 'carne', 'frango', 'peixe', 'ovo', 'pao', 'bolo', 'queijo', 'macarrao'];

function isBeverageQuery(query: string): boolean {
  const normalized = normalizeText(query);
  return BEVERAGE_SEARCH_TERMS.some(b => normalized.includes(b));
}

function isSolidFoodResult(foodName: string): boolean {
  const normalized = normalizeText(foodName);
  return SOLID_FOOD_SEARCH_TERMS.some(s => normalized.includes(s));
}

/**
 * Verifica se o resultado é compatível com a busca em termos de categoria
 * Previne falsos matches como "chá de camomila" → "Batata Doce"
 */
function isCategoryMismatch(query: string, foodName: string): boolean {
  // Se busca é bebida e resultado é sólido, é falso match
  if (isBeverageQuery(query) && isSolidFoodResult(foodName)) {
    return true;
  }
  return false;
}

// Detect the language of a food name
function detectFoodLanguage(name: string): string | null {
  const nameLower = name.toLowerCase();
  
  // Check each language for indicators
  for (const [lang, indicators] of Object.entries(LANGUAGE_INDICATORS)) {
    for (const term of indicators) {
      if (nameLower.includes(term)) {
        return lang;
      }
    }
  }
  
  // Check for typical English naming pattern: "Food, descriptor, descriptor"
  if (/^[a-z]+,\s+[a-z]+/i.test(name)) {
    return 'en';
  }
  
  return null; // Unable to detect
}

// Check if a food is in the wrong language for the user's country
function isWrongLanguage(name: string, userCountry: string): boolean {
  const expectedLang = COUNTRY_LANGUAGE[userCountry];
  if (!expectedLang) return false; // Unknown country, don't filter
  
  const detectedLang = detectFoodLanguage(name);
  if (!detectedLang) return false; // Can't detect, don't filter
  
  // If detected language differs from expected, filter it out
  return detectedLang !== expectedLang;
}

function isPreparedDish(food: any, userQuery?: string): boolean {
  const name = food.name || '';
  const nameLower = name.toLowerCase();
  const nameNormalized = normalizeText(name);
  const categoryLower = (food.category || '').toLowerCase();
  
  // CRITICAL: If user is searching EXACTLY for this dish, don't filter it out
  // e.g., if user types "feijoada" and food is "Feijoada", allow it
  if (userQuery) {
    const queryNormalized = normalizeText(userQuery);
    // Exact match only - user wants this specific dish
    // Do NOT use startsWith as it allows "Arroz com Feijão" when searching "arroz"
    if (nameNormalized === queryNormalized) {
      return false;
    }
  }
  
  // CRITICAL: Check for combination patterns FIRST - these are ALWAYS prepared dishes
  // Must check BEFORE any category exceptions
  
  // Pattern 1: "X com Y" - ingredient combinations (arroz com feijão, arroz com brócolis)
  if (/\s+com\s+/i.test(nameLower)) {
    return true;
  }
  
  // Pattern 2: ", c/" or " c/" - abbreviated combinations  
  if (/,?\s*c\/\s*/i.test(nameLower)) {
    return true;
  }
  
  // Pattern 3: Prepared dish names (grega, carreteiro, caipira, etc.)
  const preparedDishNames = [
    'grega', 'carreteiro', 'caipira', 'chop suey', 'chopsuey', 'cabidela',
    'tropeiro', 'baiao', 'galinhada', 'risoto', 'risotto', 'paella',
    'feijoada', 'strogonoff', 'stroganoff', 'yakisoba', 'yakissoba',
    'carbonara', 'lasanha', 'lasagna', 'macarronada', 'moqueca',
    'bobo', 'vatapa', 'acaraje', 'escondidinho', 'virado', 'tutu',
    'canjica', 'cuscuz paulista', 'cuscuz nordestino', 'torta de',
    'casserole', 'stew', 'curry', 'stir-fry', 'chili con',
    'doce', 'de brocolis', 'de brócolis'
  ];
  
  for (const dish of preparedDishNames) {
    if (nameLower.includes(dish)) {
      return true;
    }
  }
  
  // NOW check for allowed categories (fast-food, etc.) - but only after ruling out combinations
  if (ALLOWED_PREPARED_CATEGORIES.some(cat => categoryLower.includes(cat))) {
    return false;
  }
  
  // Check if name STARTS WITH a safe base ingredient
  // Allow variations like "Arroz integral", "Arroz polido", "Feijão preto"
  for (const safe of SAFE_BASE_INGREDIENTS) {
    const safeNormalized = normalizeText(safe);
    if (nameNormalized.startsWith(safeNormalized)) {
      // This is a variation of a base ingredient, allow it
      return false;
    }
  }
  
  // Check for other prepared dish patterns (for non-base ingredients)
  const otherPreparedPatterns = [
    'recheado', 'recheada', 'preparado', 'preparada', 'pronto', 'pronta',
    'caseiro', 'caseira', 'tradicional', 'ao molho', 'gratinado', 'gratinada',
    'empanado', 'empanada', 'milanesa', 'parmegiana', 'dore', 'romana',
    'bolonhesa', 'homemade', 'with sauce', 'with gravy', 'stuffed'
  ];
  
  for (const pattern of otherPreparedPatterns) {
    if (nameLower.includes(pattern)) {
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
  const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
  
  if (!GOOGLE_AI_API_KEY) {
    logStep('GOOGLE_AI_API_KEY not configured, skipping AI suggestions');
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
    
    const prompt = `Você é um banco de dados nutricional. Gere TODAS as variações possíveis do alimento "${query}" em ${language}.

REGRAS CRÍTICAS:
1. TODOS os nomes DEVEM COMEÇAR EXATAMENTE com "${query}" (busca sequencial)
2. Gere de 5 a 10 variações diferentes
3. Inclua variações por: marca, sabor, tipo, preparo (cru, cozido, integral, light, etc.)
4. Valores nutricionais DEVEM ser REALISTAS baseados em tabelas TBCA/TACO
5. NÃO inclua pratos prontos ou combinações (ex: "arroz com feijão")

EXEMPLOS de variações esperadas:
- Se query = "iogurte": iogurte natural, iogurte integral, iogurte grego, iogurte desnatado, iogurte de morango...
- Se query = "iogurte grego": iogurte grego natural, iogurte grego morango, iogurte grego mel, iogurte grego zero...
- Se query = "biscoito": biscoito cream cracker, biscoito de arroz, biscoito integral, biscoito de água e sal...

Responda APENAS com JSON válido:
{
  "foods": [
    {
      "name": "Nome COMEÇANDO com ${query}",
      "calories_per_100g": número,
      "protein_per_100g": número,
      "carbs_per_100g": número,
      "fat_per_100g": número,
      "fiber_per_100g": número
    }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
        })
      }
    );

    if (!response.ok) {
      logStep('AI API error', { status: response.status });
      return [];
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse JSON from response
    let jsonStr = content;
    if (content.includes('```json')) {
      jsonStr = content.split('```json')[1].split('```')[0];
    } else if (content.includes('```')) {
      jsonStr = content.split('```')[1].split('```')[0];
    }
    
    const parsed = JSON.parse(jsonStr.trim());
    logStep('AI suggestions generated', { count: parsed.foods?.length || 0 });
    return parsed.foods || [];
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
    const { 
      query, 
      limit = 25, 
      country = 'BR',
      searchByCategory = false,
      searchFromPool = false,
      mealType = '',
      componentType = '',
      originalCalories = 0,
      calorieTolerancePercent = 30,
      userIntolerances = [],
      generateAiOnly = false // Flag to generate AI suggestions only (skip DB)
    } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query deve ter pelo menos 2 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const normalizedQuery = normalizeText(query);
    const upperCountry = country.toUpperCase();
    
    // ═══════════════════════════════════════════════════════════════════════
    // GENERATE AI ONLY MODE - Skip database, go directly to AI generation
    // Used when frontend needs to complement database results with AI
    // ═══════════════════════════════════════════════════════════════════════
    if (generateAiOnly) {
      logStep('Generate AI Only mode - skipping database', { query, country: upperCountry });
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
      
      // No AI results
      return new Response(
        JSON.stringify({ 
          results: [], 
          source: 'ai',
          count: 0,
          message: 'Nenhuma sugestão gerada pela IA' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // BUSCA NO POOL DE REFEIÇÕES (meal_combinations)
    // Retorna componentes prontos da mesma categoria e tipo de refeição
    // ═══════════════════════════════════════════════════════════════════════
    if (searchFromPool && mealType) {
      // Normalizar mealType (inglês → português)
      const mealTypeMap: Record<string, string> = {
        'breakfast': 'cafe_manha',
        'lunch': 'almoco',
        'dinner': 'jantar',
        'snack': 'lanche_tarde',
        'supper': 'ceia',
        // Já em português
        'cafe_manha': 'cafe_manha',
        'almoco': 'almoco',
        'jantar': 'jantar',
        'lanche_tarde': 'lanche_tarde',
        'ceia': 'ceia',
      };
      const normalizedMealType = mealTypeMap[mealType.toLowerCase()] || mealType;
      
      logStep('Searching from meal pool', { query, mealType: normalizedMealType, componentType, country });
      
      // Detectar tipo de componente baseado no nome do alimento
      let detectedType = componentType;
      if (!detectedType) {
        const queryLower = query.toLowerCase();
        // Proteínas
        if (queryLower.includes('ovo') || queryLower.includes('omelete') || queryLower.includes('frango') || 
            queryLower.includes('carne') || queryLower.includes('peixe') || queryLower.includes('bife') ||
            queryLower.includes('filé') || queryLower.includes('peito') || queryLower.includes('coxa') ||
            queryLower.includes('linguiça') || queryLower.includes('bacon') || queryLower.includes('presunto') ||
            queryLower.includes('queijo') || queryLower.includes('iogurte') || queryLower.includes('leite')) {
          detectedType = 'protein';
        }
        // Carboidratos
        else if (queryLower.includes('arroz') || queryLower.includes('pão') || queryLower.includes('tapioca') ||
                 queryLower.includes('batata') || queryLower.includes('macarrão') || queryLower.includes('massa') ||
                 queryLower.includes('aveia') || queryLower.includes('granola') || queryLower.includes('cereal') ||
                 queryLower.includes('torrada') || queryLower.includes('cuscuz')) {
          detectedType = 'carb';
        }
        // Frutas
        else if (queryLower.includes('banana') || queryLower.includes('maçã') || queryLower.includes('mamão') ||
                 queryLower.includes('laranja') || queryLower.includes('morango') || queryLower.includes('manga') ||
                 queryLower.includes('melão') || queryLower.includes('melancia') || queryLower.includes('abacaxi') ||
                 queryLower.includes('vitamina')) {
          detectedType = 'fruit';
        }
        // Bebidas
        else if (queryLower.includes('café') || queryLower.includes('chá') || queryLower.includes('suco')) {
          detectedType = 'beverage';
        }
        // Vegetais
        else if (queryLower.includes('salada') || queryLower.includes('alface') || queryLower.includes('tomate') ||
                 queryLower.includes('brócolis') || queryLower.includes('cenoura') || queryLower.includes('legume') ||
                 queryLower.includes('pepino') || queryLower.includes('abobrinha') || queryLower.includes('berinjela') ||
                 queryLower.includes('couve') || queryLower.includes('espinafre') || queryLower.includes('rúcula') ||
                 queryLower.includes('repolho') || queryLower.includes('chuchu') || queryLower.includes('vagem')) {
          detectedType = 'vegetable';
        }
      }
      
      logStep('Detected component type', { detectedType });
      
      // Buscar refeições do pool do mesmo meal_type
      const { data: poolMeals, error: poolError } = await supabase
        .from('meal_combinations')
        .select('id, name, components, total_calories, total_protein, total_carbs, total_fat')
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .eq('meal_type', normalizedMealType)
        .contains('country_codes', [upperCountry])
        .limit(50);
      
      if (poolError) {
        logStep('Pool query error', { error: poolError.message });
      }
      
      // Buscar REFEIÇÕES COMPLETAS do pool que contenham o mesmo tipo de componente
      const mealResults: any[] = [];
      const queryLower = query.toLowerCase();
      const seenMealNames = new Set<string>();
      
      for (const meal of (poolMeals || [])) {
        const components = meal.components || [];
        
        // Verificar se a refeição contém um componente do tipo detectado
        let hasMatchingType = false;
        let matchingComponent = null;
        
        for (const comp of components) {
          const compName = (comp.name || comp.item || '').toLowerCase();
          
          // Pular se for a mesma refeição que estamos substituindo
          if (compName.includes(queryLower) || queryLower.includes(compName.split(' ')[0])) {
            hasMatchingType = false;
            break;
          }
          
          // Se temos um tipo detectado, verificar se a refeição tem esse tipo
          if (detectedType) {
            if (comp.type === detectedType) {
              hasMatchingType = true;
              matchingComponent = comp;
            }
          } else {
            // Se não temos tipo detectado, aceitar qualquer refeição
            hasMatchingType = true;
            matchingComponent = comp;
          }
        }
        
        if (hasMatchingType && !seenMealNames.has(meal.name.toLowerCase())) {
          seenMealNames.add(meal.name.toLowerCase());
          
          // Usar macros totais da refeição
          mealResults.push({
            name: meal.name,
            grams: 0, // Refeição completa, não tem gramas específicas
            calories: meal.total_calories || 0,
            protein: meal.total_protein || 0,
            carbs: meal.total_carbs || 0,
            fat: meal.total_fat || 0,
            type: detectedType || 'meal',
            portion_label: 'Refeição completa',
            reason: `Substituto do pool de ${normalizedMealType === 'cafe_manha' ? 'café da manhã' : normalizedMealType === 'almoco' ? 'almoço' : normalizedMealType === 'jantar' ? 'jantar' : normalizedMealType}`,
            components: components // Incluir componentes para referência
          });
        }
      }
      
      // Filtrar alimentos especiais (sem glúten/sem lactose) baseado nas intolerâncias do usuário
      const filteredMeals = mealResults.filter(meal => {
        // Verificar nome da refeição
        if (!shouldShowSpecialFood(meal.name, userIntolerances)) {
          logStep('Filtered out special diet meal', { name: meal.name, userIntolerances });
          return false;
        }
        return true;
      });
      
      // Limitar resultados
      const poolResults = filteredMeals.slice(0, limit);
      
      logStep('Pool search results', { count: poolResults.length, filtered: mealResults.length - filteredMeals.length, mealType, detectedType });
      
      return new Response(
        JSON.stringify({ 
          results: poolResults, 
          source: 'pool',
          mealType,
          componentType: detectedType,
          count: poolResults.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Se searchByCategory = true, buscar por categoria ao invés de nome
    if (searchByCategory) {
      logStep('Searching by category', { query, originalCalories, calorieTolerancePercent });
      
      // Importar UNIVERSAL_INGREDIENTS
      const { UNIVERSAL_INGREDIENTS } = await import('../_shared/universal-ingredients-db.ts');
      
      // 1. Encontrar categoria do ingrediente original
      let originalCategory: string | null = null;
      const queryLower = query.toLowerCase();
      
      for (const [id, ingredient] of Object.entries(UNIVERSAL_INGREDIENTS)) {
        const ptName = ingredient.i18n?.['pt-BR']?.name?.toLowerCase() || '';
        const enName = ingredient.i18n?.['en-US']?.name?.toLowerCase() || '';
        
        if (ptName.includes(queryLower) || queryLower.includes(ptName) ||
            enName.includes(queryLower) || queryLower.includes(enName) ||
            id.toLowerCase().includes(queryLower)) {
          originalCategory = ingredient.category;
          logStep('Found original category', { ingredient: id, category: originalCategory });
          break;
        }
      }
      
      if (!originalCategory) {
        logStep('Category not found for query', { query });
        return new Response(
          JSON.stringify({ results: [], source: 'category', count: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // 2. Calcular range de calorias
      const minCalories = originalCalories * (1 - calorieTolerancePercent / 100);
      const maxCalories = originalCalories * (1 + calorieTolerancePercent / 100);
      
      // 3. Buscar ingredientes da mesma categoria
      const categoryResults: any[] = [];
      
      // Mapear país para locale
      const countryToLocale: Record<string, string> = {
        'BR': 'pt-BR',
        'PT': 'pt-BR',
        'US': 'en-US',
        'GB': 'en-US',
        'ES': 'es-ES',
        'MX': 'es-ES',
        'FR': 'fr-FR',
        'DE': 'de-DE',
        'IT': 'it-IT'
      };
      
      const userLocale = countryToLocale[upperCountry] || 'pt-BR';
      
      for (const [id, ingredient] of Object.entries(UNIVERSAL_INGREDIENTS)) {
        // Pular se não for da mesma categoria
        if (ingredient.category !== originalCategory) continue;
        
        // Buscar nome traduzido no idioma do usuário
        const translatedName = ingredient.i18n?.[userLocale]?.name || 
                              ingredient.i18n?.['pt-BR']?.name || 
                              ingredient.i18n?.['en-US']?.name || 
                              id;
        
        // Pular se for o próprio ingrediente
        if (translatedName.toLowerCase().includes(queryLower)) continue;
        
        const calories = ingredient.macros.kcal || ingredient.macros.calories || 0;
        
        // Verificar se calorias estão no range
        if (originalCalories > 0 && (calories < minCalories || calories > maxCalories)) {
          continue;
        }
        
        categoryResults.push({
          id,
          name: translatedName,
          name_normalized: normalizeText(translatedName),
          calories_per_100g: calories,
          protein_per_100g: ingredient.macros.prot || ingredient.macros.protein || 0,
          carbs_per_100g: ingredient.macros.carbs || 0,
          fat_per_100g: ingredient.macros.fat || 0,
          fiber_per_100g: ingredient.macros.fiber || 0,
          sodium_per_100g: 0,
          category: ingredient.category,
          source: 'UNIVERSAL_INGREDIENTS',
          is_verified: true,
          is_recipe: false,
          default_serving_size: ingredient.portion_default || 100,
          serving_unit: 'g'
        });
      }
      
      // 4. Ordenar por proximidade de calorias
      categoryResults.sort((a, b) => {
        const diffA = Math.abs(a.calories_per_100g - originalCalories);
        const diffB = Math.abs(b.calories_per_100g - originalCalories);
        return diffA - diffB;
      });
      
      const finalResults = categoryResults.slice(0, limit);
      
      logStep('Returning category results', { 
        category: originalCategory,
        count: finalResults.length,
        calorieRange: `${minCalories}-${maxCalories}`
      });
      
      return new Response(
        JSON.stringify({ 
          results: finalResults, 
          source: 'category',
          category: originalCategory,
          count: finalResults.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
      .limit(100); // Fetch more to allow for filtering

    if (startsWithPriority && startsWithPriority.length > 0) {
      const filtered = startsWithPriority
        .filter(f => !isPreparedDish(f, query))
        .filter(f => !isWrongLanguage(f.name || '', upperCountry))
        .filter(f => !isCategoryMismatch(query, f.name || '')); // PROTEÇÃO ANTI-FALSO MATCH
      allFoods = [...allFoods, ...filtered];
      logStep('Found starts-with in country sources', { count: filtered.length, sources: preferredSources });
    }

    // STEP 2: REMOVED - "contains" search causes false positives
    // Example: searching "ar" would match "Açúcar", "Amaranto" because they contain "ar"
    // We only want results that START WITH the query

    // STEP 3: Search in ingredient aliases (filtered by country sources) - STARTS WITH only
    if (allFoods.length < limit) {
      const { data: aliasResults } = await supabase
        .from('ingredient_aliases')
        .select('food_id, alias, foods!inner(*)')
        .ilike('alias', `${normalizedQuery}%`)
        .limit(limit * 2);

      if (aliasResults && aliasResults.length > 0) {
        const existingIds = new Set(allFoods.map(f => f.id));
        const aliasFoods = aliasResults
          .map((a: any) => a.foods)
          .filter((f: any) => f && f.is_verified && !existingIds.has(f.id))
          .filter((f: any) => preferredSources.includes(f.source))
          .filter((f: any) => !isPreparedDish(f, query))
          .filter((f: any) => !isWrongLanguage(f.name || '', upperCountry))
          .filter((f: any) => !isCategoryMismatch(query, f.name || '')); // PROTEÇÃO ANTI-FALSO MATCH
        
        allFoods = [...allFoods, ...aliasFoods];
        logStep('Found via alias (filtered by country)', { added: aliasFoods.length });
      }
    }

    // STEP 4: Search in UNIVERSAL_INGREDIENTS (fallback before AI)
    if (allFoods.length < limit) {
      const { UNIVERSAL_INGREDIENTS } = await import('../_shared/universal-ingredients-db.ts');
      
      const countryToLocale: Record<string, string> = {
        'BR': 'pt-BR', 'PT': 'pt-BR',
        'US': 'en-US', 'GB': 'en-US',
        'ES': 'es-ES', 'MX': 'es-ES',
        'FR': 'fr-FR', 'DE': 'de-DE', 'IT': 'it-IT'
      };
      const userLocale = countryToLocale[upperCountry] || 'pt-BR';
      
      const existingIds = new Set(allFoods.map(f => f.id));
      const universalResults: any[] = [];
      
      for (const [id, ingredient] of Object.entries(UNIVERSAL_INGREDIENTS)) {
        // Get translated name
        const translatedName = ingredient.i18n?.[userLocale]?.name || 
                              ingredient.i18n?.['pt-BR']?.name || 
                              ingredient.i18n?.['en-US']?.name || 
                              id;
        const nameNormalized = normalizeText(translatedName);
        
        // Check if name STARTS WITH query (strict matching - no false positives)
        // "arroz" should match "Arroz branco", "Arroz integral" but NOT "Biscoito de arroz"
        if (nameNormalized.startsWith(normalizedQuery)) {
          if (!existingIds.has(id)) {
            universalResults.push({
              id,
              name: translatedName,
              name_normalized: nameNormalized,
              calories_per_100g: ingredient.macros.kcal,
              protein_per_100g: ingredient.macros.prot,
              carbs_per_100g: ingredient.macros.carbs,
              fat_per_100g: ingredient.macros.fat,
              fiber_per_100g: ingredient.macros.fiber,
              sodium_per_100g: 0,
              category: ingredient.category,
              source: 'UNIVERSAL',
              is_verified: true,
              is_recipe: false,
              default_serving_size: ingredient.portion_default || 100,
              serving_unit: 'g'
            });
            existingIds.add(id);
          }
        }
      }
      
      if (universalResults.length > 0) {
        allFoods = [...allFoods, ...universalResults];
        logStep('Found in UNIVERSAL_INGREDIENTS', { added: universalResults.length });
      }
    }

    // Sort database results
    const sortedFoods = allFoods.sort((a, b) => {
      const nameA = normalizeText(a.name || '');
      const nameB = normalizeText(b.name || '');
      
      // 1. EXACT MATCH first (feijoada === feijoada)
      const isExactA = nameA === normalizedQuery;
      const isExactB = nameB === normalizedQuery;
      if (isExactA !== isExactB) return isExactA ? -1 : 1;
      
      // 2. STARTS WITH query (feijoada... before feijão...)
      const startsWithA = nameA.startsWith(normalizedQuery);
      const startsWithB = nameB.startsWith(normalizedQuery);
      if (startsWithA !== startsWithB) return startsWithA ? -1 : 1;
      
      // 3. If both start with query, shorter names first (simpler = better)
      if (startsWithA && startsWithB) {
        const lenDiff = (a.name?.length || 0) - (b.name?.length || 0);
        if (lenDiff !== 0) return lenDiff;
      }
      
      // 4. Prioritize ingredients without commas (simpler names)
      const aHasComma = (a.name || '').includes(',') ? 1 : 0;
      const bHasComma = (b.name || '').includes(',') ? 1 : 0;
      if (aHasComma !== bHasComma) return aHasComma - bHasComma;
      
      // 5. Prioritize certain categories (graos, cereais, ingrediente)
      const priorityCategories = ['graos', 'cereais', 'ingrediente', 'legumes', 'verduras', 'frutas', 'carnes'];
      const aCategory = (a.category || '').toLowerCase();
      const bCategory = (b.category || '').toLowerCase();
      const aPriority = priorityCategories.findIndex(c => aCategory.includes(c));
      const bPriority = priorityCategories.findIndex(c => bCategory.includes(c));
      const aScore = aPriority >= 0 ? aPriority : 99;
      const bScore = bPriority >= 0 ? bPriority : 99;
      if (aScore !== bScore) return aScore - bScore;
      
      // 6. Then by name length (shorter = simpler)
      const lenDiff = (a.name?.length || 0) - (b.name?.length || 0);
      if (lenDiff !== 0) return lenDiff;
      
      // 7. Then alphabetically
      return (a.name || '').localeCompare(b.name || '');
    });

    // STEP 6: Return database results IMMEDIATELY - no waiting for AI
    // Frontend will call AI separately if needed
    if (sortedFoods.length > 0) {
      const finalResults = sortedFoods.slice(0, limit);
      const needsAiComplement = sortedFoods.length < 5;
      logStep('Returning database results immediately', { 
        count: finalResults.length,
        needsAiComplement 
      });
      return new Response(
        JSON.stringify({ 
          results: finalResults, 
          source: 'local',
          count: finalResults.length,
          needsAiComplement // Flag for frontend to call AI separately
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 7: No database results at all - use AI only
    logStep('No database results, trying AI only');
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

