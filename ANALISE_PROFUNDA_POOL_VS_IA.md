# ANÁLISE PROFUNDA: POR QUE O POOL NÃO ESTÁ SENDO USADO CORRETAMENTE

## 📋 RESUMO DO PROBLEMA

**Sintoma:** Sistema não está usando pool como primeira opção, pulando para IA.

**Expectativa do usuário:**
1. Pool de refeições prontas → PRIMEIRA OPÇÃO
2. Banco de alimentos para montar refeições → SEGUNDA OPÇÃO (NÃO EXISTE)
3. IA → ÚLTIMA OPÇÃO (praticamente obsoleta)

---

## 🏗️ ARQUITETURA ATUAL vs DESEJADA

### ATUAL (implementada):

```
Para cada refeição do dia:
  1. Buscar no pool (meal_combinations)
     - Filtrar por meal_type
     - Filtrar por calorias (±50% do target)
     - Filtrar por refeições já usadas
  2. Se pool retornar >= 1 refeição → USAR POOL ✅
  3. Se pool retornar 0 refeições → USAR IA ❌
```

**PROBLEMA:** Não existe PASSO 2.5 (montar refeição com ingredientes do pool)

### DESEJADA (pelo usuário):

```
Para cada refeição do dia:
  1. Buscar refeição COMPLETA no pool (meal_combinations)
     - Se encontrar → USAR POOL ✅
  
  2. Se não encontrar, MONTAR refeição com ingredientes do pool:
     - Extrair componentes das refeições do pool
     - Selecionar ingredientes compatíveis com macros
     - Montar nova refeição combinando ingredientes
     - Se conseguir montar → USAR MONTAGEM ✅
  
  3. SOMENTE se não conseguir montar → USAR IA (último recurso)
```

---

## 🔍 ANÁLISE DO CÓDIGO ATUAL

### 1. CARREGAMENTO DO POOL (linhas 1519-1603)

```typescript
// Query correta - busca refeições aprovadas
const { data: approvedMeals } = await supabaseClient
  .from("meal_combinations")
  .select("id, name, meal_type, components, ...")
  .eq("is_active", true)
  .eq("approval_status", "approved");
```

**Status:** ✅ FUNCIONANDO - Pool carrega 136 refeições

### 2. FILTRO DE COMPATIBILIDADE (linhas 1556-1603)

```typescript
const compatiblePoolMeals = approvedMeals.filter(meal => {
  // Filtro por país
  // Filtro por intolerâncias
  // Filtro por preferência dietária
  // Filtro por ingredientes excluídos
  return true;
});
```

**Status:** ✅ FUNCIONANDO - Filtra corretamente

### 3. ORGANIZAÇÃO POR TIPO (linhas 1624-1635)

```typescript
const poolByMealType: Record<string, MealCombinationFromPool[]> = {};
for (const meal of compatiblePoolMeals) {
  const normalizedType = MEAL_TYPE_MAP[meal.meal_type] || meal.meal_type;
  poolByMealType[normalizedType].push(meal);
}
```

**Status:** ✅ FUNCIONANDO - Log mostra:
```json
{
  "breakfast": 25,
  "morning_snack": 23,
  "lunch": 18,
  "afternoon_snack": 23,
  "dinner": 23,
  "evening_snack": 24
}
```

### 4. BUSCA DE REFEIÇÕES (função getPoolMealsForType, linhas 1657-1728)

```typescript
function getPoolMealsForType(mealType, targetCalories, count, usedMealIds) {
  // Pegar refeições disponíveis (não usadas)
  const available = poolByMealType[mealType].filter(m => !usedMealIds.has(m.id));
  
  // Filtrar por faixa de calorias (±50%)
  const minCal = targetCalories * 0.5;
  const maxCal = targetCalories * 1.5;
  const inRange = available.filter(m => m.total_calories >= minCal && m.total_calories <= maxCal);
  
  // Se não tiver suficientes na faixa, pegar as mais próximas
  if (inRange.length < count) {
    return available.sort((a, b) => |a.cal - target| - |b.cal - target|).slice(0, count);
  }
  
  return inRange.slice(0, count);
}
```

**Status:** ⚠️ PARCIALMENTE FUNCIONANDO

