# 🔍 DEBUG: Erro no Teste do Stripe

## ❌ Erro Recebido:
```
Edge Function returned a non-2xx status code
```

## 🎯 Possíveis Causas:

1. **STRIPE_SECRET_KEY não configurada** no Supabase
2. **Erro ao criar checkout session** no Stripe
3. **Price ID inválido** ou produto não encontrado
4. **CORS ou permissões** da função

## 🔧 Como Verificar:

### 1. Verificar Logs da Função:
- Acesse: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/functions
- Clique em: `create-test-checkout`
- Veja os logs para o erro exato

### 2. Verificar STRIPE_SECRET_KEY:
- Acesse: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/settings/functions
- Vá em: Edge Functions → Secrets
- Confirme que `STRIPE_SECRET_KEY` está configurada

### 3. Testar Diretamente:
```bash
curl -X POST "https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/create-test-checkout" \
  -H "Content-Type: application/json"
```

## 🎯 Próximos Passos:
1. Verificar logs da função no Supabase
2. Confirmar STRIPE_SECRET_KEY está configurada
3. Testar Price ID no Stripe Dashboard
