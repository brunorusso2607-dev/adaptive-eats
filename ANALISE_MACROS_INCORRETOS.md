# ANÁLISE CRÍTICA: MACROS INCORRETOS

## 🚨 PROBLEMA REPORTADO

**Café preto (150g) = 491 kcal** ❌

Valor correto: ~2 kcal (café preto tem praticamente 0 calorias)

---

## 🔍 INVESTIGAÇÃO DA FONTE DOS DADOS

### **Arquitetura atual de cálculo de macros:**

```
CAMADA 0: canonical_ingredients (prioridade máxima)
    ↓ (se não encontrar)
CAMADA 1: foods (tabela do banco - TBCA/TACO/etc)
    ↓ (se não encontrar)
CAMADA 2: category_fallback (estimativa por categoria)
    ↓ (último recurso)
CAMADA 3: ai_estimate (estimativa da IA)
```

### **Arquivo responsável:**
`supabase/functions/_shared/calculateRealMacros.ts`

---

## 🎯 POSSÍVEIS CAUSAS DO PROBLEMA

### **1. Falso match no banco de dados**
- Busca por "café preto" pode estar retornando "café com leite" ou outro alimento
- Linha 258-274: Proteção contra falsos matches de bebidas
- Linha 292-320: Validação nutricional ESTRITA para bebidas

### **2. Dados corrompidos no banco**
- Tabela `foods` pode ter entrada incorreta para café preto
- Linha 460-497: Validação de dados do banco (rejeita impossíveis)

### **3. IA estimando incorretamente**
- Se não encontrar no banco, IA pode estar estimando errado
- Linha 587-627: Sanity check nas estimativas da IA

### **4. Soma incorreta de componentes**
- Se "café preto" tem múltiplos componentes, pode estar somando errado
- Precisa verificar `meal.components` no banco

---

## 🔍 ONDE INVESTIGAR

### **1. Verificar entrada no banco de dados:**
```sql
-- Verificar se há entrada para café preto
SELECT * FROM foods 
WHERE name ILIKE '%café%preto%' 
OR name ILIKE '%coffee%black%'
OR name_normalized ILIKE '%cafe%preto%';

-- Verificar canonical_ingredients
SELECT * FROM canonical_ingredients 
WHERE name_pt ILIKE '%café%preto%' 
OR name_en ILIKE '%coffee%black%';
```

### **2. Verificar meal_combinations (pool):**
```sql
-- Ver se café preto está no pool com macros incorretos
SELECT id, name, components, total_calories, total_protein, total_carbs, total_fat
FROM meal_combinations
WHERE name ILIKE '%café%preto%'
AND is_active = true;
```

### **3. Verificar meal_plan_items:**
```sql
-- Ver a refeição específica que o usuário está vendo
SELECT id, recipe_name, recipe_ingredients, recipe_calories, recipe_protein, recipe_carbs, recipe_fat
FROM meal_plan_items
WHERE recipe_name ILIKE '%café%preto%'
ORDER BY created_at DESC
LIMIT 5;
```

---

## ⚠️ HIPÓTESE MAIS PROVÁVEL

**O problema está na SOMA dos componentes, não no café preto em si.**

Exemplo:
```json
{
  "name": "Café da manhã com café preto",
  "components": [
    { "name": "Café preto", "grams": 150, "calories": 2 },
    { "name": "Omelete", "grams": 180, "calories": 300 },
    { "name": "Pão integral", "grams": 70, "calories": 189 }
  ],
  "total_calories": 491  // ← SOMA CORRETA
}
```

**MAS** o usuário está vendo:
```
• Café preto (150g) — 491 kcal
```

Isso significa que o **display está mostrando o total da refeição** como se fosse apenas do café preto!

---

## 🎯 SOLUÇÃO PROPOSTA

### **OPÇÃO 1: Verificar se é problema de display (mais provável)**
- O card está mostrando `meal.recipe_calories` (total da refeição)
- Mas deveria mostrar as calorias de cada componente individual

### **OPÇÃO 2: Verificar se é problema de dados**
- Café preto está com dados incorretos no banco
- Precisa corrigir entrada na tabela `foods` ou `canonical_ingredients`

### **OPÇÃO 3: Verificar se é problema de cálculo**
- `calculateRealMacros.ts` está calculando errado
- Precisa adicionar logs para debug

---

## 📋 PRÓXIMOS PASSOS

1. ✅ Executar queries SQL para verificar dados
2. ⏳ Identificar se problema é display ou dados
3. ⏳ Implementar correção específica
4. ⏳ Testar e validar

---

## 🔧 AÇÃO IMEDIATA

**PRECISO VER:**
1. Screenshot completo da tela (para ver se é problema de display)
2. Resultado das queries SQL acima
3. Logs do `calculateRealMacros.ts` para essa refeição específica
