# 🔒 ESTRATÉGIA DE IMPLEMENTAÇÃO 100% SEGURA
## Unificação Completa dos Geradores de Refeição

**Data:** 23/01/2026  
**Status:** 📋 ESTRATÉGIA DEFINIDA  
**Objetivo:** Zero divergência entre módulos, 100% uptime

---

# 📌 IMPORTANTE: CÓDIGO COMPLETO DISPONÍVEL

**Para implementação detalhada dos módulos principais, consulte:**
- `UNIFIED_MEAL_CORE_COMPLETO.md` - Código completo de:
  - `portion-formatter.ts` (com TODAS as quantidades humanizadas + gramas)
  - `meal-sorter.ts` (ordenação BR: Proteína → Arroz → Feijão → ... → Bebida → Sobremesa)
  - `coherence-validator.ts` (validação de combinações proibidas)

**Este documento contém a arquitetura geral. O código detalhado está no documento acima.**

---

# 🎯 PRINCÍPIO FUNDAMENTAL

## "UM CORE, TODOS ADAPTADORES"

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    ┌─────────────────────┐                       │
│                    │  UNIFIED MEAL CORE  │                       │
│                    │  (FONTE ÚNICA)      │                       │
│                    └──────────┬──────────┘                       │
│                               │                                  │
│         ┌─────────────────────┼─────────────────────┐            │
│         │                     │                     │            │
│         ▼                     ▼                     ▼            │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐    │
│  │  ADAPTER 1  │       │  ADAPTER 2  │       │  ADAPTER 3  │    │
│  │  Prompt IA  │       │  Gerador    │       │  Pool       │    │
│  │             │       │  Direto     │       │             │    │
│  └─────────────┘       └─────────────┘       └─────────────┘    │
│         │                     │                     │            │
│         └─────────────────────┼─────────────────────┘            │
│                               │                                  │
│                               ▼                                  │
│                    ┌─────────────────────┐                       │
│                    │   OUTPUT IDÊNTICO   │                       │
│                    │   GARANTIDO         │                       │
│                    └─────────────────────┘                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Regra de ouro:** Nenhum gerador implementa lógica própria. TODOS chamam o Core.

---

# 📁 ARQUITETURA DE ARQUIVOS

## Estrutura Proposta

```
supabase/functions/_shared/
├── unified-meal-core/           # 🔒 NOVO - NÚCLEO CENTRAL
│   ├── index.ts                 # Exports principais
│   ├── types.ts                 # Interfaces unificadas
│   ├── portion-formatter.ts     # Formatação de porções
│   ├── meal-sorter.ts           # Ordenação de ingredientes
│   ├── coherence-validator.ts   # Validação de coerência
│   ├── safety-validator.ts      # Validação de segurança (usa globalSafetyEngine)
│   ├── macro-calculator.ts      # Cálculo de macros (fonte única)
│   ├── fallback-meals.ts        # Refeições de emergência
│   └── test-parity.ts           # Testes de paridade entre módulos
│
├── meal-core-adapters/          # 🔒 NOVO - ADAPTADORES
│   ├── ai-adapter.ts            # Adapta output da IA para Core
│   ├── direct-adapter.ts        # Adapta gerador direto para Core
│   └── pool-adapter.ts          # Adapta pool para Core
│
└── [arquivos existentes...]
```

---

# 🔧 IMPLEMENTAÇÃO DETALHADA

## FASE 1: UNIFIED MEAL CORE

### 1.1 Arquivo: `unified-meal-core/types.ts`

