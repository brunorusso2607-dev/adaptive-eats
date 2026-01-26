# 🎯 PLANO DE DESACOPLAMENTO: DADOS FÍSICOS (PREMIUM) vs CORE INTOLERÂNCIAS (FREE)

**Data:** 15/01/2026  
**Objetivo:** Separar funcionalidades premium (cálculo de macros) do core gratuito (intolerâncias)

---

## 📊 ANÁLISE DA ARQUITETURA ATUAL

### **🔴 PROBLEMA IDENTIFICADO**

Atualmente, o sistema **EXIGE** dados físicos para gerar planos alimentares:

```typescript
// generate-ai-meal-plan/index.ts - Linha 1398
if (profile.weight_current && profile.height && profile.age && profile.sex) {
  // Calcula macros personalizados
  nutritionalTargets = calculateNutritionalTargets(physicalData, strategyParams);
} else {
  // ❌ SEM DADOS FÍSICOS = ERRO NA GERAÇÃO
  // Sistema não tem fallback
}
```

**Resultado:** Usuários free não conseguem gerar planos alimentares.

---

## 🎯 OBJETIVO DA REFATORAÇÃO

### **Modelo de Negócio:**

| Plano | Features | Dados Físicos |
|-------|----------|---------------|
| **FREE** | Intolerâncias + Receitas Seguras | ❌ Não requerido |
| **PREMIUM** | FREE + Cálculo de Macros Personalizados | ✅ Requerido |

### **Comportamento Esperado:**

**Usuário FREE (sem dados físicos):**
- ✅ Pode gerar planos alimentares
- ✅ Baseado apenas em intolerâncias
- ✅ Calorias padrão (2000 kcal/dia)
- ✅ Macros balanceados genéricos
- ❌ Sem cálculo personalizado de TMB/TDEE

**Usuário PREMIUM (com dados físicos):**
- ✅ Tudo do FREE
- ✅ Cálculo personalizado de TMB/TDEE
- ✅ Macros ajustados para objetivo (perda/ganho/manutenção)
- ✅ Distribuição otimizada por refeição

---

## 🔍 MÓDULOS AFETADOS

### **1. generate-ai-meal-plan** (CRÍTICO)

**Localização:** `supabase/functions/generate-ai-meal-plan/index.ts`

**Problema:**
```typescript
// Linha 1398-1443
if (profile.weight_current && profile.height && profile.age && profile.sex) {
  // Calcula targets personalizados
  nutritionalTargets = calculateNutritionalTargets(physicalData, strategyParams);
  dailyCalories = nutritionalTargets.targetCalories;
} else {
  // ❌ FALHA: Não há fallback para usuários free
}
```

**Solução:**
```typescript
// NOVO COMPORTAMENTO
if (profile.weight_current && profile.height && profile.age && profile.sex) {
  // PREMIUM: Cálculo personalizado
  nutritionalTargets = calculateNutritionalTargets(physicalData, strategyParams);
  dailyCalories = nutritionalTargets.targetCalories;
  isPremiumMode = true;
} else {
  // FREE: Valores padrão balanceados
  dailyCalories = 2000; // Padrão OMS
  nutritionalTargets = {
    bmr: null,
    tdee: null,
    targetCalories: 2000,
    protein: 60,    // 12% (padrão OMS)
    carbs: 275,     // 55% (padrão OMS)
    fat: 67,        // 30% (padrão OMS)
    fiber: 28,      // 14g/1000kcal
  };
  isPremiumMode = false;
}
```

---

### **2. Onboarding.tsx** (CRÍTICO)

**Localização:** `src/pages/Onboarding.tsx`

**Problema:**
```typescript
// Linha 710-721
// Step 7: Dados físicos são OBRIGATÓRIOS
const isPhysicalDataComplete = 
  profile.weight_current && 
  profile.height && 
  profile.age && 
  profile.sex && 
  profile.activity_level;

return !isPhysicalDataComplete; // ❌ Bloqueia usuário free
```

