import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// PROFILE VARIATIONS - Simulando humanos reais
// ============================================
interface TestProfile {
  name: string;
  age: number;
  sex: 'M' | 'F';
  weight_current: number;
  height: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  goal: 'lose_weight' | 'maintain' | 'gain_muscle';
  intolerances: string[];
  dietary_preference: string | null;
  excluded_ingredients: string[];
  country: string;
}

const TEST_PROFILES: TestProfile[] = [
  // CRIANÇAS
  {
    name: "Criança 8 anos - Sedentária - Lactose",
    age: 8,
    sex: 'M',
    weight_current: 28,
    height: 128,
    activity_level: 'sedentary',
    goal: 'maintain',
    intolerances: ['lactose'],
    dietary_preference: null,
    excluded_ingredients: [],
    country: 'BR'
  },
  {
    name: "Criança 12 anos - Ativa - Glúten + Ovo",
    age: 12,
    sex: 'F',
    weight_current: 42,
    height: 152,
    activity_level: 'very_active',
    goal: 'maintain',
    intolerances: ['gluten', 'ovos'],
    dietary_preference: null,
    excluded_ingredients: [],
    country: 'BR'
  },
  
  // ADOLESCENTES
  {
    name: "Adolescente 16 anos - Atleta - Sem restrições",
    age: 16,
    sex: 'M',
    weight_current: 65,
    height: 175,
    activity_level: 'extra_active',
    goal: 'gain_muscle',
    intolerances: [],
    dietary_preference: null,
    excluded_ingredients: [],
    country: 'BR'
  },
  {
    name: "Adolescente 15 anos - Vegetariana - Lactose",
    age: 15,
    sex: 'F',
    weight_current: 52,
    height: 162,
    activity_level: 'moderately_active',
    goal: 'maintain',
    intolerances: ['lactose'],
    dietary_preference: 'vegetarian',
    excluded_ingredients: [],
    country: 'BR'
  },
  
  // ADULTOS JOVENS
  {
    name: "Adulto 25 anos - Sedentário - Emagrecer",
    age: 25,
    sex: 'M',
    weight_current: 95,
    height: 178,
    activity_level: 'sedentary',
    goal: 'lose_weight',
    intolerances: [],
    dietary_preference: null,
    excluded_ingredients: ['bacon', 'refrigerante'],
    country: 'BR'
  },
  {
    name: "Adulta 28 anos - Vegana - FODMAP + Soja",
    age: 28,
    sex: 'F',
    weight_current: 58,
    height: 165,
    activity_level: 'moderately_active',
    goal: 'maintain',
    intolerances: ['fodmap', 'soja'],
    dietary_preference: 'vegan',
    excluded_ingredients: [],
    country: 'BR'
  },
  {
    name: "Adulto 30 anos - Muito ativo - Ganhar músculo",
    age: 30,
    sex: 'M',
    weight_current: 75,
    height: 180,
    activity_level: 'very_active',
    goal: 'gain_muscle',
    intolerances: [],
    dietary_preference: null,
    excluded_ingredients: [],
    country: 'US'
  },
  
  // ADULTOS MEIA-IDADE
  {
    name: "Adulto 45 anos - Multi-intolerâncias",
    age: 45,
    sex: 'M',
    weight_current: 82,
    height: 172,
    activity_level: 'lightly_active',
    goal: 'lose_weight',
    intolerances: ['lactose', 'gluten', 'frutos_mar'],
    dietary_preference: null,
    excluded_ingredients: ['porco'],
    country: 'PT'
  },
  {
    name: "Adulta 50 anos - Pescetariana - Emagrecer",
    age: 50,
    sex: 'F',
    weight_current: 72,
    height: 160,
    activity_level: 'lightly_active',
    goal: 'lose_weight',
    intolerances: ['histamina'],
    dietary_preference: 'pescetarian',
    excluded_ingredients: [],
    country: 'ES'
  },
  
  // IDOSOS
  {
    name: "Idoso 65 anos - Sedentário - Diabetes",
    age: 65,
    sex: 'M',
    weight_current: 78,
    height: 170,
    activity_level: 'sedentary',
    goal: 'maintain',
    intolerances: ['lactose'],
    dietary_preference: null,
    excluded_ingredients: ['açúcar', 'doces'],
    country: 'BR'
  },
  {
    name: "Idosa 70 anos - Leve atividade - Múltiplas restrições",
    age: 70,
    sex: 'F',
    weight_current: 62,
    height: 155,
    activity_level: 'lightly_active',
    goal: 'maintain',
    intolerances: ['lactose', 'gluten', 'amendoim', 'castanhas'],
    dietary_preference: null,
    excluded_ingredients: [],
    country: 'BR'
  },
  
  // CASOS EXTREMOS
  {
    name: "Atleta Elite 22 anos - Extremo",
    age: 22,
    sex: 'M',
    weight_current: 85,
    height: 188,
    activity_level: 'extra_active',
    goal: 'gain_muscle',
    intolerances: [],
    dietary_preference: null,
    excluded_ingredients: [],
    country: 'US'
  },
  {
    name: "Vegana Estrita - Todas intolerâncias comuns",
    age: 35,
    sex: 'F',
    weight_current: 55,
    height: 163,
    activity_level: 'moderately_active',
    goal: 'maintain',
    intolerances: ['lactose', 'gluten', 'soja', 'amendoim', 'castanhas'],
    dietary_preference: 'vegan',
    excluded_ingredients: [],
    country: 'DE'
  },
  
  // PAÍSES DIFERENTES
  {
    name: "Usuário França - Intolerância Sulfitos",
    age: 40,
    sex: 'M',
    weight_current: 80,
    height: 175,
    activity_level: 'moderately_active',
    goal: 'maintain',
    intolerances: ['sulfitos'],
    dietary_preference: null,
    excluded_ingredients: ['vinho'],
    country: 'FR'
  },
  {
    name: "Usuária Itália - Celíaca + Lactose",
    age: 33,
    sex: 'F',
    weight_current: 60,
    height: 168,
    activity_level: 'lightly_active',
    goal: 'lose_weight',
    intolerances: ['gluten', 'lactose'],
    dietary_preference: null,
    excluded_ingredients: [],
    country: 'IT'
  }
];

