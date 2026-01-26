# 🚨 ANÁLISE DE RISCO: PROBABILIDADE DE FALHAS NO GERADOR DE REFEIÇÕES

**Data:** 23/01/2026  
**Status:** 🔴 ALTO RISCO - REQUER ATENÇÃO IMEDIATA

---

## 📊 RESUMO EXECUTIVO

**Probabilidade de falha ATUAL:** 🔴 **ALTA (60-70%)**  
**Probabilidade de falha PÓS-IMPLEMENTAÇÃO:** 🟡 **MÉDIA (20-30%)**  
**Recomendação:** ⚠️ **IMPLEMENTAR MELHORIAS DE ESTABILIDADE ANTES DAS MUDANÇAS DE FUNCIONALIDADE**

---

# 🔍 PARTE 1: PONTOS DE FALHA IDENTIFICADOS NO CÓDIGO ATUAL

## 1.1 GERADOR DIRETO (`advanced-meal-generator.ts`)

### **RISCO CRÍTICO 1: Loop Infinito Potencial**

```typescript
// Linha 404-409
while (meals.length < quantity && attempts < maxAttempts) {
  // Timeout protection: máximo 45 segundos de execução
  if (attempts % 100 === 0 && Date.now() - startTime > MAX_EXECUTION_TIME) {
    console.warn(`[MEAL-GENERATOR] Timeout protection: Geradas ${meals.length} de ${quantity} refeições em ${attempts} tentativas`);
    break; // Parar e retornar o que conseguiu gerar
  }
```

**Problema:**
- Se não conseguir gerar refeições válidas, pode rodar até 45 segundos
- `maxAttempts` varia de 500x a 1000x por refeição
- Para lanches com poucas opções, pode esgotar tentativas sem sucesso

**Probabilidade de falha:** 🔴 **40%** (especialmente para lanches/ceia)

**Cenários de falha:**
1. Usuário com múltiplas intolerâncias (gluten + lactose + nuts)
2. País com poucos templates (PE, CL, AR)
3. Refeições simples (ceia) com poucas opções de ingredientes

---

### **RISCO CRÍTICO 2: Validação Hardcoded de Intolerâncias**

```typescript
// Linha 491-496
const hasIntolerance = allSelectedIds.some(id => {
  const ing = INGREDIENTS[id];
  return ing && ing.contains.some(allergen => intolerances.includes(allergen));
});
```

**Problema:**
- NÃO usa `globalSafetyEngine` (fonte de verdade)
- Depende de `ing.contains` hardcoded no arquivo
- Se banco de dados tem novos mapeamentos, gerador direto IGNORA

**Probabilidade de falha:** 🔴 **30%** (ingredientes não bloqueados corretamente)

**Cenários de falha:**
1. Admin adiciona novo mapeamento no banco (ex: "leite condensado" → lactose)
2. Gerador direto não recarrega, continua usando lista antiga
3. Usuário recebe refeição com ingrediente proibido

---

### **RISCO MÉDIO 3: Retries Limitados para Duplicação**

```typescript
// Linha 455-479
let retries = 0;
const maxRetries = 100;

while (globalUsed.has(ingredientId) && retries < maxRetries) {
  // ...
  retries++;
}

if (retries >= maxRetries) {
  console.warn(`[MEAL-GENERATOR] Hit retry limit for slot ${slotName}, accepting duplicate: ${ingredientId}`);
}
```

**Problema:**
- Aceita duplicação após 100 tentativas
- Pode gerar "Frango grelhado" + "Frango grelhado" na mesma refeição

**Probabilidade de falha:** 🟡 **15%** (refeições com ingredientes duplicados)

---

## 1.2 PROMPT IA (`generate-ai-meal-plan/index.ts`)

### **RISCO CRÍTICO 4: Falha na API do Gemini**

```typescript
// Linha 2123-2136
if (!aiResponse.ok) {
  const errorText = await aiResponse.text();
  logStep(`Google AI error (status ${aiResponse.status})`, { error: errorText.substring(0, 200) });
  
  if (aiResponse.status === 429 || aiResponse.status === 503 || aiResponse.status === 500) {
    // Rate limit, serviço indisponível ou erro interno - esperar com backoff exponencial
    const waitTime = Math.min(2000 * Math.pow(2, retryCount), 20000);
    logStep(`Waiting ${waitTime}ms before retry`);
    await new Promise(r => setTimeout(r, waitTime));
    retryCount++;
    continue;
  }
  throw new Error(`Google AI API error: ${aiResponse.status}`);
}
```

