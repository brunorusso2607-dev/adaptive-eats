/**
 * UNIFIED MEAL CORE - PONTO DE ENTRADA ÚNICO
 * 
 * TODOS os geradores DEVEM usar APENAS estas funções.
 * Nenhuma lógica de formatação/ordenação/validação fora deste módulo.
 */

import { 
  UnifiedComponent, 
  UnifiedMeal, 
  ProcessingResult, 
  UserContext,
  MealType,
  MealSource,
  MealTotals,
} from './types.ts';

import { formatPortion, humanizeIngredientName, humanizeMealName } from './portion-formatter.ts';
import { sortComponentsBR, categorizeByName } from './meal-sorter.ts';
import { validateCoherence } from './coherence-validator.ts';
import { validateSafety } from './safety-validator.ts';
import { calculateMacros } from './macro-calculator.ts';
import { getEmergencyFallback } from './fallback-meals.ts';
import { loadSafetyDatabase, type SafetyDatabase } from '../globalSafetyEngine.ts';
import { INGREDIENTS } from '../meal-ingredients-db.ts';
import { getMealMacroTargets, type MealMacroTarget } from '../nutritionalCalculations.ts';
import type { MacroTargets } from './types.ts';
import { validateCulturalRules, applyCompositeRules, checkRequiredCombinations } from './cultural-rules.ts';

// ============= CACHE DO SAFETY DATABASE =============
let cachedSafetyDb: SafetyDatabase | null = null;

async function getSafetyDb(): Promise<SafetyDatabase> {
  if (!cachedSafetyDb) {
    cachedSafetyDb = await loadSafetyDatabase();
  }
  return cachedSafetyDb;
}

// ============= INTERFACE DE ENTRADA CRUA =============
export interface RawComponent {
  name: string;               // Nome do ingrediente (qualquer idioma)
  name_en?: string;           // Nome em inglês (opcional)
  grams: number;              // Porção em gramas
  ingredient_key?: string;    // Key do ingrediente (opcional)
  type?: string;              // Tipo do componente (opcional)
  // Campos opcionais que podem vir de diferentes fontes
  portion_label?: string;
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

// ============= FUNÇÃO PRINCIPAL: PROCESSAR REFEIÇÃO =============
/**
 * FUNÇÃO PRINCIPAL - Todos os geradores chamam esta função
 * 
 * Recebe componentes "crus" de qualquer fonte (IA, direto, pool)
 * Retorna refeição unificada, formatada, ordenada e validada
 */
export async function processRawMeal(
  rawComponents: RawComponent[],
  mealType: MealType,
  mealName: string,
  userContext: UserContext,
  source: MealSource,
): Promise<ProcessingResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  let fallbackUsed = false;
  let removedIngredientNames: string[] = []; // Rastrear ingredientes removidos para atualizar nome
  
  console.log(`[UNIFIED-CORE] ========== PROCESSANDO: ${mealName} ==========`);
  console.log(`[UNIFIED-CORE] MealType: ${mealType}, Source: ${JSON.stringify(source)}`);
  console.log(`[UNIFIED-CORE] RawComponents: ${rawComponents.length}`);
  
