# 🎯 PLANO CORE INTELIGENTE DE REFEIÇÕES
## Análise Completa + Plano de Ação Silicon Valley + Nutrição

**Data:** 23/01/2026  
**Status:** 📋 ANÁLISE COMPLETA - AGUARDANDO IMPLEMENTAÇÃO  
**Autor:** Cascade AI + Validação Nutricional

---

# 📊 PARTE 1: ANÁLISE DOS 3 MÓDULOS DE GERAÇÃO

## 1.1 MÓDULO 1: PROMPT IA (`generate-ai-meal-plan/index.ts`)

### **O que faz:**
- Gera planos alimentares usando Gemini AI
- Recebe prompt detalhado com regras nutricionais
- Valida output da IA contra restrições do usuário
- Calcula macros usando `calculateRealMacros.ts`

### **Pontos fortes:**
✅ Prompt detalhado com 5000+ linhas de regras  
✅ Valida intolerâncias via `globalSafetyEngine.ts`  
✅ Corrige medidas incorretas (xícara → colher de sopa)  
✅ Agrupa ingredientes separados (`groupSeparatedIngredients`)  
✅ Ordena ingredientes (`sortMealIngredients`)  

### **Problemas identificados:**
❌ **Ordem dos ingredientes incompleta:** `sortMealIngredients()` ordena em 5 categorias (prato principal → acompanhamento → condimento → fruta → bebida), MAS:
  - NÃO força arroz na 2ª posição
  - NÃO força feijão na 3ª posição
  - Usa categorização genérica, não específica

❌ **Unidades (ml/g/fatias) inconsistentes:**
  - `portion_label` no output é sempre `{grams}g` ou `{grams}ml`
  - NÃO há lógica para "fatias" de pão
  - NÃO há lógica para "unidades" de ovo
  - Campo `unit` da interface `Ingredient` NÃO é usado no output final

❌ **Quantidades humanizadas ausentes:**
  - "Ovo cozido (100g)" ao invés de "2 ovos cozidos"
  - "Pão integral (70g)" ao invés de "2 fatias de pão integral"
  - "Suco de laranja (200g)" ao invés de "1 copo de suco de laranja"

❌ **Validação de coerência parcial:**
  - Valida título vs ingredientes (bidirecional)
  - MAS não valida combinações bizarras (sopa + salada)

---

## 1.2 MÓDULO 2: GERADOR DIRETO (`advanced-meal-generator.ts`)

### **O que faz:**
- Gera refeições usando templates TypeScript (sem IA)
- Usa `SMART_TEMPLATES` com slots de ingredientes
- Calcula macros diretamente do `INGREDIENTS`
- Aplica regras culturais e de intolerância

### **Pontos fortes:**
✅ **Macros 100% seguros** - calcula direto do `INGREDIENTS` (TACO/TBCA)  
✅ **Consistência garantida** - templates fechados, não inventa  
✅ Usa `sortComponents()` para ordenar  
✅ Aplica `validateAndFixMeal()` antes de retornar  
✅ Detecta bebidas e usa `ml` no `portion_label`  

### **Problemas identificados:**
❌ **Ordem dos componentes incompleta:**
```typescript
// advanced-meal-generator.ts:196-207
const order = {
  carb: 1,      // ❌ Deveria ser: arroz: 1, feijão: 2
  legume: 2,
  protein: 3,
  vegetable: 4,
  fruit: 5,
  dairy: 6,
  fat: 7,
  beverage: 8,
  other: 9,
};
```
- `carb: 1` coloca QUALQUER carboidrato primeiro
- NÃO diferencia arroz de feijão
- Feijão tem `type: legume`, não `type: carb`

❌ **Quantidades humanizadas ausentes:**
- `portion_label` é sempre `{portion}g` ou `{portion}ml`
- NÃO converte para "2 ovos", "2 fatias de pão", etc.

❌ **Interface `Component` limitada:**
```typescript
interface Component {
  type: string;
  name: string;
  name_en: string;
  portion_grams: number;   // ❌ Sempre em gramas
  portion_label: string;   // ❌ Sempre "Xg" ou "Xml"
  // FALTAM:
  // portion_unit?: 'g' | 'ml' | 'unidade' | 'fatia' | 'colher';
  // quantity?: number; // Ex: 2 (para "2 ovos")
  // quantity_label?: string; // Ex: "2 ovos cozidos"
}
```

