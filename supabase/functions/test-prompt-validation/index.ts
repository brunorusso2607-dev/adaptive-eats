import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import {
  getMasterMealPromptV5,
  getRegionalConfig,
  validateFood,
  sortMealIngredients,
  cleanInstructionsFromFruitsAndBeverages,
  type MasterPromptParams,
} from "../_shared/mealGenerationConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: string;
  passed: boolean;
  details?: string;
  severity: 'critical' | 'warning' | 'info';
}

interface ValidationResult {
  success: boolean;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  rules: ValidationRule[];
  generatedMeal: any;
  promptPreview: string;
  rawAIResponse?: string;
  timestamp: string;
  categories: Record<string, { total: number; passed: number; failed: number }>;
}

// =============================================================================
// CATEGORIAS DE VALIDAÇÃO
// =============================================================================

const RULE_CATEGORIES = {
  FORMAT: 'Formato dos Dados',
  TITLE: 'Título da Refeição',
  FOODS: 'Lista de Alimentos',
  INSTRUCTIONS: 'Dicas de Preparo',
  CALORIES: 'Calorias e Macros',
  CONSOLIDATION: 'Consolidação de Pratos',
  SORTING: 'Ordenação de Ingredientes',
  SAFETY: 'Segurança Alimentar',
};

// =============================================================================
// REGRAS DE VALIDAÇÃO COMPLETAS (30+ regras)
// =============================================================================

