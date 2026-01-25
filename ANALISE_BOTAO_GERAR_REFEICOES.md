# ANÁLISE: BOTÃO "GERAR REFEIÇÕES" DO PAINEL ADMIN

## 🎯 PERGUNTA DO USUÁRIO
"O botão gerar refeição do painel pool de alimento está usando TypeScript ou IA?"

---

## 📋 RESPOSTA DIRETA

**O botão usa 100% TYPESCRIPT - NÃO USA IA (Gemini)**

---

## 🔍 ANÁLISE DETALHADA DO FLUXO

### **1. FRONTEND (AdminMealPool.tsx)**

**Localização:** `src/pages/admin/AdminMealPool.tsx` linhas 291-318

```typescript
const generateMeals = async () => {
  setIsGenerating(true);
  try {
    const { data, error } = await supabase.functions.invoke("populate-meal-pool", {
      body: {
        country_code: genCountry,      // Ex: "BR"
        meal_type: genMealType,        // Ex: "cafe_manha"
        quantity: genQuantity,         // Ex: 20
        intolerance_filter: genIntoleranceFilter !== "none" ? genIntoleranceFilter : null,
      },
    });
    
    // ... tratamento de resposta
  }
};
```

**O que faz:**
- Chama a Edge Function `populate-meal-pool`
- Envia: país, tipo de refeição, quantidade, intolerâncias
- **NÃO envia nenhum prompt para IA**
- **NÃO faz chamada ao Gemini**

---

### **2. BACKEND (populate-meal-pool/index.ts)**

**Localização:** `supabase/functions/populate-meal-pool/index.ts` linhas 1104-1112

```typescript
// Gerar refeições usando templates
let generatedMeals: GeneratedMeal[];
try {
  generatedMeals = generateMealsForPool(meal_type, quantity, country_code, intolerances) as any;
  logStep("Meals generated from templates", { count: generatedMeals.length });
} catch (error) {
  logStep("Error generating meals from templates", { error: String(error) });
  throw error;
}
```

**O que faz:**
- Chama `generateMealsForPool()` do `advanced-meal-generator.ts`
- **NÃO chama Gemini API**
- **NÃO usa IA**

**Código da IA está COMENTADO:**
```typescript
// CÓDIGO ANTIGO COMENTADO - Gemini desabilitado
/*
const geminiApiKey = await getGeminiApiKey();
const callAIWithRetry = async (maxRetries = 2): Promise<GeneratedMeal[]> => {
  // ... código comentado
*/
```

---

### **3. GERADOR DE REFEIÇÕES (advanced-meal-generator.ts)**

**Localização:** `supabase/functions/_shared/advanced-meal-generator.ts`

**Método:** 100% TypeScript com templates e regras

```typescript
export function generateMealsForPool(
  mealType: string,
  quantity: number,
  country: string = "BR",
  intolerances: string[] = []
): GeneratedMeal[] {
  // 1. Seleciona templates culturais (SMART_TEMPLATES)
  const templates = SMART_TEMPLATES[mealType][country] || [];
  
  // 2. Para cada refeição:
  while (meals.length < quantity) {
    // 2.1. Seleciona template aleatório
    const template = selectRandom(templates);
    
    // 2.2. Seleciona ingredientes dos slots do template
    for (const [slotName, slot] of Object.entries(template.slots)) {
      let ingredientId = selectRandom(slot.options);
      // ... seleciona ingredientes
    }
    
    // 2.3. Valida regras culturais
    if (!validateCulturalRules(allSelectedIds, country)) {
      continue;
    }
    
    // 2.4. Valida intolerâncias
    const hasIntolerance = allSelectedIds.some(id => {
      const ing = INGREDIENTS[id];
      return ing && ing.contains.some(allergen => intolerances.includes(allergen));
    });
    
    // 2.5. Aplica regras de composição (ex: salada)
    const composite = applyCompositeRules(allSelectedIds);
    
    // 2.6. Calcula macros (TACO/TBCA)
    // ... cálculo de macros
    
    // 2.7. APLICA VALIDAÇÕES (NOVAS - v1.2.0)
    const validationResult = validateAndFixMeal(
      mealName,
      components,
      Math.round(totalCal),
      mealType
    );
    
    // 2.8. Se inválida, REJEITA e tenta outra
    if (!validationResult.valid) {
      console.log(`[MEAL-GENERATOR] Refeição rejeitada: ${mealName}`);
      continue;
    }
    
    // 2.9. Aplica agrupamento inteligente
    const finalComponents = validationResult.autoFixed 
      ? validationResult.fixedComponents 
      : components;
    
    // 2.10. Adiciona refeição ao array
    meals.push({
      name: finalMealName,
      components: sortedComponents,
      total_calories: Math.round(totalCal),
      // ... outros campos
    });
  }
  
  return meals;
}
```

---

