import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// ============= IMPORTS DOS MÓDULOS COMPARTILHADOS =============
import {
  REGIONAL_CONFIGS,
  getRegionalConfig,
  getStrategyPersona,
  normalizeText,
  type RegionalConfig,
} from "../_shared/mealGenerationConfig.ts";

import {
  loadSafetyDatabase,
  type SafetyDatabase,
} from "../_shared/globalSafetyEngine.ts";

import {
  CALORIE_TABLE,
  normalizeForCalorieTable,
} from "../_shared/calorieTable.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[MEAL-POOL] ${step}`, details ? JSON.stringify(details) : "");
};

// ============= TIPOS =============
interface MealComponent {
  type: string; // protein, carb, vegetable, fruit, beverage, fat, fiber, dairy, grain, legume
  name: string;
  name_en?: string;
  portion_grams?: number;
  portion_ml?: number;
  portion_label: string;
}

interface GeneratedMeal {
  name: string;
  description: string;
  components: MealComponent[];
  dietary_tags: string[];
  blocked_for_intolerances: string[];
  flexible_options: Record<string, string[]>;
  instructions: string[];
  prep_time_minutes: number;
}

// ============= COMPONENTES SIMPLES ESTILO NUTRICIONISTA =============
// Componentes universais que um nutricionista usaria para montar refeições práticas
const MEAL_COMPONENTS = {
  carbs: [
    { name: "Arroz branco", name_en: "White rice", portion_grams: 100, blocked_for: [] },
    { name: "Arroz integral", name_en: "Brown rice", portion_grams: 100, blocked_for: [] },
    { name: "Macarrão", name_en: "Pasta", portion_grams: 80, blocked_for: ["gluten"] },
    { name: "Pão francês", name_en: "French bread", portion_grams: 50, blocked_for: ["gluten"] },
    { name: "Pão integral", name_en: "Whole wheat bread", portion_grams: 50, blocked_for: ["gluten"] },
    { name: "Tapioca", name_en: "Tapioca", portion_grams: 50, blocked_for: [] },
    { name: "Batata cozida", name_en: "Boiled potato", portion_grams: 100, blocked_for: [] },
    { name: "Batata doce", name_en: "Sweet potato", portion_grams: 100, blocked_for: [] },
    { name: "Aveia", name_en: "Oatmeal", portion_grams: 30, blocked_for: ["gluten"] },
    { name: "Cuscuz", name_en: "Couscous", portion_grams: 100, blocked_for: [] },
    { name: "Purê de batata", name_en: "Mashed potato", portion_grams: 100, blocked_for: ["lactose", "milk"] },
  ],
  proteins: [
    { name: "Frango grelhado", name_en: "Grilled chicken", portion_grams: 120, blocked_for: [] },
    { name: "Frango desfiado", name_en: "Shredded chicken", portion_grams: 100, blocked_for: [] },
    { name: "Bife grelhado", name_en: "Grilled beef steak", portion_grams: 100, blocked_for: [] },
    { name: "Carne moída", name_en: "Ground beef", portion_grams: 100, blocked_for: [] },
    { name: "Ovo frito", name_en: "Fried egg", portion_grams: 50, blocked_for: ["egg"] },
    { name: "Ovo mexido", name_en: "Scrambled eggs", portion_grams: 100, blocked_for: ["egg"] },
    { name: "Ovo cozido", name_en: "Boiled egg", portion_grams: 50, blocked_for: ["egg"] },
    { name: "Omelete simples", name_en: "Simple omelette", portion_grams: 100, blocked_for: ["egg"] },
    { name: "Peixe grelhado", name_en: "Grilled fish", portion_grams: 120, blocked_for: ["fish", "seafood"] },
    { name: "Atum", name_en: "Tuna", portion_grams: 80, blocked_for: ["fish", "seafood"] },
    { name: "Queijo mussarela", name_en: "Mozzarella cheese", portion_grams: 30, blocked_for: ["lactose", "milk"] },
    { name: "Queijo branco", name_en: "White cheese", portion_grams: 30, blocked_for: ["lactose", "milk"] },
    { name: "Peito de peru", name_en: "Turkey breast", portion_grams: 50, blocked_for: [] },
    { name: "Presunto", name_en: "Ham", portion_grams: 30, blocked_for: [] },
  ],
  vegetables: [
    { name: "Salada verde", name_en: "Green salad", portion_grams: 80, blocked_for: [] },
    { name: "Legumes cozidos", name_en: "Steamed vegetables", portion_grams: 100, blocked_for: [] },
    { name: "Legumes refogados", name_en: "Sautéed vegetables", portion_grams: 100, blocked_for: [] },
    { name: "Brócolis", name_en: "Broccoli", portion_grams: 80, blocked_for: [] },
    { name: "Couve refogada", name_en: "Sautéed collard greens", portion_grams: 50, blocked_for: [] },
    { name: "Tomate", name_en: "Tomato", portion_grams: 50, blocked_for: [] },
    { name: "Cenoura", name_en: "Carrot", portion_grams: 50, blocked_for: [] },
    { name: "Abobrinha", name_en: "Zucchini", portion_grams: 80, blocked_for: [] },
    { name: "Beterraba", name_en: "Beet", portion_grams: 50, blocked_for: [] },
  ],
  fruits: [
    { name: "Banana", name_en: "Banana", portion_grams: 100, blocked_for: [] },
    { name: "Maçã", name_en: "Apple", portion_grams: 150, blocked_for: ["fodmap"] },
    { name: "Mamão", name_en: "Papaya", portion_grams: 150, blocked_for: [] },
    { name: "Laranja", name_en: "Orange", portion_grams: 150, blocked_for: [] },
    { name: "Melancia", name_en: "Watermelon", portion_grams: 200, blocked_for: [] },
    { name: "Manga", name_en: "Mango", portion_grams: 100, blocked_for: [] },
    { name: "Morango", name_en: "Strawberry", portion_grams: 100, blocked_for: [] },
    { name: "Abacaxi", name_en: "Pineapple", portion_grams: 100, blocked_for: [] },
  ],
  dairy: [
    { name: "Iogurte natural", name_en: "Natural yogurt", portion_grams: 170, blocked_for: ["lactose", "milk"] },
    { name: "Leite", name_en: "Milk", portion_ml: 200, blocked_for: ["lactose", "milk"] },
    { name: "Requeijão", name_en: "Cream cheese", portion_grams: 30, blocked_for: ["lactose", "milk"] },
    { name: "Café com leite", name_en: "Coffee with milk", portion_ml: 200, blocked_for: ["lactose", "milk"] },
    { name: "Vitamina de banana", name_en: "Banana smoothie", portion_ml: 250, blocked_for: ["lactose", "milk"] },
  ],
  legumes: [
    { name: "Feijão carioca", name_en: "Pinto beans", portion_grams: 80, blocked_for: ["fodmap"] },
    { name: "Feijão preto", name_en: "Black beans", portion_grams: 80, blocked_for: ["fodmap"] },
    { name: "Lentilha", name_en: "Lentils", portion_grams: 80, blocked_for: ["fodmap"] },
  ],
  extras: [
    { name: "Manteiga", name_en: "Butter", portion_grams: 10, blocked_for: ["lactose", "milk"] },
    { name: "Azeite", name_en: "Olive oil", portion_ml: 10, blocked_for: [] },
    { name: "Granola", name_en: "Granola", portion_grams: 30, blocked_for: ["gluten", "nuts", "tree_nuts"] },
    { name: "Castanhas", name_en: "Nuts", portion_grams: 20, blocked_for: ["nuts", "tree_nuts"] },
    { name: "Mel", name_en: "Honey", portion_grams: 15, blocked_for: [] },
  ],
  beverages: [
    { name: "Café puro", name_en: "Black coffee", portion_ml: 100, blocked_for: [] },
    { name: "Chá", name_en: "Tea", portion_ml: 200, blocked_for: [] },
    { name: "Suco de laranja", name_en: "Orange juice", portion_ml: 200, blocked_for: [] },
    { name: "Água de coco", name_en: "Coconut water", portion_ml: 200, blocked_for: [] },
  ],
};