function validateMealFormat(meal: any, mealType: string = 'almoco'): ValidationRule[] {
  const rules: ValidationRule[] = [];
  
  // ========== CATEGORIA: FORMATO DOS DADOS ==========
  
  // Regra 1: Estrutura básica do JSON
  rules.push({
    id: 'json_structure',
    name: 'Estrutura JSON válida',
    description: 'O JSON deve ter campos title, foods, instructions e calories_kcal',
    category: RULE_CATEGORIES.FORMAT,
    passed: meal && typeof meal === 'object' && 
            ('title' in meal || 'nome' in meal) && 
            ('foods' in meal || 'alimentos' in meal),
    details: `Campos encontrados: ${Object.keys(meal || {}).join(', ')}`,
    severity: 'critical',
  });

  // Regra 2: Foods é um array
  const foods = meal?.foods || meal?.alimentos || [];
  rules.push({
    id: 'foods_is_array',
    name: 'Foods é um array',
    description: 'O campo foods deve ser um array de objetos',
    category: RULE_CATEGORIES.FORMAT,
    passed: Array.isArray(foods),
    details: `Tipo: ${typeof foods}, É array: ${Array.isArray(foods)}`,
    severity: 'critical',
  });

  // Regra 3: Instructions é um array
  const instructions = meal?.instructions || meal?.dicas || [];
  rules.push({
    id: 'instructions_is_array',
    name: 'Instructions é um array',
    description: 'O campo instructions/dicas deve ser um array de strings',
    category: RULE_CATEGORIES.FORMAT,
    passed: Array.isArray(instructions),
    details: `Tipo: ${typeof instructions}, É array: ${Array.isArray(instructions)}`,
    severity: 'critical',
  });

  // ========== CATEGORIA: TÍTULO DA REFEIÇÃO ==========
  
  const title = meal?.title || meal?.nome || '';
  
  // Regra 4: Título não é undefined
  rules.push({
    id: 'title_not_undefined',
    name: 'Título definido',
    description: 'O título da refeição não pode ser undefined ou vazio',
    category: RULE_CATEGORIES.TITLE,
    passed: typeof title === 'string' && title.length > 0,
    details: `Título: "${title}"`,
    severity: 'critical',
  });

  // Regra 5: Título é descritivo (> 10 chars)
  rules.push({
    id: 'title_is_descriptive',
    name: 'Título descritivo',
    description: 'O título deve ter mais de 10 caracteres e ser descritivo',
    category: RULE_CATEGORIES.TITLE,
    passed: title.length > 10,
    details: `Título: "${title}" (${title.length} chars)`,
    severity: 'warning',
  });

  // Regra 6: Título não é lista de ingredientes
  const titleIsIngredientList = /^[A-Za-zÀ-ú\s]+ e [A-Za-zÀ-ú\s]+$/.test(title) && 
    title.split(' e ').length === 2 &&
    title.length < 30;
  rules.push({
    id: 'title_not_ingredient_list',
    name: 'Título não é lista',
    description: 'O título deve descrever um prato, não listar ingredientes (ex: "Tofu e Sal" é errado)',
    category: RULE_CATEGORIES.TITLE,
    passed: !titleIsIngredientList || title.length > 25,
    details: `Título: "${title}"`,
    severity: 'warning',
  });

  // Regra 7: Título não contém gramagens
  rules.push({
    id: 'title_no_grams',
    name: 'Título sem gramagens',
    description: 'O título não deve conter gramagens (ex: "150g de frango" é errado)',
    category: RULE_CATEGORIES.TITLE,
    passed: !/\d+\s*g\b/i.test(title),
    details: `Título: "${title}"`,
    severity: 'warning',
  });

  // ========== CATEGORIA: LISTA DE ALIMENTOS ==========
  
  // Regra 8: Tem pelo menos 1 alimento
  rules.push({
    id: 'has_foods',
    name: 'Tem alimentos',
    description: 'A refeição deve ter pelo menos 1 alimento',
    category: RULE_CATEGORIES.FOODS,
    passed: foods.length >= 1,
    details: `${foods.length} alimentos encontrados`,
    severity: 'critical',
  });

  // Regra 9: Cada food tem name e grams
  const allFoodsComplete = foods.every((f: any) => 
    f && 
    (f.name || f.nome) && 
    typeof (f.name || f.nome) === 'string' && 
    (f.name || f.nome).length > 2 &&
    (f.grams || f.gramas) && 
    typeof (f.grams || f.gramas) === 'number' && 
    (f.grams || f.gramas) > 0
  );
  rules.push({
    id: 'foods_complete',
    name: 'Foods completos',
    description: 'Cada alimento deve ter name (string > 2 chars) e grams (number > 0)',
    category: RULE_CATEGORIES.FOODS,
    passed: allFoodsComplete,
    details: allFoodsComplete ? 'OK' : `Foods: ${JSON.stringify(foods.slice(0, 2))}...`,
    severity: 'critical',
  });

  // Regra 10: Sem condimentos soltos
  const forbiddenSoloItems = ['sal', 'azeite', 'limão', 'suco de limão', 'pimenta', 'orégano', 'alho'];
  const hasSoloCondiment = foods.some((food: any) => {
    const name = ((food.name || food.nome) || '').toLowerCase();
    const grams = food.grams || food.gramas || 0;
    return forbiddenSoloItems.some(item => 
      name === item || 
      (name.includes(item) && grams < 20 && !name.includes('com') && !name.includes('molho'))
    );
  });
  rules.push({
    id: 'no_solo_condiments',
    name: 'Sem condimentos soltos',
    description: 'Sal, azeite, limão etc. devem estar DENTRO do nome do prato, não como item separado',
    category: RULE_CATEGORIES.FOODS,
    passed: !hasSoloCondiment,
    details: hasSoloCondiment ? `Encontrado condimento solto` : 'OK',
    severity: 'warning',
  });

  // Regra 11: Food name não tem gramagem duplicada
  const hasDuplicatedGrams = foods.some((f: any) => {
    const name = (f.name || f.nome || '').toLowerCase();
    return /^\d+\s*g\s+(de\s+)?/i.test(name);
  });
  rules.push({
    id: 'no_duplicated_grams',
    name: 'Sem gramagem duplicada no nome',
    description: 'O nome do alimento não deve começar com gramagem (ex: "150g de frango")',
    category: RULE_CATEGORIES.FOODS,
    passed: !hasDuplicatedGrams,
    details: hasDuplicatedGrams ? 'Gramagem duplicada encontrada' : 'OK',
    severity: 'warning',
  });

  // Regra 12: Gramagens realistas
  const unrealisticGrams = foods.filter((f: any) => {
    const grams = f.grams || f.gramas || 0;
    return grams < 5 || grams > 1000;
  });
  rules.push({
    id: 'realistic_grams',
    name: 'Gramagens realistas',
    description: 'Gramagens devem estar entre 5g e 1000g',
    category: RULE_CATEGORIES.FOODS,
    passed: unrealisticGrams.length === 0,
    details: unrealisticGrams.length > 0 
      ? `Gramagens inválidas: ${unrealisticGrams.map((f: any) => `${f.name}: ${f.grams}g`).join(', ')}`
      : 'OK',
    severity: 'warning',
  });

  // ========== CATEGORIA: DICAS DE PREPARO ==========
  
  // Regra 13: Mínimo 2 dicas
  rules.push({
    id: 'min_instructions',
    name: 'Mínimo 2 dicas',
    description: 'Dicas de preparo devem ter pelo menos 2 passos',
    category: RULE_CATEGORIES.INSTRUCTIONS,
    passed: instructions.length >= 2,
    details: `${instructions.length} dicas encontradas`,
    severity: 'warning',
  });

  // Regra 14: Primeira dica lista ingredientes
  const firstInstruction = instructions[0] || '';
  const hasIngredientList = /ingredientes?:|use:|^ingredientes|^utilize|^separe/i.test(firstInstruction) ||
    /\(\d+\s*g\)/.test(firstInstruction) ||
    /\d+\s*g\s+de\s+/i.test(firstInstruction);
  rules.push({
    id: 'first_tip_has_ingredients',
    name: 'Primeira dica lista ingredientes',
    description: 'A primeira dica deve listar os ingredientes com gramagens',
    category: RULE_CATEGORIES.INSTRUCTIONS,
    passed: hasIngredientList || instructions.length === 0,
    details: firstInstruction.substring(0, 100) + (firstInstruction.length > 100 ? '...' : ''),
    severity: 'warning',
  });

  // Regra 15: Sem dicas vagas
  const vagueInstructions = instructions.filter((inst: string) => 
    inst.length < 15 || /^(sirva|adicione|misture|finalize)\.?$/i.test(inst.trim())
  );
  rules.push({
    id: 'no_vague_instructions',
    name: 'Sem dicas vagas',
    description: 'Dicas não podem ser muito curtas (< 15 chars) ou genéricas',
    category: RULE_CATEGORIES.INSTRUCTIONS,
    passed: vagueInstructions.length === 0,
    details: vagueInstructions.length > 0 
      ? `Dicas vagas: ${vagueInstructions.slice(0, 2).join(', ')}`
      : 'OK',
    severity: 'warning',
  });

  // Regra 16: Dicas não mencionam frutas/bebidas
  const instructionText = instructions.join(' ').toLowerCase();
  const mentionsFruitBeverage = 
    (/\b(banana|maçã|laranja|mamão|melancia|morango)\b/.test(instructionText) ||
    /\b(café|chá|suco de \w+|refrigerante)\b/.test(instructionText)) &&
    !title.toLowerCase().includes('vitamina') &&
    !title.toLowerCase().includes('smoothie');
  rules.push({
    id: 'no_fruits_in_instructions',
    name: 'Sem frutas/bebidas nas dicas',
    description: 'Frutas e bebidas não devem ser mencionadas nas instruções de preparo',
    category: RULE_CATEGORIES.INSTRUCTIONS,
    passed: !mentionsFruitBeverage,
    details: mentionsFruitBeverage ? 'Fruta/bebida mencionada nas dicas' : 'OK',
    severity: 'info',
  });

  // ========== CATEGORIA: CALORIAS E MACROS ==========
  
  const calories = meal?.calories_kcal || meal?.calorias || 0;
  
  // Regra 17: Calorias definidas
  rules.push({
    id: 'has_calories',
    name: 'Calorias definidas',
    description: 'A refeição deve ter calorias definidas',
    category: RULE_CATEGORIES.CALORIES,
    passed: typeof calories === 'number' && calories > 0,
    details: `${calories} kcal`,
    severity: 'critical',
  });

  // Regra 18: Calorias realistas por tipo de refeição
  const calorieRanges: Record<string, [number, number]> = {
    'cafe_manha': [150, 600],
    'lanche_manha': [80, 300],
    'almoco': [300, 900],
    'lanche_tarde': [80, 300],
    'jantar': [300, 900],
    'ceia': [50, 250],
  };
  const range = calorieRanges[mealType] || [100, 1000];
  rules.push({
    id: 'realistic_calories',
    name: 'Calorias realistas',
    description: `Calorias devem estar entre ${range[0]} e ${range[1]} para ${mealType}`,
    category: RULE_CATEGORIES.CALORIES,
    passed: calories >= range[0] && calories <= range[1],
    details: `${calories} kcal (esperado: ${range[0]}-${range[1]})`,
    severity: 'warning',
  });

  // ========== CATEGORIA: CONSOLIDAÇÃO DE PRATOS ==========
  
  // Regra 19: Pratos únicos consolidados
  const isPratoUnico = /sopa|caldo|omelete|wrap|sanduíche|bowl|vitamina|mingau/i.test(title);
  const mainFoodsCount = foods.filter((f: any) => {
    const name = ((f.name || f.nome) || '').toLowerCase();
    return !/água|suco zero|refrigerante zero|sobremesa|opcional|café|chá/i.test(name);
  }).length;
  rules.push({
    id: 'consolidated_single_dish',
    name: 'Prato único consolidado',
    description: 'Sopas, omeletes, bowls etc. devem ter 1-2 itens principais + bebida opcional',
    category: RULE_CATEGORIES.CONSOLIDATION,
    passed: !isPratoUnico || mainFoodsCount <= 3,
    details: isPratoUnico 
      ? `Prato único com ${mainFoodsCount} itens principais (máx: 3)`
      : 'Não é prato único',
    severity: 'warning',
  });

  // Regra 20: Refeição composta tem estrutura correta
  const isRefeicaoComposta = /almoco|jantar/i.test(mealType) && !isPratoUnico;
  if (isRefeicaoComposta) {
    const hasProtein = foods.some((f: any) => {
      const name = ((f.name || f.nome) || '').toLowerCase();
      return /frango|carne|peixe|ovo|tofu|filé|bife|peito|coxa/i.test(name);
    });
    const hasCarb = foods.some((f: any) => {
      const name = ((f.name || f.nome) || '').toLowerCase();
      return /arroz|feijão|batata|mandioca|quinoa|macarrão/i.test(name);
    });
    rules.push({
      id: 'composed_meal_structure',
      name: 'Refeição composta completa',
      description: 'Almoço/Jantar deve ter proteína + carboidrato',
      category: RULE_CATEGORIES.CONSOLIDATION,
      passed: hasProtein && hasCarb,
      details: `Proteína: ${hasProtein ? '✓' : '✗'}, Carboidrato: ${hasCarb ? '✓' : '✗'}`,
      severity: 'warning',
    });
  }

  // ========== CATEGORIA: ORDENAÇÃO DE INGREDIENTES ==========
  
  // Regra 21: Proteína primeiro
  if (foods.length >= 3) {
    const firstFoodName = ((foods[0]?.name || foods[0]?.nome) || '').toLowerCase();
    const isProteinFirst = /frango|carne|peixe|ovo|tofu|filé|bife|peito|coxa|salmão|atum|camarão/i.test(firstFoodName) ||
      /omelete|sopa|caldo|vitamina|wrap|sanduíche/i.test(firstFoodName);
    rules.push({
      id: 'protein_first',
      name: 'Proteína/Prato principal primeiro',
      description: 'O primeiro item deve ser a proteína ou prato principal',
      category: RULE_CATEGORIES.SORTING,
      passed: isProteinFirst,
      details: `Primeiro item: "${foods[0]?.name || foods[0]?.nome}"`,
      severity: 'info',
    });
  }

  // Regra 22: Bebidas por último
  if (foods.length >= 2) {
    const lastFoodName = ((foods[foods.length - 1]?.name || foods[foods.length - 1]?.nome) || '').toLowerCase();
    const hasBeverage = foods.some((f: any) => {
      const name = ((f.name || f.nome) || '').toLowerCase();
      return /\b(café|chá|suco|água|refrigerante|leite)\b/i.test(name) &&
             !/vitamina|shake|smoothie/i.test(name);
    });
    const beverageIsLast = !hasBeverage || 
      /\b(café|chá|suco|água|refrigerante|leite)\b/i.test(lastFoodName);
    rules.push({
      id: 'beverage_last',
      name: 'Bebidas por último',
      description: 'Bebidas devem aparecer ao final da lista de alimentos',
      category: RULE_CATEGORIES.SORTING,
      passed: beverageIsLast,
      details: hasBeverage ? `Último item: "${lastFoodName}"` : 'Sem bebidas',
      severity: 'info',
    });
  }

  // Regra 23: Frutas antes das bebidas
  const fruitIndex = foods.findIndex((f: any) => {
    const name = ((f.name || f.nome) || '').toLowerCase();
    return /\b(banana|maçã|laranja|mamão|melancia|morango|fruta|sobremesa)\b/i.test(name);
  });
  const beverageIndex = foods.findIndex((f: any) => {
    const name = ((f.name || f.nome) || '').toLowerCase();
    return /\b(café|chá|suco|água|refrigerante)\b/i.test(name) && !/vitamina/i.test(name);
  });
  rules.push({
    id: 'fruits_before_beverages',
    name: 'Frutas antes das bebidas',
    description: 'Frutas/sobremesas devem vir antes das bebidas',
    category: RULE_CATEGORIES.SORTING,
    passed: fruitIndex === -1 || beverageIndex === -1 || fruitIndex < beverageIndex,
    details: fruitIndex >= 0 && beverageIndex >= 0 
      ? `Fruta: posição ${fruitIndex}, Bebida: posição ${beverageIndex}`
      : 'OK',
    severity: 'info',
  });

  // ========== CATEGORIA: SEGURANÇA ALIMENTAR ==========
  
  // Regra 24: Não contém ingredientes fantasma
  const titleWords = title.toLowerCase().split(/\s+/);
  const foodNames = foods.map((f: any) => ((f.name || f.nome) || '').toLowerCase()).join(' ');
  const keyIngredientsInTitle = titleWords.filter((word: string) => 
    word.length > 4 && /^[a-záàâãéèêíïóôõúç]+$/i.test(word) &&
    !['com', 'para', 'sobre', 'como', 'muito', 'pouco'].includes(word)
  );
  const ghostIngredients = keyIngredientsInTitle.filter((ingredient: string) => 
    !foodNames.includes(ingredient) && 
    !['grelhado', 'assado', 'cozido', 'refogado', 'frito', 'cremoso', 'light', 'caseiro', 'tradicional', 'integral'].includes(ingredient)
  );
  rules.push({
    id: 'no_ghost_ingredients',
    name: 'Sem ingredientes fantasma',
    description: 'Ingredientes do título devem estar nos foods',
    category: RULE_CATEGORIES.SAFETY,
    passed: ghostIngredients.length === 0,
    details: ghostIngredients.length > 0 
      ? `Ingredientes não encontrados: ${ghostIngredients.join(', ')}`
      : 'OK',
    severity: 'warning',
  });

  return rules;
}