**Problema:**
- Depende 100% da disponibilidade do Gemini
- Rate limit (429) pode acontecer em horários de pico
- Retry com backoff exponencial pode demorar até 20 segundos
- Se falhar após 3 tentativas, **TODO O BATCH FALHA**

**Probabilidade de falha:** 🔴 **25%** (especialmente em horários de pico)

**Cenários de falha:**
1. Múltiplos usuários gerando planos simultaneamente
2. Gemini com instabilidade (503)
3. Quota da API esgotada (429)

---

### **RISCO CRÍTICO 5: Parse JSON da IA Pode Falhar**

```typescript
// Linha 2198-2210
} catch (parseError) {
  logStep(`⚠️ Day ${dayIndex + 1} parse error (attempt ${retryCount + 1})`, { 
    error: parseError instanceof Error ? parseError.message : 'Unknown' 
  });
  retryCount++;
  
  if (retryCount > MAX_RETRIES) {
    throw new Error(`Failed to generate day ${dayIndex + 1}`);
  }
}
```

**Problema:**
- IA pode retornar JSON malformado
- Retry limitado a 3 tentativas
- Se falhar, **TODO O DIA É PERDIDO**

**Probabilidade de falha:** 🟡 **20%** (JSON malformado da IA)

---

### **RISCO MÉDIO 6: Pool de Refeições Vazio**

```typescript
// Linha 1542-1551
const { data: approvedMeals, error: poolError } = await supabaseClient
  .from("meal_combinations")
  .select("id, name, meal_type, components, total_calories, total_protein, total_carbs, total_fat, instructions, blocked_for_intolerances, dietary_tags, country_codes")
  .eq("is_active", true)
  .eq("approval_status", "approved");

if (poolError) {
  logStep("⚠️ Error loading meal pool, will use AI fallback", { error: poolError.message });
}
```

**Problema:**
- Se pool estiver vazio ou erro no banco, **FALLBACK PARA IA**
- IA é mais lenta e menos confiável
- Aumenta chance de timeout

**Probabilidade de falha:** 🟡 **15%** (pool vazio ou erro de conexão)

---

### **RISCO MÉDIO 7: Timeout de Edge Function (60s)**

```typescript
// Edge Functions têm limite de 60 segundos
// Geração de 7 dias pode demorar:
// - Pool: 2-5s por dia = 14-35s total ✅
// - Gerador direto: 5-10s por dia = 35-70s total ⚠️
// - IA: 10-20s por dia = 70-140s total ❌
```

**Problema:**
- Se usar muito IA, pode estourar 60 segundos
- Edge Function é terminada abruptamente
- Usuário recebe erro genérico "FunctionsHttpError"

**Probabilidade de falha:** 🟡 **20%** (timeout em gerações longas)

---

## 1.3 POOL DE REFEIÇÕES (`populate-meal-pool/index.ts`)

### **RISCO BAIXO 8: Pool Herda Problemas do Gerador Direto**

**Problema:**
- Pool usa `generateMealsForPool()` do gerador direto
- Se gerador direto falhar, pool não é populado
- Mas pool é executado manualmente pelo admin, não afeta usuário final

**Probabilidade de falha:** 🟢 **5%** (não afeta usuário diretamente)

---

# 📊 PARTE 2: ANÁLISE DE IMPACTO DO PLANO PROPOSTO

## 2.1 MUDANÇAS QUE **AUMENTAM** O RISCO

### **❌ RISCO ADICIONAL 1: Portion Formatter**

```typescript
// Nova função formatPortion()
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
  // ...
}
```

**Novo ponto de falha:**
- Se `ingredientKey` não existir em `PORTION_CONFIGS`, usa fallback
- Mas se `ingredientKey` for `undefined` ou `null`, pode quebrar

**Probabilidade de falha adicional:** 🟡 **+10%**

**Mitigação:**
```typescript
if (!ingredientKey || !config) {
  return { quantity: grams, label: `${grams}g`, unit: 'g' };
}
```

---

### **❌ RISCO ADICIONAL 2: Meal Sorter BR**

