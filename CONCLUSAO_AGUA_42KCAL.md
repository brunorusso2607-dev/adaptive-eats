# CONCLUSÃO: INVESTIGAÇÃO ÁGUA 42 KCAL

## 🎯 DESCOBERTAS

### ✅ BANCO DE DADOS ESTÁ CORRETO
- Água: 0 kcal/100g (TACO/TBCA) ✅
- Laranja: ~28 kcal/100g (TACO/TBCA) ✅
- Sem aliases incorretos ✅

### ✅ CÓDIGO ESTÁ CORRETO
- `useIngredientCalories.tsx`: Busca correta no banco ✅
- `lookup-ingredient/index.ts`: Filtra apenas fontes confiáveis ✅
- `MealRecipeDetail.tsx`: Apenas exibe ingredientes do banco ✅

### ❌ ÁGUA NÃO ESTÁ NO BANCO
Query SQL mostrou que a refeição "Filé de frango grelhado com arroz integral, feijão carioca e salada" tem:
- Arroz integral (120g)
- Feijão carioca (100g)
- Filé de frango grelhado ao limão (180g)
- Salada de folhas verdes (150g)
- 1 laranja pera (sobremesa) (150g)
- **ÁGUA NÃO APARECE** ❌

---

## 🔍 HIPÓTESES RESTANTES

### Hipótese 1: Screenshot é de OUTRA refeição
O screenshot pode ser de uma refeição diferente da que consultamos no SQL.

**Ação:** Verificar qual refeição exatamente está mostrando água com 42 kcal.

### Hipótese 2: Água é adicionada pelo BACKEND mas não salva
Backend pode estar adicionando água ao retornar a refeição (via API), mas não salvando no banco.

**Ação:** Verificar resposta da API ao buscar a refeição.

### Hipótese 3: Água é adicionada por OUTRO componente
Pode haver outro componente que adiciona água aos ingredientes antes de exibir.

**Ação:** Procurar por código que manipula `recipe_ingredients` antes de exibir.

---

## 🧪 PRÓXIMOS PASSOS

### 1. CONFIRMAR QUAL REFEIÇÃO TEM O PROBLEMA
Execute este SQL para ver TODAS as refeições do plano ativo:

```sql
SELECT 
  mpi.id,
  mpi.meal_type,
  mpi.recipe_name,
  jsonb_array_length(mpi.recipe_ingredients) as num_ingredientes,
  mpi.from_pool
FROM meal_plan_items mpi
JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
WHERE mp.is_active = true
ORDER BY mpi.meal_type;
```

Depois, para a refeição específica que mostra água com 42 kcal, execute:

```sql
-- Substitua 'ID_DA_REFEICAO' pelo ID correto
WITH meal_data AS (
  SELECT recipe_ingredients
  FROM meal_plan_items
  WHERE id = 'ID_DA_REFEICAO'
)
SELECT 
  ingredient->>'item' as ingrediente,
  ingredient->>'quantity' as quantidade,
  (ingredient->>'calories')::numeric as calorias
FROM meal_data,
     jsonb_array_elements(meal_data.recipe_ingredients) as ingredient;
```

### 2. VERIFICAR RESPOSTA DA API
No Console do navegador (F12), execute:

```javascript
// Buscar a refeição específica
const { data, error } = await supabase
  .from('meal_plan_items')
  .select('*')
  .eq('id', 'ID_DA_REFEICAO')
  .single();

console.log('Ingredientes da API:', data.recipe_ingredients);
```

### 3. VERIFICAR SE HÁ MANIPULAÇÃO DOS INGREDIENTES
Procurar no código por:
- Funções que adicionam água aos ingredientes
- Transformações em `recipe_ingredients` antes de exibir
- Componentes que modificam a lista de ingredientes

---

## 💡 SOLUÇÃO TEMPORÁRIA

Se o problema persistir e não conseguirmos identificar a causa, podemos adicionar uma **proteção sintética** no frontend:

```typescript
// Em useIngredientCalories.tsx ou MealRecipeDetail.tsx
const ingredientsWithWaterFix = ingredients.map(ing => {
  if (ing.item.toLowerCase().includes('água') || 
      ing.item.toLowerCase().includes('water')) {
    return { ...ing, calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
  return ing;
});
```

Mas isso é **paliativo**. O ideal é encontrar a causa raiz.

---

## 📋 RESUMO

**Problema:** Água mostrando 42 kcal no app  
**Banco de dados:** ✅ Correto (água = 0 kcal)  
**Código:** ✅ Correto (busca e exibe corretamente)  
**Causa:** ❓ Água não está salva no banco, mas aparece no app  

**Próximo passo:** Identificar de onde vem a água com 42 kcal no app.
