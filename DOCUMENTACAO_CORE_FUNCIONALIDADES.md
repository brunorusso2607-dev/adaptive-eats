# DOCUMENTAÇÃO COMPLETA - ADAPTIVE EATS CORE

## 🎯 VISÃO GERAL
Sistema de planejamento alimentar personalizado com IA, focado em nutrição adaptativa baseada em restrições alimentares, preferências culturais e objetivos de saúde.

---

## 🏗️ ARQUITETURA PRINCIPAL

### 1. GERAÇÃO DE PLANOS ALIMENTARES (3 NÍVEIS)

#### **Nível 1: POOL (Prioridade Máxima)**
- **Localização:** `meal_combinations` (tabela)
- **Função:** Refeições pré-validadas e testadas
- **Vantagens:** 
  - Instantâneo (sem custo de IA)
  - 100% validado para intolerâncias
  - Macros precisos (TACO/TBCA)
- **Processo:**
  - Busca refeições compatíveis no pool
  - Filtra por país, tipo de refeição, intolerâncias
  - Retorna refeição completa com ingredientes

#### **Nível 2: GERAÇÃO DIRETA (Fallback Inteligente)**
- **Localização:** `advanced-meal-generator.ts`
- **Função:** Geração algorítmica sem IA
- **Vantagens:**
  - Rápido (sem latência de IA)
  - Determinístico e previsível
  - Usa templates culturais (`SMART_TEMPLATES`)
- **Processo:**
  - Usa templates por país/tipo de refeição
  - Combina ingredientes de slots pré-definidos
  - Valida regras culturais (`CULTURAL_RULES`)
  - Calcula macros de canonical_ingredients

#### **Nível 3: IA GEMINI (Último Recurso)**
- **Localização:** `generate-ai-meal-plan/index.ts`
- **Função:** Geração criativa com Gemini
- **Vantagens:**
  - Máxima variedade
  - Adaptação a casos complexos
- **Desvantagens:**
  - Custo de API
  - Latência
  - Requer validação extra
- **Processo:**
  - Prompt com regras culturais e nutricionais
  - Gemini retorna JSON com ingredientes
  - Backend calcula macros reais (não usa macros da IA)

---

## 📊 SISTEMA DE MACRONUTRIENTES

### **Hierarquia de Fontes (Ordem de Prioridade):**

1. **canonical_ingredients** (Prioridade 1)
   - Ingredientes normalizados e validados
   - Macros por 100g de TACO/TBCA
   - Usado em geração direta

2. **foods (TACO/TBCA)** (Prioridade 2)
   - Base de dados nutricional brasileira
   - ~8000 alimentos
   - Fonte confiável e oficial

3. **Cálculo Sintético** (Prioridade 3)
   - Para ingredientes sem match exato
   - Baseado em categoria e similaridade
   - Exemplo: Água sempre 0 kcal

4. **IA (NUNCA usado para macros individuais)**
   - IA gera apenas nomes de ingredientes
   - Backend sempre recalcula macros
   - Proteção contra macros incorretos da IA

### **Proteções Implementadas:**

```typescript
// Água sempre 0 kcal (proteção sintética)
if (isWater(ingredient)) {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

// Validação de limites razoáveis
if (calories > 900 || protein > 100) {
  // Rejeitar ou usar fallback
}
```

---

## 🌍 SISTEMA CULTURAL

### **Países Suportados:**
- 🇧🇷 Brasil (BR) - ATIVO
- 🇺🇸 United States (US)
- 🇵🇹 Portugal (PT)
- 🇬🇧 Reino Unido (GB)
- 🇪🇸 España (ES)
- 🇲🇽 México (MX)
- 🇦🇷 Argentina (AR)
- 🇨🇱 Chile (CL)
- 🇵🇪 Perú (PE)

### **Templates Culturais (SMART_TEMPLATES):**

#### Brasil - Almoço:
- **Arroz (90%):** Arroz + Feijão + Proteína + Salada
- **Macarrão (5%):** Macarrão + Proteína + Molho (SEM salada, SEM feijão)
- **Batata (5%):** Batata + Proteína + Legumes

