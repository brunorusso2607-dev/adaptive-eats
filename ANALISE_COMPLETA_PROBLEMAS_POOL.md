# ANÁLISE COMPLETA: PROBLEMAS NO POOL DE REFEIÇÕES E BASE DE ALIMENTOS

## 📋 PROBLEMAS IDENTIFICADOS PELO USUÁRIO

### **FOTO 1: Temperos como refeição isolada**
- **Problema:** Sistema oferece "Cenoura" como refeição completa
- **Exemplos:** Beterraba cozida, Salsinha, Couve crua, Repolho roxo, Vagem cozida
- **Impacto:** Usuário recebe tempero/guarnição como refeição principal

### **FOTO 2: Azeite isolado sem contexto**
- **Problema:** Sistema oferece "Azeite de oliva (100g)" como alimento isolado
- **Correto:** Azeite deve vir SEMPRE acompanhado (ex: "Salada com azeite")
- **Impacto:** 900 kcal de azeite puro não faz sentido como refeição

### **FOTO 3: Torrada sem acompanhamento**
- **Problema:** Sistema oferece "Torrada (100g)" sozinha
- **Correto:** Torrada deve vir com requeijão, queijo, ou outro acompanhamento
- **Impacto:** Refeição incompleta e sem sentido

### **FOTO 4: Refeições desorganizadas**
- **Problema:** Ingredientes separados: "Ovo mexido", "Maçã vermelha", "Café com leite", "Pão de forma integral"
- **Correto:** Agrupar como "Pão com ovo mexido" + "Café com leite" + "Maçã"
- **Impacto:** Refeição parece desorganizada e não intuitiva

### **FOTO 5: Melado de cana sem sentido**
- **Problema:** Sistema oferece "Melado de cana (100g)" como alimento
- **Decisão:** Remover melado de cana da lista de alimentos
- **Impacto:** 136 kcal de açúcar puro não é refeição

### **FOTO 6: Alimentos muito genéricos**
- **Problema:** Sistema oferece "Alface americana (100g)" isolada
- **Correto:** Oferecer "Salada de alface americana com tomate"
- **Impacto:** Alimentos isolados não são refeições

### **FOTO 7: Banana + Leite (OK)**
- **Problema:** NENHUM - faz sentido manter separado
- **Decisão:** Manter como está

### **FOTO 8: Azeite sem contexto (repetido)**
- **Problema:** Mesmo problema da FOTO 2
- **Impacto:** Azeite deve sempre estar integrado a uma refeição

---

## 🔍 ANÁLISE DA BASE DE ALIMENTOS (meal-ingredients-db.ts)

### **INGREDIENTES PROBLEMÁTICOS ENCONTRADOS:**

#### 1. **TEMPEROS/AROMÁTICOS (linhas 127-131)**
```typescript
cebola_refogada: { kcal: 40, portion: 30g }
alho_refogado: { kcal: 149, portion: 5g }
cheiro_verde: { kcal: 36, portion: 10g }
```
**Problema:** Estes são TEMPEROS, não refeições. Devem estar sempre integrados.

#### 2. **GORDURAS ISOLADAS (linhas 177-179)**
```typescript
azeite_oliva: { kcal: 884, portion: 10g }
azeite_extra_virgem: { kcal: 884, portion: 10g }
```
**Problema:** Azeite NUNCA deve ser oferecido isolado. Sempre com salada/prato.

#### 3. **VEGETAIS QUE PODEM SER CONFUNDIDOS COM REFEIÇÃO (linhas 95-126)**
```typescript
alface_americana: { kcal: 15, portion: 50g }
cenoura_cozida: { kcal: 41, portion: 50g }
vagem_cozida: { kcal: 31, portion: 80g }
repolho_refogado: { kcal: 22, portion: 80g }
```
**Problema:** Sozinhos, não são refeições. Precisam estar em saladas ou acompanhamentos.

#### 4. **BEBIDAS DE BAIXÍSSIMA CALORIA (linhas 168-171)**
```typescript
cha_verde: { kcal: 1, portion: 200g }
cha_camomila: { kcal: 1, portion: 200g }
cafe_preto: { kcal: 2, portion: 200g }
```
**Problema:** Chá verde com 1 kcal não deve ser oferecido como "refeição".

