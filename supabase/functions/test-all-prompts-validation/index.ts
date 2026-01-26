import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
// NOTA: Não usa mais getAIPrompt - sistema 100% hardcoded
import {
  loadSafetyDatabase,
  normalizeUserIntolerances,
  validateIngredientList,
} from "../_shared/globalSafetyEngine.ts";

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
  generatedOutput: any;
  promptPreview: string;
  rawAIResponse?: string;
  timestamp: string;
  categories: Record<string, { total: number; passed: number; failed: number }>;
  moduleId: string;
  moduleName: string;
  executionTimeMs?: number;
}

// =============================================================================
// MODULE DEFINITIONS - Each AI module has its own validation rules
// =============================================================================

const AI_MODULES = {
  'generate-ai-meal-plan': {
    name: 'Gerador de Plano Alimentar',
    icon: '🍽️',
    requiresImage: false,
    testInputs: ['mealType', 'countryCode'],
  },
  'analyze-food-photo': {
    name: 'Análise de Foto de Alimento',
    icon: '📸',
    requiresImage: true,
    testInputs: ['imageType', 'countryCode', 'intolerances'],
  },
  'analyze-label-photo': {
    name: 'Análise de Rótulo',
    icon: '🏷️',
    requiresImage: true,
    testInputs: ['labelType', 'countryCode', 'intolerances'],
  },
  'analyze-fridge-photo': {
    name: 'Análise de Geladeira',
    icon: '🧊',
    requiresImage: true,
    testInputs: ['countryCode', 'intolerances'],
  },
  'generate-recipe': {
    name: 'Gerador de Receitas',
    icon: '👨‍🍳',
    requiresImage: false,
    testInputs: ['ingredients', 'countryCode', 'intolerances'],
  },
  'regenerate-meal': {
    name: 'Regeneração de Refeição',
    icon: '🔄',
    requiresImage: false,
    testInputs: ['mealType', 'countryCode', 'intolerances'],
  },
  'chat-assistant': {
    name: 'Assistente de Chat',
    icon: '💬',
    requiresImage: false,
    testInputs: ['messageType', 'countryCode'],
  },
};

// =============================================================================
// HELPER: Build user prompt for each module
// =============================================================================

function buildUserPrompt(moduleId: string, testParams: any): string {
  const countryCode = testParams?.countryCode || 'BR';
  const locale = countryCode === 'BR' ? 'pt-BR' : countryCode === 'US' ? 'en-US' : 'es-ES';
  const intolerances = testParams?.intolerances || [];
  
  switch (moduleId) {
    case 'analyze-food-photo':
      return JSON.stringify({
        task: "analyze_food_photo",
        locale: locale,
        user_intolerances: intolerances,
        instructions: "Analise esta foto de refeição e identifique todos os alimentos visíveis com gramagens e calorias estimadas.",
        test_mode: true
      });
      
    case 'analyze-label-photo':
      return JSON.stringify({
        task: "analyze_label",
        locale: locale,
        user_intolerances: intolerances,
        instructions: "Analise este rótulo de produto alimentício e extraia os ingredientes, verificando segurança para as intolerâncias do usuário.",
        test_mode: true
      });
      
    case 'analyze-fridge-photo':
      return JSON.stringify({
        task: "analyze_fridge",
        locale: locale,
        user_intolerances: intolerances,
        instructions: "Analise esta foto de geladeira, identifique os ingredientes disponíveis e sugira receitas possíveis.",
        test_mode: true
      });
      
    case 'generate-recipe':
      const ingredients = testParams?.ingredients || 'frango, arroz, brócolis';
      return JSON.stringify({
        task: "generate_recipe",
        locale: locale,
        user_intolerances: intolerances,
        available_ingredients: ingredients,
        dietary_preferences: testParams?.dietaryPreference || 'omnivore',
        instructions: `Crie uma receita saudável usando estes ingredientes: ${ingredients}`,
        test_mode: true
      });
      
    case 'regenerate-meal':
      const mealType = testParams?.mealType || 'lunch';
      return JSON.stringify({
        task: "regenerate_meal",
        locale: locale,
        user_intolerances: intolerances,
        meal_type: mealType,
        target_calories: testParams?.targetCalories || 500,
        instructions: `Generate an alternative meal for ${mealType} with approximately 500 calories.`,
        test_mode: true
      });
      
    case 'chat-assistant':
      const message = testParams?.message || 'Quais são os melhores alimentos para ganhar massa muscular?';
      return JSON.stringify({
        task: "chat",
        locale: locale,
        user_message: message,
        conversation_context: [],
        test_mode: true
      });
      
    case 'generate-ai-meal-plan':
      const planMealType = testParams?.mealType || 'lunch';
      return JSON.stringify({
        task: "generate_meal_plan",
        locale: locale,
        user_intolerances: intolerances,
        meal_type: planMealType,
        target_calories: testParams?.targetCalories || 500,
        dietary_preference: testParams?.dietaryPreference || 'omnivore',
        instructions: `Gere uma refeição de ${planMealType} com aproximadamente 500 calorias para o plano alimentar.`,
        test_mode: true
      });
      
    default:
      return JSON.stringify({
        task: "unknown",
        locale: locale,
        test_mode: true
      });
  }
}

