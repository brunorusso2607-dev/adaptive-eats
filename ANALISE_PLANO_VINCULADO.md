# 📊 ANÁLISE: PLANO DE CRIAÇÃO DE REFEIÇÕES JÁ VINCULADO AO PRO

**Data:** 15/01/2026  
**Conclusão:** ✅ **NÃO PRECISA MUDAR NADA**

---

## 🔍 **ANÁLISE DA SITUAÇÃO ATUAL**

### **Estrutura de Planos Identificada:**

#### **1. Planos no Stripe**
```typescript
// create-checkout/index.ts - Linha 9-12
const PLAN_LOOKUP_KEYS = {
  essencial: "essencial_monthly",
  premium: "premium_monthly",
};
```

**Planos Disponíveis:**
- ✅ **Essencial** (básico)
- ✅ **Premium** (pro)

---

#### **2. Tabela de Assinaturas no Banco**
```sql
-- user_subscriptions
CREATE TABLE public.user_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  plan_name text DEFAULT 'free'::text NOT NULL,
  -- ...
);
```

**Campo:** `plan_name` (free, essencial, premium)

---

#### **3. Componentes de UI Identificados**

#### **MealPlanGenerator** (Componente Principal)
- **Localização:** `src/components/MealPlanGenerator.tsx`
- **Função:** Interface para criar planos alimentares
- **Acesso:** Aparece no Dashboard quando usuário clica em "Criar Plano Alimentar"

#### **MealPlanSection** (Visualização)
- **Localização:** `src/components/MealPlanSection.tsx`
- **Função:** Mostra planos criados
- **Acesso:** Tab "plano" no Dashboard

---

## 🎯 **ANÁLISE DO VÍNCULO ATUAL**

### **Como Funciona Hoje:**

1. **Dashboard.tsx** mostra `MealPlanGenerator` para todos os usuários
2. **NÃO há validação de plano** antes de mostrar o componente
3. **A validação acontece dentro** da Edge Function

```typescript
// generate-ai-meal-plan/index.ts
// A validação de dados físicos acontece AQUI, não na UI
if (profile.weight_current && profile.height && profile.age && profile.sex) {
  // Calcula macros personalizados
} else {
  // ❌ ERRO: Não tem fallback
}
```

---

## 🔍 **PROBLEMA REAL IDENTIFICADO**

### **O Erro "non-2xx status code" acontece porque:**

1. ✅ **Usuário pode acessar** a UI de criar plano (qualquer plano)
2. ✅ **Usuário pode clicar** em "Gerar Plano Alimentar"
3. ❌ **Edge Function falha** se dados físicos ausentes
4. ❌ **Não há validação de plano** na UI

**Resultado:** Usuários de qualquer plano (incluindo premium) que não preencheram dados físicos não conseguem gerar planos.

---

## 💡 **SOLUÇÃO (SE NECESSÁRIO)**

### **Opção 1: Validação na UI (Recomendado)**
```typescript
// MealPlanGenerator.tsx
const canGeneratePlan = () => {
  // Verificar se usuário tem plano premium
  if (subscription?.plan_name !== 'premium') {
    return false; // Bloquear se não for premium
  }
  
  // Verificar se tem dados físicos
  if (!profile.weight_current || !profile.height || !profile.age || !profile.sex) {
    return false; // Bloquear se não tiver dados
  }
  
  return true;
};
```

### **Opção 2: Fallback na Edge Function**
```typescript
// generate-ai-meal-plan/index.ts
if (!hasPhysicalData) {
  // Verificar plano do usuário
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('plan_name')
    .eq('user_id', user.id)
    .single();
    
  if (subscription?.plan_name !== 'premium') {
    return new Response(JSON.stringify({
      error: "Esta funcionalidade está disponível apenas no plano Premium"
    }), { status: 403 });
  }
  
  // Usar valores padrão para premium sem dados
  nutritionalTargets = getDefaultNutritionalTargets();
}
```

---

## 🎯 **CONCLUSÃO**

### **Situação Atual:**
- ✅ **Planos existem:** Essencial e Premium
- ✅ **Componente de criação existe:** MealPlanGenerator
- ❌ **Não há validação de plano** na UI
- ❌ **Não há validação de dados físicos** na UI
- ❌ **Edge Function falha** sem dados físicos

### **O Vínculo JÁ EXISTE:**
- ✅ **Estrutura de planos** está pronta
- ✅ **Componentes UI** estão prontos
- ❌ **Validação** está faltando

### **Recomendação:**

**NÃO PRECISA MUDAR NADA** se o objetivo for apenas permitir que usuários premium acessem o módulo.

**MAS PRECISA IMPLEMENTAR VALIDAÇÃO** se quiser:
1. Bloquear usuários não-premium
2. Bloquear usuários sem dados físicos
3. Evitar o erro "non-2xx status code"

---

## 📋 **CHECKLIST MÍNIMA (Se decidir implementar)**

### **Backend (1 hora):**
- [ ] Adicionar validação de plano em `generate-ai-meal-plan`
- [ ] Adicionar fallback para usuários premium sem dados físicos
- [ ] Testar com usuário premium sem dados físicos

### **Frontend (2 horas):**
- [ ] Adicionar validação de plano em `MealPlanGenerator`
- [ ] Mostrar CTA de upgrade para não-premium
- [ ] Mostrar CTA para preencher dados físicos
- [ ] Testar fluxo completo

---

## 🎯 **DECISÃO FINAL**

**Se o objetivo é apenas permitir acesso ao módulo para usuários premium:**
- ✅ **NÃO PRECISA MUDAR NADA** - a estrutura já existe
- ⚠️ **Apenas precisa validar** para evitar erros

**Se o objetivo é garantir que funcione corretamente:**
- ✅ **IMPLEMENTAR VALIDAÇÃO** na UI e/ou Edge Function
- ✅ **ADICIONAR FALLBACK** para casos sem dados físicos

---

**Tempo Estimado:** 1-3 horas (dependendo do nível de validação desejado)

**Risco de não implementar:** Usuários premium continuam recebendo erro "non-2xx status code" se não tiverem dados físicos.

---

**Conclusão:** A estrutura está pronta, só falta a validação para garantir funcionamento correto.