```typescript
/**
 * TIPOS UNIFICADOS - TODOS OS MÓDULOS USAM ESTES TIPOS
 * Qualquer mudança aqui afeta TODOS os módulos automaticamente
 */

// ============= INTERFACE DE COMPONENTE UNIFICADA =============
export interface UnifiedComponent {
  // Identificação
  ingredient_key: string;           // Ex: "boiled_eggs"
  
  // Nomes localizados
  name_pt: string;                  // Ex: "Ovo cozido"
  name_en: string;                  // Ex: "Boiled eggs"
  
  // Categorização
  type: ComponentType;              // Ex: "protein"
  category: FoodCategory;           // Ex: "eggs"
  
  // Porção em gramas (fonte de verdade)
  portion_grams: number;            // Ex: 100
  
  // Porção humanizada (calculada pelo Core)
  portion_display: PortionDisplay;  // Ex: { quantity: 2, unit: "unidade", label: "2 ovos cozidos" }
  
  // Macros (calculados pelo Core)
  macros: ComponentMacros;          // Ex: { kcal: 155, prot: 13, ... }
  
  // Safety flags
  safety: SafetyInfo;               // Ex: { contains: ["ovo"], blocked_for: ["egg"] }
}

export type ComponentType = 
  | 'protein' 
  | 'carb' 
  | 'rice'      // Específico para Brasil
  | 'beans'     // Específico para Brasil
  | 'vegetable' 
  | 'fruit' 
  | 'dairy' 
  | 'fat' 
  | 'beverage'
  | 'dessert'
  | 'composite'
  | 'other';

export type FoodCategory = 
  | 'poultry' | 'beef' | 'pork' | 'fish' | 'seafood' | 'eggs'
  | 'rice' | 'beans' | 'bread' | 'pasta' | 'tuber' | 'cereal'
  | 'leafy' | 'cruciferous' | 'root' | 'fruit'
  | 'milk' | 'cheese' | 'yogurt'
  | 'oil' | 'butter' | 'nuts'
  | 'water' | 'juice' | 'coffee' | 'tea'
  | 'other';

export interface PortionDisplay {
  quantity: number;                 // Ex: 2
  unit: 'g' | 'ml' | 'unidade' | 'fatia' | 'colher_sopa' | 'concha' | 'copo' | 'xicara';
  label: string;                    // Ex: "2 ovos cozidos"
}

export interface ComponentMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface SafetyInfo {
  contains: string[];               // Ex: ["ovo", "lactose"]
  blocked_for: string[];            // Ex: ["egg", "lactose"]
  is_safe_for_all: boolean;         // true se não tem alergenos
}

// ============= INTERFACE DE REFEIÇÃO UNIFICADA =============
export interface UnifiedMeal {
  // Identificação
  id?: string;                      // UUID do banco (opcional)
  name: string;                     // Ex: "Frango Grelhado com Arroz e Feijão"
  description?: string;
  
  // Tipo de refeição
  meal_type: MealType;              // Ex: "lunch"
  
  // Componentes (ORDENADOS pelo Core)
  components: UnifiedComponent[];
  
  // Totais (CALCULADOS pelo Core)
  totals: MealTotals;
  
  // Metadados
  meta: MealMeta;
  
  // Fonte (para debug)
  source: MealSource;
}

export type MealType = 
  | 'breakfast' 
  | 'morning_snack' 
  | 'lunch' 
  | 'afternoon_snack' 
  | 'dinner' 
  | 'supper';

export interface MealTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface MealMeta {
  country: string;                  // Ex: "BR"
  density: 'light' | 'moderate' | 'heavy';
  prep_time_minutes: number;
  blocked_for_intolerances: string[];
  dietary_tags: string[];
  confidence: 'high' | 'medium' | 'low';
}

export type MealSource = 
  | { type: 'pool'; meal_id: string }
  | { type: 'direct'; template_id: string }
  | { type: 'ai'; model: string; prompt_version: string }
  | { type: 'fallback'; reason: string };

// ============= INTERFACE DE CONTEXTO DO USUÁRIO =============
export interface UserContext {
  user_id: string;
  country: string;
  language: string;
  intolerances: string[];
  dietary_preference: string | null;
  excluded_ingredients: string[];
  goals: string[];
  physical_data?: {
    age: number;
    weight_kg: number;
    height_cm: number;
    activity_level: string;
    sex: string;
  };
}

// ============= RESULTADO DO PROCESSAMENTO =============
export interface ProcessingResult {
  success: boolean;
  meal: UnifiedMeal | null;
  errors: string[];
  warnings: string[];
  fallback_used: boolean;
  processing_time_ms: number;
}
```

### 1.2 Arquivo: `unified-meal-core/index.ts`

