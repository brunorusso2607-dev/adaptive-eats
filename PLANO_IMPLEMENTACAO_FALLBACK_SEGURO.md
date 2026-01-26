# 🛡️ PLANO DE IMPLEMENTAÇÃO - FALLBACK SEGURO (Pool → Direto → IA)

**Data:** 21 de Janeiro de 2026, 21:13 BRT
**Status:** PLANEJAMENTO - AGUARDANDO APROVAÇÃO

---

## 🔍 ANÁLISE DO CÓDIGO ATUAL

### **Arquivos Relevantes Identificados:**

1. **`generate-ai-meal-plan/index.ts`** (2467 linhas)
   - Função principal: `generateSingleDay()` (linha 1814)
   - Lógica atual de fallback (linhas 1832-1916)

2. **`advanced-meal-generator.ts`** (496 linhas)
   - Gerador de refeições com base em ingredientes
   - Usa `INGREDIENTS`, `SMART_TEMPLATES`, `CULTURAL_RULES`
   - Função: `generateMealsForPool()`

3. **`meal-ingredients-db.ts`**
   - Base de 100+ ingredientes

4. **`meal-templates-smart.ts`**
   - Templates culturais (arroz+feijão, macarrão, etc)

---

## 🔴 PROBLEMA ATUAL (Linhas 1832-1916)

### **Código Atual:**

```typescript
// TENTATIVA 1: Buscar do Pool
for (const meal of meals) {
  const poolOptions = getPoolMealsForType(...);
  
  if (poolOptions.length >= 1) {
    poolMealsForDay.push(...);  // ✅ USA POOL
  } else {
    mealsNeedingAI.push(meal);   // ❌ MARCA PARA IA
  }
}

// Se conseguiu TODAS do pool
if (poolMealsForDay.length === meals.length) {
  return { fromPool: true };  // ✅ 100% POOL
}

// PROBLEMA: Se faltou 1, descarta TUDO e gera com IA
if (mealsNeedingAI.length > 0) {
  const aiResponse = await fetch(gemini...);  // ❌ GERA TODAS COM IA
  return { fromPool: false };
}
```

### **Por que falha:**

1. **Descarta refeições do pool:** Se falta 1 refeição, descarta as 3 que tinha
2. **Não tenta gerar direto:** Pula direto para Gemini
3. **Tudo ou nada:** Ou usa 100% pool, ou 100% IA

---

## ✅ SOLUÇÃO PROPOSTA - FALLBACK EM 3 NÍVEIS

### **Arquitetura:**

```
NÍVEL 1: Pool (refeições curadas)
    ↓ (se faltar alguma)
NÍVEL 2: Geração Direta (advanced-meal-generator.ts)
    ↓ (só se falhar)
NÍVEL 3: Gemini (último recurso)
```

---

## 📋 IMPLEMENTAÇÃO DETALHADA

### **PASSO 1: Modificar `generateSingleDay()` (linha 1814)**

**Localização:** `generate-ai-meal-plan/index.ts`

**Mudança:**

```typescript
async function generateSingleDay(
  dayIndex: number, 
  previousMeals: string[]
): Promise<{ 
  dayIndex: number; 
  plan: SimpleDayPlan | null; 
  violations: any[]; 
  fromPool: boolean;
  fromDirect: boolean;  // ← NOVO
  fromAI: boolean;      // ← NOVO
}> {
  
  // NÍVEL 1: Tentar Pool
  const poolMeals: SimpleMeal[] = [];
  const mealsNeedingFallback: typeof meals = [];
  
  for (const meal of meals) {
    const poolOptions = getPoolMealsForType(...);
    
    if (poolOptions.length >= 1) {
      poolMeals.push(...);  // ✅ USA POOL
    } else {
      mealsNeedingFallback.push(meal);  // ⚠️ PRECISA FALLBACK
    }
  }
  
  // Se conseguiu TODAS do pool → SUCESSO
  if (mealsNeedingFallback.length === 0) {
    return { 
      fromPool: true, 
      fromDirect: false, 
      fromAI: false 
    };
  }
  
  // NÍVEL 2: Gerar Direto (NOVO)
  logStep(`🔧 Trying direct generation for ${mealsNeedingFallback.length} meals`);
  
  const directMeals: SimpleMeal[] = [];
  const mealsNeedingAI: typeof meals = [];
  
  for (const meal of mealsNeedingFallback) {
    try {
      // Chamar advanced-meal-generator.ts
      const generated = await generateMealDirect(
        meal.type,
        meal.targetCalories,
        restrictions,
        userCountry
      );
      
      if (generated && generated.isValid) {
        directMeals.push(generated);  // ✅ GEROU DIRETO
      } else {
        mealsNeedingAI.push(meal);    // ⚠️ PRECISA IA
      }
    } catch (error) {
      mealsNeedingAI.push(meal);      // ⚠️ ERRO, PRECISA IA
    }
  }
  
  // Combinar pool + direto
  const allMeals = [...poolMeals, ...directMeals];
  
  // Se conseguiu TODAS (pool + direto) → SUCESSO
  if (mealsNeedingAI.length === 0) {
    return { 
      fromPool: poolMeals.length > 0, 
      fromDirect: directMeals.length > 0, 
      fromAI: false 
    };
  }
  
  // NÍVEL 3: Gemini (último recurso)
  logStep(`🤖 Using AI for ${mealsNeedingAI.length} meals (last resort)`);
  
  // Gerar APENAS as que faltam com IA
  const aiMeals = await generateWithGemini(mealsNeedingAI);
  
  // Combinar pool + direto + IA
  const finalMeals = [...poolMeals, ...directMeals, ...aiMeals];
  
  return { 
    fromPool: poolMeals.length > 0, 
    fromDirect: directMeals.length > 0, 
    fromAI: aiMeals.length > 0 
  };
}
```

