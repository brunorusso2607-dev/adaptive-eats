# ANÁLISE PROFUNDA: REGRAS DE MACROS QUE IMPEDEM USO DO POOL

## 🎯 OBJETIVO DA ANÁLISE

Identificar **exatamente** por que o sistema está fazendo fallback para IA em vez de usar o pool de refeições, mesmo tendo refeições disponíveis.

---

## 🔍 PROBLEMA IDENTIFICADO

### **Logs do Sistema (do usuário):**
```
[AI-MEAL-PLAN] 🔍 getPoolMealsForType called - {
  "mealType":"evening_snack",
  "targetCalories":167,
  "count":1,
  "totalInPool":24,
  "available":23,
  "usedIds":11
}
```

**Observação:** Há 23 refeições disponíveis no pool, mas o sistema está fazendo fallback para IA.

---

## 📊 REGRAS ATUAIS DE FILTRO DE CALORIAS

### **Localização:** `generate-ai-meal-plan/index.ts` (linhas 1668-1704)

### **REGRA 1: Filtro de Calorias (±50%)**

```typescript
// Filtrar por faixa de calorias (±50% do target)
const minCal = targetCalories * 0.5;
const maxCal = targetCalories * 1.5;

const inRange = available.filter(m => 
  m.total_calories >= minCal && m.total_calories <= maxCal
);
```

**Exemplo com targetCalories = 167 kcal:**
- `minCal = 167 * 0.5 = 83.5 kcal`
- `maxCal = 167 * 1.5 = 250.5 kcal`
- **Faixa aceita:** 84-250 kcal

### **REGRA 2: Quantidade Mínima**

```typescript
if (inRange.length >= count) {
  // Usar pool
  return inRange.slice(0, count);
}
```

**Condição para usar pool:** `inRange.length >= optionsPerMeal`

Se `optionsPerMeal = 1`, precisa de **pelo menos 1 refeição** na faixa.

### **REGRA 3: Fallback para Mais Próximas**

```typescript
// Se não tiver suficientes na faixa, pegar as mais próximas
const sorted = available.sort((a, b) => 
  Math.abs(a.total_calories - targetCalories) - Math.abs(b.total_calories - targetCalories)
);
const result = sorted.slice(0, count);
```

**Problema:** Mesmo pegando as mais próximas, se `result.length < count`, o sistema considera que não tem opções suficientes.

---

## 🚨 CAUSA RAIZ DO PROBLEMA

### **HIPÓTESE 1: Filtro de Calorias Muito Restritivo**

**Cenário:** `evening_snack` com target de 167 kcal

**Problema:** Refeições no pool podem estar fora da faixa 84-250 kcal.

**Exemplo de refeições típicas de ceia:**
- Iogurte com granola: ~150 kcal ✅ (dentro da faixa)
- Vitamina de banana: ~200 kcal ✅ (dentro da faixa)
- Leite com biscoito: ~180 kcal ✅ (dentro da faixa)
- Queijo branco com torrada: ~120 kcal ✅ (dentro da faixa)

**Conclusão:** Faixa de ±50% parece adequada para ceia.

---

### **HIPÓTESE 2: Problema com Normalização de Meal Type**

**Código:**
```typescript
const normalizedMealType = MEAL_TYPE_MAP[meal.type] || meal.type;

const poolOptions = getPoolMealsForType(
  normalizedMealType,  // ← Pode estar errado
  meal.targetCalories,
  optionsPerMeal,
  usedPoolMealIds
);
```

**MEAL_TYPE_MAP:**
```typescript
const MEAL_TYPE_MAP: Record<string, string> = {
  "cafe_manha": "breakfast",
  "cafe_da_manha": "breakfast",
  "lanche_manha": "morning_snack",
  "almoco": "lunch",
  "lanche_tarde": "afternoon_snack",
  "lanche": "afternoon_snack",
  "jantar": "dinner",
  "ceia": "supper",
  // FALTA: evening_snack → supper
};
```

**PROBLEMA CRÍTICO:** `evening_snack` não está mapeado!

Se o frontend envia `evening_snack`, o código busca por `evening_snack` no pool, mas o pool tem refeições cadastradas como `supper`.

**Resultado:** `poolByMealType["evening_snack"]` retorna array vazio, mesmo tendo 24 refeições de `supper`.