---

## 1.3 MÓDULO 3: POOL DE REFEIÇÕES (`populate-meal-pool/index.ts`)

### **O que faz:**
- Popula `meal_combinations` com refeições pré-geradas
- Usa `generateMealsForPool()` do `advanced-meal-generator.ts`
- Enriquece componentes com dados do `canonical_ingredients`

### **Pontos fortes:**
✅ Usa o mesmo gerador direto (templates)  
✅ Calcula macros via `canonical_ingredients` (fonte de verdade)  
✅ Insere no banco com `approval_status: "approved"`  

### **Problemas identificados:**
❌ **Herda todos os problemas do gerador direto**  
❌ **Não aplica ordenação própria** - confia no gerador  
❌ **Não humaniza quantidades** - passa direto pro banco  
❌ **Interface `MealComponent` diferente:**
```typescript
interface MealComponent {
  type: string;
  name: string;
  name_en?: string;
  canonical_id?: string;
  portion_grams?: number;  // ❌ Sempre gramas
  portion_ml?: number;     // ✅ Tem campo ML (mas não é usado consistentemente)
  portion_label?: string;  // ❌ Gerado como "Xg"
}
```

---

# 📊 PARTE 2: ANÁLISE COMPARATIVA DOS 3 MÓDULOS

## 2.1 TABELA DE INCONSISTÊNCIAS

| Aspecto | Prompt IA | Gerador Direto | Pool |
|---------|-----------|----------------|------|
| **Ordem arroz/feijão** | ❌ Não específica | ❌ Não específica | ❌ Herda |
| **ml para líquidos** | ⚠️ Parcial | ✅ Funciona | ⚠️ Parcial |
| **Fatias para pão** | ❌ Não existe | ❌ Não existe | ❌ Não existe |
| **Quantidades humanizadas** | ❌ Não existe | ❌ Não existe | ❌ Não existe |
| **Macros seguros** | ⚠️ Cascata | ✅ Direto TACO | ✅ Canonical |
| **Safety Engine** | ✅ globalSafetyEngine | ⚠️ Só intolerâncias | ⚠️ Só intolerâncias |
| **Coerência refeições** | ⚠️ Parcial | ✅ Templates fechados | ✅ Herda |

## 2.2 FLUXO DE DADOS ATUAL

