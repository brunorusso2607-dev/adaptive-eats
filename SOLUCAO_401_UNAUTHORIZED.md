# 🔧 SOLUÇÃO: HTTP 401 Unauthorized

**Problema:** Edge Function retorna erro 401 ao tentar gerar plano alimentar

---

## 🎯 CAUSA RAIZ

**Edge Function exige autenticação mas frontend não passa o token.**

### **Código da Edge Function (linha 1249-1256):**
```typescript
// Auth
const authHeader = req.headers.get("Authorization");
if (!authHeader) throw new Error("No authorization header provided");

const token = authHeader.replace("Bearer ", "");
const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
if (userError) throw new Error(`Authentication error: ${userError.message}`);
const user = userData.user;
if (!user) throw new Error("User not authenticated");
```

**A função EXIGE o header `Authorization` com o token do usuário.**

### **Código do Frontend (linha 163):**
```typescript
const { data, error } = await supabase.functions.invoke("generate-ai-meal-plan", {
  body: {
    planName: finalPlanName,
    startDate: ...,
    daysCount: daysInThisBatch,
    // ... outros parâmetros
  }
});
```

**O frontend NÃO está passando o token de autenticação.**

---

## ✅ SOLUÇÃO

O Supabase client **automaticamente passa o token** quando o usuário está autenticado.

**O problema é que o usuário NÃO está logado ou a sessão expirou.**

---

## 🔍 VERIFICAÇÕES NECESSÁRIAS

### **1. Verificar se usuário está logado:**

```typescript
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('User:', session?.user);
console.log('Access token:', session?.access_token);
```

### **2. Se não houver sessão:**

```typescript
if (!session) {
  toast.error("Você precisa estar logado para gerar planos");
  // Redirecionar para login
  return;
}
```

### **3. Se sessão expirou:**

```typescript
const { data: { session }, error } = await supabase.auth.refreshSession();
if (error) {
  toast.error("Sessão expirada. Faça login novamente.");
  // Redirecionar para login
  return;
}
```

---

## 📝 ARQUIVOS QUE CHAMAM A FUNÇÃO

Todos estes arquivos precisam verificar autenticação:

1. `src/components/MealPlanGenerator.tsx` (linha 163)
2. `src/components/CustomMealPlanBuilder.tsx` (linha 253)
3. `src/components/DuplicatePlanDialog.tsx` (linha 301)
4. `src/pages/TestEdgeFunction.tsx` (linha 20)
5. `src/pages/admin/AdminAIMealPlanTest.tsx` (linha 282)

---

## 🎯 CORREÇÃO RECOMENDADA

### **Opção 1: Verificar sessão antes de chamar (RECOMENDADO)**

```typescript
const handleGeneratePlan = async () => {
  // 1. Verificar autenticação
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    toast.error("Você precisa estar logado para gerar planos");
    // Redirecionar para /auth
    return;
  }
  
  // 2. Chamar função (token é passado automaticamente)
  const { data, error } = await supabase.functions.invoke("generate-ai-meal-plan", {
    body: { ... }
  });
  
  if (error) {
    console.error('Error:', error);
    toast.error("Erro ao gerar plano");
  }
};
```

### **Opção 2: Remover verificação de auth da Edge Function**

**NÃO RECOMENDADO** - Deixaria a função insegura.

---

## 🧪 TESTE

Após implementar a verificação:

1. Fazer logout
2. Tentar gerar plano
3. Deve mostrar erro "Você precisa estar logado"
4. Fazer login
5. Tentar gerar plano novamente
6. Deve funcionar ✅

---

## 📊 RESUMO

| Item | Status |
|------|--------|
| Edge Function | ✅ Funciona (exige auth) |
| Frontend | ❌ Não verifica sessão |
| Solução | Verificar sessão antes de chamar |
| Complexidade | Baixa (5 min) |

---

## 💡 POR QUE ISSO ACONTECEU?

**Você está testando em localhost sem estar logado.**

O Supabase client precisa de uma sessão ativa para passar o token automaticamente.

**Solução imediata:** Faça login no app antes de testar.

**Solução permanente:** Adicionar verificação de sessão no código.