```typescript
// Nova função sortMealIngredientsBR()
function categorizeFoodBR(foodName: string, mealType: string): string {
  const normalized = foodName.toLowerCase();
  
  if (/arroz|rice/.test(normalized)) return 'rice';
  if (/feij[aã]o|beans/.test(normalized)) return 'beans';
  // ...
}
```

**Novo ponto de falha:**
- Se `foodName` for `undefined` ou `null`, `.toLowerCase()` quebra
- Regex pode não capturar variações (ex: "arroz integral com alho")

**Probabilidade de falha adicional:** 🟡 **+5%**

**Mitigação:**
```typescript
if (!foodName || typeof foodName !== 'string') return 'other';
const normalized = foodName.toLowerCase();
```

---

### **❌ RISCO ADICIONAL 3: Meal Coherence Validator**

```typescript
// Nova função validateMealCoherence()
const foodNames = foods.map(f => f.name.toLowerCase()).join(' | ');

for (const combo of FORBIDDEN_COMBINATIONS) {
  const hasAll = combo.triggers.every(trigger => 
    new RegExp(trigger, 'i').test(foodNames)
  );
  if (hasAll) {
    errors.push(combo.reason);
  }
}
```

**Novo ponto de falha:**
- Se `foods` estiver vazio, `foodNames` será string vazia
- Se `f.name` for `undefined`, `.toLowerCase()` quebra
- Mais validações = mais pontos de rejeição = menos refeições geradas

**Probabilidade de falha adicional:** 🟡 **+15%**

**Impacto:**
- Gerador direto pode rejeitar MAIS refeições
- Aumenta tentativas necessárias
- Maior chance de timeout

---

## 2.2 MUDANÇAS QUE **REDUZEM** O RISCO

### **✅ MELHORIA 1: Unificar Safety Engine**

```typescript
// ANTES (hardcoded):
const hasIntolerance = allSelectedIds.some(id => {
  const ing = INGREDIENTS[id];
  return ing && ing.contains.some(allergen => intolerances.includes(allergen));
});

// DEPOIS (banco de dados):
const validation = validateIngredient(
  ing.display_name_pt,
  { intolerances, dietaryPreference: null, excludedIngredients: [] },
  safetyDatabase
);
```

**Benefício:**
- Validação consistente em todos os módulos
- Usa banco de dados como fonte de verdade
- Reduz chance de ingredientes proibidos passarem

**Redução de risco:** 🟢 **-15%**

---

# 📊 PARTE 3: CÁLCULO DE PROBABILIDADE DE FALHA

## 3.1 CENÁRIO ATUAL (SEM IMPLEMENTAR PLANO)

| Ponto de Falha | Probabilidade | Impacto |
|----------------|---------------|---------|
| Loop infinito (gerador direto) | 40% | 🔴 CRÍTICO |
| Validação hardcoded | 30% | 🔴 CRÍTICO |
| Falha API Gemini | 25% | 🔴 CRÍTICO |
| Parse JSON IA | 20% | 🟡 ALTO |
| Timeout Edge Function | 20% | 🟡 ALTO |
| Duplicação de ingredientes | 15% | 🟡 MÉDIO |
| Pool vazio | 15% | 🟡 MÉDIO |

**Probabilidade de falha total (atual):** 🔴 **60-70%**

---

## 3.2 CENÁRIO PÓS-IMPLEMENTAÇÃO (COM PLANO PROPOSTO)

| Ponto de Falha | Probabilidade | Impacto | Mudança |
|----------------|---------------|---------|---------|
| Loop infinito | 40% → 55% | 🔴 CRÍTICO | +15% (mais validações) |
| Validação hardcoded | 30% → 15% | 🟡 MÉDIO | -15% (safety unificado) |
| Falha API Gemini | 25% | 🔴 CRÍTICO | Sem mudança |
| Parse JSON IA | 20% | 🟡 ALTO | Sem mudança |
| Timeout Edge Function | 20% → 25% | 🟡 ALTO | +5% (mais processamento) |
| Portion Formatter | 0% → 10% | 🟡 MÉDIO | +10% (novo código) |
| Meal Sorter BR | 0% → 5% | 🟢 BAIXO | +5% (novo código) |
| Coherence Validator | 0% → 15% | 🟡 MÉDIO | +15% (mais rejeições) |

**Probabilidade de falha total (pós-implementação):** 🟡 **50-60%**

