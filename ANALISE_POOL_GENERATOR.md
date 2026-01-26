# 🔍 ANÁLISE: GERADOR DE POOL vs UNIFIED CORE

**Data:** 23/01/2026  
**Arquivo Analisado:** `populate-meal-pool/index.ts`  
**Status:** ⚠️ **NÃO USA PADRÃO CENTRALIZADO**

---

## 📊 RESUMO EXECUTIVO

**Conclusão:** ❌ O gerador de pool **NÃO está usando** o Unified Meal Core.

**Problemas Identificados:**
1. ❌ Cálculo de macros **duplicado** (linhas 293-349)
2. ❌ Formatação de porções **manual** (linha 336: `${portionGrams}g`)
3. ❌ **Sem ordenação** BR específica
4. ❌ **Sem validação de coerência** centralizada
5. ❌ **Sem validação de segurança** via globalSafetyEngine
6. ❌ Nomes de ingredientes **não vêm do INGREDIENTS**

---

## 🔴 DIVERGÊNCIAS CRÍTICAS

### **1. CÁLCULO DE MACROS DUPLICADO**

**Unified Core:**
```typescript
// macro-calculator.ts - FONTE ÚNICA
const macros = await calculateMacros(ingredientKey, grams, raw);
// Hierarquia: INGREDIENTS → rawData → estimativa
```

**Pool Generator (linhas 293-349):**
```typescript
// CÓDIGO DUPLICADO - FONTE DIFERENTE
let totalCalories = 0;
let totalProtein = 0;
// ...

for (const component of components) {
  const canonical = findCanonicalIngredient(component.name);
  
  if (canonical) {
    totalCalories += canonical.calories_per_100g * factor;
    totalProtein += canonical.protein_per_100g * factor;
    // ...
  } else {
    const calorieData = CALORIE_TABLE[normalized];
    totalCalories += calorieData.calories * factor;
    // ...
  }
}
```

**Problema:**
- ❌ Lógica duplicada
- ❌ Hierarquia diferente: `canonical_ingredients` → `CALORIE_TABLE`
- ❌ Core usa: `INGREDIENTS` → `rawData` → estimativa
- ❌ **PODE GERAR MACROS DIFERENTES** para mesmo ingrediente

---

### **2. FORMATAÇÃO DE PORÇÕES MANUAL**

**Unified Core:**
```typescript
// portion-formatter.ts - FORMATAÇÃO CENTRALIZADA
const portionDisplay = formatPortion(ingredientKey, grams, language);
// Output: "2 ovos cozidos (100g)" ✅
// Output: "4 colheres de sopa de arroz branco (100g)" ✅
```

**Pool Generator (linha 336):**
```typescript
portion_label: `${portionGrams}g`,
// Output: "100g" ❌
// Output: "150g" ❌
```

**Problema:**
- ❌ **Sem humanização** de porções
- ❌ Não usa "2 ovos", "4 colheres", "1 copo"
- ❌ Apenas gramas brutas: "100g"
- ❌ **INCONSISTENTE** com gerador direto que usa Core

---

### **3. SEM ORDENAÇÃO BR ESPECÍFICA**

**Unified Core:**
```typescript
// meal-sorter.ts - ORDENAÇÃO CENTRALIZADA
const sortedComponents = sortComponentsBR(components, mealType);
// Ordem: Proteína → Arroz → Feijão → Vegetais → Bebida → Sobremesa
```

**Pool Generator:**
```typescript
// NÃO HÁ ORDENAÇÃO
// Componentes ficam na ordem que vêm do gerador
```

**Problema:**
- ❌ **Sem ordenação** específica BR
- ❌ Ordem pode ser aleatória
- ❌ **INCONSISTENTE** com gerador direto

---

### **4. SEM VALIDAÇÃO DE COERÊNCIA**

**Unified Core:**
```typescript
// coherence-validator.ts - VALIDAÇÃO CENTRALIZADA
const coherenceResult = validateCoherence(components, mealType, country);
// Bloqueia: sopa+salada, arroz+macarrão, pizza+arroz
```

**Pool Generator:**
```typescript
// NÃO HÁ VALIDAÇÃO DE COERÊNCIA
// Apenas valida se tem componentes (linha 195-207)
if (validMeals.length === 0) {
  throw new Error("No valid components");
}
```

