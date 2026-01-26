# ✅ CHECKLIST DE REQUISITOS - UNIFIED MEAL CORE

**Data:** 23/01/2026  
**Status:** 📋 ANÁLISE DE CONFORMIDADE

---

# 📋 SEUS REQUISITOS VS IMPLEMENTAÇÃO PROPOSTA

## REQUISITO 1: MACROS 100% SEGUROS

| Aspecto | Status | Localização no Core |
|---------|--------|---------------------|
| Cálculo centralizado | ✅ OK | `macro-calculator.ts` |
| Fonte única de verdade | ✅ OK | `calculateMacros()` no index.ts |
| Validação de sanidade | ✅ OK | `validateMealSanity()` |

**Como funciona:**
```typescript
// macro-calculator.ts
// Todos os módulos chamam ESTA função, não fazem cálculo próprio
const macros = await calculateMacros(ingredientKey, raw.grams, raw);
```

**Status:** ✅ **CONTEMPLADO**

---

## REQUISITO 2: COERÊNCIA (NUNCA REFEIÇÕES BIZARRAS)

| Aspecto | Status | Localização no Core |
|---------|--------|---------------------|
| Combinações proibidas | ✅ OK | `coherence-validator.ts` |
| Sopa + Salada | ✅ OK | `FORBIDDEN_COMBINATIONS` |
| Arroz + Macarrão | ✅ OK | `FORBIDDEN_COMBINATIONS` |
| Auto-fix de problemas | ✅ OK | `canAutoFix` flag |

**Como funciona:**
```typescript
// coherence-validator.ts
const FORBIDDEN_COMBINATIONS = [
  { triggers: ['sopa', 'caldo'], with: ['salada'], reason: 'Sopa não combina com salada' },
  { triggers: ['arroz'], with: ['macarrão', 'massa'], reason: 'Dois carboidratos pesados' },
  { triggers: ['pizza'], with: ['arroz', 'feijão'], reason: 'Pizza é refeição completa' },
];
```

**Status:** ✅ **CONTEMPLADO**

---

## REQUISITO 3: UNIDADES CORRETAS (ml, g, fatias)

| Aspecto | Status | Localização no Core | Observação |
|---------|--------|---------------------|------------|
| ml para líquidos | ✅ OK | `portion-formatter.ts` | - |
| g para sólidos | ✅ OK | `portion-formatter.ts` | - |
| fatias para pão | ⚠️ PARCIAL | `portion-formatter.ts` | Precisa especificação completa |

**No documento atual:**
```typescript
// types.ts - linha 136
unit: 'g' | 'ml' | 'unidade' | 'fatia' | 'colher_sopa' | 'concha' | 'copo' | 'xicara';
```

**Status:** ⚠️ **PARCIALMENTE CONTEMPLADO - PRECISA DETALHAMENTO**

**O que falta:**
- Tabela completa de mapeamento ingrediente → unidade
- Regras de conversão g → fatias, g → ml

---

## REQUISITO 4: QUANTIDADES HUMANIZADAS

| Aspecto | Status | Localização no Core | Observação |
|---------|--------|---------------------|------------|
| 2 ovos cozidos | ⚠️ PARCIAL | `portion-formatter.ts` | Exemplo citado, mas precisa regras |
| 2 fatias de pão | ⚠️ PARCIAL | `portion-formatter.ts` | Precisa tabela de conversão |
| 1 copo de suco | ⚠️ PARCIAL | `portion-formatter.ts` | Precisa tabela de conversão |
| 2 colheres de arroz | ⚠️ PARCIAL | `portion-formatter.ts` | Precisa tabela de conversão |

**No documento atual:**
```typescript
// types.ts - linha 102
portion_display: PortionDisplay;  // Ex: { quantity: 2, unit: "unidade", label: "2 ovos cozidos" }
```

**Status:** ⚠️ **PARCIALMENTE CONTEMPLADO - FALTA TABELA DE CONVERSÃO COMPLETA**

---

## REQUISITO 5: SEQUÊNCIA DOS ALIMENTOS