// ============= ESTRUTURAS DE REFEIÇÃO ESTILO NUTRICIONISTA =============
const MEAL_STRUCTURES: Record<string, {
  required: string[];
  optional: string[];
  rules: string;
  max_prep_time: string;
  examples: string[];
  macro_focus: { carb: string; protein: string; fat: string };
}> = {
  cafe_manha: {
    required: ["carbs", "proteins"],
    optional: ["dairy", "fruits", "beverages"],
    rules: "1 carboidrato + 1 proteína + bebida opcional",
    max_prep_time: "10 minutos",
    examples: [
      "Pão francês + ovo mexido + café com leite",
      "Tapioca + queijo branco + café puro",
      "Aveia + banana + leite",
      "Pão integral + ovo cozido + suco de laranja",
      "Cuscuz + ovo frito + café com leite",
      "Pão francês + queijo mussarela + café puro",
    ],
    macro_focus: { carb: "alto", protein: "médio", fat: "moderado" },
  },
  lanche_manha: {
    required: ["fruits"],
    optional: ["proteins", "dairy"],
    rules: "1 fruta + proteína leve opcional",
    max_prep_time: "5 minutos",
    examples: [
      "Banana + iogurte natural",
      "Maçã + castanhas",
      "Mamão + granola",
      "Morango + iogurte natural",
      "Laranja",
      "Banana + mel",
    ],
    macro_focus: { carb: "moderado", protein: "baixo", fat: "baixo" },
  },
  almoco: {
    required: ["carbs", "proteins", "vegetables"],
    optional: ["legumes"],
    rules: "1 base (arroz/macarrão/batata) + 1 proteína + 1 vegetal + feijão opcional",
    max_prep_time: "30 minutos",
    examples: [
      "Arroz branco + feijão carioca + frango grelhado + salada verde",
      "Arroz integral + carne moída + legumes refogados",
      "Macarrão + frango desfiado + brócolis",
      "Arroz branco + feijão preto + bife grelhado + salada verde",
      "Batata cozida + peixe grelhado + legumes cozidos",
      "Arroz branco + feijão carioca + ovo frito + couve refogada",
    ],
    macro_focus: { carb: "alto", protein: "alto", fat: "moderado" },
  },
  lanche_tarde: {
    required: ["carbs"],
    optional: ["proteins", "dairy", "fruits"],
    rules: "Similar ao café da manhã, pode ser mais leve",
    max_prep_time: "10 minutos",
    examples: [
      "Pão integral + queijo branco",
      "Tapioca + manteiga",
      "Iogurte natural + granola",
      "Pão francês + presunto",
      "Banana + aveia",
      "Vitamina de banana",
    ],
    macro_focus: { carb: "moderado", protein: "moderado", fat: "baixo" },
  },
  jantar: {
    required: ["proteins", "vegetables"],
    optional: ["carbs"],
    rules: "Proteína + vegetal, carboidrato reduzido ou ausente",
    max_prep_time: "20 minutos",
    examples: [
      "Frango grelhado + salada verde",
      "Omelete simples + legumes refogados",
      "Peixe grelhado + brócolis",
      "Bife grelhado + salada verde",
      "Frango desfiado + legumes cozidos",
      "Ovo mexido + tomate + salada verde",
    ],
    macro_focus: { carb: "baixo", protein: "alto", fat: "moderado" },
  },
  ceia: {
    required: ["dairy"],
    optional: ["fruits"],
    rules: "Proteína leve para saciedade sem atrapalhar sono",
    max_prep_time: "5 minutos",
    examples: [
      "Iogurte natural",
      "Leite + banana",
      "Queijo branco + mamão",
      "Iogurte natural + morango",
      "Leite morno",
      "Queijo branco",
    ],
    macro_focus: { carb: "baixo", protein: "médio", fat: "baixo" },
  },
};

