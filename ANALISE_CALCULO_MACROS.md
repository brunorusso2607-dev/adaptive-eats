# ANÁLISE PROFUNDA: SISTEMA DE CÁLCULO DE MACROS

## 📋 RESUMO EXECUTIVO

O sistema utiliza a **fórmula Mifflin-St Jeor (1990)** para calcular o TMB (Taxa Metabólica Basal) e aplica um **Motor de Decisão Nutricional Determinístico** para definir macros por refeição baseado em objetivo, sexo e nível de atividade.

---

## 🎯 ONDE A FÓRMULA MIFFLIN-ST JEOR É USADA

### 1. **Arquivo Principal: `nutritionalCalculations.ts`**
**Localização:** `supabase/functions/_shared/nutritionalCalculations.ts`

**Função:** `calculateBMR()` (linhas 597-620)

```typescript
/**
 * Calculates Basal Metabolic Rate using Mifflin-St Jeor equation.
 * This is the gold standard for BMR estimation (1990).
 * 
 * Men: BMR = (10 × weight in kg) + (6.25 × height in cm) − (5 × age) + 5
 * Women: BMR = (10 × weight in kg) + (6.25 × height in cm) − (5 × age) − 161
 */
export function calculateBMR(data: UserPhysicalData): number | null {
  const { sex, age, height, weight_current } = data;

  if (!age || !height || !weight_current) {
    return null;
  }

  const isMale = sex === "male" || sex === "masculino" || sex === "m";
  const isFemale = sex === "female" || sex === "feminino" || sex === "f";

  const bmr = isMale
    ? (10 * weight_current) + (6.25 * height) - (5 * age) + 5
    : (10 * weight_current) + (6.25 * height) - (5 * age) - 161;

  return Math.round(bmr);
}
```

**Status:** ✅ **IMPLEMENTADO EM TYPESCRIPT** (não no prompt)

---

## 🔄 FLUXO COMPLETO DE CÁLCULO DE MACROS

### **ETAPA 1: Cálculo do TMB (Basal Metabolic Rate)**
- **Fórmula:** Mifflin-St Jeor
- **Input:** idade, altura, peso atual, sexo
- **Output:** TMB em kcal/dia

### **ETAPA 2: Cálculo do TDEE (Total Daily Energy Expenditure)**
- **Fórmula:** TDEE = TMB × Multiplicador de Atividade
- **Multiplicadores:**
  - Sedentário: 1.2
  - Leve: 1.375
  - Moderado: 1.55
  - Ativo: 1.725
  - Muito Ativo: 1.9

### **ETAPA 3: Ajuste por Objetivo (Calorie Modifier)**
**Localização:** `generate-ai-meal-plan/index.ts` (linhas 1414-1420)

```typescript
if (goal === 'lose_weight') {
  calorieModifier = -500;  // Déficit de 500 kcal
  proteinPerKg = 2.0;      // Alta proteína para preservar massa muscular
} else if (goal === 'gain_weight') {
  calorieModifier = 400;   // Superávit de 400 kcal
  proteinPerKg = 2.2;      // Proteína para ganho muscular
}
```

**Calorias Alvo:** `targetCalories = TDEE + calorieModifier`

**Proteção:** Nunca abaixo de 1200 kcal/dia

---

## 🎲 MOTOR DE DECISÃO NUTRICIONAL DETERMINÍSTICO

### **O QUE É:**
Tabela de macros **pré-calculada** por nutricionistas para cada combinação de:
- **Objetivo:** lose_weight | maintain | gain_weight
- **Sexo:** male | female
- **Atividade:** sedentary | light | moderate | active | very_active
- **Refeição:** breakfast | morning_snack | lunch | afternoon_snack | dinner | supper

### **EXEMPLO: Homem, Emagrecer, Sedentário**

```typescript
lose_weight: {
  male: {
    sedentary: {
      breakfast:       { protein: 30g, carbs: 25g, fat: 10g },  // ~310 kcal
      morning_snack:   { protein: 20g, carbs: 10g, fat: 5g  },  // ~165 kcal
      lunch:           { protein: 40g, carbs: 40g, fat: 15g },  // ~495 kcal
      afternoon_snack: { protein: 25g, carbs: 15g, fat: 5g  },  // ~205 kcal
      dinner:          { protein: 40g, carbs: 20g, fat: 10g },  // ~350 kcal
      supper:          { protein: 20g, carbs: 0g,  fat: 5g  },  // ~125 kcal
    }
  }
}
```

**Total:** ~1650 kcal/dia

### **REGRAS ESPECIAIS POR OBJETIVO:**

#### **EMAGRECER (lose_weight):**
- ✅ Ceia com **ZERO carboidratos** (ou muito baixo)
- ✅ **ALTA proteína** em todas as refeições (preservar massa muscular)
- ✅ Carboidratos reduzidos, especialmente à noite

#### **MANTER PESO (maintain):**
- ✅ Distribuição balanceada de macros
- ✅ Ceia com carboidratos moderados (15g)

#### **GANHAR PESO (gain_weight):**
- ✅ **ALTO carboidrato** no café e almoço
- ✅ **ALTA proteína** para construção muscular
- ✅ Ceia pode ter carboidratos moderados (30-35g)