| Posição | Esperado | Status | Observação |
|---------|----------|--------|------------|
| 1ª | Proteína | ⚠️ PARCIAL | Mencionado, mas não especificado |
| 2ª | Arroz | ⚠️ PARCIAL | Type `rice` existe, mas ordem não |
| 3ª | Feijão | ⚠️ PARCIAL | Type `beans` existe, mas ordem não |
| 4ª-... | Outros | ⚠️ PARCIAL | Vegetais, legumes |
| Penúltima | Água/Suco | ⚠️ PARCIAL | Type `beverage` existe |
| Última | Sobremesa | ⚠️ PARCIAL | Type `dessert` existe |

**No documento atual:**
```typescript
// index.ts - linha 353
const sortedComponents = sortComponentsBR(unifiedComponents, mealType);
```

**Status:** ⚠️ **PARCIALMENTE CONTEMPLADO - FALTA IMPLEMENTAÇÃO DETALHADA DO `meal-sorter.ts`**

---

# 🔴 O QUE FALTA NO UNIFIED MEAL CORE

## 1. PORTION FORMATTER DETALHADO

```typescript
/**
 * ARQUIVO: unified-meal-core/portion-formatter.ts
 * 
 * Tabela completa de conversão para quantidades humanizadas
 */

// ============= CONFIGURAÇÃO DE PORÇÕES POR CATEGORIA =============
export const PORTION_CONFIGS: Record<string, PortionConfig> = {
  // ===== OVOS =====
  'boiled_eggs': {
    category: 'eggs',
    unit_name_singular: 'ovo cozido',
    unit_name_plural: 'ovos cozidos',
    grams_per_unit: 50,          // 1 ovo = 50g
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
  
  // ===== PÃES =====
  'french_bread': {
    category: 'bread',
    unit_name_singular: 'pão francês',
    unit_name_plural: 'pães franceses',
    grams_per_unit: 50,          // 1 pão = 50g
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'whole_wheat_bread': {
    category: 'bread',
    unit_name_singular: 'fatia de pão integral',
    unit_name_plural: 'fatias de pão integral',
    grams_per_unit: 35,          // 1 fatia = 35g
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
  
  // ===== LÍQUIDOS =====
  'orange_juice': {
    category: 'juice',
    unit_name_singular: 'copo de suco de laranja',
    unit_name_plural: 'copos de suco de laranja',
    grams_per_unit: 200,         // 1 copo = 200ml
    unit_type: 'copo',
    display_unit: 'ml',          // Exibir em ml
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
  
  // ===== PROTEÍNAS (sempre em gramas) =====
  'grilled_chicken_breast': {
    category: 'poultry',
    unit_name_singular: 'porção de peito de frango grelhado',
    unit_name_plural: 'porções de peito de frango grelhado',
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
    unit_type: 'unidade',
    display_as_grams: true,      // Exibir "Bife grelhado (120g)"
    min_quantity: 1,
    max_quantity: 2,
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
  
  // ===== IOGURTES =====
  'natural_yogurt': {
    category: 'yogurt',
    unit_name_singular: 'pote de iogurte natural',
    unit_name_plural: 'potes de iogurte natural',
    grams_per_unit: 170,
    unit_type: 'unidade',
    display_as_grams: true,
    min_quantity: 1,
    max_quantity: 1,
  },
  
  // ===== VEGETAIS (sempre em gramas) =====
  'iceberg_lettuce': {
    category: 'leafy',
    unit_name_singular: 'porção de alface',
    unit_name_plural: 'porções de alface',
    grams_per_unit: 30,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 20,
    max_quantity: 80,
  },
};

// ============= INTERFACE =============
interface PortionConfig {
  category: string;
  unit_name_singular: string;
  unit_name_plural: string;
  grams_per_unit: number;
  unit_type: 'g' | 'ml' | 'unidade' | 'fatia' | 'colher_sopa' | 'concha' | 'copo' | 'xicara';
  display_unit?: 'g' | 'ml';     // Unidade para exibição (sobrescreve unit_type)
  display_as_grams?: boolean;    // Se true, adiciona "(Xg)" ao label
  min_quantity: number;
  max_quantity: number;
}

// ============= FUNÇÃO PRINCIPAL =============
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
    // Exibir em gramas ou ml
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

## 2. MEAL SORTER DETALHADO

```typescript
/**
 * ARQUIVO: unified-meal-core/meal-sorter.ts
 * 
 * Ordenação específica para Brasil
 * 
 * ORDEM PARA ALMOÇO/JANTAR:
 * 1. Proteína (frango, carne, peixe, ovo)
 * 2. Arroz
 * 3. Feijão
 * 4. Vegetais/Salada
 * 5. Legumes
 * 6. Condimentos (azeite, limão)
 * 7. Bebida (água, suco)
 * 8. Sobremesa (fruta, doce)
 * 
 * ORDEM PARA CAFÉ DA MANHÃ:
 * 1. Proteína (ovo, queijo)
 * 2. Carboidrato (pão, tapioca)
 * 3. Complemento (manteiga, requeijão)
 * 4. Fruta
 * 5. Bebida (café, suco)
 * 
 * ORDEM PARA LANCHES:
 * 1. Principal (sanduíche, fruta, iogurte)
 * 2. Complemento
 * 3. Bebida
 */