```
┌─────────────────────────────────────────────────────────────────┐
│                    FONTES DE REFEIÇÃO                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1] PROMPT IA                [2] GERADOR DIRETO                │
│  ┌───────────┐                ┌───────────────┐                 │
│  │ Gemini AI │                │ SMART_TEMPLATES│                │
│  │ + Prompt  │                │ + INGREDIENTS │                 │
│  └─────┬─────┘                └───────┬───────┘                 │
│        │                              │                         │
│        ▼                              ▼                         │
│  ┌─────────────┐              ┌───────────────┐                 │
│  │ Validação   │              │ sortComponents │                │
│  │ + Correção  │              │ (ordem atual) │                 │
│  └─────┬───────┘              └───────┬───────┘                 │
│        │                              │                         │
│        │         [3] POOL             │                         │
│        │         ┌───────────────────┐│                         │
│        │         │ meal_combinations ││                         │
│        │         └─────────┬─────────┘│                         │
│        │                   │          │                         │
│        ▼                   ▼          ▼                         │
│  ┌──────────────────────────────────────────┐                   │
│  │           SAÍDA FINAL (inconsistente)    │                   │
│  │  - Ordem variável                        │                   │
│  │  - Unidades sempre em "g"                │                   │
│  │  - Sem quantidades humanizadas           │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 📊 PARTE 3: ANÁLISE DO SAFETY ENGINE

## 3.1 COBERTURA ATUAL

### **globalSafetyEngine.ts:**
✅ Carrega `intolerance_mappings` do banco  
✅ Carrega `intolerance_safe_keywords` do banco  
✅ Carrega `dietary_forbidden_ingredients` do banco  
✅ Fallback crítico hardcoded (gluten, lactose, etc.)  
✅ Cache de 2 minutos  

### **Uso nos módulos:**

| Módulo | Usa Safety Engine? | Como? |
|--------|-------------------|-------|
| Prompt IA | ✅ Via `mealGenerationConfig.ts` | `validateFood()` |
| Gerador Direto | ⚠️ Parcial | Só `contains` do `INGREDIENTS` |
| Pool | ⚠️ Parcial | Herda do gerador direto |

## 3.2 GAPS NO SAFETY ENGINE

❌ **Gerador direto não usa `globalSafetyEngine`:**
```typescript
// advanced-meal-generator.ts:491-496
const hasIntolerance = allSelectedIds.some(id => {
  const ing = INGREDIENTS[id];
  return ing && ing.contains.some(allergen => intolerances.includes(allergen));
});
```
- Usa apenas `ing.contains` (hardcoded no arquivo)
- NÃO consulta banco de dados
- NÃO usa safe_keywords (ex: "leite de coco" é seguro para lactose)

❌ **Pool herda o problema:**
- Chama `generateMealsForPool()` que tem validação limitada

---

# 📊 PARTE 4: GAPS NÃO MENCIONADOS PELO USUÁRIO

## 4.1 PROBLEMAS CRÍTICOS IDENTIFICADOS

### **1. Refeições bizarras podem passar:**
❌ "Sopa de legumes" + "Salada verde" → Combinação válida tecnicamente, mas culturalmente estranha
❌ "Macarrão" + "Arroz" → Dois carboidratos na mesma refeição
❌ "Feijoada" + "Feijão" → Redundância

### **2. Porções podem ficar irreais:**
❌ "Azeite (100g)" → 900 kcal, absurdo
❌ "Queijo (150g)" → 450+ kcal só de queijo
❌ "Ovo (100g)" → 1.5 ovos? Confuso

### **3. Macros inconsistentes entre fontes:**
- Prompt IA: Calcula via `calculateRealMacros.ts` (cascata)
- Gerador direto: Calcula via `INGREDIENTS` (TACO)
- Pool: Enriquece via `canonical_ingredients`
- **Podem dar valores diferentes para o mesmo ingrediente!**

### **4. Sobremesa pode aparecer antes de bebida:**
- `sortMealIngredients()` coloca fruta na categoria 4, bebida na 5
- MAS não valida se a fruta é sobremesa ou parte do prato

### **5. Instruções podem mencionar frutas/bebidas:**
- Já existe `cleanInstructionsFromFruitsAndBeverages()`
- MAS só é chamado no Prompt IA, não no gerador direto/pool

---

# 🎯 PARTE 5: PLANO DE AÇÃO DEFINITIVO

## 5.1 ARQUITETURA PROPOSTA

```
┌─────────────────────────────────────────────────────────────────┐
│                    CORE UNIFICADO V2.0                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           CAMADA 1: FONTE DE DADOS                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │ INGREDIENTS │  │ canonical_  │  │ globalSafety│     │    │
│  │  │ (TACO/TBCA) │  │ ingredients │  │ Engine      │     │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │    │
│  │         └────────────────┼────────────────┘            │    │
│  │                          ▼                             │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │      UNIFIED_INGREDIENT_DATABASE (novo)         │   │    │
│  │  │  - Macros unificados (fonte única)              │   │    │
│  │  │  - Unidades padrão (g, ml, fatia, unidade)      │   │    │
│  │  │  - Porções humanizadas (2 ovos, 2 fatias)       │   │    │
│  │  │  - Safety flags (intolerâncias, alergias)       │   │    │
│  │  └──────────────────────┬──────────────────────────┘   │    │
│  └─────────────────────────┼──────────────────────────────┘    │
│                            ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           CAMADA 2: REGRAS DE FORMATAÇÃO               │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │      PORTION_FORMATTER (novo)                   │   │    │
│  │  │  - formatPortion(ingredientKey, grams)          │   │    │
│  │  │  - Retorna: "2 ovos cozidos"                    │   │    │
│  │  │  - Retorna: "2 fatias de pão integral"          │   │    │
│  │  │  - Retorna: "1 copo de suco de laranja (200ml)" │   │    │
│  │  │  - Retorna: "3 colheres de arroz"               │   │    │
│  │  └──────────────────────┬──────────────────────────┘   │    │
│  └─────────────────────────┼──────────────────────────────┘    │
│                            ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           CAMADA 3: ORDENAÇÃO ESPECÍFICA               │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │      MEAL_SORTER_BR (novo para Brasil)          │   │    │
│  │  │  Almoço/Jantar (refeição composta):             │   │    │
│  │  │  1. Proteína (frango, carne, peixe)             │   │    │
│  │  │  2. Arroz (SEMPRE 2ª posição)                   │   │    │
│  │  │  3. Feijão (SEMPRE 3ª posição)                  │   │    │
│  │  │  4. Vegetais/Salada                             │   │    │
│  │  │  5. Sobremesa (fruta)                           │   │    │
│  │  │  6. Bebida (SEMPRE última)                      │   │    │
│  │  │                                                 │   │    │
│  │  │  Café da manhã:                                 │   │    │
│  │  │  1. Carboidrato (pão, tapioca)                  │   │    │
│  │  │  2. Proteína (ovo, queijo)                      │   │    │
│  │  │  3. Fruta                                       │   │    │
│  │  │  4. Bebida (SEMPRE última)                      │   │    │
│  │  └──────────────────────┬──────────────────────────┘   │    │
│  └─────────────────────────┼──────────────────────────────┘    │
│                            ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           CAMADA 4: VALIDAÇÃO DE COERÊNCIA             │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │      MEAL_COHERENCE_VALIDATOR (novo)            │   │    │
│  │  │  - Sopa + Salada? ❌ REJEITAR                   │   │    │
│  │  │  - Macarrão + Arroz? ❌ REJEITAR                │   │    │
│  │  │  - Feijoada + Feijão? ❌ REJEITAR               │   │    │
│  │  │  - Azeite > 15g? ⚠️ AUTO-FIX para 10g          │   │    │
│  │  │  - Queijo > 50g? ⚠️ AUTO-FIX para 30g          │   │    │
│  │  └──────────────────────┬──────────────────────────┘   │    │
│  └─────────────────────────┼──────────────────────────────┘    │
│                            ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           CAMADA 5: SAFETY UNIFICADO                   │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │      UNIFIED_SAFETY_CHECK (expandir)            │   │    │
│  │  │  - Todos os módulos usam globalSafetyEngine     │   │    │
│  │  │  - Intolerâncias do banco                       │   │    │
│  │  │  - Safe keywords (leite de coco ok para lactose)│   │    │
│  │  │  - Severity levels (block vs warning)           │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5.2 FASES DE IMPLEMENTAÇÃO

