# INSTRUÇÕES: ANALISAR SE REFEIÇÕES FORAM CRIADAS POR TYPESCRIPT OU IA

## 🎯 OBJETIVO
Analisar as 20 refeições no pool para determinar se foram criadas pelo sistema TypeScript (templates) ou pela IA (Gemini).

---

## 📋 COMO EXECUTAR A ANÁLISE

Acesse o painel do Supabase e execute os SQLs abaixo um por um:

---

## 🔍 **ANÁLISE 1: MACROS PRECISOS vs SUSPEITOS**

**Execute no SQL Editor do Supabase:**

```sql
SELECT 
  id,
  name,
  meal_type,
  total_calories,
  total_protein,
  total_carbs,
  total_fat,
  -- Verificar se macros são suspeitos (múltiplos de 5 ou 10)
  CASE 
    WHEN total_protein % 5 = 0 AND total_protein > 0 THEN 'SUSPEITO (múltiplo de 5)'
    WHEN total_carbs % 5 = 0 AND total_carbs > 0 THEN 'SUSPEITO (múltiplo de 5)'
    WHEN total_fat % 5 = 0 AND total_fat > 0 THEN 'SUSPEITO (múltiplo de 5)'
    ELSE 'PRECISO'
  END as protein_suspect,
  -- Verificar se calorias são redondas (sugere IA)
  CASE 
    WHEN total_calories % 50 = 0 AND total_calories > 100 THEN 'SUSPEITO (redondo)'
    ELSE 'PRECISO'
  END as calories_suspect
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
ORDER BY created_at DESC
LIMIT 20;
```

**O que procurar:**
- ✅ **TypeScript:** Macros precisos (ex: 32.5g proteína, 28.3g carboidratos)
- ❌ **IA:** Macros suspeitos (ex: 30.0g proteína, 25.0g carboidratos - múltiplos de 5)

---

## 🔍 **ANÁLISE 2: PORÇÕES ESPECÍFICAS vs GENÉRICAS**

```sql
SELECT 
  id,
  name,
  meal_type,
  components,
  -- Contar porções genéricas
  CASE 
    WHEN components::text ILIKE '%1 porção%' THEN 'PORÇÃO GENÉRICA'
    WHEN components::text ILIKE '%a gosto%' THEN 'PORÇÃO GENÉRICA'
    WHEN components::text ILIKE '%unidade%' AND NOT components::text ILIKE '%120g%' AND NOT components::text ILIKE '%100g%' THEN 'PORÇÃO GENÉRICA'
    WHEN components::text ILIKE '%xícara%' AND NOT components::text ILIKE '%80g%' AND NOT components::text ILIKE '%50g%' THEN 'PORÇÃO GENÉRICA'
    ELSE 'PORÇÃO ESPECÍFICA'
  END as portion_type
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
ORDER BY created_at DESC
LIMIT 20;
```

**O que procurar:**
- ✅ **TypeScript:** Porções específicas (120g frango, 100g arroz, 80g brócolis)
- ❌ **IA:** Porções genéricas (1 porção, a gosto, 1 unidade sem peso)

---

## 🔍 **ANÁLISE 3: AGRUPAMENTOS vs INGREDIENTES SEPARADOS**

```sql
SELECT 
  id,
  name,
  meal_type,
  -- Verificar se nome indica agrupamento
  CASE 
    WHEN name ILIKE '% com %' THEN 'AGRUPADO'
    WHEN name ILIKE '%Salada de%' THEN 'AGRUPADO'
    WHEN name ILIKE '%Vitamina de%' THEN 'AGRUPADO'
    ELSE 'SEPARADO'
  END as grouping_type,
  -- Contar número de componentes
  jsonb_array_length(components) as num_components
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
ORDER BY created_at DESC
LIMIT 20;
```

**O que procurar:**
- ✅ **TypeScript:** Nomes agrupados ("Pão com ovo mexido", "Salada com azeite")
- ❌ **IA:** Ingredientes separados ("Pão", "Ovo mexido", "Salada")

---

## 🔍 **ANÁLISE 4: REFEIÇÕES PROBLEMÁTICAS (INDICA IA)**

```sql
SELECT 
  'TEMPEROS ISOLADOS' as issue_type,
  COUNT(*) as count
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND (
    name ILIKE '%Cenoura cozida%' OR
    name ILIKE '%Alface americana%' OR
    name ILIKE '%Tomate%' OR
    name ILIKE '%Cebola refogada%'
  )
  AND jsonb_array_length(components) = 1

UNION ALL

SELECT 
  'AZEITE ISOLADO' as issue_type,
  COUNT(*) as count
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND name ILIKE '%Azeite%'
  AND jsonb_array_length(components) = 1

UNION ALL

SELECT 
  'MENOS DE 2 COMPONENTES' as issue_type,
  COUNT(*) as count
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND jsonb_array_length(components) < 2
  AND name NOT ILIKE '%lasanha%'
  AND name NOT ILIKE '%feijoada%'
  AND name NOT ILIKE '%vitamina%'

UNION ALL

SELECT 
  'CALORIAS MUITO BAIXAS' as issue_type,
  COUNT(*) as count
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND total_calories < 50
  AND meal_type != 'ceia';
```