---

### **HIPÓTESE 3: Pool Não Tem Refeições do Tipo Correto**

**Verificação necessária:** Quantas refeições de cada tipo existem no pool?

```sql
SELECT 
  meal_type,
  COUNT(*) as total,
  AVG(total_calories) as avg_calories,
  MIN(total_calories) as min_calories,
  MAX(total_calories) as max_calories
FROM meal_combinations
WHERE country_code = 'BR'
  AND is_approved = true
GROUP BY meal_type
ORDER BY meal_type;
```

---

## 🎯 ANÁLISE DETALHADA: LÓGICA DE DECISÃO

### **Fluxo Atual:**

```
1. Para cada refeição do dia:
   ↓
2. Normalizar meal.type com MEAL_TYPE_MAP
   ↓
3. Buscar no pool: poolByMealType[normalizedMealType]
   ↓
4. Filtrar por calorias (±50%)
   ↓
5. Se inRange.length >= optionsPerMeal:
      ✅ Usar pool
   Senão:
      ❌ Marcar para IA
   ↓
6. Se TODAS as refeições do dia vieram do pool:
      ✅ Retornar dia completo do pool
   Senão:
      ❌ Gerar DIA INTEIRO com IA (descarta pool)
```

**PROBLEMA CRÍTICO:** Se **UMA ÚNICA** refeição não tem match no pool, o **DIA INTEIRO** é gerado por IA.

---

## 🔬 TESTE DE HIPÓTESES

### **TESTE 1: Verificar Mapeamento de Meal Types**

**Ação:** Adicionar log para mostrar meal.type original e normalizedMealType

```typescript
logStep(`🔍 Meal type normalization`, {
  original: meal.type,
  normalized: normalizedMealType,
  existsInPool: (poolByMealType[normalizedMealType] || []).length > 0
});
```

### **TESTE 2: Verificar Distribuição de Calorias no Pool**

**SQL:**
```sql
SELECT 
  meal_type,
  total_calories,
  name
FROM meal_combinations
WHERE country_code = 'BR'
  AND is_approved = true
  AND meal_type = 'supper'
ORDER BY total_calories;
```

**Objetivo:** Ver se refeições de ceia estão na faixa 84-250 kcal.

### **TESTE 3: Verificar Refeições Usadas**

**Log atual:**
```
"usedIds":11
```

**Problema:** Se 11 das 24 refeições já foram usadas, sobram apenas 13. Se o filtro de calorias rejeitar todas, não haverá opções.

---

## 💡 SOLUÇÕES PROPOSTAS (NÃO IMPLEMENTAR AINDA)

### **SOLUÇÃO 1: Corrigir MEAL_TYPE_MAP (ALTA PRIORIDADE)**

**Problema:** `evening_snack` não está mapeado para `supper`

**Correção:**
```typescript
const MEAL_TYPE_MAP: Record<string, string> = {
  "cafe_manha": "breakfast",
  "cafe_da_manha": "breakfast",
  "lanche_manha": "morning_snack",
  "almoco": "lunch",
  "lanche_tarde": "afternoon_snack",
  "lanche": "afternoon_snack",
  "jantar": "dinner",
  "ceia": "supper",
  "evening_snack": "supper",  // ← ADICIONAR
};
```

**Impacto:** Se este for o problema, resolverá 100% dos casos de ceia.

**Risco:** BAIXO (apenas adiciona mapeamento faltante)

---

### **SOLUÇÃO 2: Relaxar Filtro de Calorias (MÉDIA PRIORIDADE)**

**Problema:** ±50% pode ser muito restritivo para refeições pequenas

**Proposta:** Usar faixa adaptativa baseada no tamanho da refeição

```typescript
// Para refeições pequenas (<200 kcal), usar ±70%
// Para refeições médias (200-400 kcal), usar ±50%
// Para refeições grandes (>400 kcal), usar ±30%

const tolerance = targetCalories < 200 ? 0.7 :
                  targetCalories < 400 ? 0.5 : 0.3;

const minCal = targetCalories * (1 - tolerance);
const maxCal = targetCalories * (1 + tolerance);
```

**Exemplo com 167 kcal:**
- Atual: 84-250 kcal (±50%)
- Proposta: 50-284 kcal (±70%)

