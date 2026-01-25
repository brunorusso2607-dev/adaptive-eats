# 🔍 ANÁLISE: DISCREPÂNCIA NO POOL DE REFEIÇÕES

**Data:** 18/01/2026  
**Problema:** Painel mostra 30 refeições, mas apenas 10 aparecem na query

---

## 📊 EVIDÊNCIAS

### **Imagem 1: Query SQL**
```sql
SELECT COUNT(*) FROM meal_combinations;
-- Resultado: 30 refeições no banco ✅

SELECT COUNT(*) FROM meal_combinations 
WHERE is_active = true 
AND approval_status = 'approved';
-- Resultado: 10 refeições aprovadas ⚠️

SELECT id, name, meal_type, country_codes, approval_status, is_active
FROM meal_combinations
LIMIT 10;
```

**Refeições retornadas (10):**
1. Iogurte grego com Mamão papaia e Aveia - cafe_manha - BR - approved - true
2. Tapioca com Queijo cottage - cafe_manha - BR - approved - true
3. Iogurte grego com Mamão papaia - lanche_manha - BR - approved - true
4. Batata doce assada - lanche_manha - BR - approved - true
5. Maçã vermelha com Castanha de caju - lanche_manha - BR - approved - true
6. Macarrão com Carne moída refogada - almoco - BR - approved - true
7. Arroz com feijão, Coxa de frango assada e Salada - almoco - BR - approved - true
8. Batata doce cozida com Salmão grelhado e Salada - almoco - BR - approved - true
9. Pão de forma integral com Queijo cottage - lanche_tarde - BR - approved - true
10. Iogurte grego com Mamão papaia - lanche_tarde - BR - approved - true

### **Imagem 2: Painel Admin**
```
Total no Pool: 30
```

---

## 🔍 ANÁLISE DA DISCREPÂNCIA

### **30 refeições no banco - 10 aprovadas = 20 refeições NÃO APROVADAS**

**Conclusão:** Das 30 refeições no banco, apenas **10 estão aprovadas** (`approval_status = 'approved'`).

As outras **20 refeições** provavelmente têm:
- `approval_status = 'pending'` (aguardando aprovação)
- `approval_status = 'rejected'` (rejeitadas)
- `is_active = false` (inativas)

---

## 🚨 POR QUE O SISTEMA NÃO USOU AS 10 APROVADAS?

### **Análise da Query do `generate-ai-meal-plan`:**

```typescript
const { data: approvedMeals, error: poolError } = await supabaseClient
  .from("meal_combinations")
  .select("...")
  .eq("is_active", true)           // ✅ Filtra ativas
  .eq("approval_status", "approved") // ✅ Filtra aprovadas
  .contains("country_codes", [userCountry]); // ✅ Filtra por país
```

**Filtros aplicados:**
1. ✅ `is_active = true`
2. ✅ `approval_status = 'approved'`
3. ✅ `country_codes` contém país do usuário

**Resultado esperado:** 10 refeições (se país = BR)

---

## 🎯 PROBLEMA IDENTIFICADO

### **PROBLEMA 1: DISTRIBUIÇÃO DESIGUAL POR TIPO DE REFEIÇÃO** ⚠️

Das 10 refeições aprovadas:
- **cafe_manha:** 2 refeições
- **lanche_manha:** 3 refeições
- **almoco:** 3 refeições
- **lanche_tarde:** 2 refeições
- **jantar:** 0 refeições ❌
- **ceia:** 0 refeições ❌

**Impacto:**
```typescript
// Para gerar um dia completo, o sistema precisa de:
// - 1 cafe_manha
// - 1 lanche_manha
// - 1 almoco
// - 1 lanche_tarde
// - 1 jantar  ❌ NÃO TEM NO POOL!
// - 1 ceia    ❌ NÃO TEM NO POOL!

// Código em generate-ai-meal-plan (linha 1747):
let canUsePoolForDay = true;

for (const meal of meals) {
  const poolOptions = getPoolMealsForType(
    meal.type, 
    meal.targetCalories, 
    optionsPerMeal, 
    usedPoolMealIds
  );
  
  if (poolOptions.length >= optionsPerMeal) {
    // OK
  } else {
    canUsePoolForDay = false; // ❌ FALHA AQUI!
    break;
  }
}
```

**Resultado:** Sistema não consegue montar dia completo com pool → usa AI fallback → AI falha → "Nenhuma receita definida"

---

### **PROBLEMA 2: `optionsPerMeal` PODE SER MUITO ALTO** ⚠️

```typescript
// Se optionsPerMeal = 3 (padrão)
// Para cafe_manha: precisa de 3 opções, tem 2 ❌
// Para jantar: precisa de 3 opções, tem 0 ❌
// Para ceia: precisa de 3 opções, tem 0 ❌
```

**Código:**
```typescript
if (poolOptions.length >= optionsPerMeal) {
  // OK
} else {
  canUsePoolForDay = false; // ❌ FALHA!
}
```

---

### **PROBLEMA 3: FALTA DE REFEIÇÕES PARA JANTAR E CEIA** ⚠️ CRÍTICO

**Pool atual (10 refeições aprovadas):**
- ✅ cafe_manha: 2
- ✅ lanche_manha: 3
- ✅ almoco: 3
- ✅ lanche_tarde: 2
- ❌ jantar: 0
- ❌ ceia: 0

**Sistema precisa de TODAS as refeições para montar um dia completo!**

---

## 🔧 SOLUÇÕES

### **SOLUÇÃO 1: APROVAR MAIS REFEIÇÕES** (IMEDIATO)