**Problema:**
- ❌ **Sem validação** de combinações bizarras
- ❌ Pode gerar sopa+salada, arroz+macarrão
- ❌ **INCONSISTENTE** com gerador direto

---

### **5. SEM VALIDAÇÃO DE SEGURANÇA CENTRALIZADA**

**Unified Core:**
```typescript
// safety-validator.ts - VALIDAÇÃO CENTRALIZADA
const safetyResult = await validateSafety(components, userContext, safetyDb);
// Usa globalSafetyEngine para validar intolerâncias
```

**Pool Generator:**
```typescript
// VALIDAÇÃO MANUAL (linhas 326-328)
if (canonical.category) {
  allIntoleranceFlags.push(canonical.category);
}
// Apenas coleta flags, não valida contra usuário
```

**Problema:**
- ❌ **Não valida** contra intolerâncias do usuário
- ❌ Apenas coleta flags genéricas
- ❌ **INCONSISTENTE** com gerador direto

---

### **6. NOMES DE INGREDIENTES NÃO VÊM DO INGREDIENTS**

**Unified Core:**
```typescript
// index.ts - LOOKUP NO INGREDIENTS
const ingredient = INGREDIENTS[ingredientKey];
const name_pt = ingredient?.display_name_pt || raw.name;
const name_en = ingredient?.display_name_en || raw.name_en;
```

**Pool Generator:**
```typescript
// USA NOME DO CANONICAL_INGREDIENTS (linha 333)
name_en: component.name_en || canonical.name_en,
// Ou usa nome que veio do gerador (linha 332)
name: component.name,
```

**Problema:**
- ❌ **Não usa** `INGREDIENTS` como fonte única
- ❌ Usa `canonical_ingredients` (banco diferente)
- ❌ **PODE TER NOMES DIFERENTES** do gerador direto

---

## 📊 COMPARAÇÃO LADO A LADO

| Funcionalidade | Unified Core | Pool Generator | Status |
|----------------|--------------|----------------|--------|
| **Cálculo de Macros** | `macro-calculator.ts` | Código duplicado (linhas 293-349) | ❌ DIVERGENTE |
| **Formatação de Porções** | `portion-formatter.ts` | Manual: `${grams}g` | ❌ DIVERGENTE |
| **Ordenação BR** | `meal-sorter.ts` | Não tem | ❌ FALTANDO |
| **Validação de Coerência** | `coherence-validator.ts` | Não tem | ❌ FALTANDO |
| **Validação de Segurança** | `safety-validator.ts` | Manual (flags apenas) | ❌ DIVERGENTE |
| **Nomes de Ingredientes** | `INGREDIENTS` database | `canonical_ingredients` | ❌ DIVERGENTE |
| **Geração de Nome** | `generateMealName()` | Usa nome do gerador | ⚠️ PODE DIVERGIR |

---

## 🎯 IMPACTO DAS DIVERGÊNCIAS

### **Problema 1: Macros Inconsistentes**

**Exemplo:**
```typescript
// Gerador Direto (via Core)
Arroz branco 100g → 128 kcal (do INGREDIENTS)

// Pool Generator
Arroz branco 100g → 130 kcal (do canonical_ingredients)
```

**Impacto:** ❌ Usuário vê calorias diferentes para mesmo alimento

---

### **Problema 2: Porções Não Humanizadas**

**Exemplo:**
```typescript
// Gerador Direto (via Core)
"2 ovos cozidos (100g)" ✅

// Pool Generator
"100g" ❌
```

**Impacto:** ❌ UX ruim, usuário não sabe quantos ovos

---

### **Problema 3: Ordem Incorreta**

**Exemplo:**
```typescript
// Gerador Direto (via Core)
[Frango, Arroz, Feijão, Salada, Água] ✅

// Pool Generator
[Água, Salada, Arroz, Frango, Feijão] ❌
```

**Impacto:** ❌ Ordem não segue padrão BR

---

### **Problema 4: Combinações Bizarras**

**Exemplo:**
```typescript
// Gerador Direto (via Core)
Sopa + Salada → BLOQUEADO ✅

// Pool Generator
Sopa + Salada → PERMITIDO ❌
```

**Impacto:** ❌ Refeições estranhas no pool

---

## 🔧 SOLUÇÃO RECOMENDADA

