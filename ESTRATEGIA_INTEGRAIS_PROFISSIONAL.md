# ESTRATÉGIA DE INTEGRAIS - BASEADA EM ADESÃO REAL

## 🎯 PRINCÍPIO FUNDAMENTAL

**Plano seguido > Plano perfeito**

Arroz integral tem **alta rejeição** no Brasil.
Forçar integral = abandono do app.

---

## ❌ ERRO COMUM: REGRA RÍGIDA "70% INTEGRAL"

### Problemas
- Arroz integral: textura, tempo de preparo → **rejeição**
- Macarrão integral: sabor → **rejeição**
- Pão 100% integral: **rejeição**

### Resultado
- Usuário "finge que segue"
- Abandono do plano
- Churn do app

---

## ✅ SOLUÇÃO PROFISSIONAL: 3 CATEGORIAS

### 🟢 BASE NEUTRA (Aceitação Alta)
**Controle por porção + combinação**

- Arroz branco
- Macarrão comum
- Pão francês

**Estratégia:** Liberado, mas controlado por:
- Porção adequada
- Combinação com proteína + fibras + gorduras boas
- Contexto da refeição

### 🟡 INTEGRAIS ACEITOS (Custo-Benefício Alto)
**Ótima adesão + benefício nutricional**

- Aveia
- Pão integral misto (50% integral)
- Arroz parboilizado
- Cuscuz
- Batata doce

**Estratégia:** Priorizar esses ao invés de forçar integrais clássicos

### 🔵 INTEGRAIS RESTRITIVOS (Usar com Critério)
**Apenas quando perfil aceita**

- Arroz integral
- Macarrão integral
- Pão 100% integral

**Estratégia:** Oferecer apenas para perfis específicos (diabéticos que aceitam, usuários que pedem)

---

## 📊 REGRAS POR PERFIL DE USUÁRIO

### 👤 USUÁRIO PADRÃO (Maioria)
```
Carboidratos:
- Arroz branco: LIBERADO (porção controlada)
- Feijão: SEMPRE (fibras + proteína)
- Integrais via: Aveia, leguminosas, vegetais
- Sem meta fixa de "% integral"

Resultado: Adesão alta + controle glicêmico via combinação
```

### ⚖️ EMAGRECIMENTO
```
Carboidratos:
- Integrais mistos: PRIORIZAR (aveia, pão misto, parboilizado)
- Refinados: CONTROLADOS (porção menor)
- Arroz integral: OPCIONAL (não forçar se rejeitado)

Estratégia: Saciedade via fibras + proteína, não via integral forçado
```

### 🩺 DIABETES / RESISTÊNCIA À INSULINA
```
Carboidratos:
- Preferir: Parboilizado, integral misto
- Porções menores de branco: PERMITIDO
- Arroz integral: SUGERIR, mas não forçar se rejeitado

Estratégia: Controle glicêmico via porção + combinação + timing
Não forçar arroz integral se gera abandono
```

### 🏋️ PERFORMANCE / GANHO DE MASSA
```
Carboidratos:
- Refinado estratégico: PRÉ/PÓS TREINO (absorção rápida)
- Integral: FORA desses horários
- Variedade: ALTA (adesão + energia)

Estratégia: Timing de carboidratos > tipo de carboidrato
```

---

## 🎯 REGRA DE PRODUTO (IMPLEMENTAÇÃO)

### ❌ Regra Ruim
```
70% dos carboidratos devem ser integrais
```

### ✅ Regra Profissional
```
Priorizar carboidratos de melhor qualidade 
respeitando aceitação cultural,
controlando porção e combinação com 
proteínas, fibras e gorduras boas.
```

---

## 📋 EXEMPLO PRÁTICO: ARROZ

### ❌ Abordagem Teórica (Ruim)
```
Almoço: Arroz integral + Feijão + Frango
Jantar: Arroz integral + Feijão + Peixe
```
**Resultado:** Usuário abandona ou troca por fora

### ✅ Abordagem Profissional (Boa)
```
Almoço: Arroz branco (100g) + Feijão + Frango + Salada
Jantar: Arroz parboilizado (100g) + Feijão + Peixe + Brócolis
Ceia: Aveia com iogurte
```
**Resultado:** 
- Glicemia controlada (combinação + porção)
- Usuário feliz
- Adesão alta

---

## 🔧 IMPLEMENTAÇÃO NO CÓDIGO

### 1. CATEGORIZAR INGREDIENTES

```typescript
export const CARB_CATEGORIES = {
  // Base neutra - alta aceitação
  neutral_base: [
    'arroz_branco',
    'macarrao_comum',
    'pao_frances',
    'batata_inglesa',
  ],
  
  // Integrais aceitos - ótimo custo-benefício
  accepted_whole: [
    'aveia',
    'pao_integral',  // misto
    'arroz_parboilizado',
    'cuscuz_milho',
    'batata_doce',
  ],
  
  // Integrais restritivos - usar com critério
  restrictive_whole: [
    'arroz_integral',
    'macarrao_integral',
    'pao_forma_integral',  // 100%
  ]
};
```

### 2. LÓGICA DE SELEÇÃO POR PERFIL

