// ═══════════════════════════════════════════════════════════════════════
// ADAPTIVE EATS - REGRAS DE VALIDAÇÃO DE REFEIÇÕES
// Validações para garantir que refeições façam sentido
// ═══════════════════════════════════════════════════════════════════════

import { INGREDIENTS, type Ingredient } from "./meal-ingredients-db.ts";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTES DE CATEGORIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════

// Ingredientes que NUNCA devem ser oferecidos isoladamente
export const SEASONING_INGREDIENTS = [
  'cebola_refogada',
  'alho_refogado',
  'cheiro_verde',
];

export const FAT_CONDIMENTS = [
  'azeite_oliva',
  'azeite_extra_virgem',
];

export const SWEETENERS = [
  'mel',
];

export const GARNISH_ONLY = [
  'alface_americana',
  'alface_crespa',
  'tomate',
  'pepino',
  'cenoura_ralada',
];

// Calorias mínimas por tipo de refeição
export const MIN_CALORIES_BY_MEAL_TYPE: Record<string, number> = {
  cafe_manha: 150,
  breakfast: 150,
  lanche_manha: 80,
  morning_snack: 80,
  almoco: 300,
  lunch: 300,
  lanche_tarde: 80,
  afternoon_snack: 80,
  jantar: 300,
  dinner: 300,
  ceia: 50,
  evening_snack: 50,
};

// ═══════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════

export interface Component {
  type: string;
  name: string;
  name_en?: string;
  portion_grams?: number;
  portion_label?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  autoFixed: boolean;
  fixedComponents?: Component[];
}

// ═══════════════════════════════════════════════════════════════════════
// FASE 2: VALIDAÇÕES DE REFEIÇÃO MÍNIMA
// ═══════════════════════════════════════════════════════════════════════

/**
 * Valida se refeição tem pelo menos 2 componentes
 * EXCEÇÃO: Pratos compostos (lasanha, feijoada, etc.) podem ter 1 componente
 */