```typescript
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
  ComponentType,
} from './types.ts';

import { formatPortion } from './portion-formatter.ts';
import { sortComponentsBR } from './meal-sorter.ts';
import { validateCoherence } from './coherence-validator.ts';
import { validateSafety } from './safety-validator.ts';
import { calculateMacros } from './macro-calculator.ts';
import { getEmergencyFallback } from './fallback-meals.ts';
import { loadSafetyDatabase, type SafetyDatabase } from '../globalSafetyEngine.ts';

// ============= CACHE DO SAFETY DATABASE =============
let cachedSafetyDb: SafetyDatabase | null = null;

async function getSafetyDb(): Promise<SafetyDatabase> {
  if (!cachedSafetyDb) {
    cachedSafetyDb = await loadSafetyDatabase();
  }
  return cachedSafetyDb;
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
  
  try {
    // ============= PASSO 1: CARREGAR SAFETY DATABASE =============
    const safetyDb = await getSafetyDb();
    
    // ============= PASSO 2: VALIDAR INPUTS =============
    if (!rawComponents || rawComponents.length === 0) {
      throw new Error('Componentes vazios');
    }
    
    // ============= PASSO 3: CONVERTER PARA COMPONENTES UNIFICADOS =============
    const unifiedComponents: UnifiedComponent[] = [];
    
    for (const raw of rawComponents) {
      try {
        const unified = await convertToUnified(raw, userContext, safetyDb);
        unifiedComponents.push(unified);
      } catch (error) {
        warnings.push(`Componente ignorado: ${raw.name} - ${error.message}`);
      }
    }
    
    if (unifiedComponents.length === 0) {
      throw new Error('Nenhum componente válido após conversão');
    }
    
    // ============= PASSO 4: VALIDAR SEGURANÇA =============
    const safetyResult = await validateSafety(unifiedComponents, userContext, safetyDb);
    
    if (!safetyResult.isSafe) {
      // Remover componentes inseguros
      const safeComponents = unifiedComponents.filter(c => 
        !safetyResult.blockedComponents.includes(c.ingredient_key)
      );
      
      if (safeComponents.length === 0) {
        throw new Error(`Todos os componentes bloqueados: ${safetyResult.reasons.join(', ')}`);
      }
      
      unifiedComponents.length = 0;
      unifiedComponents.push(...safeComponents);
      warnings.push(...safetyResult.warnings);
    }
    
    // ============= PASSO 5: VALIDAR COERÊNCIA =============
    const coherenceResult = validateCoherence(unifiedComponents, mealType, userContext.country);
    
    if (!coherenceResult.isCoherent) {
      if (coherenceResult.canAutoFix && coherenceResult.fixedComponents) {
        unifiedComponents.length = 0;
        unifiedComponents.push(...coherenceResult.fixedComponents);
        warnings.push(...coherenceResult.fixes.map(f => `Auto-fix: ${f}`));
      } else {
        errors.push(...coherenceResult.errors);
        // Não falhar, usar componentes originais com warnings
        warnings.push('Coerência comprometida, usando componentes originais');
      }
    }
    
    // ============= PASSO 6: ORDENAR COMPONENTES =============
    const sortedComponents = sortComponentsBR(unifiedComponents, mealType);
    
    // ============= PASSO 7: CALCULAR TOTAIS =============
    const totals = calculateMealTotals(sortedComponents);
    
    // ============= PASSO 8: MONTAR REFEIÇÃO FINAL =============
    const meal: UnifiedMeal = {
      name: mealName,
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
    console.error(`[UNIFIED-CORE] Error processing meal: ${error.message}`);
    
    const fallbackMeal = getEmergencyFallback(mealType, userContext);
    fallbackUsed = true;
    
    return {
      success: true, // Fallback é sucesso
      meal: fallbackMeal,
      errors: [error.message],
      warnings: ['Fallback de emergência utilizado'],
      fallback_used: true,
      processing_time_ms: Date.now() - startTime,
    };
  }
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

// ============= FUNÇÕES AUXILIARES =============
async function convertToUnified(
  raw: RawComponent, 
  context: UserContext,
  safetyDb: SafetyDatabase
): Promise<UnifiedComponent> {
  // Resolver ingredient_key
  const ingredientKey = raw.ingredient_key || resolveIngredientKey(raw.name, raw.name_en);
  
  // Calcular macros
  const macros = await calculateMacros(ingredientKey, raw.grams, raw);
  
  // Formatar porção
  const portionDisplay = formatPortion(ingredientKey, raw.grams, context.language);
  
  // Determinar tipo e categoria
  const { type, category } = categorizeIngredient(ingredientKey, raw.name);
  
  // Obter safety info
  const safetyInfo = getSafetyInfo(ingredientKey, safetyDb);
  
  return {
    ingredient_key: ingredientKey,
    name_pt: raw.name, // Será traduzido se necessário
    name_en: raw.name_en || raw.name,
    type,
    category,
    portion_grams: raw.grams,
    portion_display: portionDisplay,
    macros,
    safety: safetyInfo,
  };
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
  // Analisar componentes para determinar tags
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

// Re-export types
export * from './types.ts';
export { formatPortion } from './portion-formatter.ts';
export { sortComponentsBR } from './meal-sorter.ts';
export { validateCoherence } from './coherence-validator.ts';
export { validateSafety } from './safety-validator.ts';
export { calculateMacros } from './macro-calculator.ts';
export { getEmergencyFallback } from './fallback-meals.ts';
```

---

## FASE 2: ADAPTERS

### 2.1 Arquivo: `meal-core-adapters/ai-adapter.ts`

```typescript
/**
 * AI ADAPTER
 * 
 * Converte output da IA (Gemini) para o formato do Core Unificado
 * Garante que qualquer output da IA passa pelo mesmo processamento
 */

import { 
  processRawMeal, 
  RawComponent, 
  UnifiedMeal,
  ProcessingResult,
  UserContext,
  MealType,
} from '../unified-meal-core/index.ts';

export interface AIGeneratedMeal {
  title: string;
  foods: Array<{
    name: string;
    grams: number;
    calories?: number;
  }>;
  instructions?: string[];
  calories_kcal?: number;
}

/**
 * Processa uma refeição gerada pela IA através do Core Unificado
 */
export async function processAIMeal(
  aiMeal: AIGeneratedMeal,
  mealType: MealType,
  userContext: UserContext,
  promptVersion: string = 'v5',
): Promise<ProcessingResult> {
  // Converter foods da IA para RawComponents
  const rawComponents: RawComponent[] = aiMeal.foods.map(food => ({
    name: food.name,
    grams: food.grams,
    kcal: food.calories,
  }));
  
  // Processar através do Core
  return processRawMeal(
    rawComponents,
    mealType,
    aiMeal.title,
    userContext,
    { type: 'ai', model: 'gemini-1.5-flash', prompt_version: promptVersion },
  );
}
```

### 2.2 Arquivo: `meal-core-adapters/direct-adapter.ts`