// ============= MAPEAMENTO DE INTOLERÂNCIAS PARA INGREDIENTES =============
const INTOLERANCE_INGREDIENT_MAP: Record<string, string[]> = {
  gluten: ["pão", "macarrão", "biscoito", "bolo", "farinha de trigo", "aveia", "cevada", "centeio", "torrada", "pizza", "massa"],
  lactose: ["leite", "queijo", "iogurte", "manteiga", "requeijão", "creme de leite", "nata", "sorvete"],
  milk: ["leite", "queijo", "iogurte", "manteiga", "requeijão", "creme de leite", "nata", "whey"],
  egg: ["ovo", "omelete", "maionese", "bolo", "torta", "suflê", "merengue"],
  peanut: ["amendoim", "pasta de amendoim", "paçoca"],
  nuts: ["castanha", "nozes", "amêndoas", "avelã", "macadâmia", "pistache"],
  tree_nuts: ["castanha", "nozes", "amêndoas", "avelã", "macadâmia", "pistache"],
  fish: ["peixe", "salmão", "tilápia", "atum", "bacalhau", "sardinha"],
  seafood: ["camarão", "lagosta", "caranguejo", "mexilhão", "lula", "polvo", "frutos do mar"],
  shellfish: ["camarão", "lagosta", "caranguejo", "mexilhão", "ostra", "marisco"],
  soy: ["soja", "tofu", "tempeh", "molho de soja", "shoyu", "edamame", "leite de soja"],
  fodmap: ["cebola", "alho", "feijão", "maçã", "leite", "trigo", "mel", "cogumelo", "couve-flor"],
  celiac: ["trigo", "cevada", "centeio", "aveia", "pão", "macarrão", "pizza", "biscoito"],
  fructose: ["maçã", "pera", "manga", "mel", "xarope de milho", "melancia"],
  histamine: ["queijo curado", "vinho", "vinagre", "embutidos", "fermentados", "peixe enlatado"],
  sulfite: ["vinho", "frutas secas", "vinagre", "mostarda", "camarão"],
  nightshade: ["tomate", "batata", "pimentão", "berinjela", "pimenta"],
  corn: ["milho", "fubá", "polenta", "amido de milho", "xarope de milho"],
  sesame: ["gergelim", "tahine", "óleo de gergelim"],
  mustard: ["mostarda", "molho de mostarda"],
};

// ============= REGRAS DE COMBINAÇÕES PROIBIDAS =============
const FORBIDDEN_COMBINATIONS = [
  ["arroz", "macarrão"],
  ["pão", "tapioca"],
  ["feijão", "lentilha"],
  ["café", "chá"],
  ["rice", "pasta"],
  ["bread", "tortilla"],
];

