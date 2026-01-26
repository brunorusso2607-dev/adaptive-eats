# 🔍 ANÁLISE COMPLETA - 5 PROBLEMAS CRÍTICOS IDENTIFICADOS

**Data:** 23/01/2026 22:04  
**Status:** 📝 ANÁLISE COMPLETA - **NÃO IMPLEMENTAR AINDA**

---

## 📊 PROBLEMAS IDENTIFICADOS NAS IMAGENS

### **Imagem 1: Lanche da Manhã - "Queijo branco magro"**
```
✅ CORRETO:
- 1 porção de queijo branco magro (50g)
- 1 xícara de chá de camomila (200g) ← PROBLEMA 1
- 1 colher de sopa de geleia de frutas vermelhas sem açúcar (20g)
```

### **Imagem 2: Café da Manhã - "Ovos"** ← PROBLEMA 2
```
❌ PROBLEMAS:
- Título: "Ovos" (genérico)
- 681 kcal (MUITO PESADO para café da manhã)
- Ovos mexidos com queijo branco (150g)
- 1 xícara de café preto sem açúcar (150g) ← PROBLEMA 1
- Mamão papaia (150g)
```

### **Imagem 3: Lanche da Manhã - "Mix de castanhas e damascos secos"**
```
❌ PROBLEMAS:
- 303 kcal (OK para lanche)
- Ovo cozido (50g)
- Mix de castanhas (30g)
- Damascos secos (30g)
```

### **Imagem 4: Almoço - "proteina animal"** ← PROBLEMA 4
```
❌ PROBLEMAS CRÍTICOS:
- Purê de batata (100g)
- Salada de folhas verdes (80g)
- 1 copo de água (opcional) (200g) ← PROBLEMA 1
- Carne moída refogada com legumes (150g)
- Arroz branco cozido (100g)
- proteina animal (80g) ← AINDA APARECENDO!
- Feijão carioca (80g)
```

---

## 🎯 PROBLEMA 1: LÍQUIDOS EM GRAMAS (200g) EM VEZ DE ML

### **Causa Raiz:**
`portion-formatter.ts` tem configuração para líquidos, mas **faltam ingredientes mapeados**:

**Configurados (OK):**
```typescript
'orange_juice': {
  grams_per_unit: 200,
  unit_type: 'copo',
  display_unit: 'ml',  // ✅ TEM display_unit
}
'black_coffee': {
  grams_per_unit: 50,
  unit_type: 'xicara',
  display_unit: 'ml',  // ✅ TEM display_unit
}
```

**Faltando (PROBLEMA):**
- `chamomile_tea` (chá de camomila) ← NÃO ESTÁ EM PORTION_CONFIGS
- `water` (água) ← NÃO ESTÁ EM PORTION_CONFIGS
- `fresh_orange_juice` (suco de laranja natural) ← NÃO ESTÁ EM PORTION_CONFIGS

### **Fallback atual:**
```typescript
function formatDefaultPortion(grams: number, ingredientKey: string): PortionDisplay {
  const isLiquid = /juice|suco|water|agua|milk|leite|coffee|cafe|tea|cha/i.test(ingredientKey);
  
  return {
    quantity: grams,
    unit: isLiquid ? 'ml' : 'g',
    label: `${grams}${isLiquid ? 'ml' : 'g'}`,  // ❌ SÓ MOSTRA "200ml" SEM QUANTIDADE
  };
}
```

### **Solução:**

**Opção A: Adicionar ingredientes faltantes em PORTION_CONFIGS**
```typescript
'chamomile_tea': {
  category: 'tea',
  unit_name_singular: 'xícara de chá de camomila',
  unit_name_plural: 'xícaras de chá de camomila',
  grams_per_unit: 200,
  unit_type: 'xicara',
  display_unit: 'ml',
  min_quantity: 1,
  max_quantity: 2,
},
'water': {
  category: 'beverage',
  unit_name_singular: 'copo de água',
  unit_name_plural: 'copos de água',
  grams_per_unit: 200,
  unit_type: 'copo',
  display_unit: 'ml',
  min_quantity: 1,
  max_quantity: 3,
},
'fresh_orange_juice': {
  category: 'juice',
  unit_name_singular: 'copo de suco de laranja natural',
  unit_name_plural: 'copos de suco de laranja natural',
  grams_per_unit: 200,
  unit_type: 'copo',
  display_unit: 'ml',
  min_quantity: 1,
  max_quantity: 2,
},
```

