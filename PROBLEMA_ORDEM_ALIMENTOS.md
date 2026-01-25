# 🔍 ANÁLISE: PROBLEMA DE ORDEM DOS ALIMENTOS

**Data:** 23/01/2026  
**Status:** ✅ IDENTIFICADO - AGUARDANDO TESTE

---

## 📊 PROBLEMA REPORTADO

**Imagem 1 (Café da Manhã):**
```
Ordem atual:
1. Suco de laranja natural (200g)
2. Queijo minas (30g)
3. Tapioca (50g)

Ordem esperada (SORT_ORDER_BREAKFAST):
1. Proteína (Queijo) → prioridade 1
2. Carboidrato (Tapioca) → prioridade 2
3. Bebida (Suco) → prioridade 7 (ÚLTIMO)
```

**Imagem 2 (Almoço):**
```
Ordem atual:
1. Arroz branco (80g)
2. Ovo mexido (80g)
3. Espinafre refogado (64g)
4. Berinjela refogada (64g)
5. Feijão (80g)

Ordem esperada (SORT_ORDER_LUNCH_DINNER):
1. Proteína (Ovo) → prioridade 1
2. Arroz → prioridade 2
3. Feijão → prioridade 3
4. Vegetais (Espinafre, Berinjela) → prioridade 4
```

---

## 🔍 INVESTIGAÇÃO

### **1. Unified Core ESTÁ ordenando corretamente**

`unified-meal-core/index.ts` linha 138:
```typescript
const sortedComponents = sortComponentsBR(unifiedComponents, mealType);
```

✅ `sortComponentsBR()` é chamado  
✅ Retorna componentes ordenados

---

### **2. Problema: ORDEM É PERDIDA na conversão**

`generate-ai-meal-plan/index.ts` linha 1885:
```typescript
foods: meal.components.map(c => ({
  name: c.portion_display.label,
  grams: c.portion_grams,
  // ...
}))
```

**O que acontece:**
1. ✅ Unified Core ordena: `[Ovo, Arroz, Feijão, Espinafre]`
2. ✅ `meal.components` está ordenado
3. ❌ Frontend mostra ordem diferente

**Possíveis causas:**
- Frontend reordena após receber?
- Banco de dados salva em ordem diferente?
- Outro processamento entre Core e Frontend?

---

## 🎯 SOLUÇÃO PROPOSTA

### **Opção A: Adicionar campo `display_order`**

```typescript
// Em generate-ai-meal-plan/index.ts
foods: meal.components.map((c, index) => ({
  name: c.portion_display.label,
  grams: c.portion_grams,
  display_order: index + 1,  // ✅ NOVO CAMPO
  calories: c.macros.kcal,
  protein: c.macros.protein,
  carbs: c.macros.carbs,
  fat: c.macros.fat
}))
```

**Frontend ordena por `display_order`:**
```typescript
foods.sort((a, b) => a.display_order - b.display_order)
```

---

### **Opção B: Investigar onde ordem é perdida**

1. Verificar se `meal_plan_items` tem campo de ordem
2. Verificar se frontend reordena
3. Adicionar logs para rastrear

---

## ✅ CORREÇÃO JÁ IMPLEMENTADA

**Commit:** `7a7cb94` - "fix: Use humanized portion labels in meal display"

**O que foi corrigido:**
- ✅ Quantidade humanizada: "2 ovos mexidos (80g)"
- ⚠️ Ordem: AINDA PRECISA SER TESTADA

---

## 🧪 TESTE NECESSÁRIO

1. Gerar novo plano de refeições
2. Verificar se ordem está correta:
   - Café: Proteína → Carb → Bebida
   - Almoço: Proteína → Arroz → Feijão → Vegetais
3. Se ordem ainda estiver errada, implementar Opção A

---

## 📝 NOTAS TÉCNICAS

**meal-sorter.ts está funcionando:**
```typescript
SORT_ORDER_LUNCH_DINNER = {
  'protein': 1,
  'rice': 2,
  'beans': 3,
  'vegetable': 4,
  'carb': 5,
  'fat': 6,
  'other': 7,
  'beverage': 8,
  'dessert': 9,
}
```

**categorizeByName() está funcionando:**
- Ovo → 'protein' ✅
- Arroz → 'rice' ✅
- Feijão → 'beans' ✅
- Suco → 'beverage' ✅

---

**Status:** ⏳ **AGUARDANDO TESTE EM PRODUÇÃO**