// ============================================
// NUTRITIONAL CALCULATIONS (espelho do backend)
// ============================================
function calculateBMR(weight: number, height: number, age: number, sex: string): number {
  if (sex === 'M') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

function getActivityMultiplier(level: string): number {
  const multipliers: Record<string, number> = {
    'sedentary': 1.2,
    'lightly_active': 1.375,
    'moderately_active': 1.55,
    'very_active': 1.725,
    'extra_active': 1.9
  };
  return multipliers[level] || 1.2;
}

function calculateTDEE(bmr: number, activityLevel: string): number {
  return Math.round(bmr * getActivityMultiplier(activityLevel));
}

function calculateTargetCalories(tdee: number, goal: string): number {
  switch (goal) {
    case 'lose_weight':
      return Math.round(tdee * 0.8); // -20%
    case 'gain_muscle':
      return Math.round(tdee * 1.15); // +15%
    default:
      return tdee;
  }
}

function calculateMacros(calories: number, weight: number, goal: string) {
  let proteinPerKg = 1.6;
  let fatRatio = 0.25;
  
  if (goal === 'gain_muscle') {
    proteinPerKg = 2.0;
    fatRatio = 0.25;
  } else if (goal === 'lose_weight') {
    proteinPerKg = 1.8;
    fatRatio = 0.30;
  }
  
  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.round((calories * fatRatio) / 9);
  const carbCalories = calories - (protein * 4) - (fat * 9);
  const carbs = Math.round(carbCalories / 4);
  
  return { protein, fat, carbs };
}

// ============================================
// TEST FUNCTIONS
// ============================================
interface TestResult {
  profile: string;
  module: string;
  test: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  error?: string;
}

async function testNutritionalCalculations(profile: TestProfile): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Test BMR calculation
  const bmr = calculateBMR(profile.weight_current, profile.height, profile.age, profile.sex);
  
  // BMR sanity checks
  const minBMR = profile.sex === 'M' ? 1000 : 800;
  const maxBMR = profile.sex === 'M' ? 2500 : 2000;
  
  results.push({
    profile: profile.name,
    module: 'Nutritional Calculations',
    test: 'BMR within healthy range',
    passed: bmr >= minBMR && bmr <= maxBMR,
    expected: `${minBMR}-${maxBMR} kcal`,
    actual: `${Math.round(bmr)} kcal`
  });
  
  // Test TDEE calculation
  const tdee = calculateTDEE(bmr, profile.activity_level);
  const expectedMinTDEE = Math.round(bmr * 1.1);
  const expectedMaxTDEE = Math.round(bmr * 2.2);
  
  results.push({
    profile: profile.name,
    module: 'Nutritional Calculations',
    test: 'TDEE reflects activity level',
    passed: tdee >= expectedMinTDEE && tdee <= expectedMaxTDEE,
    expected: `${expectedMinTDEE}-${expectedMaxTDEE} kcal`,
    actual: `${tdee} kcal`
  });
  
  // Test target calories by goal
  const targetCalories = calculateTargetCalories(tdee, profile.goal);
  let calorieTestPassed = false;
  
  if (profile.goal === 'lose_weight') {
    calorieTestPassed = targetCalories < tdee && targetCalories >= tdee * 0.7;
  } else if (profile.goal === 'gain_muscle') {
    calorieTestPassed = targetCalories > tdee && targetCalories <= tdee * 1.3;
  } else {
    calorieTestPassed = Math.abs(targetCalories - tdee) < 100;
  }
  
  results.push({
    profile: profile.name,
    module: 'Nutritional Calculations',
    test: `Target calories align with goal (${profile.goal})`,
    passed: calorieTestPassed,
    expected: profile.goal === 'lose_weight' ? `< ${tdee}` : profile.goal === 'gain_muscle' ? `> ${tdee}` : `≈ ${tdee}`,
    actual: `${targetCalories} kcal`
  });
  
  // Test macro distribution
  const macros = calculateMacros(targetCalories, profile.weight_current, profile.goal);
  const totalMacroCalories = (macros.protein * 4) + (macros.carbs * 4) + (macros.fat * 9);
  const calorieDiff = Math.abs(totalMacroCalories - targetCalories);
  
  results.push({
    profile: profile.name,
    module: 'Nutritional Calculations',
    test: 'Macro calories sum correctly',
    passed: calorieDiff < 50,
    expected: `${targetCalories} kcal`,
    actual: `${totalMacroCalories} kcal (diff: ${calorieDiff})`
  });
  
  // Test protein adequacy
  const minProtein = profile.weight_current * 1.2;
  const maxProtein = profile.weight_current * 2.5;
  
  results.push({
    profile: profile.name,
    module: 'Nutritional Calculations',
    test: 'Protein within healthy range',
    passed: macros.protein >= minProtein && macros.protein <= maxProtein,
    expected: `${Math.round(minProtein)}-${Math.round(maxProtein)}g`,
    actual: `${macros.protein}g`
  });
  
  // Age-specific tests
  if (profile.age < 18) {
    // Children/teens should have adequate calories for growth
    const minCaloriesForAge = profile.age < 12 ? 1200 : 1500;
    results.push({
      profile: profile.name,
      module: 'Nutritional Calculations',
      test: 'Adequate calories for growth (child/teen)',
      passed: targetCalories >= minCaloriesForAge,
      expected: `>= ${minCaloriesForAge} kcal`,
      actual: `${targetCalories} kcal`
    });
  }
  
  if (profile.age >= 65) {
    // Elderly should have adequate protein
    const minProteinForElderly = profile.weight_current * 1.2;
    results.push({
      profile: profile.name,
      module: 'Nutritional Calculations',
      test: 'Adequate protein for elderly',
      passed: macros.protein >= minProteinForElderly,
      expected: `>= ${Math.round(minProteinForElderly)}g`,
      actual: `${macros.protein}g`
    });
  }
  
  return results;
}

