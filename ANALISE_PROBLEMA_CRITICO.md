# 🚨 ANÁLISE DO PROBLEMA CRÍTICO - UNIFIED MEAL CORE

**Data:** 23/01/2026  
**Reportado por:** Usuário  
**Severidade:** 🔴 CRÍTICA

---

## 📸 EVIDÊNCIA DO PROBLEMA

**Imagem mostra refeição "Arroz" com os seguintes problemas:**

### ❌ PROBLEMA 1: NOME DA REFEIÇÃO PERDIDO
- **Esperado:** Nome descritivo da refeição (ex: "Frango com Arroz e Feijão")
- **Atual:** Apenas "Arroz" (genérico)
- **Impacto:** Usuário não sabe o que é a refeição completa

### ❌ PROBLEMA 2: PROTEÍNA VIROU GENÉRICA
- **Esperado:** "Filé de tilápia grelhado ao limão (150g)"
- **Atual:** "proteina animal (100g)"
- **Impacto:** Usuário não sabe qual proteína vai comer

### ❌ PROBLEMA 3: ORDEM INCORRETA
- **Esperado:** Proteína → Arroz → Feijão → Salada → Água
- **Atual:** Arroz → Salada → Água → Feijão → Tilápia → proteina animal
- **Impacto:** Ordem não segue padrão brasileiro

---

## 🔍 CAUSA RAIZ IDENTIFICADA

### **PROBLEMA 1: Nome da Refeição**

**Localização:** `index.ts` linha 136

```typescript
const meal: UnifiedMeal = {
  name: mealName,  // ← AQUI: usando mealName do parâmetro
  // ...
}
```

**Análise:**
- A função `processRawMeal()` recebe `mealName` como parâmetro
- Este nome vem do adapter que chama a função
- Se o adapter passar nome errado, o Core usa esse nome errado
- **NÃO HÁ VALIDAÇÃO** do nome da refeição

**Onde o nome é perdido:**
- `generateMealsWithCore()` linha 751-760 em `advanced-meal-generator.ts`
- Converte `meal.name` para `directMeal.name`
- Se `meal.name` já estiver errado, o Core mantém errado

---

### **PROBLEMA 2: Proteína Genérica**

**Localização:** `index.ts` linha 199

```typescript
return {
  ingredient_key: ingredientKey,
  name_pt: raw.name,  // ← AQUI: usando raw.name diretamente
  name_en: raw.name_en || raw.name,
  // ...
}
```

**Análise:**
- O Core usa `raw.name` diretamente sem validação
- Se o adapter passar "proteina animal", o Core mantém
- **NÃO HÁ LOOKUP** no INGREDIENTS para pegar nome correto

**Onde o nome é perdido:**
- Adapter `direct-adapter.ts` linha 753-757
- Converte `c.name` para `name` no RawComponent
- Se `c.name` já estiver errado (ex: "proteina animal"), passa errado para o Core

---

### **PROBLEMA 3: Ordem Incorreta**

**Localização:** `meal-sorter.ts` linha 71-100

```typescript
export function sortComponentsBR(
  components: UnifiedComponent[],
  mealType: MealType
): UnifiedComponent[] {
  // Selecionar ordem baseada no tipo de refeição
  let sortOrder: Record<string, number>;
  
  switch (mealType) {
    case 'breakfast':
      sortOrder = SORT_ORDER_BREAKFAST;
      break;
    case 'lunch':
    case 'dinner':
      sortOrder = SORT_ORDER_LUNCH_DINNER;
      break;
    // ...
  }
  
  return [...components].sort((a, b) => {
    const orderA = sortOrder[a.type] || 999;
    const orderB = sortOrder[b.type] || 999;
    return orderA - orderB;
  });
}
```

**Análise:**
- A ordenação depende do `type` de cada componente
- Se o `type` estiver errado, a ordenação fica errada
- **PROBLEMA:** `convertToUnified()` linha 194 usa:
  ```typescript
  const type = raw.type || categorizeByName(raw.name);
  ```
- Se `raw.type` vier errado do adapter, o Core usa errado
- Se não vier `raw.type`, usa `categorizeByName()` que pode categorizar errado

**Exemplo do problema:**
- Arroz tem `type: 'rice'` → ordem 2 ✅
- Mas se vier como `type: 'carb'` → ordem 5 ❌
- Proteína tem `type: 'protein'` → ordem 1 ✅
- Mas se vier como `type: 'other'` → ordem 7 ❌

---

## 🎯 SOLUÇÕES NECESSÁRIAS

### **SOLUÇÃO 1: Validar e Corrigir Nome da Refeição**

**Ação:** Adicionar lógica no Core para gerar nome descritivo se necessário

