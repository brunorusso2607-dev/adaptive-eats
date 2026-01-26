# 📋 FASE 4 - PLANO DE INTEGRAÇÃO GRADUAL

**Data:** 23/01/2026  
**Branch:** `feature/unified-meal-core`  
**Status:** 🔄 EM PLANEJAMENTO

---

## 🎯 OBJETIVO

Integrar o Unified Meal Core nos 3 geradores existentes de forma **gradual e segura**, começando pelo de menor risco.

---

## 📊 ANÁLISE DO GERADOR DIRETO

### **Arquivo:** `advanced-meal-generator.ts`

**Função Principal:** `generateMeals()`

**Estrutura Atual:**
1. Seleciona template do `SMART_TEMPLATES`
2. Gera componentes baseados no template
3. Calcula macros manualmente (linhas 665-669)
4. Valida com `validateAndFixMeal()`
5. Ordena com `sortComponents()`
6. Retorna `GeneratedMeal`

**Interface Atual:**
```typescript
interface GeneratedMeal {
  name: string;
  components: Component[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  // ...
}
```

---

## 🔄 ESTRATÉGIA DE INTEGRAÇÃO

### **Opção A: Wrapper (Recomendado - Menor Risco)**

**Abordagem:**
1. Manter `generateMeals()` funcionando como está
2. Criar função wrapper `generateMealsWithCore()`
3. Wrapper chama `generateMeals()` original
4. Converte output para `DirectGeneratedMeal`
5. Passa pelo `direct-adapter`
6. Retorna `UnifiedMeal`

**Vantagens:**
- ✅ Zero risco de quebrar código existente
- ✅ Pode testar lado a lado
- ✅ Rollback instantâneo se necessário
- ✅ Mantém compatibilidade com código atual

**Desvantagens:**
- ⚠️ Duplicação temporária de código
- ⚠️ Dois caminhos de execução

---

### **Opção B: Substituição Direta (Maior Risco)**

**Abordagem:**
1. Modificar `generateMeals()` diretamente
2. Substituir validação/ordenação/cálculo pelo Core
3. Retornar `UnifiedMeal` diretamente

**Vantagens:**
- ✅ Código mais limpo
- ✅ Sem duplicação

**Desvantagens:**
- ❌ Alto risco de quebrar código existente
- ❌ Difícil rollback
- ❌ Pode afetar outros módulos que dependem

---

## ✅ DECISÃO: OPÇÃO A (WRAPPER)

**Implementação:**

```typescript
// NOVO: Wrapper que usa Unified Core
export async function generateMealsWithCore(
  quantity: number,
  mealType: string,
  targetCalories: number,
  country: string,
  userIntolerances: string[],
  userContext: UserContext
): Promise<UnifiedMeal[]> {
  // 1. Gerar refeições com método original
  const originalMeals = await generateMeals(
    quantity,
    mealType,
    targetCalories,
    country,
    userIntolerances
  );
  
  // 2. Converter cada refeição para UnifiedMeal via adapter
  const unifiedMeals: UnifiedMeal[] = [];
  
  for (const meal of originalMeals) {
    const directMeal: DirectGeneratedMeal = {
      name: meal.name,
      components: meal.components.map(c => ({
        type: c.type,
        name: c.name,
        name_en: c.name_en,
        portion_grams: c.portion_grams,
      })),
      total_calories: meal.total_calories,
    };
    
    const result = await processDirectMeal(
      directMeal,
      mealType as MealType,
      userContext,
      'smart_template'
    );
    
    if (result.success && result.meal) {
      unifiedMeals.push(result.meal);
    }
  }
  
  return unifiedMeals;
}

// MANTER: Função original intacta
export async function generateMeals(...) {
  // Código original não modificado
}
```

---

## 📝 PLANO DE IMPLEMENTAÇÃO

### **Passo 1: Criar Wrapper** ✅
- Criar `generateMealsWithCore()` no final do arquivo
- Não modificar código existente
- Testar isoladamente

### **Passo 2: Adicionar Testes**
- Comparar output de `generateMeals()` vs `generateMealsWithCore()`
- Validar que macros são consistentes
- Validar que ordenação é correta
- Validar que porções têm gramas

### **Passo 3: Integrar em Produção (Gradual)**
- Adicionar flag de feature: `USE_UNIFIED_CORE`
- Se flag ativa → usa `generateMealsWithCore()`
- Se flag inativa → usa `generateMeals()` original
- Monitorar métricas por 24h

### **Passo 4: Rollout Completo**
- Se tudo OK → remover flag
- Deprecar `generateMeals()` original
- Renomear `generateMealsWithCore()` → `generateMeals()`

---

## 🔍 PONTOS DE ATENÇÃO

### **1. Compatibilidade de Interface**
- `GeneratedMeal` vs `UnifiedMeal` são diferentes
- Código que consome precisa ser atualizado
- **Solução:** Manter ambas as interfaces por enquanto

### **2. Performance**
- Wrapper adiciona overhead
- Duas passagens de processamento
- **Solução:** Medir e otimizar se necessário

### **3. Ordenação**
- `sortComponents()` atual vs `sortComponentsBR()` do Core
- Podem ter ordens diferentes
- **Solução:** Validar que ordem BR está correta

### **4. Validação**
- `validateAndFixMeal()` atual vs `validateCoherence()` do Core
- Regras podem ser diferentes
- **Solução:** Garantir que Core tem todas as regras

---

## 📊 CRITÉRIOS DE SUCESSO

| Métrica | Alvo | Como Medir |
|---------|------|------------|
| **Macros Idênticos** | 100% | Comparar totals |
| **Ordenação Correta** | 100% | Validar sequência BR |
| **Gramas Incluídas** | 100% | Verificar labels |
| **Performance** | < 2x overhead | Medir tempo |
| **Taxa de Erro** | 0% | Logs de fallback |

---

## 🚀 PRÓXIMA AÇÃO

**Implementar Wrapper:**
1. Adicionar imports necessários
2. Criar função `generateMealsWithCore()`
3. Testar com 1 refeição
4. Validar output
5. Commit

---

**Status:** Aguardando aprovação para implementar
