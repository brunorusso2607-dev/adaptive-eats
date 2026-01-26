/**
 * SUGGEST-SMART-SUBSTITUTES v2.0
 * 
 * Refatorado para usar EXATAMENTE a mesma arquitetura do generate-ai-meal-plan:
 * - Usa mealGenerationConfig.ts como fonte de regras
 * - Usa globalSafetyEngine.ts para validação
 * - Mesmas regras de formatação, medidas caseiras e humanização
 * - Validação pós-AI com validateFood()
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Importar do mealGenerationConfig (mesma fonte que generate-ai-meal-plan)
import {
  validateFood,
  fetchIntoleranceMappings,
  getRestrictionText,
  getMealPromptRules,
  shouldAddSugarQualifier,
  getRegionalConfig,
  getMealMacroTargets,
  type IntoleranceMapping,
  type SafeKeyword,
} from "../_shared/mealGenerationConfig.ts";
import { getNutritionalTablePrompt } from "../_shared/nutritionalTableInjection.ts";
import { calculateRealMacrosForFoods } from "../_shared/calculateRealMacros.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[SMART-SUBSTITUTES] ${step}`, details ? JSON.stringify(details) : '');
};

// ============= CATEGORIZAÇÃO DE MACROS =============
type MacroCategory = 'proteina' | 'carboidrato' | 'gordura' | 'vegetal' | 'fruta' | 'bebida' | 'outro';

function detectMacroCategory(protein: number, carbs: number, fat: number, name: string): MacroCategory {
  const nameLower = name.toLowerCase();
  
  // Detectar por nome primeiro
  if (nameLower.includes('chá') || nameLower.includes('café') || nameLower.includes('suco') || nameLower.includes('leite')) {
    return 'bebida';
  }
  if (nameLower.includes('salada') || nameLower.includes('alface') || nameLower.includes('brócolis') || 
      nameLower.includes('espinafre') || nameLower.includes('couve') || nameLower.includes('rúcula') ||
      nameLower.includes('tomate') || nameLower.includes('pepino') || nameLower.includes('cenoura')) {
    return 'vegetal';
  }
  if (nameLower.includes('banana') || nameLower.includes('maçã') || nameLower.includes('laranja') ||
      nameLower.includes('morango') || nameLower.includes('manga') || nameLower.includes('abacaxi')) {
    return 'fruta';
  }
  
  // Detectar por macros
  const total = protein + carbs + fat;
  if (total === 0) return 'outro';
  
  const proteinRatio = protein / total;
  const carbRatio = carbs / total;
  const fatRatio = fat / total;
  
  if (proteinRatio > 0.35 || protein > 15) return 'proteina';
  if (fatRatio > 0.5 || fat > 15) return 'gordura';
  if (carbRatio > 0.5 || carbs > 20) return 'carboidrato';
  
  return 'outro';
}

// Detectar estilo de preparo
function detectPreparationStyle(name: string): string[] {
  const nameLower = name.toLowerCase();
  const styles: string[] = [];
  
  if (nameLower.includes('grelhad')) styles.push('grelhado');
  if (nameLower.includes('cozid')) styles.push('cozido');
  if (nameLower.includes('assad')) styles.push('assado');
  if (nameLower.includes('frit')) styles.push('frito');
  if (nameLower.includes('refogad')) styles.push('refogado');
  if (nameLower.includes('cru') || nameLower.includes('fresc')) styles.push('cru');
  
  if (styles.length === 0) styles.push('neutro');
  return styles;
}

// ============= MEAL TYPE INFO (usando mesmo padrão do generate-ai-meal-plan) =============
const MEAL_TYPE_INFO: Record<string, { 
  label: string;
  labelPt: string;
  allowed: string[]; 
  forbidden: string[];
  examples: string[];
}> = {
  // English keys (standard)
  breakfast: {
    label: 'Breakfast',
    labelPt: 'Café da Manhã',
    allowed: ['pão', 'tapioca', 'ovo', 'queijo', 'iogurte', 'fruta', 'aveia', 'granola', 'leite', 'café', 'suco', 'vitamina', 'panqueca', 'crepioca', 'torrada', 'manteiga', 'mel', 'geleia', 'cereal', 'mingau'],
    forbidden: ['arroz', 'feijão', 'carne vermelha', 'frango grelhado', 'salada de almoço', 'macarrão', 'lasanha', 'estrogonofe'],
    examples: ['Tapioca com queijo', 'Pão integral com ovo', 'Iogurte com granola', 'Vitamina de banana', 'Crepioca', 'Panqueca de aveia']
  },
  morning_snack: {
    label: 'Morning Snack',
    labelPt: 'Lanche da Manhã',
    allowed: ['fruta', 'iogurte', 'castanha', 'barrinha', 'queijo', 'biscoito', 'suco', 'shake'],
    forbidden: ['arroz', 'feijão', 'carne de almoço', 'pratos pesados'],
    examples: ['Maçã com pasta de amendoim', 'Iogurte natural', 'Mix de castanhas', 'Banana']
  },
  lunch: {
    label: 'Lunch',
    labelPt: 'Almoço',
    allowed: ['arroz', 'feijão', 'carne', 'frango', 'peixe', 'salada', 'legumes', 'batata', 'macarrão', 'ovo', 'grão de bico', 'lentilha', 'quinoa'],
    forbidden: ['cereal matinal', 'panqueca doce', 'granola com leite'],
    examples: ['Arroz integral', 'Feijão preto', 'Filé de frango grelhado', 'Batata doce', 'Salada verde']
  },
  afternoon_snack: {
    label: 'Afternoon Snack',
    labelPt: 'Lanche da Tarde',
    allowed: ['fruta', 'iogurte', 'sanduíche', 'tapioca', 'pão', 'queijo', 'castanha', 'shake', 'suco', 'barrinha', 'torrada'],
    forbidden: ['arroz com feijão', 'pratos de almoço completo', 'refeições pesadas'],
    examples: ['Sanduíche natural', 'Tapioca', 'Frutas com iogurte', 'Shake proteico']
  },
  dinner: {
    label: 'Dinner',
    labelPt: 'Jantar',
    allowed: ['sopa', 'salada', 'omelete', 'peixe', 'frango', 'legumes', 'ovo', 'arroz', 'batata', 'carne leve', 'wrap', 'sanduíche'],
    forbidden: ['cereal matinal', 'granola', 'café da manhã típico'],
    examples: ['Sopa de legumes', 'Omelete', 'Salada com frango', 'Peixe grelhado']
  },
  supper: {
    label: 'Late Night Snack',
    labelPt: 'Ceia',
    allowed: ['chá', 'fruta', 'iogurte', 'castanha', 'leite', 'queijo cottage', 'aveia'],
    forbidden: ['carne pesada', 'fritura', 'refeição completa', 'arroz com feijão', 'ovos', 'omelete'],
    examples: ['Chá de camomila', 'Iogurte natural', 'Maçã', 'Leite morno']
  }
};

// Normalization map for legacy Portuguese keys
const MEAL_TYPE_NORMALIZATION: Record<string, string> = {
  "cafe_manha": "breakfast",
  "lanche_manha": "morning_snack",
  "almoco": "lunch",
  "lanche": "afternoon_snack",
  "lanche_tarde": "afternoon_snack",
  "jantar": "dinner",
  "ceia": "supper",
};

const normalizeMealType = (mealType: string): string => {
  return MEAL_TYPE_NORMALIZATION[mealType] || mealType;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      ingredientName, 
      ingredientGrams, 
      ingredientProtein,
      ingredientCarbs,
      ingredientFat,
      ingredientCalories,
      mealType,
      restrictions = [],
      strategyKey,
      // Novos campos para anti-repetição
      existingFoods = [],
      userCountry = 'BR',
      // Dados do perfil completo (igual generate-ai-meal-plan)
      intolerances = [],
      dietaryPreference = 'comum',
      excludedIngredients = [],
      goal = 'manter'
    } = await req.json();

    if (!ingredientName) {
      return new Response(
        JSON.stringify({ error: 'Ingredient name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isFlexibleDiet = strategyKey === 'dieta_flexivel';
    
    logStep('Processing request', { 
      ingredientName, 
      ingredientGrams,
      mealType,
      strategyKey,
      isFlexibleDiet,
      intolerances,
      dietaryPreference,
      existingFoodsCount: existingFoods.length,
      macros: { protein: ingredientProtein, carbs: ingredientCarbs, fat: ingredientFat, calories: ingredientCalories }
    });

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    // Inicializar Supabase para buscar mapeamentos
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar mapeamentos de intolerância (igual generate-ai-meal-plan)
    const { mappings: dbMappings, safeKeywords: dbSafeKeywords } = await fetchIntoleranceMappings(supabase);
    
    logStep('Fetched intolerance data', { 
      mappingsCount: dbMappings.length, 
      safeKeywordsCount: dbSafeKeywords.length 
    });

    // ============= INJEÇÃO DE TABELA NUTRICIONAL (CASCATA CAMADA 1) =============
    const nutritionalTablePrompt = await getNutritionalTablePrompt(supabase, userCountry);
    logStep("Nutritional table loaded for prompt injection");

    // Detectar categoria do macro principal
    const macroCategory = detectMacroCategory(
      ingredientProtein || 0, 
      ingredientCarbs || 0, 
      ingredientFat || 0,
      ingredientName
    );
    
    // Detectar estilo de preparo
    const prepStyles = detectPreparationStyle(ingredientName);
    
    // Obter info do tipo de refeição
    const normalizedMealType = normalizeMealType(mealType);
    const mealTypeInfo = MEAL_TYPE_INFO[normalizedMealType] || MEAL_TYPE_INFO['lunch'];
    
    // Obter config regional (igual generate-ai-meal-plan)
    const regionalConfig = getRegionalConfig(userCountry);
    
    logStep('Detected categories', { macroCategory, prepStyles, mealType, mealTypeLabel: mealTypeInfo.labelPt });

    // Calcular o macro principal a igualar
    let mainMacro = 'proteína';
    let mainMacroValue = ingredientProtein || 0;
    
    if (macroCategory === 'carboidrato') {
      mainMacro = 'carboidratos';
      mainMacroValue = ingredientCarbs || 0;
    } else if (macroCategory === 'gordura') {
      mainMacro = 'gordura';
      mainMacroValue = ingredientFat || 0;
    }

    // Calcular macro por 100g do original
    const originalGrams = ingredientGrams || 100;
    const totalMacroToMatch = mainMacroValue;

    // ============= CONSTRUIR TEXTO DE RESTRIÇÕES (igual generate-ai-meal-plan) =============
    const combinedIntolerances = [...new Set([...intolerances, ...restrictions])];
    const addSugarQualifier = shouldAddSugarQualifier(combinedIntolerances, strategyKey, dietaryPreference);
    
    const restrictionsText = getRestrictionText(
      {
        intolerances: combinedIntolerances,
        dietaryPreference,
        excludedIngredients,
        goal
      },
      regionalConfig.language,
      addSugarQualifier
    );

    // ============= REGRAS DE PROMPT (igual generate-ai-meal-plan) =============
    const mealPromptRules = getMealPromptRules(regionalConfig.language);

    // ============= LISTA ANTI-REPETIÇÃO =============
    const existingFoodsText = existingFoods.length > 0
      ? `\n🚫 ALIMENTOS JÁ NA REFEIÇÃO (NÃO REPETIR):\n${existingFoods.map((f: string) => `- ${f}`).join('\n')}`
      : '';

    // Texto específico para dieta flexível
    const flexibleDietText = isFlexibleDiet ? `
===== DIETA FLEXÍVEL - OPÇÕES EXTRAS =====
O usuário está na DIETA FLEXÍVEL. Você deve gerar:
- 3 opções SAUDÁVEIS (normais)
- 2 opções de "COMFORT FOOD" (mais indulgentes mas equilibradas)

Para as opções de comfort food, marque com "isFlexible": true
Exemplos de comfort food: hambúrguer artesanal, pizza fit, wrap recheado, sanduíche gourmet, panqueca americana, etc.
As opções flexíveis devem respeitar as restrições do usuário mas podem ser mais calóricas.
` : '';

    const numberOfSubstitutes = 5;
    
    // Country-specific language mapping
    const COUNTRY_LANGUAGE: Record<string, { lang: string; nutritionist: string; examples: string[] }> = {
      'BR': { lang: 'português brasileiro', nutritionist: 'DRA. ANA, nutricionista brasileira', examples: ['Tapioca com queijo', 'Arroz integral', 'Feijão preto'] },
      'PT': { lang: 'português europeu', nutritionist: 'DRA. MARIA, nutricionista portuguesa', examples: ['Bacalhau à brás', 'Caldo verde', 'Pastel de nata'] },
      'US': { lang: 'English', nutritionist: 'DR. SARAH, American nutritionist', examples: ['Grilled chicken', 'Brown rice', 'Mixed greens salad'] },
      'GB': { lang: 'British English', nutritionist: 'DR. EMMA, British nutritionist', examples: ['Jacket potato', 'Grilled salmon', 'Garden peas'] },
      'MX': { lang: 'español mexicano', nutritionist: 'DRA. ELENA, nutrióloga mexicana', examples: ['Tacos de pollo', 'Frijoles negros', 'Arroz rojo'] },
      'ES': { lang: 'español', nutritionist: 'DRA. CARMEN, nutricionista española', examples: ['Tortilla española', 'Gazpacho', 'Paella'] },
      'FR': { lang: 'français', nutritionist: 'DR. SOPHIE, nutritionniste française', examples: ['Poulet grillé', 'Ratatouille', 'Salade niçoise'] },
      'DE': { lang: 'Deutsch', nutritionist: 'DR. ANNA, deutsche Ernährungsberaterin', examples: ['Hähnchenbrust', 'Kartoffelsalat', 'Vollkornbrot'] },
      'IT': { lang: 'italiano', nutritionist: 'DR. GIULIA, nutrizionista italiana', examples: ['Petto di pollo', 'Risotto', 'Insalata mista'] },
      'AR': { lang: 'español argentino', nutritionist: 'DRA. VALENTINA, nutricionista argentina', examples: ['Bife de chorizo', 'Empanadas', 'Milanesa'] },
      'CO': { lang: 'español colombiano', nutritionist: 'DRA. CATALINA, nutricionista colombiana', examples: ['Bandeja paisa', 'Arepas', 'Sancocho'] },
    };
    
    const countryConfig = COUNTRY_LANGUAGE[userCountry] || COUNTRY_LANGUAGE['BR'];
    
    // ============= PROMPT v6.0 PARA SUBSTITUIÇÕES (MULTILINGUAL) =============
    // Inject nutritional table BEFORE the main prompt (CASCATA CAMADA 1)
    const prompt = `${nutritionalTablePrompt}

You are ${countryConfig.nutritionist} with 20 years of clinical experience.
You suggest PRECISE and BALANCED substitutions as you would for your VIP patients.
IMPORTANT: All food names and instructions MUST be in ${countryConfig.lang}.

TASK: Suggest ${numberOfSubstitutes} substitutes for "${ingredientName}" (${ingredientGrams}g) in the context of ${mealTypeInfo.labelPt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ORIGINAL FOOD DATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Grams: ${ingredientGrams}g
- Total Calories: ${ingredientCalories} kcal
- Total Protein: ${ingredientProtein}g
- Total Carbs: ${ingredientCarbs}g
- Total Fat: ${ingredientFat}g
- Categoria detectada: ${macroCategory.toUpperCase()}
- Estilo de preparo: ${prepStyles.join(', ')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍽️ TIPO DE REFEIÇÃO: ${mealTypeInfo.labelPt.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Alimentos PERMITIDOS: ${mealTypeInfo.allowed.join(', ')}
- Alimentos PROIBIDOS: ${mealTypeInfo.forbidden.join(', ')}
- Exemplos típicos: ${mealTypeInfo.examples.join(', ')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 RESTRIÇÕES ABSOLUTAS (NUNCA INCLUIR):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${restrictionsText}
${existingFoodsText}
${flexibleDietText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍽️ FILOSOFIA DE SUBSTITUIÇÕES REAIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ GRAMAGEM POR MACRONUTRIENTE (MAIS IMPORTANTE):
   O macro principal é ${mainMacro.toUpperCase()} = ${totalMacroToMatch}g
   
   FÓRMULA OBRIGATÓRIA:
   nova_gramagem = (${totalMacroToMatch} / macro_do_substituto_por_100g) × 100
   
   ⚠️ A gramagem NUNCA deve ser igual (100g) para todos. Varia conforme cada substituto!

2️⃣ COERÊNCIA CULINÁRIA:
   • Se original é ${prepStyles[0]} → sugerir preparo similar
   • Manter mesma categoria: ${macroCategory === 'proteina' ? 'outras proteínas' : macroCategory === 'carboidrato' ? 'outros carboidratos' : 'mesma categoria'}
   • Acessibilidade similar (não trocar frango por salmão caro)

3️⃣ ADEQUAÇÃO POR REFEIÇÃO:
   • Esta é uma refeição de ${mealTypeInfo.labelPt}
   • SÓ sugerir alimentos típicos desta refeição
   • NÃO sugerir: ${mealTypeInfo.forbidden.join(', ')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 FORMATO DOS ALIMENTOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ CORRETO:
• "1 filé médio de frango grelhado"
• "2 colheres de sopa de arroz"
• "1 porção de batata-doce assada"

❌ INCORRETO:
• "150g de frango" → gramagem duplicada no name!
• "Mix de proteínas" → QUAL proteína?

REGRA: Usar medida caseira NO "name", gramagem técnica NO "grams"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 INSTRUÇÕES DE PREPARO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ INCLUIR:
• 2-4 passos simples e humanizados
• Linguagem natural (como conversa com amigo)
• Dicas práticas quando relevante

❌ NÃO INCLUIR:
• Frutas (consumidas naturalmente)
• Bebidas prontas (café, chá)
• Gramagens nas instruções

Exemplo BOM: "Grelhe o filé em fogo médio até dourar, cerca de 4 min de cada lado."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 RESPOSTA (JSON PURO, sem markdown):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[
  {
    "name": "Nome com medida caseira",
    "grams": NÚMERO_CALCULADO_PELA_FÓRMULA,
    "calories": calorias_proporcionais,
    "protein": proteína_proporcional,
    "carbs": carboidratos_proporcionais,
    "fat": gordura_proporcional,
    "reason": "Substituto equilibrado para ${mealTypeInfo.labelPt}",
    "isFlexible": false,
    "instructions": ["Passo 1", "Passo 2"]
  }
]
${isFlexibleDiet ? '\nIMPORTANTE: 3 opções saudáveis (isFlexible: false) + 2 comfort foods (isFlexible: true).' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ VERIFICAÇÃO ANTES DE RETORNAR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Gramagem calculada pela fórmula? (NÃO é 100g para todos)
□ ${mainMacro} está próximo de ${totalMacroToMatch}g?
□ É apropriado para ${mealTypeInfo.labelPt}?
□ Name usa medida caseira (SEM "Xg")?
□ Respeita TODAS as restrições?
□ Instruções são humanizadas?

Retorne APENAS o array JSON com ${numberOfSubstitutes} substitutos.`;

    logStep('Sending prompt to AI', { totalMacroToMatch, mainMacro, mealType, restrictionsCount: combinedIntolerances.length });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logStep('Google AI Error', { status: response.status, error: errorText });
      throw new Error(`Google AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    logStep('AI Response received', { contentLength: content.length });
    
    // Parse JSON from response
    let suggestions: any[] = [];
    try {
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.split('```json')[1].split('```')[0];
      } else if (content.includes('```')) {
        jsonStr = content.split('```')[1].split('```')[0];
      }
      
      suggestions = JSON.parse(jsonStr.trim());
      
      if (!Array.isArray(suggestions)) {
        suggestions = [];
      }
    } catch (parseError) {
      logStep('Parse error', { error: parseError, content });
      suggestions = [];
    }

    // ============= VALIDAÇÃO PÓS-AI (igual generate-ai-meal-plan) =============
    const userRestrictions = {
      intolerances: combinedIntolerances,
      dietaryPreference,
      excludedIngredients
    };

    const validatedSuggestions: any[] = [];
    const rejectedSuggestions: any[] = [];

    // Função para verificar se alimento é apropriado para o tipo de refeição
    const isAppropriateForMealType = (foodName: string, mealType: string): { valid: boolean; reason?: string } => {
      const nameLower = foodName.toLowerCase();
      const info = MEAL_TYPE_INFO[mealType];
      if (!info) return { valid: true };
      
      // Verificar se contém algum alimento proibido para este tipo de refeição
      for (const forbidden of info.forbidden) {
        const forbiddenLower = forbidden.toLowerCase();
        if (nameLower.includes(forbiddenLower)) {
          return { valid: false, reason: `"${forbidden}" não é apropriado para ${info.labelPt}` };
        }
      }
      
      // Regras específicas por tipo de refeição
      if (mealType === 'breakfast' || mealType === 'morning_snack') {
        // Café da manhã/lanche da manhã: não pode ter arroz, feijão, carne vermelha pesada
        if (nameLower.includes('arroz') && !nameLower.includes('arroz doce') && !nameLower.includes('mingau')) {
          return { valid: false, reason: 'Arroz não é típico de café da manhã' };
        }
        if (nameLower.includes('feijão') || nameLower.includes('feijoada')) {
          return { valid: false, reason: 'Feijão não é típico de café da manhã' };
        }
        if (nameLower.includes('macarrão') || nameLower.includes('lasanha') || nameLower.includes('espaguete')) {
          return { valid: false, reason: 'Massas não são típicas de café da manhã' };
        }
        if (nameLower.includes('picanha') || nameLower.includes('costela') || nameLower.includes('churrasco')) {
          return { valid: false, reason: 'Carnes pesadas não são típicas de café da manhã' };
        }
      }
      
      if (mealType === 'supper') {
        // Ceia: não pode ter refeições pesadas
        if (nameLower.includes('arroz') || nameLower.includes('feijão')) {
          return { valid: false, reason: 'Refeições pesadas não são apropriadas para ceia' };
        }
        if (nameLower.includes('carne') && !nameLower.includes('cottage')) {
          return { valid: false, reason: 'Carnes não são apropriadas para ceia' };
        }
      }
      
      return { valid: true };
    };

    for (const suggestion of suggestions) {
      if (!suggestion || typeof suggestion.name !== 'string' || typeof suggestion.grams !== 'number') {
        continue;
      }

      // Validar usando validateFood do mealGenerationConfig
      const validationResult = validateFood(
        suggestion.name,
        userRestrictions,
        dbMappings,
        dbSafeKeywords
      );

      // Validar se é apropriado para o tipo de refeição
      const mealTypeValidation = isAppropriateForMealType(suggestion.name, normalizedMealType);

      if (validationResult.isValid && mealTypeValidation.valid) {
        validatedSuggestions.push({
          name: suggestion.name,
          grams: Math.round(suggestion.grams),
          calories: Math.round(suggestion.calories || 0),
          protein: Math.round((suggestion.protein || 0) * 10) / 10,
          carbs: Math.round((suggestion.carbs || 0) * 10) / 10,
          fat: Math.round((suggestion.fat || 0) * 10) / 10,
          reason: suggestion.reason || '',
          isFlexible: suggestion.isFlexible === true || (isFlexibleDiet && validatedSuggestions.length >= 3)
        });
      } else {
        rejectedSuggestions.push({
          name: suggestion.name,
          reason: validationResult.reason || mealTypeValidation.reason,
          restriction: validationResult.restriction || 'meal_type_mismatch'
        });
      }
    }

    logStep('Validation complete', { 
      total: suggestions.length,
      validated: validatedSuggestions.length,
      rejected: rejectedSuggestions.length,
      rejectedDetails: rejectedSuggestions
    });

    // Limitar a 5 sugestões válidas
    const validSuggestions = validatedSuggestions.slice(0, 5);

    // ============= CALIBRAÇÃO DE MACROS PÓS-GERAÇÃO (CASCATA CAMADA 2) =============
    const calibratedSuggestions = [];
    for (const suggestion of validSuggestions) {
      try {
        const foodItems = [{
          name: suggestion.name,
          grams: suggestion.grams,
          calories: suggestion.calories || 0,
          protein: suggestion.protein || 0,
          carbs: suggestion.carbs || 0,
          fat: suggestion.fat || 0,
        }];

        const { items: calculatedItems } = await calculateRealMacrosForFoods(
          supabase,
          foodItems,
          userCountry
        );

        const calibratedItem = calculatedItems[0];
        // PHASE 2: Accept canonical as valid source (highest priority)
        const hasRealData = calibratedItem?.source === 'canonical' || 
                           calibratedItem?.source === 'database' || 
                           calibratedItem?.source === 'database_global';

        if (hasRealData && calibratedItem.calories > 0) {
          logStep("Suggestion calibrated", { 
            name: suggestion.name,
            source: calibratedItem.source,
            original: { cal: suggestion.calories, p: suggestion.protein, c: suggestion.carbs, f: suggestion.fat },
            calibrated: { cal: calibratedItem.calories, p: calibratedItem.protein, c: calibratedItem.carbs, f: calibratedItem.fat }
          });
          
          calibratedSuggestions.push({
            ...suggestion,
            calories: Math.round(calibratedItem.calories),
            protein: Math.round(calibratedItem.protein * 10) / 10,
            carbs: Math.round(calibratedItem.carbs * 10) / 10,
            fat: Math.round(calibratedItem.fat * 10) / 10,
            macro_source: calibratedItem.source,
            canonical_id: calibratedItem.canonical_id || undefined,
          });
        } else {
          // Keep AI estimates if no database data
          calibratedSuggestions.push(suggestion);
        }
      } catch (calibrationError) {
        logStep("Calibration error, keeping AI values", { name: suggestion.name, error: String(calibrationError) });
        calibratedSuggestions.push(suggestion);
      }
    }

    const finalSuggestions = calibratedSuggestions;

    logStep('Returning suggestions', { 
      count: finalSuggestions.length,
      isFlexibleDiet,
      suggestions: finalSuggestions.map(s => ({ 
        name: s.name, 
        grams: s.grams, 
        isFlexible: s.isFlexible,
        [mainMacro]: macroCategory === 'proteina' ? s.protein : macroCategory === 'carboidrato' ? s.carbs : s.fat 
      }))
    });

    return new Response(
      JSON.stringify({ 
        suggestions: finalSuggestions,
        originalCategory: macroCategory,
        mainMacro,
        mainMacroValue: totalMacroToMatch,
        mealType: mealTypeInfo.labelPt,
        isFlexibleDiet,
        validationStats: {
          total: suggestions.length,
          validated: validatedSuggestions.length,
          rejected: rejectedSuggestions.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('Error', { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage, suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