### **FASE 1: UNIFIED PORTION FORMATTER** (Prioridade: ALTA)
**Objetivo:** Quantidades humanizadas em todos os módulos

#### Criar arquivo: `_shared/portionFormatter.ts`

```typescript
// ESTRUTURA PROPOSTA
interface PortionConfig {
  ingredient_key: string;
  unit: 'g' | 'ml' | 'unidade' | 'fatia' | 'colher_sopa' | 'colher_cha' | 'copo' | 'xicara';
  unit_grams: number;        // Gramas por unidade (ex: ovo = 50g)
  unit_label_singular: string; // "ovo cozido"
  unit_label_plural: string;   // "ovos cozidos"
  min_units?: number;        // Mínimo de unidades (ex: 1)
  max_units?: number;        // Máximo de unidades (ex: 4)
}

// EXEMPLOS DE CONFIGURAÇÃO
const PORTION_CONFIGS: Record<string, PortionConfig> = {
  // OVOS
  boiled_eggs: {
    ingredient_key: 'boiled_eggs',
    unit: 'unidade',
    unit_grams: 50,
    unit_label_singular: 'ovo cozido',
    unit_label_plural: 'ovos cozidos',
    min_units: 1,
    max_units: 4,
  },
  scrambled_eggs: {
    ingredient_key: 'scrambled_eggs',
    unit: 'unidade',
    unit_grams: 50,
    unit_label_singular: 'ovo mexido',
    unit_label_plural: 'ovos mexidos',
  },
  
  // PÃES
  whole_wheat_bread: {
    ingredient_key: 'whole_wheat_bread',
    unit: 'fatia',
    unit_grams: 35,
    unit_label_singular: 'fatia de pão integral',
    unit_label_plural: 'fatias de pão integral',
  },
  french_bread: {
    ingredient_key: 'french_bread',
    unit: 'unidade',
    unit_grams: 50,
    unit_label_singular: 'pão francês',
    unit_label_plural: 'pães franceses',
  },
  
  // LÍQUIDOS
  fresh_orange_juice: {
    ingredient_key: 'fresh_orange_juice',
    unit: 'copo',
    unit_grams: 200,
    unit_label_singular: 'copo de suco de laranja',
    unit_label_plural: 'copos de suco de laranja',
  },
  black_coffee: {
    ingredient_key: 'black_coffee',
    unit: 'xicara',
    unit_grams: 150,
    unit_label_singular: 'xícara de café preto sem açúcar',
    unit_label_plural: 'xícaras de café preto sem açúcar',
  },
  
  // GRÃOS
  white_rice: {
    ingredient_key: 'white_rice',
    unit: 'colher_sopa',
    unit_grams: 25,
    unit_label_singular: 'colher de sopa de arroz',
    unit_label_plural: 'colheres de sopa de arroz',
  },
  beans: {
    ingredient_key: 'beans',
    unit: 'concha',
    unit_grams: 80,
    unit_label_singular: 'concha de feijão',
    unit_label_plural: 'conchas de feijão',
  },
};

// FUNÇÃO PRINCIPAL
export function formatPortion(ingredientKey: string, grams: number): {
  quantity: number;
  label: string;
  unit: string;
} {
  const config = PORTION_CONFIGS[ingredientKey];
  
  if (!config) {
    // Fallback: usar gramas direto
    return {
      quantity: grams,
      label: `${grams}g`,
      unit: 'g',
    };
  }
  
  // Calcular quantidade de unidades
  const quantity = Math.round(grams / config.unit_grams);
  const effectiveQuantity = Math.max(config.min_units || 1, Math.min(quantity, config.max_units || 10));
  
  // Escolher singular ou plural
  const label = effectiveQuantity === 1 
    ? `1 ${config.unit_label_singular}`
    : `${effectiveQuantity} ${config.unit_label_plural}`;
  
  return {
    quantity: effectiveQuantity,
    label,
    unit: config.unit,
  };
}
```