// ============= MEAL TYPE MAPPING =============
const MEAL_TYPE_LABELS: Record<string, Record<string, string>> = {
  BR: {
    cafe_manha: "Café da manhã",
    lanche_manha: "Lanche da manhã",
    almoco: "Almoço",
    lanche_tarde: "Lanche da tarde",
    jantar: "Jantar",
    ceia: "Ceia",
  },
  US: {
    cafe_manha: "Breakfast",
    lanche_manha: "Morning Snack",
    almoco: "Lunch",
    lanche_tarde: "Afternoon Snack",
    jantar: "Dinner",
    ceia: "Late Night Snack",
  },
  PT: {
    cafe_manha: "Pequeno-almoço",
    lanche_manha: "Lanche da Manhã",
    almoco: "Almoço",
    lanche_tarde: "Lanche da Tarde",
    jantar: "Jantar",
    ceia: "Ceia",
  },
  MX: {
    cafe_manha: "Desayuno",
    lanche_manha: "Colación Matutina",
    almoco: "Comida",
    lanche_tarde: "Colación Vespertina",
    jantar: "Cena",
    ceia: "Cena Ligera",
  },
  ES: {
    cafe_manha: "Desayuno",
    lanche_manha: "Media Mañana",
    almoco: "Almuerzo",
    lanche_tarde: "Merienda",
    jantar: "Cena",
    ceia: "Cena Tardía",
  },
};

// ============= PORÇÕES PADRÃO POR TIPO DE COMPONENTE =============
const DEFAULT_PORTIONS: Record<string, { grams: number; label_pt: string; label_en: string }> = {
  protein: { grams: 120, label_pt: "1 porção média", label_en: "1 medium portion" },
  carb: { grams: 100, label_pt: "1 porção", label_en: "1 portion" },
  vegetable: { grams: 80, label_pt: "1 xícara", label_en: "1 cup" },
  fruit: { grams: 120, label_pt: "1 unidade média", label_en: "1 medium piece" },
  beverage: { grams: 200, label_pt: "1 xícara", label_en: "1 cup" },
  dairy: { grams: 150, label_pt: "1 porção", label_en: "1 portion" },
  fat: { grams: 15, label_pt: "1 colher de sopa", label_en: "1 tablespoon" },
  fiber: { grams: 30, label_pt: "2 colheres de sopa", label_en: "2 tablespoons" },
  grain: { grams: 80, label_pt: "1/2 xícara", label_en: "1/2 cup" },
  legume: { grams: 100, label_pt: "1 concha", label_en: "1 ladle" },
};