#### Brasil - Jantar:
- Similar ao almoço, porções menores

#### Brasil - Café da Manhã:
- Proteína leve (ovo, queijo, iogurte)
- Carboidrato (pão, tapioca, aveia)
- Fruta opcional

#### Brasil - Ceia:
- Apenas laticínios (iogurte, leite, queijo branco)
- Leve e digestivo

### **Regras Culturais (CULTURAL_RULES):**

```typescript
FORBIDDEN_COMBINATIONS = [
  ["macarrão", "salada"],     // Brasil
  ["macarrão", "feijão"],     // Brasil
  ["batata", "arroz"],        // Global
  ["arroz", "macarrão"]       // Global
]

CONDITIONAL_COMPONENTS = {
  "salada": {
    allowed_with: ["arroz", "batata"],
    forbidden_with: ["macarrão", "sopa"]
  },
  "feijão": {
    allowed_with: ["arroz"],
    forbidden_with: ["macarrão", "batata"]
  }
}
```

---

## 🔍 SISTEMA DE BUSCA DE ALIMENTOS

### **Edge Function: lookup-ingredient**

**Processo de Busca:**

1. **Normalização:**
   - Remove acentos, plural, artigos
   - Extrai ingrediente principal
   - Exemplo: "1 filé de frango grelhado" → "frango"

2. **Busca no Banco:**
   - Prioriza fontes por país (TBCA para BR)
   - Filtra prepared dishes
   - Filtra false matches (idioma errado)
   - Filtra categoria incompatível

3. **Scoring e Ranking:**
   - Exact match: score 100
   - Partial match: score 50-80
   - Similar match: score 30-50

4. **Retorno:**
   - Top 5 resultados
   - Ordenados por score
   - Com macros por 100g

### **Frontend: useIngredientCalories**

**Processo de Cálculo:**

1. Extrai ingrediente principal
2. Chama lookup-ingredient
3. Filtra apenas fontes verificadas (não IA)
4. Calcula macros proporcionais à quantidade
5. Retorna calorias, proteína, carbs, gordura

---

## 🛡️ SISTEMA DE VALIDAÇÃO

### **Validação de Proteínas por Refeição:**

```typescript
PROTEIN_CATEGORIES = {
  animal_main: ["frango", "carne", "peixe", "camarão"],
  animal_eggs: ["ovo"],
  dairy: ["queijo", "iogurte", "leite"],
  processed: ["presunto", "salsicha"]
}

MEAL_PROTEIN_RULES = {
  lunch: ["animal_main"],           // Obrigatório proteína animal
  dinner: ["animal_main"],          // Obrigatório proteína animal
  breakfast: ["animal_eggs", "dairy"], // Proteína leve
  supper: ["dairy"]                 // Apenas laticínios
}
```

### **Validação de Porções:**

```typescript
SOLID_FOODS_NEVER_CUP = [
  "arroz", "feijão", "macarrão", "batata",
  "brócolis", "cenoura", "abobrinha", "carne"
]

// Auto-fix: xícara → colher/porção
if (isSolid(food) && unit === "xícara") {
  unit = "colher de sopa"; // ou "porção"
}
```

### **Validação de Gorduras:**

```typescript
// Limites globais
if (ingredient === "azeite" && quantity > 15) {
  quantity = 10; // Auto-fix
}
if (ingredient === "queijo" && quantity > 50) {
  quantity = 30; // Auto-fix
}
```

---

## 🎨 FRONTEND (React + TypeScript)

### **Componentes Principais:**

1. **MealPlanCalendar.tsx**
   - Calendário semanal de refeições
   - Badges: POOL (azul), DIRETO (verde), IA (sem badge)
   - Drag & drop para reorganizar
   - Favoritar refeições

2. **MealRecipeDetail.tsx**
   - Detalhes da refeição
   - Lista de ingredientes com calorias individuais
   - Validação de conflitos com intolerâncias
   - Substituição de ingredientes

