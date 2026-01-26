# 🏗️ ANÁLISE ARQUITETURAL: MÓDULO CENTRAL DE NUTRIÇÃO

## 📍 FONTE DA VERDADE IDENTIFICADA

### **1. Módulo Central de Cálculo Nutricional**

#### **Backend (Edge Functions)**
**Arquivo**: `supabase/functions/_shared/calculateRealMacros.ts`

**Função Principal**: `calculateRealMacrosForFoods()`

**Cascata de Busca (Ordem de Prioridade)**:
```
1. CANONICAL_INGREDIENTS (Prioridade Máxima - Dados Verificados Manualmente)
   ↓
2. BATCH DATABASE SEARCH (Rápida - ~85% match)
   - Fontes prioritárias por país (ex: BR → TBCA, TACO, USDA)
   ↓
3. INDIVIDUAL DATABASE SEARCH (Precisa - ~99% match)
   - Busca individual para itens não encontrados
   ↓
4. AI ESTIMATION (Último Recurso)
   - Estimativa baseada em categoria de alimento
```

**Retorno**:
```typescript
{
  items: CalculatedFoodItem[],
  matchRate: number,
  fromDb: number,
  fromAi: number,
  fromCanonical: number
}
```

**Cada item contém**:
- `name`: Nome do alimento
- `grams`: Quantidade em gramas
- `calories`, `protein`, `carbs`, `fat`, `fiber`: Macros calculados
- `source`: Origem dos dados ('canonical', 'tbca', 'taco', 'usda', 'ai_estimate')
- `confidence`: Nível de confiança (0-100)
- `food_id`: ID na tabela foods (se encontrado)

---

### **2. Módulo de Cálculo de Metas do Usuário**

#### **Frontend (Hooks)**
**Arquivo**: `src/hooks/useUserProfileContext.tsx`

**Função Principal**: `calculateMacroTargets()`

**Fórmula Utilizada**: **Mifflin-St Jeor** (TMB)
```typescript
// Homens
TMB = (10 × peso) + (6.25 × altura) - (5 × idade) + 5

// Mulheres
TMB = (10 × peso) + (6.25 × altura) - (5 × idade) - 161
```

**Fatores de Atividade**:
```typescript
{
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
}
```

**TDEE (Gasto Energético Total)**:
```
TDEE = TMB × Fator de Atividade
```

**Ajuste Calórico por Objetivo**:
```typescript
// Emagrecimento
- Déficit: 300-700 kcal (baseado na intensidade)
- Proteína: 1.8-2.2g/kg do peso meta
- Carbos: 40% das calorias restantes
- Gordura: 60% das calorias restantes

// Ganho de Peso
- Superávit: 250-600 kcal (baseado na intensidade)
- Proteína: 2.0-2.4g/kg do peso meta
- Carbos: 60% das calorias restantes
- Gordura: 40% das calorias restantes

// Manutenção
- Calorias: TDEE
- Proteína: 1.6g/kg do peso atual
- Carbos: 50% das calorias restantes
- Gordura: 50% das calorias restantes
```

**Distribuição por Refeição**:
```typescript
{
  breakfast: 25%,
  lunch: 35%,
  afternoon_snack: 10%,
  dinner: 25%,
  supper: 5%
}
```

---

## 🔗 MAPEAMENTO DE DEPENDÊNCIAS

### **Consumidores da Fonte da Verdade**

#### **1. Edge Functions (Backend)**

| Função | Usa calculateRealMacrosForFoods | Propósito |
|--------|--------------------------------|-----------|
| `generate-ai-meal-plan` | ✅ | Calcula macros reais após gerar plano |
| `regenerate-meal` | ✅ | Recalcula macros ao regenerar refeição |
| `analyze-food-photo` | ✅ | Valida macros da foto com DB |
| `analyze-fridge-photo` | ✅ | Calcula macros dos alimentos detectados |
| `suggest-food-ai` | ✅ | Recalcula macros das sugestões de IA |

#### **2. Frontend Components (React)**

| Componente | Usa Macros | Fonte |
|------------|-----------|-------|
| `UnifiedFoodSearchBlock` | ✅ | `useLookupIngredient` → lookup-ingredient |
| `FreeFormMealLogger` | ✅ | Agrega macros de `UnifiedFoodSearchBlock` |
| `MealRegistrationFlow` | ✅ | Recebe macros calculados |
| `PendingMealCard` | ✅ | Exibe macros do plano |
| `NextMealCard` | ✅ | Exibe macros da próxima refeição |
| `MealHistorySheet` | ✅ | Exibe macros do histórico |
| `CompactHealthCircles` | ✅ | Usa `calculateMacros` do perfil |
| `WeightGoalSetup` | ✅ | Calcula macros baseado em metas |