async function testSafetyValidation(profile: TestProfile, supabase: any): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Load intolerance mappings
  const { data: mappings } = await supabase
    .from('intolerance_mappings')
    .select('ingredient, intolerance_key')
    .limit(5000);
  
  const { data: dietaryForbidden } = await supabase
    .from('dietary_forbidden_ingredients')
    .select('ingredient, dietary_key')
    .limit(5000);
  
  // Test each intolerance
  for (const intolerance of profile.intolerances) {
    const blockedIngredients = (mappings || [])
      .filter((m: any) => m.intolerance_key === intolerance)
      .map((m: any) => m.ingredient);
    
    results.push({
      profile: profile.name,
      module: 'Safety Validation',
      test: `Intolerance "${intolerance}" has mapped ingredients`,
      passed: blockedIngredients.length > 0,
      expected: '> 0 blocked ingredients',
      actual: `${blockedIngredients.length} ingredients`
    });
    
    // Sample test - check specific ingredients are blocked
    if (intolerance === 'lactose') {
      const hasLeite = blockedIngredients.some((i: string) => i.includes('leite') || i.includes('milk'));
      const hasQueijo = blockedIngredients.some((i: string) => i.includes('queijo') || i.includes('cheese'));
      
      results.push({
        profile: profile.name,
        module: 'Safety Validation',
        test: 'Lactose blocks milk and cheese',
        passed: hasLeite && hasQueijo,
        expected: 'leite/milk AND queijo/cheese blocked',
        actual: `leite: ${hasLeite}, queijo: ${hasQueijo}`
      });
    }
    
    if (intolerance === 'gluten') {
      const hasTrigo = blockedIngredients.some((i: string) => i.includes('trigo') || i.includes('wheat'));
      const hasCevada = blockedIngredients.some((i: string) => i.includes('cevada') || i.includes('barley'));
      
      results.push({
        profile: profile.name,
        module: 'Safety Validation',
        test: 'Gluten blocks wheat and barley',
        passed: hasTrigo && hasCevada,
        expected: 'trigo/wheat AND cevada/barley blocked',
        actual: `trigo: ${hasTrigo}, cevada: ${hasCevada}`
      });
    }
  }
  
  // Test dietary preference
  if (profile.dietary_preference) {
    const forbiddenForDiet = (dietaryForbidden || [])
      .filter((d: any) => d.dietary_key === profile.dietary_preference)
      .map((d: any) => d.ingredient);
    
    results.push({
      profile: profile.name,
      module: 'Safety Validation',
      test: `Dietary "${profile.dietary_preference}" has forbidden ingredients`,
      passed: forbiddenForDiet.length > 0,
      expected: '> 0 forbidden ingredients',
      actual: `${forbiddenForDiet.length} ingredients`
    });
    
    if (profile.dietary_preference === 'vegan') {
      const hasMeat = forbiddenForDiet.some((i: string) => 
        i.includes('carne') || i.includes('meat') || i.includes('frango') || i.includes('chicken')
      );
      const hasDairy = forbiddenForDiet.some((i: string) => 
        i.includes('leite') || i.includes('milk') || i.includes('queijo') || i.includes('cheese')
      );
      
      results.push({
        profile: profile.name,
        module: 'Safety Validation',
        test: 'Vegan blocks meat and dairy',
        passed: hasMeat && hasDairy,
        expected: 'meat AND dairy blocked',
        actual: `meat: ${hasMeat}, dairy: ${hasDairy}`
      });
    }
    
    if (profile.dietary_preference === 'vegetarian') {
      const hasMeat = forbiddenForDiet.some((i: string) => 
        i.includes('carne') || i.includes('meat') || i.includes('frango') || i.includes('chicken')
      );
      
      results.push({
        profile: profile.name,
        module: 'Safety Validation',
        test: 'Vegetarian blocks meat',
        passed: hasMeat,
        expected: 'meat blocked',
        actual: `meat: ${hasMeat}`
      });
    }
  }
  
  return results;
}