export function validateMinimumComponents(
  components: Component[],
  mealName: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Pratos compostos que podem ter 1 componente
  const compositeDishes = [
    'lasanha', 'feijoada', 'strogonoff', 'escondidinho', 
    'pizza', 'hamburguer', 'sanduiche', 'wrap', 'burrito',
    'vitamina', 'smoothie', 'sopa'
  ];
  
  const isCompositeDish = compositeDishes.some(dish => 
    mealName.toLowerCase().includes(dish)
  );
  
  if (components.length < 2 && !isCompositeDish) {
    errors.push(`Refeição deve ter pelo menos 2 componentes (tem ${components.length})`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    autoFixed: false,
  };
}

/**
 * Valida que temperos não sejam o componente principal
 */
export function validateNoSeasoningAsMain(components: Component[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const mainComponents = components.filter(c => {
    const ingredientKey = c.name.toLowerCase().replace(/\s+/g, '_');
    return !SEASONING_INGREDIENTS.includes(ingredientKey);
  });
  
  if (mainComponents.length === 0) {
    errors.push('Refeição não pode ter apenas temperos');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    autoFixed: false,
  };
}

/**
 * Valida que gorduras condimentares estejam sempre acompanhadas
 */
export function validateFatCondiments(components: Component[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const hasFatCondiment = components.some(c => {
    const ingredientKey = c.name.toLowerCase().replace(/\s+/g, '_');
    return FAT_CONDIMENTS.includes(ingredientKey);
  });
  
  if (hasFatCondiment) {
    // Se tem azeite, DEVE ter salada ou proteína
    const hasMainDish = components.some(c => 
      c.type === 'protein' || c.type === 'vegetable'
    );
    
    if (!hasMainDish) {
      errors.push('Azeite deve estar acompanhado de salada ou proteína');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    autoFixed: false,
  };
}

/**
 * Valida calorias mínimas por tipo de refeição
 */
export function validateMinimumCalories(
  totalCalories: number,
  mealType: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const minCal = MIN_CALORIES_BY_MEAL_TYPE[mealType] || 100;
  
  if (totalCalories < minCal) {
    errors.push(`Refeição tem ${totalCalories} kcal, mínimo esperado: ${minCal} kcal`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    autoFixed: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// FASE 3: AGRUPAMENTO INTELIGENTE DE COMPONENTES
// ═══════════════════════════════════════════════════════════════════════

/**
 * REGRA CRÍTICA: NUNCA combinar arroz com feijão
 * Eles devem permanecer SEMPRE separados
 */
export function shouldNeverCombine(comp1: Component, comp2: Component): boolean {
  const name1 = comp1.name.toLowerCase();
  const name2 = comp2.name.toLowerCase();
  
  // NUNCA combinar arroz com feijão
  if ((name1.includes('arroz') && name2.includes('feijão')) ||
      (name1.includes('feijão') && name2.includes('arroz'))) {
    return true;
  }
  
  return false;
}

/**
 * Agrupa pão com proteína (ovo, queijo, presunto)
 * Ex: "Pão integral" + "Ovo mexido" → "Pão integral com ovo mexido"
 */
export function groupBreadWithProtein(components: Component[]): Component[] {
  const bread = components.find(c => 
    c.name.toLowerCase().includes('pão') || 
    c.name.toLowerCase().includes('torrada')
  );
  
  const protein = components.find(c => 
    c.type === 'protein' && 
    (c.name.toLowerCase().includes('ovo') || 
     c.name.toLowerCase().includes('queijo') || 
     c.name.toLowerCase().includes('presunto') ||
     c.name.toLowerCase().includes('requeijão'))
  );
  
  if (bread && protein && !shouldNeverCombine(bread, protein)) {
    // Criar componente composto
    const grouped: Component = {
      type: 'composite',
      name: `${bread.name} com ${protein.name.toLowerCase()}`,
      portion_grams: (bread.portion_grams || 0) + (protein.portion_grams || 0),
    };
    
    // Remover componentes individuais e adicionar composto
    const remaining = components.filter(c => c !== bread && c !== protein);
    return [grouped, ...remaining];
  }
  
  return components;
}

/**
 * Agrupa salada com azeite
 * Ex: "Alface" + "Tomate" + "Azeite" → "Salada de alface e tomate com azeite"
 */
export function groupSaladWithOil(components: Component[]): Component[] {
  const vegetables = components.filter(c => 
    c.type === 'vegetable' && 
    (c.name.toLowerCase().includes('alface') ||
     c.name.toLowerCase().includes('tomate') ||
     c.name.toLowerCase().includes('pepino') ||
     c.name.toLowerCase().includes('cenoura ralada'))
  );
  
  const oil = components.find(c => {
    const ingredientKey = c.name.toLowerCase().replace(/\s+/g, '_');
    return FAT_CONDIMENTS.includes(ingredientKey);
  });
  
  if (vegetables.length >= 2 && oil) {
    // Criar nome da salada
    const vegNames = vegetables.map(v => v.name.toLowerCase()).join(' e ');
    
    const grouped: Component = {
      type: 'composite',
      name: `Salada de ${vegNames} com azeite`,
      portion_grams: vegetables.reduce((sum, v) => sum + (v.portion_grams || 0), 0) + (oil.portion_grams || 0),
    };
    
    // Remover componentes individuais e adicionar composto
    const remaining = components.filter(c => 
      !vegetables.includes(c) && c !== oil
    );
    return [grouped, ...remaining];
  }
  
  return components;
}

/**
 * Agrupa iogurte com mel ou frutas
 * Ex: "Iogurte natural" + "Mel" → "Iogurte natural com mel"
 */
export function groupYogurtWithToppings(components: Component[]): Component[] {
  const yogurt = components.find(c => 
    c.name.toLowerCase().includes('iogurte')
  );
  
  const sweetener = components.find(c => {
    const ingredientKey = c.name.toLowerCase().replace(/\s+/g, '_');
    return SWEETENERS.includes(ingredientKey);
  });
  
  const fruit = components.find(c => 
    c.type === 'fruit'
  );
  
  if (yogurt && (sweetener || fruit)) {
    const topping = sweetener || fruit;
    
    const grouped: Component = {
      type: 'composite',
      name: `${yogurt.name} com ${topping!.name.toLowerCase()}`,
      portion_grams: (yogurt.portion_grams || 0) + (topping!.portion_grams || 0),
    };
    
    // Remover componentes individuais e adicionar composto
    const remaining = components.filter(c => c !== yogurt && c !== topping);
    return [grouped, ...remaining];
  }
  
  return components;
}

/**
 * Aplica todas as regras de agrupamento
 * 
 * NOTA: groupBreadWithProtein e groupYogurtWithToppings foram DESABILITADOS
 * porque escondiam ingredientes individuais em composites, fazendo com que
 * o usuário não visse os ingredientes separados na refeição.
 * 
 * Apenas groupSaladWithOil é mantido porque saladas são tradicionalmente
 * mostradas como um único item.
 */
export function applySmartGrouping(components: Component[]): Component[] {
  let result = [...components];
  
  // DESABILITADO: Esconde ingredientes individuais
  // result = groupBreadWithProtein(result);
  
  // Mantido: Saladas são tradicionalmente um único item
  result = groupSaladWithOil(result);
  
  // DESABILITADO: Esconde ingredientes individuais
  // result = groupYogurtWithToppings(result);
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════
// FASE 5: MELHORAR NOMES GENÉRICOS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Expande nomes genéricos para serem mais descritivos
 * Ex: "Alface americana" → "Salada de alface americana com tomate"
 */
export function expandGenericMealName(
  mealName: string,
  components: Component[]
): string {
  const vegetables = components.filter(c => c.type === 'vegetable');
  
  // Se o nome é apenas "Alface" e tem múltiplos vegetais, expandir
  if (mealName.toLowerCase().includes('alface') && vegetables.length >= 2) {
    const vegNames = vegetables.map(v => v.name.toLowerCase()).join(', ');
    return `Salada de ${vegNames}`;
  }
  
  // Se o nome é apenas "Salada" e tem vegetais específicos, expandir
  if (mealName.toLowerCase() === 'salada' && vegetables.length >= 1) {
    const vegNames = vegetables.map(v => v.name.toLowerCase()).join(', ');
    return `Salada de ${vegNames}`;
  }
  
  return mealName;
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDAÇÃO COMPLETA
// ═══════════════════════════════════════════════════════════════════════

/**
 * Executa todas as validações e agrupamentos
 */
export function validateAndFixMeal(
  mealName: string,
  components: Component[],
  totalCalories: number,
  mealType: string
): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  let fixedComponents = [...components];
  let autoFixed = false;
  
  // FASE 2: Validações
  const minComponentsResult = validateMinimumComponents(fixedComponents, mealName);
  allErrors.push(...minComponentsResult.errors);
  allWarnings.push(...minComponentsResult.warnings);
  
  const noSeasoningResult = validateNoSeasoningAsMain(fixedComponents);
  allErrors.push(...noSeasoningResult.errors);
  allWarnings.push(...noSeasoningResult.warnings);
  
  const fatCondimentsResult = validateFatCondiments(fixedComponents);
  allErrors.push(...fatCondimentsResult.errors);
  allWarnings.push(...fatCondimentsResult.warnings);
  
  const minCaloriesResult = validateMinimumCalories(totalCalories, mealType);
  allErrors.push(...minCaloriesResult.errors);
  allWarnings.push(...minCaloriesResult.warnings);
  
  // FASE 3: Agrupamento inteligente (se passou nas validações)
  if (allErrors.length === 0) {
    const grouped = applySmartGrouping(fixedComponents);
    if (grouped.length !== fixedComponents.length) {
      fixedComponents = grouped;
      autoFixed = true;
    }
  }
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    autoFixed,
    fixedComponents: autoFixed ? fixedComponents : undefined,
  };
}

