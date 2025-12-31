import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import {
  getMasterMealPromptV5,
  getRegionalConfig,
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
  passed: boolean;
  details?: string;
}

interface ValidationResult {
  success: boolean;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  rules: ValidationRule[];
  generatedMeal: any;
  promptPreview: string;
  timestamp: string;
}

// Regras de validação do formato
function validateMealFormat(meal: any): ValidationRule[] {
  const rules: ValidationRule[] = [];
  
  // Regra 1: Título não pode ser lista de ingredientes
  const titleIsIngredientList = /^[A-Za-zÀ-ú\s]+ e [A-Za-zÀ-ú\s]+$/.test(meal.title || '') && 
    (meal.title || '').split(' e ').length === 2 &&
    (meal.title || '').length < 30;
  
  rules.push({
    id: 'title_not_ingredient_list',
    name: 'Título é prato, não lista',
    description: 'O título deve descrever um prato, não listar ingredientes (ex: "Tofu e Sal" é errado)',
    passed: !titleIsIngredientList && (meal.title || '').length > 10,
    details: `Título: "${meal.title}"`,
  });
  
  // Regra 2: Foods não pode ter temperos/condimentos soltos
  const forbiddenSoloItems = ['sal', 'azeite', 'limão', 'suco de limão', 'pimenta', 'orégano', 'alho'];
  const hasSoloCondiment = (meal.foods || []).some((food: any) => {
    const name = (food.name || '').toLowerCase();
    return forbiddenSoloItems.some(item => 
      name === item || 
      (name.includes(item) && food.grams < 20 && !name.includes('com'))
    );
  });
  
  rules.push({
    id: 'no_solo_condiments',
    name: 'Sem condimentos soltos',
    description: 'Sal, azeite, limão etc. devem estar DENTRO do nome do prato, não como item separado',
    passed: !hasSoloCondiment,
    details: hasSoloCondiment ? `Encontrado condimento solto nos foods` : 'OK',
  });
  
  // Regra 3: Pratos únicos devem estar consolidados (sopas, omeletes, etc)
  const isPratoUnico = /sopa|caldo|omelete|wrap|sanduíche|bowl|vitamina|mingau/i.test(meal.title || '');
  const hasTooManyItems = (meal.foods || []).filter((f: any) => 
    !/água|suco zero|refrigerante zero|sobremesa|opcional/i.test(f.name || '')
  ).length > 2;
  
  rules.push({
    id: 'consolidated_single_dish',
    name: 'Prato único consolidado',
    description: 'Sopas, omeletes, bowls etc. devem ter 1 item principal + bebida opcional',
    passed: !isPratoUnico || !hasTooManyItems,
    details: isPratoUnico && hasTooManyItems 
      ? `Prato único com ${(meal.foods || []).length} itens (esperado: 1-2)` 
      : 'OK',
  });
  
  // Regra 4: Dicas devem ter pelo menos 2 passos
  const instructionsCount = (meal.instructions || []).length;
  rules.push({
    id: 'min_instructions',
    name: 'Mínimo 2 dicas',
    description: 'Dicas de preparo devem ter pelo menos 2 passos',
    passed: instructionsCount >= 2,
    details: `${instructionsCount} dicas encontradas`,
  });
  
  // Regra 5: Primeira dica deve listar ingredientes
  const firstInstruction = (meal.instructions || [])[0] || '';
  const hasIngredientList = /ingredientes?:|use|^ingredientes/i.test(firstInstruction) ||
    /\(\d+g\)/.test(firstInstruction);
  
  rules.push({
    id: 'first_tip_has_ingredients',
    name: 'Primeira dica lista ingredientes',
    description: 'A primeira dica deve listar os ingredientes com gramagens',
    passed: hasIngredientList,
    details: firstInstruction.substring(0, 80) + '...',
  });
  
  // Regra 6: Dicas não podem ser vagas (menos de 20 chars)
  const hasVagueInstruction = (meal.instructions || []).some((inst: string) => 
    inst.length < 20 || /^(sirva|adicione|misture)\.?$/i.test(inst.trim())
  );
  
  rules.push({
    id: 'no_vague_instructions',
    name: 'Sem dicas vagas',
    description: 'Dicas não podem ser muito curtas ou genéricas como "Sirva."',
    passed: !hasVagueInstruction,
    details: hasVagueInstruction ? 'Encontrada dica vaga ou muito curta' : 'OK',
  });
  
  // Regra 7: Foods deve ter pelo menos 1 item
  rules.push({
    id: 'has_foods',
    name: 'Tem alimentos',
    description: 'A refeição deve ter pelo menos 1 alimento',
    passed: (meal.foods || []).length >= 1,
    details: `${(meal.foods || []).length} alimentos`,
  });
  
  // Regra 8: Cada food deve ter name e grams
  const allFoodsComplete = (meal.foods || []).every((f: any) => 
    f.name && typeof f.name === 'string' && f.name.length > 2 &&
    f.grams && typeof f.grams === 'number' && f.grams > 0
  );
  
  rules.push({
    id: 'foods_complete',
    name: 'Foods completos',
    description: 'Cada alimento deve ter name (string) e grams (number > 0)',
    passed: allFoodsComplete,
    details: allFoodsComplete ? 'OK' : 'Algum food está incompleto',
  });
  
  // Regra 9: Calorias devem ser realistas
  const calories = meal.calories_kcal || 0;
  rules.push({
    id: 'realistic_calories',
    name: 'Calorias realistas',
    description: 'Calorias devem estar entre 100 e 1000 para uma refeição',
    passed: calories >= 100 && calories <= 1000,
    details: `${calories} kcal`,
  });
  
  return rules;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mealType = 'almoco', countryCode = 'BR', testMode = 'quick' } = await req.json().catch(() => ({}));
    
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
        intolerances: [],
        dietaryPreference: 'omnivora',
        excludedIngredients: [],
        goal: 'manter_peso',
      },
      dayNumber: 1,
      dayName: 'Segunda-feira',
      regional,
      countryCode,
    };
    
    const masterPrompt = getMasterMealPromptV5(promptParams);
    
    // Preview do prompt (primeiros 2000 chars)
    const promptPreview = masterPrompt.substring(0, 2000) + '\n\n[... truncado para preview ...]';
    
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
Responda SOMENTE com o JSON da opção, sem markdown, sem explicações.

Formato esperado:
{
  "title": "Nome do prato",
  "foods": [{"name": "alimento", "grams": 100}],
  "calories_kcal": 500,
  "instructions": ["Dica 1", "Dica 2", "Dica 3"]
}`;

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
    
    // Limpar e parsear JSON
    let generatedMeal: any;
    try {
      const cleanJson = rawText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      generatedMeal = JSON.parse(cleanJson);
    } catch (e) {
      console.error('[PROMPT-VALIDATION] Failed to parse AI response:', rawText.substring(0, 500));
      return new Response(JSON.stringify({
        success: false,
        error: 'Falha ao parsear resposta da IA',
        rawResponse: rawText.substring(0, 500),
        promptPreview,
        timestamp: new Date().toISOString(),
      }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    // Executar validações
    const rules = validateMealFormat(generatedMeal);
    const passedRules = rules.filter(r => r.passed).length;
    const failedRules = rules.filter(r => !r.passed).length;
    
    const result: ValidationResult = {
      success: failedRules === 0,
      totalRules: rules.length,
      passedRules,
      failedRules,
      rules,
      generatedMeal,
      promptPreview,
      timestamp: new Date().toISOString(),
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