```typescript
/**
 * DIRECT ADAPTER
 * 
 * Converte output do gerador direto (templates) para o formato do Core Unificado
 */

import { 
  processRawMeal, 
  RawComponent, 
  ProcessingResult,
  UserContext,
  MealType,
} from '../unified-meal-core/index.ts';

import { INGREDIENTS } from '../meal-ingredients-db.ts';

export interface DirectGeneratedMeal {
  name: string;
  components: Array<{
    type: string;
    name: string;
    name_en: string;
    portion_grams: number;
  }>;
  total_calories: number;
}

/**
 * Processa uma refeição gerada diretamente através do Core Unificado
 */
export async function processDirectMeal(
  directMeal: DirectGeneratedMeal,
  mealType: MealType,
  userContext: UserContext,
  templateId: string = 'unknown',
): Promise<ProcessingResult> {
  // Converter components para RawComponents
  const rawComponents: RawComponent[] = directMeal.components.map(comp => {
    // Tentar resolver ingredient_key
    const ingredientKey = resolveKeyFromName(comp.name_en);
    const ingredient = ingredientKey ? INGREDIENTS[ingredientKey] : null;
    
    return {
      name: comp.name,
      name_en: comp.name_en,
      grams: comp.portion_grams,
      ingredient_key: ingredientKey,
      type: comp.type,
      // Se temos o ingrediente, passar macros
      kcal: ingredient ? ingredient.kcal * (comp.portion_grams / 100) : undefined,
      protein: ingredient ? ingredient.prot * (comp.portion_grams / 100) : undefined,
      carbs: ingredient ? ingredient.carbs * (comp.portion_grams / 100) : undefined,
      fat: ingredient ? ingredient.fat * (comp.portion_grams / 100) : undefined,
      fiber: ingredient ? ingredient.fiber * (comp.portion_grams / 100) : undefined,
    };
  });
  
  // Processar através do Core
  return processRawMeal(
    rawComponents,
    mealType,
    directMeal.name,
    userContext,
    { type: 'direct', template_id: templateId },
  );
}

function resolveKeyFromName(nameEn: string): string | null {
  const normalized = nameEn.toLowerCase().replace(/\s+/g, '_');
  if (INGREDIENTS[normalized]) return normalized;
  
  // Tentar encontrar por display_name_en
  for (const [key, ing] of Object.entries(INGREDIENTS)) {
    if (ing.display_name_en.toLowerCase() === nameEn.toLowerCase()) {
      return key;
    }
  }
  
  return null;
}
```

### 2.3 Arquivo: `meal-core-adapters/pool-adapter.ts`

```typescript
/**
 * POOL ADAPTER
 * 
 * Converte refeições do pool (banco de dados) para o formato do Core Unificado
 */

import { 
  processRawMeal, 
  RawComponent, 
  ProcessingResult,
  UserContext,
  MealType,
} from '../unified-meal-core/index.ts';

export interface PoolMeal {
  id: string;
  name: string;
  meal_type: string;
  components: Array<{
    type: string;
    name: string;
    name_en?: string;
    canonical_id?: string;
    portion_grams?: number;
    portion_ml?: number;
  }>;
  total_calories: number;
}

/**
 * Processa uma refeição do pool através do Core Unificado
 */
export async function processPoolMeal(
  poolMeal: PoolMeal,
  userContext: UserContext,
): Promise<ProcessingResult> {
  // Converter components para RawComponents
  const rawComponents: RawComponent[] = poolMeal.components.map(comp => ({
    name: comp.name,
    name_en: comp.name_en,
    grams: comp.portion_grams || comp.portion_ml || 100,
    ingredient_key: comp.canonical_id,
    type: comp.type,
  }));
  
  // Normalizar meal_type
  const mealType = normalizeMealType(poolMeal.meal_type) as MealType;
  
  // Processar através do Core
  return processRawMeal(
    rawComponents,
    mealType,
    poolMeal.name,
    userContext,
    { type: 'pool', meal_id: poolMeal.id },
  );
}

function normalizeMealType(type: string): string {
  const mapping: Record<string, string> = {
    'cafe_da_manha': 'breakfast',
    'cafe_manha': 'breakfast',
    'lanche_manha': 'morning_snack',
    'almoco': 'lunch',
    'lanche_tarde': 'afternoon_snack',
    'jantar': 'dinner',
    'ceia': 'supper',
  };
  return mapping[type.toLowerCase()] || type;
}
```

---

## FASE 3: TESTE DE PARIDADE

### 3.1 Arquivo: `unified-meal-core/test-parity.ts`

