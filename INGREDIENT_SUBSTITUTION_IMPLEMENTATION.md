# Sistema de Substituição Inteligente de Ingredientes

## ✅ Implementado

### Backend
1. **`ingredientClassifier.ts`** - Helper para classificação de ingredientes
   - Classifica ingredientes em 11 categorias (proteína, carboidrato, vegetal, etc)
   - Calcula score de compatibilidade (0-100)
   - Ajusta porções para igualar calorias
   - Filtra por restrições do usuário

2. **`get-ingredient-substitutes` Edge Function** - API de substituições
   - Busca ingredientes similares no `canonical_ingredients`
   - Filtra por categoria, calorias (±30%), restrições
   - Retorna até 10 substituições ordenadas por match score
   - Calcula porção equivalente automaticamente

### Frontend
3. **`useIngredientSubstitutes.ts`** - Hook React
   - `fetchSubstitutes()` - busca substituições
   - `applySubstitute()` - aplica substituição e atualiza banco
   - Recalcula macros totais da refeição

4. **`IngredientSubstituteDropdown.tsx`** - Componente de UI
   - Dropdown com lista de substituições
   - Badges de qualidade (Perfeito, Ótimo, Bom, Regular)
   - Mostra diferença de calorias e proteína
   - Ícones visuais (✓ verde, ⚠️ amarelo/laranja)

## 🔄 Próximos Passos

### 1. Integrar no MealRecipeDetail.tsx
O componente `MealRecipeDetail.tsx` já tem um sistema de substituição usando `IngredientSearchSheet`. Precisamos:

**Opção A: Substituir completamente**
- Remover `IngredientSearchSheet`
- Adicionar `IngredientSubstituteDropdown` ao lado de cada ingrediente
- Adaptar para funcionar com `components` (pool) e `recipe_ingredients` (IA)

**Opção B: Híbrido (RECOMENDADO)**
- Manter `IngredientSearchSheet` como fallback
- Adicionar `IngredientSubstituteDropdown` como opção primária
- Se não houver substituições no pool, mostrar botão para busca manual

### 2. Adaptar para Refeições do Pool
Refeições do pool usam estrutura diferente:
```typescript
// Pool (meal_combinations)
{
  components: [
    {
      id: "frango_grelhado",
      name: "Frango grelhado",
      grams: 100,
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6
    }
  ]
}

// IA (meal_plan_items)
{
  recipe_ingredients: [
    {
      item: "Frango grelhado",
      quantity: "100",
      unit: "g"
    }
  ]
}
```

**Solução:**
- Detectar se refeição tem `from_pool = true`
- Se sim, usar `components` diretamente (já tem macros)
- Se não, usar `recipe_ingredients` (precisa buscar macros)

### 3. Adicionar Botão de Substituição
Modificar linha 427 do `MealRecipeDetail.tsx`:

```tsx
// ANTES
<RefreshCw className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />

// DEPOIS
{meal.from_pool ? (
  <IngredientSubstituteDropdown
    mealPlanItemId={meal.id}
    componentIndex={index}
    ingredient={{
      id: ingredient.id || '',
      name: ingredient.item,
      grams: parseFloat(ingredient.quantity || '100'),
      calories: ingredient.calories || 0,
      protein: ingredient.protein || 0,
      carbs: ingredient.carbs || 0,
      fat: ingredient.fat || 0
    }}
    userProfile={{
      intolerances: profile?.intolerances,
      dietary_preference: profile?.dietary_preference,
      excluded_ingredients: profile?.excluded_ingredients
    }}
    currentMealIngredients={localIngredients.map(i => i.id || i.item)}
    onSubstituted={() => {
      // Recarregar refeição
    }}
  />
) : (
  <RefreshCw 
    className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
    onClick={() => handleOpenSubstitution(ingredient)}
  />
)}
```

### 4. Testar Fluxo Completo
1. Gerar plano de 30 dias (deve usar pool)
2. Abrir detalhes de uma refeição
3. Clicar no botão [🔄] ao lado de um ingrediente
4. Ver dropdown com substituições
5. Selecionar uma substituição
6. Verificar se macros foram recalculados
7. Verificar se mudança foi salva no banco

### 5. Melhorias Futuras
- [ ] Cache de substituições (evitar buscar múltiplas vezes)
- [ ] Histórico de substituições do usuário
- [ ] Sugestões personalizadas baseadas em preferências
- [ ] Analytics: quais ingredientes são mais substituídos
- [ ] Permitir desfazer substituição (undo)
- [ ] Mostrar impacto nos macros totais do dia

## 🔍 Estrutura de Dados

### canonical_ingredients (Tabela)
```sql
CREATE TABLE canonical_ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  calories_per_100g NUMERIC,
  protein_per_100g NUMERIC,
  carbs_per_100g NUMERIC,
  fat_per_100g NUMERIC,
  fiber_per_100g NUMERIC,
  allergens_static TEXT[],
  allergens_dynamic TEXT[],
  source TEXT -- 'TACO', 'TBCA', 'USDA', etc
);
```

### meal_plan_items (Tabela)
```sql
-- Refeições do pool
components JSONB -- Array de ingredientes com macros
from_pool BOOLEAN -- true se veio do pool

-- Refeições geradas por IA
recipe_ingredients JSONB -- Array de ingredientes sem macros
from_pool BOOLEAN -- false ou null
```

## 📊 Métricas de Sucesso
- [ ] 90%+ das substituições têm match score > 75
- [ ] Diferença calórica média < 15%
- [ ] Tempo de resposta < 500ms
- [ ] Taxa de erro < 1%
- [ ] Usuários substituem média de 2-3 ingredientes por plano

## 🚨 Riscos Mitigados
1. ✅ Pool vazio → Mensagem "Sem substituições disponíveis"
2. ✅ Ingredientes raros → Fallback para busca manual
3. ✅ Desbalanceamento de macros → Alerta visual se > 15%
4. ✅ Performance → Index em `canonical_ingredients(category, calories_per_100g)`
5. ✅ Restrições → Filtro automático por intolerâncias/preferências

## 🎯 Status Atual
- ✅ Backend implementado e deployado
- ✅ Frontend (hook + componente) criado
- ⏳ Integração no MealRecipeDetail.tsx (PRÓXIMO PASSO)
- ⏳ Testes end-to-end
- ⏳ Documentação de usuário
