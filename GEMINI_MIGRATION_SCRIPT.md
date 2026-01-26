# 🚀 SCRIPT DE MIGRAÇÃO PARA GEMINI 2.0 FLASH-LITE

**Data:** 15/01/2026  
**Objetivo:** Migrar TODOS os módulos para `gemini-2.0-flash-lite` e remover dependências da Lovable API

---

## 📋 MÓDULOS A ATUALIZAR

### **Grupo 1: Módulos com gemini-2.5-flash-lite (14 módulos)**

1. ✅ **generate-ai-meal-plan** - Atualizado para CURRENT_AI_MODEL
2. ⏳ **analyze-food-photo** - Precisa atualizar
3. ⏳ **analyze-label-photo** - Precisa atualizar
4. ⏳ **generate-recipe** - Precisa atualizar
5. ⏳ **chat-assistant** - Precisa atualizar
6. ⏳ **test-prompt-validation** - Precisa atualizar
7. ⏳ **suggest-meal-alternatives** - Precisa atualizar
8. ⏳ **regenerate-meal** - Precisa atualizar
9. ⏳ **regenerate-ai-meal-alternatives** - Precisa atualizar
10. ⏳ **generate-emoji** - Precisa atualizar
11. ⏳ **generate-description** - Precisa atualizar
12. ⏳ **expand-all-intolerances** - Precisa atualizar (usa Lovable)
13. ⏳ **decompose-food-for-safety** - Precisa atualizar (usa Lovable)
14. ⏳ **get-hardcoded-prompts** - Precisa atualizar (referências)

### **Grupo 2: Módulos com gemini-2.0-flash-lite (3 módulos)**

15. ✅ **suggest-smart-substitutes** - Atualizado para CURRENT_AI_MODEL
16. ⏳ **validate-ingredients** - Precisa atualizar para CURRENT_AI_MODEL
17. ⏳ **validate-food-ai** - Precisa atualizar + remover env var

### **Grupo 3: Módulos Lovable API (2 módulos) - MIGRAÇÃO CRÍTICA**

18. ⏳ **translate-intolerance-mappings** - Migrar para Gemini direto
19. ⏳ **translate-food-decomposition** - Migrar para Gemini direto

---

## 🔧 PADRÃO DE ATUALIZAÇÃO

### **Para módulos que já usam getGeminiApiKey():**

```typescript
// ANTES:
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
  // ...
);

// DEPOIS:
import { CURRENT_AI_MODEL, buildGeminiApiUrl, logAICall } from "../_shared/aiModelConfig.ts";

logAICall('MODULE-NAME', CURRENT_AI_MODEL);
const response = await fetch(
  buildGeminiApiUrl(apiKey, CURRENT_AI_MODEL),
  // ...
);
```

### **Para módulos que usam env var (validate-food-ai):**

```typescript
// ANTES:
const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');

// DEPOIS:
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import { CURRENT_AI_MODEL, buildGeminiApiUrl, logAICall } from "../_shared/aiModelConfig.ts";

const GOOGLE_AI_API_KEY = await getGeminiApiKey();
logAICall('MODULE-NAME', CURRENT_AI_MODEL);
```

### **Para módulos Lovable API:**

```typescript
// ANTES:
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
const response = await fetch('https://api.lovable.app/v1/chat/completions', {
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash-lite',
    messages: [...]
  })
});

// DEPOIS:
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import { CURRENT_AI_MODEL, buildGeminiApiUrl, logAICall } from "../_shared/aiModelConfig.ts";

const geminiApiKey = await getGeminiApiKey();
logAICall('MODULE-NAME', CURRENT_AI_MODEL);
const response = await fetch(
  buildGeminiApiUrl(geminiApiKey, CURRENT_AI_MODEL),
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
    })
  }
);
```

---

## 📊 PROGRESSO

**Total:** 19 módulos  
**Concluídos:** 2/19 (10.5%)  
**Pendentes:** 17/19 (89.5%)

---

## 🎯 PRÓXIMOS PASSOS

1. Atualizar módulos do Grupo 1 (gemini-2.5-flash-lite → CURRENT_AI_MODEL)
2. Atualizar módulos do Grupo 2 (gemini-2.0-flash-lite → CURRENT_AI_MODEL)
3. Migrar módulos do Grupo 3 (Lovable → Gemini direto)
4. Testar todos os módulos
5. Gerar relatório final
