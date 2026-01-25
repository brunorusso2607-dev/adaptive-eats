# 🔍 ANÁLISE: POOL NÃO ESTÁ SENDO USADO

**Data:** 18/01/2026  
**Problema:** Plano alimentar gerado mostra "Nenhuma receita definida" em todas as refeições

---

## 📊 SITUAÇÃO ATUAL

### **Evidências do Problema:**
1. ✅ Todas as 6 refeições do dia mostram "Nenhuma receita definida"
2. ✅ Consumo de sexta: 0 kcal, 0g prot, 0g carbs, 0g gord
3. ✅ Indica que **NENHUMA refeição foi gerada**

---

## 🔍 ANÁLISE DO CÓDIGO

### **Arquivo:** `generate-ai-meal-plan/index.ts`

### **✅ POOL ESTÁ INTEGRADO CORRETAMENTE**

#### **1. Pool é Consultado PRIMEIRO (Linha 1536-1542)**
```typescript
// Buscar refeições aprovadas compatíveis com o país do usuário
const { data: approvedMeals, error: poolError } = await supabaseClient
  .from("meal_combinations")
  .select("id, name, meal_type, components, total_calories, ...")
  .eq("is_active", true)
  .eq("approval_status", "approved")
  .contains("country_codes", [userCountry]);
```

**Status:** ✅ Correto - Pool é consultado primeiro

---

#### **2. Filtragem por Restrições (Linha 1553-1586)**
```typescript
const compatiblePoolMeals = (approvedMeals || []).filter((meal) => {
  // Verificar intolerâncias bloqueadas
  if (meal.blocked_for_intolerances && meal.blocked_for_intolerances.length > 0) {
    const hasBlockedIntolerance = userIntolerances.some(
      (intol) => meal.blocked_for_intolerances!.includes(intol)
    );
    if (hasBlockedIntolerance) return false;
  }
  
  // Verificar preferência dietária
  if (userDietaryPref && userDietaryPref !== 'omnivore' && meal.dietary_tags) {
    if (userDietaryPref === 'vegetarian' && !meal.dietary_tags.includes('vegetarian') && !meal.dietary_tags.includes('vegan')) {
      return false;
    }
    if (userDietaryPref === 'vegan' && !meal.dietary_tags.includes('vegan')) {
      return false;
    }
  }
  
  // Verificar ingredientes excluídos manualmente
  if (userExcluded.length > 0 && Array.isArray(meal.components)) {
    const mealIngredients = meal.components.map((c) => 
      (c.name || c.item || '').toLowerCase()
    );
    const hasExcluded = userExcluded.some((excluded) =>
      mealIngredients.some((ing) => ing.includes(excluded.toLowerCase()))
    );
    if (hasExcluded) return false;
  }
  
  return true;
});
```

**Status:** ✅ Correto - Filtra por intolerâncias, dieta e ingredientes excluídos

---

#### **3. Organização por Tipo de Refeição (Linha 1607-1614)**
```typescript
const poolByMealType: Record<string, MealCombinationFromPool[]> = {};
for (const meal of compatiblePoolMeals) {
  const normalizedType = MEAL_TYPE_MAP[meal.meal_type] || meal.meal_type;
  if (!poolByMealType[normalizedType]) {
    poolByMealType[normalizedType] = [];
  }
  poolByMealType[normalizedType].push(meal);
}
```

**Status:** ✅ Correto - Organiza por tipo de refeição

---