**O que procurar:**
- ✅ **TypeScript:** 0 refeições problemáticas (validações funcionam)
- ❌ **IA:** Pode haver refeições problemáticas

---

## 🔍 **ANÁLISE 5: RESUMO FINAL - VEREDICTO**

```sql
WITH analysis AS (
  SELECT 
    COUNT(*) as total_meals,
    SUM(CASE WHEN total_protein % 5 = 0 AND total_protein > 0 THEN 1 ELSE 0 END) as suspicious_protein,
    SUM(CASE WHEN total_carbs % 5 = 0 AND total_carbs > 0 THEN 1 ELSE 0 END) as suspicious_carbs,
    SUM(CASE WHEN total_fat % 5 = 0 AND total_fat > 0 THEN 1 ELSE 0 END) as suspicious_fat,
    SUM(CASE WHEN total_calories % 50 = 0 AND total_calories > 100 THEN 1 ELSE 0 END) as suspicious_calories,
    SUM(CASE WHEN name ILIKE '% com %' OR name ILIKE 'Salada de %' OR name ILIKE 'Vitamina de %' THEN 1 ELSE 0 END) as grouped_names,
    SUM(CASE WHEN jsonb_array_length(components) < 2 AND name NOT ILIKE '%lasanha%' AND name NOT ILIKE '%feijoada%' AND name NOT ILIKE '%vitamina%' THEN 1 ELSE 0 END) as single_components,
    AVG(jsonb_array_length(components)) as avg_components
  FROM meal_combinations
  WHERE is_active = true
    AND approval_status = 'approved'
)
SELECT 
  total_meals,
  suspicious_protein,
  suspicious_carbs,
  suspicious_fat,
  suspicious_calories,
  grouped_names,
  single_components,
  avg_components,
  -- Veredicto baseado nas evidências
  CASE 
    WHEN suspicious_protein = 0 AND suspicious_carbs = 0 AND suspicious_fat = 0 AND single_components = 0 AND grouped_names > 0 THEN '100% TYPESCRIPT'
    WHEN suspicious_protein > total_meals * 0.5 OR single_components > total_meals * 0.3 THEN 'PROVAVELMENTE IA'
    WHEN grouped_names > total_meals * 0.5 AND single_components = 0 THEN 'PROVAVELMENTE TYPESCRIPT'
    ELSE 'MISTURA OU INCERTO'
  END as veredicto
FROM analysis;
```

---

## 📊 **COMO INTERPRETAR OS RESULTADOS**

### **EVIDÊNCIAS DE TYPESCRIPT:**
- ✅ Macros precisos (não múltiplos de 5)
- ✅ Porções específicas (120g, 100g, 80g)
- ✅ Nomes agrupados ("com", "Salada de", "Vitamina de")
- ✅ 0 refeições problemáticas
- ✅ Estrutura padronizada de componentes

### **EVIDÊNCIAS DE IA:**
- ❌ Macros suspeitos (múltiplos de 5: 30.0, 25.0, 20.0)
- ❌ Porções genéricas ("1 porção", "a gosto")
- ❌ Ingredientes separados (sem agrupamento)
- ❌ Refeições problemáticas (temperos isolados, azeite isolado)
- ❌ Calorias redondas (múltiplos de 50)

### **VEREDICTO FINAL:**
- **100% TYPESCRIPT:** Todas as evidências apontam para TypeScript
- **PROVAVELMENTE IA:** Mais de 50% das evidências apontam para IA
- **PROVAVELMENTE TYPESCRIPT:** Mais de 50% das evidências apontam para TypeScript
- **MISTURA:** Evidências mistas ou inconclusivas

---

## 📋 **CHECKLIST DE VALIDAÇÃO**

Após executar os SQLs, marque:

- [ ] Macros são precisos (não múltiplos de 5)
- [ ] Porções são específicas (120g, 100g, etc)
- [ ] Nomes são agrupados ("com", "Salada de")
- [ ] 0 refeições problemáticas
- [ ] Estrutura padronizada de componentes
- [ ] Veredicto final: TYPESCRIPT ou IA

---

## 🎯 **RESULTADO ESPERADO**

Com as novas validações implementadas (v1.2.0-pool-validations), o resultado deve ser:

**✅ 100% TYPESCRIPT:**
- Macros precisos baseados em TACO/TBCA
- Porções específicas
- Nomes agrupados
- 0 refeições problemáticas
- Validações funcionando

---

**Execute os SQLs e me envie os resultados para eu dar o veredicto final!**