  try {
    // ============= PASSO 1: CARREGAR SAFETY DATABASE =============
    const safetyDb = await getSafetyDb();
    console.log(`[UNIFIED-CORE] PASSO 1: SafetyDB carregado`);
    
    // ============= PASSO 2: VALIDAR INPUTS =============
    if (!rawComponents || rawComponents.length === 0) {
      console.error(`[UNIFIED-CORE] ❌ PASSO 2: Componentes vazios!`);
      throw new Error('Componentes vazios');
    }
    console.log(`[UNIFIED-CORE] PASSO 2: Inputs válidos (${rawComponents.length} componentes)`);
    
    // ============= PASSO 3: CONVERTER PARA COMPONENTES UNIFICADOS =============
    const unifiedComponents: UnifiedComponent[] = [];
    
    for (const raw of rawComponents) {
      // FILTRAR ingredientes com nomes inválidos/genéricos
      const rawNameLower = raw.name.toLowerCase().trim();
      if (INVALID_INGREDIENT_NAMES.some(invalid => rawNameLower === invalid || rawNameLower.includes(invalid))) {
        warnings.push(`Ingrediente removido (nome inválido): ${raw.name}`);
        console.warn(`[UNIFIED-CORE] PASSO 3: Ingrediente inválido removido: ${raw.name}`);
        continue; // Pular este ingrediente
      }
      
      try {
        const unified = await convertToUnified(raw, userContext, safetyDb);
        unifiedComponents.push(unified);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        warnings.push(`Componente ignorado: ${raw.name} - ${errorMsg}`);
        console.warn(`[UNIFIED-CORE] PASSO 3: Componente ignorado: ${raw.name} - ${errorMsg}`);
      }
    }
    
    console.log(`[UNIFIED-CORE] PASSO 3: ${unifiedComponents.length} componentes convertidos de ${rawComponents.length}`);
    
    if (unifiedComponents.length === 0) {
      console.error(`[UNIFIED-CORE] ❌ PASSO 3: Nenhum componente válido após conversão!`);
      throw new Error('Nenhum componente válido após conversão');
    }
    
    // ============= PASSO 4: VALIDAR SEGURANÇA =============
    const safetyResult = await validateSafety(unifiedComponents, userContext, safetyDb);
    console.log(`[UNIFIED-CORE] PASSO 4: Segurança - isSafe=${safetyResult.isSafe}, blocked=${safetyResult.blockedComponents.length}`);
    
    if (!safetyResult.isSafe) {
      console.warn(`[UNIFIED-CORE] PASSO 4: Componentes bloqueados: ${safetyResult.blockedComponents.join(', ')}`);
      console.warn(`[UNIFIED-CORE] PASSO 4: Razões: ${safetyResult.reasons.join(', ')}`);
      
      // Capturar nomes dos ingredientes que serão removidos (para atualizar o nome da refeição)
      const blockedComponents = unifiedComponents.filter(c => 
        safetyResult.blockedComponents.includes(c.ingredient_key)
      );
      removedIngredientNames = blockedComponents.map(c => c.name_pt);
      console.log(`[UNIFIED-CORE] PASSO 4: Ingredientes removidos: ${removedIngredientNames.join(', ')}`);
      
      // Remover componentes inseguros
      const safeComponents = unifiedComponents.filter(c => 
        !safetyResult.blockedComponents.includes(c.ingredient_key)
      );
      
      if (safeComponents.length === 0) {
        console.error(`[UNIFIED-CORE] ❌ PASSO 4: TODOS os componentes bloqueados!`);
        throw new Error(`Todos os componentes bloqueados: ${safetyResult.reasons.join(', ')}`);
      }
      
      unifiedComponents.length = 0;
      unifiedComponents.push(...safeComponents);
      warnings.push(...safetyResult.warnings);
    }
    
    // ============= PASSO 5: VALIDAR COERÊNCIA =============
    // Passa o nome da refeição para validar se ingredientes mencionados estão presentes
    const coherenceResult = validateCoherence(unifiedComponents, mealType, userContext.country, mealName);
    console.log(`[UNIFIED-CORE] PASSO 5: Coerência - isCoherent=${coherenceResult.isCoherent}, errors=${coherenceResult.errors.length}`);
    
    if (!coherenceResult.isCoherent) {
      console.warn(`[UNIFIED-CORE] PASSO 5: Erros de coerência: ${coherenceResult.errors.join(', ')}`);
      
      if (coherenceResult.canAutoFix && coherenceResult.fixedComponents) {
        unifiedComponents.length = 0;
        unifiedComponents.push(...coherenceResult.fixedComponents);
        warnings.push(...coherenceResult.fixes.map(f => `Auto-fix: ${f}`));
        console.log(`[UNIFIED-CORE] PASSO 5: Auto-fix aplicado`);
      } else {
        errors.push(...coherenceResult.errors);
        warnings.push('Coerência comprometida, usando componentes originais');
        console.warn(`[UNIFIED-CORE] PASSO 5: Não foi possível auto-fix, adicionando erros`);
      }
    }
    
    // ============= PASSO 5.5: APLICAR REGRAS CULTURAIS =============
    const ingredientKeys = unifiedComponents.map(c => c.ingredient_key);
    
    // Validar combinações culturais
    const culturalValidation = validateCulturalRules(ingredientKeys, userContext.country);
    if (!culturalValidation.isValid) {
      warnings.push(...culturalValidation.violations);
      console.log(`[UNIFIED-CORE] Cultural violations: ${culturalValidation.violations.join(', ')}`);
    }
    
    // Aplicar regras de composição (ex: alface + tomate = "Salada")
    const compositeResult = applyCompositeRules(unifiedComponents);
    if (compositeResult.applied.length > 0) {
      unifiedComponents.length = 0;
      unifiedComponents.push(...compositeResult.components);
      console.log(`[UNIFIED-CORE] Composite rules applied: ${compositeResult.applied.join(', ')}`);
    }
    
    // ============= PASSO 6: ORDENAR COMPONENTES =============
    const sortedComponents = sortComponentsBR(unifiedComponents, mealType);
    
    // ============= PASSO 7: CALCULAR TOTAIS =============
    const totals = calculateMealTotals(sortedComponents);
    
    // ============= PASSO 8: CALCULAR COMPATIBILIDADE COM META (Mifflin-St Jeor) =============
    let targetCompatibility: {
      score: number;
      protein_deviation: number;
      carbs_deviation: number;
      fat_deviation: number;
      is_within_tolerance: boolean;
    } | undefined;
    
    // Calcular metas de macros se temos dados físicos
    if (userContext.physical_data && userContext.goal) {
      try {
        // Usar target_macros se já calculado, senão calcular via Mifflin-St Jeor
        const targetMacros: MacroTargets = userContext.target_macros || (() => {
          const mifflinTargets = getMealMacroTargets(
            userContext.goal,
            userContext.physical_data.sex,
            userContext.physical_data.activity_level,
            mealType
          );
          return {
            protein: mifflinTargets.protein,
            carbs: mifflinTargets.carbs,
            fat: mifflinTargets.fat,
            calories: (mifflinTargets.protein * 4) + (mifflinTargets.carbs * 4) + (mifflinTargets.fat * 9),
          };
        })();
        
        // Calcular desvios percentuais
        const proteinDev = targetMacros.protein > 0 
          ? Math.abs((totals.protein - targetMacros.protein) / targetMacros.protein) * 100 
          : 0;
        const carbsDev = targetMacros.carbs > 0 
          ? Math.abs((totals.carbs - targetMacros.carbs) / targetMacros.carbs) * 100 
          : 0;
        const fatDev = targetMacros.fat > 0 
          ? Math.abs((totals.fat - targetMacros.fat) / targetMacros.fat) * 100 
          : 0;
        
        // Tolerância de ±15%
        const TOLERANCE = 15;
        const isWithinTolerance = proteinDev <= TOLERANCE && carbsDev <= TOLERANCE && fatDev <= TOLERANCE;
        
        // Score: 100 - média dos desvios (mínimo 0)
        const avgDeviation = (proteinDev + carbsDev + fatDev) / 3;
        const score = Math.max(0, Math.round(100 - avgDeviation));
        
        targetCompatibility = {
          score,
          protein_deviation: Math.round(proteinDev * 10) / 10,
          carbs_deviation: Math.round(carbsDev * 10) / 10,
          fat_deviation: Math.round(fatDev * 10) / 10,
          is_within_tolerance: isWithinTolerance,
        };
        
        // Log de compatibilidade
        console.log(`[UNIFIED-CORE] Mifflin compatibility: score=${score}, within_tolerance=${isWithinTolerance}`);
        
        if (!isWithinTolerance) {
          warnings.push(`Refeição fora da tolerância de ±15% (score: ${score})`);
        }
      } catch (e) {
        console.warn(`[UNIFIED-CORE] Error calculating Mifflin compatibility:`, e);
      }
    }
    
    // ============= PASSO 9: MONTAR REFEIÇÃO FINAL =============
    // Verificar se o nome menciona ingredientes que foram removidos
    let needsNameRegeneration = false;
    
    // 1. Verificar ingredientes explicitamente removidos
    if (removedIngredientNames.length > 0 && mealName) {
      const mealNameLower = mealName.toLowerCase();
      for (const removedName of removedIngredientNames) {
        // Verificar se o nome da refeição menciona o ingrediente removido
        if (mealNameLower.includes(removedName.toLowerCase())) {
          needsNameRegeneration = true;
          console.log(`[UNIFIED-CORE] PASSO 9: Nome "${mealName}" menciona ingrediente removido "${removedName}" - regenerando nome`);
          break;
        }
      }
    }
    
    // 2. Verificar se o nome menciona ingredientes que NÃO estão nos componentes
    // DINÂMICO: Extrai palavras do nome e verifica se existem nos componentes
    // Isso pega casos onde o template tem nome hardcoded (ex: "Arroz com Feijão" mas feijão foi filtrado antes)
    if (!needsNameRegeneration && mealName) {
      const mealNameLower = mealName.toLowerCase();
      const componentNamesLower = sortedComponents.map(c => c.name_pt.toLowerCase()).join(' ');
      const componentKeysLower = sortedComponents.map(c => c.ingredient_key.toLowerCase()).join(' ');
      
      // Lista DINÂMICA de ingredientes que podem ser bloqueados por intolerâncias
      // Inclui ingredientes de TODAS as categorias de intolerância
      const potentiallyBlockedIngredients = [
        // FODMAP
        { pattern: /feij[aã]o/i, name: 'Feijão' },
        { pattern: /lentilha/i, name: 'Lentilha' },
        { pattern: /gr[aã]o[\s-]?de[\s-]?bico/i, name: 'Grão de bico' },
        { pattern: /ervilha/i, name: 'Ervilha' },
        // LACTOSE
        { pattern: /iogurte/i, name: 'Iogurte' },
        { pattern: /queijo/i, name: 'Queijo' },
        { pattern: /leite/i, name: 'Leite' },
        { pattern: /requeij[aã]o/i, name: 'Requeijão' },
        { pattern: /manteiga/i, name: 'Manteiga' },
        { pattern: /creme[\s-]?de[\s-]?leite/i, name: 'Creme de leite' },
        // GLUTEN
        { pattern: /p[aã]o/i, name: 'Pão' },
        { pattern: /aveia/i, name: 'Aveia' },
        { pattern: /trigo/i, name: 'Trigo' },
        { pattern: /macarr[aã]o/i, name: 'Macarrão' },
        { pattern: /massa/i, name: 'Massa' },
        { pattern: /torrada/i, name: 'Torrada' },
        { pattern: /biscoito/i, name: 'Biscoito' },
        { pattern: /bolo/i, name: 'Bolo' },
        // OVOS
        { pattern: /ovo/i, name: 'Ovo' },
        { pattern: /omelete/i, name: 'Omelete' },
        // FRUTOS DO MAR (para quem tem alergia)
        { pattern: /camar[aã]o/i, name: 'Camarão' },
        { pattern: /lagosta/i, name: 'Lagosta' },
        { pattern: /marisco/i, name: 'Marisco' },
      ];
      
      for (const ingredient of potentiallyBlockedIngredients) {
        if (ingredient.pattern.test(mealNameLower)) {
          // Verificar se algum componente contém esse ingrediente
          const hasIngredient = ingredient.pattern.test(componentNamesLower) ||
                               ingredient.pattern.test(componentKeysLower);
          
          if (!hasIngredient) {
            needsNameRegeneration = true;
            console.log(`[UNIFIED-CORE] PASSO 9: Nome "${mealName}" menciona "${ingredient.name}" mas não está nos componentes - regenerando nome`);
            break;
          }
        }
      }
    }
    
    // 3. Para almoço/jantar, SEMPRE regenerar o nome para garantir formato correto
    // Isso garante que a proteína sempre venha primeiro: "Proteína com Acompanhamentos"
    if (mealType === 'lunch' || mealType === 'dinner') {
      // DEBUG: Listar todos os tipos de componentes
      const componentTypes = sortedComponents.map(c => `${c.name_pt}(${c.type})`).join(', ');
      console.log(`[UNIFIED-CORE] PASSO 9: Componentes e tipos: ${componentTypes}`);
      
      const protein = sortedComponents.find(c => c.type === 'protein');
      if (protein) {
        // SEMPRE regenerar para garantir ordem correta (proteína primeiro)
        needsNameRegeneration = true;
        console.log(`[UNIFIED-CORE] PASSO 9: Almoço/Jantar com proteína "${protein.name_pt}" - FORÇANDO regeneração de nome`);
      } else {
        console.log(`[UNIFIED-CORE] PASSO 9: Almoço/Jantar SEM proteína detectada - tipos encontrados: ${[...new Set(sortedComponents.map(c => c.type))].join(', ')}`);
      }
    }
    
    // Validar coerência título-componentes
    const coherenceCheck = validateMealNameCoherence(mealName, sortedComponents);
    if (!coherenceCheck.valid) {
      needsNameRegeneration = true;
      console.log(`[UNIFIED-CORE] PASSO 9: Coerência falhou - ${coherenceCheck.reason}`);
    }
    
    // Usar nome passado apenas se for válido/descritivo E não precisar regenerar
    let finalMealName = (isValidMealName(mealName) && !needsNameRegeneration)
      ? mealName 
      : generateMealName(sortedComponents, mealType);
    
    if (needsNameRegeneration) {
      console.log(`[UNIFIED-CORE] PASSO 9: Nome regenerado: "${finalMealName}"`);
    }
    
    // Aplicar humanização ao nome da refeição
    finalMealName = humanizeMealName(finalMealName, sortedComponents.map(c => ({
      name: c.name_pt,
      type: c.type,
      ingredient_key: c.ingredient_key
    })));
    
    const meal: UnifiedMeal = {
      name: finalMealName,
      meal_type: mealType,
      components: sortedComponents,
      totals,
      meta: {
        country: userContext.country,
        density: calculateDensity(totals.calories, mealType),
        prep_time_minutes: 15,
        blocked_for_intolerances: extractBlockedIntolerances(sortedComponents),
        dietary_tags: extractDietaryTags(sortedComponents),
        confidence: determineConfidence(source, errors.length, warnings.length),
        target_compatibility: targetCompatibility,
      },
      source,
    };
    
    return {
      success: true,
      meal,
      errors,
      warnings,
      fallback_used: fallbackUsed,
      processing_time_ms: Date.now() - startTime,
    };
    
  } catch (error) {
    // ============= FALLBACK: REFEIÇÃO DE EMERGÊNCIA =============
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[UNIFIED-CORE] Error processing meal: ${errorMsg}`);
    
    const fallbackMeal = getEmergencyFallback(mealType, userContext);
    fallbackUsed = true;
    
    return {
      success: true, // Fallback é sucesso
      meal: fallbackMeal,
      errors: [errorMsg],
      warnings: ['Fallback de emergência utilizado'],
      fallback_used: true,
      processing_time_ms: Date.now() - startTime,
    };
  }
}

// ============= FUNÇÕES AUXILIARES =============
async function convertToUnified(
  raw: RawComponent, 
  context: UserContext,
  safetyDb: SafetyDatabase
): Promise<UnifiedComponent> {
  // Resolver ingredient_key
  const ingredientKey = raw.ingredient_key || resolveIngredientKey(raw.name, raw.name_en);
  
  // Buscar ingrediente no banco de dados para pegar nomes e tipo corretos
  const ingredient = INGREDIENTS[ingredientKey];
  
  // Usar nomes do INGREDIENTS se disponível, senão usar raw
  // Aplicar humanização ao nome
  const rawName = ingredient?.display_name_pt || raw.name;
  const name_pt = humanizeIngredientName(ingredientKey, rawName);
  const name_en = ingredient?.display_name_en || raw.name_en || raw.name;
  
  // Calcular macros
  const macros = await calculateMacros(ingredientKey, raw.grams, raw);
  
  // Determinar tipo PRIMEIRO: priorizar raw.type (se existir), depois categorizar por nome
  // INGREDIENTS pode não ter propriedade 'type', então usamos categorização
  let type = raw.type;
  
  // DEBUG: Log do tipo recebido
  console.log(`[UNIFIED-CORE] convertToUnified: name="${raw.name}", raw.type="${raw.type}"`);
  
  // Se não tem tipo ou é 'other', tentar categorizar pelo nome
  if (!type || type === 'other') {
    type = categorizeByName(raw.name);
    console.log(`[UNIFIED-CORE] convertToUnified: Tipo categorizado por nome: "${type}" para "${raw.name}"`);
  }
  
  // Formatar porção - PASSAR O TIPO para detectar líquidos pela categoria
  const portionDisplay = formatPortion(ingredientKey, raw.grams, context.language, type);
  
  const category = 'other'; // Simplificado por enquanto
  
  return {
    ingredient_key: ingredientKey,
    name_pt: name_pt,
    name_en: name_en,
    type: type as any,
    category,
    portion_grams: raw.grams,
    portion_display: portionDisplay,
    macros,
    safety: { contains: [], blocked_for: [], is_safe_for_all: true },
  };
}

function resolveIngredientKey(name: string, name_en?: string): string {
  // Normalizar nome para key
  const normalized = (name_en || name).toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[áàâã]/g, 'a')
    .replace(/[éèê]/g, 'e')
    .replace(/[íì]/g, 'i')
    .replace(/[óòôõ]/g, 'o')
    .replace(/[úù]/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9_]/g, '');
  
  return normalized;
}

function calculateMealTotals(components: UnifiedComponent[]): MealTotals {
  return components.reduce((acc, c) => ({
    calories: acc.calories + c.macros.kcal,
    protein: acc.protein + c.macros.protein,
    carbs: acc.carbs + c.macros.carbs,
    fat: acc.fat + c.macros.fat,
    fiber: acc.fiber + c.macros.fiber,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
}

function calculateDensity(calories: number, mealType: MealType): 'light' | 'moderate' | 'heavy' {
  const thresholds = {
    breakfast: { light: 250, heavy: 450 },
    morning_snack: { light: 100, heavy: 200 },
    lunch: { light: 400, heavy: 700 },
    afternoon_snack: { light: 100, heavy: 200 },
    dinner: { light: 350, heavy: 600 },
    supper: { light: 100, heavy: 200 },
  };
  
  const t = thresholds[mealType];
  if (calories < t.light) return 'light';
  if (calories > t.heavy) return 'heavy';
  return 'moderate';
}

function extractBlockedIntolerances(components: UnifiedComponent[]): string[] {
  const blocked = new Set<string>();
  for (const c of components) {
    c.safety.blocked_for.forEach(b => blocked.add(b));
  }
  return Array.from(blocked);
}

function extractDietaryTags(components: UnifiedComponent[]): string[] {
  const hasAnimalProtein = components.some(c => 
    ['poultry', 'beef', 'pork', 'fish', 'seafood'].includes(c.category)
  );
  const hasDairy = components.some(c => 
    ['milk', 'cheese', 'yogurt'].includes(c.category)
  );
  const hasEggs = components.some(c => c.category === 'eggs');
  
  const tags: string[] = [];
  if (!hasAnimalProtein && !hasDairy && !hasEggs) tags.push('vegan');
  else if (!hasAnimalProtein) tags.push('vegetarian');
  
  return tags;
}

function determineConfidence(
  source: MealSource, 
  errorCount: number, 
  warningCount: number
): 'high' | 'medium' | 'low' {
  if (source.type === 'fallback') return 'low';
  if (errorCount > 0) return 'low';
  if (warningCount > 2) return 'medium';
  if (source.type === 'pool' || source.type === 'direct') return 'high';
  return 'medium'; // AI
}

// Nomes genéricos que devem ser substituídos por nomes descritivos
const GENERIC_MEAL_NAMES = [
  // Ingredientes básicos (1 palavra)
  'arroz', 'feijão', 'feijao', 'ovos', 'ovo', 'pão', 'pao', 'frango', 'carne',
  'salada', 'sopa', 'macarrão', 'macarrao', 'batata', 'leite', 'café', 'cafe',
  'iogurte', 'granola', 'açúcar', 'acucar', 'queijo', 'presunto', 'banana',
  'mamão', 'mamao', 'laranja', 'suco', 'água', 'agua', 'chá', 'cha',
  // Ingredientes específicos que não devem ser títulos
  'açúcar mascavo', 'acucar mascavo', 'mel', 'manteiga', 'azeite',
  // Nomes genéricos de tipos de alimento
  'proteina', 'proteína', 'carboidrato', 'gordura', 'fibra',
  'proteina animal', 'proteína animal', 'vegetal', 'legume',
];

// Nomes de ingredientes inválidos que devem ser REMOVIDOS da refeição
const INVALID_INGREDIENT_NAMES = [
  'proteina animal', 'proteína animal',
  'proteina vegetal', 'proteína vegetal', 
  'carboidrato', 'gordura', 'fibra',
  'ingrediente', 'alimento', 'comida',
  'undefined', 'null', 'none', 'n/a',
];

// Padrões que indicam que é uma quantidade no nome (não deveria ser título)
const QUANTITY_PATTERNS = [
  /^\d+\s*colher/i,      // "2 colheres de sopa..."
  /^\d+\s*fatia/i,       // "2 fatias de pão..."
  /^\d+\s*copo/i,        // "1 copo de suco..."
  /^\d+\s*xícara/i,      // "1 xícara de café..."
  /^\d+\s*ovo/i,         // "2 ovos cozidos..."
  /^\d+\s*unidade/i,     // "1 unidade de..."
  /^\d+\s*porção/i,      // "1 porção de..."
  /^\d+g\b/i,            // "100g de..."
  /^\d+ml\b/i,           // "200ml de..."
];

function isValidMealName(mealName: string | null | undefined): boolean {
  if (!mealName || mealName.trim().length === 0) {
    return false;
  }
  
  const normalized = mealName.toLowerCase().trim();
  
  // Verificar se é um nome genérico EXATO (apenas um ingrediente)
  for (const generic of GENERIC_MEAL_NAMES) {
    if (normalized === generic || normalized === generic + 's') {
      return false;
    }
  }
  
  // Verificar se começa com quantidade (ex: "2 colheres de sopa de granola")
  if (QUANTITY_PATTERNS.some(pattern => pattern.test(mealName))) {
    return false;
  }
  
  // Verificar se é apenas 1-2 palavras SEM conectores
  const words = mealName.split(/\s+/).filter(w => w.length > 0);
  const hasConnector = /\s+(com|e|de|ao|\u00e0|no|na)\s+/i.test(mealName);
  
  if (words.length <= 2 && !hasConnector) {
    // Nomes curtos sem conectores são provavelmente genéricos
    // Exceto se forem nomes compostos conhecidos (ex: "File Mignon")
    const knownCompounds = ['file mignon', 'filé mignon', 'pao de queijo', 'pão de queijo'];
    if (!knownCompounds.some(kc => normalized.includes(kc))) {
      return false;
    }
  }
  
  // Verificar se contém apenas ingrediente genérico com modificador simples
  // Ex: "Arroz integral", "Ovos mexidos" -> inválidos como título
  for (const generic of GENERIC_MEAL_NAMES) {
    // Se o nome começa com o ingrediente genérico e tem menos de 4 palavras
    if (normalized.startsWith(generic) && words.length < 4 && !hasConnector) {
      return false;
    }
  }
  
  // Nome parece válido
  return true;
}

/**
 * Valida se o nome da refeição é coerente com os componentes
 * Retorna true se todos os ingredientes mencionados no título existem nos componentes
 */
function validateMealNameCoherence(mealName: string, components: UnifiedComponent[]): {
  valid: boolean;
  regenerate: boolean;
  reason?: string;
} {
  if (!mealName || components.length === 0) {
    return { valid: false, regenerate: true, reason: 'Nome ou componentes vazios' };
  }
  
  const nameLower = mealName.toLowerCase();
  
  // Lista de ingredientes que podem ser mencionados no título
  const ingredientKeywords = [
    // Frutas grandes
    { keyword: 'mamão', keys: ['papaya'] },
    { keyword: 'melão', keys: ['melon'] },
    { keyword: 'melancia', keys: ['watermelon'] },
    { keyword: 'abacaxi', keys: ['pineapple'] },
    // Frutas médias
    { keyword: 'banana', keys: ['silver_banana', 'banana'] },
    { keyword: 'maçã', keys: ['red_apple', 'apple'] },
    { keyword: 'laranja', keys: ['orange'] },
    { keyword: 'manga', keys: ['mango'] },
    { keyword: 'morango', keys: ['strawberry'] },
    { keyword: 'kiwi', keys: ['kiwi'] },
    { keyword: 'goiaba', keys: ['guava'] },
    { keyword: 'uva', keys: ['grapes'] },
    // Proteínas
    { keyword: 'frango', keys: ['grilled_chicken_breast', 'baked_chicken_thigh', 'shredded_chicken', 'baked_chicken_drumstick', 'fried_chicken_pieces'] },
    { keyword: 'carne', keys: ['grilled_sirloin_steak', 'grilled_round_steak', 'sauteed_ground_beef', 'grilled_filet_mignon', 'pot_roast', 'grilled_picanha', 'roasted_ribs'] },
    { keyword: 'peixe', keys: ['grilled_tilapia', 'grilled_salmon', 'grilled_hake', 'baked_hake'] },
    { keyword: 'ovo', keys: ['scrambled_eggs', 'boiled_eggs', 'plain_omelet', 'fried_eggs', 'poached_eggs'] },
    { keyword: 'atum', keys: ['canned_tuna'] },
    { keyword: 'sardinha', keys: ['canned_sardines'] },
    // Laticínios
    { keyword: 'iogurte', keys: ['plain_yogurt', 'greek_yogurt', 'low_fat_yogurt', 'fruit_yogurt'] },
    { keyword: 'queijo', keys: ['minas_cheese', 'cottage_cheese', 'prato_cheese', 'mozzarella_cheese', 'ricotta'] },
    // Oleaginosas
    { keyword: 'amendoim', keys: ['peanuts'] },
    { keyword: 'castanha', keys: ['brazil_nuts', 'cashew_nuts'] },
    { keyword: 'nozes', keys: ['walnuts'] },
  ];
  
  // Verificar cada ingrediente mencionado no título
  for (const { keyword, keys } of ingredientKeywords) {
    if (nameLower.includes(keyword)) {
      // Verificar se algum dos keys correspondentes existe nos componentes
      const hasIngredient = components.some(c => 
        keys.some(key => 
          c.ingredient_key === key || 
          c.name_pt?.toLowerCase().includes(keyword) ||
          c.name_en?.toLowerCase().includes(keyword)
        )
      );
      
      if (!hasIngredient) {
        console.log(`[UNIFIED-CORE] Coerência: "${keyword}" mencionado no título mas não encontrado nos componentes`);
        return { 
          valid: false, 
          regenerate: true, 
          reason: `Ingrediente "${keyword}" no título não existe nos componentes` 
        };
      }
    }
  }
  
  return { valid: true, regenerate: false };
}

function generateMealName(components: UnifiedComponent[], mealType: MealType): string {
  // Gerar nome descritivo baseado nos componentes principais e tipo de refeição
  const protein = components.find(c => c.type === 'protein');
  const rice = components.find(c => c.type === 'rice');
  const beans = components.find(c => c.type === 'beans');
  const carb = components.find(c => c.type === 'carb');
  const dairy = components.find(c => c.type === 'dairy');
  const fruit = components.find(c => c.type === 'fruit' || c.type === 'dessert');
  const vegetables = components.filter(c => c.type === 'vegetable');
  const beverage = components.find(c => c.type === 'beverage');
  
  // ALMOÇO e JANTAR - formato: "{Proteína} com {Carboidrato} e {Acompanhamento}"
  // REGRA: Proteína SEMPRE em primeiro lugar no nome
  if (mealType === 'lunch' || mealType === 'dinner') {
    const sideParts: string[] = [];
    let mainItem: string | null = null;
    
    // Parte principal: SEMPRE proteína primeiro (se existir)
    if (protein) {
      mainItem = cleanIngredientName(protein.name_pt);
    }
    
    // Acompanhamentos: arroz, feijão, carboidrato
    if (rice) sideParts.push('Arroz');
    if (beans) sideParts.push('Feijão');
    if (carb) sideParts.push(cleanIngredientName(carb.name_pt));
    
    // Vegetais: usar "Salada" se tiver 2+, ou nome específico se tiver 1
    if (vegetables.length >= 2) {
      sideParts.push('Salada');
    } else if (vegetables.length === 1) {
      sideParts.push(cleanIngredientName(vegetables[0].name_pt));
    }
    
    // Montar nome no formato brasileiro: "Proteína com Arroz, Feijão e Salada"
    if (mainItem && sideParts.length > 0) {
      if (sideParts.length === 1) {
        return `${mainItem} com ${sideParts[0]}`;
      } else if (sideParts.length === 2) {
        return `${mainItem} com ${sideParts[0]} e ${sideParts[1]}`;
      } else {
        // 3+ acompanhamentos: "Proteína com A, B e C"
        const lastSide = sideParts.pop();
        return `${mainItem} com ${sideParts.join(', ')} e ${lastSide}`;
      }
    } else if (mainItem) {
      // Só proteína - adicionar "Prato de"
      return `Prato de ${mainItem}`;
    } else if (sideParts.length > 0) {
      // Sem proteína - usar primeiro acompanhamento como principal
      const firstSide = sideParts.shift();
      if (sideParts.length === 0) return firstSide!;
      if (sideParts.length === 1) return `${firstSide} com ${sideParts[0]}`;
      const lastSide = sideParts.pop();
      return `${firstSide} com ${sideParts.join(', ')} e ${lastSide}`;
    }
  }
  
  // CAFÉ DA MANHÃ e LANCHES
  if (mealType === 'breakfast' || mealType === 'morning_snack' || mealType === 'afternoon_snack') {
    const parts: string[] = [];
    const usedNames = new Set<string>(); // Evitar duplicação de nomes
    
    // Função auxiliar para adicionar sem duplicar
    const addUnique = (name: string) => {
      const cleaned = cleanIngredientName(name);
      const normalized = cleaned.toLowerCase();
      if (!usedNames.has(normalized)) {
        usedNames.add(normalized);
        parts.push(cleaned);
        return true;
      }
      return false;
    };
    
    // Prioridade: proteína/carb principal + acompanhamento
    if (protein) addUnique(protein.name_pt);
    if (carb) addUnique(carb.name_pt);
    if (parts.length < 2 && dairy) addUnique(dairy.name_pt);
    if (parts.length < 2 && fruit) addUnique(fruit.name_pt);
    if (parts.length < 2 && beverage) addUnique(beverage.name_pt);
    
    if (parts.length >= 2) {
      return `${parts[0]} com ${parts[1]}`;
    } else if (parts.length === 1) {
      // Tentar adicionar contexto (sem duplicar)
      if (dairy && addUnique(dairy.name_pt)) return `${parts[0]} com ${parts[1]}`;
      if (beverage && addUnique(beverage.name_pt)) return `${parts[0]} com ${parts[1]}`;
      return parts[0];
    }
  }
  
  // CEIA
  if (mealType === 'supper') {
    const parts: string[] = [];
    if (dairy) parts.push(cleanIngredientName(dairy.name_pt));
    if (fruit) parts.push(cleanIngredientName(fruit.name_pt));
    if (carb && parts.length < 2) parts.push(cleanIngredientName(carb.name_pt));
    
    if (parts.length >= 2) {
      return `${parts[0]} com ${parts[1]}`;
    } else if (parts.length === 1) {
      return parts[0];
    }
  }
  
  // FALLBACK: usar os 2-3 primeiros componentes
  const fallbackParts = components.slice(0, 3).map(c => cleanIngredientName(c.name_pt));
  if (fallbackParts.length >= 2) {
    const last = fallbackParts.pop();
    return `${fallbackParts.join(', ')} e ${last}`;
  } else if (fallbackParts.length === 1) {
    return fallbackParts[0];
  }
  
  // Fallback por tipo de refeição
  const fallbackNames: Record<string, string> = {
    'breakfast': 'Café da Manhã',
    'morning_snack': 'Lanche da Manhã',
    'lunch': 'Almoço Completo',
    'afternoon_snack': 'Lanche da Tarde',
    'dinner': 'Jantar Completo',
    'supper': 'Ceia Leve',
  };
  
  return fallbackNames[mealType] || 'Refeição Completa';
}

// Remove prefixos de quantidade do nome do ingrediente
function cleanIngredientName(name: string): string {
  if (!name) return '';
  
  // Remover padrões de quantidade do início
  let cleaned = name
    .replace(/^\d+\s*colher(es)?\s*(de\s*sopa\s*)?(de\s*)?/i, '')
    .replace(/^\d+\s*fatia(s)?\s*(de\s*)?/i, '')
    .replace(/^\d+\s*copo(s)?\s*(de\s*)?/i, '')
    .replace(/^\d+\s*xícara(s)?\s*(de\s*)?/i, '')
    .replace(/^\d+\s*ovo(s)?\s*/i, 'Ovos ')
    .replace(/^\d+\s*unidade(s)?\s*(de\s*)?/i, '')
    .replace(/^\d+\s*porç(ão|ões)\s*(de\s*)?/i, '')
    .replace(/^\d+g\s*(de\s*)?/i, '')
    .replace(/^\d+ml\s*(de\s*)?/i, '')
    .trim();
  
  // Capitalizar primeira letra
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  return cleaned;
}

// ============= VALIDAÇÃO DE COMPOSIÇÃO DE REFEIÇÃO =============
/**
 * Valida se a composição da refeição é válida
 * Verifica ingredientes que não podem ser usados sozinhos
 * @returns objeto com valid, issues e componentes corrigidos
 */
export function validateMealComposition(
  components: UnifiedComponent[],
  mealType: MealType
): { valid: boolean; issues: string[]; components: UnifiedComponent[] } {
  const issues: string[] = [];
  let validComponents = [...components];
  
  // Mapear tipos presentes na refeição
  const presentTypes = new Set(components.map(c => c.type));
  
  // Verificar cada componente
  for (const comp of components) {
    const ingredient = INGREDIENTS[comp.ingredient_key || ''];
    
    if (ingredient?.never_use_alone) {
      // Verificar se tem acompanhamento necessário
      const mustCombineWith = ingredient.must_combine_with || [];
      const hasRequiredCompanion = mustCombineWith.some(requiredType => 
        presentTypes.has(requiredType as any) || 
        components.some(c => c !== comp && c.type === requiredType)
      );
      
      if (!hasRequiredCompanion && components.length === 1) {
        // Ingrediente sozinho que não pode estar sozinho
        issues.push(`${comp.name_pt} não pode ser usado sozinho (precisa de: ${mustCombineWith.join(' ou ')})`);
      }
    }
    
    // Verificar categoria do ingrediente
    const category = ingredient?.ingredient_category;
    if (category) {
      // Ingredientes de tempero/molho não devem ser o principal
      if (['seasoning', 'sauce', 'topping', 'garnish'].includes(category)) {
        const hasMainIngredient = components.some(c => {
          const ing = INGREDIENTS[c.ingredient_key || ''];
          return c !== comp && (!ing?.ingredient_category || ing.ingredient_category === 'main');
        });
        
        if (!hasMainIngredient && components.length <= 2) {
          issues.push(`${comp.name_pt} é um ${category} e precisa de um ingrediente principal`);
        }
      }
    }
  }
  
  // Log para debug
  if (issues.length > 0) {
    console.log(`[VALIDATE-COMPOSITION] Issues found for ${mealType}:`, issues);
  }
  
  return {
    valid: issues.length === 0,
    issues,
    components: validComponents
  };
}

// Re-export types
export * from './types.ts';
export { formatPortion } from './portion-formatter.ts';
export { sortComponentsBR } from './meal-sorter.ts';
export { validateCoherence } from './coherence-validator.ts';
export { validateSafety } from './safety-validator.ts';
export { calculateMacros } from './macro-calculator.ts';
export { getEmergencyFallback } from './fallback-meals.ts';