#### **3. Hooks (React)**

| Hook | Função | Integração com Perfil |
|------|--------|----------------------|
| `useUserProfileContext` | Calcula macros diários | ✅ Reativo ao perfil |
| `useLookupIngredient` | Busca alimentos no DB | ❌ Não usa perfil |
| `useIngredientCalories` | Cache de calorias | ❌ Não usa perfil |
| `useMealConsumption` | Salva consumo | ✅ Usa user_id |

---

## 🏷️ AUDITORIA DE ATRIBUIÇÃO (SOURCE BADGES)

### **Componentes que Exibem Origem**

#### **✅ CORRETO - Exibe Source Badge**

1. **`UnifiedFoodSearchBlock.tsx`** (linhas 66-88)
   ```typescript
   const SourceBadge = ({ source }: { source: string }) => {
     const config = {
       local: { icon: Database, label: "Local", ... },
       alias: { icon: Link2, label: "Alias", ... },
       usda: { icon: Globe, label: "USDA", ... },
       taco: { icon: Database, label: "TACO", ... },
       ai_suggestion: { icon: Sparkles, label: "IA", ... },
       manual: { icon: PenLine, label: "Manual", ... }
     }
   }
   ```
   - **Exibe**: Badge de fonte para cada alimento
   - **Localização**: Linha 468 (dentro do card de alimento)
   - **Status**: ✅ **FUNCIONANDO**

2. **`FoodItemEditor.tsx`** (linhas 654-703)
   ```typescript
   {food.calculo_fonte === "tabela_foods" ? (
     <span className="text-green-600">TACO/USDA</span>
   ) : (
     <span className="text-amber-600">IA</span>
   )}
   ```
   - **Exibe**: Fonte do cálculo (DB ou IA)
   - **Status**: ✅ **FUNCIONANDO**

3. **`AdminMealPool.tsx`** (linhas 722, 897)
   ```typescript
   <div className="text-xs text-muted-foreground uppercase">
     {meal.macro_source || 'tbca'}
   </div>
   ```
   - **Exibe**: Fonte dos macros no admin
   - **Status**: ✅ **FUNCIONANDO**

#### **❌ FALTANDO - Não Exibe Source**

1. **`PendingMealCard.tsx`**
   - **Problema**: Exibe calorias mas não mostra de onde vieram
   - **Impacto**: Usuário não sabe se é dado real ou estimativa
   - **Solução**: Adicionar badge de fonte

2. **`NextMealCard.tsx`**
   - **Problema**: Mesma situação do PendingMealCard
   - **Impacto**: Falta transparência sobre origem dos dados
   - **Solução**: Adicionar badge de fonte

3. **`MealHistorySheet.tsx`**
   - **Problema**: Histórico não mostra fonte dos macros
   - **Impacto**: Usuário não sabe se consumiu dados reais ou estimados
   - **Solução**: Adicionar badge de fonte

---

## 👤 INTEGRAÇÃO COM PERFIL DO USUÁRIO

### **Fluxo de Dados: Perfil → Cálculos**

```
1. USER PROFILE (Supabase)
   ├─ weight_current
   ├─ weight_goal
   ├─ height
   ├─ age
   ├─ sex
   ├─ activity_level
   ├─ goal (lose_weight | maintain | gain_weight)
   ├─ dietary_preference
   └─ intolerances
   
2. useUserProfileContext (Hook)
   ├─ Carrega perfil do Supabase
   ├─ Calcula: goalIntensity, recipeStyle, BMI
   ├─ Executa: calculateMacroTargets()
   └─ Retorna: macroTargets { dailyCalories, dailyProtein, dailyCarbs, dailyFat }
   
3. COMPONENTES CONSOMEM
   ├─ CompactHealthCircles → Exibe círculos de progresso
   ├─ WeightGoalSetup → Mostra metas e previsões
   ├─ MealPlanGenerator → Usa para gerar plano
   └─ Dashboard → Exibe resumo nutricional
```

### **Reatividade: Mudanças no Perfil**