```typescript
// Em index.ts, linha 136
const meal: UnifiedMeal = {
  name: mealName || generateMealName(sortedComponents),  // ← NOVO
  // ...
}

function generateMealName(components: UnifiedComponent[]): string {
  // Pegar principais componentes
  const protein = components.find(c => c.type === 'protein');
  const rice = components.find(c => c.type === 'rice');
  const beans = components.find(c => c.type === 'beans');
  
  const parts: string[] = [];
  if (protein) parts.push(protein.name_pt);
  if (rice) parts.push('Arroz');
  if (beans) parts.push('Feijão');
  
  return parts.join(' com ') || 'Refeição Completa';
}
```

---

### **SOLUÇÃO 2: Lookup de Nome Correto no INGREDIENTS**

**Ação:** Usar INGREDIENTS para pegar nome correto baseado no ingredient_key

```typescript
// Em index.ts, linha 179-208
import { INGREDIENTS } from '../meal-ingredients-db.ts';

async function convertToUnified(
  raw: RawComponent, 
  context: UserContext,
  safetyDb: SafetyDatabase
): Promise<UnifiedComponent> {
  const ingredientKey = raw.ingredient_key || resolveIngredientKey(raw.name, raw.name_en);
  
  // ← NOVO: Buscar nome correto no INGREDIENTS
  const ingredient = INGREDIENTS[ingredientKey];
  const name_pt = ingredient?.display_name_pt || raw.name;
  const name_en = ingredient?.display_name_en || raw.name_en || raw.name;
  
  // ...
  
  return {
    ingredient_key: ingredientKey,
    name_pt: name_pt,  // ← USAR NOME DO INGREDIENTS
    name_en: name_en,  // ← USAR NOME DO INGREDIENTS
    // ...
  };
}
```

---

### **SOLUÇÃO 3: Validar e Corrigir Type de Componentes**

**Ação:** Usar INGREDIENTS para determinar type correto

```typescript
// Em index.ts, linha 194
const ingredient = INGREDIENTS[ingredientKey];
const type = ingredient?.type || raw.type || categorizeByName(raw.name);
```

**E melhorar `categorizeByName()` em `meal-sorter.ts`:**

```typescript
export function categorizeByName(name: string): ComponentType {
  const lower = name.toLowerCase();
  
  // Proteínas
  if (/frango|chicken|galinha|peito/i.test(lower)) return 'protein';
  if (/carne|beef|boi|bife|picanha/i.test(lower)) return 'protein';
  if (/peixe|fish|tilapia|salmao|atum/i.test(lower)) return 'protein';
  if (/ovo|egg/i.test(lower)) return 'protein';
  
  // Arroz e Feijão (específicos BR)
  if (/arroz|rice/i.test(lower)) return 'rice';
  if (/feijao|feijão|bean/i.test(lower)) return 'beans';
  
  // Vegetais
  if (/salada|alface|tomate|pepino|cenoura/i.test(lower)) return 'vegetable';
  
  // Bebidas
  if (/agua|água|water|suco|juice|cafe|café/i.test(lower)) return 'beverage';
  
  // Frutas
  if (/fruta|banana|maca|maçã|laranja|fruit/i.test(lower)) return 'dessert';
  
  return 'other';
}
```

---

## 📝 PLANO DE CORREÇÃO

### **Passo 1: Corrigir convertToUnified()**
- Adicionar lookup no INGREDIENTS para nomes corretos
- Adicionar lookup no INGREDIENTS para type correto
- Testar com ingredientes conhecidos

### **Passo 2: Adicionar generateMealName()**
- Criar função que gera nome descritivo
- Usar como fallback se mealName vier vazio/genérico
- Testar com várias combinações

### **Passo 3: Melhorar categorizeByName()**
- Adicionar mais padrões de reconhecimento
- Testar com nomes em PT e EN
- Garantir que proteínas sejam sempre reconhecidas

### **Passo 4: Testar Integração Completa**
- Gerar refeição via `generateMealsWithCore()`
- Validar nome da refeição
- Validar nomes dos componentes
- Validar ordem dos componentes

---

## ⚠️ IMPACTO

**Severidade:** 🔴 CRÍTICA

**Afeta:**
- ✅ Gerador Direto (já integrado via wrapper)
- ⚠️ Pool (não integrado ainda)
- ⚠️ IA (não integrado ainda)

**Usuários Afetados:**
- Todos que usarem `generateMealsWithCore()`

**Urgência:**
- 🔴 ALTA - Corrigir antes de rollout em produção

---

## 🎯 PRÓXIMA AÇÃO

**Implementar as 3 soluções imediatamente:**
1. Lookup de nomes no INGREDIENTS
2. Função generateMealName()
3. Melhorar categorizeByName()

**Testar:**
- Gerar refeição de almoço com frango, arroz, feijão
- Validar nome: "Frango com Arroz e Feijão"
- Validar componentes: nomes corretos
- Validar ordem: Frango → Arroz → Feijão → Salada → Água

---

**Status:** 🔴 AGUARDANDO CORREÇÃO URGENTE