// =============================================================================
// HELPER: Call Gemini API
// =============================================================================

async function callGeminiAPI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  imageBase64?: string
): Promise<{ response: string; rawResponse: any }> {
  const modelId = model || 'gemini-2.5-flash-lite';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  
  // Build content parts
  const parts: any[] = [];
  
  // Add image if provided
  if (imageBase64) {
    // Extract mime type and data
    const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
      parts.push({
        inline_data: {
          mime_type: matches[1],
          data: matches[2]
        }
      });
    }
  }
  
  // Add text prompt
  parts.push({ text: userPrompt });
  
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: parts
      }
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "application/json"
    }
  };
  
  console.log(`[test-all-prompts] Calling Gemini API with model: ${modelId}`);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[test-all-prompts] Gemini API error: ${response.status}`, errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }
  
  const rawResponse = await response.json();
  const textContent = rawResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  console.log(`[test-all-prompts] Gemini response received: ${textContent.substring(0, 200)}...`);
  
  return { response: textContent, rawResponse };
}

// =============================================================================
// HELPER: Parse AI response to JSON
// =============================================================================

function parseAIResponse(response: string): any {
  try {
    // Try direct parse first
    return JSON.parse(response);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        console.warn('[test-all-prompts] Failed to parse JSON from code block');
      }
    }
    
    // Try to find JSON object/array in text
    const objectMatch = response.match(/\{[\s\S]*\}/);
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        console.warn('[test-all-prompts] Failed to parse JSON object');
      }
    }
    
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        console.warn('[test-all-prompts] Failed to parse JSON array');
      }
    }
    
    // Return as text response
    return { response: response, parse_error: true };
  }
}

// =============================================================================
// VALIDATION RULES FOR EACH MODULE
// =============================================================================

function validateFoodPhotoOutput(output: any): ValidationRule[] {
  const rules: ValidationRule[] = [];
  
  // Regra 1: Estrutura JSON válida
  rules.push({
    id: 'json_structure',
    name: 'Estrutura JSON válida',
    description: 'O JSON deve ter campos obrigatórios',
    category: 'Formato dos Dados',
    passed: output && typeof output === 'object' && 
            ('items' in output || 'itens' in output || 'foods' in output || 'alimentos' in output),
    details: `Campos: ${Object.keys(output || {}).join(', ')}`,
    severity: 'critical',
  });

  const items = output?.items || output?.itens || output?.foods || output?.alimentos || [];
  
  // Regra 2: Itens identificados
  rules.push({
    id: 'has_items',
    name: 'Itens identificados',
    description: 'Deve identificar pelo menos 1 item na foto',
    category: 'Detecção',
    passed: Array.isArray(items) && items.length >= 1,
    details: `${items.length} itens encontrados`,
    severity: 'critical',
  });

  // Regra 3: Cada item tem nome e gramas
  const allItemsComplete = items.every((item: any) => 
    item && (item.name || item.nome || item.item) && (item.grams || item.gramas || item.porcao_g || item.quantidade)
  );
  rules.push({
    id: 'items_complete',
    name: 'Itens completos',
    description: 'Cada item deve ter nome e gramagem estimada',
    category: 'Formato dos Dados',
    passed: allItemsComplete,
    details: allItemsComplete ? 'OK' : 'Itens incompletos encontrados',
    severity: 'critical',
  });

  // Regra 4: Calorias calculadas
  const hasCalories = items.length === 0 || items.every((item: any) => 
    typeof (item.calories || item.calorias || item.kcal) === 'number'
  );
  rules.push({
    id: 'has_calories',
    name: 'Calorias estimadas',
    description: 'Cada item deve ter calorias estimadas',
    category: 'Nutrição',
    passed: hasCalories,
    details: hasCalories ? 'OK' : 'Calorias faltando em alguns itens',
    severity: 'warning',
  });

  // Regra 5: Campo de segurança presente
  const hasSafetyField = 'is_safe' in output || 'seguro' in output || 'safety_status' in output || 'safe' in output;
  rules.push({
    id: 'has_safety_status',
    name: 'Status de segurança',
    description: 'Deve indicar se a refeição é segura para intolerâncias',
    category: 'Segurança',
    passed: hasSafetyField,
    details: hasSafetyField ? 'Campo de segurança presente' : 'Campo de segurança ausente',
    severity: 'critical',
  });

  // Regra 6: Confiança estimada
  const hasConfidence = 'confidence' in output || 'confianca' in output || 
    items.some((item: any) => 'confidence' in item || 'confianca' in item);
  rules.push({
    id: 'has_confidence',
    name: 'Confiança da estimativa',
    description: 'Deve indicar nível de confiança na análise',
    category: 'Qualidade',
    passed: hasConfidence,
    details: hasConfidence ? 'Confiança informada' : 'Confiança não informada',
    severity: 'info',
  });

  // Regra 7: Nome humanizado da refeição
  const mealName = output?.meal_name || output?.nome_refeicao || output?.title || output?.nome || output?.dish_name;
  rules.push({
    id: 'has_meal_name',
    name: 'Nome da refeição',
    description: 'Deve gerar um nome humanizado para a refeição',
    category: 'Qualidade',
    passed: typeof mealName === 'string' && mealName.length > 3,
    details: mealName ? `"${mealName}"` : 'Sem nome de refeição',
    severity: 'warning',
  });

  // Regra 8: Gramagens realistas (5g-2000g)
  const unrealisticGrams = items.filter((item: any) => {
    const g = item.grams || item.gramas || item.porcao_g || item.quantidade || 0;
    return g < 5 || g > 2000;
  });
  rules.push({
    id: 'realistic_grams',
    name: 'Gramagens realistas',
    description: 'Gramagens devem estar entre 5g e 2000g',
    category: 'Validação',
    passed: unrealisticGrams.length === 0,
    details: unrealisticGrams.length > 0 
      ? `${unrealisticGrams.length} itens com gramagem irreal`
      : 'OK',
    severity: 'warning',
  });
  
  // Regra 9: Detecção de produto embalado
  const packagedProductField = 'packagedProduct' in output || 'produto_embalado' in output || 'is_packaged' in output;
  rules.push({
    id: 'packaged_product_detection',
    name: 'Detecção de embalado',
    description: 'Deve detectar se é produto embalado para redirecionar',
    category: 'Segurança',
    passed: packagedProductField,
    details: packagedProductField ? 'Campo de detecção presente' : 'Campo packagedProduct ausente',
    severity: 'warning',
  });

  return rules;
}

function validateLabelPhotoOutput(output: any): ValidationRule[] {
  const rules: ValidationRule[] = [];
  
  // Regra 1: Estrutura JSON válida
  rules.push({
    id: 'json_structure',
    name: 'Estrutura JSON válida',
    description: 'O JSON deve ter campos de análise de rótulo',
    category: 'Formato dos Dados',
    passed: output && typeof output === 'object',
    details: `Campos: ${Object.keys(output || {}).join(', ')}`,
    severity: 'critical',
  });

  // Regra 2: Lista de ingredientes
  const ingredients = output?.ingredients || output?.ingredientes || output?.ingredient_list || [];
  rules.push({
    id: 'has_ingredients',
    name: 'Ingredientes extraídos',
    description: 'Deve extrair lista de ingredientes do rótulo',
    category: 'Extração',
    passed: Array.isArray(ingredients) && ingredients.length >= 1,
    details: `${ingredients.length} ingredientes encontrados`,
    severity: 'critical',
  });

  // Regra 3: Veredito de segurança
  const hasVerdict = 'is_safe' in output || 'seguro' in output || 'verdict' in output || 'veredito' in output || 'safe' in output;
  rules.push({
    id: 'has_verdict',
    name: 'Veredito de segurança',
    description: 'Deve indicar se o produto é seguro para o usuário',
    category: 'Segurança',
    passed: hasVerdict,
    details: hasVerdict ? 'Veredito presente' : 'Veredito ausente',
    severity: 'critical',
  });

  // Regra 4: Alertas de alérgenos
  const alerts = output?.alerts || output?.alertas || output?.allergen_alerts || output?.warnings || [];
  rules.push({
    id: 'allergen_detection',
    name: 'Detecção de alérgenos',
    description: 'Sistema de alertas de alérgenos funcionando',
    category: 'Segurança',
    passed: Array.isArray(alerts),
    details: `${alerts.length} alertas detectados`,
    severity: 'warning',
  });

  // Regra 5: Nome do produto
  const productName = output?.product_name || output?.nome_produto || output?.name || output?.nome;
  rules.push({
    id: 'has_product_name',
    name: 'Nome do produto',
    description: 'Deve identificar o nome do produto',
    category: 'Extração',
    passed: typeof productName === 'string' && productName.length > 2,
    details: productName ? `"${productName}"` : 'Não identificado',
    severity: 'warning',
  });

  // Regra 6: Selos de segurança reconhecidos
  const certifications = output?.certifications || output?.selos || output?.seals || [];
  rules.push({
    id: 'certifications_detected',
    name: 'Selos identificados',
    description: 'Capacidade de identificar selos de segurança (Zero Lactose, etc)',
    category: 'Extração',
    passed: true, // Não é obrigatório ter selos
    details: certifications.length > 0 
      ? `Selos: ${certifications.join(', ')}`
      : 'Nenhum selo detectado (OK)',
    severity: 'info',
  });

  // Regra 7: Confiança na análise
  const confidence = output?.confidence || output?.confianca;
  rules.push({
    id: 'has_confidence',
    name: 'Confiança da análise',
    description: 'Deve indicar nível de confiança',
    category: 'Qualidade',
    passed: confidence !== undefined,
    details: confidence ? `Confiança: ${confidence}` : 'Não informada',
    severity: 'info',
  });
  
  // Regra 8: País de origem detectado
  const originCountry = output?.origin_country || output?.pais_origem || output?.country;
  rules.push({
    id: 'has_origin_country',
    name: 'País de origem',
    description: 'Deve identificar país de origem do produto',
    category: 'Extração',
    passed: typeof originCountry === 'string' && originCountry.length >= 2,
    details: originCountry ? `País: ${originCountry}` : 'Não identificado',
    severity: 'info',
  });

  return rules;
}

function validateRecipeOutput(output: any): ValidationRule[] {
  const rules: ValidationRule[] = [];
  
  // Regra 1: Estrutura JSON válida
  rules.push({
    id: 'json_structure',
    name: 'Estrutura JSON válida',
    description: 'O JSON deve ter campos de receita',
    category: 'Formato dos Dados',
    passed: output && typeof output === 'object' && 
            ('name' in output || 'nome' in output || 'title' in output || 'recipe_name' in output),
    details: `Campos: ${Object.keys(output || {}).join(', ')}`,
    severity: 'critical',
  });

  // Regra 2: Nome da receita
  const name = output?.name || output?.nome || output?.title || output?.recipe_name || '';
  rules.push({
    id: 'has_name',
    name: 'Nome da receita',
    description: 'Receita deve ter um nome descritivo',
    category: 'Conteúdo',
    passed: typeof name === 'string' && name.length > 5,
    details: `"${name}"`,
    severity: 'critical',
  });

  // Regra 3: Lista de ingredientes
  const ingredients = output?.ingredients || output?.ingredientes || output?.foods || [];
  rules.push({
    id: 'has_ingredients',
    name: 'Lista de ingredientes',
    description: 'Receita deve ter ingredientes',
    category: 'Conteúdo',
    passed: Array.isArray(ingredients) && ingredients.length >= 2,
    details: `${ingredients.length} ingredientes`,
    severity: 'critical',
  });

  // Regra 4: Modo de preparo
  const instructions = output?.instructions || output?.modo_preparo || output?.passos || output?.steps || [];
  rules.push({
    id: 'has_instructions',
    name: 'Modo de preparo',
    description: 'Receita deve ter instruções de preparo',
    category: 'Conteúdo',
    passed: Array.isArray(instructions) && instructions.length >= 2,
    details: `${instructions.length} passos`,
    severity: 'critical',
  });

  // Regra 5: Informações nutricionais
  const hasNutrition = 
    (output?.calories || output?.calorias || output?.kcal) ||
    (output?.nutrition && Object.keys(output.nutrition).length > 0);
  rules.push({
    id: 'has_nutrition',
    name: 'Info nutricional',
    description: 'Receita deve ter informações nutricionais',
    category: 'Nutrição',
    passed: hasNutrition,
    details: hasNutrition ? 'Presente' : 'Ausente',
    severity: 'warning',
  });

  // Regra 6: Tempo de preparo
  const prepTime = output?.prep_time || output?.tempo_preparo || output?.preparation_time;
  rules.push({
    id: 'has_prep_time',
    name: 'Tempo de preparo',
    description: 'Receita deve indicar tempo de preparo',
    category: 'Conteúdo',
    passed: prepTime !== undefined && prepTime > 0,
    details: prepTime ? `${prepTime} min` : 'Não informado',
    severity: 'warning',
  });

  // Regra 7: Porções/rendimento
  const servings = output?.servings || output?.porcoes || output?.rendimento || output?.portions;
  rules.push({
    id: 'has_servings',
    name: 'Porções',
    description: 'Receita deve indicar rendimento',
    category: 'Conteúdo',
    passed: servings !== undefined,
    details: servings ? `${servings} porções` : 'Não informado',
    severity: 'info',
  });

  // Regra 8: Ingredientes com quantidades
  const ingredientsWithQty = ingredients.filter((i: any) => 
    (typeof i === 'object' && (i.quantity || i.quantidade || i.grams || i.gramas || i.amount)) ||
    (typeof i === 'string' && /\d/.test(i))
  );
  rules.push({
    id: 'ingredients_have_quantities',
    name: 'Quantidades definidas',
    description: 'Ingredientes devem ter quantidades',
    category: 'Qualidade',
    passed: ingredientsWithQty.length >= ingredients.length * 0.8,
    details: `${ingredientsWithQty.length}/${ingredients.length} com quantidades`,
    severity: 'warning',
  });

  return rules;
}

function validateChatOutput(output: any): ValidationRule[] {
  const rules: ValidationRule[] = [];
  
  // Regra 1: Resposta presente
  const response = output?.response || output?.resposta || output?.message || output?.content || output?.answer || '';
  rules.push({
    id: 'has_response',
    name: 'Resposta gerada',
    description: 'Deve gerar uma resposta',
    category: 'Resposta',
    passed: typeof response === 'string' && response.length > 10,
    details: response ? `${response.substring(0, 80)}...` : 'Sem resposta',
    severity: 'critical',
  });

  // Regra 2: Resposta não é erro
  const isError = /erro|error|falha|failed|exception/i.test(response);
  rules.push({
    id: 'not_error',
    name: 'Resposta válida',
    description: 'Resposta não deve ser mensagem de erro',
    category: 'Resposta',
    passed: !isError,
    details: isError ? 'Parece ser erro' : 'OK',
    severity: 'critical',
  });

  // Regra 3: Contexto mantido (se aplicável)
  const hasContext = output?.context || output?.contexto || output?.suggestions || output?.sugestoes;
  rules.push({
    id: 'maintains_context',
    name: 'Mantém contexto',
    description: 'Assistente deve manter contexto da conversa',
    category: 'Qualidade',
    passed: true, // Assumimos OK se não houver erro
    details: hasContext ? 'Contexto/sugestões presente' : 'Sem contexto adicional',
    severity: 'info',
  });

  // Regra 4: Resposta em português (se BR)
  const isPortuguese = /[áàâãéêíóôõúç]/i.test(response) || 
    /\b(de|para|com|que|não|sim|pode|como|você|seu|sua)\b/i.test(response);
  rules.push({
    id: 'correct_language',
    name: 'Idioma correto',
    description: 'Resposta deve estar no idioma do usuário',
    category: 'Localização',
    passed: isPortuguese,
    details: isPortuguese ? 'Português detectado' : 'Verificar idioma',
    severity: 'warning',
  });
  
  // Regra 5: Conteúdo relevante para nutrição
  const isNutritionRelated = /aliment|nutri|proteín|caloria|vitamina|mineral|dieta|refeição|saúde|emagrec|massa|gordura|carboidrato/i.test(response);
  rules.push({
    id: 'nutrition_relevant',
    name: 'Conteúdo relevante',
    description: 'Resposta deve ser relacionada a nutrição/alimentação',
    category: 'Qualidade',
    passed: isNutritionRelated,
    details: isNutritionRelated ? 'Conteúdo nutricional' : 'Verificar relevância',
    severity: 'info',
  });

  return rules;
}

function validateFridgeOutput(output: any): ValidationRule[] {
  const rules: ValidationRule[] = [];
  
  // Regra 1: Estrutura JSON
  rules.push({
    id: 'json_structure',
    name: 'Estrutura JSON válida',
    description: 'O JSON deve ter campos de análise de geladeira',
    category: 'Formato dos Dados',
    passed: output && typeof output === 'object',
    details: `Campos: ${Object.keys(output || {}).join(', ')}`,
    severity: 'critical',
  });

  // Regra 2: Ingredientes identificados
  const ingredients = output?.ingredients || output?.ingredientes || output?.items || output?.foods || [];
  rules.push({
    id: 'has_ingredients',
    name: 'Ingredientes identificados',
    description: 'Deve identificar ingredientes na geladeira',
    category: 'Detecção',
    passed: Array.isArray(ingredients) && ingredients.length >= 1,
    details: `${ingredients.length} ingredientes encontrados`,
    severity: 'critical',
  });

  // Regra 3: Sugestões de receitas
  const suggestions = output?.suggestions || output?.sugestoes || output?.recipes || output?.receitas || [];
  rules.push({
    id: 'has_suggestions',
    name: 'Sugestões de receitas',
    description: 'Deve sugerir receitas com os ingredientes',
    category: 'Sugestões',
    passed: Array.isArray(suggestions),
    details: `${suggestions.length} sugestões`,
    severity: 'warning',
  });

  // Regra 4: Segurança validada
  const hasSafety = 'safe_ingredients' in output || 'ingredientes_seguros' in output ||
    ingredients.some((i: any) => typeof i === 'object' && ('is_safe' in i || 'seguro' in i || 'safe' in i));
  rules.push({
    id: 'safety_validated',
    name: 'Segurança validada',
    description: 'Ingredientes devem ser validados contra intolerâncias',
    category: 'Segurança',
    passed: hasSafety,
    details: hasSafety ? 'Segurança validada' : 'Sem validação de segurança',
    severity: 'warning',
  });
  
  // Regra 5: Categorização de ingredientes
  const hasCategories = ingredients.some((i: any) => 
    typeof i === 'object' && (i.category || i.categoria || i.type || i.tipo)
  );
  rules.push({
    id: 'has_categories',
    name: 'Categorização',
    description: 'Ingredientes devem ter categorias (proteína, vegetal, etc)',
    category: 'Qualidade',
    passed: hasCategories,
    details: hasCategories ? 'Categorias presentes' : 'Sem categorização',
    severity: 'info',
  });

  return rules;
}

function validateMealRegenerationOutput(output: any): ValidationRule[] {
  const rules: ValidationRule[] = [];
  
  // Regra 1: Estrutura JSON
  rules.push({
    id: 'json_structure',
    name: 'Estrutura JSON válida',
    description: 'O JSON deve ter campos de refeição',
    category: 'Formato dos Dados',
    passed: output && typeof output === 'object' && 
            ('title' in output || 'nome' in output || 'recipe_name' in output || 'name' in output),
    details: `Campos: ${Object.keys(output || {}).join(', ')}`,
    severity: 'critical',
  });

  // Regra 2: Nome da refeição
  const name = output?.title || output?.nome || output?.recipe_name || output?.name || '';
  rules.push({
    id: 'has_name',
    name: 'Nome da refeição',
    description: 'Refeição regenerada deve ter nome',
    category: 'Conteúdo',
    passed: typeof name === 'string' && name.length > 3,
    details: `"${name}"`,
    severity: 'critical',
  });

  // Regra 3: Alimentos presentes
  const foods = output?.foods || output?.alimentos || output?.ingredients || output?.ingredientes || [];
  rules.push({
    id: 'has_foods',
    name: 'Alimentos presentes',
    description: 'Refeição deve ter lista de alimentos',
    category: 'Conteúdo',
    passed: Array.isArray(foods) && foods.length >= 1,
    details: `${foods.length} alimentos`,
    severity: 'critical',
  });

  // Regra 4: Calorias
  const calories = output?.calories || output?.calorias || output?.calories_kcal || output?.kcal;
  rules.push({
    id: 'has_calories',
    name: 'Calorias definidas',
    description: 'Refeição deve ter calorias',
    category: 'Nutrição',
    passed: typeof calories === 'number' && calories > 0,
    details: calories ? `${calories} kcal` : 'Não definido',
    severity: 'warning',
  });

  // Regra 5: Macros completos
  const hasProtein = output?.protein !== undefined || output?.proteina !== undefined;
  const hasCarbs = output?.carbs !== undefined || output?.carboidratos !== undefined;
  const hasFat = output?.fat !== undefined || output?.gordura !== undefined;
  const hasMacros = hasProtein && hasCarbs && hasFat;
  rules.push({
    id: 'has_macros',
    name: 'Macros completos',
    description: 'Deve ter proteína, carboidratos e gordura',
    category: 'Nutrição',
    passed: hasMacros,
    details: hasMacros ? 'P/C/G presentes' : 'Macros incompletos',
    severity: 'warning',
  });
  
  // Regra 6: Instruções de preparo
  const instructions = output?.instructions || output?.instrucoes || output?.modo_preparo || output?.tips || [];
  rules.push({
    id: 'has_instructions',
    name: 'Instruções de preparo',
    description: 'Deve ter instruções ou dicas de preparo',
    category: 'Conteúdo',
    passed: (Array.isArray(instructions) && instructions.length > 0) || typeof instructions === 'string',
    details: Array.isArray(instructions) ? `${instructions.length} instruções` : (instructions ? 'Instruções presentes' : 'Sem instruções'),
    severity: 'warning',
  });

  return rules;
}

function validateMealPlanOutput(output: any): ValidationRule[] {
  const rules: ValidationRule[] = [];
  
  // Regra 1: Estrutura JSON
  rules.push({
    id: 'json_structure',
    name: 'Estrutura JSON válida',
    description: 'O JSON deve ter campos de refeição do plano',
    category: 'Formato dos Dados',
    passed: output && typeof output === 'object',
    details: `Campos: ${Object.keys(output || {}).join(', ')}`,
    severity: 'critical',
  });

  // Regra 2: Nome da refeição
  const name = output?.title || output?.nome || output?.recipe_name || output?.name || '';
  rules.push({
    id: 'has_name',
    name: 'Nome da refeição',
    description: 'Refeição do plano deve ter nome',
    category: 'Conteúdo',
    passed: typeof name === 'string' && name.length > 3,
    details: `"${name}"`,
    severity: 'critical',
  });

  // Regra 3: Alimentos presentes
  const foods = output?.foods || output?.alimentos || output?.ingredients || output?.ingredientes || [];
  rules.push({
    id: 'has_foods',
    name: 'Alimentos presentes',
    description: 'Refeição deve ter lista de alimentos',
    category: 'Conteúdo',
    passed: Array.isArray(foods) && foods.length >= 1,
    details: `${foods.length} alimentos`,
    severity: 'critical',
  });

  // Regra 4: Calorias
  const calories = output?.calories || output?.calorias || output?.calories_kcal || output?.kcal;
  rules.push({
    id: 'has_calories',
    name: 'Calorias definidas',
    description: 'Refeição deve ter calorias',
    category: 'Nutrição',
    passed: typeof calories === 'number' && calories > 0,
    details: calories ? `${calories} kcal` : 'Não definido',
    severity: 'warning',
  });

  // Regra 5: Macros
  const hasProtein = output?.protein !== undefined || output?.proteina !== undefined;
  const hasCarbs = output?.carbs !== undefined || output?.carboidratos !== undefined;
  const hasFat = output?.fat !== undefined || output?.gordura !== undefined;
  const hasMacros = hasProtein && hasCarbs && hasFat;
  rules.push({
    id: 'has_macros',
    name: 'Macros completos',
    description: 'Deve ter proteína, carboidratos e gordura',
    category: 'Nutrição',
    passed: hasMacros,
    details: hasMacros ? 'P/C/G presentes' : 'Macros incompletos',
    severity: 'warning',
  });

  // Regra 6: Tempo de preparo
  const prepTime = output?.prep_time || output?.tempo_preparo || output?.preparation_time;
  rules.push({
    id: 'has_prep_time',
    name: 'Tempo de preparo',
    description: 'Refeição deve indicar tempo de preparo',
    category: 'Conteúdo',
    passed: prepTime !== undefined && prepTime > 0,
    details: prepTime ? `${prepTime} min` : 'Não informado',
    severity: 'info',
  });

  // Regra 7: Instruções humanizadas
  const instructions = output?.instructions || output?.instrucoes || output?.modo_preparo || [];
  const hasInstructions = (Array.isArray(instructions) && instructions.length > 0) || typeof instructions === 'string';
  rules.push({
    id: 'has_instructions',
    name: 'Instruções de preparo',
    description: 'Deve ter instruções humanizadas',
    category: 'Conteúdo',
    passed: hasInstructions,
    details: hasInstructions ? 'Instruções presentes' : 'Sem instruções',
    severity: 'warning',
  });

  return rules;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { moduleId, testMode, testParams } = await req.json();
    
    // Se for apenas listar módulos
    if (testMode === 'list-modules') {
      return new Response(
        JSON.stringify({ modules: AI_MODULES }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se for apenas preview do prompt - buscar prompt HARDCODED real
    if (testMode === 'preview') {
      try {
        // Buscar do get-hardcoded-prompts para mostrar o prompt REAL
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        const hardcodedResponse = await fetch(
          `${supabaseUrl}/functions/v1/get-hardcoded-prompts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ moduleId })
          }
        );
        
        if (hardcodedResponse.ok) {
          const hardcodedData = await hardcodedResponse.json();
          return new Response(
            JSON.stringify({ 
              promptPreview: hardcodedData.systemPrompt || 'Prompt não encontrado',
              model: hardcodedData.model || 'gemini-2.0-flash-lite',
              description: hardcodedData.description || '',
              isHardcoded: true,
              note: '⚠️ Este é o prompt REAL hardcoded na edge function, não o do banco de dados.'
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (err) {
        console.error('[test-all-prompts] Failed to fetch hardcoded prompt:', err);
        return new Response(
          JSON.stringify({ 
            error: `Prompt hardcoded não encontrado para "${moduleId}". Verifique get-hardcoded-prompts.`,
            availableModules: Object.keys(AI_MODULES)
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ========== EXECUÇÃO REAL: USAR 100% HARDCODED ==========
    // Buscar prompt hardcoded (NUNCA do banco de dados)
    let promptConfig: { systemPrompt: string; model: string; description: string } | null = null;
    
    try {
      const hardcodedResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/get-hardcoded-prompts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify({ moduleId })
        }
      );
      
      if (hardcodedResponse.ok) {
        const data = await hardcodedResponse.json();
        if (data.systemPrompt) {
          promptConfig = {
            systemPrompt: data.systemPrompt,
            model: data.model,
            description: data.description
          };
          console.log(`[test-all-prompts] ✅ Using HARDCODED prompt for ${moduleId}`);
        }
      }
    } catch (err) {
      console.error('[test-all-prompts] Failed to fetch hardcoded prompt:', err);
    }
    
    if (!promptConfig) {
      return new Response(
        JSON.stringify({ 
          error: `Prompt hardcoded não encontrado para "${moduleId}". Adicione em get-hardcoded-prompts.`,
          note: '⚠️ Sistema configurado para usar APENAS prompts hardcoded (não banco de dados)'
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const moduleInfo = AI_MODULES[moduleId as keyof typeof AI_MODULES];
    const startTime = Date.now();
    
    let generatedOutput: any = {};
    let rawAIResponse = '';
    let rules: ValidationRule[] = [];

    // Verificar se módulo requer imagem e se foi fornecida
    const requiresImage = moduleInfo?.requiresImage || false;
    const imageBase64 = testParams?.imageBase64;
    
    if (requiresImage && !imageBase64) {
      // Retornar resultado indicando que imagem é necessária
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Este módulo requer uma imagem para teste. Faça upload de uma imagem.',
          moduleId,
          moduleName: moduleInfo?.name || moduleId,
          requiresImage: true,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      // Buscar API key do Gemini
      const apiKey = await getGeminiApiKey();
      
      // Construir user prompt baseado no módulo
      const userPrompt = buildUserPrompt(moduleId, testParams);
      
      console.log(`[test-all-prompts] Testing module: ${moduleId}`);
      console.log(`[test-all-prompts] System prompt length: ${promptConfig.systemPrompt.length}`);
      console.log(`[test-all-prompts] User prompt: ${userPrompt.substring(0, 200)}...`);
      
      // Chamar Gemini API com o prompt HARDCODED (não do banco)
      const { response, rawResponse } = await callGeminiAPI(
        apiKey,
        promptConfig.model,
        promptConfig.systemPrompt,
        userPrompt,
        imageBase64
      );
      
      rawAIResponse = response;
      generatedOutput = parseAIResponse(response);
      
      console.log(`[test-all-prompts] Parsed output keys: ${Object.keys(generatedOutput).join(', ')}`);
      
    } catch (apiError) {
      console.error(`[test-all-prompts] API error:`, apiError);
      
      // Retornar erro de API mas ainda mostrar info do prompt
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro na chamada à IA: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`,
          promptPreview: promptConfig.systemPrompt?.substring(0, 500) + '...',
          model: promptConfig.model,
          moduleId,
          moduleName: moduleInfo?.name || moduleId,
          timestamp: new Date().toISOString(),
          isHardcoded: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aplicar validação baseada no tipo de módulo
    switch (moduleId) {
      case 'analyze-food-photo':
        rules = validateFoodPhotoOutput(generatedOutput);
        break;
        
      case 'analyze-label-photo':
        rules = validateLabelPhotoOutput(generatedOutput);
        break;
        
      case 'generate-recipe':
        rules = validateRecipeOutput(generatedOutput);
        break;
        
      case 'chat-assistant':
        rules = validateChatOutput(generatedOutput);
        break;
        
      case 'analyze-fridge-photo':
        rules = validateFridgeOutput(generatedOutput);
        break;
        
      case 'regenerate-meal':
        rules = validateMealRegenerationOutput(generatedOutput);
        break;
        
      case 'generate-ai-meal-plan':
        rules = validateMealPlanOutput(generatedOutput);
        break;
        
      default:
        rules = [{
          id: 'unknown_module',
          name: 'Módulo desconhecido',
          description: 'Não há regras de validação para este módulo',
          category: 'Sistema',
          passed: false,
          details: `Módulo: ${moduleId}`,
          severity: 'critical',
        }];
    }

    // Regra adicional: verificar se houve erro de parsing
    if (generatedOutput?.parse_error) {
      rules.unshift({
        id: 'json_parse',
        name: 'Parse JSON',
        description: 'A resposta da IA deve ser JSON válido',
        category: 'Formato dos Dados',
        passed: false,
        details: 'Resposta não é JSON válido',
        severity: 'critical',
      });
    }

    // Calcular categorias
    const categories: Record<string, { total: number; passed: number; failed: number }> = {};
    rules.forEach(rule => {
      if (!categories[rule.category]) {
        categories[rule.category] = { total: 0, passed: 0, failed: 0 };
      }
      categories[rule.category].total++;
      if (rule.passed) {
        categories[rule.category].passed++;
      } else {
        categories[rule.category].failed++;
      }
    });

    const passedRules = rules.filter(r => r.passed).length;
    const failedRules = rules.filter(r => !r.passed).length;
    const executionTimeMs = Date.now() - startTime;

    const result: ValidationResult = {
      success: failedRules === 0,
      totalRules: rules.length,
      passedRules,
      failedRules,
      rules,
      generatedOutput,
      promptPreview: promptConfig.systemPrompt?.substring(0, 500) + '...',
      rawAIResponse,
      timestamp: new Date().toISOString(),
      categories,
      moduleId,
      moduleName: moduleInfo?.name || moduleId,
      executionTimeMs,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