**Impacto:** Todos os módulos passam a usar `formatPortion()` para gerar `portion_label`.

---

### **FASE 2: MEAL SORTER ESPECÍFICO PARA BRASIL** (Prioridade: ALTA)
**Objetivo:** Ordem correta - Proteína, Arroz (2ª), Feijão (3ª), Vegetais, Sobremesa, Bebida

#### Modificar: `_shared/mealGenerationConfig.ts`

```typescript
// NOVA FUNÇÃO - ORDENAÇÃO ESPECÍFICA PARA BRASIL
export function sortMealIngredientsBR(
  foods: FoodItemWithGrams[], 
  mealType: string
): FoodItemWithGrams[] {
  if (!foods || foods.length <= 1) return foods;
  
  // Identificar cada componente
  const categorized = foods.map(food => ({
    food,
    category: categorizeFoodBR(food.name, mealType),
  }));
  
  // Ordem para almoço/jantar (refeição composta)
  if (mealType === 'lunch' || mealType === 'dinner' || mealType === 'almoco' || mealType === 'jantar') {
    const ORDER_LUNCH_DINNER = {
      'protein': 1,      // Proteína PRIMEIRO
      'rice': 2,         // Arroz SEGUNDO (OBRIGATÓRIO)
      'beans': 3,        // Feijão TERCEIRO (OBRIGATÓRIO)
      'vegetable': 4,    // Vegetais/Salada
      'condiment': 5,    // Azeite, temperos
      'dessert': 6,      // Fruta (sobremesa) - PENÚLTIMA
      'beverage': 7,     // Bebida - SEMPRE ÚLTIMA
      'other': 4.5,      // Outros acompanhamentos
    };
    
    return categorized
      .sort((a, b) => (ORDER_LUNCH_DINNER[a.category] || 99) - (ORDER_LUNCH_DINNER[b.category] || 99))
      .map(c => c.food);
  }
  
  // Ordem para café da manhã
  if (mealType === 'breakfast' || mealType === 'cafe_manha') {
    const ORDER_BREAKFAST = {
      'carb': 1,         // Pão, tapioca, aveia
      'protein': 2,      // Ovo, queijo
      'fruit': 3,        // Fruta
      'beverage': 4,     // Bebida - SEMPRE ÚLTIMA
      'other': 2.5,
    };
    
    return categorized
      .sort((a, b) => (ORDER_BREAKFAST[a.category] || 99) - (ORDER_BREAKFAST[b.category] || 99))
      .map(c => c.food);
  }
  
  // Ordem para lanches
  const ORDER_SNACK = {
    'main': 1,
    'fruit': 2,
    'beverage': 3,
    'other': 1.5,
  };
  
  return categorized
    .sort((a, b) => (ORDER_SNACK[a.category] || 99) - (ORDER_SNACK[b.category] || 99))
    .map(c => c.food);
}

// CATEGORIZAÇÃO ESPECÍFICA PARA BRASIL
function categorizeFoodBR(foodName: string, mealType: string): string {
  const normalized = foodName.toLowerCase();
  
  // ARROZ - sempre categoria 'rice'
  if (/arroz|rice/.test(normalized)) return 'rice';
  
  // FEIJÃO - sempre categoria 'beans'
  if (/feij[aã]o|beans|lentilha/.test(normalized)) return 'beans';
  
  // PROTEÍNAS
  if (/frango|chicken|carne|beef|bife|steak|peixe|fish|ovo|egg|camar[aã]o|shrimp/.test(normalized)) {
    return 'protein';
  }
  
  // BEBIDAS - SEMPRE ÚLTIMA
  if (/caf[eé]|coffee|ch[aá]|tea|suco|juice|[aá]gua|water|leite|milk/.test(normalized)) {
    // Exceção: leite de coco em receitas não é bebida
    if (/leite.*coco/.test(normalized) && mealType !== 'breakfast') return 'other';
    return 'beverage';
  }
  
  // SOBREMESA (frutas)
  if (/banana|ma[çc][aã]|laranja|mam[aã]o|morango|melancia|mel[aã]o|abacaxi|manga|sobremesa/.test(normalized)) {
    return 'dessert';
  }
  
  // VEGETAIS/SALADA
  if (/salada|alface|tomate|pepino|br[oó]colis|cenoura|abobrinha|couve|espinafre/.test(normalized)) {
    return 'vegetable';
  }
  
  // CONDIMENTOS
  if (/azeite|olive|tempero|sal\b|vinagre/.test(normalized)) return 'condiment';
  
  // CARBOIDRATOS (café da manhã)
  if (/p[aã]o|bread|tapioca|aveia|oats|granola|cuscuz|torrada/.test(normalized)) return 'carb';
  
  return 'other';
}
```

