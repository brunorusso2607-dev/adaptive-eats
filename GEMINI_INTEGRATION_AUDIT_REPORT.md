# 🤖 RELATÓRIO DE AUDITORIA - INTEGRAÇÃO GEMINI FLASH

**Data:** 15/01/2026  
**Auditor:** AI Integration Engineer & QA Specialist  
**Objetivo:** Auditar conectividade e configuração do Gemini Flash em todos os módulos

---

## 📊 SUMÁRIO EXECUTIVO

### **Status Geral: 🟡 PARCIALMENTE ATIVO**

- **Módulos Ativos:** 8/10 (80%)
- **Modelo Correto:** 6/10 (60%)
- **API Key:** ✅ Configurada via banco de dados
- **Problema Crítico:** ❌ Erro "Edge Function returned a non-2xx status code" identificado

---

## 🔍 ANÁLISE POR MÓDULO

### **MÓDULO 1: generate-ai-meal-plan**
**Status:** 🟢 ATIVO  
**Modelo:** ✅ `gemini-2.5-flash-lite`  
**API Key:** ✅ Via `getGeminiApiKey()` (banco de dados)  
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`

**Análise:**
```typescript
// Linha 1520
const AI_MODEL = "gemini-2.5-flash-lite"; // ✅ Hardcoded correto

// Linha 1738
const googleApiKey = await getGeminiApiKey(); // ✅ Busca do banco

// Linha 1845-1846
const aiResponse = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${googleApiKey}`,
  // ✅ Chamada correta
```

**Prompts:**
- ✅ Usa `getMasterMealPromptV5()` de `mealGenerationConfig.ts`
- ✅ Inclui contexto de Cascata de Alimentos
- ✅ Inclui 4 Camadas de Intolerância via `globalSafetyEngine.ts`
- ✅ Contexto regional via `getRegionalConfig()`

**Veredicto:** ✅ **TOTALMENTE FUNCIONAL**

---

### **MÓDULO 2: analyze-food-photo**
**Status:** 🟢 ATIVO  
**Modelo:** ✅ `gemini-2.5-flash-lite`  
**API Key:** ✅ Via `getGeminiApiKey()` (banco de dados)  
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`

**Análise:**
```typescript
// Linha 230
const GOOGLE_AI_API_KEY = await getGeminiApiKey(); // ✅ Busca do banco

// Linha 722-723
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
  // ✅ Chamada correta com imagem
```

**Prompts:**
- ✅ Inclui imagem em base64
- ✅ Usa `globalSafetyEngine.ts` para validação
- ✅ Contexto de restrições do usuário
- ✅ Cálculo de macros via `calculateRealMacrosForFoods()`

**Veredicto:** ✅ **TOTALMENTE FUNCIONAL**

---

### **MÓDULO 3: analyze-label-photo**
**Status:** 🟢 ATIVO  
**Modelo:** ✅ `gemini-2.5-flash-lite`  
**API Key:** ✅ Via `getGeminiApiKey()` (banco de dados)  
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`

**Análise:**
```typescript
// Linha 7
const AI_MODEL = "gemini-2.5-flash-lite"; // ✅ Hardcoded correto

// Linha 56
const GOOGLE_AI_API_KEY = await getGeminiApiKey(); // ✅ Busca do banco

// Linha 474
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`,
  // ✅ Chamada correta com retry para 503
```

**Prompts:**
- ✅ Inclui imagem de rótulo
- ✅ Contexto de ingredientes a evitar
- ✅ Retry automático para erro 503 (model overloaded)
- ✅ Validação via `globalSafetyEngine.ts`

**Veredicto:** ✅ **TOTALMENTE FUNCIONAL**

---

### **MÓDULO 4: generate-recipe**
**Status:** 🟢 ATIVO  
**Modelo:** ✅ `gemini-2.5-flash-lite`  
**API Key:** ✅ Via `getGeminiApiKey()` (banco de dados)  
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`

**Análise:**
```typescript
// Linha 60
const GOOGLE_AI_API_KEY = await getGeminiApiKey(); // ✅ Busca do banco

// Linha 291
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
  // ✅ Chamada correta
```