---

### **PASSO 2: Criar `generateMealDirect()` (NOVA FUNÇÃO)**

**Localização:** `generate-ai-meal-plan/index.ts` (adicionar antes de `generateSingleDay`)

```typescript
async function generateMealDirect(
  mealType: string,
  targetCalories: number,
  restrictions: UserRestrictions,
  countryCode: string
): Promise<SimpleMeal | null> {
  
  logStep(`🔧 Generating ${mealType} directly from ingredients`, {
    targetCalories,
    country: countryCode
  });
  
  try {
    // Importar gerador avançado
    const { generateMealsForPool } = await import("../_shared/advanced-meal-generator.ts");
    
    // Gerar 1 refeição
    const generated = await generateMealsForPool(
      mealType,
      1,  // quantity: 1
      countryCode,
      restrictions.intolerances || [],
      restrictions.excludedIngredients || []
    );
    
    if (!generated || generated.length === 0) {
      logStep(`❌ Direct generation failed for ${mealType}`);
      return null;
    }
    
    const meal = generated[0];
    
    // Validar calorias (±50% do target)
    const minCal = targetCalories * 0.5;
    const maxCal = targetCalories * 1.5;
    
    if (meal.total_calories < minCal || meal.total_calories > maxCal) {
      logStep(`⚠️ Direct meal calories out of range`, {
        target: targetCalories,
        actual: meal.total_calories,
        range: [minCal, maxCal]
      });
      // Aceitar mesmo fora do range (melhor que IA)
    }
    
    // Converter para formato SimpleMeal
    const simpleMeal: SimpleMeal = {
      meal_type: mealType,
      label: getMealLabel(mealType),
      target_calories: targetCalories,
      options: [{
        name: meal.name,
        foods: meal.components.map(c => ({
          name: c.name,
          grams: c.portion_grams,
          calories: 0,  // Será calculado depois
          protein: 0,
          carbs: 0,
          fat: 0
        })),
        calories_kcal: meal.total_calories,
        protein_g: meal.total_protein,
        carbs_g: meal.total_carbs,
        fat_g: meal.total_fat,
        fromPool: false,
        fromDirect: true,  // ← MARCAR ORIGEM
      }]
    };
    
    logStep(`✅ Direct generation SUCCESS for ${mealType}`, {
      name: meal.name,
      calories: meal.total_calories
    });
    
    return simpleMeal;
    
  } catch (error) {
    logStep(`❌ Direct generation ERROR for ${mealType}`, {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
```

---

### **PASSO 3: Modificar `generateWithGemini()` para gerar APENAS as que faltam**

**Localização:** `generate-ai-meal-plan/index.ts`

**Mudança:**

```typescript
async function generateWithGemini(
  mealsToGenerate: typeof meals  // ← APENAS as que faltam
): Promise<SimpleMeal[]> {
  
  // Construir prompt APENAS para as refeições que faltam
  const prompt = buildSimpleNutritionistPrompt({
    meals: mealsToGenerate,  // ← NÃO todas as 6
    ...
  });
  
  // Chamar Gemini
  const aiResponse = await fetch(...);
  
  // Retornar APENAS as geradas
  return parsedMeals;
}
```

---

## 🎯 VANTAGENS DESTA IMPLEMENTAÇÃO

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Pool disponível | Usa pool ✅ | Usa pool ✅ |
| Falta 1 refeição | Descarta tudo, gera 6 com IA ❌ | Usa 5 do pool/direto, gera 1 com IA ✅ |
| Falta 3 refeições | Gera 6 com IA ❌ | Usa 3 do pool, gera 3 direto ✅ |
| Pool vazio | Gera 6 com IA ❌ | Gera 6 direto, IA só se falhar ✅ |
| Custo IA | Alto (6 refeições) | Baixo (0-1 refeições) |
| Variedade | Limitada (pool fixo) | Alta (pool + geração) |

---

## ⚠️ RISCOS IDENTIFICADOS

### **RISCO 1: `advanced-meal-generator.ts` pode não funcionar**