---

### **FASE 3: MEAL COHERENCE VALIDATOR** (Prioridade: ALTA)
**Objetivo:** Bloquear combinações bizarras

#### Criar arquivo: `_shared/mealCoherenceValidator.ts`

```typescript
// COMBINAÇÕES PROIBIDAS (SEMPRE REJEITAR)
const FORBIDDEN_COMBINATIONS = [
  // Sopa + salada = estranho
  { triggers: ['sopa', 'salada'], reason: 'Sopa não combina com salada fria' },
  
  // Dois carboidratos base
  { triggers: ['arroz', 'macarr[aã]o'], reason: 'Não misturar arroz com macarrão' },
  { triggers: ['arroz', 'batata'], reason: 'Não misturar arroz com batata como base' },
  { triggers: ['macarr[aã]o', 'batata'], reason: 'Não misturar macarrão com batata' },
  
  // Feijoada já tem feijão
  { triggers: ['feijoada', 'feij[aã]o'], reason: 'Feijoada já contém feijão' },
  
  // Macarrão + salada (culturalmente estranho no Brasil)
  { triggers: ['macarr[aã]o', 'salada'], reason: 'Macarrão não combina com salada no Brasil' },
  
  // Sopa + arroz/feijão (sopa é prato único)
  { triggers: ['sopa', 'arroz'], reason: 'Sopa é prato único, não precisa de arroz' },
  { triggers: ['sopa', 'feij[aã]o'], reason: 'Sopa é prato único, não precisa de feijão' },
];

// LIMITES DE PORÇÃO (AUTO-FIX)
const PORTION_LIMITS = {
  azeite: { max: 15, fix: 10, reason: 'Azeite máximo 15g (1 colher de sopa)' },
  olive_oil: { max: 15, fix: 10, reason: 'Olive oil max 15g' },
  queijo: { max: 50, fix: 30, reason: 'Queijo máximo 50g em uma refeição' },
  cheese: { max: 50, fix: 30, reason: 'Cheese max 50g per meal' },
  manteiga: { max: 15, fix: 10, reason: 'Manteiga máximo 15g' },
  butter: { max: 15, fix: 10, reason: 'Butter max 15g' },
};

export function validateMealCoherence(foods: FoodItem[]): {
  isCoherent: boolean;
  errors: string[];
  warnings: string[];
  fixedFoods?: FoodItem[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fixedFoods = [...foods];
  
  const foodNames = foods.map(f => f.name.toLowerCase()).join(' | ');
  
  // Verificar combinações proibidas
  for (const combo of FORBIDDEN_COMBINATIONS) {
    const hasAll = combo.triggers.every(trigger => 
      new RegExp(trigger, 'i').test(foodNames)
    );
    if (hasAll) {
      errors.push(combo.reason);
    }
  }
  
  // Verificar limites de porção
  for (let i = 0; i < fixedFoods.length; i++) {
    const food = fixedFoods[i];
    const normalized = food.name.toLowerCase();
    
    for (const [key, limit] of Object.entries(PORTION_LIMITS)) {
      if (normalized.includes(key) && food.grams > limit.max) {
        warnings.push(`${limit.reason} - Corrigido de ${food.grams}g para ${limit.fix}g`);
        fixedFoods[i] = { ...food, grams: limit.fix };
      }
    }
  }
  
  return {
    isCoherent: errors.length === 0,
    errors,
    warnings,
    fixedFoods: warnings.length > 0 ? fixedFoods : undefined,
  };
}
```