**Opção B: Melhorar fallback para líquidos**
```typescript
function formatDefaultPortion(grams: number, ingredientKey: string): PortionDisplay {
  const isLiquid = /juice|suco|water|agua|milk|leite|coffee|cafe|tea|cha/i.test(ingredientKey);
  
  if (isLiquid) {
    // Calcular quantidade de copos/xícaras
    const isCoffeeOrTea = /coffee|cafe|tea|cha/i.test(ingredientKey);
    const gramsPerUnit = isCoffeeOrTea ? 150 : 200;
    const quantity = Math.round(grams / gramsPerUnit);
    const unitName = isCoffeeOrTea ? 'xícara' : 'copo';
    
    return {
      quantity,
      unit: 'ml',
      label: `${quantity} ${unitName}${quantity > 1 ? 's' : ''} (${grams}ml)`,
    };
  }
  
  return {
    quantity: grams,
    unit: 'g',
    label: `${grams}g`,
  };
}
```

**Recomendação:** **Opção A** (mais preciso e consistente)

---

## 🎯 PROBLEMA 2: NOME GENÉRICO "Ovos" EM VEZ DE DESCRITIVO

### **Causa Raiz:**
`isValidMealName()` está rejeitando "Ovos", mas `generateMealName()` está gerando nome genérico.

**Análise do código atual:**
```typescript
// unified-meal-core/index.ts linha 137
const finalMealName = isValidMealName(mealName) 
  ? mealName 
  : generateMealName(sortedComponents, mealType);
```

**generateMealName() para breakfast:**
```typescript
if (mealType === 'breakfast' || mealType === 'morning_snack' || mealType === 'afternoon_snack') {
  if (protein) parts.push(cleanIngredientName(protein.name_pt));
  if (carb && !protein) parts.push(cleanIngredientName(carb.name_pt));
  if (dairy && parts.length < 2) parts.push(cleanIngredientName(dairy.name_pt));
  if (fruit && parts.length < 2) parts.push(cleanIngredientName(fruit.name_pt));
  if (beverage && parts.length < 2) parts.push(cleanIngredientName(beverage.name_pt));
}

// Se parts = ["Ovos mexidos"]
if (parts.length === 1) {
  return parts[0];  // ❌ Retorna "Ovos mexidos" (ainda genérico)
}
```

### **Problema:**
`cleanIngredientName()` remove quantidade mas não melhora nome:
```typescript
"2 ovos mexidos" → "Ovos mexidos"  // ❌ Ainda genérico
```

### **Solução:**

**Melhorar generateMealName() para café da manhã:**
```typescript
if (mealType === 'breakfast') {
  // Prioridade: proteína + carboidrato OU proteína + fruta
  if (protein) parts.push(cleanIngredientName(protein.name_pt));
  
  // SEMPRE adicionar segundo componente para café da manhã
  if (carb) {
    parts.push(cleanIngredientName(carb.name_pt));
  } else if (fruit) {
    parts.push(cleanIngredientName(fruit.name_pt));
  } else if (dairy) {
    parts.push(cleanIngredientName(dairy.name_pt));
  } else if (beverage) {
    parts.push(cleanIngredientName(beverage.name_pt));
  }
}

// Montar nome final
if (parts.length >= 2) {
  return parts.join(' com ');  // "Ovos mexidos com Mamão"
}
```

**Resultado esperado:**
- "Ovos" → "Ovos mexidos com Mamão papaia"
- "Queijo" → "Queijo branco com Chá de camomila"

---

## 🎯 PROBLEMA 3: LANCHE DA MANHÃ INCOERENTE (681 KCAL)

### **Causa Raiz:**
Distribuição de calorias está **ERRADA** no código antigo vs novo.

**CÓDIGO ANTIGO (generate-ai-meal-plan/index.ts):**
```typescript
const CALORIE_DISTRIBUTION: Record<string, number> = {
  breakfast: 0.22,      // 22%
  morning_snack: 0.08,  // 8% ← LEVE
  lunch: 0.30,          // 30%
  afternoon_snack: 0.10, // 10%
  dinner: 0.22,         // 22%
  supper: 0.08,         // 8%
};
```

**CÓDIGO NOVO (nutritionalCalculations.ts):**
```typescript
const MEAL_PERCENTAGES: Record<string, { percentage: number; label: string }> = {
  breakfast: { percentage: 0.20, label: "Café da Manhã" },      // 20%
  morning_snack: { percentage: 0.10, label: "Lanche da Manhã" }, // 10% ← AUMENTOU!
  lunch: { percentage: 0.30, label: "Almoço" },                 // 30%
  afternoon_snack: { percentage: 0.15, label: "Lanche da Tarde" }, // 15%
  dinner: { percentage: 0.25, label: "Jantar" },                // 25%
  supper: { percentage: 0.05, label: "Ceia" },                  // 5%
};
```

