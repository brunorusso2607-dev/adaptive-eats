# DEPLOY DA EDGE FUNCTION - CORREÇÃO DE INTERNACIONALIZAÇÃO

## 🚨 SITUAÇÃO ATUAL

**Mudanças feitas localmente:**
- ✅ SMART_TEMPLATES renomeados para inglês (commit 219c57d)
- ✅ MEAL_TYPE_MAP removido
- ✅ Código corrigido

**MAS:** Edge Function no Supabase ainda está com código antigo!

---

## 📋 MUDANÇAS QUE PRECISAM SER DEPLOYADAS

### **Arquivos modificados:**
1. `supabase/functions/_shared/meal-templates-smart.ts`
   - SMART_TEMPLATES com chaves em inglês

2. `supabase/functions/generate-ai-meal-plan/index.ts`
   - MEAL_TYPE_MAP removido
   - Uso direto de meal.type

---

## 🚀 COMO FAZER O DEPLOY

### **OPÇÃO 1: Deploy via Supabase CLI (RECOMENDADO)**

```bash
# 1. Navegar para a pasta do projeto
cd c:\adaptive-eats-main

# 2. Login no Supabase (se necessário)
supabase login

# 3. Link com o projeto (se necessário)
supabase link --project-ref [seu-project-ref]

# 4. Deploy da função específica
supabase functions deploy generate-ai-meal-plan

# 5. Verificar se deploy foi bem-sucedido
# Checar logs no dashboard do Supabase
```

### **OPÇÃO 2: Deploy via Dashboard do Supabase**

1. Acessar: https://supabase.com/dashboard
2. Selecionar projeto
3. Ir em "Edge Functions"
4. Selecionar "generate-ai-meal-plan"
5. Clicar em "Deploy new version"
6. Fazer upload dos arquivos modificados

---

## ⚠️ IMPORTANTE

**Até fazer o deploy, o sistema continuará usando código antigo:**
- ❌ SMART_TEMPLATES com chaves em português
- ❌ MEAL_TYPE_MAP ainda presente
- ❌ Fallback pulando para IA

**Após o deploy:**
- ✅ SMART_TEMPLATES com chaves em inglês
- ✅ Sem MEAL_TYPE_MAP
- ✅ Fallback funcionando: Pool → Direto → IA

---

## 🔍 VERIFICAR SE DEPLOY FOI BEM-SUCEDIDO

### **1. Checar versão no dashboard:**
- Ir em Edge Functions
- Ver número da versão (deve ser maior que atual)
- Ver timestamp (deve ser recente)

### **2. Testar geração de refeição:**
- Excluir pool (para forçar fallback)
- Gerar novo plano
- Verificar se usa geração direta (não IA)

### **3. Checar logs:**
```
Logs devem mostrar:
✅ NÍVEL 2: Trying direct generation
✅ Direct generation SUCCESS
❌ NÃO deve mostrar: "No templates for meal type: breakfast"
```

---

## 📊 COMANDOS ÚTEIS

```bash
# Ver funções deployadas
supabase functions list

# Ver logs em tempo real
supabase functions logs generate-ai-meal-plan

# Deploy com logs verbosos
supabase functions deploy generate-ai-meal-plan --debug

# Testar função localmente antes de deploy
supabase functions serve generate-ai-meal-plan
```

---

## 🎯 PRÓXIMOS PASSOS

1. **Fazer deploy da edge function**
2. **Verificar logs no Supabase**
3. **Testar geração de refeição**
4. **Confirmar que fallback está funcionando**

---

## 📝 NOTA

**Este deploy é CRÍTICO** porque corrige:
- Bug do fallback (pulava para IA)
- Arquitetura de internacionalização
- Escalabilidade para outros países