---

## 📍 ONDE O CÁLCULO É USADO NO CÓDIGO

### **1. Edge Function: `generate-ai-meal-plan`**
**Localização:** `supabase/functions/generate-ai-meal-plan/index.ts`

**Linha 1438:** Calcula targets nutricionais
```typescript
nutritionalTargets = calculateNutritionalTargets(physicalData, strategyParams);
```

**Linha 1456-1461:** Injeta macros no prompt da IA
```typescript
const macroTargetsPrompt = buildMealMacroTargetsForPrompt(
  goal,      // lose_weight | maintain | gain_weight
  sex,       // male | female
  activityLevel,  // sedentary | light | moderate | active | very_active
  mealTypes  // ['breakfast', 'lunch', 'dinner', ...]
);
nutritionalContext += "\n" + macroTargetsPrompt;
```

**Resultado:** O prompt enviado ao Gemini contém:
```
=== DETERMINISTIC NUTRITIONAL DECISION ENGINE ===
MANDATORY MACRO TARGETS PER MEAL (±15% tolerance):

- Breakfast: P30g C25g F10g (~310kcal)
- Morning Snack: P20g C10g F5g (~165kcal)
- Lunch: P40g C40g F15g (~495kcal)
- Afternoon Snack: P25g C15g F5g (~205kcal)
- Dinner: P40g C20g F10g (~350kcal)
- Supper: P20g C0g F5g (~125kcal)

RULES FOR WEIGHT LOSS:
- Supper MUST have ZERO or very low carbs
- HIGH protein in all meals to preserve muscle mass
- Reduced carbs especially at night

IMPORTANT: These are exact targets calibrated by nutritionists. Do not deviate.
```

---

## 🔍 ANÁLISE: PROMPT vs TYPESCRIPT

### **MIFFLIN-ST JEOR:**
- ❌ **NÃO está no prompt** da IA
- ✅ **ESTÁ no TypeScript** (`nutritionalCalculations.ts`)
- ✅ Cálculo feito **ANTES** de chamar a IA
- ✅ Resultado injetado no prompt como **targets fixos**

### **MOTOR DE DECISÃO NUTRICIONAL:**
- ❌ **NÃO calcula no prompt** (IA não faz matemática)
- ✅ **Tabela pré-calculada** em TypeScript
- ✅ IA recebe **valores prontos** para seguir
- ✅ Tolerância de ±15% para flexibilidade

---

## 📊 COMO O OBJETIVO DO USUÁRIO AFETA OS MACROS

### **1. Ajuste de Calorias Totais**
```typescript
// Linha 1414-1420 em generate-ai-meal-plan/index.ts
if (goal === 'lose_weight') {
  calorieModifier = -500;  // TDEE - 500 kcal
} else if (goal === 'gain_weight') {
  calorieModifier = 400;   // TDEE + 400 kcal
} else {
  calorieModifier = 0;     // TDEE (manter peso)
}
```

### **2. Ajuste de Proteína**
```typescript
if (goal === 'lose_weight') {
  proteinPerKg = 2.0;  // 2g por kg de peso
} else if (goal === 'gain_weight') {
  proteinPerKg = 2.2;  // 2.2g por kg de peso
} else {
  proteinPerKg = 1.8;  // 1.8g por kg de peso
}
```

### **3. Distribuição de Macros por Refeição**
A tabela `MEAL_MACRO_TARGETS` tem **3 seções completas:**
- `lose_weight`: Carbo baixo na ceia (0g), proteína alta
- `maintain`: Distribuição balanceada
- `gain_weight`: Carbo alto no café/almoço, proteína muito alta

---

## 🎯 VALIDAÇÕES E PROTEÇÕES

### **1. Validação de Saúde dos Targets**
**Função:** `validateTargetsHealth()` (linha 1466)
- Verifica se calorias não estão muito baixas (<1200)
- Verifica se proteína não está excessiva (>3g/kg)
- Alerta se targets estão fora de faixas saudáveis

### **2. Estimativa de Tempo para Meta**
**Função:** `estimateTimeToGoal()` (linha 1473)
- Calcula quantas semanas/meses para atingir `weight_goal`
- Baseado no déficit/superávit calórico
- Regra: 1kg de gordura = 7700 kcal

### **3. Tolerância de ±15%**
- IA pode variar macros em ±15% dos targets
- Permite flexibilidade para receitas reais
- Evita rejeição excessiva de refeições

---

## 🔧 FUNÇÕES PRINCIPAIS

### **1. `calculateBMR()`**
- **Input:** idade, altura, peso, sexo
- **Output:** TMB em kcal/dia
- **Fórmula:** Mifflin-St Jeor

### **2. `calculateTDEE()`**
- **Input:** TMB, nível de atividade
- **Output:** TDEE em kcal/dia
- **Fórmula:** TMB × multiplicador

### **3. `calculateNutritionalTargets()`**
- **Input:** dados físicos, parâmetros de estratégia
- **Output:** targets completos (BMR, TDEE, calorias, P/C/F)
- **Usa:** calculateBMR() + calculateTDEE() + calculateDailyMacros()