---

### **FASE 4: UNIFICAR SAFETY ENGINE** (Prioridade: MÉDIA)
**Objetivo:** Todos os módulos usam `globalSafetyEngine`

#### Modificar: `_shared/advanced-meal-generator.ts`

```typescript
// ANTES (linha 491-496):
const hasIntolerance = allSelectedIds.some(id => {
  const ing = INGREDIENTS[id];
  return ing && ing.contains.some(allergen => intolerances.includes(allergen));
});

// DEPOIS:
import { validateIngredient } from "./globalSafetyEngine.ts";

// Na função generateMealsForPool:
const hasIntolerance = allSelectedIds.some(id => {
  const ing = INGREDIENTS[id];
  if (!ing) return false;
  
  // Usar globalSafetyEngine para validação completa
  const validation = validateIngredient(
    ing.display_name_pt,
    { intolerances, dietaryPreference: null, excludedIngredients: [] },
    safetyDatabase
  );
  
  return !validation.isValid;
});
```

---

### **FASE 5: INTEGRAÇÃO NOS 3 MÓDULOS** (Prioridade: ALTA)

#### 5.1 Modificar `generate-ai-meal-plan/index.ts`:
```typescript
import { formatPortion } from "../_shared/portionFormatter.ts";
import { sortMealIngredientsBR } from "../_shared/mealGenerationConfig.ts";
import { validateMealCoherence } from "../_shared/mealCoherenceValidator.ts";

// No pós-processamento de cada refeição:
// 1. Validar coerência
const coherenceCheck = validateMealCoherence(foods);
if (!coherenceCheck.isCoherent) {
  logStep(`❌ REFEIÇÃO INCOERENTE: ${coherenceCheck.errors.join(', ')}`);
  // Rejeitar ou regenerar
}

// 2. Aplicar fixes de porção
const fixedFoods = coherenceCheck.fixedFoods || foods;

// 3. Ordenar especificamente para Brasil
const sortedFoods = sortMealIngredientsBR(fixedFoods, meal.meal_type);

// 4. Formatar porções humanizadas
const formattedFoods = sortedFoods.map(food => ({
  ...food,
  portion_label: formatPortion(food.ingredient_key || food.name, food.grams).label,
}));
```

#### 5.2 Modificar `advanced-meal-generator.ts`:
```typescript
import { formatPortion } from "./portionFormatter.ts";

// Na criação de componentes (linha 554-559):
components.push({
  type: compType,
  name: ing.display_name_pt,
  name_en: ing.display_name_en,
  portion_grams: portion,
  portion_label: formatPortion(ingId, portion).label, // ← MUDANÇA
});
```

#### 5.3 Modificar `populate-meal-pool/index.ts`:
- Herda automaticamente as mudanças do gerador direto