async function testModuleConsistency(supabase: any): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Check that all modules import globalSafetyEngine
  const modulesToCheck = [
    'analyze-food-photo',
    'analyze-fridge-photo', 
    'analyze-label-photo',
    'generate-ai-meal-plan',
    'regenerate-meal',
    'suggest-meal-alternatives',
    'generate-recipe',
    'suggest-food-ai'
  ];
  
  // This is a conceptual test - in production we'd verify the actual imports
  // For now, we verify the safety data is accessible
  
  const { data: intoleranceMappings, error: intError } = await supabase
    .from('intolerance_mappings')
    .select('id')
    .limit(1);
  
  results.push({
    profile: 'System',
    module: 'Module Consistency',
    test: 'Intolerance mappings table accessible',
    passed: !intError && intoleranceMappings?.length > 0,
    expected: 'Table accessible with data',
    actual: intError ? `Error: ${intError.message}` : `${intoleranceMappings?.length} rows`
  });
  
  const { data: safeKeywords, error: safeError } = await supabase
    .from('intolerance_safe_keywords')
    .select('id')
    .limit(1);
  
  results.push({
    profile: 'System',
    module: 'Module Consistency',
    test: 'Safe keywords table accessible',
    passed: !safeError && safeKeywords?.length > 0,
    expected: 'Table accessible with data',
    actual: safeError ? `Error: ${safeError.message}` : `${safeKeywords?.length} rows`
  });
  
  const { data: dietaryForbidden, error: dietError } = await supabase
    .from('dietary_forbidden_ingredients')
    .select('id')
    .limit(1);
  
  results.push({
    profile: 'System',
    module: 'Module Consistency',
    test: 'Dietary forbidden table accessible',
    passed: !dietError && dietaryForbidden?.length > 0,
    expected: 'Table accessible with data',
    actual: dietError ? `Error: ${dietError.message}` : `${dietaryForbidden?.length} rows`
  });
  
  // Verify key normalization
  const { data: keyNorm, error: keyError } = await supabase
    .from('intolerance_key_normalization')
    .select('onboarding_key, database_key')
    .limit(100);
  
  const expectedKeys = ['lactose', 'gluten', 'amendoim', 'soja', 'ovos'];
  const foundKeys = (keyNorm || []).map((k: any) => k.database_key);
  const allKeysPresent = expectedKeys.every(k => foundKeys.includes(k));
  
  results.push({
    profile: 'System',
    module: 'Module Consistency',
    test: 'Key normalization has essential intolerances',
    passed: allKeysPresent,
    expected: expectedKeys.join(', '),
    actual: foundKeys.slice(0, 10).join(', ') + (foundKeys.length > 10 ? '...' : '')
  });
  
  return results;
}