#### **4. Tentativa de Usar Pool (Linha 1744-1807)**
```typescript
// ============= TENTAR USAR POOL PRIMEIRO =============
const poolMealsForDay: SimpleMeal[] = [];
let canUsePoolForDay = true;

for (const meal of meals) {
  const poolOptions = getPoolMealsForType(
    meal.type, 
    meal.targetCalories, 
    optionsPerMeal, 
    usedPoolMealIds
  );
  
  if (poolOptions.length >= optionsPerMeal) {
    // Temos opções suficientes do pool
    const options = poolOptions.map(convertPoolMealToOption);
    
    // Marcar como usadas
    poolOptions.forEach(p => usedPoolMealIds.add(p.id));
    
    poolMealsForDay.push({
      meal_type: meal.type,
      label: meal.label,
      target_calories: meal.targetCalories,
      options,
    });
  } else {
    // Não temos opções suficientes - marcar para usar AI
    canUsePoolForDay = false;
    logStep(`⚠️ Pool insufficient for ${meal.type}`, { 
      available: poolOptions.length, 
      needed: optionsPerMeal 
    });
    break;
  }
}

// Se conseguimos montar o dia inteiro com o pool
if (canUsePoolForDay && poolMealsForDay.length === meals.length) {
  // RETORNA DIA DO POOL ✅
  return {
    dayIndex,
    plan: dayPlan,
    violations: [],
    fromPool: true,
  };
}

// ============= FALLBACK: GERAR COM AI =============
logStep(`🤖 Using AI fallback for day ${dayIndex + 1}`);
```

**Status:** ✅ Correto - Pool é tentado PRIMEIRO, AI é FALLBACK

---

#### **5. Logging de Estatísticas (Linha 1616-1620)**
```typescript
logStep("Approved meal pool loaded", { 
  totalApproved: approvedMeals?.length || 0,
  compatibleWithUser: compatiblePoolMeals.length,
  byType: Object.fromEntries(Object.entries(poolByMealType).map(([k, v]) => [k, v.length]))
});
```

**Status:** ✅ Correto - Loga estatísticas do pool

---

## 🚨 PROBLEMAS IDENTIFICADOS

### **PROBLEMA 1: POOL VAZIO** ⚠️ CRÍTICO

**Causa Raiz:** A tabela `meal_combinations` provavelmente está **VAZIA** ou não tem refeições **APROVADAS** para o país do usuário.

**Evidência:**
```typescript
.eq("is_active", true)
.eq("approval_status", "approved")
.contains("country_codes", [userCountry]);
```

**Query retorna 0 refeições se:**
1. ❌ Tabela `meal_combinations` está vazia
2. ❌ Nenhuma refeição tem `approval_status = 'approved'`
3. ❌ Nenhuma refeição tem `is_active = true`
4. ❌ Nenhuma refeição tem o país do usuário em `country_codes`

---

### **PROBLEMA 2: FALLBACK AI TAMBÉM FALHOU** ⚠️ CRÍTICO

**Causa Raiz:** Se o pool está vazio, o sistema usa AI como fallback, mas **AI TAMBÉM FALHOU** em gerar as refeições.

**Possíveis causas:**
1. ❌ Erro na API do Gemini (quota excedida, timeout)
2. ❌ Prompt muito restritivo (muitas restrições do usuário)
3. ❌ Erro de parsing do JSON retornado pela AI
4. ❌ Validação rejeitou todas as refeições geradas

---

### **PROBLEMA 3: FALTA DE REFEIÇÕES NO POOL** ⚠️ ALTO

**Situação Atual:**
- Pool de refeições criado na Fase 3: **23 templates**
  - Brasil: 12 refeições
  - EUA: 11 refeições

**Mas esses templates NÃO ESTÃO NO BANCO!**

Os templates criados em:
- `brazil-meal-pool.ts`
- `usa-meal-pool.ts`

São apenas **código TypeScript**, não foram **inseridos na tabela `meal_combinations`**.

---

## 📋 CHECKLIST DE VERIFICAÇÃO

### **1. Verificar se Pool Tem Dados**
```sql
-- Verificar total de refeições
SELECT COUNT(*) FROM meal_combinations;

-- Verificar refeições aprovadas
SELECT COUNT(*) FROM meal_combinations 
WHERE is_active = true 
AND approval_status = 'approved';

-- Verificar por país
SELECT country_codes, COUNT(*) 
FROM meal_combinations 
WHERE is_active = true 
AND approval_status = 'approved'
GROUP BY country_codes;

-- Ver exemplos
SELECT id, name, meal_type, country_codes, approval_status, is_active
FROM meal_combinations
LIMIT 10;
```

### **2. Verificar Logs do Backend**
Procurar por:
```
[AI-MEAL-PLAN] Approved meal pool loaded
[AI-MEAL-PLAN] ⚠️ Pool insufficient for breakfast
[AI-MEAL-PLAN] 🤖 Using AI fallback for day 1
```

