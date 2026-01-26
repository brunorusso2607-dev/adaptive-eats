# DEBUG - EDGE FUNCTION ERROR

## 🚨 ERRO REPORTADO

**Mensagem:** "Edge Function returned a non-2xx status code"

**Contexto:** Após deploy da correção de internacionalização

---

## 🔍 POSSÍVEIS CAUSAS

### **CAUSA 1: Erro de Sintaxe no Deploy** ⭐⭐⭐⭐⭐

Possível erro de sintaxe no código TypeScript que passou despercebido.

**Verificar:**
- Imports corretos
- Sintaxe TypeScript válida
- Todas as dependências disponíveis

### **CAUSA 2: SMART_TEMPLATES Não Encontrado** ⭐⭐⭐⭐

Edge Function pode não estar encontrando `SMART_TEMPLATES` após renomeação.

**Verificar:**
- Import de `meal-templates-smart.ts` correto
- Arquivo deployado corretamente
- Chaves em inglês acessíveis

### **CAUSA 3: Timeout ou Erro de Execução** ⭐⭐⭐

Função pode estar crashando durante execução.

**Verificar:**
- Logs no dashboard do Supabase
- Tempo de execução
- Erros de runtime

### **CAUSA 4: Variáveis de Ambiente** ⭐⭐

Falta de variáveis de ambiente necessárias.

**Verificar:**
- GEMINI_API_KEY configurada
- SUPABASE_URL e SUPABASE_ANON_KEY

---

## 🔧 COMO DEBUGAR

### **1. Verificar Logs no Dashboard**

Acessar: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/functions/generate-ai-meal-plan/logs

Procurar por:
- ❌ Erros de sintaxe
- ❌ Erros de import
- ❌ Erros de runtime
- ❌ Stack traces

### **2. Testar Localmente**

```bash
# Servir função localmente
supabase functions serve generate-ai-meal-plan

# Testar com curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/generate-ai-meal-plan' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"days": 1}'
```

### **3. Verificar Arquivos Deployados**

```bash
# Listar funções
supabase functions list

# Ver detalhes da função
supabase functions inspect generate-ai-meal-plan
```

---

## 🎯 SOLUÇÃO MAIS PROVÁVEL

**Hipótese:** Erro de import ou sintaxe no arquivo `meal-templates-smart.ts`

**Possível problema:**
- Renomeamos chaves mas pode ter ficado alguma referência antiga
- Import path incorreto
- Sintaxe TypeScript inválida

**Verificar:**
1. Se `SMART_TEMPLATES` está sendo exportado corretamente
2. Se não há referências a chaves antigas (cafe_manha, almoco, etc)
3. Se import em `advanced-meal-generator.ts` está correto

---

## 🚀 PRÓXIMOS PASSOS

1. **Acessar dashboard do Supabase**
2. **Ver logs da última execução**
3. **Identificar erro específico**
4. **Corrigir e fazer novo deploy**

---

## 📝 COMANDOS ÚTEIS

```bash
# Ver status das funções
supabase functions list

# Testar localmente
supabase functions serve

# Deploy com debug
supabase functions deploy generate-ai-meal-plan --debug

# Ver logs (no dashboard)
# https://supabase.com/dashboard/project/[project-id]/functions/[function-name]/logs
```