3. **MealDetailSheet.tsx**
   - Sheet lateral com detalhes completos
   - Instruções de preparo
   - Macros totais
   - Ações (favoritar, substituir, deletar)

4. **useIngredientCalories.tsx**
   - Hook para cálculo de calorias
   - Chama lookup-ingredient
   - Cache de resultados
   - Fallback para valores sintéticos

### **Fluxo de Exibição:**

```
1. Usuário abre calendário
2. Frontend busca meal_plan_items do plano ativo
3. Para cada refeição:
   a. Exibe nome, macros totais
   b. Badge de origem (POOL/DIRETO/IA)
4. Ao clicar na refeição:
   a. Abre MealDetailSheet
   b. Carrega ingredientes (recipe_ingredients)
   c. Para cada ingrediente:
      - Chama useIngredientCalories
      - Exibe calorias individuais com fonte (TACO/TBCA)
```

---

## 🗄️ BANCO DE DADOS (Supabase)

### **Tabelas Principais:**

#### **meal_plans**
- `id`: UUID
- `user_id`: UUID
- `is_active`: boolean
- `created_at`: timestamp

#### **meal_plan_items**
- `id`: UUID
- `meal_plan_id`: UUID (FK)
- `meal_type`: enum (breakfast, lunch, dinner, etc)
- `recipe_name`: text
- `recipe_ingredients`: jsonb[]
- `recipe_calories`: numeric
- `recipe_protein`: numeric
- `recipe_carbs`: numeric
- `recipe_fat`: numeric
- `from_pool`: boolean
- `created_at`: timestamp

#### **meal_combinations (POOL)**
- `id`: UUID
- `country_code`: text
- `meal_type`: text
- `name`: text
- `components`: jsonb[]
- `total_calories`: numeric
- `is_active`: boolean

#### **canonical_ingredients**
- `id`: UUID
- `name`: text
- `name_normalized`: text
- `calories_per_100g`: numeric
- `protein_per_100g`: numeric
- `carbs_per_100g`: numeric
- `fat_per_100g`: numeric
- `source`: text (TACO/TBCA)

#### **foods**
- `id`: UUID
- `name`: text
- `calories_per_100g`: numeric
- `protein_per_100g`: numeric
- `carbs_per_100g`: numeric
- `fat_per_100g`: numeric
- `source`: text (TACO/TBCA)
- `category`: text

#### **ingredient_aliases**
- `id`: UUID
- `alias`: text
- `food_id`: UUID (FK → foods)

---

## 🔧 EDGE FUNCTIONS (Supabase)

### **1. generate-ai-meal-plan**
- **Entrada:** userId, days, country, intolerances
- **Processo:**
  1. Busca perfil do usuário
  2. Para cada dia/refeição:
     - Tenta pool (Nível 1)
     - Se falhar, tenta geração direta (Nível 2)
     - Se falhar, usa IA Gemini (Nível 3)
  3. Calcula macros reais (não usa macros da IA)
  4. Salva em meal_plan_items
- **Saída:** meal_plan_id

### **2. lookup-ingredient**
- **Entrada:** query, country, limit
- **Processo:**
  1. Normaliza query
  2. Busca em foods/canonical_ingredients
  3. Filtra por fonte prioritária (TBCA para BR)
  4. Filtra prepared dishes e false matches
  5. Ordena por score
- **Saída:** Array de matches com macros

### **3. populate-meal-pool**
- **Entrada:** country, mealType, count
- **Processo:**
  1. Gera refeições com IA
  2. Valida regras culturais
  3. Valida proteínas por tipo de refeição
  4. Calcula macros reais
  5. Salva em meal_combinations
- **Saída:** Array de refeições criadas

---

## 🔐 REGRAS DE ARQUITETURA (OBRIGATÓRIAS)

### **1. INTERNACIONALIZAÇÃO**
- ✅ TODO código interno em INGLÊS
- ✅ Variáveis, funções, tipos: inglês
- ✅ Banco de dados: inglês (breakfast, lunch, dinner)
- ✅ UI/UX: Traduzido por país (i18n)
- ❌ NUNCA usar português/espanhol/francês no código

