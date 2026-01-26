# ✅ RESUMO DA REMOÇÃO DE INTOLERÂNCIAS NÃO-CORE

## 🎯 STATUS GERAL: 60% CONCLUÍDO

**Última atualização:** 2026-01-23 00:50

---

## ✅ FASES CONCLUÍDAS (4/7)

### **FASE 1: Migration SQL** ✅ COMPLETA
**Arquivo:** `supabase/migrations/20260123000000_remove_non_core_intolerances.sql`

**O que foi feito:**
- ✅ Remove de `onboarding_options`
- ✅ Remove de `intolerance_mappings`
- ✅ Remove de `intolerance_key_normalization`
- ✅ Remove de `user_intolerances`
- ✅ Limpa `blocked_for_intolerances` em `meal_combinations`
- ✅ Limpa `blocked_for_intolerances` em `recipes`
- ✅ Validação automática incluída

**Intolerâncias removidas:** egg, soy, peanut, tree_nuts, seafood, fish, salicylate, sulfite

---

### **FASE 2: Frontend Core Config** ✅ COMPLETA
**Arquivo:** `src/lib/intoleranceConfig.ts`

**O que foi feito:**
- ✅ `CANONICAL_INTOLERANCE_KEYS`: 18 → 3 (lactose, gluten, fodmap)
- ✅ `LEGACY_KEY_MAPPING`: simplificado para apenas core
- ✅ `INTOLERANCE_DEFINITIONS`: removidas 15 definições
- ✅ Mantidas apenas: lactose, gluten, fodmap

**Linhas modificadas:** ~300 linhas removidas

---

### **FASE 3: Backend Core Config** ✅ COMPLETA
**Arquivo:** `supabase/functions/_shared/mealGenerationConfig.ts`

**O que foi feito:**
- ✅ Removidos blocos de `SMART_SUBSTITUTIONS`:
  - egg (ovos → proteína alternativa)
  - peanut (amendoim)
  - tree_nuts (oleaginosas)
  - fish (peixe)
  - seafood (frutos do mar)
  - soy (soja)
  - sulfites (sulfitos)
  - salicylates (salicilatos)
- ✅ `KEY_NORMALIZATION`: 30+ chaves → 5 chaves (core only)
- ✅ Mantidas apenas: lactose, gluten, fodmap

**Linhas modificadas:** ~200 linhas removidas

---

### **FASE 4: Global Safety Engine** ✅ COMPLETA
**Arquivo:** `supabase/functions/_shared/globalSafetyEngine.ts`

**O que foi feito:**
- ✅ `CRITICAL_INTOLERANCE_MAPPINGS`: 18 → 3 (core only)
- ✅ `CRITICAL_DIETARY_FALLBACK`: removidas referências a egg, fish
- ✅ `SAFE_KEYWORDS_FALLBACK`: 18 → 3 (core only)
- ✅ `INTOLERANCE_LABELS`: 18 → 3 (core only)

**Linhas modificadas:** ~150 linhas removidas

---

## ⏳ FASES PENDENTES (3/7)

### **FASE 5: Base de Ingredientes** ⏳ PENDENTE
**Arquivo:** `supabase/functions/_shared/meal-ingredients-db.ts`

**O que fazer:**
- Remover `contains: ['egg']` de todos os ingredientes
- Remover `contains: ['soy']` de todos os ingredientes
- Remover `contains: ['peanut']`, `contains: ['tree_nuts']`, etc.
- Manter apenas: `contains: ['lactose']`, `contains: ['gluten']`

**Estimativa:** ~50 ingredientes a atualizar

---

### **FASE 6: Limpeza de Referências** ⏳ PENDENTE
**Arquivos a verificar:**
- `supabase/functions/_shared/intoleranceMealPool.ts`
- `supabase/functions/_shared/recipeConfig.ts`
- `src/components/IngredientTagInput.tsx`
- `src/hooks/useSafeIngredientSuggestions.tsx`
- Outros componentes frontend

**O que fazer:**
- Buscar referências remanescentes às 8 intolerâncias
- Remover ou atualizar conforme necessário

---

### **FASE 7: Validação Final** ⏳ PENDENTE
**O que fazer:**
- Executar migration SQL no banco
- Testar geração de refeições
- Testar onboarding
- Verificar que nada quebrou

---

## 📊 ESTATÍSTICAS

### **Arquivos Modificados:**
1. ✅ `supabase/migrations/20260123000000_remove_non_core_intolerances.sql` (NOVO)
2. ✅ `src/lib/intoleranceConfig.ts` (MODIFICADO)
3. ✅ `supabase/functions/_shared/mealGenerationConfig.ts` (MODIFICADO)
4. ✅ `supabase/functions/_shared/globalSafetyEngine.ts` (MODIFICADO)

### **Linhas de Código:**
- **Removidas:** ~650 linhas
- **Modificadas:** ~100 linhas
- **Total afetado:** ~750 linhas

### **Intolerâncias:**
- **Antes:** 18 intolerâncias
- **Depois:** 3 intolerâncias (lactose, gluten, fodmap)
- **Redução:** 83%

---

## 🎯 PRÓXIMOS PASSOS

### **Opção 1: Continuar Implementação**
Continuar com as Fases 5, 6 e 7 para completar a remoção.

### **Opção 2: Testar Parcialmente**
Executar a migration SQL e testar o que já foi implementado antes de continuar.

### **Opção 3: Revisar e Ajustar**
Revisar o que foi feito e fazer ajustes antes de prosseguir.

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

### **Sistema Ainda Funcional:**
O sistema ainda deve funcionar normalmente porque:
- As validações core (lactose, gluten, fodmap) estão intactas
- Os fallbacks críticos foram mantidos
- A migration SQL ainda não foi executada no banco

### **Próxima Execução:**
Quando continuar:
1. Completar Fase 5 (meal-ingredients-db.ts)
2. Fazer limpeza final (Fase 6)
3. Executar migration e validar (Fase 7)

### **Tempo Estimado para Conclusão:**
- Fase 5: 15 minutos
- Fase 6: 20 minutos
- Fase 7: 10 minutos
- **Total:** ~45 minutos

---

## ✅ CONCLUSÃO PARCIAL

**Progresso:** 60% concluído  
**Status:** Pausado para evitar erros  
**Próxima ação:** Aguardando instrução do usuário

**Arquivos principais já atualizados e prontos para uso.**