import { UnifiedComponent, MealType } from './types.ts';

// ============= ORDEM DE PRIORIDADE POR TIPO =============
const SORT_ORDER_LUNCH_DINNER: Record<string, number> = {
  'protein': 1,     // Primeiro: proteína
  'rice': 2,        // Segundo: arroz
  'beans': 3,       // Terceiro: feijão
  'vegetable': 4,   // Quarto: vegetais/salada
  'carb': 5,        // Quinto: outros carboidratos (batata, macarrão)
  'fat': 6,         // Sexto: gorduras/condimentos
  'other': 7,       // Sétimo: outros
  'beverage': 8,    // PENÚLTIMO: bebida
  'dessert': 9,     // ÚLTIMO: sobremesa
  'fruit': 9,       // ÚLTIMO: fruta (conta como sobremesa)
};

const SORT_ORDER_BREAKFAST: Record<string, number> = {
  'protein': 1,     // Primeiro: proteína (ovo, queijo)
  'carb': 2,        // Segundo: carboidrato (pão, tapioca)
  'dairy': 3,       // Terceiro: laticínio (iogurte, leite)
  'fat': 4,         // Quarto: gordura (manteiga, requeijão)
  'fruit': 5,       // Quinto: fruta
  'other': 6,       // Sexto: outros
  'beverage': 7,    // ÚLTIMO: bebida (café, suco)
  'dessert': 8,     // (raro no café, mas por segurança)
};

const SORT_ORDER_SNACK: Record<string, number> = {
  'carb': 1,        // Primeiro: principal
  'protein': 1,     // Primeiro: principal
  'dairy': 2,       // Segundo: complemento
  'fruit': 2,       // Segundo: complemento
  'fat': 3,         // Terceiro: complemento
  'other': 4,       // Quarto: outros
  'beverage': 5,    // ÚLTIMO: bebida
  'dessert': 6,     // ÚLTIMO: sobremesa
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

## 3. COHERENCE VALIDATOR DETALHADO

```typescript
/**
 * ARQUIVO: unified-meal-core/coherence-validator.ts
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
interface CoherenceResult {
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

# 📊 RESUMO DA ANÁLISE

| Requisito | Status | Ação Necessária |
|-----------|--------|-----------------|
| **1. Macros 100% seguros** | ✅ OK | Nenhuma |
| **2. Coerência (sem bizarrias)** | ✅ OK | Adicionar código detalhado acima |
| **3. ml/g/fatias** | ⚠️ PARCIAL | Adicionar PORTION_CONFIGS completo |
| **4. Quantidades humanizadas** | ⚠️ PARCIAL | Adicionar PORTION_CONFIGS completo |
| **5. Sequência correta** | ⚠️ PARCIAL | Adicionar SORT_ORDER completo |

---

# ✅ PRÓXIMOS PASSOS

1. **Adicionar ao ESTRATEGIA_IMPLEMENTACAO_SEGURA.md:**
   - Código completo do `portion-formatter.ts`
   - Código completo do `meal-sorter.ts`
   - Código completo do `coherence-validator.ts`

2. **Criar tabela completa de ingredientes:**
   - Todos os ovos (cozido, frito, mexido, pochê)
   - Todos os pães (francês, integral, forma, torrada)
   - Todos os líquidos (sucos, água, leite, café)
   - Todos os arrozes (branco, integral, 7 grãos)
   - Todos os feijões (carioca, preto, branco)

**Deseja que eu atualize o documento principal com estes códigos detalhados?**
