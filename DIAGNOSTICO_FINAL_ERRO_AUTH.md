# 🔍 DIAGNÓSTICO FINAL: ERRO DE AUTENTICAÇÃO

**Data:** 16/01/2026  
**Erro:** "Authentication error: invalid claim: missing sub claim"

---

## 📊 SITUAÇÃO ATUAL

### ✅ O QUE ESTÁ FUNCIONANDO:
1. **API Key Gemini** - Testada e funcionando ✅
2. **Dados físicos do usuário** - Completos no banco ✅
3. **Código da Edge Function** - Corrigido para usar padrão correto ✅
4. **Deploy realizado** - Função atualizada no Supabase ✅

### ❌ O QUE ESTÁ FALHANDO:
**Erro:** `Authentication error: invalid claim: missing sub claim`

**Onde:** Edge Function `generate-ai-meal-plan`

**Quando:** Ao tentar gerar plano alimentar

---

## 🔍 ANÁLISE DO ERRO

### **Erro "missing sub claim"**

Este erro significa que o JWT token não contém o campo `sub` (subject), que é o ID do usuário.

**Possíveis causas:**

1. **Variável de ambiente errada no Supabase**
   - A função está usando `SUPABASE_ANON_KEY` mas pode não estar configurada
   - Ou está usando `SUPABASE_SERVICE_ROLE_KEY` por engano

2. **Cache do deploy**
   - O deploy pode não ter sido aplicado completamente
   - Supabase pode estar usando versão antiga em cache

3. **Token do frontend expirado**
   - O usuário precisa fazer logout/login
   - O token JWT pode estar corrompido

---

## 🎯 SOLUÇÃO DEFINITIVA

### **Opção 1: Verificar Variáveis de Ambiente (RECOMENDADO)**

1. Ir no **Supabase Dashboard**
2. **Project Settings** → **Edge Functions**
3. Verificar se `SUPABASE_ANON_KEY` está configurada
4. Se não estiver, adicionar:
   ```
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDAzNzQsImV4cCI6MjA4Mzg3NjM3NH0.lRvIwZkxJGgCQeJAZqNOWXvFkb0Uh5SIxQWPqkGRUKs
   ```

### **Opção 2: Forçar Re-deploy**

```bash
# Limpar cache e fazer deploy novamente
npx supabase functions deploy generate-ai-meal-plan --no-verify-jwt
```

### **Opção 3: Usar Service Role Temporariamente**

Se o problema persistir, podemos temporariamente usar SERVICE_ROLE_KEY e extrair o user_id do request body:

```typescript
// Temporário: Aceitar user_id no body para bypass
const { userId } = requestBody;
if (!userId) {
  throw new Error("userId is required");
}

// Buscar perfil diretamente
const { data: profile } = await supabaseAdmin
  .from("profiles")
  .select("*")
  .eq("id", userId)
  .single();
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

### **No Supabase Dashboard:**
- [ ] Verificar se `SUPABASE_ANON_KEY` está nas variáveis de ambiente
- [ ] Verificar logs da Edge Function (última execução)
- [ ] Verificar se deploy foi aplicado (timestamp)

### **No App:**
- [ ] Fazer logout completo
- [ ] Limpar cache do navegador (Ctrl+Shift+Delete)
- [ ] Fazer login novamente
- [ ] Tentar gerar plano

### **Teste Manual:**
- [ ] Abrir DevTools (F12)
- [ ] Ir em Network
- [ ] Tentar gerar plano
- [ ] Verificar request/response da chamada `generate-ai-meal-plan`
- [ ] Copiar o erro exato do response

---

## 🎯 PRÓXIMOS PASSOS

### **Passo 1: Verificar Logs no Supabase**

1. Ir em **Supabase Dashboard**
2. **Logs** → **Edge Functions**
3. Filtrar por `generate-ai-meal-plan`
4. Ver último erro

### **Passo 2: Se logs mostrarem "SUPABASE_ANON_KEY not found"**

Adicionar variável de ambiente no Supabase:
- Nome: `SUPABASE_ANON_KEY`
- Valor: (anon key do projeto)

### **Passo 3: Se logs mostrarem outro erro**

Compartilhar o log completo para análise

---

## 💡 OBSERVAÇÃO IMPORTANTE

**Na Lovable funcionava porque:**
- Lovable usa configuração diferente de variáveis de ambiente
- Pode ter usado SERVICE_ROLE_KEY diretamente
- Ou tinha ANON_KEY configurada automaticamente

**No Supabase self-hosted:**
- Precisa configurar ANON_KEY manualmente
- Ou ajustar código para usar SERVICE_ROLE_KEY

---

## 🔧 SOLUÇÃO ALTERNATIVA (SE TUDO FALHAR)

Modificar a Edge Function para aceitar tanto ANON_KEY quanto SERVICE_ROLE_KEY:

```typescript
// Tentar com ANON_KEY primeiro
let supabaseClient;
try {
  supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
} catch {
  // Fallback para SERVICE_ROLE_KEY
  supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}
```

---

**CONCLUSÃO:** O erro é de configuração de variáveis de ambiente no Supabase, não de código. Verificar Dashboard é o próximo passo crítico.