```typescript
/**
 * TESTE DE PARIDADE
 * 
 * Garante que todos os adapters produzem output IDÊNTICO
 * Executar ANTES de cada deploy
 */

import { processAIMeal } from '../meal-core-adapters/ai-adapter.ts';
import { processDirectMeal } from '../meal-core-adapters/direct-adapter.ts';
import { processPoolMeal } from '../meal-core-adapters/pool-adapter.ts';
import { UnifiedMeal, UserContext } from './types.ts';

interface ParityTestResult {
  passed: boolean;
  tests: TestCase[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

interface TestCase {
  name: string;
  passed: boolean;
  details?: string;
}

/**
 * Executa todos os testes de paridade
 */
export async function runParityTests(): Promise<ParityTestResult> {
  const tests: TestCase[] = [];
  
  const userContext: UserContext = {
    user_id: 'test-user',
    country: 'BR',
    language: 'pt-BR',
    intolerances: [],
    dietary_preference: null,
    excluded_ingredients: [],
    goals: [],
  };
  
  // ============= TESTE 1: Mesma refeição via 3 caminhos =============
  const test1 = await testSameMealThreeWays(userContext);
  tests.push(test1);
  
  // ============= TESTE 2: Ordenação consistente =============
  const test2 = await testSortingConsistency(userContext);
  tests.push(test2);
  
  // ============= TESTE 3: Porções humanizadas consistentes =============
  const test3 = await testPortionFormatting(userContext);
  tests.push(test3);
  
  // ============= TESTE 4: Macros consistentes =============
  const test4 = await testMacroConsistency(userContext);
  tests.push(test4);
  
  // ============= TESTE 5: Safety validation consistente =============
  const test5 = await testSafetyConsistency(userContext);
  tests.push(test5);
  
  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  
  return {
    passed: failed === 0,
    tests,
    summary: { total: tests.length, passed, failed },
  };
}

async function testSameMealThreeWays(ctx: UserContext): Promise<TestCase> {
  const name = 'Mesma refeição via 3 caminhos produz output idêntico';
  
  try {
    // Simular mesma refeição vindo de 3 fontes
    const aiMeal = {
      title: 'Frango com Arroz e Feijão',
      foods: [
        { name: 'Frango grelhado', grams: 120 },
        { name: 'Arroz branco', grams: 100 },
        { name: 'Feijão', grams: 100 },
      ],
    };
    
    const directMeal = {
      name: 'Frango com Arroz e Feijão',
      components: [
        { type: 'protein', name: 'Frango grelhado', name_en: 'Grilled chicken', portion_grams: 120 },
        { type: 'carb', name: 'Arroz branco', name_en: 'White rice', portion_grams: 100 },
        { type: 'legume', name: 'Feijão', name_en: 'Beans', portion_grams: 100 },
      ],
      total_calories: 450,
    };
    
    const poolMeal = {
      id: 'test-123',
      name: 'Frango com Arroz e Feijão',
      meal_type: 'lunch',
      components: [
        { type: 'protein', name: 'Frango grelhado', name_en: 'Grilled chicken', portion_grams: 120 },
        { type: 'carb', name: 'Arroz branco', name_en: 'White rice', portion_grams: 100 },
        { type: 'legume', name: 'Feijão', name_en: 'Beans', portion_grams: 100 },
      ],
      total_calories: 450,
    };
    
    const result1 = await processAIMeal(aiMeal, 'lunch', ctx);
    const result2 = await processDirectMeal(directMeal, 'lunch', ctx);
    const result3 = await processPoolMeal(poolMeal, ctx);
    
    // Comparar ordenação
    const order1 = result1.meal?.components.map(c => c.type).join(',');
    const order2 = result2.meal?.components.map(c => c.type).join(',');
    const order3 = result3.meal?.components.map(c => c.type).join(',');
    
    if (order1 !== order2 || order2 !== order3) {
      return { name, passed: false, details: `Ordenação diferente: AI=${order1}, Direct=${order2}, Pool=${order3}` };
    }
    
    // Comparar porções humanizadas
    const portions1 = result1.meal?.components.map(c => c.portion_display.label).join('|');
    const portions2 = result2.meal?.components.map(c => c.portion_display.label).join('|');
    const portions3 = result3.meal?.components.map(c => c.portion_display.label).join('|');
    
    if (portions1 !== portions2 || portions2 !== portions3) {
      return { name, passed: false, details: `Porções diferentes: AI=${portions1}, Direct=${portions2}, Pool=${portions3}` };
    }
    
    return { name, passed: true };
    
  } catch (error) {
    return { name, passed: false, details: error.message };
  }
}

async function testSortingConsistency(ctx: UserContext): Promise<TestCase> {
  const name = 'Ordenação BR: Proteína → Arroz → Feijão → Vegetais → Bebida';
  
  try {
    const meal = {
      title: 'Almoço Completo',
      foods: [
        { name: 'Suco de laranja', grams: 200 },
        { name: 'Feijão', grams: 100 },
        { name: 'Salada verde', grams: 50 },
        { name: 'Arroz branco', grams: 100 },
        { name: 'Bife grelhado', grams: 120 },
      ],
    };
    
    const result = await processAIMeal(meal, 'lunch', ctx);
    const types = result.meal?.components.map(c => c.type);
    
    // Verificar ordem esperada
    const proteinIndex = types?.indexOf('protein') ?? -1;
    const riceIndex = types?.indexOf('rice') ?? -1;
    const beansIndex = types?.indexOf('beans') ?? -1;
    const vegIndex = types?.indexOf('vegetable') ?? -1;
    const bevIndex = types?.indexOf('beverage') ?? -1;
    
    if (proteinIndex > riceIndex || riceIndex > beansIndex || beansIndex > vegIndex || vegIndex > bevIndex) {
      return { name, passed: false, details: `Ordem incorreta: ${types?.join(' → ')}` };
    }
    
    return { name, passed: true };
    
  } catch (error) {
    return { name, passed: false, details: error.message };
  }
}

async function testPortionFormatting(ctx: UserContext): Promise<TestCase> {
  const name = 'Porções humanizadas: ovos, pães, líquidos';
  
  try {
    const meal = {
      title: 'Café da Manhã',
      foods: [
        { name: 'Ovo cozido', grams: 100 },      // Deve ser "2 ovos cozidos"
        { name: 'Pão integral', grams: 70 },     // Deve ser "2 fatias"
        { name: 'Suco de laranja', grams: 200 }, // Deve ser "1 copo" e usar ml
      ],
    };
    
    const result = await processAIMeal(meal, 'breakfast', ctx);
    
    const eggComponent = result.meal?.components.find(c => c.name_pt.includes('ovo'));
    const breadComponent = result.meal?.components.find(c => c.name_pt.includes('pão') || c.name_pt.includes('Pão'));
    const juiceComponent = result.meal?.components.find(c => c.name_pt.includes('suco') || c.name_pt.includes('Suco'));
    
    // Verificar ovo
    if (!eggComponent?.portion_display.label.includes('ovo')) {
      return { name, passed: false, details: `Ovo não formatado: ${eggComponent?.portion_display.label}` };
    }
    
    // Verificar que líquido usa ml
    if (juiceComponent?.portion_display.unit !== 'ml' && juiceComponent?.portion_display.unit !== 'copo') {
      return { name, passed: false, details: `Líquido não usa ml: ${juiceComponent?.portion_display.unit}` };
    }
    
    return { name, passed: true };
    
  } catch (error) {
    return { name, passed: false, details: error.message };
  }
}

async function testMacroConsistency(ctx: UserContext): Promise<TestCase> {
  const name = 'Macros calculados são consistentes entre fontes';
  
  try {
    // Mesmo ingrediente, mesma porção → mesmo macro
    const meal1 = { title: 'Test', foods: [{ name: 'Arroz branco', grams: 100 }] };
    const meal2 = {
      name: 'Test',
      components: [{ type: 'carb', name: 'Arroz branco', name_en: 'White rice', portion_grams: 100 }],
      total_calories: 128,
    };
    
    const result1 = await processAIMeal(meal1, 'lunch', ctx);
    const result2 = await processDirectMeal(meal2, 'lunch', ctx);
    
    const macro1 = result1.meal?.components[0].macros;
    const macro2 = result2.meal?.components[0].macros;
    
    if (Math.abs((macro1?.kcal || 0) - (macro2?.kcal || 0)) > 5) {
      return { name, passed: false, details: `Calorias diferem: ${macro1?.kcal} vs ${macro2?.kcal}` };
    }
    
    return { name, passed: true };
    
  } catch (error) {
    return { name, passed: false, details: error.message };
  }
}

async function testSafetyConsistency(ctx: UserContext): Promise<TestCase> {
  const name = 'Safety validation bloqueia mesmos ingredientes em todas as fontes';
  
  try {
    const ctxWithAllergy = { ...ctx, intolerances: ['lactose'] };
    
    const mealWithDairy = {
      title: 'Café com Queijo',
      foods: [
        { name: 'Queijo minas', grams: 50 },
        { name: 'Pão francês', grams: 50 },
      ],
    };
    
    const result = await processAIMeal(mealWithDairy, 'breakfast', ctxWithAllergy);
    
    // Queijo deve ser removido ou refeição deve falhar
    const hasCheeseInFinal = result.meal?.components.some(c => 
      c.name_pt.toLowerCase().includes('queijo')
    );
    
    if (hasCheeseInFinal) {
      return { name, passed: false, details: 'Queijo não foi bloqueado para intolerância a lactose' };
    }
    
    return { name, passed: true };
    
  } catch (error) {
    return { name, passed: false, details: error.message };
  }
}
```

