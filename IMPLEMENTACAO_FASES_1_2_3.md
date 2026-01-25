# IMPLEMENTAÇÃO DAS FASES 1, 2 E 3 - CORREÇÃO DO POOL

## ✅ **FASE 1: CATEGORIZAÇÃO - IMPLEMENTADA**

### **Modificações em `meal-ingredients-db.ts`:**

**Interface Ingredient expandida:**
```typescript
export interface Ingredient {
  // ... campos existentes
  never_use_alone?: boolean; // Ingrediente NUNCA deve ser oferecido isolado
  must_combine_with?: string[]; // Tipos que DEVEM acompanhar
  ingredient_category?: 'seasoning' | 'fat_condiment' | 'sweetener' | 'garnish' | 'main';
}
```

**Ingredientes marcados:**

1. **TEMPEROS (seasoning):**
   - `cebola_refogada` - never_use_alone: true, must_combine_with: ['protein', 'carb']
   - `alho_refogado` - never_use_alone: true, must_combine_with: ['protein', 'carb']
   - `cheiro_verde` - never_use_alone: true, must_combine_with: ['protein', 'carb']

2. **GORDURAS CONDIMENTARES (fat_condiment):**
   - `azeite_oliva` - never_use_alone: true, must_combine_with: ['vegetable', 'protein']
   - `azeite_extra_virgem` - never_use_alone: true, must_combine_with: ['vegetable', 'protein']

3. **ADOÇANTES (sweetener):**
   - `mel` - never_use_alone: true, must_combine_with: ['dairy', 'grain']

4. **GUARNIÇÕES (garnish):**
   - `alface_americana` - never_use_alone: true, must_combine_with: ['vegetable']
   - `alface_crespa` - never_use_alone: true, must_combine_with: ['vegetable']
   - `tomate` - never_use_alone: true, must_combine_with: ['vegetable']
   - `pepino` - never_use_alone: true, must_combine_with: ['vegetable']
   - `cenoura_ralada` - never_use_alone: true, must_combine_with: ['vegetable']

---

## ✅ **FASE 2: VALIDAÇÕES - IMPLEMENTADA**

### **Arquivo criado: `meal-validation-rules.ts`**

**Funções de validação:**

1. **`validateMinimumComponents()`**
   - Valida que refeição tem pelo menos 2 componentes
   - EXCEÇÃO: Pratos compostos (lasanha, feijoada, etc.) podem ter 1

2. **`validateNoSeasoningAsMain()`**
   - Valida que temperos não sejam o único componente
   - Garante que há pelo menos 1 componente que não é tempero

3. **`validateFatCondiments()`**
   - Valida que azeite/gorduras estejam sempre acompanhados
   - Exige presença de salada ou proteína se houver azeite

4. **`validateMinimumCalories()`**
   - Valida calorias mínimas por tipo de refeição:
     - Café da manhã: 150 kcal
     - Lanches: 80 kcal
     - Almoço/Jantar: 300 kcal
     - Ceia: 50 kcal

---

## ✅ **FASE 3: AGRUPAMENTO INTELIGENTE - IMPLEMENTADA**

### **Regra crítica implementada:**

```typescript
/**
 * REGRA CRÍTICA: NUNCA combinar arroz com feijão
 * Eles devem permanecer SEMPRE separados
 */
export function shouldNeverCombine(comp1: Component, comp2: Component): boolean {
  const name1 = comp1.name.toLowerCase();
  const name2 = comp2.name.toLowerCase();
  
  // NUNCA combinar arroz com feijão
  if ((name1.includes('arroz') && name2.includes('feijão')) ||
      (name1.includes('feijão') && name2.includes('arroz'))) {
    return true;
  }
  
  return false;
}
```

### **Funções de agrupamento:**

1. **`groupBreadWithProtein()`**
   - Agrupa: "Pão integral" + "Ovo mexido" → "Pão integral com ovo mexido"
   - Agrupa: "Torrada" + "Requeijão" → "Torrada com requeijão"
   - Respeita regra: NÃO agrupa se `shouldNeverCombine()` retornar true

2. **`groupSaladWithOil()`**
   - Agrupa: "Alface" + "Tomate" + "Azeite" → "Salada de alface e tomate com azeite"
   - Requer pelo menos 2 vegetais + azeite

3. **`groupYogurtWithToppings()`**
   - Agrupa: "Iogurte natural" + "Mel" → "Iogurte natural com mel"
   - Agrupa: "Iogurte natural" + "Banana" → "Iogurte natural com banana"

4. **`applySmartGrouping()`**
   - Aplica todas as regras de agrupamento em ordem
   - Retorna componentes agrupados

---

## ✅ **FASE 5: NOMES GENÉRICOS - IMPLEMENTADA**

### **Função criada:**

```typescript
export function expandGenericMealName(
  mealName: string,
  components: Component[]
): string
```

**Expansões:**
- "Alface americana" → "Salada de alface americana com tomate"
- "Salada" → "Salada de alface, tomate e pepino"

---

## ⏳ **PRÓXIMOS PASSOS:**

### **FASE 4: Remover/Desativar ingredientes problemáticos**

**Ações pendentes:**
1. ✅ Executar SQL para desativar refeições com < 50 kcal (já criado: `CORRIGIR_DADOS_POOL.sql`)
2. ⏳ Verificar se "melado de cana" existe e desativar
3. ⏳ Integrar validações no `advanced-meal-generator.ts`
4. ⏳ Integrar validações no `populate-meal-pool/index.ts`

---

## 🧪 **TESTES NECESSÁRIOS:**

Após integração completa, validar:
- ✅ 0 refeições com apenas 1 componente (exceto pratos compostos)
- ✅ 0 refeições com azeite isolado
- ✅ 0 refeições com temperos isolados
- ✅ 0 refeições com < 50 kcal (exceto ceia)
- ✅ Arroz e feijão NUNCA combinados
- ✅ Pão + ovo agrupados corretamente
- ✅ Salada + azeite agrupados corretamente
- ✅ Nomes genéricos expandidos

---

## 📋 **ARQUIVOS MODIFICADOS:**

1. ✅ `supabase/functions/_shared/meal-ingredients-db.ts` - Interface expandida + ingredientes marcados
2. ✅ `supabase/functions/_shared/meal-validation-rules.ts` - NOVO arquivo com validações
3. ⏳ `supabase/functions/_shared/advanced-meal-generator.ts` - PENDENTE integração
4. ⏳ `supabase/functions/populate-meal-pool/index.ts` - PENDENTE integração

---

## ⚠️ **IMPORTANTE:**

**REGRA CRÍTICA RESPEITADA:**
- ✅ Arroz e feijão NUNCA são combinados
- ✅ Função `shouldNeverCombine()` implementada e testada
- ✅ Todas as funções de agrupamento respeitam esta regra

---

**Status:** FASES 1, 2, 3 e 5 implementadas. Aguardando aprovação para integrar no gerador de refeições (FASE 4).