#### **✅ REATIVO - Atualiza Automaticamente**

1. **`useUserProfileContext`** (linhas 396-456)
   ```typescript
   useEffect(() => {
     fetchProfile();
   }, [fetchProfile]);
   
   const computed = useMemo(() => {
     // Recalcula quando profile muda
     const macroTargets = calculateMacroTargets(...);
     return { macroTargets, ... };
   }, [profile]);
   ```
   - **Status**: ✅ **REATIVO**
   - **Trigger**: Qualquer mudança no perfil

2. **`CompactHealthCircles`** (linha 184)
   ```typescript
   const calcs = weightData ? calculateMacros(weightData) : null;
   ```
   - **Status**: ✅ **REATIVO**
   - **Trigger**: Mudança em weightData

#### **❌ NÃO REATIVO - Requer Refresh Manual**

1. **Planos de Refeição Gerados**
   - **Problema**: Planos já gerados não recalculam quando perfil muda
   - **Razão**: Dados salvos no banco (meal_plans, meal_plan_items)
   - **Solução Atual**: Usuário precisa regenerar o plano
   - **Solução Ideal**: Adicionar botão "Recalcular com Novo Perfil"

2. **Histórico de Consumo**
   - **Problema**: Consumos passados não recalculam
   - **Razão**: Dados históricos (meal_consumption, consumption_items)
   - **Solução Atual**: Mantém dados originais (correto)
   - **Status**: ✅ **CORRETO** (histórico não deve mudar)

---

## 🔍 INCONSISTÊNCIAS IDENTIFICADAS

### **1. DUPLICAÇÃO DE LÓGICA DE CÁLCULO**

#### **Problema**:
Existem **DUAS** funções que calculam macros:

1. **`calculateMacros()`** em `WeightGoalSetup.tsx` (linha 354)
   - Usado para: Preview de metas no setup
   - Fórmula: Mifflin-St Jeor
   
2. **`calculateMacroTargets()`** em `useUserProfileContext.tsx` (linha 181)
   - Usado para: Cálculos globais do sistema
   - Fórmula: Mifflin-St Jeor

#### **Risco**:
- Se uma for atualizada e a outra não, haverá divergência
- Manutenção duplicada

#### **Solução**:
- Consolidar em uma única função
- `WeightGoalSetup` deve importar de `useUserProfileContext`

---

### **2. FONTE DA VERDADE IGNORADA EM ALGUNS CASOS**

#### **Problema**:
`suggest-food-ai` calcula macros mas **NÃO salva no banco**

**Arquivo**: `supabase/functions/suggest-food-ai/index.ts`
- **Linha 364-426**: Recalcula macros com `calculateRealMacrosForFoods`
- **Problema**: Retorna para o frontend mas não persiste
- **Impacto**: Próxima busca pelo mesmo alimento não encontra

#### **Solução**:
Já implementada anteriormente: adicionar salvamento no banco após linha 465

---

### **3. FALTA DE PROPAGAÇÃO DE `food_id`**

#### **Problema**:
Alguns componentes não propagam `food_id` corretamente

**Exemplo**: `FreeFormMealLogger.tsx`
- Recebe alimentos com `food_id` de `UnifiedFoodSearchBlock`
- Ao salvar em `consumption_items`, deveria incluir `food_id`
- **Status**: ✅ **CORRETO** (linha 54 em `useMealConsumption.tsx`)

---

## 📊 MAPA ARQUITETURAL COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│                    USER PROFILE (Supabase)                   │
│  weight_current, weight_goal, height, age, sex, activity     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              useUserProfileContext (Hook)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ calculateMacroTargets()                              │   │
│  │ - TMB (Mifflin-St Jeor)                             │   │
│  │ - TDEE = TMB × Activity Factor                       │   │
│  │ - Ajuste por objetivo (lose/gain/maintain)          │   │
│  │ - Distribuição de macros (protein/carbs/fat)        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Retorna: macroTargets { dailyCalories, protein, carbs, fat }│
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ↓               ↓               ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Dashboard    │ │ Health       │ │ Meal Plan    │
│ (Resumo)     │ │ Circles      │ │ Generator    │
└──────────────┘ └──────────────┘ └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│         FOODS DATABASE (Supabase - Fonte da Verdade)         │
│  canonical_ingredients → foods → ingredient_aliases          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│     calculateRealMacrosForFoods (Edge Function Shared)      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ CASCATA DE BUSCA:                                    │   │
│  │ 1. canonical_ingredients (Prioridade Máxima)        │   │
│  │ 2. Batch DB Search (TBCA/TACO/USDA por país)        │   │
│  │ 3. Individual DB Search (Busca precisa)             │   │
│  │ 4. AI Estimation (Último recurso)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Retorna: { items[], matchRate, fromDb, fromAi, fromCanonical }│
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┬───────────────┐
         ↓               ↓               ↓               ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ generate-ai- │ │ regenerate-  │ │ analyze-     │ │ suggest-     │