#### 5. **MELADO/AÇÚCARES (linha 189)**
```typescript
mel: { kcal: 304, portion: 20g }
```
**Problema:** Mel sozinho não é refeição. Deve estar com iogurte, aveia, etc.

**NOTA:** Não encontrei "melado de cana" no código atual, mas pode estar em outro lugar.

---

## 🏗️ ANÁLISE DO GERADOR DE REFEIÇÕES (advanced-meal-generator.ts)

### **ESTRUTURA ATUAL:**

1. **INGREDIENTS** (meal-ingredients-db.ts): 100+ ingredientes com macros
2. **SMART_TEMPLATES** (meal-templates-smart.ts): Templates culturais
3. **generateMealsForPool()**: Função que combina ingredientes

### **PROBLEMAS IDENTIFICADOS NO GERADOR:**

#### **Problema 1: Falta categorização de "NÃO-REFEIÇÃO"**
```typescript
// ATUAL: Todos os ingredientes podem ser usados
function getComponentType(ingredientId: string): string {
  if (ingredientId.includes("frango")) return "protein";
  if (ingredientId.includes("arroz")) return "carb";
  // ...
}
```

**Falta:** Categoria `"seasoning"` ou `"condiment"` para temperos que NUNCA devem ser refeição isolada.

#### **Problema 2: Sem validação de "refeição mínima"**
Não há validação que impeça:
- 1 ingrediente sozinho (ex: "Torrada")
- Ingredientes incompatíveis (ex: "Azeite" sem salada)
- Temperos como refeição principal

#### **Problema 3: Sem regras de agrupamento**
Não há lógica para agrupar:
- "Pão" + "Ovo mexido" → "Pão com ovo mexido"
- "Salada" + "Azeite" → "Salada com azeite"
- "Iogurte" + "Mel" → "Iogurte com mel"

---

## 📊 ANÁLISE DO POOL ATUAL (meal_combinations)

### **QUERIES PARA EXECUTAR:**

Execute os SQLs que criei para identificar:
1. **VERIFICAR_PROBLEMAS_POOL.sql** - Temperos, gorduras, alimentos isolados
2. **VERIFICAR_BASE_ALIMENTOS.sql** - Ingredientes problemáticos
3. **VERIFICAR_ESTRUTURA_COMPONENTES.sql** - Como componentes estão organizados

### **PROBLEMAS ESPERADOS NO POOL:**

Baseado no código, espero encontrar:
- ✅ Refeições com apenas 1 componente (torrada sozinha)
- ✅ Refeições com azeite como componente principal
- ✅ Refeições com temperos isolados
- ✅ Refeições com calorias muito baixas (< 50 kcal)

---

## 🎯 PLANO DE CORREÇÃO (NÃO IMPLEMENTAR AINDA)

### **FASE 1: Categorizar ingredientes problemáticos**

#### **1.1. Criar categoria SEASONING (Temperos)**
```typescript
// Ingredientes que NUNCA devem ser refeição isolada
const SEASONING_INGREDIENTS = [
  'cebola_refogada',
  'alho_refogado',
  'cheiro_verde',
  'pimenta',
  'sal',
  'vinagre',
  'shoyu'
];
```

#### **1.2. Criar categoria FAT_CONDIMENT (Gorduras condimentares)**
```typescript
// Gorduras que DEVEM estar sempre acompanhadas
const FAT_CONDIMENTS = [
  'azeite_oliva',
  'azeite_extra_virgem',
  'manteiga', // se existir
  'margarina' // se existir
];
```

#### **1.3. Criar categoria SWEETENER (Adoçantes)**
```typescript
// Açúcares que DEVEM estar sempre acompanhados
const SWEETENERS = [
  'mel',
  'melado_cana', // remover ou marcar como "não usar"
  'acucar'
];
```