### **Análise:**

**Exemplo com 2000 kcal/dia:**

| Refeição | ANTIGO (8%) | NOVO (10%) | Diferença |
|----------|-------------|------------|-----------|
| Lanche da Manhã | 160 kcal | 200 kcal | +40 kcal |

**Mas na imagem: 681 kcal!** 🚨

### **Problema Real:**
O gerador está criando refeição **MUITO PESADA** para lanche da manhã:
- Ovos mexidos com queijo (150g) = ~250 kcal
- Café preto (150g) = ~2 kcal
- Mamão papaia (150g) = ~60 kcal
- **Total esperado:** ~312 kcal
- **Total mostrado:** 681 kcal ← MACROS ERRADOS?

### **Solução:**

**1. Reduzir distribuição de lanche da manhã:**
```typescript
const MEAL_PERCENTAGES: Record<string, { percentage: number; label: string }> = {
  breakfast: { percentage: 0.22, label: "Café da Manhã" },      // 22%
  morning_snack: { percentage: 0.08, label: "Lanche da Manhã" }, // 8% ← VOLTAR PARA 8%
  lunch: { percentage: 0.30, label: "Almoço" },                 // 30%
  afternoon_snack: { percentage: 0.10, label: "Lanche da Tarde" }, // 10%
  dinner: { percentage: 0.22, label: "Jantar" },                // 22%
  supper: { percentage: 0.08, label: "Ceia" },                  // 8%
};
```

**2. Adicionar validação de densidade para lanches:**
```typescript
// Em generateMealDirect() ou no Unified Core
if (mealType === 'morning_snack' || mealType === 'afternoon_snack') {
  // Lanches devem ser LEVES
  const maxCalories = targetCalories * 1.2; // Máximo 20% acima
  
  if (meal.totals.calories > maxCalories) {
    console.warn(`Lanche muito pesado: ${meal.totals.calories} > ${maxCalories}`);
    return null; // Rejeitar e tentar novamente
  }
}
```

**3. Templates específicos para lanches:**
Criar templates LEVES para `morning_snack`:
- Fruta + Oleaginosas (150-200 kcal)
- Iogurte + Granola (180-220 kcal)
- Queijo + Chá (100-150 kcal)
- **NUNCA:** Ovos mexidos com queijo (muito pesado)

---

## 🎯 PROBLEMA 4: "proteina animal" AINDA APARECENDO

### **Causa Raiz:**
Filtro `INVALID_INGREDIENT_NAMES` está no Unified Core, mas **ingrediente está vindo do gerador ANTIGO**.

**Análise:**
```typescript
// unified-meal-core/index.ts linha 85-90
const rawNameLower = raw.name.toLowerCase().trim();
if (INVALID_INGREDIENT_NAMES.some(invalid => rawNameLower === invalid || rawNameLower.includes(invalid))) {
  warnings.push(`Ingrediente removido (nome inválido): ${raw.name}`);
  continue; // ✅ DEVERIA REMOVER
}
```

**Mas na imagem:** "proteina animal (80g)" ainda aparece! 🚨

### **Possíveis causas:**

**1. Gerador antigo não está usando Unified Core:**
```typescript
// Se generateMealsForPool() está sendo usado em vez de generateMealsWithCore()
const generated = generateMealsForPool(...);  // ❌ NÃO PASSA PELO CORE
```

**2. Ingrediente está sendo adicionado DEPOIS do filtro:**
- Gerador cria componente com nome "proteina animal"
- Core filtra e remove
- Mas outro processo adiciona de volta?

**3. Case sensitivity:**
```typescript
INVALID_INGREDIENT_NAMES = [
  'proteina animal',  // lowercase
];

// Se ingrediente vem como "Proteina Animal" (title case)?
const rawNameLower = raw.name.toLowerCase();  // ✅ Deveria funcionar
```

### **Solução:**

**1. Verificar se TODOS os geradores usam Unified Core:**
```bash
# Buscar por generateMealsForPool (antigo)
grep -r "generateMealsForPool" supabase/functions/
```

**2. Adicionar log detalhado no filtro:**
```typescript
if (INVALID_INGREDIENT_NAMES.some(invalid => rawNameLower === invalid || rawNameLower.includes(invalid))) {
  console.error(`[UNIFIED-CORE] ❌ INGREDIENTE INVÁLIDO REMOVIDO: "${raw.name}"`);
  warnings.push(`Ingrediente removido (nome inválido): ${raw.name}`);
  continue;
}
```

