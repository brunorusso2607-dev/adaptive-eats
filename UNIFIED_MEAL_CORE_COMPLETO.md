# 🔧 UNIFIED MEAL CORE - IMPLEMENTAÇÃO COMPLETA

**Data:** 23/01/2026  
**Status:** 📋 CÓDIGO COMPLETO PARA IMPLEMENTAÇÃO

---

# 📁 ARQUIVO 1: `portion-formatter.ts`

## Localização: `supabase/functions/_shared/unified-meal-core/portion-formatter.ts`

```typescript
/**
 * PORTION FORMATTER
 * 
 * Formatação de porções humanizadas com GRAMAS SEMPRE INCLUÍDAS
 * 
 * REGRA FUNDAMENTAL: Toda porção DEVE mostrar quantidade humanizada + gramas
 * Exemplos:
 * - "2 ovos cozidos (100g)"
 * - "2 fatias de pão integral (70g)"
 * - "1 copo de suco de laranja (200ml)"
 * - "4 colheres de arroz branco (100g)"
 */

import { PortionDisplay } from './types.ts';

// ============= CONFIGURAÇÃO DE PORÇÕES POR INGREDIENTE =============
export const PORTION_CONFIGS: Record<string, PortionConfig> = {
  // ===== OVOS =====
  'boiled_eggs': {
    category: 'eggs',
    unit_name_singular: 'ovo cozido',
    unit_name_plural: 'ovos cozidos',
    grams_per_unit: 50,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 4,
  },
  'fried_eggs': {
    category: 'eggs',
    unit_name_singular: 'ovo frito',
    unit_name_plural: 'ovos fritos',
    grams_per_unit: 50,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 3,
  },
  'scrambled_eggs': {
    category: 'eggs',
    unit_name_singular: 'ovo mexido',
    unit_name_plural: 'ovos mexidos',
    grams_per_unit: 50,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 4,
  },
  'poached_eggs': {
    category: 'eggs',
    unit_name_singular: 'ovo pochê',
    unit_name_plural: 'ovos pochê',
    grams_per_unit: 50,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 3,
  },
  
  // ===== PÃES =====
  'french_bread': {
    category: 'bread',
    unit_name_singular: 'pão francês',
    unit_name_plural: 'pães franceses',
    grams_per_unit: 50,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'whole_wheat_bread': {
    category: 'bread',
    unit_name_singular: 'fatia de pão integral',
    unit_name_plural: 'fatias de pão integral',
    grams_per_unit: 35,
    unit_type: 'fatia',
    min_quantity: 1,
    max_quantity: 3,
  },
  'white_bread': {
    category: 'bread',
    unit_name_singular: 'fatia de pão branco',
    unit_name_plural: 'fatias de pão branco',
    grams_per_unit: 30,
    unit_type: 'fatia',
    min_quantity: 1,
    max_quantity: 3,
  },
  'toast': {
    category: 'bread',
    unit_name_singular: 'torrada',
    unit_name_plural: 'torradas',
    grams_per_unit: 20,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 4,
  },
  'tapioca': {
    category: 'bread',
    unit_name_singular: 'tapioca',
    unit_name_plural: 'tapiocas',
    grams_per_unit: 50,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  
  // ===== LÍQUIDOS =====
  'orange_juice': {
    category: 'juice',
    unit_name_singular: 'copo de suco de laranja',
    unit_name_plural: 'copos de suco de laranja',
    grams_per_unit: 200,
    unit_type: 'copo',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'water': {
    category: 'water',
    unit_name_singular: 'copo de água',
    unit_name_plural: 'copos de água',
    grams_per_unit: 200,
    unit_type: 'copo',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'milk': {
    category: 'milk',
    unit_name_singular: 'copo de leite',
    unit_name_plural: 'copos de leite',
    grams_per_unit: 200,
    unit_type: 'copo',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'black_coffee': {
    category: 'coffee',
    unit_name_singular: 'xícara de café',
    unit_name_plural: 'xícaras de café',
    grams_per_unit: 50,
    unit_type: 'xicara',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'coffee_with_milk': {
    category: 'coffee',
    unit_name_singular: 'xícara de café com leite',
    unit_name_plural: 'xícaras de café com leite',
    grams_per_unit: 150,
    unit_type: 'xicara',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  
  // ===== ARROZ =====
  'white_rice': {
    category: 'rice',
    unit_name_singular: 'colher de sopa de arroz branco',
    unit_name_plural: 'colheres de sopa de arroz branco',
    grams_per_unit: 25,
    unit_type: 'colher_sopa',
    min_quantity: 2,
    max_quantity: 6,
  },
  'brown_rice': {
    category: 'rice',
    unit_name_singular: 'colher de sopa de arroz integral',
    unit_name_plural: 'colheres de sopa de arroz integral',
    grams_per_unit: 25,
    unit_type: 'colher_sopa',
    min_quantity: 2,
    max_quantity: 6,
  },
  'seven_grain_rice': {
    category: 'rice',
    unit_name_singular: 'colher de sopa de arroz 7 grãos',
    unit_name_plural: 'colheres de sopa de arroz 7 grãos',
    grams_per_unit: 25,
    unit_type: 'colher_sopa',
    min_quantity: 2,
    max_quantity: 6,
  },
  
  // ===== FEIJÃO =====
  'beans': {
    category: 'beans',
    unit_name_singular: 'concha de feijão',
    unit_name_plural: 'conchas de feijão',
    grams_per_unit: 80,
    unit_type: 'concha',
    min_quantity: 1,
    max_quantity: 2,
  },
  'black_beans': {
    category: 'beans',
    unit_name_singular: 'concha de feijão preto',
    unit_name_plural: 'conchas de feijão preto',
    grams_per_unit: 80,
    unit_type: 'concha',
    min_quantity: 1,
    max_quantity: 2,
  },
  'white_beans': {
    category: 'beans',
    unit_name_singular: 'concha de feijão branco',
    unit_name_plural: 'conchas de feijão branco',
    grams_per_unit: 80,
    unit_type: 'concha',
    min_quantity: 1,
    max_quantity: 2,
  },
  
  // ===== PROTEÍNAS (sempre mostrar gramas) =====
  'grilled_chicken_breast': {
    category: 'poultry',
    unit_name_singular: 'peito de frango grelhado',
    unit_name_plural: 'peitos de frango grelhados',
    grams_per_unit: 120,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 100,
    max_quantity: 200,
  },
  'grilled_steak': {
    category: 'beef',
    unit_name_singular: 'bife grelhado',
    unit_name_plural: 'bifes grelhados',
    grams_per_unit: 100,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 100,
    max_quantity: 200,
  },
  'grilled_tilapia': {
    category: 'fish',
    unit_name_singular: 'tilápia grelhada',
    unit_name_plural: 'tilápias grelhadas',
    grams_per_unit: 150,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 120,
    max_quantity: 200,
  },
  
  // ===== FRUTAS =====
  'banana': {
    category: 'fruit',
    unit_name_singular: 'banana',
    unit_name_plural: 'bananas',
    grams_per_unit: 100,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'apple': {
    category: 'fruit',
    unit_name_singular: 'maçã',
    unit_name_plural: 'maçãs',
    grams_per_unit: 150,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'orange': {
    category: 'fruit',
    unit_name_singular: 'laranja',
    unit_name_plural: 'laranjas',
    grams_per_unit: 180,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  
  // ===== LATICÍNIOS =====
  'natural_yogurt': {
    category: 'yogurt',
    unit_name_singular: 'pote de iogurte natural',
    unit_name_plural: 'potes de iogurte natural',
    grams_per_unit: 170,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 1,
  },
  'minas_cheese': {
    category: 'cheese',
    unit_name_singular: 'fatia de queijo minas',
    unit_name_plural: 'fatias de queijo minas',
    grams_per_unit: 30,
    unit_type: 'fatia',
    min_quantity: 1,
    max_quantity: 2,
  },
  
  // ===== CONDIMENTOS =====
  'olive_oil': {
    category: 'oil',
    unit_name_singular: 'colher de sopa de azeite',
    unit_name_plural: 'colheres de sopa de azeite',
    grams_per_unit: 10,
    unit_type: 'colher_sopa',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'butter': {
    category: 'fat',
    unit_name_singular: 'colher de chá de manteiga',
    unit_name_plural: 'colheres de chá de manteiga',
    grams_per_unit: 5,
    unit_type: 'colher_cha',
    min_quantity: 1,
    max_quantity: 3,
  },
  
  // ===== VEGETAIS (sempre em gramas) =====
  'iceberg_lettuce': {
    category: 'leafy',
    unit_name_singular: 'salada verde',
    unit_name_plural: 'saladas verdes',
    grams_per_unit: 50,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 30,
    max_quantity: 100,
  },
  'tomato': {
    category: 'vegetable',
    unit_name_singular: 'tomate',
    unit_name_plural: 'tomates',
    grams_per_unit: 80,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 3,
  },
};

// ============= INTERFACE =============
interface PortionConfig {
  category: string;
  unit_name_singular: string;
  unit_name_plural: string;
  grams_per_unit: number;
  unit_type: 'g' | 'ml' | 'unidade' | 'fatia' | 'colher_sopa' | 'colher_cha' | 'concha' | 'copo' | 'xicara';
  display_unit?: 'g' | 'ml';
  min_quantity: number;
  max_quantity: number;
}

// ============= FUNÇÃO PRINCIPAL =============
/**
 * Formata porção com quantidade humanizada + gramas SEMPRE
 */
export function formatPortion(
  ingredientKey: string,
  grams: number,
  language: string = 'pt-BR'
): PortionDisplay {
  const config = PORTION_CONFIGS[ingredientKey];
  
  // Fallback para ingredientes não mapeados
  if (!config) {
    return formatDefaultPortion(grams, ingredientKey);
  }
  
  // Calcular quantidade
  const quantity = Math.round(grams / config.grams_per_unit);
  
  // Determinar unidade de exibição
  let unit = config.unit_type;
  if (config.display_unit) {
    unit = config.display_unit;
  }
  
  // Construir label humanizado
  let label: string;
  
  if (unit === 'g' || unit === 'ml') {
    // Exibir apenas em gramas ou ml (sem quantidade)
    label = `${config.unit_name_singular} (${grams}${unit})`;
  } else {
    // SEMPRE exibir quantidade humanizada + gramas
    const name = quantity === 1 ? config.unit_name_singular : config.unit_name_plural;
    const unitDisplay = config.display_unit || 'g';
    label = `${quantity} ${name} (${grams}${unitDisplay})`;
  }
  
  return {
    quantity,
    unit,
    label,
  };
}

// ============= FALLBACK =============
function formatDefaultPortion(grams: number, ingredientKey: string): PortionDisplay {
  // Tentar detectar se é líquido pelo nome
  const isLiquid = /juice|suco|water|agua|milk|leite|coffee|cafe|tea|cha/i.test(ingredientKey);
  
  return {
    quantity: grams,
    unit: isLiquid ? 'ml' : 'g',
    label: `${grams}${isLiquid ? 'ml' : 'g'}`,
  };
}
```