---

## FASE 4: FALLBACK CHAIN

### 4.1 Arquivo: `unified-meal-core/fallback-meals.ts`

```typescript
/**
 * FALLBACK MEALS
 * 
 * Refeições de emergência que SEMPRE funcionam
 * Usadas quando todos os outros métodos falham
 */

import { UnifiedMeal, UnifiedComponent, MealType, UserContext } from './types.ts';

// ============= REFEIÇÕES BÁSICAS PRÉ-DEFINIDAS =============
const EMERGENCY_MEALS: Record<MealType, UnifiedMeal> = {
  breakfast: {
    name: 'Café da Manhã Básico',
    meal_type: 'breakfast',
    components: [
      createBasicComponent('french_bread', 'Pão francês', 50, 'carb'),
      createBasicComponent('boiled_eggs', 'Ovo cozido', 50, 'protein'),
      createBasicComponent('black_coffee', 'Café preto', 150, 'beverage'),
    ],
    totals: { calories: 280, protein: 12, carbs: 35, fat: 8, fiber: 2 },
    meta: {
      country: 'BR',
      density: 'moderate',
      prep_time_minutes: 10,
      blocked_for_intolerances: ['gluten', 'egg'],
      dietary_tags: [],
      confidence: 'high',
    },
    source: { type: 'fallback', reason: 'Emergency fallback' },
  },
  
  morning_snack: {
    name: 'Lanche da Manhã Básico',
    meal_type: 'morning_snack',
    components: [
      createBasicComponent('banana', 'Banana', 100, 'fruit'),
    ],
    totals: { calories: 89, protein: 1, carbs: 23, fat: 0, fiber: 3 },
    meta: {
      country: 'BR',
      density: 'light',
      prep_time_minutes: 1,
      blocked_for_intolerances: [],
      dietary_tags: ['vegan'],
      confidence: 'high',
    },
    source: { type: 'fallback', reason: 'Emergency fallback' },
  },
  
  lunch: {
    name: 'Almoço Básico',
    meal_type: 'lunch',
    components: [
      createBasicComponent('grilled_chicken_breast', 'Peito de frango grelhado', 120, 'protein'),
      createBasicComponent('white_rice', 'Arroz branco', 100, 'rice'),
      createBasicComponent('beans', 'Feijão', 100, 'beans'),
      createBasicComponent('iceberg_lettuce', 'Salada verde', 50, 'vegetable'),
    ],
    totals: { calories: 450, protein: 42, carbs: 52, fat: 6, fiber: 12 },
    meta: {
      country: 'BR',
      density: 'moderate',
      prep_time_minutes: 20,
      blocked_for_intolerances: [],
      dietary_tags: [],
      confidence: 'high',
    },
    source: { type: 'fallback', reason: 'Emergency fallback' },
  },
  
  afternoon_snack: {
    name: 'Lanche da Tarde Básico',
    meal_type: 'afternoon_snack',
    components: [
      createBasicComponent('apple', 'Maçã', 150, 'fruit'),
      createBasicComponent('brazil_nuts', 'Castanha do Pará', 20, 'fat'),
    ],
    totals: { calories: 210, protein: 3, carbs: 28, fat: 12, fiber: 4 },
    meta: {
      country: 'BR',
      density: 'light',
      prep_time_minutes: 1,
      blocked_for_intolerances: ['nuts'],
      dietary_tags: ['vegan'],
      confidence: 'high',
    },
    source: { type: 'fallback', reason: 'Emergency fallback' },
  },
  
  dinner: {
    name: 'Jantar Básico',
    meal_type: 'dinner',
    components: [
      createBasicComponent('grilled_tilapia', 'Tilápia grelhada', 150, 'protein'),
      createBasicComponent('boiled_sweet_potato', 'Batata doce cozida', 150, 'carb'),
      createBasicComponent('steamed_broccoli', 'Brócolis no vapor', 80, 'vegetable'),
    ],
    totals: { calories: 320, protein: 35, carbs: 32, fat: 4, fiber: 6 },
    meta: {
      country: 'BR',
      density: 'moderate',
      prep_time_minutes: 25,
      blocked_for_intolerances: ['fish'],
      dietary_tags: [],
      confidence: 'high',
    },
    source: { type: 'fallback', reason: 'Emergency fallback' },
  },
  
  supper: {
    name: 'Ceia Básica',
    meal_type: 'supper',
    components: [
      createBasicComponent('natural_yogurt', 'Iogurte natural', 150, 'dairy'),
    ],
    totals: { calories: 90, protein: 5, carbs: 7, fat: 5, fiber: 0 },
    meta: {
      country: 'BR',
      density: 'light',
      prep_time_minutes: 1,
      blocked_for_intolerances: ['lactose'],
      dietary_tags: ['vegetarian'],
      confidence: 'high',
    },
    source: { type: 'fallback', reason: 'Emergency fallback' },
  },
};

// ============= FALLBACKS PARA INTOLERÂNCIAS =============
const INTOLERANCE_SAFE_SUBSTITUTES: Record<string, Partial<Record<MealType, UnifiedMeal>>> = {
  lactose: {
    supper: {
      ...EMERGENCY_MEALS.supper,
      name: 'Ceia Básica (Sem Lactose)',
      components: [
        createBasicComponent('banana', 'Banana', 100, 'fruit'),
        createBasicComponent('oats', 'Aveia', 30, 'carb'),
      ],
      totals: { calories: 207, protein: 5, carbs: 43, fat: 3, fiber: 6 },
      meta: {
        ...EMERGENCY_MEALS.supper.meta,
        blocked_for_intolerances: [],
        dietary_tags: ['vegan'],
      },
    },
  },
  
  gluten: {
    breakfast: {
      ...EMERGENCY_MEALS.breakfast,
      name: 'Café da Manhã Básico (Sem Glúten)',
      components: [
        createBasicComponent('tapioca', 'Tapioca', 50, 'carb'),
        createBasicComponent('boiled_eggs', 'Ovo cozido', 50, 'protein'),
        createBasicComponent('black_coffee', 'Café preto', 150, 'beverage'),
      ],
      totals: { calories: 265, protein: 7, carbs: 45, fat: 6, fiber: 1 },
      meta: {
        ...EMERGENCY_MEALS.breakfast.meta,
        blocked_for_intolerances: ['egg'],
      },
    },
  },
  
  egg: {
    breakfast: {
      ...EMERGENCY_MEALS.breakfast,
      name: 'Café da Manhã Básico (Sem Ovo)',
      components: [
        createBasicComponent('french_bread', 'Pão francês', 50, 'carb'),
        createBasicComponent('minas_cheese', 'Queijo minas', 30, 'protein'),
        createBasicComponent('black_coffee', 'Café preto', 150, 'beverage'),
      ],
      totals: { calories: 245, protein: 10, carbs: 30, fat: 9, fiber: 1 },
      meta: {
        ...EMERGENCY_MEALS.breakfast.meta,
        blocked_for_intolerances: ['gluten', 'lactose'],
      },
    },
  },
};

// ============= FUNÇÃO PRINCIPAL =============
export function getEmergencyFallback(
  mealType: MealType,
  userContext: UserContext,
): UnifiedMeal {
  // Verificar se precisa de substituto por intolerância
  for (const intolerance of userContext.intolerances) {
    const substitutes = INTOLERANCE_SAFE_SUBSTITUTES[intolerance];
    if (substitutes && substitutes[mealType]) {
      return {
        ...substitutes[mealType]!,
        source: { type: 'fallback', reason: `Emergency fallback for ${intolerance}` },
      };
    }
  }
  
  // Retornar fallback padrão
  return {
    ...EMERGENCY_MEALS[mealType],
    source: { type: 'fallback', reason: 'Emergency fallback' },
  };
}

// ============= HELPER =============
function createBasicComponent(
  key: string,
  namePt: string,
  grams: number,
  type: string,
): UnifiedComponent {
  return {
    ingredient_key: key,
    name_pt: namePt,
    name_en: key.replace(/_/g, ' '),
    type: type as any,
    category: 'other',
    portion_grams: grams,
    portion_display: {
      quantity: grams,
      unit: 'g',
      label: `${namePt} (${grams}g)`,
    },
    macros: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, // Será recalculado
    safety: { contains: [], blocked_for: [], is_safe_for_all: true },
  };
}
```

