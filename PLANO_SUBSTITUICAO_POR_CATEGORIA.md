# 📋 Plano: Substituição por Categoria Nutricional

## Situação Atual
- ✅ Sistema de substituição funciona
- ❌ Busca apenas por nome similar (ex: "Feijão" → só variações de feijão)
- ❌ Não busca por categoria (ex: "Feijão" deveria mostrar lentilha, grão-de-bico)

## Solução Proposta (Segura)

### Abordagem: Adicionar filtro de categoria no frontend

**Vantagens:**
- ✅ Não modifica Edge Function (zero risco de quebrar)
- ✅ Usa dados já existentes (lookup_foods tem campo `category`)
- ✅ Implementação simples e rápida
- ✅ Fácil de reverter se necessário

### Como Funciona:

1. **Usuário clica para substituir "Feijão"**
2. **Sistema busca normalmente** (por nome)
3. **Frontend filtra resultados** por categoria similar
4. **Mostra apenas ingredientes da mesma categoria**

### Implementação:

**Passo 1: Adicionar lógica de filtro por categoria**
```typescript
// Em UnifiedFoodSearchBlock.tsx
const filterByCategory = (results: LookupFood[], originalCategory: string) => {
  return results.filter(food => food.category === originalCategory);
};
```

**Passo 2: Detectar categoria do ingrediente original**
```typescript
// Quando abre modal de substituição
const originalCategory = detectCategory(originalIngredientName);
```

**Passo 3: Aplicar filtro nos resultados**
```typescript
// Após buscar, filtrar por categoria
const filteredResults = filterByCategory(results, originalCategory);
```

## Problema Identificado

**Limitação:** `lookup_foods` pode não ter campo `category` populado corretamente.

### Solução Alternativa:

Criar mapeamento de categorias baseado em palavras-chave:

```typescript
const CATEGORY_KEYWORDS = {
  'protein_animal': ['frango', 'carne', 'peixe', 'ovo', 'peru', 'salmão'],
  'protein_plant': ['feijão', 'lentilha', 'grão', 'soja', 'tofu'],
  'carb': ['arroz', 'macarrão', 'batata', 'pão', 'quinoa'],
  'vegetable': ['brócolis', 'couve', 'alface', 'tomate', 'cenoura'],
  'fruit': ['banana', 'maçã', 'laranja', 'morango'],
  'dairy': ['leite', 'queijo', 'iogurte', 'requeijão'],
  'fat': ['azeite', 'óleo', 'manteiga', 'abacate']
};

function detectCategory(ingredientName: string): string {
  const nameLower = ingredientName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => nameLower.includes(keyword))) {
      return category;
    }
  }
  
  return 'other';
}
```

## Decisão Necessária

**Opção A: Modificar Edge Function (Mais Completo)**
- ✅ Usa UNIVERSAL_INGREDIENTS (dados completos)
- ✅ Categorias já definidas
- ❌ Requer deploy
- ❌ Risco de quebrar

**Opção B: Filtro no Frontend (Mais Seguro)**
- ✅ Sem deploy
- ✅ Zero risco
- ✅ Fácil de implementar
- ❌ Depende de `category` em `lookup_foods`

**Opção C: Mapeamento Manual (Intermediário)**
- ✅ Sem deploy
- ✅ Controle total
- ✅ Funciona sempre
- ❌ Precisa manter lista de keywords

## Recomendação Final

**Opção C** é a melhor porque:
1. Não quebra nada existente
2. Funciona imediatamente
3. Fácil de manter
4. Pode ser melhorada depois

## Próximos Passos

1. Criar arquivo `src/lib/ingredientCategories.ts` com mapeamento
2. Adicionar função `detectCategory(name: string)`
3. Modificar `UnifiedFoodSearchBlock` para filtrar por categoria
4. Testar com "Feijão" → deve mostrar lentilha, grão-de-bico
5. Testar com "Frango" → deve mostrar peixe, carne, peru

## Aguardando Aprovação

Qual opção você prefere?
- [ ] Opção A: Modificar Edge Function
- [ ] Opção B: Filtro no Frontend
- [ ] Opção C: Mapeamento Manual (RECOMENDADO)