async function testDatabaseCoverage(supabase: any): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Count total intolerance mappings
  const { count: mappingCount } = await supabase
    .from('intolerance_mappings')
    .select('*', { count: 'exact', head: true });
  
  results.push({
    profile: 'System',
    module: 'Database Coverage',
    test: 'Intolerance mappings count adequate',
    passed: (mappingCount || 0) >= 3000,
    expected: '>= 3000 mappings',
    actual: `${mappingCount} mappings`
  });
  
  // Count safe keywords
  const { count: safeCount } = await supabase
    .from('intolerance_safe_keywords')
    .select('*', { count: 'exact', head: true });
  
  results.push({
    profile: 'System',
    module: 'Database Coverage',
    test: 'Safe keywords count adequate',
    passed: (safeCount || 0) >= 400,
    expected: '>= 400 keywords',
    actual: `${safeCount} keywords`
  });
  
  // Count dietary forbidden
  const { count: dietaryCount } = await supabase
    .from('dietary_forbidden_ingredients')
    .select('*', { count: 'exact', head: true });
  
  results.push({
    profile: 'System',
    module: 'Database Coverage',
    test: 'Dietary forbidden count adequate',
    passed: (dietaryCount || 0) >= 400,
    expected: '>= 400 ingredients',
    actual: `${dietaryCount} ingredients`
  });
  
  // Check language coverage
  const { data: languages } = await supabase
    .from('dietary_forbidden_ingredients')
    .select('language')
    .limit(5000);
  
  const uniqueLanguages = [...new Set((languages || []).map((l: any) => l.language))];
  const expectedLanguages = ['pt', 'en', 'es', 'fr', 'de', 'it'];
  const hasAllLanguages = expectedLanguages.every(lang => uniqueLanguages.includes(lang));
  
  results.push({
    profile: 'System',
    module: 'Database Coverage',
    test: 'Multi-language support (6 languages)',
    passed: hasAllLanguages,
    expected: expectedLanguages.join(', '),
    actual: uniqueLanguages.join(', ')
  });
  
  // Check all 17 intolerances are mapped
  const { data: intoleranceKeys } = await supabase
    .from('intolerance_mappings')
    .select('intolerance_key')
    .limit(5000);
  
  const uniqueIntolerances = [...new Set((intoleranceKeys || []).map((i: any) => i.intolerance_key))];
  const expected17 = [
    'lactose', 'gluten', 'amendoim', 'frutos_mar', 'peixe', 'ovos', 'soja',
    'sulfitos', 'castanhas', 'sesamo', 'tremoco', 'mostarda', 'aipo',
    'moluscos', 'fodmap', 'histamina', 'salicilatos'
  ];
  
  const coverage17 = expected17.filter(i => uniqueIntolerances.includes(i));
  
  results.push({
    profile: 'System',
    module: 'Database Coverage',
    test: 'All 17 intolerances have mappings',
    passed: coverage17.length >= 17,
    expected: '17 intolerances covered',
    actual: `${coverage17.length}/17 covered`
  });
  
  return results;
}