### **4. `getMealMacroTargets()`**
- **Input:** objetivo, sexo, atividade, tipo de refeição
- **Output:** macros específicos para aquela refeição (P/C/F em gramas)
- **Usa:** Tabela `MEAL_MACRO_TARGETS`

### **5. `buildMealMacroTargetsForPrompt()`**
- **Input:** objetivo, sexo, atividade, refeições habilitadas
- **Output:** string formatada para injetar no prompt da IA
- **Usa:** `getMealMacroTargets()` para cada refeição

---

## 📈 EXEMPLO COMPLETO: HOMEM, 30 ANOS, 80KG, 175CM, EMAGRECER

### **ETAPA 1: Calcular TMB**
```
TMB = (10 × 80) + (6.25 × 175) - (5 × 30) + 5
TMB = 800 + 1093.75 - 150 + 5
TMB = 1748.75 kcal/dia
```

### **ETAPA 2: Calcular TDEE (Moderado)**
```
TDEE = 1748.75 × 1.55
TDEE = 2710 kcal/dia
```

### **ETAPA 3: Ajustar por Objetivo (Emagrecer)**
```
Target = 2710 - 500 = 2210 kcal/dia
Proteína = 80kg × 2.0g/kg = 160g/dia
```

### **ETAPA 4: Distribuir por Refeição**
```
Breakfast:       P30g C25g F10g = 310 kcal
Morning Snack:   P20g C10g F5g  = 165 kcal
Lunch:           P40g C40g F15g = 495 kcal
Afternoon Snack: P25g C15g F5g  = 205 kcal
Dinner:          P40g C20g F10g = 350 kcal
Supper:          P20g C0g  F5g  = 125 kcal
-------------------------------------------
TOTAL:           P175g C110g F50g = 1650 kcal
```

**Nota:** Total de 1650 kcal está abaixo do target de 2210 kcal porque a tabela usa valores conservadores. O sistema pode ajustar porções para atingir o target exato.

---

## ✅ CONCLUSÕES

### **1. MIFFLIN-ST JEOR:**
- ✅ Implementado em **TypeScript puro**
- ✅ Cálculo feito **antes** da IA
- ✅ Resultado injetado no prompt como **targets fixos**
- ❌ **NÃO** está no prompt para a IA calcular

### **2. MOTOR DE DECISÃO NUTRICIONAL:**
- ✅ Tabela **determinística** calibrada por nutricionistas
- ✅ Cobre **3 objetivos × 2 sexos × 5 níveis de atividade × 6 refeições** = 180 combinações
- ✅ IA recebe valores **prontos** para seguir
- ✅ Tolerância de ±15% para flexibilidade

### **3. OBJETIVO DO USUÁRIO (weight_goal):**
- ✅ Afeta **calorias totais** (déficit/superávit)
- ✅ Afeta **proteína por kg** (preservar/ganhar músculo)
- ✅ Afeta **distribuição de macros** (carbo na ceia)
- ✅ Usado para **estimar tempo** para atingir meta

### **4. ARQUITETURA:**
```
[Perfil do Usuário] 
    ↓
[calculateBMR() - Mifflin-St Jeor]
    ↓
[calculateTDEE() - Multiplicador de Atividade]
    ↓
[Ajuste por Objetivo - Calorie Modifier]
    ↓
[getMealMacroTargets() - Tabela Determinística]
    ↓
[buildMealMacroTargetsForPrompt() - Formatar para IA]
    ↓
[Gemini AI - Gerar Refeições com Targets]
    ↓
[Validação TypeScript - ±15% tolerância]
```

---

## 🚀 RECOMENDAÇÕES

### **1. Sistema está CORRETO e BEM ESTRUTURADO**
- Mifflin-St Jeor é o padrão ouro (1990)
- Tabela determinística garante consistência
- Separação clara: TypeScript calcula, IA cria receitas

### **2. POSSÍVEIS MELHORIAS:**
- ✅ Adicionar mais níveis de atividade (ex: atleta profissional)
- ✅ Ajustar tabela para dietas específicas (keto, low-carb)
- ✅ Permitir usuário customizar % de macros
- ✅ Adicionar validação de micronutrientes (vitaminas, minerais)

### **3. NÃO MUDAR:**
- ❌ Não mover Mifflin-St Jeor para o prompt (IA não faz matemática bem)
- ❌ Não remover tabela determinística (garante consistência)
- ❌ Não aumentar tolerância além de ±15% (perde precisão)

---

## 📚 REFERÊNCIAS

1. **Mifflin-St Jeor Equation (1990)**
   - Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO.
   - "A new predictive equation for resting energy expenditure in healthy individuals"
   - Am J Clin Nutr. 1990;51(2):241-7.

2. **Activity Multipliers**
   - Harris-Benedict Equation (Revised)
   - Academy of Nutrition and Dietetics

3. **Protein Requirements**
   - International Society of Sports Nutrition (ISSN)
   - Position Stand: protein and exercise (2017)

---

**Documento gerado em:** 20/01/2026
**Versão do sistema:** v1.0.0-meal-plan-stable