---

## 5.3 CRONOGRAMA SUGERIDO

| Fase | Descrição | Estimativa | Dependências |
|------|-----------|------------|--------------|
| 1 | Portion Formatter | 2-3 horas | Nenhuma |
| 2 | Meal Sorter BR | 2-3 horas | Nenhuma |
| 3 | Coherence Validator | 2-3 horas | Nenhuma |
| 4 | Unificar Safety Engine | 1-2 horas | Nenhuma |
| 5 | Integração nos 3 módulos | 3-4 horas | Fases 1-4 |
| 6 | Testes e validação | 2-3 horas | Fase 5 |

**Total estimado:** 12-18 horas de desenvolvimento

---

## 5.4 MÉTRICAS DE SUCESSO

### **Após implementação, validar:**

| Métrica | Critério de Sucesso |
|---------|---------------------|
| Ordem dos ingredientes | 100% das refeições seguem a ordem definida |
| Quantidades humanizadas | 0% de "Xg" para ovos, pães, líquidos |
| ml para líquidos | 100% dos líquidos com "ml" |
| Fatias para pão | 100% dos pães com "fatias" |
| Combinações bizarras | 0% de sopa+salada, arroz+macarrão |
| Macros consistentes | < 5% de variação entre módulos |
| Safety Engine unificado | 100% dos módulos usando globalSafetyEngine |

---

# 📋 CHECKLIST DE IMPLEMENTAÇÃO

## Fase 1: Portion Formatter
- [ ] Criar `_shared/portionFormatter.ts`
- [ ] Definir `PORTION_CONFIGS` para todos os ingredientes
- [ ] Implementar `formatPortion()`
- [ ] Testar com ovos, pães, líquidos, grãos

## Fase 2: Meal Sorter BR
- [ ] Implementar `sortMealIngredientsBR()` em `mealGenerationConfig.ts`
- [ ] Implementar `categorizeFoodBR()`
- [ ] Testar ordem: Proteína → Arroz → Feijão → Vegetais → Sobremesa → Bebida

## Fase 3: Coherence Validator
- [ ] Criar `_shared/mealCoherenceValidator.ts`
- [ ] Definir `FORBIDDEN_COMBINATIONS`
- [ ] Definir `PORTION_LIMITS`
- [ ] Implementar `validateMealCoherence()`

## Fase 4: Unificar Safety Engine
- [ ] Modificar `advanced-meal-generator.ts` para usar `globalSafetyEngine`
- [ ] Garantir que `safetyDatabase` é passado para a função
- [ ] Testar validação de intolerâncias

## Fase 5: Integração
- [ ] Integrar em `generate-ai-meal-plan/index.ts`
- [ ] Integrar em `advanced-meal-generator.ts`
- [ ] Verificar que `populate-meal-pool` herda mudanças

## Fase 6: Testes
- [ ] Testar refeição de almoço completa
- [ ] Testar café da manhã
- [ ] Testar combinações proibidas
- [ ] Testar quantidades humanizadas
- [ ] Testar safety engine unificado

---

# 🎯 RESUMO EXECUTIVO

## O que está funcionando:
✅ Macros calculados corretamente (TACO/TBCA)  
✅ Intolerâncias validadas (parcialmente)  
✅ Templates fechados garantem consistência  
✅ Ordenação básica (frutas/bebidas por último)  

## O que precisa ser implementado:
❌ Ordem específica: Proteína → Arroz (2ª) → Feijão (3ª) → Vegetais → Sobremesa → Bebida  
❌ Quantidades humanizadas: "2 ovos cozidos", "2 fatias de pão"  
❌ Unidades corretas: ml para líquidos, fatias para pão  
❌ Validação de coerência: bloquear sopa+salada, arroz+macarrão  
❌ Safety Engine unificado em todos os módulos  

## Impacto esperado:
- 🎯 Refeições 100% coerentes e culturalmente corretas
- 🎯 Quantidades fáceis de entender pelo usuário
- 🎯 Ordem lógica que reflete hábitos brasileiros
- 🎯 Macros 100% seguros e consistentes
- 🎯 Zero combinações bizarras

---

**Documento criado em:** 23/01/2026  
**Status:** 📋 PRONTO PARA IMPLEMENTAÇÃO  
**Aprovação:** Aguardando aprovação do usuário
