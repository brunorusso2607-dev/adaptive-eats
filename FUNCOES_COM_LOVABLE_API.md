# 🔍 FUNÇÕES QUE AINDA USAM LOVABLE API

## ❌ FUNÇÕES QUE PRECISAM MIGRAÇÃO (6)

### **1. translate-food-decomposition**
- **Linha 188:** `https://api.lovable.ai/v1/chat/completions`
- **Linha 236:** `Deno.env.get('LOVABLE_API_KEY')`
- **Status:** ATIVA - Precisa migração urgente

### **2. expand-all-intolerances**
- **Linha 20:** `LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")`
- **Linha 90:** `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Status:** DESABILITADA (`FUNCTION_DISABLED = true`)
- **Ação:** Migrar quando reativar

### **3. expand-language-terms**
- **Linha 72:** `LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")`
- **Linha 152:** `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Status:** Função administrativa
- **Ação:** Migrar para Gemini

### **4. expand-intolerance-mappings**
- **Linha 13:** `LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")`
- **Linha 196:** `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Status:** DESABILITADA (`FUNCTION_DISABLED = true`)
- **Ação:** Migrar quando reativar

### **5. decompose-food-for-safety**
- **Linha 48:** `LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")`
- **Linha 110:** `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Status:** ATIVA - Precisa migração urgente

### **6. chat-assistant**
- **Linha 2024:** `LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")`
- **Linha 2130:** `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Status:** ATIVA - Precisa migração urgente

---

## ✅ FUNÇÕES OK (Apenas User-Agent "LovableBot")

Estas funções só usam "LovableBot" no User-Agent (não é problema):
- upload-mccance-file
- upload-ciqual-file
- import-mccance-foods
- analyze-excel-structure

---

## 🎯 PRIORIDADE DE MIGRAÇÃO

### **URGENTE (Funções Ativas):**
1. ⚠️ **translate-food-decomposition** - Usada para tradução
2. ⚠️ **decompose-food-for-safety** - Usada para segurança alimentar
3. ⚠️ **chat-assistant** - Usada para chat com usuário

### **MÉDIA (Funções Desabilitadas):**
4. 🔒 **expand-all-intolerances** - Desabilitada
5. 🔒 **expand-intolerance-mappings** - Desabilitada

### **BAIXA (Funções Administrativas):**
6. 🔧 **expand-language-terms** - Administrativa

---

## 📋 PLANO DE AÇÃO

1. Migrar as 3 funções URGENTES primeiro
2. Migrar as funções desabilitadas (para quando reativarem)
3. Migrar função administrativa
4. Fazer deploy de todas
5. Testar cada uma

---

## 🔧 PADRÃO DE MIGRAÇÃO

**DE:**
```typescript
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    messages: [...]
  })
});
const content = data.choices[0]?.message?.content;
```

**PARA:**
```typescript
const geminiApiKey = await getGeminiApiKey();
logAICall('FUNCTION-NAME', CURRENT_AI_MODEL);
const response = await fetch(buildGeminiApiUrl(geminiApiKey, CURRENT_AI_MODEL), {
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 8000 }
  })
});
const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
```