---

# 📁 ARQUIVO 2: `meal-sorter.ts`

## Localização: `supabase/functions/_shared/unified-meal-core/meal-sorter.ts`

```typescript
/**
 * MEAL SORTER
 * 
 * Ordenação específica para Brasil
 * 
 * ORDEM PARA ALMOÇO/JANTAR:
 * 1. Proteína (frango, carne, peixe, ovo)
 * 2. Arroz
 * 3. Feijão
 * 4. Vegetais/Salada
 * 5. Outros carboidratos (batata, macarrão)
 * 6. Condimentos (azeite, limão)
 * 7. Outros
 * 8. Bebida (água, suco) - PENÚLTIMO
 * 9. Sobremesa (fruta, doce) - ÚLTIMO
 * 
 * ORDEM PARA CAFÉ DA MANHÃ:
 * 1. Proteína (ovo, queijo)
 * 2. Carboidrato (pão, tapioca)
 * 3. Laticínio (iogurte, leite)
 * 4. Gordura (manteiga, requeijão)
 * 5. Fruta
 * 6. Outros
 * 7. Bebida (café, suco) - ÚLTIMO
 * 
 * ORDEM PARA LANCHES:
 * 1. Principal (sanduíche, fruta, iogurte)
 * 2. Complemento
 * 3. Bebida - ÚLTIMO
 */

import { UnifiedComponent, MealType } from './types.ts';

// ============= ORDEM DE PRIORIDADE POR TIPO =============
const SORT_ORDER_LUNCH_DINNER: Record<string, number> = {
  'protein': 1,     // 1º: Proteína
  'rice': 2,        // 2º: Arroz
  'beans': 3,       // 3º: Feijão
  'vegetable': 4,   // 4º: Vegetais/salada
  'carb': 5,        // 5º: Outros carboidratos (batata, macarrão)
  'fat': 6,         // 6º: Gorduras/condimentos
  'other': 7,       // 7º: Outros
  'beverage': 8,    // 8º: PENÚLTIMO - Bebida
  'dessert': 9,     // 9º: ÚLTIMO - Sobremesa
  'fruit': 9,       // 9º: ÚLTIMO - Fruta (conta como sobremesa)
};

const SORT_ORDER_BREAKFAST: Record<string, number> = {
  'protein': 1,     // 1º: Proteína (ovo, queijo)
  'carb': 2,        // 2º: Carboidrato (pão, tapioca)
  'dairy': 3,       // 3º: Laticínio (iogurte, leite)
  'fat': 4,         // 4º: Gordura (manteiga, requeijão)
  'fruit': 5,       // 5º: Fruta
  'other': 6,       // 6º: Outros
  'beverage': 7,    // 7º: ÚLTIMO - Bebida (café, suco)
  'dessert': 8,     // 8º: (raro no café, mas por segurança)
};

const SORT_ORDER_SNACK: Record<string, number> = {
  'carb': 1,        // 1º: Principal
  'protein': 1,     // 1º: Principal
  'dairy': 2,       // 2º: Complemento
  'fruit': 2,       // 2º: Complemento
  'fat': 3,         // 3º: Complemento
  'other': 4,       // 4º: Outros
  'beverage': 5,    // 5º: ÚLTIMO - Bebida
  'dessert': 6,     // 6º: ÚLTIMO - Sobremesa
};

// ============= FUNÇÃO PRINCIPAL =============
export function sortComponentsBR(
  components: UnifiedComponent[],
  mealType: MealType
): UnifiedComponent[] {
  // Selecionar ordem baseada no tipo de refeição
  let sortOrder: Record<string, number>;
  
  switch (mealType) {
    case 'breakfast':
      sortOrder = SORT_ORDER_BREAKFAST;
      break;
    case 'morning_snack':
    case 'afternoon_snack':
    case 'supper':
      sortOrder = SORT_ORDER_SNACK;
      break;
    case 'lunch':
    case 'dinner':
    default:
      sortOrder = SORT_ORDER_LUNCH_DINNER;
      break;
  }
  
  // Criar cópia para não mutar original
  const sorted = [...components];
  
  // Ordenar
  sorted.sort((a, b) => {
    const orderA = sortOrder[a.type] ?? 99;
    const orderB = sortOrder[b.type] ?? 99;
    
    // Se mesma prioridade, manter ordem original (estável)
    if (orderA === orderB) return 0;
    
    return orderA - orderB;
  });
  
  return sorted;
}

// ============= FUNÇÃO DE CATEGORIZAÇÃO =============
/**
 * Categoriza um ingrediente baseado no nome
 * Usado quando não temos o tipo explícito
 */
export function categorizeByName(name: string): string {
  const normalized = name.toLowerCase();
  
  // Proteínas
  if (/frango|chicken|carne|beef|bife|steak|peixe|fish|ovo|egg|camar[aã]o|shrimp/.test(normalized)) {
    return 'protein';
  }
  
  // Arroz (específico)
  if (/arroz|rice/.test(normalized)) {
    return 'rice';
  }
  
  // Feijão (específico)
  if (/feij[aã]o|beans|lentilha|gr[aã]o.de.bico/.test(normalized)) {
    return 'beans';
  }
  
  // Bebidas
  if (/suco|juice|[aá]gua|water|caf[eé]|coffee|ch[aá]|tea|leite|milk/.test(normalized)) {
    return 'beverage';
  }
  
  // Sobremesas
  if (/sobremesa|dessert|pudim|mousse|sorvete|bolo|doce/.test(normalized)) {
    return 'dessert';
  }
  
  // Frutas (podem ser sobremesa)
  if (/banana|ma[cç][aã]|laranja|mam[aã]o|melancia|morango|abacaxi|manga/.test(normalized)) {
    return 'fruit';
  }
  
  // Vegetais
  if (/alface|lettuce|tomate|tomato|pepino|cebola|cenoura|br[oó]colis|couve/.test(normalized)) {
    return 'vegetable';
  }
  
  // Carboidratos
  if (/p[aã]o|bread|macarr[aã]o|pasta|batata|potato|mandioca|tapioca/.test(normalized)) {
    return 'carb';
  }
  
  // Gorduras/Condimentos
  if (/azeite|oil|manteiga|butter|requeij[aã]o|maionese/.test(normalized)) {
    return 'fat';
  }
  
  // Laticínios
  if (/iogurte|yogurt|queijo|cheese/.test(normalized)) {
    return 'dairy';
  }
  
  return 'other';
}
```

