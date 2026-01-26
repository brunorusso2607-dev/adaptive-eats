# TESTAR EDGE FUNCTION LOOKUP-INGREDIENT

## 🔍 PROBLEMA IDENTIFICADO

**Banco de dados está CORRETO:**
- ✅ Água: 0 kcal/100g
- ✅ Laranja: ~28 kcal/100g
- ✅ Sem aliases incorretos

**Mas app mostra:**
- ❌ Água: 42 kcal (para 200g)
- ✅ Laranja: 42 kcal (para 150g)

**Conclusão:** Problema está no **código que busca/calcula**, não no banco.

---

## 🧪 TESTE MANUAL DA EDGE FUNCTION

### Abra o Console do Navegador (F12) e execute:

```javascript
// Teste 1: Buscar "água"
const result1 = await supabase.functions.invoke('lookup-ingredient', {
  body: { query: 'água', limit: 5, country: 'BR' }
});
console.log('Resultado para "água":', result1.data);

// Teste 2: Buscar "laranja"
const result2 = await supabase.functions.invoke('lookup-ingredient', {
  body: { query: 'laranja', limit: 5, country: 'BR' }
});
console.log('Resultado para "laranja":', result2.data);

// Teste 3: Buscar "copo de água"
const result3 = await supabase.functions.invoke('lookup-ingredient', {
  body: { query: 'copo de água', limit: 5, country: 'BR' }
});
console.log('Resultado para "copo de água":', result3.data);
```

---

## 📊 ANÁLISE ESPERADA

### Se edge function está correta:
- "água" deve retornar água com 0 kcal
- "laranja" deve retornar laranja com ~28 kcal
- "copo de água" deve retornar água com 0 kcal

### Se edge function está incorreta:
- "água" retorna laranja (ou outro alimento)
- "copo de água" retorna algo com calorias
- Precisamos corrigir a busca

---

## 🔧 ALTERNATIVA: VERIFICAR INGREDIENTES DA REFEIÇÃO

Execute este SQL para ver os ingredientes EXATOS da refeição problemática:

```sql
SELECT 
  mpi.id,
  mpi.recipe_name,
  mpi.recipe_ingredients,
  mpi.recipe_calories,
  mpi.from_pool
FROM meal_plan_items mpi
JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
WHERE mp.is_active = true
  AND mpi.recipe_name ILIKE '%frango%'
  AND mpi.recipe_name ILIKE '%feijão%'
ORDER BY mpi.created_at DESC
LIMIT 1;
```

Isso vai mostrar o JSON completo dos ingredientes, incluindo:
- Nome de cada ingrediente
- Quantidade
- Calorias (se vier do backend)

---

## 🎯 PRÓXIMAS AÇÕES

1. **Execute o teste JavaScript** no console do navegador
2. **Me mostre os resultados** da busca por "água"
3. **Ou execute o SQL** para ver ingredientes da refeição
4. **Identificaremos** onde está o bug exato

---

## 💡 HIPÓTESE MAIS PROVÁVEL

Baseado na análise, suspeito que:

**O problema está no FRONTEND (useIngredientCalories.tsx)**
- Ingredientes estão em ordem errada
- Busca "1 copo de água" mas retorna resultado de "1 laranja"
- Ou está pegando índice errado do array de resultados

**Não é problema do banco** (já confirmamos que está correto).
