# 🔍 COMO VERIFICAR LOGS DO POPULATE-MEAL-POOL

## 📋 ACESSO AOS LOGS

1. Vá em: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/logs/edge-functions
2. Filtre por: `populate-meal-pool`
3. Veja o último log (execution_id: `3d702f17-0407-428c-aeb7-3436c9f53223`)

## 🎯 O QUE PROCURAR

Procure por estas mensagens nos logs:

```
[MEAL-POOL] === POPULATE MEAL POOL STARTED ===
[MEAL-POOL] Request method
[MEAL-POOL] Environment check
[MEAL-POOL] Starting meal pool generation
[MEAL-POOL] Calling Gemini API
```

## 📊 POSSÍVEIS ERROS

### **Se aparecer:**
- `ERROR: LOVABLE_API_KEY not configured` → Ainda usando código antigo
- `AI returned empty content` → Problema na resposta do Gemini
- `Invalid JSON` → Problema no parse da resposta
- `Authentication error` → Problema com Gemini API Key

## 🚀 AÇÃO NECESSÁRIA

**Por favor, copie e cole aqui:**
1. O log completo do erro (texto)
2. Ou tire um screenshot da tela de logs

Isso vai me mostrar exatamente onde está falhando.