### **Opção A: Integrar com pool-adapter (RECOMENDADO)**

**Já existe:** `meal-core-adapters/pool-adapter.ts`

**Implementação:**
```typescript
// Em populate-meal-pool/index.ts

import { processPoolMeal } from '../_shared/meal-core-adapters/pool-adapter.ts';
import type { UserContext } from '../_shared/unified-meal-core/types.ts';

// Após gerar refeições (linha 255)
const mealsWithMacros = await Promise.all(
  validMeals.map(async (meal) => {
    // Converter para formato PoolMeal
    const poolMeal = {
      id: 'temp-' + Date.now(),
      name: meal.name,
      meal_type: meal_type,
      components: meal.components,
      total_calories: 0, // Será calculado pelo Core
    };
    
    // Processar via Unified Core
    const result = await processPoolMeal(poolMeal, userContext);
    
    if (result.success && result.meal) {
      return {
        name: result.meal.name,
        description: meal.description,
        meal_type: meal_type,
        meal_density: result.meal.meta.density,
        components: result.meal.components.map(c => ({
          type: c.type,
          name: c.name_pt,
          name_en: c.name_en,
          canonical_id: c.ingredient_key,
          portion_grams: c.portion_grams,
          portion_label: c.portion_display.label, // ✅ HUMANIZADO
        })),
        total_calories: result.meal.totals.calories,
        total_protein: result.meal.totals.protein,
        total_carbs: result.meal.totals.carbs,
        total_fat: result.meal.totals.fat,
        total_fiber: result.meal.totals.fiber,
        macro_source: 'unified_core',
        macro_confidence: result.meal.meta.confidence,
        // ...
      };
    }
    
    // Fallback se Core falhar
    return meal;
  })
);
```

**Benefícios:**
- ✅ **100% consistente** com gerador direto
- ✅ Macros da fonte única
- ✅ Porções humanizadas
- ✅ Ordenação BR
- ✅ Validação de coerência
- ✅ Validação de segurança

---

### **Opção B: Manter Código Atual (NÃO RECOMENDADO)**

**Problemas:**
- ❌ Inconsistência entre geradores
- ❌ Código duplicado
- ❌ Manutenção dobrada
- ❌ Bugs diferentes em cada gerador

---

## 📝 PLANO DE INTEGRAÇÃO

### **Passo 1: Preparar UserContext**
```typescript
const userContext: UserContext = {
  user_id: 'pool-generator',
  country: country_code,
  language: regional.language,
  intolerances: [], // Pool não tem usuário específico
  dietary_preference: null,
  excluded_ingredients: [],
  goals: [],
};
```

### **Passo 2: Substituir Lógica de Macros**
- Remover linhas 293-349 (cálculo manual)
- Usar `processPoolMeal()` do adapter

### **Passo 3: Testar**
- Gerar 5 refeições de almoço
- Validar macros consistentes
- Validar porções humanizadas
- Validar ordenação BR

### **Passo 4: Deploy**
- Testar em staging
- Comparar com pool atual
- Rollout gradual

---

## ⚠️ RISCOS

### **Risco 1: Performance**
- Pool gera muitas refeições de uma vez
- Core adiciona overhead de processamento
- **Mitigação:** Testar performance, otimizar se necessário

### **Risco 2: Quebra de Compatibilidade**
- Pool atual salva em formato específico
- Core retorna formato diferente
- **Mitigação:** Mapear campos corretamente

### **Risco 3: Refeições Diferentes**
- Core pode rejeitar refeições que pool aceita
- **Mitigação:** Usar fallback se Core rejeitar

---

## 🎯 RECOMENDAÇÃO FINAL

**URGENTE:** Integrar pool generator com Unified Core via `pool-adapter.ts`

**Prioridade:** 🔴 ALTA

**Motivo:**
1. ❌ Atualmente **100% inconsistente** com gerador direto
2. ❌ Mesmos problemas que foram corrigidos no direto
3. ❌ Usuário verá dados diferentes dependendo da fonte
4. ✅ Adapter já existe e está pronto para uso

**Próxima Ação:**
1. Implementar integração com `pool-adapter.ts`
2. Testar com 10 refeições
3. Comparar output com pool atual
4. Deploy em staging

---

**Status:** ⚠️ **AGUARDANDO INTEGRAÇÃO COM UNIFIED CORE**
