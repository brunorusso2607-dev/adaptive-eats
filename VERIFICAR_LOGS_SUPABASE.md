# 🔍 COMO VERIFICAR LOGS NO SUPABASE DASHBOARD

## 📋 PASSO A PASSO

### **1. Acesse os Logs**
1. Vá em: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/logs/edge-functions
2. Ou navegue: **Dashboard** → **Logs** → **Edge Functions**

### **2. Filtre pela Função**
- No campo de busca, digite: `generate-ai-meal-plan`
- Ou selecione a função no dropdown

### **3. Tente Gerar o Plano no App**
- Vá no app e clique em "Gerar Plano Alimentar"
- Aguarde o erro aparecer

### **4. Volte aos Logs e Atualize**
- Clique em "Refresh" ou F5
- Veja o último log de erro

### **5. Procure por Estas Mensagens**
```
[AI-MEAL-PLAN] Environment check - {...}
[AI-MEAL-PLAN] Supabase client created, attempting getUser()...
[AI-MEAL-PLAN] ERROR: Authentication failed - {...}
```

### **6. Copie o Log Completo**
- Clique no log de erro
- Copie todo o texto
- Cole aqui para eu analisar

---

## 🎯 O QUE ESTOU PROCURANDO

Os logs vão mostrar:
- ✅ Se `SUPABASE_ANON_KEY` está carregada
- ✅ Se `SUPABASE_URL` está correta
- ✅ Qual erro exato está acontecendo
- ✅ Em que linha do código está falhando

---

## 📸 ALTERNATIVA: SCREENSHOT

Se preferir, tire um screenshot da tela de logs e me envie.