│ meal-plan    │ │ meal         │ │ food-photo   │ │ food-ai      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
         │               │               │               │
         └───────────────┴───────────────┴───────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND COMPONENTS (React)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ UnifiedFoodSearchBlock                               │   │
│  │  ├─ useLookupIngredient → lookup-ingredient          │   │
│  │  └─ Exibe: SourceBadge (local/usda/taco/ai) ✅       │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ FreeFormMealLogger                                   │   │
│  │  ├─ Agrega alimentos de UnifiedFoodSearchBlock       │   │
│  │  └─ Calcula totais de macros                         │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ PendingMealCard / NextMealCard                       │   │
│  │  ├─ Exibe macros do plano                            │   │
│  │  └─ ❌ NÃO exibe fonte (FALTANDO)                    │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ MealHistorySheet                                     │   │
│  │  ├─ Exibe histórico de consumo                       │   │
│  │  └─ ❌ NÃO exibe fonte (FALTANDO)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ CONCLUSÕES E RECOMENDAÇÕES

### **PONTOS FORTES**

1. ✅ **Fonte da Verdade Bem Definida**
   - `calculateRealMacrosForFoods` é o módulo central
   - Cascata de busca robusta (canonical → DB → AI)
   - Alta taxa de match (~99%)

2. ✅ **Integração com Perfil Funcional**
   - `useUserProfileContext` reativo
   - Cálculos baseados em fórmulas científicas (Mifflin-St Jeor)
   - Ajustes por objetivo e intensidade

3. ✅ **Atribuição de Origem Implementada**
   - `UnifiedFoodSearchBlock` exibe badges
   - `FoodItemEditor` mostra fonte
   - Admin mostra `macro_source`

### **PONTOS DE MELHORIA**

1. ⚠️ **Falta de Source Badges em Cards de Refeição**
   - `PendingMealCard` não mostra origem
   - `NextMealCard` não mostra origem
   - `MealHistorySheet` não mostra origem
   - **Impacto**: Usuário não sabe se dados são reais ou estimados

2. ⚠️ **Duplicação de Lógica de Cálculo**
   - `calculateMacros` vs `calculateMacroTargets`
   - **Risco**: Divergência entre funções
   - **Solução**: Consolidar em uma única função

3. ⚠️ **Planos Não Recalculam Automaticamente**
   - Mudanças no perfil não atualizam planos existentes
   - **Solução**: Adicionar botão "Recalcular com Novo Perfil"

### **AÇÕES RECOMENDADAS**

#### **Prioridade Alta**
1. Adicionar `SourceBadge` em `PendingMealCard`
2. Adicionar `SourceBadge` em `NextMealCard`
3. Adicionar `SourceBadge` em `MealHistorySheet`

#### **Prioridade Média**
4. Consolidar `calculateMacros` e `calculateMacroTargets`
5. Adicionar botão "Recalcular Plano" quando perfil muda

#### **Prioridade Baixa**
6. Adicionar indicador visual quando macros são estimados (confidence < 80%)
7. Criar dashboard de "Data Quality" mostrando % de dados reais vs estimados

---

## 🎯 RESUMO EXECUTIVO

**Fonte da Verdade**: `calculateRealMacrosForFoods` em `_shared/calculateRealMacros.ts`

**Integração com Perfil**: ✅ Funcional e reativa via `useUserProfileContext`

**Atribuição de Origem**: ⚠️ Parcialmente implementada (falta em cards de refeição)

**Reatividade**: ✅ Mudanças no perfil atualizam cálculos automaticamente (exceto planos já gerados)

**Inconsistências Críticas**: 
- Duplicação de lógica de cálculo
- Falta de source badges em cards principais
- Planos não recalculam quando perfil muda

**Status Geral**: 🟢 **ARQUITETURA SÓLIDA** com pontos de melhoria identificados
