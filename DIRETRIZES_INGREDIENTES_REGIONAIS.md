# 🌎 DIRETRIZES - Ingredientes Regionais vs Globais

## 📋 REGRA IMPORTANTE

Ao adicionar ingredientes no sistema, é **essencial** definir corretamente o `country_code`:

### **Ingrediente GLOBAL (country_code = NULL)**
Use quando o ingrediente é comum em **vários países**:
- ✅ Frango grelhado (comum globalmente)
- ✅ Arroz branco (comum globalmente)
- ✅ Banana (comum globalmente)
- ✅ Ovo cozido (comum globalmente)

### **Ingrediente REGIONAL (country_code = 'BR', 'MX', etc.)**
Use quando o ingrediente é **específico de um país**:
- 🇧🇷 **Brasil (BR):**
  - Dourado grelhado
  - Pão de queijo
  - Tapioca
  - Açaí
  - Farofa
  - Cuscuz de milho
  - Requeijão

- 🇲🇽 **México (MX):**
  - Tortilla
  - Nopales
  - Chapulines
  - Mole

- 🇦🇷 **Argentina (AR):**
  - Chimichurri
  - Dulce de leche
  - Empanadas argentinas

- 🇵🇹 **Portugal (PT):**
  - Bacalhau à Brás
  - Pastel de nata
  - Alheira

---

## 🎯 COMO DECIDIR

### **Pergunte-se:**
1. Este ingrediente é facilmente encontrado em supermercados de outros países?
2. Este ingrediente tem um nome/preparação específica de uma região?
3. Este ingrediente é parte da culinária típica de um país?

### **Se SIM para 2 ou 3:** → `country_code = 'BR'` (ou país específico)
### **Se NÃO para todas:** → `country_code = NULL` (global)

---

## 📝 EXEMPLOS PRÁTICOS

### ✅ **CORRETO:**

```sql
-- Dourado (peixe brasileiro)
INSERT INTO ingredient_pool (
  ingredient_key, display_name_pt, country_code, ...
) VALUES (
  'grilled_dourado', 'Dourado grelhado', 'BR', ...
);

-- Frango (global)
INSERT INTO ingredient_pool (
  ingredient_key, display_name_pt, country_code, ...
) VALUES (
  'grilled_chicken_breast', 'Peito de frango grelhado', NULL, ...
);
```

### ❌ **INCORRETO:**

```sql
-- Dourado marcado como global (ERRADO!)
INSERT INTO ingredient_pool (
  ingredient_key, display_name_pt, country_code, ...
) VALUES (
  'grilled_dourado', 'Dourado grelhado', NULL, ...  -- ❌ Deveria ser 'BR'
);
```

---

## 🔍 VERIFICAR INGREDIENTES REGIONAIS

```sql
-- Ver todos os ingredientes brasileiros
SELECT ingredient_key, display_name_pt, category
FROM ingredient_pool
WHERE country_code = 'BR'
ORDER BY category, display_name_pt;

-- Ver ingredientes globais
SELECT ingredient_key, display_name_pt, category
FROM ingredient_pool
WHERE country_code IS NULL
ORDER BY category, display_name_pt;

-- Ver ingredientes que podem estar marcados incorretamente
SELECT ingredient_key, display_name_pt, country_code
FROM ingredient_pool
WHERE display_name_pt ILIKE '%tapioca%'
   OR display_name_pt ILIKE '%açaí%'
   OR display_name_pt ILIKE '%farofa%'
   OR display_name_pt ILIKE '%cuscuz%'
   OR display_name_pt ILIKE '%dourado%';
```

---

## 🎯 IMPACTO NO SISTEMA

### **Por que isso importa?**

1. **Gerador de Refeições:**
   - Usuários brasileiros veem ingredientes brasileiros
   - Usuários mexicanos veem ingredientes mexicanos
   - Todos veem ingredientes globais

2. **Experiência do Usuário:**
   - Refeições mais autênticas e culturalmente relevantes
   - Evita sugerir ingredientes que não existem no país do usuário

3. **Filtros no Admin:**
   - Permite filtrar por país
   - Facilita manutenção de ingredientes regionais

---

## ✅ CHECKLIST AO ADICIONAR INGREDIENTE

- [ ] Nome em português, inglês (e espanhol se relevante)
- [ ] Categoria correta (protein, carbs, vegetable, etc.)
- [ ] Macros validados (TACO/TBCA ou fonte confiável)
- [ ] **country_code definido corretamente:**
  - [ ] NULL se global
  - [ ] 'BR' se brasileiro
  - [ ] 'MX' se mexicano
  - [ ] etc.

---

## 🔧 CORRIGIR INGREDIENTE EXISTENTE

Se você encontrar um ingrediente com `country_code` incorreto:

```sql
-- Exemplo: Corrigir Dourado para Brasil
UPDATE ingredient_pool
SET country_code = 'BR'
WHERE ingredient_key = 'grilled_dourado';

-- Exemplo: Corrigir Tapioca para Brasil
UPDATE ingredient_pool
SET country_code = 'BR'
WHERE ingredient_key = 'tapioca';
```

---

**Lembre-se:** Esta distinção garante que o sistema ofereça refeições **culturalmente apropriadas** para cada usuário! 🌎
