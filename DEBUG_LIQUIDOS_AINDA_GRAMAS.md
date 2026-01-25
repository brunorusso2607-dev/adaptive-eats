# 🚨 DEBUG: LÍQUIDOS AINDA EM GRAMAS

**Data:** 23/01/2026 23:04  
**Status:** 🔴 **INVESTIGAÇÃO URGENTE**

---

## 📸 EVIDÊNCIA DO PROBLEMA

**Imagem 1:**
- "Leite desnatado (200g)" ❌
- Deveria ser: "Leite desnatado (200ml)" ✅

**Imagem 2:**
- Plano gerado com tag "DIRETO" (fromDirect: true)
- Refeições: Ovos, Granola, Frango, Macarrão, Salmão, Aveia

---

## 🔍 ANÁLISE DO FLUXO

### **Geração DIRETA está sendo usada:**

```typescript
@generate-ai-meal-plan/index.ts:1885-1891
foods: meal.components.map(c => ({
  name: c.portion_display.label,  // ✅ USA LABEL HUMANIZADO
  grams: c.portion_grams,
  calories: c.macros.kcal,
  // ...
}))
```

**Linha 1886 usa `c.portion_display.label`** ✅

---

## 🤔 HIPÓTESES

### **Hipótese 1: ingredient_key não está chegando ao formatPortion()**

Mesmo após correções, o `ingredient_key` pode estar:
- Sendo perdido em algum ponto do fluxo
- Não sendo resolvido corretamente pelo `resolveKeyFromName()`
- Não existindo no `PORTION_CONFIGS`

### **Hipótese 2: PORTION_CONFIGS não tem "leite_desnatado"**

Verificar se existe config para:
- `skim_milk`
- `leite_desnatado`
- `milk`

### **Hipótese 3: formatPortion() está usando fallback**

Se não encontrar config, usa:
```typescript
function formatDefaultPortion(grams: number, ingredientKey: string): PortionDisplay {
  const isLiquid = /juice|suco|water|agua|milk|leite|coffee|cafe|tea|cha/i.test(ingredientKey);
  
  return {
    quantity: grams,
    unit: isLiquid ? 'ml' : 'g',
    label: `${grams}${isLiquid ? 'ml' : 'g'}`,  // ❌ SEM NOME DO INGREDIENTE!
  };
}
```

**Problema:** Fallback retorna apenas "200ml", sem o nome do ingrediente!

---

## 🎯 AÇÃO NECESSÁRIA

1. **Adicionar logs detalhados** para rastrear:
   - `ingredient_key` em cada etapa
   - Se `PORTION_CONFIGS[ingredientKey]` existe
   - Qual label está sendo retornado

2. **Verificar PORTION_CONFIGS** para leite:
   - Buscar por "milk", "leite", "skim"

3. **Testar formatDefaultPortion()**:
   - Se está sendo chamado
   - Por que não está incluindo o nome do ingrediente

---

## 📊 FLUXO ESPERADO vs REAL

### **ESPERADO:**
```
generateMealsForPool()
  ├─ ingredient_key: "skim_milk" ✅
  ↓
generateMealsWithCore()
  ├─ ingredient_key: "skim_milk" ✅
  ↓
processDirectMeal()
  ├─ ingredient_key: "skim_milk" ✅
  ↓
formatPortion("skim_milk", 200)
  ├─ PORTION_CONFIGS["skim_milk"] ✅
  ├─ display_unit: "ml" ✅
  ↓
"1 copo de leite desnatado (200ml)" ✅
```

### **REAL:**
```
generateMealsForPool()
  ├─ ingredient_key: ??? 
  ↓
formatPortion(???, 200)
  ├─ PORTION_CONFIGS[???] = undefined ❌
  ├─ formatDefaultPortion() ❌
  ↓
"Leite desnatado (200g)" ❌
```

---

## 🔧 PRÓXIMOS PASSOS

1. Adicionar logs em `formatPortion()` para ver `ingredientKey`
2. Verificar se `PORTION_CONFIGS` tem config para leite
3. Se não tem, adicionar config
4. Se tem, verificar por que não está sendo encontrado
5. Corrigir `formatDefaultPortion()` para incluir nome do ingrediente

---

**Status:** 🔴 **AGUARDANDO DEBUG**