**3. Adicionar validação EXTRA no gerador:**
```typescript
// Em advanced-meal-generator.ts (antes de passar para Core)
const FORBIDDEN_INGREDIENT_NAMES = ['proteina animal', 'proteína animal', 'carboidrato'];

components = components.filter(c => {
  const nameLower = c.name.toLowerCase();
  if (FORBIDDEN_INGREDIENT_NAMES.some(f => nameLower.includes(f))) {
    console.error(`[GENERATOR] ❌ Ingrediente proibido bloqueado: ${c.name}`);
    return false;
  }
  return true;
});
```

---

## 🎯 PROBLEMA 5: DISTRIBUIÇÃO DE MACROS - COMPARAÇÃO

### **Análise Comparativa:**

**CÓDIGO ANTIGO (CALORIE_DISTRIBUTION):**
```typescript
breakfast: 0.22,       // 22% = 440 kcal (2000 kcal/dia)
morning_snack: 0.08,   // 8%  = 160 kcal ← LEVE
lunch: 0.30,           // 30% = 600 kcal
afternoon_snack: 0.10, // 10% = 200 kcal
dinner: 0.22,          // 22% = 440 kcal
supper: 0.08,          // 8%  = 160 kcal
```

**CÓDIGO NOVO (MEAL_PERCENTAGES):**
```typescript
breakfast: 0.20,       // 20% = 400 kcal
morning_snack: 0.10,   // 10% = 200 kcal ← AUMENTOU 25%
lunch: 0.30,           // 30% = 600 kcal
afternoon_snack: 0.15, // 15% = 300 kcal ← AUMENTOU 50%
dinner: 0.25,          // 25% = 500 kcal ← AUMENTOU 14%
supper: 0.05,          // 5%  = 100 kcal ← DIMINUIU 37%
```

### **Problemas:**
1. ❌ Lanche da manhã aumentou de 8% → 10% (muito pesado)
2. ❌ Lanche da tarde aumentou de 10% → 15% (muito pesado)
3. ❌ Ceia diminuiu de 8% → 5% (muito leve)
4. ❌ Jantar aumentou de 22% → 25%

### **Solução:**

**Reverter para distribuição ANTIGA (mais equilibrada):**
```typescript
const MEAL_PERCENTAGES: Record<string, { percentage: number; label: string }> = {
  breakfast: { percentage: 0.22, label: "Café da Manhã" },
  morning_snack: { percentage: 0.08, label: "Lanche da Manhã" },  // ← VOLTAR PARA 8%
  lunch: { percentage: 0.30, label: "Almoço" },
  afternoon_snack: { percentage: 0.10, label: "Lanche da Tarde" }, // ← VOLTAR PARA 10%
  dinner: { percentage: 0.22, label: "Jantar" },                   // ← VOLTAR PARA 22%
  supper: { percentage: 0.08, label: "Ceia" },                     // ← VOLTAR PARA 8%
};
```

---

## 📋 RESUMO DAS SOLUÇÕES

| Problema | Arquivo | Solução |
|----------|---------|---------|
| **1. Líquidos em gramas** | `portion-formatter.ts` | Adicionar `chamomile_tea`, `water`, `fresh_orange_juice` em PORTION_CONFIGS |
| **2. Nome genérico "Ovos"** | `unified-meal-core/index.ts` | Melhorar `generateMealName()` para sempre ter 2+ componentes |
| **3. Lanche 681 kcal** | `nutritionalCalculations.ts` | Reverter `morning_snack` de 10% → 8% |
| **4. "proteina animal"** | `advanced-meal-generator.ts` + Core | Adicionar filtro PRÉ-Core + logs detalhados |
| **5. Distribuição macros** | `nutritionalCalculations.ts` | Reverter MEAL_PERCENTAGES para valores antigos |

---

## 🎯 PRIORIDADE DE IMPLEMENTAÇÃO

1. **CRÍTICO:** Problema 4 (proteina animal) - Bloquear no gerador
2. **ALTO:** Problema 1 (líquidos em gramas) - Adicionar configs
3. **ALTO:** Problema 5 (distribuição macros) - Reverter percentuais
4. **MÉDIO:** Problema 3 (lanche pesado) - Validação de densidade
5. **MÉDIO:** Problema 2 (nome genérico) - Melhorar generateMealName

---

**Status:** 📝 **ANÁLISE COMPLETA - AGUARDANDO APROVAÇÃO PARA IMPLEMENTAR**