// =============================================================================
// HANDLER PRINCIPAL
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      mealType = 'almoco', 
      countryCode = 'BR', 
      testMode = 'quick',
      intolerances = [],
      dietaryPreference = 'comum'
    } = await req.json().catch(() => ({}));
    
    console.log(`[PROMPT-VALIDATION] Starting validation for ${mealType} (${countryCode})`);
    
    // Gerar o prompt que será usado
    const regional = getRegionalConfig(countryCode);
    const promptParams: MasterPromptParams = {
      dailyCalories: 2000,
      meals: [{ 
        type: mealType, 
        label: regional.mealLabels[mealType] || 'Almoço', 
        targetCalories: 600 
      }],
      restrictions: {
        intolerances: intolerances,
        dietaryPreference: dietaryPreference,
        excludedIngredients: [],
        goal: 'manter',
      },
      dayNumber: 1,
      dayName: 'Segunda-feira',
      regional,
      countryCode,
    };
    
    const masterPrompt = getMasterMealPromptV5(promptParams);
    
    // Preview do prompt (primeiros 3000 chars)
    const promptPreview = masterPrompt.substring(0, 3000) + '\n\n[... truncado para preview ...]';
    
    // Se for apenas preview, retornar só o prompt
    if (testMode === 'preview') {
      return new Response(JSON.stringify({
        success: true,
        promptPreview: masterPrompt,
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    // Gerar refeição de teste com IA
    const apiKey = await getGeminiApiKey();
    const model = "gemini-2.5-flash-lite";
    
    const testPrompt = `${masterPrompt}

IMPORTANTE: Gere APENAS UMA refeição de ${regional.mealLabels[mealType] || mealType} como exemplo.
Responda SOMENTE com o JSON da opção, sem markdown, sem explicações, sem texto adicional.

Formato EXATO esperado (use estes nomes de campos):
{
  "title": "Nome descritivo do prato",
  "foods": [
    {"name": "nome do alimento", "grams": 100},
    {"name": "outro alimento", "grams": 150}
  ],
  "calories_kcal": 500,
  "instructions": [
    "Primeira dica: liste ingredientes e gramagens",
    "Segunda dica: explique o preparo",
    "Terceira dica: finalize o prato"
  ]
}

OBRIGATÓRIO:
- Use exatamente os campos: title, foods, calories_kcal, instructions
- foods deve ter objetos com name e grams
- instructions deve ter pelo menos 2 dicas
- A primeira dica deve listar os ingredientes`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: testPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const aiData = await response.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('[PROMPT-VALIDATION] Raw AI response:', rawText.substring(0, 500));
    
    // Limpar e parsear JSON
    let generatedMeal: any;
    try {
      let cleanJson = rawText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Tentar extrair JSON do texto se não começar com {
      if (!cleanJson.startsWith('{')) {
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanJson = jsonMatch[0];
        }
      }
      
      console.log('[PROMPT-VALIDATION] Clean JSON:', cleanJson.substring(0, 300));
      
      let parsedJson = JSON.parse(cleanJson);
      
      // ==== EXTRAIR A REFEIÇÃO CORRETA ====
      // A IA às vezes retorna o formato completo de plano em vez do formato simples
      // Precisamos extrair a refeição individual em ambos os casos
      
      if (parsedJson.meals && Array.isArray(parsedJson.meals)) {
        // Formato: { day: 1, meals: [{ meal_type, options: [{title, foods}] }] }
        console.log('[PROMPT-VALIDATION] Detected full plan format, extracting meal...');
        const targetMeal = parsedJson.meals.find((m: any) => m.meal_type === mealType) || parsedJson.meals[0];
        if (targetMeal?.options && Array.isArray(targetMeal.options) && targetMeal.options.length > 0) {
          generatedMeal = targetMeal.options[0];
          console.log('[PROMPT-VALIDATION] Extracted meal from options:', JSON.stringify(generatedMeal).substring(0, 200));
        } else if (targetMeal?.title || targetMeal?.nome) {
          // A refeição está diretamente no objeto
          generatedMeal = targetMeal;
        } else {
          generatedMeal = parsedJson;
        }
      } else if (parsedJson.options && Array.isArray(parsedJson.options)) {
        // Formato: { meal_type, options: [{title, foods}] }
        console.log('[PROMPT-VALIDATION] Detected meal with options format...');
        generatedMeal = parsedJson.options[0];
      } else {
        // Formato simples esperado: { title, foods, instructions, calories_kcal }
        generatedMeal = parsedJson;
      }
      
      // Normalizar campos se necessário (pt -> en)
      if (!generatedMeal.title && generatedMeal.nome) {
        generatedMeal.title = generatedMeal.nome;
      }
      if (!generatedMeal.instructions && generatedMeal.dicas) {
        generatedMeal.instructions = generatedMeal.dicas;
      }
      if (!generatedMeal.foods && generatedMeal.alimentos) {
        generatedMeal.foods = generatedMeal.alimentos;
      }
      if (!generatedMeal.calories_kcal && generatedMeal.calorias) {
        generatedMeal.calories_kcal = generatedMeal.calorias;
      }
      
      // Normalizar foods internamente
      if (Array.isArray(generatedMeal.foods)) {
        generatedMeal.foods = generatedMeal.foods.map((f: any) => ({
          name: f.name || f.nome || '',
          grams: f.grams || f.gramas || 0,
        }));
      } else {
        generatedMeal.foods = [];
      }
      
      // Garantir que instructions seja array
      if (!Array.isArray(generatedMeal.instructions)) {
        generatedMeal.instructions = [];
      }
      
      console.log('[PROMPT-VALIDATION] Final meal:', JSON.stringify({
        title: generatedMeal.title,
        foodsCount: generatedMeal.foods?.length,
        instructionsCount: generatedMeal.instructions?.length,
        calories: generatedMeal.calories_kcal
      }));
      
    } catch (e) {
      console.error('[PROMPT-VALIDATION] Failed to parse AI response:', rawText);
      return new Response(JSON.stringify({
        success: false,
        error: 'Falha ao parsear resposta da IA',
        rawResponse: rawText.substring(0, 1000),
        promptPreview,
        timestamp: new Date().toISOString(),
      }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    // Executar validações
    const rules = validateMealFormat(generatedMeal, mealType);
    const passedRules = rules.filter(r => r.passed).length;
    const failedRules = rules.filter(r => !r.passed).length;
    
    // Agrupar por categoria
    const categories: Record<string, { total: number; passed: number; failed: number }> = {};
    for (const rule of rules) {
      if (!categories[rule.category]) {
        categories[rule.category] = { total: 0, passed: 0, failed: 0 };
      }
      categories[rule.category].total++;
      if (rule.passed) {
        categories[rule.category].passed++;
      } else {
        categories[rule.category].failed++;
      }
    }
    
    const result: ValidationResult = {
      success: failedRules === 0,
      totalRules: rules.length,
      passedRules,
      failedRules,
      rules,
      generatedMeal,
      promptPreview,
      rawAIResponse: rawText.substring(0, 500),
      timestamp: new Date().toISOString(),
      categories,
    };
    
    console.log(`[PROMPT-VALIDATION] Completed: ${passedRules}/${rules.length} rules passed`);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error('[PROMPT-VALIDATION] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