**Log mostra:**
```json
{
  "mealType": "evening_snack",
  "targetCalories": 167,
  "totalInPool": 24,
  "available": 22,
  "available_calories": [129, 2, 135, 140, 150]
}
```

**PROBLEMA IDENTIFICADO:** Uma das calorias é `2` (dois!) - refeição com dados incorretos no banco.

### 5. USO DO POOL vs IA (linhas 1837-1904)

```typescript
for (const meal of meals) {
  const poolOptions = getPoolMealsForType(...);
  
  if (poolOptions.length >= 1) {
    // ✅ USAR POOL
    poolMealsForDay.push(convertPoolMealToOption(poolOptions[0]));
  } else {
    // ❌ MARCAR PARA IA
    mealsNeedingAI.push(meal);
  }
}

// Se todas as refeições vieram do pool
if (poolMealsForDay.length === meals.length) {
  return { plan: dayPlan, fromPool: true };
}

// Senão, gerar com IA
// ... chamada à IA
```

**Status:** ⚠️ LÓGICA CORRETA, mas falta PASSO 2.5

---

## 🚨 PROBLEMAS IDENTIFICADOS

### PROBLEMA 1: FALTA O PASSO 2.5 (Montar com ingredientes)

**Atual:** Se pool não tem refeição completa → IA
**Desejado:** Se pool não tem refeição completa → Montar com ingredientes → IA

**Impacto:** Sistema pula direto para IA quando poderia montar refeição com ingredientes existentes.

### PROBLEMA 2: Dados incorretos no pool

**Log mostra:** `available_calories: [129, 2, 135, 140, 150]`

**Problema:** Uma refeição tem `total_calories = 2` - dados claramente incorretos.

**SQL para verificar:**
```sql
SELECT id, name, total_calories 
FROM meal_combinations 
WHERE total_calories < 50;
```

### PROBLEMA 3: Filtro de calorias pode ser restritivo demais

**Atual:** ±50% do target
**Exemplo:** Target 167 kcal → Faixa 84-250 kcal

**Se pool tem:**
- 3 refeições abaixo de 84 kcal
- 0 refeições acima de 250 kcal
- 21 refeições na faixa

**Status:** Não é o problema principal (21 de 24 estão na faixa)

### PROBLEMA 4: usedPoolMealIds cresce a cada dia

**Lógica atual:**
```typescript
const usedPoolMealIds = new Set<string>(); // Compartilhado entre todos os dias

// A cada refeição usada:
poolOptions.forEach(p => usedPoolMealIds.add(p.id));
```

**Exemplo com 11 dias, 6 refeições por dia:**
- Dia 1: usa 6 refeições, usedIds = 6
- Dia 2: usa 6 refeições, usedIds = 12
- Dia 3: usa 6 refeições, usedIds = 18
- ...
- Dia 11: precisa 6 refeições, mas pool tem 24 por tipo e usedIds = 60

**Problema:** Se pool tem 24 refeições de `evening_snack` e usedIds = 17 (como no log), sobram apenas 7.

**Log mostrou:** `"available": 22, "usedIds": 17`

Isso significa que:
- Pool total: 24 refeições de evening_snack
- Usadas: 2 (24 - 22 = 2, não 17)
- O usedIds = 17 são IDs de TODAS as refeições usadas, não só evening_snack

**Status:** ✅ Lógica correta - available = 22 significa que há refeições disponíveis.

---

## 💡 SOLUÇÃO PROPOSTA (NÃO IMPLEMENTAR AINDA)

### FASE 1: Corrigir dados do pool

```sql
-- Identificar refeições com calorias inválidas
SELECT id, name, meal_type, total_calories 
FROM meal_combinations 
WHERE total_calories < 50 OR total_calories > 2000;

-- Corrigir ou desativar
UPDATE meal_combinations 
SET is_active = false 
WHERE total_calories < 50;
```

### FASE 2: Implementar montagem com ingredientes do pool