**Solução:**
```typescript
// NOVO COMPORTAMENTO
if (origStep === 7) {
  // Estratégia é obrigatória
  if (!profile.strategy_id) return true;
  
  // Dados físicos são OPCIONAIS (apenas para premium)
  // Permitir continuar sem dados físicos
  return false; // ✅ Permite prosseguir
}
```

**UI Sugerida:**
```tsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
  <h3 className="font-semibold text-blue-900 mb-2">
    💎 Quer cálculos personalizados?
  </h3>
  <p className="text-sm text-blue-700 mb-3">
    Preencha seus dados físicos para ter macros calculados especificamente para você.
  </p>
  <Button variant="outline" onClick={() => setShowPhysicalData(true)}>
    Preencher Dados Físicos (Premium)
  </Button>
  <Button variant="ghost" onClick={() => handleNext()}>
    Continuar sem dados físicos
  </Button>
</div>
```

---

### **3. nutritionalCalculations.ts** (MÉDIO)

**Localização:** `supabase/functions/_shared/nutritionalCalculations.ts`

**Problema:**
```typescript
// Linha 704-714
export function calculateNutritionalTargets(...): NutritionalTargets | null {
  const bmr = calculateBMR(physicalData);
  const tdee = calculateTDEE(physicalData);

  if (!bmr || !tdee || !physicalData.weight_current) {
    return null; // ❌ Retorna null se dados faltando
  }
  // ...
}
```

**Solução:**
```typescript
// NOVA FUNÇÃO: Targets padrão para usuários free
export function getDefaultNutritionalTargets(
  goal?: string,
  dietaryPreference?: string
): NutritionalTargets {
  let calories = 2000;
  let protein = 60;
  let carbs = 275;
  let fat = 67;
  
  // Ajustes básicos por objetivo (sem personalização)
  if (goal === 'lose_weight') {
    calories = 1600;
    protein = 80;  // Mais proteína para preservar massa
    carbs = 200;
    fat = 53;
  } else if (goal === 'gain_weight') {
    calories = 2400;
    protein = 100;
    carbs = 330;
    fat = 80;
  }
  
  // Ajustes por dieta
  if (dietaryPreference === 'cetogenica') {
    carbs = Math.round(calories * 0.10 / 4);
    fat = Math.round(calories * 0.70 / 9);
  } else if (dietaryPreference === 'low_carb') {
    carbs = Math.round(calories * 0.25 / 4);
    fat = Math.round(calories * 0.40 / 9);
  }
  
  return {
    bmr: null,
    tdee: null,
    targetCalories: calories,
    protein,
    carbs,
    fat,
    fiber: Math.round((calories / 1000) * 14),
  };
}
```

---

### **4. recipeConfig.ts** (BAIXO)

**Localização:** `supabase/functions/_shared/recipeConfig.ts`

**Problema:**
```typescript
// Linha 1238
if (profile.weight_current && profile.height && profile.age && profile.sex) {
  // Calcula macros personalizados
} else {
  // Usa valores padrão (já implementado ✅)
  dailyCalories = 2000;
  dailyProtein = 60;
}
```

**Status:** ✅ **JÁ TEM FALLBACK** - Não precisa mudança

---

### **5. Dashboard/UI Components** (MÉDIO)

**Componentes Afetados:**
- `WeightGoalSetup.tsx` - Deve ser opcional
- `MacroDisplay.tsx` - Deve mostrar "Upgrade para Premium" se dados ausentes
- `MealPlanGenerator.tsx` - Deve funcionar sem dados físicos

**Solução:**
```tsx
// WeightGoalSetup.tsx
{!hasPhysicalData && (
  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg">
    <h3 className="font-bold mb-2">💎 Upgrade para Premium</h3>
    <p className="text-sm mb-3">
      Tenha cálculos personalizados de macros baseados no seu corpo e objetivos.
    </p>
    <Button variant="secondary">
      Ver Planos Premium
    </Button>
  </div>
)}
```

---

## 🎯 ESTRATÉGIA DE IMPLEMENTAÇÃO

