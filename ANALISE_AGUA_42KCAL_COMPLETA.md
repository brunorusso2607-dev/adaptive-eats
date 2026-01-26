# ANÁLISE COMPLETA: ÁGUA COM 42 KCAL

## 🔍 PROBLEMA REPORTADO

**Sintoma:** Água mostrando 42 kcal quando deveria ser 0 kcal  
**Contexto:** Sistema usa TACO/TBCA como fonte verdadeira, mas valores não batem  
**Evidência:** Screenshot mostra "1 copo de água (opcional) (200g) — 42 kcal (TBCA)"

## 📊 OBSERVAÇÃO CRÍTICA

Na mesma refeição:
- **Água:** 200g = 42 kcal (TBCA) ❌ INCORRETO
- **Laranja:** 150g = 42 kcal (TBCA) ✅ CORRETO

**SUSPEITA FORTE:** Água está pegando calorias da laranja!

Cálculo para laranja:
- 42 kcal / 150g = 0.28 kcal/g = **28 kcal/100g** ✅ (valor correto para laranja)

Se água tivesse 42 kcal para 200g:
- 42 kcal / 200g = 0.21 kcal/g = **21 kcal/100g** ❌ (absurdo para água)

## 🔍 INVESTIGAÇÃO TÉCNICA

### 1. FRONTEND (useIngredientCalories.tsx)
**Status:** ✅ CORRETO
- Busca via edge function `lookup-ingredient`
- Filtra apenas fontes confiáveis
- Não usa fallback incorreto
- Código revisado: linhas 186-252

### 2. EDGE FUNCTION (lookup-ingredient/index.ts)
**Status:** ✅ CORRETO
- Prioriza TBCA/TACO para Brasil
- Filtra fontes não-confiáveis (linha 161-163)
- Proteção anti-falso match (linhas 610, 633, 655)
- Código revisado: 760 linhas completas

### 3. BANCO DE DADOS
**Status:** ⚠️ SUSPEITO - PRECISA INVESTIGAR

**Hipóteses:**
1. **Água no banco tem valor incorreto** (canonical_ingredients ou foods)
2. **Mapeamento incorreto** (água sendo mapeada para laranja)
3. **Busca retornando resultado errado** (query "água" retorna "laranja")
4. **Cache com valor antigo**

## 🎯 PRÓXIMOS PASSOS

### PASSO 1: Executar SQL de investigação
```sql
-- Verificar água em canonical_ingredients
SELECT * FROM canonical_ingredients 
WHERE LOWER(name) LIKE '%água%' OR LOWER(name) LIKE '%water%';

-- Verificar água em foods (TACO/TBCA)
SELECT * FROM foods 
WHERE LOWER(name) LIKE '%água%' OR LOWER(name) LIKE '%water%'
ORDER BY country, source;

-- Verificar laranja
SELECT * FROM foods 
WHERE LOWER(name) LIKE '%laranja%' OR LOWER(name) LIKE '%orange%'
ORDER BY country, source;
```

### PASSO 2: Testar busca manualmente
- Chamar edge function com query "água"
- Verificar qual resultado retorna
- Confirmar se retorna água ou laranja

### PASSO 3: Verificar refeição específica
- Buscar meal_plan_item com água 42 kcal
- Ver recipe_ingredients completo
- Identificar se problema é no banco ou no cálculo

## 🔧 POSSÍVEIS SOLUÇÕES

### Se água tem valor incorreto no banco:
```sql
UPDATE foods 
SET calories_per_100g = 0,
    protein_per_100g = 0,
    carbs_per_100g = 0,
    fat_per_100g = 0
WHERE LOWER(name) LIKE '%água%' 
  AND source IN ('TBCA', 'taco');
```

### Se é problema de mapeamento:
- Verificar ingredient_aliases
- Corrigir alias incorreto

### Se é problema de busca:
- Adicionar proteção específica para água
- Forçar água = 0 kcal sempre

## 📋 ARQUIVOS ANALISADOS

1. ✅ `src/hooks/useIngredientCalories.tsx` (261 linhas)
2. ✅ `supabase/functions/lookup-ingredient/index.ts` (760 linhas)
3. ⏳ `INVESTIGAR_AGUA_42KCAL_PROFUNDO.sql` (criado)

## 🎯 CONCLUSÃO PRELIMINAR

**Código está correto.** O problema está nos **dados do banco**.

Próximo passo: **Executar SQL** para identificar fonte exata dos 42 kcal.