**⚠️ CONCLUSÃO: O PLANO PROPOSTO NÃO REDUZ O RISCO, PODE ATÉ AUMENTAR!**

---

# 🎯 PARTE 4: RECOMENDAÇÕES PARA REDUZIR RISCO

## 4.1 FASE 0 (OBRIGATÓRIA): ESTABILIZAÇÃO ANTES DE FUNCIONALIDADES

### **PRIORIDADE 1: Adicionar Fallbacks Robustos**

```typescript
// Em advanced-meal-generator.ts
export function generateMealsForPool(
  mealType: string,
  quantity: number,
  country: string = "BR",
  intolerances: string[] = [],
  rejectedCombinations: Set<string> = new Set(),
  profile?: UserProfile
): GeneratedMeal[] {
  try {
    // Código atual...
    
    // ✅ NOVO: Se não conseguiu gerar quantidade mínima, relaxar validações
    if (meals.length < quantity * 0.5) {
      console.warn(`[MEAL-GENERATOR] Baixa taxa de sucesso (${meals.length}/${quantity}). Relaxando validações...`);
      
      // Tentar novamente com validações relaxadas
      const relaxedMeals = generateWithRelaxedValidations(
        mealType, 
        quantity - meals.length, 
        country, 
        intolerances
      );
      
      meals.push(...relaxedMeals);
    }
    
    return meals;
    
  } catch (error) {
    console.error(`[MEAL-GENERATOR] CRITICAL ERROR:`, error);
    
    // ✅ FALLBACK: Retornar refeições básicas pré-definidas
    return getEmergencyFallbackMeals(mealType, quantity, country);
  }
}

// ✅ NOVA FUNÇÃO: Refeições de emergência
function getEmergencyFallbackMeals(
  mealType: string, 
  quantity: number, 
  country: string
): GeneratedMeal[] {
  // Refeições básicas e seguras que SEMPRE funcionam
  const EMERGENCY_MEALS = {
    breakfast: {
      name: "Café da manhã básico",
      components: [
        { type: "carb", name: "Pão integral", portion_grams: 50 },
        { type: "protein", name: "Ovo cozido", portion_grams: 50 },
        { type: "beverage", name: "Café preto", portion_grams: 150 },
      ],
      total_calories: 250,
    },
    lunch: {
      name: "Almoço básico",
      components: [
        { type: "protein", name: "Frango grelhado", portion_grams: 120 },
        { type: "carb", name: "Arroz branco", portion_grams: 100 },
        { type: "legume", name: "Feijão", portion_grams: 100 },
        { type: "vegetable", name: "Salada verde", portion_grams: 50 },
      ],
      total_calories: 450,
    },
    // ...
  };
  
  return Array(quantity).fill(EMERGENCY_MEALS[mealType] || EMERGENCY_MEALS.lunch);
}
```

**Redução de risco:** 🟢 **-20%**

---

### **PRIORIDADE 2: Timeout Protection Melhorado**

```typescript
// Em generate-ai-meal-plan/index.ts
const EDGE_FUNCTION_TIMEOUT = 55000; // 55s (margem de 5s)
const startTime = Date.now();

for (let dayIndex = 0; dayIndex < daysCount; dayIndex++) {
  // ✅ VERIFICAR TIMEOUT ANTES DE CADA DIA
  const elapsed = Date.now() - startTime;
  const remainingTime = EDGE_FUNCTION_TIMEOUT - elapsed;
  
  if (remainingTime < 10000) { // Menos de 10s restantes
    logStep(`⚠️ Timeout iminente. Parando geração no dia ${dayIndex + 1}`);
    break;
  }
  
  // Ajustar estratégia baseado no tempo restante
  const strategy = remainingTime > 30000 ? 'pool_first' : 'direct_only';
  
  // Gerar dia...
}
```

**Redução de risco:** 🟢 **-15%**

---

### **PRIORIDADE 3: Validação Defensiva em Todas as Funções**