### **Fase 1: Backend (Edge Functions) - PRIORIDADE ALTA**

#### **1.1. Criar função de fallback**
```typescript
// _shared/nutritionalCalculations.ts
export function getDefaultNutritionalTargets(
  goal?: string,
  dietaryPreference?: string
): NutritionalTargets {
  // Implementação acima
}
```

#### **1.2. Atualizar generate-ai-meal-plan**
```typescript
// generate-ai-meal-plan/index.ts
let nutritionalTargets: NutritionalTargets;
let isPremiumMode = false;

if (hasCompletePhysicalData(profile)) {
  // PREMIUM: Cálculo personalizado
  nutritionalTargets = calculateNutritionalTargets(physicalData, strategyParams);
  isPremiumMode = true;
  logStep("Premium mode: Personalized macros", nutritionalTargets);
} else {
  // FREE: Valores padrão
  nutritionalTargets = getDefaultNutritionalTargets(profile.goal, profile.dietary_preference);
  isPremiumMode = false;
  logStep("Free mode: Default macros", nutritionalTargets);
}

// Adicionar flag ao prompt para IA saber o modo
const modeContext = isPremiumMode 
  ? "Modo Premium: Macros personalizados calculados para este usuário."
  : "Modo Gratuito: Macros padrão balanceados (2000 kcal/dia).";
```

#### **1.3. Adicionar helper de validação**
```typescript
// _shared/nutritionalCalculations.ts
export function hasCompletePhysicalData(profile: any): boolean {
  return !!(
    profile.weight_current &&
    profile.height &&
    profile.age &&
    profile.sex &&
    profile.activity_level
  );
}
```

---

### **Fase 2: Frontend (UI) - PRIORIDADE MÉDIA**

#### **2.1. Tornar dados físicos opcionais no onboarding**
```typescript
// Onboarding.tsx - Step 7
// Remover validação obrigatória de dados físicos
// Adicionar botão "Pular" ou "Continuar sem dados físicos"
```

#### **2.2. Adicionar indicadores de modo**
```tsx
// Dashboard
{isPremiumMode ? (
  <Badge variant="premium">💎 Macros Personalizados</Badge>
) : (
  <Badge variant="default">Macros Padrão</Badge>
)}
```

#### **2.3. Criar CTA para upgrade**
```tsx
// WeightGoalSetup.tsx
{!hasPhysicalData && (
  <UpgradeToPremiumCard 
    feature="Cálculos Personalizados de Macros"
    benefits={[
      "TMB e TDEE calculados para você",
      "Macros ajustados para seu objetivo",
      "Distribuição otimizada por refeição"
    ]}
  />
)}
```

---

### **Fase 3: Banco de Dados - PRIORIDADE BAIXA**

#### **3.1. Adicionar coluna de tier**
```sql
-- Adicionar coluna para identificar plano do usuário
ALTER TABLE profiles
ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';

-- Valores possíveis: 'free', 'premium', 'pro'
```

