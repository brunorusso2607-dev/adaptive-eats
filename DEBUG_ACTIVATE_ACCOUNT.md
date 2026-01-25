# 🔍 DEBUG: Erro na Ativação de Conta

## ❌ Erro Recebido:
```
Edge Function returned a non-2xx status code
```

## 📋 Informações:
- **Email usado:** brunorusso@gmail.com
- **Nome:** Bruno
- **SessionId:** Deve ter sido passado da URL

## 🎯 Verificações Necessárias:

### 1. Verificar se o customer foi criado no Stripe:
- Acesse: https://dashboard.stripe.com/test/customers
- Busque por: brunorusso@gmail.com
- Verifique se o customer existe

### 2. Verificar se o email foi atualizado no customer:
- O customer foi criado vazio
- O email deve ter sido preenchido no checkout
- Verifique se o customer tem o email correto

### 3. Verificar logs da função activate-account:
- Acesse: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/functions
- Clique em: `activate-account`
- Veja os logs do erro

## 🔧 Possíveis Causas:

1. **Customer sem email:** O customer foi criado vazio e o Stripe não atualizou com o email do checkout
2. **SessionId inválido:** O sessionId não está sendo passado corretamente
3. **Stripe API error:** Erro ao buscar customer ou subscription no Stripe

## 🎯 Próximos Passos:

1. Verificar logs da função activate-account
2. Verificar se o customer no Stripe tem o email
3. Verificar se a subscription foi criada
