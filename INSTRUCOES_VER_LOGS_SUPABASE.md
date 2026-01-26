# INSTRUÇÕES: VERIFICAR LOGS REAIS DO SUPABASE

## 🔍 PARA VER O ERRO REAL:

1. Acesse: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/logs/edge-functions

2. Selecione a função: **populate-meal-pool**

3. Clique em "Gerar com IA" no painel admin

4. Volte para os logs e veja o erro completo

5. **Copie e cole aqui o erro exato que aparece nos logs**

---

## OU EXECUTE ESTE COMANDO:

```bash
# No terminal do Supabase Dashboard, execute:
SELECT * FROM edge_runtime.logs 
WHERE function_name = 'populate-meal-pool' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

**Preciso ver o erro REAL dos logs para corrigir o problema correto!**