---

# 📋 CHECKLIST DE IMPLEMENTAÇÃO SEGURA

## PRÉ-REQUISITOS (Antes de Qualquer Código)

- [ ] Criar branch `feature/unified-meal-core`
- [ ] Fazer backup da versão atual
- [ ] Documentar estado atual dos testes

## Fase 1: Criar Unified Meal Core (4h)

- [ ] Criar pasta `_shared/unified-meal-core/`
- [ ] Implementar `types.ts`
- [ ] Implementar `index.ts` (função principal)
- [ ] Implementar `portion-formatter.ts`
- [ ] Implementar `meal-sorter.ts`
- [ ] Implementar `coherence-validator.ts`
- [ ] Implementar `safety-validator.ts`
- [ ] Implementar `macro-calculator.ts`
- [ ] Implementar `fallback-meals.ts`

## Fase 2: Criar Adapters (2h)

- [ ] Criar pasta `_shared/meal-core-adapters/`
- [ ] Implementar `ai-adapter.ts`
- [ ] Implementar `direct-adapter.ts`
- [ ] Implementar `pool-adapter.ts`

## Fase 3: Testes de Paridade (2h)

- [ ] Implementar `test-parity.ts`
- [ ] Executar testes localmente
- [ ] Garantir 100% dos testes passando