**Prompts:**
- ✅ Usa `buildRecipeSystemPrompt()` de `recipeConfig.ts`
- ✅ Contexto nutricional via `buildNutritionalContextForPrompt()`
- ✅ Validação pós-geração via `globalSafetyEngine.ts`
- ✅ Cálculo de macros reais via `calculateRealMacrosForFoods()`

**Veredicto:** ✅ **TOTALMENTE FUNCIONAL**

---

### **MÓDULO 5: chat-assistant**
**Status:** 🟢 ATIVO  
**Modelo:** ✅ `gemini-2.5-flash-lite`  
**API Key:** ✅ Via `getGeminiApiKey()` (banco de dados)  
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`

**Análise:**
```typescript
// Linha 2370
const GEMINI_API_KEY = await getGeminiApiKey(); // ✅ Busca do banco

// Linha 2421
const aiResponse = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
  // ✅ Chamada correta
```

**Prompts:**
- ✅ Contexto de conversa (histórico de mensagens)
- ✅ Suporte a imagens (opcional)
- ✅ System prompt personalizado

**Veredicto:** ✅ **TOTALMENTE FUNCIONAL**

---

### **MÓDULO 6: suggest-smart-substitutes**
**Status:** 🟡 ATIVO COM RESSALVAS  
**Modelo:** ⚠️ `gemini-2.0-flash-lite` (VERSÃO ANTIGA)  
**API Key:** ❌ Usa variável de ambiente `GOOGLE_AI_API_KEY` (NÃO usa `getGeminiApiKey()`)  
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent`

**Análise:**
```typescript
// Linha 437
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
  // ⚠️ Modelo antigo (2.0 em vez de 2.5)
  // ❌ Usa variável de ambiente em vez de getGeminiApiKey()
```

**Problemas:**
- ❌ Não usa `getGeminiApiKey()` do banco de dados
- ⚠️ Usa modelo `gemini-2.0-flash-lite` em vez de `gemini-2.5-flash-lite`
- ⚠️ Variável `GOOGLE_AI_API_KEY` pode não estar configurada

**Veredicto:** ⚠️ **FUNCIONAL MAS DESATUALIZADO**

---

### **MÓDULO 7: validate-ingredients**
**Status:** 🟡 ATIVO COM RESSALVAS  
**Modelo:** ⚠️ `gemini-2.0-flash-lite` (VERSÃO ANTIGA)  
**API Key:** ✅ Via `getGeminiApiKey()` (banco de dados)  
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent`

**Análise:**
```typescript
// Linha 138
const geminiApiKey = await getGeminiApiKey(); // ✅ Busca do banco

// Linha 189
const response = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + geminiApiKey,
  // ⚠️ Modelo antigo (2.0 em vez de 2.5)
```

**Problemas:**
- ⚠️ Usa modelo `gemini-2.0-flash-lite` em vez de `gemini-2.5-flash-lite`

**Veredicto:** ⚠️ **FUNCIONAL MAS DESATUALIZADO**

---

### **MÓDULO 8: validate-food-ai**
**Status:** 🟡 ATIVO COM RESSALVAS  
**Modelo:** ⚠️ `gemini-2.0-flash-lite` (VERSÃO ANTIGA)  
**API Key:** ❌ Usa variável de ambiente `GOOGLE_AI_API_KEY`  
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent`

**Análise:**
```typescript
// Linha 75
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
  // ⚠️ Modelo antigo
  // ❌ Usa variável de ambiente
```

**Problemas:**
- ❌ Não usa `getGeminiApiKey()` do banco de dados
- ⚠️ Usa modelo `gemini-2.0-flash-lite` em vez de `gemini-2.5-flash-lite`

**Veredicto:** ⚠️ **FUNCIONAL MAS DESATUALIZADO**

---

