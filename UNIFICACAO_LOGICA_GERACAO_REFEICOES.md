# 🎯 UNIFICAÇÃO DA LÓGICA DE GERAÇÃO DE REFEIÇÕES

**Data:** 17 de Janeiro de 2026  
**Status:** ✅ EM IMPLEMENTAÇÃO

---

## 📋 PROBLEMA IDENTIFICADO

Você tem **3 módulos** que geram refeições, mas cada um usa lógica diferente:

### Módulos identificados:

1. **IA Personalizada** (`generate-ai-meal-plan`)
   - Gera plano completo de 30 dias
   - Usa pool de refeições como prioridade
   - Fallback para IA quando pool acaba

2. **Montar Meu Plano** (`generate-ai-meal-plan` com modo manual)
   - Usuário monta manualmente
   - Opção "Completar com IA" para slots vazios
   - Usa mesma Edge Function do módulo 1

3. **Regenerate Meal** (`regenerate-meal`)
   - Troca uma refeição específica
   - Usa pool `simple_meals` como prioridade
   - Fallback para IA

### ❌ Problema:

| Módulo | Usa CULTURAL_TEMPLATES? | Valida culturalmente? | Problema |
|--------|------------------------|----------------------|----------|
| `populate-meal-pool` | ✅ SIM | ✅ SIM | ✅ Correto (macarrão SEM salada) |
| `generate-ai-meal-plan` (fallback AI) | ❌ NÃO | ❌ NÃO | ❌ Pode gerar macarrão com salada |
| `regenerate-meal` | ❌ NÃO | ❌ NÃO | ❌ Pode gerar combinações erradas |

**Consequência:** Quando o pool acaba e o sistema precisa gerar via IA, pode criar refeições culturalmente incorretas.

---

## ✅ SOLUÇÃO IMPLEMENTADA

### PASSO 1: Centralizar Templates Culturais ✅

Criado arquivo: `supabase/functions/_shared/culturalMealTemplates.ts`

**Conteúdo:**
- `CULTURAL_TEMPLATES` - Templates fechados por país/tipo de refeição
- `FORBIDDEN_COMBINATIONS` - Combinações proibidas (ex: macarrão + salada)
- `validateCulturalRules()` - Validação cultural de refeições
- `getCulturalTemplates()` - Helper para buscar templates

**Exemplo de template:**
```typescript
{
  id: "BR_LUNCH_MACARRAO",
  country: "BR",
  meal_type: "almoco",
  base_type: "macarrão",
  structure: "Macarrão + Molho/Carne + (Vegetal cozido opcional)",
  base_required: ["macarrão"],
  components_required: ["proteína"],
  components_optional: ["brócolis", "legumes cozidos"],
  components_forbidden: ["arroz", "feijão", "salada", "salada verde"],
  examples: [
    "Macarrão + carne moída + molho de tomate",
    "Macarrão + frango desfiado + brócolis",
  ],
}
```

### PASSO 2: Integrar ao generate-ai-meal-plan ✅

**Arquivo modificado:** `supabase/functions/generate-ai-meal-plan/index.ts`

**Mudança:**
```typescript
// Importado no topo
import {
  CULTURAL_TEMPLATES,
  validateCulturalRules,
  getCulturalTemplates,
} from "../_shared/culturalMealTemplates.ts";
```

**Próximo passo:** Modificar o prompt do fallback AI para usar os templates

### PASSO 3: Integrar ao regenerate-meal ⏳ PENDENTE

**Arquivo a modificar:** `supabase/functions/regenerate-meal/index.ts`

**Ação:** Adicionar import e usar templates culturais na geração via IA

---

## 🎯 RESULTADO ESPERADO

Após implementação completa, **TODOS os 3 módulos** vão:

1. ✅ Usar pool de refeições como prioridade
2. ✅ Quando pool acabar, gerar via IA com **mesmos templates culturais**
3. ✅ Validar refeições geradas com `validateCulturalRules()`
4. ✅ **NUNCA** gerar macarrão com salada no Brasil
5. ✅ **SEMPRE** seguir estruturas culturais corretas

---

## 📊 FLUXO UNIFICADO

```
┌─────────────────────────────────────────────────────────────┐
│           CULTURAL MEAL TEMPLATES (CORE ÚNICO)              │
│  ─────────────────────────────────────────────              │
│  📍 Localização: _shared/culturalMealTemplates.ts           │
│                                                             │
│  • CULTURAL_TEMPLATES (BR, US, MX, AR, ES, PT, etc.)       │
│  • FORBIDDEN_COMBINATIONS                                   │
│  • validateCulturalRules()                                  │
│  • getCulturalTemplates()                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  TODOS OS MÓDULOS USAM                      │
│  ─────────────────────────────────────────────              │
│  1. populate-meal-pool                                      │
│     → Gera pool com templates ✅                            │
│                                                             │
│  2. generate-ai-meal-plan                                   │
│     → Usa pool primeiro                                     │
│     → Fallback AI com templates ✅ (em implementação)       │
│                                                             │
│  3. regenerate-meal                                         │
│     → Usa simple_meals primeiro                             │
│     → Fallback AI com templates ⏳ (pendente)               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 EXEMPLO PRÁTICO

### ANTES (Inconsistente):

**Pool de refeições:**
- ✅ "Macarrão + carne moída + brócolis" (correto)

**IA Personalizada (quando pool acaba):**
- ❌ "Macarrão + salada verde" (ERRADO!)

**Regenerate Meal:**
- ❌ "Macarrão + feijão + salada" (ERRADO!)

### DEPOIS (Consistente):

**Pool de refeições:**
- ✅ "Macarrão + carne moída + brócolis"

**IA Personalizada (quando pool acaba):**
- ✅ "Macarrão + frango desfiado + molho de tomate"
- ✅ Usa CULTURAL_TEMPLATES
- ✅ Valida com validateCulturalRules()

**Regenerate Meal:**
- ✅ "Macarrão ao alho e óleo + ovo frito"
- ✅ Usa CULTURAL_TEMPLATES
- ✅ Valida com validateCulturalRules()

---

## 📝 ARQUIVOS ENVOLVIDOS

### Criados:
- ✅ `_shared/culturalMealTemplates.ts` - Templates centralizados

### Modificados:
- ✅ `generate-ai-meal-plan/index.ts` - Import adicionado
- ⏳ `generate-ai-meal-plan/index.ts` - Prompt do fallback (pendente)
- ⏳ `regenerate-meal/index.ts` - Import e uso (pendente)

### Mantidos sem alteração:
- ✅ `populate-meal-pool/index.ts` - Já usa templates localmente

---

## ⚠️ PRÓXIMOS PASSOS

1. ⏳ Modificar prompt do fallback AI em `generate-ai-meal-plan`
2. ⏳ Adicionar import em `regenerate-meal`
3. ⏳ Modificar prompt em `regenerate-meal` para usar templates
4. ⏳ Testar geração de 30 dias (pool + IA)
5. ⏳ Testar regeneração de refeição
6. ⏳ Validar que NUNCA gera macarrão com salada

---

## ✅ GARANTIAS

Após implementação completa:

1. ✅ **100% de consistência** entre pool e IA
2. ✅ **Mesmas regras culturais** em todos os módulos
3. ✅ **Validação automática** de todas as refeições geradas
4. ✅ **Zero regressão** - código existente continua funcionando
5. ✅ **Fácil manutenção** - templates em um único lugar

---

**Status atual:** 🟡 EM IMPLEMENTAÇÃO (50% completo)  
**Próxima ação:** Modificar prompt do fallback AI para usar templates