// ============= CONSTRUIR PROMPT ESTILO NUTRICIONISTA =============
function buildMealPoolPrompt(
  regional: RegionalConfig,
  countryCode: string,
  mealType: string,
  quantity: number,
  safetyDb: SafetyDatabase,
  existingMealNames: string[],
  dietaryFilter?: string | null,
  strategyKey?: string | null,
): string {
  const mealLabel = MEAL_TYPE_LABELS[countryCode]?.[mealType] || mealType;
  const language = regional.language || "pt-BR";
  const isPortuguese = language.startsWith("pt");
  
  // Pegar estrutura da refeição
  const structure = MEAL_STRUCTURES[mealType] || MEAL_STRUCTURES.almoco;
  
  // Montar lista de componentes disponíveis por categoria
  const componentsByCategory = Object.entries(MEAL_COMPONENTS)
    .map(([category, items]) => {
      const names = items.map(i => i.name).join(", ");
      return `${category.toUpperCase()}: ${names}`;
    })
    .join("\n");
  
  // Contexto de estratégia nutricional
  let strategyContext = "";
  if (strategyKey) {
    const persona = getStrategyPersona(strategyKey);
    strategyContext = `
ESTRATÉGIA NUTRICIONAL ATIVA: ${persona.label}
- Filosofia: ${persona.philosophy}
- Estilo: ${persona.foodStyle}
- Porções: ${persona.portionStyle}`;
  }
  
  // Filtro dietético
  const dietaryContext = dietaryFilter 
    ? `\n⚠️ FILTRO DIETÉTICO: Apenas refeições compatíveis com "${dietaryFilter}".`
    : "";
  
  // Lista de pratos existentes para evitar repetição
  const existingContext = existingMealNames.length > 0
    ? `\n🚫 PRATOS JÁ EXISTENTES (NÃO REPETIR NOMES SIMILARES):\n${existingMealNames.slice(0, 50).join(", ")}`
    : "";
  
  // Lista de intolerâncias com ingredientes
  const intoleranceList = Object.entries(INTOLERANCE_INGREDIENT_MAP)
    .map(([key, ingredients]) => `- ${key}: ${ingredients.slice(0, 5).join(", ")}...`)
    .join("\n");
  
  // Lista de todas as intolerância keys do banco
  const allIntoleranceKeys = safetyDb.allIntoleranceKeys.join(", ");
  
  // Prompt principal estilo nutricionista
  return `[INTERNAL REASONING: English]
[OUTPUT LANGUAGE: ${language}]

🩺 VOCÊ É UM NUTRICIONISTA CLÍNICO MONTANDO COMBINAÇÕES ALIMENTARES PRÁTICAS

OBJETIVO: Gerar ${quantity} combinações de alimentos simples para "${mealLabel}" que uma pessoa comum vai REALMENTE seguir no dia a dia.

📋 ESTRUTURA DESTA REFEIÇÃO (${mealType}):
REGRA: ${structure.rules}
TEMPO MÁXIMO DE PREPARO: ${structure.max_prep_time}
FOCO NUTRICIONAL: Carboidrato ${structure.macro_focus.carb}, Proteína ${structure.macro_focus.protein}, Gordura ${structure.macro_focus.fat}

🧱 COMPONENTES DISPONÍVEIS PARA COMBINAR:
${componentsByCategory}

✅ EXEMPLOS DE COMBINAÇÕES CORRETAS PARA ${mealLabel.toUpperCase()}:
${structure.examples.map((e, i) => `${i + 1}. ${e}`).join("\n")}

⚠️ REGRAS CRÍTICAS DE PRATICIDADE:
1. Use APENAS os componentes listados acima ou ingredientes igualmente simples
2. Preparo deve ser RÁPIDO (máximo ${structure.max_prep_time})
3. PROIBIDO pratos complexos: escondidinho, lasanha, feijoada completa, moqueca, strogonoff
4. PROIBIDO pratos regionais específicos: baião de dois, galinhada, dobradinha, arroz carreteiro
5. COMBINAÇÕES SIMPLES: "Arroz + Feijão + Frango + Salada" é o padrão ideal
6. Ingredientes devem ser encontrados em QUALQUER supermercado do Brasil
7. NÃO invente pratos elaborados - foque no que as pessoas realmente comem no dia a dia
${strategyContext}
${dietaryContext}
${existingContext}

🏷️ MAPEAMENTO DE INTOLERÂNCIAS (marcar em blocked_for_intolerances):
${intoleranceList}

CHAVES DE INTOLERÂNCIA VÁLIDAS: ${allIntoleranceKeys}

📤 FORMATO DE RESPOSTA (JSON EXATO):
{
  "meals": [
    {
      "name": "Nome descritivo da combinação em ${isPortuguese ? "português" : "inglês"}",
      "description": "Descrição breve",
      "components": [
        {"type": "carb", "name": "Arroz branco", "name_en": "White rice", "portion_grams": 100, "portion_label": "${isPortuguese ? "4 colheres de sopa" : "4 tablespoons"}"},
        {"type": "protein", "name": "Frango grelhado", "name_en": "Grilled chicken", "portion_grams": 120, "portion_label": "${isPortuguese ? "1 filé médio" : "1 medium fillet"}"}
      ],
      "dietary_tags": ["sem_lactose", "high_protein"],
      "blocked_for_intolerances": ["gluten", "lactose"],
      "flexible_options": {"protein": ["frango", "peixe", "ovo"]},
      "instructions": ["Instrução 1", "Instrução 2"],
      "prep_time_minutes": 15
    }
  ]
}

COMPONENT TYPES VÁLIDOS: protein, carb, vegetable, fruit, beverage, dairy, fat, fiber, grain, legume

COMBINAÇÕES PROIBIDAS (nunca juntos):
${FORBIDDEN_COMBINATIONS.map(c => `- ${c.join(" + ")}`).join("\n")}

VALIDAÇÃO:
1. Cada refeição DEVE ter array "components" com 2-5 itens
2. Cada componente DEVE ter: type, name, name_en, portion_grams (ou portion_ml), portion_label
3. blocked_for_intolerances deve listar TODAS as intolerâncias afetadas pelos ingredientes
4. Retornar APENAS JSON válido, sem markdown, sem code blocks

Gere ${quantity} combinações VARIADAS, SIMPLES e PRÁTICAS para "${mealLabel}" agora.`;
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      country_code = "BR", 
      meal_type, 
      quantity = 5,
      dietary_filter = null,
      strategy_key = null,
    } = await req.json();

    logStep("Starting meal pool generation", { country_code, meal_type, quantity, dietary_filter, strategy_key });

    // Validate meal_type
    const validMealTypes = ["cafe_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"];
    if (!validMealTypes.includes(meal_type)) {
      throw new Error(`Invalid meal_type. Use: ${validMealTypes.join(", ")}`);
    }

    // Get regional config from shared module
    const regional = getRegionalConfig(country_code);
    logStep("Regional config loaded", { language: regional.language, country: country_code });

    // Load safety database for intolerance detection
    const safetyDb = await loadSafetyDatabase(supabaseUrl, supabaseServiceKey);
    logStep("Safety database loaded", { 
      intoleranceKeys: safetyDb.allIntoleranceKeys.length,
      dietaryKeys: safetyDb.allDietaryKeys.length,
    });

    // Buscar nomes de pratos já existentes para evitar repetição
    const { data: existingMeals } = await supabase
      .from("meal_combinations")
      .select("name")
      .eq("meal_type", meal_type)
      .contains("country_codes", [country_code])
      .limit(100);
    
    const existingMealNames = existingMeals?.map(m => m.name) || [];
    logStep("Existing meals fetched", { count: existingMealNames.length });

    // Build prompt using shared config (estilo nutricionista)
    const systemPrompt = buildMealPoolPrompt(
      regional,
      country_code,
      meal_type,
      quantity,
      safetyDb,
      existingMealNames,
      dietary_filter,
      strategy_key,
    );

    // Helper function to call AI with retry
    const callAIWithRetry = async (maxRetries = 2): Promise<GeneratedMeal[]> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logStep(`Calling Lovable AI Gateway (attempt ${attempt}/${maxRetries})...`);

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Generate ${quantity} meals for ${meal_type} in ${country_code}. Return ONLY valid JSON, no markdown, no code blocks.` },
            ],
            temperature: 0.7,
            max_tokens: 8000, // Ensure enough tokens for complete response
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          logStep("AI Gateway error", { status: aiResponse.status, error: errorText });
          
          if (aiResponse.status === 429) {
            throw { status: 429, message: "Rate limit exceeded. Try again in a few minutes." };
          }
          if (aiResponse.status === 402) {
            throw { status: 402, message: "Insufficient credits. Please add funds." };
          }
          throw new Error(`AI Gateway error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content || "";
        const finishReason = aiData.choices?.[0]?.finish_reason;

        logStep("AI response received", { length: aiContent.length, finishReason });

        // Check if response was truncated
        if (finishReason === "length" || aiContent.length < 1500) {
          logStep("Response possibly truncated, retrying...", { finishReason, length: aiContent.length });
          if (attempt < maxRetries) continue;
        }

        // Parse JSON (remove markdown if present)
        let cleanJson = aiContent.trim();
        if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
        }

        try {
          const parsed = JSON.parse(cleanJson);
          
          logStep("Parsed JSON structure", {
            type: typeof parsed,
            isArray: Array.isArray(parsed),
            keys: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed) : undefined,
          });

          // Handle multiple possible response formats:
          // 1. {"meals": [...]} - standard format
          // 2. [{"meals": [...]}] - wrapped in array
          // 3. [...meals...] - direct array of meals
          let candidate: unknown[];
          
          if (Array.isArray(parsed)) {
            // Check if it's [{"meals": [...]}] format
            if (parsed.length === 1 && Array.isArray((parsed[0] as any)?.meals)) {
              candidate = (parsed[0] as any).meals;
              logStep("Extracted meals from wrapped array format");
            } else if (parsed.length > 0 && (parsed[0] as any)?.components) {
              // Direct array of meals
              candidate = parsed;
              logStep("Using direct array of meals");
            } else {
              throw new Error("Unrecognized array format");
            }
          } else if (Array.isArray((parsed as any)?.meals)) {
            candidate = (parsed as any).meals;
            logStep("Extracted meals from object format");
          } else {
            throw new Error("meals is not an array");
          }

          return candidate as GeneratedMeal[];
        } catch (parseError) {
          logStep("JSON parse error", { error: String(parseError), content: cleanJson.slice(0, 1000), attempt });
          if (attempt < maxRetries) continue;
          throw new Error("Failed to parse AI response after retries");
        }
      }
      throw new Error("Failed after all retries");
    };

    // Handle rate limit/payment errors separately
    let generatedMeals: GeneratedMeal[];
    try {
      generatedMeals = await callAIWithRetry(2);
    } catch (err: any) {
      if (err.status === 429 || err.status === 402) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: err.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    logStep("Meals generated by AI", { count: generatedMeals.length });

    // Log first meal structure for debugging
    if (generatedMeals.length > 0) {
      const firstMeal = generatedMeals[0] as any;
      logStep("First meal structure", {
        name: firstMeal?.name,
        hasComponents: !!firstMeal?.components,
        componentsType: typeof firstMeal?.components,
        componentsIsArray: Array.isArray(firstMeal?.components),
        componentsLength: Array.isArray(firstMeal?.components) ? firstMeal.components.length : 0,
        allKeys: firstMeal ? Object.keys(firstMeal) : [],
      });
    }

    // Helper to coerce components to array
    const coerceMealComponents = (raw: unknown): MealComponent[] => {
      if (Array.isArray(raw)) return raw as MealComponent[];
      if (raw && typeof raw === "object") {
        return Object.values(raw as Record<string, unknown>).filter((v) => v && typeof v === "object") as MealComponent[];
      }
      return [];
    };

    // Normalize + filter out invalid meals (missing or invalid components)
    const validMeals: GeneratedMeal[] = [];
    for (const meal of generatedMeals) {
      if (!meal || typeof meal !== "object") continue;

      const rawComponents = (meal as any)?.components;
      const components = coerceMealComponents(rawComponents);

      if (components.length === 0) {
        logStep("Skipping invalid meal - no components", {
          name: (meal as any)?.name,
          components_type: Array.isArray(rawComponents) ? "array" : typeof rawComponents,
          rawComponentsValue: JSON.stringify(rawComponents)?.slice(0, 200),
        });
        continue;
      }

      validMeals.push({ ...(meal as any), components });
    }

    logStep("Valid meals after normalization", { count: validMeals.length });

    // If no valid meals, throw an error with details
    if (validMeals.length === 0 && generatedMeals.length > 0) {
      logStep("All meals filtered out - AI returned meals without valid components");
      throw new Error("AI generated meals without valid components. Please try again.");
    }

    // Calculate real macros from foods table (TBCA/TACO)
    const mealsWithMacros = await Promise.all(
      validMeals.map(async (meal) => {
        const components = coerceMealComponents((meal as any)?.components);

        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        let totalFiber = 0;
        let macroSource = "tbca";
        let macroConfidence = "high";
        let foundCount = 0;

        for (const component of components) {
          const portionGrams = component.portion_grams || component.portion_ml || DEFAULT_PORTIONS[component.type]?.grams || 100;
          
          // Search by name_en first (more accurate), then local name
          const searchTerms = [component.name_en, component.name].filter(Boolean);
          let foodMatch = null;
          
          for (const term of searchTerms) {
            if (!term) continue;
            const { data } = await supabase
              .from("foods")
              .select("calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, source")
              .or(`name.ilike.%${term}%,name_normalized.ilike.%${normalizeText(term)}%`)
              .limit(1)
              .single();
            
            if (data) {
              foodMatch = data;
              break;
            }
          }

          if (foodMatch) {
            const factor = portionGrams / 100;
            totalCalories += Math.round(foodMatch.calories_per_100g * factor);
            totalProtein += Math.round(foodMatch.protein_per_100g * factor * 10) / 10;
            totalCarbs += Math.round(foodMatch.carbs_per_100g * factor * 10) / 10;
            totalFat += Math.round(foodMatch.fat_per_100g * factor * 10) / 10;
            totalFiber += Math.round((foodMatch.fiber_per_100g || 0) * factor * 10) / 10;
            foundCount++;
            
            if (foodMatch.source && !macroSource.includes(foodMatch.source)) {
              macroSource = foodMatch.source;
            }
          } else {
            // FALLBACK 1: Try calorieTable (curated list with official values)
            const normalizedName = normalizeForCalorieTable(component.name);
            const normalizedNameEn = component.name_en ? normalizeForCalorieTable(component.name_en) : null;
            
            let calorieTableMatch: number | null = null;
            
            // Try exact match first
            if (CALORIE_TABLE[normalizedName]) {
              calorieTableMatch = CALORIE_TABLE[normalizedName];
            } else if (normalizedNameEn && CALORIE_TABLE[normalizedNameEn]) {
              calorieTableMatch = CALORIE_TABLE[normalizedNameEn];
            } else {
              // Try partial match
              for (const [key, kcalPer100g] of Object.entries(CALORIE_TABLE)) {
                if (normalizedName.includes(key) || key.includes(normalizedName)) {
                  calorieTableMatch = kcalPer100g;
                  break;
                }
              }
            }
            
            if (calorieTableMatch !== null) {
              // Found in calorieTable - use it
              const factor = portionGrams / 100;
              totalCalories += Math.round(calorieTableMatch * factor);
              // Estimate macros based on component type with table calories
              const macroRatios: Record<string, { prot: number; carb: number; fat: number; fiber: number }> = {
                protein: { prot: 0.20, carb: 0.02, fat: 0.08, fiber: 0 },
                carb: { prot: 0.03, carb: 0.25, fat: 0.01, fiber: 0.02 },
                vegetable: { prot: 0.02, carb: 0.05, fat: 0.005, fiber: 0.025 },
                fruit: { prot: 0.01, carb: 0.12, fat: 0.003, fiber: 0.02 },
                beverage: { prot: 0.005, carb: 0.02, fat: 0.002, fiber: 0 },
                dairy: { prot: 0.04, carb: 0.05, fat: 0.03, fiber: 0 },
                fat: { prot: 0, carb: 0, fat: 0.99, fiber: 0 },
                grain: { prot: 0.03, carb: 0.22, fat: 0.01, fiber: 0.03 },
                legume: { prot: 0.08, carb: 0.18, fat: 0.01, fiber: 0.06 },
                fiber: { prot: 0.03, carb: 0.12, fat: 0.02, fiber: 0.10 },
              };
              const ratios = macroRatios[component.type] || macroRatios.carb;
              totalProtein += Math.round(portionGrams * ratios.prot * 10) / 10;
              totalCarbs += Math.round(portionGrams * ratios.carb * 10) / 10;
              totalFat += Math.round(portionGrams * ratios.fat * 10) / 10;
              totalFiber += Math.round(portionGrams * ratios.fiber * 10) / 10;
              foundCount++; // Count as found since we have official calorie data
              macroSource = "calorie_table";
            } else {
              // FALLBACK 2: Estimate based on component type (last resort)
              macroConfidence = "medium";
              const estimates: Record<string, { cal: number; prot: number; carb: number; fat: number; fiber: number }> = {
                protein: { cal: 150, prot: 25, carb: 0, fat: 5, fiber: 0 },
                carb: { cal: 120, prot: 3, carb: 25, fat: 1, fiber: 2 },
                vegetable: { cal: 25, prot: 2, carb: 5, fat: 0, fiber: 2 },
                fruit: { cal: 60, prot: 1, carb: 15, fat: 0, fiber: 2 },
                beverage: { cal: 5, prot: 0, carb: 1, fat: 0, fiber: 0 },
                dairy: { cal: 80, prot: 5, carb: 8, fat: 3, fiber: 0 },
                fat: { cal: 90, prot: 0, carb: 0, fat: 10, fiber: 0 },
                grain: { cal: 100, prot: 3, carb: 20, fat: 1, fiber: 3 },
                legume: { cal: 120, prot: 8, carb: 20, fat: 1, fiber: 6 },
                fiber: { cal: 30, prot: 2, carb: 7, fat: 0, fiber: 5 },
              };
              const est = estimates[component.type] || estimates.carb;
              const factor = portionGrams / 100;
              totalCalories += Math.round(est.cal * factor);
              totalProtein += Math.round(est.prot * factor * 10) / 10;
              totalCarbs += Math.round(est.carb * factor * 10) / 10;
              totalFat += Math.round(est.fat * factor * 10) / 10;
              totalFiber += Math.round(est.fiber * factor * 10) / 10;
            }
          }
        }

        if (foundCount === 0) {
          macroConfidence = "low";
          macroSource = "ai_estimated";
        } else if (foundCount < components.length / 2) {
          macroConfidence = "medium";
        }

        return {
          name: meal.name,
          description: meal.description,
          meal_type,
          components,
          total_calories: totalCalories,
          total_protein: totalProtein,
          total_carbs: totalCarbs,
          total_fat: totalFat,
          total_fiber: totalFiber,
          macro_source: macroSource,
          macro_confidence: macroConfidence,
          country_codes: [country_code],
          language_code: regional.language.split("-")[0],
          dietary_tags: meal.dietary_tags || [],
          blocked_for_intolerances: meal.blocked_for_intolerances || [],
          flexible_options: meal.flexible_options || {},
          instructions: meal.instructions || [],
          prep_time_minutes: meal.prep_time_minutes || 15,
          is_active: true,
          source: "ai_generated",
          generated_by: "populate-meal-pool",
        };
      })
    );

    logStep("Macros calculated", { 
      meals: mealsWithMacros.map(m => ({ 
        name: m.name, 
        calories: m.total_calories,
        confidence: m.macro_confidence 
      })) 
    });

    // Insert into database (upsert to avoid duplicates)
    const inserted: string[] = [];
    const skipped: string[] = [];

    for (const meal of mealsWithMacros) {
      // Check if already exists
      const { data: existing } = await supabase
        .from("meal_combinations")
        .select("id")
        .eq("name", meal.name)
        .eq("meal_type", meal.meal_type)
        .contains("country_codes", [country_code])
        .single();

      if (existing) {
        skipped.push(meal.name);
        continue;
      }

      const { error: insertError } = await supabase
        .from("meal_combinations")
        .insert(meal);

      if (insertError) {
        logStep("Insert error", { meal: meal.name, error: insertError.message });
        skipped.push(meal.name);
      } else {
        inserted.push(meal.name);
      }
    }

    logStep("Insertion complete", { inserted: inserted.length, skipped: skipped.length });

    // Log AI usage
    await supabase.from("ai_usage_logs").insert({
      function_name: "populate-meal-pool",
      model_used: "google/gemini-2.5-flash",
      items_generated: inserted.length,
      metadata: { country_code, meal_type, quantity, dietary_filter, strategy_key },
    });

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedMeals.length,
        inserted: inserted.length,
        skipped: skipped.length,
        meals: mealsWithMacros.map(m => ({
          name: m.name,
          calories: m.total_calories,
          protein: m.total_protein,
          carbs: m.total_carbs,
          fat: m.total_fat,
          fiber: m.total_fiber,
          confidence: m.macro_confidence,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("Fatal error", { error: String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