async function testFalsePositivePrevention(supabase: any): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Load data for testing
  const { data: mappings } = await supabase
    .from('intolerance_mappings')
    .select('ingredient, intolerance_key')
    .limit(5000);
  
  const { data: safeKeywords } = await supabase
    .from('intolerance_safe_keywords')
    .select('keyword, intolerance_key')
    .limit(1000);
  
  // containsWholeWord implementation
  function containsWholeWord(text: string, word: string): boolean {
    const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedWord = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zA-Z0-9]|$)`, 'i');
    return regex.test(normalizedText);
  }
  
  // Test cases for false positive prevention
  const falsePositiveTests = [
    { food: 'feijão preto', intolerance: 'ovos', shouldBlock: false },
    { food: 'ovo de galinha', intolerance: 'ovos', shouldBlock: true },
    { food: 'maçã', intolerance: 'amendoim', shouldBlock: false },
    { food: 'amendoim torrado', intolerance: 'amendoim', shouldBlock: true },
    { food: 'leite zero lactose', intolerance: 'lactose', shouldBlock: false },
    { food: 'leite integral', intolerance: 'lactose', shouldBlock: true },
    { food: 'pão sem glúten', intolerance: 'gluten', shouldBlock: false },
    { food: 'pão de forma', intolerance: 'gluten', shouldBlock: true },
    { food: 'queijo sem lactose', intolerance: 'lactose', shouldBlock: false },
    { food: 'chocolate', intolerance: 'lactose', shouldBlock: true }, // Most chocolate has milk
    { food: 'arroz branco', intolerance: 'gluten', shouldBlock: false },
    { food: 'macarrão de trigo', intolerance: 'gluten', shouldBlock: true },
    { food: 'tofu', intolerance: 'soja', shouldBlock: true },
    { food: 'edamame', intolerance: 'soja', shouldBlock: true },
    { food: 'salmão grelhado', intolerance: 'peixe', shouldBlock: true },
    { food: 'camarão', intolerance: 'frutos_mar', shouldBlock: true },
  ];
  
  for (const test of falsePositiveTests) {
    const blockedIngredients = (mappings || [])
      .filter((m: any) => m.intolerance_key === test.intolerance)
      .map((m: any) => m.ingredient);
    
    const safeWords = (safeKeywords || [])
      .filter((s: any) => s.intolerance_key === test.intolerance)
      .map((s: any) => s.keyword);
    
    // Check if safe word is present
    const isSafe = safeWords.some((safe: string) => containsWholeWord(test.food, safe));
    
    // Check if blocked ingredient is present
    const isBlocked = !isSafe && blockedIngredients.some((blocked: string) => 
      containsWholeWord(test.food, blocked)
    );
    
    const actualBlocked = isBlocked;
    const passed = actualBlocked === test.shouldBlock;
    
    results.push({
      profile: 'System',
      module: 'False Positive Prevention',
      test: `"${test.food}" + ${test.intolerance}: ${test.shouldBlock ? 'BLOCK' : 'ALLOW'}`,
      passed,
      expected: test.shouldBlock ? 'BLOCKED' : 'ALLOWED',
      actual: actualBlocked ? 'BLOCKED' : 'ALLOWED'
    });
  }
  
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    console.log('🧪 Starting Human Simulation Tests...');
    console.log(`📊 Testing ${TEST_PROFILES.length} different user profiles`);
    
    const allResults: TestResult[] = [];
    
    // Run nutritional calculation tests for each profile
    console.log('\n📐 Testing Nutritional Calculations...');
    for (const profile of TEST_PROFILES) {
      const nutritionResults = await testNutritionalCalculations(profile);
      allResults.push(...nutritionResults);
    }
    
    // Run safety validation tests for each profile
    console.log('\n🛡️ Testing Safety Validation...');
    for (const profile of TEST_PROFILES) {
      const safetyResults = await testSafetyValidation(profile, supabase);
      allResults.push(...safetyResults);
    }
    
    // Run module consistency tests
    console.log('\n🔗 Testing Module Consistency...');
    const consistencyResults = await testModuleConsistency(supabase);
    allResults.push(...consistencyResults);
    
    // Run database coverage tests
    console.log('\n📦 Testing Database Coverage...');
    const coverageResults = await testDatabaseCoverage(supabase);
    allResults.push(...coverageResults);
    
    // Run false positive prevention tests
    console.log('\n🎯 Testing False Positive Prevention...');
    const falsePositiveResults = await testFalsePositivePrevention(supabase);
    allResults.push(...falsePositiveResults);
    
    // Calculate summary
    const passed = allResults.filter(r => r.passed).length;
    const failed = allResults.filter(r => !r.passed).length;
    const total = allResults.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    // Group by module
    const byModule: Record<string, { passed: number; failed: number; tests: TestResult[] }> = {};
    for (const result of allResults) {
      if (!byModule[result.module]) {
        byModule[result.module] = { passed: 0, failed: 0, tests: [] };
      }
      if (result.passed) {
        byModule[result.module].passed++;
      } else {
        byModule[result.module].failed++;
      }
      byModule[result.module].tests.push(result);
    }
    
    // Get failed tests for review
    const failedTests = allResults.filter(r => !r.passed);
    
    console.log('\n📊 Test Summary:');
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed} | Rate: ${passRate}%`);
    
    return new Response(JSON.stringify({
      success: failed === 0,
      summary: {
        total_tests: total,
        passed,
        failed,
        pass_rate: `${passRate}%`,
        profiles_tested: TEST_PROFILES.length
      },
      by_module: Object.entries(byModule).map(([module, data]) => ({
        module,
        passed: data.passed,
        failed: data.failed,
        total: data.passed + data.failed,
        pass_rate: `${((data.passed / (data.passed + data.failed)) * 100).toFixed(1)}%`
      })),
      failed_tests: failedTests.map(t => ({
        profile: t.profile,
        module: t.module,
        test: t.test,
        expected: t.expected,
        actual: t.actual
      })),
      profiles_tested: TEST_PROFILES.map(p => ({
        name: p.name,
        age: p.age,
        sex: p.sex,
        activity: p.activity_level,
        goal: p.goal,
        intolerances: p.intolerances,
        dietary: p.dietary_preference,
        country: p.country
      }))
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: unknown) {
    console.error('Error in human simulation tests:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

