# 🔍 ANÁLISE DE GAPS - MIGRAÇÃO LOVABLE → SUPABASE

**Data:** 13/01/2026  
**Baseado em:** Conversa completa com Lovable (05/01/2026)

---

## 🚨 **GAPS CRÍTICOS IDENTIFICADOS**

### **1. SIMPLE MEALS - 156 REFEIÇÕES** ❌

**Status no Lovable:**
```sql
SELECT meal_type, COUNT(*) FROM simple_meals GROUP BY meal_type;

breakfast        | 18
lunch            | 83
afternoon_snack  | 17
dinner           | 31
supper           | 7
TOTAL            | 156
```

**Status Atual:** 0 registros

**Ação Necessária:**
- Verificar se tabela `simple_meals` existe
- Popular com refeições básicas brasileiras/portuguesas
- Criar página Admin para gerenciar

**Prioridade:** 🔴 ALTA

---

### **2. MAPEAMENTOS DE INTOLERÂNCIAS COMPLETOS** ❌

**Arquitetura no Lovable:**

```typescript
// globalSafetyEngine.ts - VERSÃO LOVABLE

// 1. CRITICAL FALLBACK (20 restrições)
const CRITICAL_FALLBACK_MAPPINGS = {
  // Intolerâncias (5)
  gluten: ['trigo', 'wheat', 'cevada', 'barley', 'centeio', 'rye', 'malte', 'malt', ...],
  lactose: ['leite', 'milk', 'queijo', 'cheese', 'iogurte', 'yogurt', ...],
  fructose: [...],
  sorbitol: [...],
  fodmap: [...],
  
  // Alergias (7)
  peanut: ['amendoim', 'peanut', 'pasta de amendoim', ...],
  nuts: ['castanha', 'noz', 'amêndoa', 'almond', ...],
  seafood: ['camarão', 'shrimp', 'lagosta', 'lobster', ...],
  fish: ['peixe', 'fish', 'salmão', 'salmon', ...],
  egg: ['ovo', 'egg', 'clara', 'gema', ...],
  soy: ['soja', 'soy', 'tofu', ...],
  sesame: ['gergelim', 'sesame', 'tahini', ...],
  
  // Sensibilidades (6)
  histamine: [...],
  caffeine: [...],
  sulfite: [...],
  salicylate: [...],
  corn: [...],
  nickel: [...]
};

// 2. DECOMPOSIÇÃO AUTOMÁTICA
function decomposeFood(foodName: string): string[] {
  // Busca em food_decomposition_mappings
  // Exemplo: "pizza" → ["queijo", "trigo", "tomate"]
}

// 3. VALIDAÇÃO CASCATA
async function validateIngredient(ingredient: string, userRestrictions: string[]) {
  // 1. Tenta banco de dados
  // 2. Tenta decomposição
  // 3. Usa fallback crítico
  // 4. IA como último recurso
}
```

**Status Atual:**
- ✅ 97 ingredientes básicos inseridos
- ❌ Fallback crítico: não implementado
- ❌ Decomposição automática: não implementada
- ❌ ~2.749 ingredientes faltando

**Ação Necessária:**
1. Implementar `CRITICAL_FALLBACK_MAPPINGS` no globalSafetyEngine
2. Popular `food_decomposition_mappings` com alimentos processados comuns
3. Adicionar mais ingredientes via Admin conforme necessário

**Prioridade:** 🔴 CRÍTICA

---

### **3. FOOD DECOMPOSITION MAPPINGS** ❌

**Exemplos do Lovable:**

```sql
INSERT INTO food_decomposition_mappings (food_name, ingredients, language) VALUES
('pizza', ARRAY['queijo', 'trigo', 'tomate', 'azeite'], 'pt'),
('pizza', ARRAY['cheese', 'wheat', 'tomato', 'olive oil'], 'en'),
('cerveja', ARRAY['malte', 'cevada', 'lúpulo'], 'pt'),
('beer', ARRAY['malt', 'barley', 'hops'], 'en'),
('hamburguer', ARRAY['carne', 'pão', 'queijo', 'alface', 'tomate'], 'pt'),
('macarrão ao molho', ARRAY['trigo', 'tomate', 'azeite'], 'pt'),
('lasanha', ARRAY['trigo', 'queijo', 'carne', 'tomate'], 'pt'),
('sorvete', ARRAY['leite', 'açúcar'], 'pt'),
('chocolate ao leite', ARRAY['leite', 'cacau', 'açúcar'], 'pt');
```

**Status Atual:** Não verificado se existe/está populado

**Ação Necessária:**
1. Verificar se tabela existe
2. Popular com alimentos processados mais comuns (50-100 itens)
3. Integrar com globalSafetyEngine

**Prioridade:** 🔴 ALTA

---

### **4. INTOLERANCE SAFE KEYWORDS COMPLETOS** ⚠️

**No Lovable:** 366 keywords
**Migrado:** 10 keywords

**Exemplos faltando:**
```sql
-- Lactose
'lactose-free', 'dairy-free', 'plant-based', 'vegetal', 'sem laticínios'

-- Glúten
'gluten-free', 'sem glúten', 'celiac safe', 'livre de glúten'

-- Vegano
'plant-based', '100% vegetal', 'cruelty-free'

-- Etc para todas as 18 intolerâncias
```

**Ação Necessária:**
- Expandir de 10 para ~100 keywords essenciais
- Focar em termos mais usados em rótulos

**Prioridade:** 🟡 MÉDIA

---