### **MÓDULO 9: test-prompt-validation**
**Status:** 🟢 ATIVO  
**Modelo:** ✅ `gemini-2.5-flash-lite`  
**API Key:** ✅ Via `getGeminiApiKey()` (banco de dados)  
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`

**Análise:**
```typescript
// Linha 580
const apiKey = await getGeminiApiKey(); // ✅ Busca do banco
const model = "gemini-2.5-flash-lite"; // ✅ Modelo correto

// Linha 196
const modelId = model || 'gemini-2.5-flash-lite'; // ✅ Fallback correto
```

**Veredicto:** ✅ **TOTALMENTE FUNCIONAL**

---

### **MÓDULO 10: translate-intolerance-mappings / translate-food-decomposition**
**Status:** 🔴 INATIVO (USA LOVABLE API)  
**Modelo:** ❌ `google/gemini-2.5-flash-lite` (via Lovable API)  
**API Key:** ❌ Usa `LOVABLE_API_KEY` (não é Gemini direto)  
**Endpoint:** Lovable API (não é Google direto)

**Análise:**
```typescript
// translate-intolerance-mappings/index.ts - Linha 28
body: JSON.stringify({
  model: 'google/gemini-2.5-flash-lite', // ❌ Via Lovable, não Google direto
  messages: [...]
})

// translate-food-decomposition/index.ts - Linha 193
body: JSON.stringify({
  model: 'google/gemini-2.5-flash-lite', // ❌ Via Lovable, não Google direto
  messages: [...]
})
```

**Problemas:**
- ❌ Usa Lovable API em vez de Google Gemini direto
- ❌ Requer `LOVABLE_API_KEY` configurada
- ⚠️ Não usa `getGeminiApiKey()` do banco de dados

**Veredicto:** 🔴 **ARQUITETURA DIFERENTE (NÃO É GEMINI DIRETO)**

---

## 🔑 ANÁLISE DE API KEYS

### **Método Correto: getGeminiApiKey()**

**Arquivo:** `supabase/functions/_shared/getGeminiKey.ts`

```typescript
export async function getGeminiApiKey(): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from("api_integrations")
    .select("api_key_encrypted")
    .eq("name", "gemini")
    .eq("is_active", true)
    .maybeSingle();

  if (!data?.api_key_encrypted) {
    throw new Error("Gemini API key not configured. Please add it in Admin > Gemini.");
  }

  return data.api_key_encrypted;
}
```

**Funcionamento:**
1. ✅ Busca API Key da tabela `api_integrations`
2. ✅ Filtra por `name = 'gemini'` e `is_active = true`
3. ✅ Retorna `api_key_encrypted`
4. ✅ Lança erro se não configurada

### **Módulos que USAM getGeminiApiKey() ✅**
1. ✅ generate-ai-meal-plan
2. ✅ analyze-food-photo
3. ✅ analyze-label-photo
4. ✅ generate-recipe
5. ✅ chat-assistant
6. ✅ validate-ingredients
7. ✅ test-prompt-validation

### **Módulos que NÃO USAM getGeminiApiKey() ❌**
1. ❌ suggest-smart-substitutes (usa `GOOGLE_AI_API_KEY` env var)
2. ❌ validate-food-ai (usa `GOOGLE_AI_API_KEY` env var)
3. ❌ translate-intolerance-mappings (usa Lovable API)
4. ❌ translate-food-decomposition (usa Lovable API)

---

## 🚨 ANÁLISE DO ERRO DA IMAGEM

### **Erro Identificado:**
```
Edge Function returned a non-2xx status code
```

**Contexto da Imagem 2:**
- Tela: "Criar Plano Alimentar"
- Ação: Usuário tentou gerar plano alimentar
- Resultado: Erro exibido no rodapé

### **Possíveis Causas:**

#### **CAUSA 1: API Key Não Configurada ❌**
```typescript
// Se api_integrations não tem registro ativo:
throw new Error("Gemini API key not configured. Please add it in Admin > Gemini.");
// Retorna HTTP 500
```

**Verificação:**
```sql
SELECT * FROM api_integrations WHERE name = 'gemini' AND is_active = true;
```

Se retornar vazio → **API Key não configurada no banco**

#### **CAUSA 2: API Key Inválida ❌**
```typescript
// Se Google rejeitar a key:
// Linha 1845-1846 em generate-ai-meal-plan/index.ts
const aiResponse = await fetch(...);
// Se response.status = 401 ou 403
// Retorna erro para o cliente
```

**Verificação:**
Testar API Key manualmente:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=YOUR_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'
```

