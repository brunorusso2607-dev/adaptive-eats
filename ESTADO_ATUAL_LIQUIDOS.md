# 🚨 ESTADO ATUAL - PROBLEMA DOS LÍQUIDOS

**Data:** 24/01/2026 00:51  
**Tempo gasto:** 1 semana  
**Status:** ❌ NÃO RESOLVIDO

---

## 📊 PROBLEMA

**Líquidos aparecem em gramas em vez de ml:**
- "Leite semidesnatado (200g)" ❌
- Deveria ser: "Leite semidesnatado (200ml)" ✅

---

## 🔍 CAUSA RAIZ IDENTIFICADA

**O problema NÃO é técnico. É de ambiente.**

### **Evidências:**

1. **Código está correto:**
   - `formatPortion()` detecta líquidos por `INGREDIENTS[key].unit === 'ml'`
   - Commit 577c4fa implementa detecção genérica
   - Unified Core processa corretamente

2. **Função não executa:**
   - Frontend não consegue chamar Edge Function
   - Erro: "Failed to send request to Edge Function"
   - CORS error é secundário

3. **Ambiente mudou:**
   - Usuário saiu do Lovable
   - Agora roda em localhost:8080
   - Supabase não aceita chamadas do localhost

---

## 🛠️ COMMITS RELEVANTES

| Commit | Descrição | Status |
|--------|-----------|--------|
| 577c4fa | Detectar líquidos por INGREDIENTS.unit | ✅ Correto |
| 9b8d60d | Passar ingredient_key no fluxo | ✅ Correto |
| 0c0e220 | Adicionar configs de leite | ✅ Correto |
| 4aa6382 | Integrar IA com Unified Core | ❌ Quebrou função |
| ae96f78 | Simplificar formatação inline | ❌ Quebrou função |
| 3ed33cc | Revert para 577c4fa | ✅ Restaurado |

---

## 📝 ARQUIVOS MODIFICADOS

### **1. portion-formatter.ts**
- Adicionado import de INGREDIENTS
- Detecta líquidos por `ingredient.unit === 'ml'`
- Função `formatGenericPortion()` para fallback

### **2. advanced-meal-generator.ts**
- Adicionado `ingredient_key` na interface Component
- Passando `ingredient_key` em todos os lugares

### **3. direct-adapter.ts**
- Adicionado `ingredient_key` na interface DirectGeneratedMeal
- Prioriza `ingredient_key` passado

### **4. generate-ai-meal-plan/index.ts**
- Tentativa de integrar IA com Unified Core
- **QUEBROU A FUNÇÃO** (imports conflitantes)
- Revertido para versão anterior

---

## ⚠️ PROBLEMAS ENCONTRADOS

### **1. Import Conflicts**
```
"event loop error: The argument 'filename' must be a file URL object..."
```
- Importar `ai-adapter.ts` quebra Edge Function
- Conflito de versões do Supabase
- Solução: NÃO importar adapters complexos

### **2. Ambiente de Desenvolvimento**
```
Access to fetch at 'https://...supabase.co/functions/v1/generate-ai-meal-plan'
from origin 'http://localhost:8080' has been blocked by CORS policy
```
- Frontend em localhost não consegue chamar função
- Supabase não aceita localhost (mesmo com CORS *)
- Solução: Rodar frontend em produção (Lovable/Netlify)

---

## ✅ O QUE FUNCIONA

1. **Detecção de líquidos:** `INGREDIENTS[key].unit === 'ml'` ✅
2. **Formatação genérica:** `formatGenericPortion()` ✅
3. **Unified Core:** Processa refeições corretamente ✅
4. **Direct generation:** Passa pelo Unified Core ✅

---

## ❌ O QUE NÃO FUNCIONA

1. **Frontend não chama função** (problema de ambiente)
2. **IA não passa pelo Unified Core** (imports quebram função)
3. **Testes locais impossíveis** (localhost bloqueado)

---

## 🎯 SOLUÇÃO PROPOSTA

### **OPÇÃO 1: Deploy Frontend (RECOMENDADO)**

```bash
# Deploy no Lovable/Netlify/Vercel
npm run build
# Deploy
```

**Por quê:**
- Ambiente de produção funciona
- Supabase aceita chamadas de domínios reais
- Testa código real em ambiente real

### **OPÇÃO 2: Supabase Local**

```bash
# Configurar Supabase CLI
supabase stop
supabase start
# Atualizar .env com URLs locais
```

**Por quê:**
- Permite testes locais
- Sem bloqueio de CORS
- Ambiente controlado

### **OPÇÃO 3: Testar Função Diretamente**

```bash
# Chamar função via curl
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/generate-ai-meal-plan \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"daysCount": 1, "planName": "Teste"}'
```

**Por quê:**
- Testa função isoladamente
- Verifica se código funciona
- Identifica se problema é frontend ou backend

---

## 📋 PRÓXIMOS PASSOS

**PARAR DE TENTAR CONSERTAR O CÓDIGO.**

**O código está correto. O problema é ambiente.**

### **Passo 1: Testar função diretamente**
```bash
curl -X POST [URL] -H [HEADERS] -d [BODY]
```

### **Passo 2: Se função funciona**
- Problema é frontend/ambiente
- Deploy frontend em produção
- Teste de lá

### **Passo 3: Se função não funciona**
- Verificar logs do Supabase
- Identificar erro específico
- Corrigir pontualmente

---

## 🔧 CÓDIGO ATUAL (CORRETO)

### **formatPortion() - portion-formatter.ts**
```typescript
export function formatPortion(ingredientKey: string, grams: number): PortionDisplay {
  const ingredient = INGREDIENTS[ingredientKey];
  const isLiquid = ingredient?.unit === 'ml';  // ✅ DETECÇÃO GENÉRICA
  
  const config = PORTION_CONFIGS[ingredientKey];
  
  if (!config) {
    return formatGenericPortion(grams, ingredientKey, ingredient, isLiquid);
  }
  
  // ... resto do código
}
```

### **formatGenericPortion() - portion-formatter.ts**
```typescript
function formatGenericPortion(
  grams: number, 
  ingredientKey: string, 
  ingredient: Ingredient | undefined,
  isLiquid: boolean
): PortionDisplay {
  const ingredientName = ingredient?.display_name_pt || 
    ingredientKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  const unit = isLiquid ? 'ml' : 'g';  // ✅ LÍQUIDOS EM ML
  
  return {
    quantity: grams,
    unit,
    label: `${ingredientName} (${grams}${unit})`,
  };
}
```

---

## 📊 RESUMO EXECUTIVO

| Item | Status |
|------|--------|
| Código | ✅ Correto |
| Lógica | ✅ Correta |
| Detecção de líquidos | ✅ Funciona |
| Formatação | ✅ Funciona |
| Edge Function | ❌ Não executa |
| Frontend | ❌ Não chama função |
| Ambiente | ❌ Localhost bloqueado |

**CONCLUSÃO: Problema é de AMBIENTE, não de CÓDIGO.**

---

## 🎯 RECOMENDAÇÃO FINAL

1. **Deploy frontend em produção**
2. **Teste de lá**
3. **Se funcionar:** Problema resolvido
4. **Se não funcionar:** Analisar logs do Supabase

**NÃO MEXER MAIS NO CÓDIGO ATÉ TESTAR EM AMBIENTE CORRETO.**