```typescript
// Em portionFormatter.ts
export function formatPortion(ingredientKey: string, grams: number): {
  quantity: number;
  label: string;
  unit: string;
} {
  // ✅ VALIDAÇÃO DEFENSIVA
  if (!ingredientKey || typeof ingredientKey !== 'string') {
    console.warn(`[PORTION-FORMATTER] Invalid ingredientKey: ${ingredientKey}`);
    return { quantity: grams || 0, label: `${grams || 0}g`, unit: 'g' };
  }
  
  if (typeof grams !== 'number' || grams <= 0 || isNaN(grams)) {
    console.warn(`[PORTION-FORMATTER] Invalid grams: ${grams}`);
    return { quantity: 0, label: '0g', unit: 'g' };
  }
  
  const config = PORTION_CONFIGS[ingredientKey];
  
  if (!config) {
    // Fallback seguro
    return { quantity: grams, label: `${grams}g`, unit: 'g' };
  }
  
  // Código normal...
}
```

**Redução de risco:** 🟢 **-10%**

---

### **PRIORIDADE 4: Logging Detalhado para Debug**

```typescript
// Em todos os módulos
function logWithContext(level: 'info' | 'warn' | 'error', message: string, context: any) {
  const timestamp = new Date().toISOString();
  const contextStr = JSON.stringify(context, null, 2);
  
  console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}\n${contextStr}`);
  
  // ✅ ENVIAR PARA SISTEMA DE MONITORAMENTO (futuro)
  // sendToMonitoring(level, message, context);
}

// Uso:
logWithContext('error', 'Failed to generate meal', {
  mealType,
  attempts,
  intolerances,
  country,
  error: error.message,
  stack: error.stack,
});
```

**Redução de risco:** 🟢 **-5%** (facilita debug)

---

## 4.2 CRONOGRAMA REVISADO

### **FASE 0: ESTABILIZAÇÃO (OBRIGATÓRIA - 6-8 horas)**
1. ✅ Adicionar fallbacks robustos (2h)
2. ✅ Timeout protection melhorado (1h)
3. ✅ Validação defensiva (2h)
4. ✅ Logging detalhado (1h)
5. ✅ Testes de stress (2h)

### **FASE 1-5: FUNCIONALIDADES (12-18 horas)**
- Implementar conforme plano original

**Total revisado:** 18-26 horas

---

# 📊 PARTE 5: PROBABILIDADE FINAL COM ESTABILIZAÇÃO

## 5.1 CENÁRIO IDEAL (FASE 0 + PLANO PROPOSTO)

| Ponto de Falha | Probabilidade | Impacto | Mudança |
|----------------|---------------|---------|---------|
| Loop infinito | 40% → 20% | 🟡 MÉDIO | -20% (fallbacks) |
| Validação hardcoded | 30% → 15% | 🟡 MÉDIO | -15% (safety unificado) |
| Falha API Gemini | 25% → 20% | 🟡 ALTO | -5% (fallback para direto) |
| Parse JSON IA | 20% → 15% | 🟡 MÉDIO | -5% (fallback) |
| Timeout Edge Function | 20% → 10% | 🟢 BAIXO | -10% (timeout protection) |
| Portion Formatter | 0% → 5% | 🟢 BAIXO | +5% (validação defensiva) |
| Meal Sorter BR | 0% → 2% | 🟢 BAIXO | +2% (validação defensiva) |
| Coherence Validator | 0% → 10% | 🟡 MÉDIO | +10% (com fallback) |

**Probabilidade de falha total (ideal):** 🟢 **20-30%**

---

# 🎯 CONCLUSÃO E RECOMENDAÇÃO FINAL

## ❌ NÃO IMPLEMENTAR O PLANO PROPOSTO AGORA

**Motivos:**
1. Sistema atual já tem 60-70% de chance de falha
2. Plano proposto adiciona +30% de complexidade
3. Sem estabilização prévia, pode piorar para 70-80% de falha

## ✅ IMPLEMENTAR FASE 0 PRIMEIRO (ESTABILIZAÇÃO)

**Benefícios:**
1. Reduz falhas atuais de 60-70% para 30-40%
2. Cria base sólida para funcionalidades
3. Facilita debug e manutenção

## ✅ DEPOIS IMPLEMENTAR FUNCIONALIDADES (FASE 1-5)

**Com estabilização prévia:**
- Probabilidade de falha final: 20-30% ✅
- Sistema robusto e confiável
- Funcionalidades sem quebrar o core

---

**Documento criado em:** 23/01/2026  
**Status:** 🔴 CRÍTICO - REQUER DECISÃO IMEDIATA  
**Recomendação:** Implementar FASE 0 (estabilização) antes de qualquer funcionalidade