```typescript
function selectCarbByProfile(profile: UserProfile): string {
  const { goal, strategy_key, accepts_whole_grains } = profile;
  
  // USUÁRIO PADRÃO
  if (goal === 'maintain' || !goal) {
    return randomFrom(CARB_CATEGORIES.neutral_base); // 70%
    // + randomFrom(CARB_CATEGORIES.accepted_whole); // 30%
  }
  
  // EMAGRECIMENTO
  if (goal === 'weight_loss') {
    return randomFrom(CARB_CATEGORIES.accepted_whole); // 60%
    // + randomFrom(CARB_CATEGORIES.neutral_base); // 40%
  }
  
  // DIABETES (se aceita integral)
  if (profile.has_diabetes && accepts_whole_grains) {
    return randomFrom(CARB_CATEGORIES.restrictive_whole); // 50%
    // + randomFrom(CARB_CATEGORIES.accepted_whole); // 50%
  }
  
  // DIABETES (se NÃO aceita integral)
  if (profile.has_diabetes && !accepts_whole_grains) {
    return randomFrom(CARB_CATEGORIES.accepted_whole); // 70%
    // + porção menor de neutral_base // 30%
  }
  
  // PERFORMANCE
  if (goal === 'muscle_gain' || strategy_key === 'performance') {
    return randomFrom(CARB_CATEGORIES.neutral_base); // 60%
    // + randomFrom(CARB_CATEGORIES.accepted_whole); // 40%
  }
}
```

### 3. DISTRIBUIÇÃO REALISTA

```typescript
const CARB_DISTRIBUTION_BY_PROFILE = {
  maintain: {
    neutral_base: 0.70,      // Arroz branco, macarrão comum
    accepted_whole: 0.30,    // Aveia, parboilizado, pão misto
    restrictive_whole: 0.00, // Nunca forçar integral clássico
  },
  
  weight_loss: {
    neutral_base: 0.40,      // Controlado, mas permitido
    accepted_whole: 0.60,    // Priorizar (aveia, batata doce)
    restrictive_whole: 0.00, // Opcional, não forçar
  },
  
  diabetes: {
    neutral_base: 0.30,      // Porção menor, permitido
    accepted_whole: 0.60,    // Parboilizado, pão misto
    restrictive_whole: 0.10, // Apenas se aceita
  },
  
  muscle_gain: {
    neutral_base: 0.60,      // Energia, variedade
    accepted_whole: 0.40,    // Timing fora de treino
    restrictive_whole: 0.00, // Não necessário
  },
};
```

---

## 🎯 PLANO DE IMPLEMENTAÇÃO

### FASE 1: ADICIONAR CAMPO NO PERFIL
```sql
ALTER TABLE profiles 
ADD COLUMN accepts_whole_grains BOOLEAN DEFAULT NULL;
```

**Lógica:**
- `NULL` = Não perguntado (usar distribuição padrão)
- `true` = Aceita integral clássico (pode oferecer arroz integral)
- `false` = Rejeita integral clássico (usar apenas integrais aceitos)

### FASE 2: CATEGORIZAR INGREDIENTES
Adicionar campo `carb_category` em `meal-ingredients-db.ts`:
```typescript
arroz_branco: { 
  ..., 
  carb_category: 'neutral_base' 
},
arroz_integral: { 
  ..., 
  carb_category: 'restrictive_whole' 
},
arroz_parboilizado: { 
  ..., 
  carb_category: 'accepted_whole' 
},
```

### FASE 3: IMPLEMENTAR LÓGICA DE SELEÇÃO
Em `advanced-meal-generator.ts`:
- Função `selectCarbByProfile()`
- Usar distribuição baseada em `goal` + `accepts_whole_grains`
- Priorizar integrais aceitos ao invés de forçar integrais clássicos

### FASE 4: ATUALIZAR TEMPLATES
Em `meal-templates-smart.ts`:
- Substituir slots fixos por seleção dinâmica
- Exemplo: `{carb}` → seleciona baseado em perfil

### FASE 5: ADICIONAR PERGUNTA NO ONBOARDING (OPCIONAL)
"Você gosta de arroz integral?"
- Sim → `accepts_whole_grains = true`
- Não → `accepts_whole_grains = false`
- Pular → `accepts_whole_grains = null` (usar padrão)

---

## 📊 RESULTADOS ESPERADOS

### Antes (Forçar 70% Integral)
- Arroz integral todo dia
- Usuário rejeita
- Abandono do plano
- Churn

### Depois (Estratégia Profissional)
- Arroz branco + feijão + proteína + salada
- Aveia no café
- Parboilizado algumas vezes
- Integral clássico apenas se aceita

**Resultado:**
- ✅ Adesão alta
- ✅ Controle glicêmico (combinação + porção)
- ✅ Usuário feliz
- ✅ Retenção no app

---

## 🎯 CONCLUSÃO

**Regra de Ouro:**
```
Adesão > Perfeição Nutricional
```

**Estratégia:**
1. Priorizar integrais ACEITOS (aveia, parboilizado, pão misto)
2. Permitir base neutra CONTROLADA (arroz branco + combinação)
3. Oferecer integrais RESTRITIVOS apenas se perfil aceita

**Não forçar arroz integral se gera abandono.**