### **3. Verificar Restrições do Usuário**
- Intolerâncias configuradas?
- Preferência dietária (vegetariano, vegano)?
- Ingredientes excluídos manualmente?
- País do usuário?

---

## 🎯 DIAGNÓSTICO FINAL

### **Arquitetura ESTÁ CORRETA** ✅

A lógica de priorização está implementada corretamente:
1. ✅ **Pool é consultado PRIMEIRO**
2. ✅ **AI é usada apenas como FALLBACK**
3. ✅ **Filtragem por restrições está correta**
4. ✅ **Logging está presente**

### **Problema REAL** ⚠️

**O pool de refeições está VAZIO no banco de dados!**

Os 23 templates criados na Fase 3 são apenas código TypeScript e **NÃO foram inseridos na tabela `meal_combinations`**.

---

## 🔧 SOLUÇÕES RECOMENDADAS

### **SOLUÇÃO 1: Popular o Pool com os Templates Criados** (RECOMENDADO)

**Criar script de migração:**
```typescript
// migrate-meal-templates-to-db.ts
import { BRAZIL_MEAL_POOL } from "./meal-pools/brazil-meal-pool.ts";
import { USA_MEAL_POOL } from "./meal-pools/usa-meal-pool.ts";

async function migrateMealTemplates() {
  const supabase = createClient(...);
  
  // Inserir templates brasileiros
  for (const [mealType, templates] of Object.entries(BRAZIL_MEAL_POOL)) {
    for (const template of templates) {
      await supabase.from("meal_combinations").insert({
        name: template.i18n["pt-BR"].name,
        description: template.i18n["pt-BR"].description,
        meal_type: template.meal_type,
        meal_density: template.density,
        components: template.ingredients.map(id => ({
          name: getIngredientName(id, "pt-BR"),
          // ... buscar macros do universal-ingredients-db
        })),
        country_codes: ["BR"],
        is_active: true,
        approval_status: "approved",
        // ... calcular totais
      });
    }
  }
  
  // Inserir templates americanos
  // ...
}
```

**Tempo estimado:** 1-2 horas

---

### **SOLUÇÃO 2: Usar `populate-meal-pool` para Gerar Refeições**

**Executar a Edge Function existente:**
```bash
# Via Supabase CLI
supabase functions invoke populate-meal-pool --data '{
  "country_code": "BR",
  "meal_type": "cafe_manha",
  "quantity": 10,
  "dietary_filter": "none",
  "intolerance_filter": "none"
}'
```

**Repetir para todos os tipos de refeição e países.**

**Tempo estimado:** 30 minutos de execução

---

### **SOLUÇÃO 3: Investigar Por Que AI Também Falhou**

**Verificar logs do Gemini:**
- Quota excedida?
- Timeout?
- Erro de parsing?

**Verificar restrições do usuário:**
- Muito restritivas?
- Combinação impossível?

---

## 📊 ESTATÍSTICAS ESPERADAS

### **Após Popular o Pool:**

```
[AI-MEAL-PLAN] Approved meal pool loaded
{
  totalApproved: 23,
  compatibleWithUser: 23,
  byType: {
    breakfast: 5,
    morning_snack: 0,
    lunch: 4,
    afternoon_snack: 0,
    dinner: 2,
    evening_snack: 1
  }
}
```

### **Geração de Plano:**
```
[AI-MEAL-PLAN] ✅ Day 1 from POOL
{
  mealsCount: 6,
  totalCalories: 2000,
  usedPoolIds: ["br_cafe_pao_queijo", "br_almoco_arroz_feijao_frango", ...]
}
```

---

## 🎯 CONCLUSÃO

### **Arquitetura:** ✅ PERFEITA
- Pool é fonte primária
- AI é fallback
- Lógica está correta

### **Problema:** ⚠️ POOL VAZIO
- Templates criados não estão no banco
- Precisa popular `meal_combinations`

### **Ação Imediata:**
1. Verificar se `meal_combinations` tem dados
2. Se vazio, popular com templates ou `populate-meal-pool`
3. Verificar logs do backend para entender por que AI também falhou

---

**Próximo Passo:** Executar queries SQL acima para confirmar diagnóstico.
