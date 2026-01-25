# 📊 PROGRESSO DA REMOÇÃO DE INTOLERÂNCIAS NÃO-CORE

## ✅ FASES CONCLUÍDAS

### **FASE 1: Migration SQL** ✅
- ✅ Criada migration: `20260123000000_remove_non_core_intolerances.sql`
- ✅ Remove de: onboarding_options, intolerance_mappings, intolerance_key_normalization
- ✅ Limpa: user_intolerances, meal_combinations, recipes
- ✅ Validação automática incluída

### **FASE 2: Frontend Core Config** ✅
- ✅ Atualizado: `src/lib/intoleranceConfig.ts`
- ✅ CANONICAL_INTOLERANCE_KEYS: 18 → 3 (lactose, gluten, fodmap)
- ✅ LEGACY_KEY_MAPPING: simplificado
- ✅ INTOLERANCE_DEFINITIONS: removidas 15 definições

### **FASE 3: Backend Core Config** 🔄 EM PROGRESSO
- ✅ Atualizado: `supabase/functions/_shared/mealGenerationConfig.ts`
- ✅ Removidos blocos de SMART_SUBSTITUTIONS: egg, peanut, tree_nuts, fish, seafood, soy, sulfites, salicylates
- ✅ KEY_NORMALIZATION: 18 → 3 chaves
- ⏳ Pendente: Verificar outras referências no arquivo

---

## 🎯 PRÓXIMAS FASES

### **FASE 4: Global Safety Engine**
- Atualizar: `supabase/functions/_shared/globalSafetyEngine.ts`
- Remover validações das 8 intolerâncias não-core

### **FASE 5: Base de Ingredientes**
- Atualizar: `supabase/functions/_shared/meal-ingredients-db.ts`
- Remover `contains: ['egg']`, `contains: ['soy']`, etc.
- Manter apenas: `contains: ['lactose']`, `contains: ['gluten']`

### **FASE 6: Limpeza de Referências**
- Buscar e remover referências remanescentes
- Atualizar componentes frontend se necessário

### **FASE 7: Validação Final**
- Verificar que nada quebrou
- Testar geração de refeições
- Validar onboarding

---

## 📝 ARQUIVOS MODIFICADOS ATÉ AGORA

1. ✅ `supabase/migrations/20260123000000_remove_non_core_intolerances.sql` (NOVO)
2. ✅ `src/lib/intoleranceConfig.ts` (MODIFICADO)
3. ✅ `supabase/functions/_shared/mealGenerationConfig.ts` (MODIFICADO - parcial)

---

## ⚠️ ATENÇÃO

Sistema está sendo modificado com cuidado. Cada fase é validada antes de prosseguir.
Se houver erro, parar imediatamente e reportar ao usuário.

---

**Status:** 🟡 EM PROGRESSO (40% concluído)
**Última atualização:** 2026-01-23 00:45