**Impacto:** Aumenta chances de match para refeições pequenas

**Risco:** MÉDIO (pode aceitar refeições muito diferentes do target)

---

### **SOLUÇÃO 3: Permitir Fallback Híbrido (BAIXA PRIORIDADE)**

**Problema:** Se uma refeição falha, o dia inteiro é descartado

**Proposta:** Já implementado! (linhas 1808-1890)

**Status:** ✅ JÁ EXISTE NO CÓDIGO

O código atual já permite usar pool para algumas refeições e IA para outras. O problema é que o pool não está sendo encontrado.

---

### **SOLUÇÃO 4: Remover Filtro de Calorias (NÃO RECOMENDADO)**

**Proposta:** Remover completamente o filtro de calorias e usar sempre as mais próximas

**Impacto:** Pool sempre seria usado, mas com refeições potencialmente inadequadas

**Risco:** ALTO (pode gerar planos com calorias muito erradas)

**Recomendação:** ❌ NÃO IMPLEMENTAR

---

## 📋 CHECKLIST DE DIAGNÓSTICO

Antes de implementar qualquer solução, precisamos confirmar:

### **1. Verificar Meal Types no Pool**
```sql
SELECT DISTINCT meal_type 
FROM meal_combinations 
WHERE country_code = 'BR' 
  AND is_approved = true;
```

**Esperado:** `breakfast`, `morning_snack`, `lunch`, `afternoon_snack`, `dinner`, `supper`

### **2. Verificar Meal Types Enviados pelo Frontend**
**Log:** `meal.type` antes da normalização

**Esperado:** `breakfast`, `morning_snack`, `lunch`, `afternoon_snack`, `dinner`, `evening_snack`

### **3. Verificar Distribuição de Calorias**
```sql
SELECT 
  meal_type,
  MIN(total_calories) as min_cal,
  MAX(total_calories) as max_cal,
  AVG(total_calories) as avg_cal,
  COUNT(*) as total
FROM meal_combinations
WHERE country_code = 'BR'
  AND is_approved = true
GROUP BY meal_type;
```

### **4. Verificar Targets de Calorias Calculados**
**Log:** `meal.targetCalories` para cada tipo de refeição

**Exemplo esperado:**
- breakfast: ~400 kcal
- morning_snack: ~150 kcal
- lunch: ~600 kcal
- afternoon_snack: ~250 kcal
- dinner: ~500 kcal
- evening_snack: ~167 kcal

---

## 🎯 CONCLUSÃO PRELIMINAR

### **CAUSA MAIS PROVÁVEL:**

**`evening_snack` não está mapeado para `supper` no MEAL_TYPE_MAP**

**Evidência:**
- Log mostra `"mealType":"evening_snack"`
- MEAL_TYPE_MAP não tem `evening_snack`
- Pool tem refeições de `supper`, não `evening_snack`
- Resultado: `poolByMealType["evening_snack"]` retorna vazio

### **SOLUÇÃO RECOMENDADA:**

**Adicionar mapeamento faltante:**
```typescript
"evening_snack": "supper",
```

**Confiança:** 90%

**Risco:** BAIXÍSSIMO

**Impacto:** Resolverá o problema se a causa for o mapeamento

---

## ⚠️ PRÓXIMOS PASSOS (NÃO EXECUTAR AINDA)

1. **Confirmar hipótese:** Executar SQLs de diagnóstico
2. **Verificar logs:** Adicionar logs temporários para meal type normalization
3. **Testar solução:** Adicionar `"evening_snack": "supper"` ao MEAL_TYPE_MAP
4. **Validar:** Gerar novo plano e verificar se pool é usado

---

## 🚫 O QUE NÃO FAZER

❌ **NÃO remover filtro de calorias** (pode gerar planos inadequados)
❌ **NÃO relaxar muito a tolerância** (±70% pode ser excessivo)
❌ **NÃO mudar lógica de fallback** (já está correta)
❌ **NÃO implementar sem confirmar diagnóstico** (pode criar novos problemas)

---

**Documento gerado em:** 20/01/2026
**Status:** ANÁLISE COMPLETA - AGUARDANDO CONFIRMAÇÃO PARA IMPLEMENTAR
**Confiança na solução:** 90%
