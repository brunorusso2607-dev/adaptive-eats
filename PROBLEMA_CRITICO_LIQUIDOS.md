# 🚨 PROBLEMA CRÍTICO: LÍQUIDOS AINDA EM GRAMAS

**Data:** 23/01/2026 22:25  
**Status:** 🔴 **CRÍTICO - UNIFIED CORE NÃO É FONTE ÚNICA DE VERDADE**

---

## 🔍 DESCOBERTA CRÍTICA

### **populate-meal-pool NÃO USA UNIFIED CORE!**

```typescript
// populate-meal-pool/index.ts linha 150
generatedMeals = generateMealsForPool(meal_type, quantity, country_code, intolerances, rejectedCombinations, profile);
```

❌ **Está usando:** `generateMealsForPool()` (GERADOR ANTIGO)  
✅ **Deveria usar:** `generateMealsWithCore()` (UNIFIED CORE)

---

## 📊 SITUAÇÃO ATUAL

### **Geradores que USAM Unified Core:**
1. ✅ **AI Generator** (`generate-ai-meal-plan`) - Linha 1829
   ```typescript
   const generated = await generateMealsWithCore(1, mealType, targetCalories, ...);
   ```

### **Geradores que NÃO USAM Unified Core:**
1. ❌ **Pool Generator** (`populate-meal-pool`) - Linha 150
   ```typescript
   generatedMeals = generateMealsForPool(meal_type, quantity, ...);
   ```

---

## 🎯 CAUSA RAIZ DO PROBLEMA

### **Por que líquidos ainda aparecem em gramas:**

1. **Pool Generator** gera refeições com `generateMealsForPool()`
2. `generateMealsForPool()` cria componentes com `portion_label`:
   ```typescript
   portion_label: isBeverage ? `${portion}ml` : `${portion}g`
   ```
3. **MAS:** Não usa `portion-formatter.ts` do Unified Core
4. **MAS:** Não usa `portion_display.label` humanizado
5. **Resultado:** "Café com leite (200g)" em vez de "1 xícara de café com leite (200ml)"

---

## 🔧 FLUXO ATUAL (INCORRETO)

```
populate-meal-pool
  ↓
generateMealsForPool() ← GERADOR ANTIGO
  ↓
Cria componentes com portion_label simples
  ↓
portion_label: "200ml" ou "200g"
  ↓
❌ NÃO passa pelo Unified Core
❌ NÃO usa portion-formatter.ts
❌ NÃO usa portion_display.label
  ↓
Frontend mostra: "Café com leite (200g)" ❌
```

---

## ✅ FLUXO CORRETO (DEVERIA SER)

```
populate-meal-pool
  ↓
generateMealsWithCore() ← UNIFIED CORE
  ↓
processRawMeal()
  ↓
formatPortion() ← portion-formatter.ts
  ↓
portion_display.label: "1 xícara de café com leite (200ml)"
  ↓
Frontend mostra: "1 xícara de café com leite (200ml)" ✅
```

---

## 📋 EVIDÊNCIAS

### **Imagem 1:**
```
❌ "Café com leite (200g)" - Deveria ser "1 xícara de café com leite (200ml)"
❌ "Cuscuz de milho (100g)" - OK (sólido)
✅ "Queijo minas (30g)" - OK (sólido)
```

### **Imagem 2:**
```
❌ "Suco de laranja natural (200g)" - Deveria ser "1 copo de suco de laranja natural (200ml)"
✅ "Queijo mussarela (30g)" - OK (sólido)
✅ "Tapioca (50g)" - OK (sólido)
```

---

## 🎯 SOLUÇÃO NECESSÁRIA

### **Opção 1: Integrar Pool Generator com Unified Core (RECOMENDADO)**

```typescript
// populate-meal-pool/index.ts

// ANTES:
import { generateMealsForPool } from "../_shared/advanced-meal-generator.ts";
generatedMeals = generateMealsForPool(meal_type, quantity, country_code, ...);

// DEPOIS:
import { generateMealsWithCore } from "../_shared/advanced-meal-generator.ts";
import { processPoolMeal } from "../_shared/unified-meal-core/meal-core-adapters/pool-adapter.ts";

// Gerar refeições via Unified Core
const userContext = { ... };
const unifiedMeals = await generateMealsWithCore(quantity, meal_type, targetCalories, userContext);

// Converter UnifiedMeal → GeneratedMeal (formato do pool)
generatedMeals = unifiedMeals.map(um => convertUnifiedToPool(um));
```

### **Opção 2: Processar saída do Pool Generator pelo Core**

```typescript
// ANTES:
generatedMeals = generateMealsForPool(meal_type, quantity, ...);

// DEPOIS:
const rawMeals = generateMealsForPool(meal_type, quantity, ...);

// Processar cada refeição pelo Unified Core
const userContext = { ... };
generatedMeals = [];
for (const raw of rawMeals) {
  const unified = await processPoolMeal(raw, userContext);
  generatedMeals.push(convertUnifiedToPool(unified));
}
```

---

## 🚨 IMPACTO

### **Funcionalidades afetadas:**
1. ❌ **Pool de refeições** - Líquidos em gramas
2. ❌ **Quantidade não humanizada** - "200ml" em vez de "1 copo (200ml)"
3. ❌ **Nomes genéricos** - Pode ter nomes não descritivos
4. ❌ **Validações do Core** - Não aplicadas (coerência, segurança)

### **Funcionalidades OK:**
1. ✅ **AI Generator** - Usa Unified Core corretamente
2. ✅ **Direct Generator** - Usa Unified Core via `generateMealsWithCore()`

---

## 📝 CHECKLIST DE VERIFICAÇÃO

### **Geradores que DEVEM usar Unified Core:**
- [x] ✅ AI Generator (`generate-ai-meal-plan`)
- [x] ✅ Direct Generator (via `generateMealsWithCore`)
- [ ] ❌ Pool Generator (`populate-meal-pool`) ← **PROBLEMA AQUI**

### **Adaptadores do Unified Core:**
- [x] ✅ `ai-adapter.ts` - Existe
- [x] ✅ `direct-adapter.ts` - Existe
- [ ] ⚠️ `pool-adapter.ts` - Existe mas NÃO está sendo usado

---

## 🎯 PRÓXIMOS PASSOS

1. **Criar adapter completo** para Pool Generator
2. **Integrar** `populate-meal-pool` com `generateMealsWithCore()`
3. **Converter** UnifiedMeal → GeneratedMeal (formato pool)
4. **Testar** que líquidos aparecem em ml
5. **Validar** que todas as validações do Core são aplicadas

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

### **ANTES (atual):**
```typescript
// Pool Generator
generateMealsForPool() → GeneratedMeal[]
  ↓
portion_label: "200ml" (simples)
  ↓
Frontend: "Café com leite (200g)" ❌
```

### **DEPOIS (correto):**
```typescript
// Pool Generator
generateMealsWithCore() → UnifiedMeal[]
  ↓
portion_display.label: "1 xícara de café com leite (200ml)"
  ↓
Frontend: "1 xícara de café com leite (200ml)" ✅
```

---

## ⚠️ CONCLUSÃO

**Unified Core NÃO é fonte única de verdade!**

- ✅ AI Generator usa Core
- ✅ Direct Generator usa Core
- ❌ **Pool Generator NÃO usa Core** ← PROBLEMA CRÍTICO

**Solução:** Integrar Pool Generator com Unified Core usando `generateMealsWithCore()`

---

**Status:** 🔴 **AGUARDANDO CORREÇÃO**