### **2. FALLBACK EM 3 NÍVEIS**
- ✅ Nível 1: Pool → Nível 2: Direto → Nível 3: IA
- ❌ NUNCA pular níveis

### **3. ARROZ E FEIJÃO SEPARADOS**
- ✅ Sempre como itens individuais
- ❌ NUNCA agrupar em "arroz com feijão"

### **4. ÁGUA SEMPRE 0 KCAL**
- ✅ Proteção sintética no código
- ✅ Independente de dados no banco

### **5. MACROS: FONTE ÚNICA DE VERDADE**
- ✅ Hierarquia: canonical → foods → sintético
- ❌ NUNCA usar ing.calories da IA como fallback

### **6. VALIDAÇÃO RIGOROSA**
- ✅ Macros dentro de limites razoáveis
- ✅ Rejeitar valores absurdos
- ✅ Logs detalhados em pontos críticos

### **7. DOCUMENTO OBRIGATÓRIO**
- 📄 `REGRAS_ARQUITETURA_PROJETO.md`
- ✅ Consultar antes de mudanças arquiteturais
- ✅ Atualizar se criar novas regras

---

## 📈 MÉTRICAS E PERFORMANCE

### **Taxa de Sucesso por Nível:**
- Pool: ~30-40% (depende do tamanho do pool)
- Geração Direta: ~50-60% (após otimizações)
- IA: 100% (sempre gera, mas mais lento)

### **Tempo Médio de Geração:**
- Pool: <100ms
- Geração Direta: 200-500ms
- IA: 2-5s (por refeição)

### **Custo:**
- Pool: $0
- Geração Direta: $0
- IA: ~$0.01-0.03 por plano de 7 dias

---

## 🐛 PROBLEMAS CONHECIDOS E SOLUÇÕES

### **1. Água com 42 kcal**
- **Status:** Em investigação
- **Causa provável:** Frontend calculando errado ou pegando índice errado
- **Solução temporária:** Proteção sintética no backend

### **2. Macros impossíveis (Lasanha 3g gordura)**
- **Status:** Resolvido
- **Solução:** Backend sempre recalcula macros, não usa valores da IA

### **3. Queijo como proteína principal em almoço**
- **Status:** Resolvido
- **Solução:** Validação de proteínas por tipo de refeição

### **4. Xícara para sólidos (arroz, feijão)**
- **Status:** Resolvido
- **Solução:** Auto-fix para colher/porção

### **5. Molhos separados do prato principal**
- **Status:** Resolvido
- **Solução:** Combinação automática de molhos com prato principal

---

## 🚀 PRÓXIMAS MELHORIAS

### **Curto Prazo:**
1. Expandir pool para 100+ refeições por país
2. Adicionar mais templates culturais
3. Melhorar scoring de lookup-ingredient
4. Adicionar cache de ingredientes no frontend

### **Médio Prazo:**
1. Suporte a mais países (FR, IT, JP)
2. Sistema de feedback de usuários
3. ML para aprender preferências
4. Geração de lista de compras

### **Longo Prazo:**
1. App mobile nativo
2. Integração com wearables
3. Análise de micronutrientes
4. Comunidade de receitas

---

## 📚 DOCUMENTOS RELACIONADOS

- `REGRAS_ARQUITETURA_PROJETO.md` - Regras obrigatórias
- `ANALISE_MACROS_INCORRETOS.md` - Análise de bugs de macros
- `CONCLUSAO_AGUA_42KCAL.md` - Investigação água 42 kcal
- `INVESTIGAR_AGUA_FINAL.sql` - Queries de investigação

---

## 👥 EQUIPE E CONTATO

- **Desenvolvedor Principal:** Bruno Russo
- **Projeto:** Adaptive Eats
- **Repositório:** c:\adaptive-eats-main
- **Supabase Project:** onzdkpqtzfxzcdyxczkn
- **Dashboard:** https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn

---

**Última Atualização:** 22/01/2026 01:17 UTC-03:00