#### **3.2. Criar view para verificar features**
```sql
CREATE OR REPLACE VIEW user_features AS
SELECT 
  id,
  subscription_tier,
  CASE 
    WHEN subscription_tier IN ('premium', 'pro') THEN true
    ELSE false
  END AS has_macro_calculations,
  CASE
    WHEN weight_current IS NOT NULL 
      AND height IS NOT NULL 
      AND age IS NOT NULL 
      AND sex IS NOT NULL 
      AND activity_level IS NOT NULL
    THEN true
    ELSE false
  END AS has_physical_data
FROM profiles;
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **Backend (Edge Functions)**
- [ ] Criar `getDefaultNutritionalTargets()` em `nutritionalCalculations.ts`
- [ ] Criar `hasCompletePhysicalData()` helper
- [ ] Atualizar `generate-ai-meal-plan` para usar fallback
- [ ] Atualizar `generate-recipe` (já tem fallback, verificar)
- [ ] Adicionar logs de modo (free vs premium)
- [ ] Testar geração de plano SEM dados físicos

### **Frontend (UI)**
- [ ] Remover validação obrigatória de dados físicos no onboarding
- [ ] Adicionar botão "Continuar sem dados físicos" no Step 7
- [ ] Criar componente `UpgradeToPremiumCard`
- [ ] Adicionar badge de modo (free vs premium) no dashboard
- [ ] Atualizar `WeightGoalSetup` para ser opcional
- [ ] Testar fluxo completo free (sem dados físicos)

### **Banco de Dados**
- [ ] Adicionar coluna `subscription_tier` (opcional)
- [ ] Criar view `user_features` (opcional)
- [ ] Migrar usuários existentes para tier correto

### **Testes**
- [ ] Testar geração de plano como usuário FREE
- [ ] Testar geração de plano como usuário PREMIUM
- [ ] Verificar que intolerâncias funcionam em ambos os modos
- [ ] Validar que cálculos personalizados só aparecem para premium

---

## 🎯 VALORES PADRÃO (FREE)

### **Calorias Padrão por Objetivo:**

| Objetivo | Calorias | Proteína | Carboidratos | Gordura |
|----------|----------|----------|--------------|---------|
| **Manutenção** | 2000 kcal | 60g (12%) | 275g (55%) | 67g (30%) |
| **Perda de Peso** | 1600 kcal | 80g (20%) | 200g (50%) | 53g (30%) |
| **Ganho de Peso** | 2400 kcal | 100g (17%) | 330g (55%) | 80g (30%) |

### **Ajustes por Dieta:**

| Dieta | Carboidratos | Gordura | Proteína |
|-------|--------------|---------|----------|
| **Comum** | 55% | 30% | Restante |
| **Low Carb** | 25% | 40% | Restante |
| **Cetogênica** | 10% | 70% | Restante |

---

## 💡 RECOMENDAÇÕES

### **1. Comunicação Clara**
- ✅ Deixar claro que dados físicos são **opcionais**
- ✅ Explicar benefícios do premium (cálculos personalizados)
- ✅ Não bloquear funcionalidades core (intolerâncias)

### **2. UX Suave**
- ✅ Permitir upgrade a qualquer momento
- ✅ Mostrar preview dos benefícios premium
- ✅ Não forçar upgrade (soft paywall)

### **3. Valor Percebido**
- ✅ Usuários free devem ter experiência completa de intolerâncias
- ✅ Premium adiciona valor real (personalização)
- ✅ Diferença clara entre planos

---

## 🚀 PRÓXIMOS PASSOS

### **Implementação Imediata (Esta Semana):**
1. ✅ Criar `getDefaultNutritionalTargets()`
2. ✅ Atualizar `generate-ai-meal-plan` com fallback
3. ✅ Remover validação obrigatória no onboarding
4. ✅ Testar fluxo free completo

### **Implementação Curto Prazo (Próximas 2 Semanas):**
5. ✅ Adicionar CTAs de upgrade
6. ✅ Criar badges de modo
7. ✅ Adicionar coluna `subscription_tier`

### **Implementação Longo Prazo (Próximo Mês):**
8. ✅ Sistema de assinaturas completo
9. ✅ Paywall para features premium
10. ✅ Analytics de conversão free → premium

---

## 📊 IMPACTO ESPERADO

### **Antes (Atual):**
- ❌ Usuários free não conseguem usar o app
- ❌ Dados físicos obrigatórios
- ❌ Erro "non-2xx status code" para usuários sem dados

### **Depois (Refatorado):**
- ✅ Usuários free podem usar intolerâncias completas
- ✅ Dados físicos opcionais (premium)
- ✅ Sistema funciona para ambos os tiers
- ✅ Conversão free → premium facilitada

---

**Conclusão:** A refatoração é **essencial** e **viável**. O sistema atual bloqueia usuários free, mas a solução é simples: adicionar fallback com valores padrão balanceados.

**Tempo Estimado:** 2-3 dias de desenvolvimento + 1 dia de testes

**Prioridade:** 🔴 **CRÍTICA** - Sistema atual está quebrado para usuários free