## 🏗️ ARQUITETURA COMPLETA

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (AdminMealPool.tsx)                                │
│ Botão "Gerar Refeições"                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ supabase.functions.invoke("populate-meal-pool")
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ EDGE FUNCTION (populate-meal-pool/index.ts)                 │
│ - Recebe: meal_type, quantity, country, intolerances       │
│ - Chama: generateMealsForPool()                             │
│ - NÃO chama Gemini (código comentado)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ generateMealsForPool()
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ GERADOR (advanced-meal-generator.ts)                        │
│ 100% TypeScript - SEM IA                                    │
│                                                              │
│ 1. Seleciona templates culturais (SMART_TEMPLATES)          │
│ 2. Seleciona ingredientes (INGREDIENTS)                     │
│ 3. Valida regras culturais (CULTURAL_RULES)                 │
│ 4. Valida intolerâncias                                     │
│ 5. Aplica regras de composição (COMPOSITE_RULES)            │
│ 6. Calcula macros (TACO/TBCA)                               │
│ 7. VALIDA refeição (meal-validation-rules.ts) ← NOVO       │
│ 8. AGRUPA componentes (pão+ovo, salada+azeite) ← NOVO      │
│ 9. EXPANDE nomes genéricos ← NOVO                           │
│ 10. Retorna refeições prontas                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 DADOS UTILIZADOS (100% TypeScript)

### **1. SMART_TEMPLATES (meal-templates-smart.ts)**
Templates culturais fechados por país e tipo de refeição:
```typescript
BR_almoco: [
  {
    name_pattern: "Arroz com Feijão, {protein} e {vegetables}",
    slots: {
      protein: { options: ["frango_peito_grelhado", "bife_alcatra_grelhado", ...] },
      vegetables: { options: ["brocolis_cozido", "cenoura_cozida", ...] }
    }
  }
]
```

### **2. INGREDIENTS (meal-ingredients-db.ts)**
100+ ingredientes com macros TACO/TBCA:
```typescript
frango_peito_grelhado: { 
  kcal: 159, 
  prot: 32, 
  carbs: 0, 
  fat: 3.2, 
  portion: 120,
  never_use_alone: false,
  ingredient_category: 'main'
}
```

### **3. CULTURAL_RULES (meal-templates-smart.ts)**
Regras culturais por país:
```typescript
BR: {
  forbidden_combinations: [
    ["macarrão", "salada"],
    ["macarrão", "feijão"],
    ["batata", "arroz"]
  ]
}
```

### **4. COMPOSITE_RULES (meal-templates-smart.ts)**
Regras de composição automática:
```typescript
{
  triggers: ["alface_americana", "tomate", "pepino"],
  result_name: "Salada Verde",
  result_name_en: "Green Salad"
}
```

### **5. VALIDATION_RULES (meal-validation-rules.ts) ← NOVO**
Validações e agrupamentos:
```typescript
- validateMinimumComponents()
- validateNoSeasoningAsMain()
- validateFatCondiments()
- groupBreadWithProtein()
- groupSaladWithOil()
- groupYogurtWithToppings()
```

---

## ✅ CONFIRMAÇÃO: 100% TYPESCRIPT

**Evidências:**

1. **Linha 1107:** `generatedMeals = generateMealsForPool(...)`
   - Chama função TypeScript, não IA

2. **Linhas 1114-1200:** Código Gemini está COMENTADO
   ```typescript
   // CÓDIGO ANTIGO COMENTADO - Gemini desabilitado
   /*
   const geminiApiKey = await getGeminiApiKey();
   ...
   */
   ```

3. **advanced-meal-generator.ts:** 100% lógica TypeScript
   - Templates pré-definidos
   - Ingredientes com macros TACO/TBCA
   - Regras culturais hardcoded
   - Validações TypeScript
   - Agrupamentos TypeScript

4. **Nenhuma chamada HTTP para Gemini API**
   - Não há `fetch()` para `generativelanguage.googleapis.com`
   - Não há uso de `geminiApiKey`

---

## 🆚 COMPARAÇÃO: ANTES vs AGORA

### **ANTES (versão antiga com IA):**
```
Botão → populate-meal-pool → Gemini API → Parse JSON → Validações → Banco
```

### **AGORA (versão atual - 100% TypeScript):**
```
Botão → populate-meal-pool → generateMealsForPool() → Validações → Agrupamentos → Banco
                              ↑
                              100% TypeScript
                              - Templates
                              - Ingredientes
                              - Regras culturais
                              - Macros TACO/TBCA
```

---

## 🎯 CONCLUSÃO

**RESPOSTA DEFINITIVA:**

O botão "Gerar Refeições" do painel admin usa **100% TYPESCRIPT**.

**NÃO USA IA (Gemini).**

**Como funciona:**
1. Seleciona templates culturais pré-definidos
2. Combina ingredientes com macros TACO/TBCA
3. Aplica regras culturais (ex: não combinar macarrão com salada)
4. Valida intolerâncias
5. **VALIDA refeição** (mínimo 2 componentes, sem temperos isolados, etc.)
6. **AGRUPA componentes** (pão+ovo, salada+azeite, iogurte+mel)
7. **EXPANDE nomes genéricos** (Alface → Salada de alface com tomate)
8. Calcula macros reais
9. Salva no banco

**Vantagens:**
- ✅ 100% determinístico (sem variação da IA)
- ✅ Macros precisos (TACO/TBCA)
- ✅ Validações rigorosas
- ✅ Agrupamento inteligente
- ✅ Sem custos de API
- ✅ Mais rápido
- ✅ Sem erros de parsing JSON

---

**Documento gerado em:** 20/01/2026 21:40
**Versão analisada:** v1.2.0-pool-validations
