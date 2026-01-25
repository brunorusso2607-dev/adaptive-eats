# 🎯 CONFIGURAÇÃO STRIPE - COMPLETA

## ✅ **O QUE FOI FEITO**

### **1. Banco de Dados Atualizado:**
- ✅ Adicionadas 4 colunas na tabela `user_subscriptions`:
  - `stripe_customer_id` - ID do cliente no Stripe (cus_xxx)
  - `stripe_subscription_id` - ID da assinatura no Stripe (sub_xxx)
  - `stripe_price_id` - ID do preço/plano no Stripe (price_xxx)
  - `stripe_product_id` - ID do produto no Stripe (prod_xxx)
- ✅ Criados índices para melhor performance
- ✅ Adicionados comentários de documentação

### **2. TypeScript Types Atualizados:**
- ✅ Arquivo `src/integrations/supabase/types.ts` atualizado
- ✅ Tipos `Row`, `Insert` e `Update` incluem novos campos
- ✅ TypeScript reconhece as novas colunas

### **3. Webhook do Stripe Atualizado:**
- ✅ Salva `stripe_customer_id` quando checkout completa
- ✅ Salva `stripe_subscription_id` quando subscription é criada
- ✅ Salva `stripe_price_id` e `stripe_product_id` nos eventos
- ✅ Deploy feito com sucesso

---

## 🔧 **PRÓXIMOS PASSOS (MANUAL)**

### **📍 1. Configurar Webhook no Stripe Dashboard:**

1. **Acesse:** https://dashboard.stripe.com/webhooks
2. **Clique em:** "Add endpoint"
3. **URL do Webhook:**
   ```
   https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/stripe-webhook
   ```
4. **Selecione os eventos:**
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

5. **Copie o Webhook Secret** (começa com `whsec_...`)

---

### **📍 2. Adicionar Webhook Secret no Supabase:**

1. **Acesse:** https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/settings/functions
2. **Vá em:** Edge Functions → Secrets
3. **Adicione:**
   - **Nome:** `STRIPE_WEBHOOK_SECRET`
   - **Valor:** `whsec_...` (copiado do Stripe)

---

### **📍 3. Verificar Variáveis de Ambiente:**

Certifique-se que tem configurado:
- ✅ `STRIPE_SECRET_KEY` (sk_live_... ou sk_test_...)
- ✅ `STRIPE_WEBHOOK_SECRET` (whsec_...)
- ✅ `STRIPE_PUBLISHABLE_KEY` (pk_live_... ou pk_test_...) - para frontend

---

## 🎯 **COMO FUNCIONA AGORA**

### **Fluxo Completo:**

1. **Cliente paga no Stripe** → Checkout Session criada
2. **Stripe dispara webhook** → `checkout.session.completed`
3. **Webhook recebe evento** → Valida assinatura
4. **Busca usuário por email** → `profiles.email`
5. **Salva no banco:**
   ```sql
   user_subscriptions:
   - user_id
   - is_active = true
   - plan_name = "premium"
   - stripe_customer_id = "cus_xxx"
   - stripe_subscription_id = "sub_xxx"
   - stripe_price_id = "price_xxx"
   - stripe_product_id = "prod_xxx"
   - expires_at = data de expiração
   ```

### **Vantagens:**
- ✅ **Relacionamento forte** entre Stripe ↔ Supabase
- ✅ **Busca rápida** por customer_id ou subscription_id
- ✅ **Sincronização automática** via webhooks
- ✅ **Rastreamento completo** de pagamentos

---

## 🔍 **DIFERENÇA: USUÁRIOS vs CLIENTES vs ADMINS**

### **1. Usuários (Todos):**
- Tabela: `auth.users` + `profiles`
- Subscription: Pode ter ou não
- Acesso: Funcionalidades básicas

### **2. Clientes (Pagantes):**
- Tabela: `user_subscriptions` com `is_active = true`
- Stripe: Tem `stripe_customer_id` preenchido
- Acesso: Funcionalidades premium (R$ 297/ano)

### **3. Administradores:**
- Tabela: `user_roles` com `role = 'admin'`
- Stripe: **NÃO passam pelo Stripe** (sem cobrança)
- Subscription: Pode ter `is_active = true` sem Stripe IDs
- Acesso: Painel admin + todas funcionalidades

---

## 📊 **QUERIES ÚTEIS**

### **Ver todos os clientes pagantes:**
```sql
SELECT 
  p.email,
  us.plan_name,
  us.is_active,
  us.stripe_customer_id,
  us.expires_at
FROM user_subscriptions us
JOIN profiles p ON p.id = us.user_id
WHERE us.is_active = true
  AND us.stripe_customer_id IS NOT NULL;
```

### **Ver admins (sem Stripe):**
```sql
SELECT 
  p.email,
  ur.role
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin';
```

### **Ver subscription de um usuário específico:**
```sql
SELECT * FROM user_subscriptions
WHERE user_id = 'uuid-do-usuario';
```

---

## ✅ **STATUS FINAL**

**Configuração do Stripe: 90% COMPLETA**

### **✅ Feito:**
- Banco de dados atualizado
- TypeScript types atualizados
- Webhook atualizado e deployado
- Lógica de salvamento de IDs implementada

### **⏳ Falta (Manual):**
- Configurar webhook no Stripe Dashboard
- Adicionar STRIPE_WEBHOOK_SECRET no Supabase
- Testar pagamento real

---

## 🚀 **PRÓXIMO PASSO**

**Configure o webhook no Stripe Dashboard seguindo as instruções acima!**

Depois de configurar, teste fazendo um pagamento de teste e verifique se os dados aparecem corretamente na tabela `user_subscriptions`.
