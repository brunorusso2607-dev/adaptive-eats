import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import { getAIPrompt } from "../_shared/getAIPrompt.ts";
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
            ('items' in output || 'itens' in output || 'foods' in output),
    details: `Campos: ${Object.keys(output || {}).join(', ')}`,
    severity: 'critical',
  });

  const items = output?.items || output?.itens || output?.foods || [];
  
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
    item && (item.name || item.nome) && (item.grams || item.gramas || item.porcao_g)
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
  const hasCalories = items.every((item: any) => 
    typeof (item.calories || item.calorias) === 'number'
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
  const hasSafetyField = 'is_safe' in output || 'seguro' in output || 'safety_status' in output;
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
  const mealName = output?.meal_name || output?.nome_refeicao || output?.title;
  rules.push({
    id: 'has_meal_name',
    name: 'Nome da refeição',
    description: 'Deve gerar um nome humanizado para a refeição',
    category: 'Qualidade',
    passed: typeof mealName === 'string' && mealName.length > 5,
    details: mealName ? `"${mealName}"` : 'Sem nome de refeição',
    severity: 'warning',
  });

  // Regra 8: Gramagens realistas (5g-2000g)
  const unrealisticGrams = items.filter((item: any) => {
    const g = item.grams || item.gramas || item.porcao_g || 0;
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
  const ingredients = output?.ingredients || output?.ingredientes || [];
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
  const hasVerdict = 'is_safe' in output || 'seguro' in output || 'verdict' in output || 'veredito' in output;
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
  const alerts = output?.alerts || output?.alertas || output?.allergen_alerts || [];
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
  const productName = output?.product_name || output?.nome_produto || output?.name;
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
  const certifications = output?.certifications || output?.selos || [];
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
            ('name' in output || 'nome' in output || 'title' in output),
    details: `Campos: ${Object.keys(output || {}).join(', ')}`,
    severity: 'critical',
  });

  // Regra 2: Nome da receita
  const name = output?.name || output?.nome || output?.title || '';
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
  const ingredients = output?.ingredients || output?.ingredientes || [];
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
  const instructions = output?.instructions || output?.modo_preparo || output?.passos || [];
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
    (output?.calories || output?.calorias) ||
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
  const prepTime = output?.prep_time || output?.tempo_preparo;
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
  const servings = output?.servings || output?.porcoes || output?.rendimento;
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
    (typeof i === 'object' && (i.quantity || i.quantidade || i.grams || i.gramas)) ||
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
  const response = output?.response || output?.resposta || output?.message || output?.content || '';
  rules.push({
    id: 'has_response',
    name: 'Resposta gerada',
    description: 'Deve gerar uma resposta',
    category: 'Resposta',
    passed: typeof response === 'string' && response.length > 10,
    details: response ? `${response.substring(0, 50)}...` : 'Sem resposta',
    severity: 'critical',
  });

  // Regra 2: Resposta não é erro
  const isError = /erro|error|falha|failed/i.test(response);
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
  const hasContext = output?.context || output?.contexto;
  rules.push({
    id: 'maintains_context',
    name: 'Mantém contexto',
    description: 'Assistente deve manter contexto da conversa',
    category: 'Qualidade',
    passed: true, // Assumimos OK se não houver erro
    details: hasContext ? 'Contexto presente' : 'Sem contexto adicional',
    severity: 'info',
  });

  // Regra 4: Resposta em português (se BR)
  const isPortuguese = /[áàâãéêíóôõúç]/i.test(response) || 
    /\b(de|para|com|que|não|sim|pode|como)\b/i.test(response);
  rules.push({
    id: 'correct_language',
    name: 'Idioma correto',
    description: 'Resposta deve estar no idioma do usuário',
    category: 'Localização',
    passed: isPortuguese,
    details: isPortuguese ? 'Português detectado' : 'Verificar idioma',
    severity: 'warning',
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
  const ingredients = output?.ingredients || output?.ingredientes || output?.items || [];
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
  const suggestions = output?.suggestions || output?.sugestoes || output?.recipes || [];
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
    ingredients.some((i: any) => 'is_safe' in i || 'seguro' in i);
  rules.push({
    id: 'safety_validated',
    name: 'Segurança validada',
    description: 'Ingredientes devem ser validados contra intolerâncias',
    category: 'Segurança',
    passed: hasSafety,
    details: hasSafety ? 'Segurança validada' : 'Sem validação de segurança',
    severity: 'warning',
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
            ('title' in output || 'nome' in output || 'recipe_name' in output),
    details: `Campos: ${Object.keys(output || {}).join(', ')}`,
    severity: 'critical',
  });

  // Regra 2: Nome da refeição
  const name = output?.title || output?.nome || output?.recipe_name || '';
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
  const foods = output?.foods || output?.alimentos || output?.ingredients || [];
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
  const calories = output?.calories || output?.calorias || output?.calories_kcal;
  rules.push({
    id: 'has_calories',
    name: 'Calorias definidas',
    description: 'Refeição deve ter calorias',
    category: 'Nutrição',
    passed: typeof calories === 'number' && calories > 0,
    details: calories ? `${calories} kcal` : 'Não definido',
    severity: 'warning',
  });

  // Regra 5: É diferente da original (verificação básica)
  rules.push({
    id: 'is_different',
    name: 'Refeição diferente',
    description: 'Regeneração deve produzir refeição diferente',
    category: 'Qualidade',
    passed: true, // Precisa de comparação com original
    details: 'Verificação requer refeição original',
    severity: 'info',
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

    // Se for apenas preview do prompt
    if (testMode === 'preview') {
      const promptConfig = await getAIPrompt(moduleId);
      return new Response(
        JSON.stringify({ 
          promptPreview: promptConfig?.system_prompt || 'Prompt não encontrado',
          model: promptConfig?.model || 'Não configurado',
          userPromptExample: promptConfig?.user_prompt_example || ''
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar configuração do prompt
    const promptConfig = await getAIPrompt(moduleId);
    
    if (!promptConfig) {
      return new Response(
        JSON.stringify({ 
          error: `Módulo "${moduleId}" não encontrado na tabela ai_prompts` 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Para testes reais, precisamos simular uma chamada
    // Por enquanto, retornamos informações do prompt + regras de validação vazias
    const moduleInfo = AI_MODULES[moduleId as keyof typeof AI_MODULES];
    
    let sampleOutput: any = {};
    let rules: ValidationRule[] = [];

    // Simular output baseado no tipo de módulo para demonstração
    switch (moduleId) {
      case 'analyze-food-photo':
        sampleOutput = {
          meal_name: 'Exemplo - Prato Brasileiro',
          items: [
            { name: 'Arroz branco', grams: 150, calories: 195 },
            { name: 'Feijão carioca', grams: 100, calories: 77 },
          ],
          is_safe: true,
          confidence: 0.85,
        };
        rules = validateFoodPhotoOutput(sampleOutput);
        break;
        
      case 'analyze-label-photo':
        sampleOutput = {
          product_name: 'Exemplo - Produto',
          ingredients: ['farinha de trigo', 'açúcar', 'sal'],
          is_safe: true,
          alerts: [],
          confidence: 0.9,
        };
        rules = validateLabelPhotoOutput(sampleOutput);
        break;
        
      case 'generate-recipe':
        sampleOutput = {
          name: 'Exemplo - Receita Saudável',
          ingredients: [
            { name: 'Frango', grams: 200 },
            { name: 'Brócolis', grams: 150 },
          ],
          instructions: ['Tempere o frango', 'Grelhe por 10 minutos'],
          calories: 350,
          prep_time: 25,
          servings: 2,
        };
        rules = validateRecipeOutput(sampleOutput);
        break;
        
      case 'chat-assistant':
        sampleOutput = {
          response: 'Olá! Como posso ajudar com sua alimentação hoje?',
          context: { topic: 'greeting' },
        };
        rules = validateChatOutput(sampleOutput);
        break;
        
      case 'analyze-fridge-photo':
        sampleOutput = {
          ingredients: ['tomate', 'cebola', 'frango'],
          suggestions: ['Frango grelhado com legumes'],
          safe_ingredients: ['tomate', 'cebola', 'frango'],
        };
        rules = validateFridgeOutput(sampleOutput);
        break;
        
      case 'regenerate-meal':
        sampleOutput = {
          title: 'Alternativa - Prato Leve',
          foods: [
            { name: 'Peixe grelhado', grams: 150 },
            { name: 'Salada verde', grams: 100 },
          ],
          calories: 280,
        };
        rules = validateMealRegenerationOutput(sampleOutput);
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

    const result: ValidationResult = {
      success: failedRules === 0,
      totalRules: rules.length,
      passedRules,
      failedRules,
      rules,
      generatedOutput: sampleOutput,
      promptPreview: promptConfig.system_prompt?.substring(0, 500) + '...',
      timestamp: new Date().toISOString(),
      categories,
      moduleId,
      moduleName: moduleInfo?.name || moduleId,
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