```typescript
// NOVO: Função para montar refeição com ingredientes do pool
async function buildMealFromPoolIngredients(
  mealType: string,
  targetCalories: number,
  targetProtein: number,
  restrictions: UserRestrictions
): Promise<SimpleMealOption | null> {
  
  // 1. Extrair TODOS os componentes de todas as refeições do pool desse tipo
  const allComponents: PoolComponent[] = [];
  for (const meal of poolByMealType[mealType] || []) {
    if (Array.isArray(meal.components)) {
      allComponents.push(...meal.components);
    }
  }
  
  // 2. Remover duplicatas e filtrar por restrições
  const uniqueComponents = deduplicateComponents(allComponents);
  const compatibleComponents = filterByRestrictions(uniqueComponents, restrictions);
  
  // 3. Algoritmo de seleção para atingir macros target
  const selectedComponents = selectComponentsForTarget(
    compatibleComponents,
    targetCalories,
    targetProtein
  );
  
  if (!selectedComponents || selectedComponents.length === 0) {
    return null; // Não conseguiu montar → vai para IA
  }
  
  // 4. Calcular macros totais
  const totalMacros = calculateTotalMacros(selectedComponents);
  
  // 5. Retornar refeição montada
  return {
    title: generateMealName(mealType, selectedComponents),
    foods: selectedComponents,
    calories_kcal: totalMacros.calories,
    protein: totalMacros.protein,
    carbs: totalMacros.carbs,
    fat: totalMacros.fat,
    fromPool: true, // Tecnicamente é do pool (ingredientes)
    isComposed: true, // Nova flag para indicar que foi montada
  };
}
```

### FASE 3: Integrar no fluxo principal

```typescript
for (const meal of meals) {
  // PASSO 1: Buscar refeição completa no pool
  const poolOptions = getPoolMealsForType(...);
  
  if (poolOptions.length >= 1) {
    poolMealsForDay.push(convertPoolMealToOption(poolOptions[0]));
    continue;
  }
  
  // PASSO 2: Montar com ingredientes do pool (NOVO!)
  const composedMeal = await buildMealFromPoolIngredients(
    normalizedMealType,
    meal.targetCalories,
    meal.targetProtein,
    restrictions
  );
  
  if (composedMeal) {
    poolMealsForDay.push({
      meal_type: meal.type,
      label: meal.label,
      target_calories: meal.targetCalories,
      options: [composedMeal],
    });
    logStep(`🔧 ${meal.type} COMPOSED from pool ingredients`);
    continue;
  }
  
  // PASSO 3: Último recurso - IA
  mealsNeedingAI.push(meal);
  logStep(`🤖 ${meal.type} needs AI fallback`);
}
```

---

## 📊 TABELA DE COMPONENTES NECESSÁRIA

Para implementar a montagem com ingredientes, o pool precisa ter componentes bem estruturados:

```typescript
interface PoolComponent {
  name: string;           // "Frango grelhado"
  grams: number;          // 150
  calories: number;       // 250
  protein: number;        // 45
  carbs: number;          // 0
  fat: number;            // 5
  category?: string;      // "protein" | "carb" | "vegetable" | "fat"
}
```

**Verificar estrutura atual:**
```sql
SELECT 
  id, 
  name, 
  meal_type,
  jsonb_typeof(components) as components_type,
  jsonb_array_length(components) as components_count,
  components->0 as first_component
FROM meal_combinations 
LIMIT 5;
```

---

## 🎯 RESUMO DAS AÇÕES NECESSÁRIAS

### IMEDIATO (sem código):
1. ✅ Verificar e corrigir dados incorretos no pool (calorias = 2)
2. ✅ Verificar estrutura dos componentes no banco

### FASE 1 (código simples):
1. Adicionar validação para rejeitar refeições com calorias < 50
2. Melhorar logs para debugging

### FASE 2 (código complexo):
1. Implementar `buildMealFromPoolIngredients()`
2. Implementar algoritmo de seleção de componentes
3. Integrar no fluxo principal

### FASE 3 (otimização):
1. Criar índices para performance
2. Cache de componentes
3. Testes de regressão

---

## ⚠️ RISCOS

1. **Combinações inadequadas:** Algoritmo pode criar "Frango + Banana" (não faz sentido)
   - Mitigação: Adicionar regras de compatibilidade entre componentes

2. **Performance:** Processar todos os componentes pode ser lento
   - Mitigação: Cache e processamento em paralelo

3. **Macros imprecisos:** Soma de componentes pode não bater exatamente com target
   - Mitigação: Tolerância de ±15%

---

**Documento gerado em:** 20/01/2026
**Status:** ANÁLISE COMPLETA - AGUARDANDO APROVAÇÃO PARA IMPLEMENTAR