---

# 📁 ARQUIVO 3: `coherence-validator.ts`

## Localização: `supabase/functions/_shared/unified-meal-core/coherence-validator.ts`

```typescript
/**
 * COHERENCE VALIDATOR
 * 
 * Validação de coerência - evita combinações bizarras
 */

import { UnifiedComponent, MealType } from './types.ts';

// ============= COMBINAÇÕES PROIBIDAS =============
const FORBIDDEN_COMBINATIONS = [
  {
    triggers: ['sopa', 'caldo'],
    with: ['salada', 'alface', 'tomate'],
    reason: 'Sopa não combina com salada fria',
  },
  {
    triggers: ['arroz'],
    with: ['macarr', 'massa', 'lasanha', 'espaguete'],
    reason: 'Dois carboidratos pesados na mesma refeição',
  },
  {
    triggers: ['pizza'],
    with: ['arroz', 'feij', 'macarr'],
    reason: 'Pizza é uma refeição completa',
  },
  {
    triggers: ['hamburguer', 'burger', 'sanduiche', 'sandwich'],
    with: ['arroz', 'feij', 'macarr'],
    reason: 'Sanduíche/hambúrguer é uma refeição completa',
  },
  {
    triggers: ['feijoada'],
    with: ['salada de fruta', 'sorvete', 'pudim'],
    reason: 'Feijoada tradicionalmente acompanha laranja, não sobremesas pesadas',
  },
  {
    triggers: ['mingau', 'aveia'],
    with: ['arroz', 'feij', 'carne', 'frango'],
    reason: 'Mingau é refeição leve, não combina com pratos pesados',
  },
  {
    triggers: ['acai', 'açaí'],
    with: ['arroz', 'feij', 'carne', 'frango', 'peixe'],
    reason: 'Açaí é lanche/sobremesa, não combina com refeição salgada',
  },
  {
    triggers: ['cereal', 'sucrilhos', 'granola'],
    with: ['arroz', 'feij', 'carne'],
    reason: 'Cereal é café da manhã, não combina com almoço/jantar',
  },
];

// ============= LIMITES DE PORÇÃO =============
const PORTION_LIMITS = {
  oil: { max_grams: 15, reason: 'Azeite/óleo máximo 1 colher de sopa' },
  sugar: { max_grams: 10, reason: 'Açúcar máximo 2 colheres de chá' },
  salt: { max_grams: 2, reason: 'Sal máximo 1 pitada' },
  butter: { max_grams: 20, reason: 'Manteiga máximo 1 colher de sopa' },
};

// ============= RESULTADO DA VALIDAÇÃO =============
export interface CoherenceResult {
  isCoherent: boolean;
  errors: string[];
  warnings: string[];
  canAutoFix: boolean;
  fixedComponents?: UnifiedComponent[];
  fixes: string[];
}

// ============= FUNÇÃO PRINCIPAL =============
export function validateCoherence(
  components: UnifiedComponent[],
  mealType: MealType,
  country: string
): CoherenceResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fixes: string[] = [];
  let fixedComponents: UnifiedComponent[] | undefined;
  
  // Concatenar todos os nomes para busca
  const allNames = components.map(c => c.name_pt.toLowerCase()).join(' | ');
  
  // ============= VERIFICAR COMBINAÇÕES PROIBIDAS =============
  for (const combo of FORBIDDEN_COMBINATIONS) {
    const hasTrigger = combo.triggers.some(t => allNames.includes(t));
    const hasConflict = combo.with.some(w => allNames.includes(w));
    
    if (hasTrigger && hasConflict) {
      errors.push(combo.reason);
    }
  }
  
  // ============= VERIFICAR LIMITES DE PORÇÃO =============
  for (const component of components) {
    const category = component.category;
    const limit = PORTION_LIMITS[category as keyof typeof PORTION_LIMITS];
    
    if (limit && component.portion_grams > limit.max_grams) {
      warnings.push(`${component.name_pt}: ${limit.reason} (atual: ${component.portion_grams}g)`);
      
      // Auto-fix: ajustar porção
      if (!fixedComponents) {
        fixedComponents = components.map(c => ({ ...c }));
      }
      const toFix = fixedComponents.find(c => c.ingredient_key === component.ingredient_key);
      if (toFix) {
        toFix.portion_grams = limit.max_grams;
        fixes.push(`Ajustado ${component.name_pt} de ${component.portion_grams}g para ${limit.max_grams}g`);
      }
    }
  }
  
  // ============= VERIFICAR MÍNIMOS POR TIPO DE REFEIÇÃO =============
  if (mealType === 'lunch' || mealType === 'dinner') {
    const hasProtein = components.some(c => c.type === 'protein');
    if (!hasProtein) {
      warnings.push('Almoço/jantar sem proteína');
    }
  }
  
  return {
    isCoherent: errors.length === 0,
    errors,
    warnings,
    canAutoFix: errors.length === 0 && fixes.length > 0,
    fixedComponents,
    fixes,
  };
}
```

---

# ✅ EXEMPLOS DE OUTPUT FINAL

## Café da Manhã BR:
```
1. 2 ovos cozidos (100g)
2. 2 fatias de pão integral (70g)
3. 1 colher de requeijão (20g)
4. 1 banana (100g)
5. 1 xícara de café com leite (150ml)
```

## Almoço BR:
```
1. Peito de frango grelhado (120g)
2. 4 colheres de sopa de arroz branco (100g)
3. 1 concha de feijão (80g)
4. Salada verde (50g)
5. 1 colher de sopa de azeite (10ml)
6. 1 copo de suco de laranja (200ml)
7. 1 banana (100g)
```

## Jantar BR:
```
1. Tilápia grelhada (150g)
2. 3 colheres de sopa de arroz integral (75g)
3. 1 concha de feijão preto (80g)
4. Brócolis no vapor (80g)
5. 1 copo de água (200ml)
```

---

**Documento criado em:** 23/01/2026  
**Status:** ✅ PRONTO PARA ADICIONAR AO ESTRATEGIA_IMPLEMENTACAO_SEGURA.md
