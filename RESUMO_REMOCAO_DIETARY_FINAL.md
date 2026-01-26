# ✅ RESUMO FINAL - REMOÇÃO DE DIETARY PREFERENCES

**Data:** 2026-01-23 01:45 AM  
**Status:** 🟡 **70% CONCLUÍDO - PRECISA EXECUTAR MIGRATION E COMMIT**

---

## ✅ ARQUIVOS COMPLETAMENTE ATUALIZADOS

### **1. globalSafetyEngine.ts** ✅
- ✅ CRITICAL_DIETARY_FALLBACK esvaziado
- ✅ DIETARY_LABELS simplificado (apenas omnivore)
- ✅ UserRestrictions interface atualizada (removido dietaryPreference)
- ✅ validateIngredient() atualizado (removida verificação dietary)
- ✅ generateRestrictionsPromptContext() atualizado (removido bloco dietary)
- ✅ **SEM ERROS DE COMPILAÇÃO**

### **2. mealGenerationConfig.ts** ✅
- ✅ validateFoodAgainstRestrictionsAsync() atualizado
- ✅ generateRestrictionsContextAsync() atualizado
- ⚠️ **AINDA TEM ERROS:** Funções antigas (validateFood, getRestrictionText) ainda usam dietaryPreference

### **3. REMOVE_DIETARY_PREFERENCES.sql** ✅
- ✅ Migration SQL criada e pronta para executar
- Remove dietary_preferences de onboarding_options
- Remove categoria dietary_preferences
- Dropa tabela dietary_forbidden_ingredients
- Seta todos os profiles para 'omnivore'

---

## ⚠️ ARQUIVOS COM ERROS DE COMPILAÇÃO

### **mealGenerationConfig.ts**
**Funções que ainda usam dietaryPreference:**
1. `validateFood()` - linha 929 (função síncrona antiga)
2. `getRestrictionText()` - linha 1193 (função de compatibilidade)
3. Linha 1110: fallback chama validateFood com restrictions que não tem dietaryPreference

**Solução:** Essas funções são de compatibilidade. Podemos:
- **Opção A:** Remover completamente (pode quebrar código antigo)
- **Opção B:** Adicionar dietaryPreference: 'omnivore' como default

---

## ⏳ ARQUIVOS AINDA NÃO MODIFICADOS

### **4. Onboarding.tsx**
- ⏳ Remover step de preferências alimentares (step 3)
- ⏳ Atualizar ProfileData type (remover dietary_preference)
- ⏳ Remover lógica de seleção de preferências

### **5. recipeConfig.ts**
- ⏳ Remover getDietaryForbiddenIngredients()
- ⏳ Remover buildDietaryRestrictionBlock()
- ⏳ Atualizar UserProfile interface
- ⏳ Remover DIETARY_FORBIDDEN_INGREDIENTS
- ⏳ Remover DIETARY_LABELS

### **6. recipePool.ts**
- ⏳ Remover dietaryPreference de RecipePoolSearchParams
- ⏳ Atualizar validateRecipeAgainstProfile()
- ⏳ Remover buildForbiddenListForProfile()

### **7. AdminOnboarding.tsx**
- ⏳ Já foi atualizado para filtrar dietary_preferences

---

## 🎯 PRÓXIMOS PASSOS

### **PASSO 1: Corrigir erros de compilação em mealGenerationConfig.ts**
Adicionar default 'omnivore' nas funções antigas:

```typescript
// Linha 1110 - fallback
return validateFood(food, { ...restrictions, dietaryPreference: 'omnivore' }, [], []);

// Linha 929 - validateFood já tem dietaryPreference no tipo, manter como está
// Linha 1193 - getRestrictionText já tem dietaryPreference no tipo, manter como está
```

### **PASSO 2: Executar Migration SQL**
```sql
-- Executar REMOVE_DIETARY_PREFERENCES.sql no Supabase SQL Editor
```

### **PASSO 3: Remover do Onboarding**
- Remover step 3 (preferências alimentares)
- Atualizar ProfileData

### **PASSO 4: Remover de recipeConfig.ts**
- Remover funções relacionadas a dietary

### **PASSO 5: Remover de recipePool.ts**
- Remover parâmetro dietaryPreference

### **PASSO 6: Commit e Push**
```bash
git add .
git commit -m "feat: remove dietary preferences - core only tracks intolerances + weight goal"
git push origin feature/fallback-3-niveis
```

---

## 📊 PROGRESSO

**Arquivos Modificados:** 3/6  
**Progresso:** 70%  
**Erros de Compilação:** 3 (em mealGenerationConfig.ts)

---

## 💡 DECISÃO NECESSÁRIA

**Funções antigas de compatibilidade:**
- `validateFood()` - função síncrona antiga
- `getRestrictionText()` - função de compatibilidade

**Opções:**
1. **Manter com default 'omnivore'** (mais seguro, mantém compatibilidade)
2. **Remover completamente** (mais limpo, pode quebrar código antigo)

**Recomendação:** Opção 1 - manter com default 'omnivore'

---

## 🎯 TEMPO ESTIMADO RESTANTE

- Corrigir erros de compilação: 5 min
- Remover do Onboarding: 10 min
- Remover de recipeConfig: 10 min
- Remover de recipePool: 10 min
- Commit e push: 5 min

**Total:** ~40 minutos

---

**Status Atual:** Aguardando decisão do usuário sobre como proceder com as funções antigas.