### **5. DYNAMIC SAFE INGREDIENTS** ⚠️

**Propósito:** Ingredientes marcados como seguros pelo usuário após análise

**Status Atual:** Não verificado

**Ação Necessária:**
- Verificar se tabela existe
- Validar funcionalidade no Admin

**Prioridade:** 🟡 MÉDIA

---

## 🔧 **FUNCIONALIDADES CRÍTICAS NÃO IMPLEMENTADAS**

### **1. Detecções Inteligentes**

**No Lovable (implementado):**

```typescript
// analyze-food-photo/index.ts

// Detecta alimento cru não preparado
is_raw_unprepared: boolean
// Exemplo: carne crua na bancada → esconde botão "Vou comer"

// Detecta itens não identificados
nao_identificado: boolean
// Exemplo: "bebida avermelhada" → status "indefinido"

// Detecta produto embalado vs comida
packagedProduct: boolean
// Redireciona para módulo correto
```

**Status Atual:** Não implementado

**Ação Necessária:**
- Implementar detecções no analyze-food-photo
- Atualizar FoodPhotoAnalyzer.tsx

**Prioridade:** 🟡 MÉDIA

---

### **2. Fonte dos Dados Nutricionais**

**No Lovable:**
```typescript
interface FoodItem {
  nome: string;
  calorias: number;
  calculo_fonte: 'TACO' | 'USDA' | 'database_global' | 'ai_estimate';
  alimento_encontrado?: string; // Nome encontrado na base
}
```

**Exibição:**
```
🍗 Frango Grelhado
📊 250 kcal | 30g P | 5g C | 10g G
📚 Fonte: TACO (Frango, peito, grelhado)
```

**Status Atual:** Não implementado

**Ação Necessária:**
- Adicionar campos ao tipo FoodItem
- Exibir fonte no FoodItemEditor

**Prioridade:** 🟢 BAIXA (UX)

---

## 📊 **COMPARAÇÃO DETALHADA**

| Item | Lovable | Migrado | Gap | Prioridade |
|------|---------|---------|-----|------------|
| **Alimentos** | ~10.000 | 6.477 | 3.523 | 🟡 |
| **Simple Meals** | 156 | 0 | 156 | 🔴 |
| **Mapeamentos Intolerância** | ~2.846 | 97 | 2.749 | 🔴 |
| **Food Decomposition** | ~100 | 0? | 100? | 🔴 |
| **Safe Keywords** | 366 | 10 | 356 | 🟡 |
| **Fallback Crítico** | 20 restrições | 0 | 20 | 🔴 |
| **Detecções Inteligentes** | ✅ | ❌ | - | 🟡 |
| **Fonte Nutricional** | ✅ | ❌ | - | 🟢 |

---

## 🎯 **PLANO DE AÇÃO PRIORITÁRIO**

### **FASE 1 - CRÍTICO (Fazer AGORA)**

1. **Verificar e popular `simple_meals`** (156 refeições)
   ```bash
   # Verificar se existe
   SELECT COUNT(*) FROM simple_meals;
   
   # Se vazio, popular com seed
   ```

2. **Verificar e popular `food_decomposition_mappings`**
   ```bash
   # Verificar se existe
   SELECT COUNT(*) FROM food_decomposition_mappings;
   
   # Popular com alimentos processados comuns
   ```

3. **Implementar Fallback Crítico no globalSafetyEngine**
   - Adicionar `CRITICAL_FALLBACK_MAPPINGS`
   - Integrar na cascata de validação

### **FASE 2 - IMPORTANTE (Próximos dias)**

4. **Expandir mapeamentos de intolerâncias**
   - Adicionar mais 200-500 ingredientes via Admin
   - Focar em ingredientes brasileiros/portugueses

5. **Expandir safe keywords**
   - De 10 para ~100 keywords essenciais

### **FASE 3 - MELHORIAS (Opcional)**

6. **Implementar detecções inteligentes**
   - `is_raw_unprepared`
   - `nao_identificado`
   - Redirecionamentos automáticos

7. **Adicionar fonte nutricional**
   - Exibir origem dos dados (TACO/USDA/IA)

---

## 🔍 **COMANDOS DE VERIFICAÇÃO**

```sql
-- Verificar simple_meals
SELECT meal_type, COUNT(*) FROM simple_meals GROUP BY meal_type;

-- Verificar food_decomposition_mappings
SELECT COUNT(*) FROM food_decomposition_mappings;

-- Verificar intolerance_mappings por intolerância
SELECT intolerance_key, COUNT(*) 
FROM intolerance_mappings 
GROUP BY intolerance_key 
ORDER BY COUNT(*) DESC;

-- Verificar safe keywords
SELECT intolerance_key, COUNT(*) 
FROM intolerance_safe_keywords 
GROUP BY intolerance_key;

-- Verificar dynamic_safe_ingredients
SELECT COUNT(*) FROM dynamic_safe_ingredients;
```

---

## ✅ **CRITÉRIOS DE SUCESSO**

Sistema considerado **100% migrado** quando:

- ✅ `simple_meals`: 150+ refeições
- ✅ `food_decomposition_mappings`: 50+ alimentos
- ✅ `intolerance_mappings`: 500+ ingredientes (cobertura básica)
- ✅ `intolerance_safe_keywords`: 100+ keywords
- ✅ Fallback crítico implementado (20 restrições)
- ✅ Safety engine funcionando em cascata
- ✅ Todas as 18 intolerâncias validadas

---

**Próximo passo:** Executar FASE 1 (verificação e população de dados críticos)
