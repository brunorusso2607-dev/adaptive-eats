# 🔴 REGRESSÃO CRÍTICA IDENTIFICADA - POOL → IA

**Data:** 21 de Janeiro de 2026, 20:31 BRT
**Status:** CONFIRMADO - Sistema voltou a usar IA ao invés do pool

---

## 📊 EVIDÊNCIA DA REGRESSÃO

### **Commit que FUNCIONAVA (931623c):**

```typescript
// supabase/functions/generate-ai-meal-plan/index.ts (linha ~200)

logStep("🍽️ Loading meal pool from database...");
const { data: approvedMeals, error: poolError } = await supabaseClient
  .from("meal_combinations")  // ✅ BUSCA DO POOL
  .select("id, name, meal_type, components, total_calories, ...")
  .eq("is_active", true)
  .eq("approval_status", "approved");

// Depois insere com flag:
from_pool: dayOriginMap.get(dayIndex) || false  // ✅ Marca origem
```

**Tag:** `v1.1.0-pool-working`
**Mensagem:** "fix: Adicionar campo from_pool ao INSERT para rastrear origem das refeições"

---

### **Commit ATUAL (HEAD - 5de9373):**

```typescript
// src/components/MealPlanGenerator.tsx (linha 163)

const { data, error } = await supabase.functions.invoke("generate-ai-meal-plan", {
  body: {
    planName: finalPlanName,
    startDate: ...,
    daysCount: daysInThisBatch,
    optionsPerMeal: 1,  // ❌ GERA COM IA
    ...
  }
});
```

**Problema:** A função `generate-ai-meal-plan` AINDA existe e está sendo chamada, mas **NÃO está usando o pool**.

---

## 🔍 ANÁLISE DO QUE ACONTECEU

### **Arquitetura CORRETA (commit 931623c):**

```
Frontend (MealPlanGenerator.tsx)
    ↓
    └─> supabase.functions.invoke("generate-ai-meal-plan")
            ↓
            └─> BUSCA do pool (meal_combinations) ✅
                ↓
                └─> Insere com from_pool: true
```

### **Arquitetura ATUAL (HEAD):**

```
Frontend (MealPlanGenerator.tsx)
    ↓
    └─> supabase.functions.invoke("generate-ai-meal-plan")
            ↓
            └─> GERA com IA (Gemini) ❌
                ↓
                └─> Insere SEM from_pool
```

---

## 🔴 CAUSA RAIZ

A função `generate-ai-meal-plan/index.ts` foi **modificada** depois do commit `931623c` e **removeu** a lógica de buscar do pool.

**Possíveis causas:**
1. Rollback acidental que desfez a integração do pool
2. Merge conflict que perdeu o código do pool
3. Mudança intencional que não deveria ter sido feita

---

## 📋 EVIDÊNCIAS VISUAIS

### **Refeições geradas por IA (imagem do usuário):**

```
✅ Café: "Ovos mexidos com queijo, pão integral e mamão"
✅ Lanche: "Iogurte natural com granola e frutas vermelhas"
❌ Almoço: "Filé de tilápia assada, arroz integral, feijão carioca e salada colorida"
❌ Lanche tarde: "Sanduíche natural de frango desfiado com abacate e suco verde"
❌ Jantar: "Risoto de cogumelos frescos com frango em cubos e brócolis"
❌ Ceia: "Queijo cottage com mel e nozes"
```

**Características de IA:**
- Nomes muito específicos e criativos
- Combinações "gourmet" (risoto de cogumelos, sanduíche com abacate)
- Não seguem padrões do pool brasileiro

**Características do POOL:**
- Nomes simples: "Arroz, feijão, bife e salada"
- Combinações tradicionais brasileiras
- Seguem templates culturais

---

## ✅ SOLUÇÃO

### **OPÇÃO A: Restaurar código do commit 931623c**

```bash
# Restaurar apenas a função generate-ai-meal-plan
git show 931623c:supabase/functions/generate-ai-meal-plan/index.ts > supabase/functions/generate-ai-meal-plan/index.ts

# Deploy
supabase functions deploy generate-ai-meal-plan --no-verify-jwt
```

### **OPÇÃO B: Verificar diff e aplicar manualmente**

```bash
# Ver o que mudou
git diff 931623c HEAD -- supabase/functions/generate-ai-meal-plan/index.ts

# Aplicar apenas as mudanças do pool
```

---

## 🎯 CHECKLIST DE VERIFICAÇÃO

Após corrigir, verificar:

- [ ] Função `generate-ai-meal-plan` busca de `meal_combinations`
- [ ] Insere com `from_pool: true`
- [ ] Refeições geradas têm nomes simples (não criativos)
- [ ] Seguem templates culturais brasileiros
- [ ] Pool de 197 refeições está sendo usado

---

## 📊 COMMITS RELEVANTES

| Commit | Tag | Descrição | Status |
|--------|-----|-----------|--------|
| `931623c` | v1.1.0-pool-working | ✅ Pool funcionando | CORRETO |
| `f71d7d5` | v1.2.0-pool-validations | Validações do pool | ? |
| `b81a07a` | v1.0-pool-modal-safe | Modal de refeições | ? |
| `5de9373` | versao-segura-v95 | Versão atual | ❌ REGRESSÃO |

---

## 🚨 IMPACTO

| Área | Impacto |
|------|---------|
| Geração de planos | 🔴 CRÍTICO - Não usa pool |
| Performance | 🔴 ALTO - IA é mais lenta |
| Custo | 🔴 ALTO - Gemini API cara |
| Qualidade | 🟡 MÉDIO - IA gera nomes estranhos |
| Pool de 197 refeições | 🔴 CRÍTICO - Ignorado |

---

## 🎯 PRÓXIMA AÇÃO

**URGENTE:** Restaurar integração do pool na função `generate-ai-meal-plan`

**Arquivo:** `supabase/functions/generate-ai-meal-plan/index.ts`
**Commit de referência:** `931623c`

---

*Documento criado para rastrear regressão crítica - AGUARDANDO CORREÇÃO*