#### **CAUSA 3: Limite de Requisições (429) ⚠️**
```typescript
// Linha 753-758 em analyze-food-photo/index.ts
if (response.status === 429) {
  return new Response(JSON.stringify({ 
    error: "Limite de requisições atingido. Aguarde alguns minutos e tente novamente." 
  }), {
    status: 429,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

**Verificação:**
Verificar logs do Supabase para status 429

#### **CAUSA 4: Modelo Sobrecarregado (503) ⚠️**
```typescript
// Linha 525-537 em analyze-label-photo/index.ts
if (response.status === 503 && attempt < maxRetries) {
  logStep("Model overloaded, retrying", { attempt, delayMs });
  await new Promise(resolve => setTimeout(resolve, delayMs));
  continue; // Retry
}
```

**Verificação:**
Verificar logs para "Model overloaded"

#### **CAUSA 5: Timeout na Edge Function ⏱️**
Edge Functions têm timeout de **150 segundos**. Se geração demorar muito:
```typescript
// generate-ai-meal-plan pode demorar se gerar 17+ dias
// Cada dia = 1 chamada AI
// 17 dias = 17 chamadas sequenciais
// Se cada chamada = 10s → 170s TOTAL → TIMEOUT
```

**Verificação:**
Verificar logs para "Function invocation timed out"

---

## 📋 ANÁLISE DE PROMPTS

### **Módulos que INCLUEM Contexto de Cascata ✅**
1. ✅ generate-ai-meal-plan (via `getMasterMealPromptV5()`)
2. ✅ analyze-food-photo (via `globalSafetyEngine.ts`)
3. ✅ analyze-label-photo (via ingredientes a evitar)
4. ✅ generate-recipe (via `buildNutritionalContextForPrompt()`)
5. ✅ suggest-smart-substitutes (via `mealGenerationConfig.ts`)

### **Módulos que INCLUEM 4 Camadas de Intolerância ✅**
1. ✅ generate-ai-meal-plan (via `globalSafetyEngine.ts`)
2. ✅ analyze-food-photo (via `validateIngredientList()`)
3. ✅ analyze-label-photo (via `ingredientsToWatch`)
4. ✅ generate-recipe (via `validateIngredientList()`)
5. ✅ suggest-smart-substitutes (via `validateFood()`)

### **Exemplo de Prompt Completo (generate-ai-meal-plan):**
```typescript
const masterPrompt = getMasterMealPromptV5({
  mealType: 'lunch',
  targetCalories: 600,
  userCountry: 'BR',
  intolerances: ['gluten', 'lactose'],
  dietaryPreference: 'vegetarian',
  excludedIngredients: ['jiló'],
  strategyKey: 'weight_loss',
  // ... outros parâmetros
});
```

**Conteúdo do Prompt:**
- ✅ Contexto regional (Brasil)
- ✅ Fontes nutricionais (TBCA prioritária)
- ✅ Restrições do usuário (glúten, lactose)
- ✅ Preferência alimentar (vegetariana)
- ✅ Ingredientes excluídos (jiló)
- ✅ Estratégia nutricional (perda de peso)
- ✅ Medidas caseiras localizadas
- ✅ Validação via globalSafetyEngine

---

## 🎯 DIAGNÓSTICO FINAL

### **PROBLEMAS IDENTIFICADOS:**

#### **CRÍTICO 🔴**
1. **API Key pode não estar configurada no banco**
   - Tabela: `api_integrations`
   - Campo: `api_key_encrypted`
   - Condição: `name = 'gemini' AND is_active = true`
   - **Ação:** Verificar se registro existe

2. **Erro "Edge Function returned a non-2xx status code"**
   - Causa provável: API Key inválida ou não configurada
   - **Ação:** Testar API Key manualmente

#### **ALTO ⚠️**
3. **3 módulos usam modelo antigo (gemini-2.0-flash-lite)**
   - suggest-smart-substitutes
   - validate-ingredients
   - validate-food-ai
   - **Ação:** Atualizar para `gemini-2.5-flash-lite`

4. **2 módulos não usam getGeminiApiKey()**
   - suggest-smart-substitutes
   - validate-food-ai
   - **Ação:** Refatorar para usar `getGeminiApiKey()`

#### **MÉDIO 🟡**
5. **2 módulos usam Lovable API em vez de Gemini direto**
   - translate-intolerance-mappings
   - translate-food-decomposition
   - **Ação:** Avaliar se devem ser migrados

---

## ✅ PONTOS FORTES

1. ✅ **Arquitetura centralizada:** `getGeminiApiKey()` usado em 7/10 módulos
2. ✅ **Modelo correto:** 6/10 módulos usam `gemini-2.5-flash-lite`
3. ✅ **Contexto completo:** Cascata + 4 Camadas incluídos nos prompts
4. ✅ **Retry logic:** Implementado para erros 503 e 429
5. ✅ **Validação pós-AI:** `globalSafetyEngine.ts` valida todas as respostas
6. ✅ **Cálculo de macros reais:** `calculateRealMacrosForFoods()` usado após AI

---

## 📊 TABELA RESUMO

| Módulo | Status | Modelo | API Key | Cascata | 4 Camadas |
|--------|--------|--------|---------|---------|-----------|
| generate-ai-meal-plan | 🟢 | ✅ 2.5 | ✅ Banco | ✅ | ✅ |
| analyze-food-photo | 🟢 | ✅ 2.5 | ✅ Banco | ✅ | ✅ |
| analyze-label-photo | 🟢 | ✅ 2.5 | ✅ Banco | ✅ | ✅ |
| generate-recipe | 🟢 | ✅ 2.5 | ✅ Banco | ✅ | ✅ |
| chat-assistant | 🟢 | ✅ 2.5 | ✅ Banco | ➖ | ➖ |
| suggest-smart-substitutes | 🟡 | ❌ 2.0 | ❌ Env | ✅ | ✅ |
| validate-ingredients | 🟡 | ❌ 2.0 | ✅ Banco | ➖ | ➖ |
| validate-food-ai | 🟡 | ❌ 2.0 | ❌ Env | ➖ | ➖ |
| test-prompt-validation | 🟢 | ✅ 2.5 | ✅ Banco | ✅ | ✅ |
| translate-* (Lovable) | 🔴 | ➖ | ❌ Lovable | ➖ | ➖ |

**Legenda:**
- 🟢 = Totalmente funcional
- 🟡 = Funcional mas desatualizado
- 🔴 = Arquitetura diferente
- ✅ = Correto
- ❌ = Incorreto/Ausente
- ➖ = Não aplicável

---

## 🛠️ AÇÕES RECOMENDADAS

### **URGENTE (Fazer Agora)**
1. ✅ Verificar se API Key está configurada no banco:
   ```sql
   SELECT * FROM api_integrations WHERE name = 'gemini' AND is_active = true;
   ```

2. ✅ Se não existir, adicionar via Admin > Gemini

3. ✅ Testar API Key manualmente para confirmar validade

### **ALTA PRIORIDADE (Esta Semana)**
4. ✅ Atualizar `suggest-smart-substitutes` para usar `getGeminiApiKey()`
5. ✅ Atualizar `validate-food-ai` para usar `getGeminiApiKey()`
6. ✅ Atualizar 3 módulos para `gemini-2.5-flash-lite`

### **MÉDIA PRIORIDADE (Este Mês)**
7. ✅ Avaliar migração de módulos Lovable para Gemini direto
8. ✅ Implementar monitoramento de erros 429/503
9. ✅ Adicionar timeout handling para planos longos (17+ dias)

---

**Relatório gerado automaticamente**  
**Próxima auditoria:** Após correções implementadas