#### **1.4. Criar categoria GARNISH (Guarnições)**
```typescript
// Vegetais que sozinhos não são refeição
const GARNISH_ONLY = [
  'alface_americana',
  'alface_crespa',
  'tomate',
  'pepino',
  'cenoura_ralada'
];
```

---

### **FASE 2: Validação de refeição mínima**

#### **2.1. Regra: Mínimo 2 componentes**
```typescript
function validateMinimumMeal(components: Component[]): boolean {
  // Refeição deve ter pelo menos 2 componentes
  // EXCETO: Pratos compostos (lasanha, feijoada, etc.)
  if (components.length < 2) {
    return false;
  }
  return true;
}
```

#### **2.2. Regra: Sem temperos isolados**
```typescript
function validateNoSeasoningAsMain(components: Component[]): boolean {
  const mainComponents = components.filter(c => 
    !SEASONING_INGREDIENTS.includes(c.name)
  );
  
  // Deve ter pelo menos 1 componente que não seja tempero
  return mainComponents.length >= 1;
}
```

#### **2.3. Regra: Gorduras sempre acompanhadas**
```typescript
function validateFatCondiments(components: Component[]): boolean {
  const hasFatCondiment = components.some(c => 
    FAT_CONDIMENTS.includes(c.name)
  );
  
  if (hasFatCondiment) {
    // Se tem azeite, DEVE ter salada ou proteína
    const hasMainDish = components.some(c => 
      c.type === 'protein' || c.type === 'vegetable'
    );
    return hasMainDish;
  }
  
  return true;
}
```

#### **2.4. Regra: Calorias mínimas por tipo de refeição**
```typescript
const MIN_CALORIES = {
  cafe_manha: 150,
  lanche_manha: 80,
  almoco: 300,
  lanche_tarde: 80,
  jantar: 300,
  ceia: 50
};

function validateMinimumCalories(totalCal: number, mealType: string): boolean {
  return totalCal >= MIN_CALORIES[mealType];
}
```

---

### **FASE 3: Agrupamento inteligente de componentes**

#### **3.1. Regra: Agrupar pão + proteína**
```typescript
function groupBreadWithProtein(components: Component[]): Component[] {
  const bread = components.find(c => c.name.includes('pao'));
  const protein = components.find(c => 
    c.type === 'protein' && 
    (c.name.includes('ovo') || c.name.includes('queijo') || c.name.includes('presunto'))
  );
  
  if (bread && protein) {
    // Criar componente composto: "Pão com ovo mexido"
    return [{
      type: 'composite',
      name: `${bread.display_name} com ${protein.display_name}`,
      portion_grams: bread.portion_grams + protein.portion_grams
    }];
  }
  
  return components;
}
```

#### **3.2. Regra: Agrupar salada + azeite**
```typescript
function groupSaladWithOil(components: Component[]): Component[] {
  const vegetables = components.filter(c => c.type === 'vegetable');
  const oil = components.find(c => FAT_CONDIMENTS.includes(c.name));
  
  if (vegetables.length > 0 && oil) {
    // Criar componente composto: "Salada com azeite"
    const vegNames = vegetables.map(v => v.display_name).join(' e ');
    return [{
      type: 'composite',
      name: `Salada de ${vegNames} com azeite`,
      portion_grams: vegetables.reduce((sum, v) => sum + v.portion_grams, 0) + oil.portion_grams
    }];
  }
  
  return components;
}
```

#### **3.3. Regra: Agrupar iogurte + mel/frutas**
```typescript
function groupYogurtWithToppings(components: Component[]): Component[] {
  const yogurt = components.find(c => c.name.includes('iogurte'));
  const sweetener = components.find(c => SWEETENERS.includes(c.name));
  const fruit = components.find(c => c.type === 'fruit');
  
  if (yogurt && (sweetener || fruit)) {
    const topping = sweetener ? sweetener.display_name : fruit.display_name;
    return [{
      type: 'composite',
      name: `${yogurt.display_name} com ${topping}`,
      portion_grams: yogurt.portion_grams + (sweetener?.portion_grams || fruit?.portion_grams || 0)
    }];
  }
  
  return components;
}
```

---

### **FASE 4: Remover/Desativar ingredientes problemáticos**