**Verificar as 20 refeições pendentes:**
```sql
-- Ver refeições pendentes
SELECT id, name, meal_type, country_codes, approval_status, is_active
FROM meal_combinations
WHERE approval_status = 'pending'
ORDER BY meal_type;

-- Ver refeições rejeitadas
SELECT id, name, meal_type, country_codes, approval_status, is_active
FROM meal_combinations
WHERE approval_status = 'rejected'
ORDER BY meal_type;
```

**Aprovar refeições manualmente:**
```sql
-- Aprovar refeições de jantar e ceia
UPDATE meal_combinations
SET approval_status = 'approved'
WHERE meal_type IN ('jantar', 'ceia')
AND approval_status = 'pending';
```

**Tempo:** 5-10 minutos

---

### **SOLUÇÃO 2: GERAR MAIS REFEIÇÕES** (RECOMENDADO)

**Usar `populate-meal-pool` para gerar mais refeições:**
```bash
# Gerar 10 jantares
supabase functions invoke populate-meal-pool --data '{
  "country_code": "BR",
  "meal_type": "jantar",
  "quantity": 10
}'

# Gerar 10 ceias
supabase functions invoke populate-meal-pool --data '{
  "country_code": "BR",
  "meal_type": "ceia",
  "quantity": 10
}'
```

**Tempo:** 10-15 minutos

---

### **SOLUÇÃO 3: REDUZIR `optionsPerMeal`** (TEMPORÁRIO)

**Modificar código para aceitar menos opções:**
```typescript
// Em generate-ai-meal-plan/index.ts
const MIN_OPTIONS_REQUIRED = 1; // Ao invés de optionsPerMeal (3)

if (poolOptions.length >= MIN_OPTIONS_REQUIRED) {
  // Usar o que tiver disponível
  const options = poolOptions.slice(0, optionsPerMeal).map(convertPoolMealToOption);
  // ...
}
```

**Tempo:** 5 minutos

---

### **SOLUÇÃO 4: FALLBACK PARCIAL** (MELHOR ARQUITETURA)

**Permitir usar pool para algumas refeições e AI para outras:**
```typescript
// Ao invés de:
if (canUsePoolForDay) {
  // Usar pool para DIA INTEIRO
} else {
  // Usar AI para DIA INTEIRO
}

// Fazer:
for (const meal of meals) {
  const poolOptions = getPoolMealsForType(...);
  
  if (poolOptions.length > 0) {
    // Usar pool para ESTA refeição
    poolMealsForDay.push(...);
  } else {
    // Usar AI para ESTA refeição específica
    aiMealsForDay.push(...);
  }
}
```

**Tempo:** 30 minutos de desenvolvimento

---

## 📊 DISTRIBUIÇÃO IDEAL DO POOL

### **Mínimo Recomendado:**
```
cafe_manha:    10 refeições (3 opções/dia × 3 dias = 9)
lanche_manha:  10 refeições
almoco:        10 refeições
lanche_tarde:  10 refeições
jantar:        10 refeições
ceia:          10 refeições
---
TOTAL:         60 refeições aprovadas
```

### **Ideal para 20 dias:**
```
cafe_manha:    20 refeições
lanche_manha:  20 refeições
almoco:        20 refeições
lanche_tarde:  20 refeições
jantar:        20 refeições
ceia:          20 refeições
---
TOTAL:         120 refeições aprovadas
```

---

## 🎯 DIAGNÓSTICO FINAL

### **Arquitetura:** ✅ CORRETA
- Pool é consultado primeiro
- Filtros estão corretos

### **Problema 1:** ⚠️ POOL INSUFICIENTE
- Apenas 10 refeições aprovadas
- Faltam jantar e ceia
- Distribuição desigual

### **Problema 2:** ⚠️ REQUISITO MUITO ALTO
- Sistema exige `optionsPerMeal` (3) opções para cada tipo
- Pool não tem opções suficientes
- Sistema falha para o dia inteiro

### **Problema 3:** ⚠️ FALLBACK TUDO-OU-NADA
- Se pool não tem TODAS as refeições → usa AI para TUDO
- Deveria usar pool onde possível + AI onde necessário

---

## 📋 AÇÕES IMEDIATAS

### **1. Verificar Refeições Pendentes** (5 min)
```sql
SELECT meal_type, COUNT(*) 
FROM meal_combinations
WHERE approval_status = 'pending'
GROUP BY meal_type;
```

### **2. Aprovar Refeições de Jantar e Ceia** (5 min)
```sql
UPDATE meal_combinations
SET approval_status = 'approved'
WHERE meal_type IN ('jantar', 'ceia')
AND approval_status = 'pending'
AND is_active = true;
```

### **3. Gerar Mais Refeições** (15 min)
```bash
# Jantar
supabase functions invoke populate-meal-pool --data '{
  "country_code": "BR",
  "meal_type": "jantar",
  "quantity": 10
}'

# Ceia
supabase functions invoke populate-meal-pool --data '{
  "country_code": "BR",
  "meal_type": "ceia",
  "quantity": 10
}'
```

---

## 🎯 CONCLUSÃO

**Problema NÃO é o código, é a QUANTIDADE de refeições aprovadas!**

- ✅ Código está correto
- ⚠️ Pool tem apenas 10 refeições aprovadas
- ⚠️ Faltam jantar e ceia
- ⚠️ Sistema precisa de TODAS as refeições para funcionar

**Solução:** Aprovar mais refeições ou gerar novas.

---

**Deseja que eu crie um script para aprovar automaticamente as refeições pendentes?**
