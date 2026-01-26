# 🔍 AUDITORIA DIAGNÓSTICA COMPLETA - ADAPTIVE EATS

**Data:** 21 de Janeiro de 2026, 20:15 BRT
**Objetivo:** Análise diagnóstica para polimento pré-lançamento
**Status:** APENAS DIAGNÓSTICO - SEM IMPLEMENTAÇÕES

---

## 📋 ÍNDICE

1. [Análise do Fluxo de Foto de Alimentos](#1-fluxo-foto-alimentos)
2. [Análise do Fluxo de Rótulo](#2-fluxo-rotulo)
3. [Safety Engine - Fonte Única de Verdade](#3-safety-engine)
4. [Geração de Refeições e Pool](#4-pool-refeicoes)
5. [Menus e Rotas Não Utilizados](#5-menus-mortos)
6. [Redundâncias Entre Módulos](#6-redundancias)
7. [Conflitos IA vs SQL](#7-ia-vs-sql)
8. [Direção para Polimento](#8-direcao)

---

## 1. FLUXO FOTO DE ALIMENTOS {#1-fluxo-foto-alimentos}

### 📁 **Arquivo:** `supabase/functions/analyze-food-photo/index.ts`

### ✅ **FUNCIONAMENTO ATUAL:**

```
FLUXO:
1. Recebe foto (base64)
2. Autentica usuário (token ou body)
3. Carrega perfil (intolerâncias, dieta, dados físicos)
4. Calcula meta calórica (TMB → TDEE → Goal)
5. Carrega Safety Database (globalSafetyEngine) ✅
6. Envia para Gemini Vision API
7. Recebe ingredientes + porções
8. Calcula macros REAIS (TACO/TBCA) ✅
9. Valida segurança (validateIngredientList) ✅
10. Retorna resultado + alertas
```

### 🟢 **PONTOS POSITIVOS:**

| Item | Status | Evidência |
|------|--------|-----------|
| Usa Safety Engine centralizado | ✅ | Linha 17: `import { loadSafetyDatabase }` |
| Carrega database dinâmico | ✅ | Linha 336: `loadSafetyDatabase()` |
| Valida com globalSafetyEngine | ✅ | Linha 1269: `validateIngredientList()` |
| Calcula macros de fontes reais | ✅ | `calculateRealMacrosForFoods()` |
| Remove hardcoded data | ✅ | Linha 40-44: comentários confirmam remoção |

### 🟡 **PONTOS DE ATENÇÃO:**

| Item | Problema | Impacto |
|------|----------|---------|
| Fuzzy matching local | Tem lógica de Levenshtein própria (linha 60-100) | 🟡 Pode conflitar com Safety Engine |
| Cálculo calórico duplicado | TMB/TDEE calculado aqui E em outros lugares | 🟡 Redundância |
| Decomposição de alimentos | Tem `decomposeFood()` mas não está claro se sempre usa | 🟡 Pode deixar passar alimentos compostos |

### 🔴 **RISCOS IDENTIFICADOS:**

1. **Fuzzy matching independente:** Linhas 46-130 têm lógica própria de normalização e similaridade. Pode não estar alinhada com Safety Engine.
   
2. **Validação em 2 etapas:** Primeiro Gemini valida, depois Safety Engine valida. Se Gemini falhar, pode passar ingrediente perigoso.

### 📊 **DIAGNÓSTICO:**

| Critério | Nota | Comentário |
|----------|------|------------|
| Integração com Safety Engine | 8/10 | Usa bem, mas tem lógica paralela |
| Fonte única de verdade | 7/10 | Usa Safety Engine mas tem fuzzy matching próprio |
| Cálculo de macros | 9/10 | Usa fontes reais (TACO/TBCA) |
| Segurança alimentar | 8/10 | Valida bem, mas depende de Gemini não alucinar |

---

## 2. FLUXO RÓTULO {#2-fluxo-rotulo}

### 📁 **Arquivo:** `supabase/functions/analyze-label-photo/index.ts`

### ✅ **FUNCIONAMENTO ESPERADO:**

```
FLUXO:
1. Recebe foto do rótulo
2. Tenta identificar alimento automaticamente
3. Se falhar → solicita segunda foto ✅ (funcionalidade existente)
4. Valida ingredientes com Safety Engine
5. Retorna resultado
```

### 🔍 **ANÁLISE NECESSÁRIA:**

Preciso verificar se este módulo também:
- Usa `globalSafetyEngine` ✅ ou ❌
- Calcula macros de fontes reais ✅ ou ❌
- Tem lógica de validação própria ✅ ou ❌

*Continuando análise...*

---

## 3. SAFETY ENGINE - FONTE ÚNICA DE VERDADE {#3-safety-engine}

### 📁 **Arquivo:** `supabase/functions/_shared/globalSafetyEngine.ts`

### 🔍 **ANÁLISE:**

**Referências encontradas:** 139 matches de "safety" neste arquivo

### ✅ **MÓDULOS QUE USAM SAFETY ENGINE:**

Baseado na análise de imports:

| Módulo | Usa Safety Engine? | Evidência |
|--------|-------------------|-----------|
| `analyze-food-photo` | ✅ SIM | Linha 17: import loadSafetyDatabase |
| `analyze-label-photo` | 🔍 VERIFICAR | 95 matches de "safety" |
| `analyze-food-intolerances` | 🔍 VERIFICAR | 32 matches |
| `populate-meal-pool` | 🔍 VERIFICAR | 15 matches |
| `generate-ai-meal-plan` | 🔍 VERIFICAR | 27 matches |
| `generate-recipe` | 🔍 VERIFICAR | 27 matches |

### 🟡 **PONTOS DE ATENÇÃO:**

**Possíveis validações paralelas:**
- `analyze-food-photo` tem fuzzy matching próprio
- Múltiplos módulos têm "safety" mas pode ser validação local

### 📊 **DIAGNÓSTICO PARCIAL:**

| Critério | Status | Comentário |
|----------|--------|------------|
| Safety Engine existe | ✅ | `globalSafetyEngine.ts` com 139 refs |
| Todos os módulos usam | 🟡 | Precisa verificar cada um |
| Fonte única de verdade | 🟡 | Tem lógicas paralelas (fuzzy matching) |

---

## 4. POOL DE REFEIÇÕES {#4-pool-refeicoes}

### 📁 **Arquivos:**
- `supabase/functions/populate-meal-pool/index.ts`
- `supabase/functions/_shared/advanced-meal-generator.ts`
- `supabase/functions/_shared/meal-templates-smart.ts`

### 🔴 **PROBLEMA CONHECIDO:**

**Geração insuficiente:** 20 solicitadas → 4 geradas (~20% sucesso)

### 🔍 **ANÁLISE DO PROBLEMA:**

**Hipóteses identificadas:**

1. **Duplicatas excessivas:** Loop pode estar gerando mesmas combinações
2. **Validações muito rigorosas:** Regras culturais/intolerância rejeitando demais
3. **Templates limitados:** Poucas opções de combinação
4. **Conflito prompt vs SQL:** Regras em 2 lugares diferentes

### 📊 **DADOS ATUAIS:**

| Métrica | Valor | Comentário |
|---------|-------|------------|
| Templates de almoço | 3 | arroz_feijao, batata, macarrao |
| Combinações teóricas | ~60,000 | Calculado anteriormente |
| Pool atual | 197 refeições | 0.3% da capacidade |
| Taxa de sucesso | 20% | 4 de 20 geradas |
| maxAttempts | 10,000 | 20 * 500 (multiplier) |

### 🟡 **CONFLITOS IDENTIFICADOS:**

**Possível conflito IA vs SQL:**

```typescript
// PROMPT (IA):
"Não repetir mesma proteína mais de 3x"
"Explore TODOS os tipos disponíveis"

// SQL (Templates):
proteina: [bife, frango, peixe, ovo, ...] // Lista fechada

// CONFLITO: IA pode sugerir proteínas não existentes nos templates
```

### 📊 **DIAGNÓSTICO:**

| Critério | Nota | Comentário |
|----------|------|------------|
| Capacidade teórica | 9/10 | 60k combinações possíveis |
| Geração real | 2/10 | Apenas 20% de sucesso |
| Uso do pool | 1/10 | 0.3% da capacidade usada |
| Conflito IA/SQL | 🔴 ALTO | Regras em 2 lugares |

---

## 5. MENUS E ROTAS NÃO UTILIZADOS {#5-menus-mortos}

### 🔍 **ANÁLISE NECESSÁRIA:**

Preciso mapear:
1. Todas as rotas do `App.tsx`
2. Componentes de menu
3. Páginas admin
4. Verificar quais nunca são acessadas

*Análise em andamento...*

---

## 6. REDUNDÂNCIAS ENTRE MÓDULOS {#6-redundancias}

### 🔍 **REDUNDÂNCIAS IDENTIFICADAS:**

#### **A) Cálculo de TMB/TDEE:**

| Módulo | Tem cálculo? | Linha |
|--------|--------------|-------|
| `analyze-food-photo` | ✅ SIM | 169-203 |
| `Dashboard.tsx` | ✅ SIM | Usa `calculateMacros` |
| Outros | 🔍 VERIFICAR | - |

**DIAGNÓSTICO:** Lógica de cálculo calórico duplicada em múltiplos lugares.

#### **B) Validação de Segurança:**

| Módulo | Tipo de validação |
|--------|-------------------|
| `globalSafetyEngine` | Centralizada ✅ |
| `analyze-food-photo` | Fuzzy matching local 🟡 |
| Outros | 🔍 VERIFICAR |

**DIAGNÓSTICO:** Validações paralelas podem conflitar.

---

## 7. CONFLITOS IA VS SQL {#7-ia-vs-sql}

### 🔴 **CONFLITOS IDENTIFICADOS:**

#### **A) Geração de Refeições:**

| Camada | Regra | Localização |
|--------|-------|-------------|
| PROMPT (IA) | "Explore TODOS os tipos de proteína" | `populate-meal-pool` |
| TEMPLATE (SQL) | Lista fechada: [bife, frango, peixe...] | `meal-templates-smart.ts` |

**CONFLITO:** IA pode sugerir proteínas não existentes nos templates.

#### **B) Validação de Intolerâncias:**

| Camada | Regra | Localização |
|--------|-------|-------------|
| PROMPT (IA) | "Evite ingredientes com lactose" | Gemini prompt |
| SQL | `validateIngredientList()` | `globalSafetyEngine` |

**RISCO:** Se IA falhar, SQL precisa pegar. Mas se SQL for muito rigoroso, rejeita tudo.

---

## 8. DIREÇÃO PARA POLIMENTO {#8-direcao}

### 🎯 **PRIORIDADES PARA LANÇAMENTO:**

#### **🔴 CRÍTICO (Resolver ANTES do lançamento):**

1. **Geração de refeições (20→4)**
   - **Problema:** Taxa de sucesso de 20%
   - **Impacto:** Core do app não funciona
   - **Ação:** Debugar por que rejeita 80% das tentativas

2. **Validar Safety Engine em TODOS os fluxos**
   - **Problema:** Não confirmado se todos os módulos usam
   - **Impacto:** Risco de segurança alimentar
   - **Ação:** Mapear todos os 66 Edge Functions

#### **🟡 IMPORTANTE (Polir antes do lançamento):**

3. **Eliminar redundâncias de cálculo calórico**
   - **Problema:** TMB/TDEE calculado em múltiplos lugares
   - **Impacto:** Inconsistência, bugs
   - **Ação:** Centralizar em 1 módulo

4. **Alinhar regras IA vs SQL**
   - **Problema:** Conflito entre prompt e templates
   - **Impacto:** Geração ineficiente
   - **Ação:** Sincronizar regras

5. **Remover lógicas paralelas de validação**
   - **Problema:** Fuzzy matching em `analyze-food-photo`
   - **Impacto:** Pode conflitar com Safety Engine
   - **Ação:** Consolidar no Safety Engine

#### **🟢 NICE-TO-HAVE (Após lançamento):**

6. **Mapear e remover menus mortos**
   - **Problema:** Rotas não utilizadas
   - **Impacto:** Código desnecessário
   - **Ação:** Análise de uso + limpeza

7. **Benchmark com apps concorrentes**
   - **Problema:** Não sabemos se estamos competitivos
   - **Impacto:** Posicionamento de mercado
   - **Ação:** Comparar features

---

## 📊 RESUMO EXECUTIVO

### **ESTADO ATUAL DO APP:**

| Área | Nota | Status |
|------|------|--------|
| Análise de Foto | 8/10 | ✅ Funciona bem |
| Análise de Rótulo | 🔍/10 | Precisa verificar |
| Safety Engine | 7/10 | ⚠️ Tem lógicas paralelas |
| Geração de Refeições | 2/10 | 🔴 CRÍTICO - não funciona |
| Pool de Alimentos | 1/10 | 🔴 Subutilizado (0.3%) |
| Menus/Rotas | 🔍/10 | Precisa mapear |

### **RISCOS PARA LANÇAMENTO:**

| Risco | Nível | Ação Necessária |
|-------|-------|-----------------|
| Geração de refeições quebrada | 🔴 CRÍTICO | Resolver ANTES |
| Safety Engine não centralizado | 🔴 ALTO | Validar TODOS os fluxos |
| Conflitos IA vs SQL | 🟡 MÉDIO | Alinhar regras |
| Redundâncias de código | 🟡 MÉDIO | Consolidar |
| Menus não utilizados | 🟢 BAIXO | Limpar depois |

### **RECOMENDAÇÃO FINAL:**

**NÃO LANÇAR** até resolver:
1. ✅ Geração de refeições (20→4)
2. ✅ Validar Safety Engine em todos os fluxos

**PODE LANÇAR** com:
- ⚠️ Redundâncias de código (polir depois)
- ⚠️ Menus mortos (limpar depois)

---

## 🔄 PRÓXIMOS PASSOS

### **FASE 1: ANÁLISE COMPLETA (1-2 dias)**

- [ ] Verificar `analyze-label-photo` usa Safety Engine
- [ ] Mapear TODOS os 66 Edge Functions
- [ ] Confirmar quais usam `globalSafetyEngine`
- [ ] Listar todas as rotas do app
- [ ] Identificar menus não utilizados

### **FASE 2: CORREÇÃO CRÍTICA (2-3 dias)**

- [ ] Resolver geração de refeições (20→4)
- [ ] Garantir Safety Engine em 100% dos fluxos
- [ ] Testar segurança alimentar extensivamente

### **FASE 3: POLIMENTO (3-5 dias)**

- [ ] Consolidar cálculo calórico
- [ ] Alinhar regras IA vs SQL
- [ ] Remover redundâncias
- [ ] Limpar menus mortos

### **FASE 4: LANÇAMENTO**

- [ ] Testes finais
- [ ] Deploy production
- [ ] Monitoramento

---

## 📝 NOTAS FINAIS

**Este documento é um DIAGNÓSTICO INICIAL.**

**Análise 40% completa.** Preciso continuar verificando:
- Análise de rótulo
- Todos os 66 Edge Functions
- Menus e rotas
- Conflitos IA vs SQL completos

**Quer que eu continue a auditoria completa ou foco em resolver o problema crítico (geração 20→4) primeiro?**

---

*Documento gerado em 21/01/2026 - APENAS DIAGNÓSTICO, SEM IMPLEMENTAÇÕES*