**Mitigação:**
- Testar gerador isoladamente ANTES de integrar
- Adicionar try/catch robusto
- Fallback para IA se falhar

### **RISCO 2: Geração direta pode ser lenta**

**Mitigação:**
- Gerar em paralelo (Promise.all)
- Timeout de 5s por refeição
- Fallback para IA se demorar

### **RISCO 3: Refeições geradas podem ser inválidas**

**Mitigação:**
- Validar com `validateAndFixMeal()`
- Verificar intolerâncias
- Fallback para IA se inválida

### **RISCO 4: Quebrar funcionalidade existente**

**Mitigação:**
- Fazer em branch separada
- Testar extensivamente
- Manter código antigo comentado para rollback rápido

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **FASE 1: PREPARAÇÃO (1h)**

- [ ] Criar branch: `feature/fallback-3-niveis`
- [ ] Testar `advanced-meal-generator.ts` isoladamente
- [ ] Verificar se gera refeições válidas
- [ ] Verificar se respeita intolerâncias

### **FASE 2: IMPLEMENTAÇÃO (2-3h)**

- [ ] Adicionar função `generateMealDirect()`
- [ ] Modificar `generateSingleDay()` para 3 níveis
- [ ] Adicionar flags `fromDirect`, `fromAI`
- [ ] Modificar `generateWithGemini()` para gerar apenas faltantes
- [ ] Adicionar logs detalhados

### **FASE 3: TESTES (1-2h)**

- [ ] Teste 1: Pool completo (6 tipos) → Deve usar 100% pool
- [ ] Teste 2: Pool parcial (3 tipos) → Deve usar pool + direto
- [ ] Teste 3: Pool vazio → Deve usar 100% direto
- [ ] Teste 4: Geração direta falha → Deve usar IA
- [ ] Teste 5: Intolerâncias → Deve respeitar em todos os níveis

### **FASE 4: DEPLOY (30min)**

- [ ] Commit com mensagem clara
- [ ] Deploy da função
- [ ] Monitorar logs
- [ ] Verificar custos de IA (devem cair)

### **FASE 5: ROLLBACK (se necessário)**

- [ ] Reverter commit
- [ ] Deploy versão anterior
- [ ] Analisar logs de erro

---

## 🔧 COMANDOS DE TESTE

### **Teste Isolado do Gerador:**

```typescript
// Criar arquivo: test-direct-generator.ts
import { generateMealsForPool } from "./supabase/functions/_shared/advanced-meal-generator.ts";

const meals = await generateMealsForPool(
  "almoco",      // mealType
  5,             // quantity
  "BR",          // country
  ["lactose"],   // intolerances
  []             // excluded
);

console.log("Generated:", meals.length);
console.log("Sample:", meals[0]);
```

### **Teste Integrado:**

```bash
# Gerar plano de 7 dias
# Verificar logs:
# - "from POOL": X refeições
# - "from DIRECT": Y refeições
# - "from AI": Z refeições
```

---

## 📊 MÉTRICAS DE SUCESSO

| Métrica | Antes | Meta Depois |
|---------|-------|-------------|
| % Pool | 0% (quebrado) | 50-70% |
| % Direto | 0% | 20-40% |
| % IA | 100% | 0-10% |
| Custo IA/dia | 6 refeições | 0-1 refeições |
| Variedade | Baixa | Alta |

---

## 🚨 PONTOS DE ATENÇÃO

### **1. NÃO QUEBRAR O EXISTENTE**

- Manter código antigo comentado
- Branch separada
- Testes antes de merge

### **2. LOGS DETALHADOS**

- Cada nível de fallback deve logar
- Rastrear origem de cada refeição
- Facilitar debug

### **3. PERFORMANCE**

- Geração direta não pode ser muito lenta
- Timeout de 5s por refeição
- Paralelizar quando possível

### **4. VALIDAÇÃO**

- Todas as refeições devem ser validadas
- Intolerâncias respeitadas em TODOS os níveis
- Macros dentro do range aceitável

---

## 🎯 DECISÃO NECESSÁRIA

**ANTES DE IMPLEMENTAR, preciso confirmar:**

1. ✅ Você aprova este plano?
2. ✅ Quer que eu teste `advanced-meal-generator.ts` isoladamente primeiro?
3. ✅ Prefere implementar em branch separada?
4. ✅ Quer ver o código completo antes de fazer deploy?

---

## 📝 PRÓXIMOS PASSOS

**Se aprovado:**

1. Criar branch `feature/fallback-3-niveis`
2. Testar `advanced-meal-generator.ts` isoladamente
3. Implementar `generateMealDirect()`
4. Modificar `generateSingleDay()`
5. Testar extensivamente
6. Deploy com monitoramento

**Se não aprovado:**

- Ajustar plano conforme feedback
- Esclarecer dúvidas
- Propor alternativas

---

*Plano completo - AGUARDANDO APROVAÇÃO PARA IMPLEMENTAR*