## Fase 4: Integração Gradual (4h)

- [ ] **PRIMEIRO:** Integrar no gerador direto (menor risco)
- [ ] Testar gerador direto isoladamente
- [ ] **SEGUNDO:** Integrar no pool
- [ ] Testar pool isoladamente
- [ ] **TERCEIRO:** Integrar no prompt IA (maior risco)
- [ ] Testar prompt IA isoladamente

## Fase 5: Validação Final (2h)

- [ ] Executar testes de paridade completos
- [ ] Testar com usuário real (você)
- [ ] Verificar logs de erros
- [ ] Monitorar fallbacks

## Fase 6: Deploy (1h)

- [ ] Deploy para staging primeiro
- [ ] Validar em staging
- [ ] Deploy para produção
- [ ] Monitorar 24h

---

# 🔒 GARANTIAS DE SEGURANÇA

## 1. Fallback em TODAS as Etapas

```
Passo 1: Pool → falhou?
         ↓
Passo 2: Gerador Direto → falhou?
         ↓
Passo 3: IA → falhou?
         ↓
Passo 4: Fallback de Emergência → SEMPRE FUNCIONA
```

## 2. Rollback Automatizado

```typescript
// Em cada gerador:
try {
  const result = await processRawMeal(...);
  if (!result.success) {
    throw new Error(result.errors.join(', '));
  }
  return result.meal;
} catch (error) {
  // Log para monitoramento
  console.error(`[ROLLBACK] Using emergency fallback: ${error.message}`);
  
  // Retornar fallback
  return getEmergencyFallback(mealType, userContext);
}
```

## 3. Timeout Protection

```typescript
const TIMEOUT_MS = 50000; // 50s (margem de 10s)

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

// Uso:
const result = await withTimeout(processRawMeal(...), TIMEOUT_MS);
```

## 4. Validação de Sanidade

```typescript
function validateMealSanity(meal: UnifiedMeal): boolean {
  // Verificar se tem componentes
  if (!meal.components || meal.components.length === 0) return false;
  
  // Verificar se calorias são razoáveis
  if (meal.totals.calories < 50 || meal.totals.calories > 2000) return false;
  
  // Verificar se tem pelo menos 1 proteína ou 1 carboidrato
  const hasProtein = meal.components.some(c => c.type === 'protein');
  const hasCarb = meal.components.some(c => ['carb', 'rice'].includes(c.type));
  if (!hasProtein && !hasCarb) return false;
  
  return true;
}
```

---

# 📊 MÉTRICAS DE SUCESSO

| Métrica | Critério | Como Medir |
|---------|----------|------------|
| **Paridade** | 100% dos testes passando | `runParityTests()` |
| **Uptime** | 99.9% de refeições geradas | Logs de fallback |
| **Consistência** | 0% de divergência | Comparar outputs |
| **Performance** | < 10s por refeição | Logs de tempo |
| **Safety** | 0% de ingredientes proibidos | Testes de intolerância |

---

**Documento criado em:** 23/01/2026  
**Status:** 📋 PRONTO PARA IMPLEMENTAÇÃO  
**Próximo passo:** Criar branch e iniciar Fase 1