#### **4.1. Remover melado de cana**
```sql
-- Desativar melado de cana (se existir)
UPDATE canonical_ingredients
SET is_active = false
WHERE name ILIKE '%melado%';
```

#### **4.2. Marcar temperos como "não usar isolado"**
```typescript
// Adicionar flag no ingrediente
interface Ingredient {
  // ... campos existentes
  never_use_alone?: boolean; // NOVO
  must_combine_with?: string[]; // NOVO: ['salad', 'protein']
}

// Atualizar ingredientes
const INGREDIENTS = {
  azeite_oliva: { 
    // ... macros
    never_use_alone: true,
    must_combine_with: ['vegetable', 'protein']
  },
  cebola_refogada: {
    // ... macros
    never_use_alone: true,
    must_combine_with: ['protein', 'carb']
  }
};
```

---

### **FASE 5: Melhorar nomes de refeições genéricas**

#### **5.1. Expandir nomes genéricos**
```typescript
// ANTES: "Alface americana"
// DEPOIS: "Salada de alface americana com tomate e pepino"

function expandGenericNames(meal: GeneratedMeal): GeneratedMeal {
  const vegetables = meal.components.filter(c => c.type === 'vegetable');
  
  if (vegetables.length >= 2 && meal.name.includes('Alface')) {
    const vegNames = vegetables.map(v => v.display_name).join(', ');
    meal.name = `Salada de ${vegNames}`;
  }
  
  return meal;
}
```

---

## 📝 RESUMO DAS AÇÕES NECESSÁRIAS

### **IMEDIATO (SQL):**
1. ✅ Executar `VERIFICAR_PROBLEMAS_POOL.sql` para identificar refeições problemáticas
2. ✅ Executar `VERIFICAR_BASE_ALIMENTOS.sql` para listar ingredientes problemáticos
3. ✅ Desativar refeições com < 50 kcal (já criado: `CORRIGIR_DADOS_POOL.sql`)
4. ✅ Identificar e desativar melado de cana

### **CÓDIGO (TypeScript):**
1. ⚠️ Adicionar categorias `SEASONING`, `FAT_CONDIMENT`, `SWEETENER`, `GARNISH`
2. ⚠️ Implementar validações de refeição mínima (FASE 2)
3. ⚠️ Implementar agrupamento inteligente (FASE 3)
4. ⚠️ Adicionar flags `never_use_alone` e `must_combine_with` nos ingredientes
5. ⚠️ Implementar função `expandGenericNames()` (FASE 5)

### **POOL (Regeneração):**
1. ⚠️ Limpar pool atual de refeições problemáticas
2. ⚠️ Regenerar pool com novas validações
3. ⚠️ Testar com 20 refeições de cada tipo
4. ⚠️ Validar que não há mais temperos/azeite isolados

---

## 🚨 RISCOS E CONSIDERAÇÕES

### **RISCO 1: Quebrar refeições existentes**
- **Mitigação:** Testar em ambiente de staging primeiro
- **Rollback:** Manter backup do pool atual

### **RISCO 2: Reduzir variedade do pool**
- **Mitigação:** Validações devem AGRUPAR, não REJEITAR
- **Exemplo:** "Torrada" → "Torrada com requeijão" (adicionar componente)

### **RISCO 3: Complexidade excessiva**
- **Mitigação:** Implementar em fases, testar cada fase
- **Prioridade:** FASE 1 e 2 são críticas, FASE 3-5 são melhorias

---

## 📊 MÉTRICAS DE SUCESSO

Após implementação, validar:
- ✅ 0 refeições com apenas 1 componente (exceto pratos compostos)
- ✅ 0 refeições com azeite isolado
- ✅ 0 refeições com temperos isolados
- ✅ 0 refeições com < 50 kcal (exceto ceia)
- ✅ 100% das refeições com nomes descritivos
- ✅ 90%+ das refeições com agrupamento lógico

---

**Documento gerado em:** 20/01/2026 21:15
**Status:** ANÁLISE COMPLETA - AGUARDANDO EXECUÇÃO DE SQLs E APROVAÇÃO DO PLANO
