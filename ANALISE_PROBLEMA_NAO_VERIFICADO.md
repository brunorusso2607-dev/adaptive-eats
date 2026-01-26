# 🚨 ANÁLISE: REFEIÇÕES "NÃO VERIFICADO"

**Data:** 23/01/2026 23:18  
**Status:** 🔴 **PROBLEMA CRÍTICO**

---

## 📸 EVIDÊNCIA

**Todas as refeições com tag "Não verificado":**
- Ovos
- 1/1 unidade média de frutas vermelhas
- Frango com Arroz
- Frango
- Peixe branco grelhado com purê de batata doce e brócolis refogado
- Mamão papaia com chia e chá de camomila

**Nenhuma refeição com tag "DIRETO"**

---

## 🔍 ANÁLISE DO FLUXO

### **Cascata de 3 níveis:**

```
NÍVEL 1: POOL (banco de dados)
  ├─ Pool vazio ❌
  └─ Fallback para NÍVEL 2 ↓

NÍVEL 2: DIRECT (generateMealsWithCore)
  ├─ generateMealDirect() chamado
  ├─ generateMealsWithCore() executado
  ├─ ❌ FALHOU (sem logs no console)
  └─ Fallback para NÍVEL 3 ↓

NÍVEL 3: AI (Gemini)
  ├─ IA gerou refeições
  └─ ✅ Refeições criadas (mas sem processar pelo Unified Core)
```

---

## 🚨 PROBLEMA IDENTIFICADO

**Direct generation está falhando silenciosamente!**

### **Logs esperados (mas não aparecem):**
```
[MEAL-GENERATOR-CORE] Gerando X refeições via Unified Core...
[FORMAT-PORTION] ingredientKey: "...", grams: ...
```

### **Possíveis causas:**

1. **Erro no generateMealsWithCore()**
   - Exceção sendo capturada
   - Retornando null/undefined
   - Não gerando refeições

2. **Erro no generateMealsForPool()**
   - Função base não está gerando
   - Templates não encontrados
   - Ingredientes não disponíveis

3. **Erro na conversão UnifiedMeal → SimpleMeal**
   - Campos faltando
   - Estrutura incorreta

---

## 🔍 ONDE VERIFICAR

### **1. Logs de erro do Direct:**

```typescript
@generate-ai-meal-plan/index.ts:1912-1920
catch (error) {
  logStep(`❌ Direct generation ERROR for ${mealType}`, {
    error: error instanceof Error ? error.message : String(error),
    // ...
  });
  console.error(`[DIRECT-GEN-ERROR] Full error:`, error);
  return null;
}
```

**Se Direct falhar, deve aparecer `[DIRECT-GEN-ERROR]` no console!**

### **2. Verificar se generateMealsForPool retorna algo:**

```typescript
@generate-ai-meal-plan/index.ts:1829-1836
const generated = await generateMealsWithCore(
  1,  // quantity: 1
  mealType,
  targetCalories,
  userCountry,
  userIntolerances || [],
  userContext
);

if (!generated || generated.length === 0) {
  logStep(`❌ Direct generation failed - no meals generated`);
  return null;
}
```

---

## 💡 HIPÓTESES

### **Hipótese 1: generateMealsForPool() não está gerando**

**Causa:** Templates não encontrados para o tipo de refeição

**Solução:** Verificar se SMART_TEMPLATES tem templates para todos os meal types

### **Hipótese 2: Erro no processamento do Unified Core**

**Causa:** processDirectMeal() está falhando

**Solução:** Adicionar try/catch e logs mais detalhados

### **Hipótese 3: ingredient_key não está sendo passado**

**Causa:** Correção anterior não funcionou

**Solução:** Verificar se ingredient_key está chegando ao formatPortion()

---

## 🎯 AÇÃO NECESSÁRIA

1. **Verificar logs do servidor Supabase:**
   - Procurar por `[DIRECT-GEN-ERROR]`
   - Procurar por `❌ Direct generation failed`

2. **Adicionar mais logs em generateMealDirect():**
   - Antes de chamar generateMealsWithCore
   - Depois de receber resultado
   - Durante conversão para SimpleMeal

3. **Testar generateMealsWithCore() isoladamente:**
   - Chamar função diretamente
   - Verificar se retorna UnifiedMeal[]
   - Verificar se formatPortion() está funcionando

---

## 📊 RESULTADO ESPERADO vs REAL

### **ESPERADO:**
```
POOL vazio → DIRECT gera → Tag "DIRETO" ✅
```

### **REAL:**
```
POOL vazio → DIRECT falha → AI gera → Tag "Não verificado" ❌
```

---

## 🔧 PRÓXIMOS PASSOS

1. Verificar logs do Supabase para erros de Direct
2. Adicionar logs detalhados em generateMealDirect()
3. Testar generateMealsWithCore() isoladamente
4. Corrigir erro identificado
5. Garantir que Direct funcione como fallback

---

**Status:** 🔴 **AGUARDANDO LOGS DO SERVIDOR**
