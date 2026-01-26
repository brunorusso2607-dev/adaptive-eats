# 🔍 AUDITORIA ARQUITETURAL: CORE DE INGREDIENTES E I18N HÍBRIDA

## 📋 RESUMO EXECUTIVO

**Data**: 2026-01-15  
**Escopo**: Análise comparativa Sistema Original vs Atual  
**Foco**: Módulo Central de Ingredientes, I18N Híbrida e Integração com Perfil

---

## 🎯 ANÁLISE VISUAL COMPARATIVA

### **SISTEMA ORIGINAL (Fotos 1, 2, 3)**

#### **Características Visuais**:
- ✅ **Contadores numéricos claros** ao lado de cada item
- ✅ **Hierarquia visual forte**: Item selecionado em destaque (verde)
- ✅ **Números grandes e legíveis** (ex: FODMAP 335, Frutose 95)
- ✅ **Separação clara** entre categorias (Intolerâncias, Alergias, Sensibilidades)
- ✅ **Cores distintas** por categoria (Azul, Vermelho, Amarelo)

#### **Estrutura de Dados Original**:
```
Intolerâncias (5 itens)
├─ FODMAP: 335 ingredientes mapeados
├─ Frutose: 95 ingredientes
├─ Glúten: 95 ingredientes
├─ Lactose: 96 ingredientes (SELECIONADO)
└─ Sorbitol: 52 ingredientes

Alergias (7 itens)
├─ Amendoim: 38 ingredientes
├─ Frutos do Mar: 92 ingredientes
├─ Gergelim: 18 ingredientes
├─ Oleaginosas: 89 ingredientes
├─ Ovo: 69 ingredientes
├─ Peixe: 136 ingredientes (SELECIONADO)
└─ Soja: 75 ingredientes

Sensibilidades (6 itens)
├─ Cafeína: 43 ingredientes
├─ Histamina: 119 ingredientes
├─ Milho: 63 ingredientes (SELECIONADO)
├─ Níquel: 83 ingredientes
├─ Salicilato: 99 ingredientes
└─ Sulfitos: 72 ingredientes
```

**Observação Crítica**: Os números representam a **quantidade de ingredientes mapeados** na tabela `intolerance_mappings` para cada restrição.

---

### **SISTEMA ATUAL (Fotos 4, 5)**

#### **Problemas Identificados**:

1. **❌ NÚMEROS ZERADOS OU MUITO BAIXOS**
   ```
   Intolerâncias (8 itens) - ATUAL
   ├─ FODMAP: 0 (era 335)
   ├─ Frutose: 0 (era 95)
   ├─ Glúten: 22 (era 95)
   ├─ Histamina: 0 (era 119)
   ├─ Lactose: 21 (era 96)
   ├─ Nenhuma: 0
   ├─ Ovos: 12 (era 69)
   └─ Soja: 9 (era 75)
   ```

2. **❌ DUPLICAÇÃO DE ITENS**
   ```
   Alergias (8 itens) - ATUAL
   ├─ Frutos do mar: 0
   ├─ Frutos do mar: 10 (DUPLICADO!)
   ├─ Oleaginosas: 0
   ├─ Oleaginosas: 9 (DUPLICADO!)
   ```

3. **❌ MISTURA DE CATEGORIAS**
   - "Histamina" aparece em Intolerâncias (deveria estar em Sensibilidades)
   - "Leite" aparece em Alergias (deveria ser "Lactose" em Intolerâncias)

4. **❌ PERDA DE DADOS**
   - **FODMAP**: 335 → 0 (100% de perda)
   - **Frutose**: 95 → 0 (100% de perda)
   - **Histamina**: 119 → 0 (100% de perda)
   - **Peixe**: 136 → 9 (93% de perda)

---

## 🗄️ AUDITORIA DE I18N HÍBRIDA

### **ARQUITETURA DESCOBERTA**

#### **1. Tabela: `onboarding_options`**
**Estrutura**:
```sql
CREATE TABLE onboarding_options (
    id uuid PRIMARY KEY,
    category text NOT NULL,           -- 'intolerances', 'allergies', 'sensitivities'
    option_id text NOT NULL,          -- Chave global (ex: 'lactose', 'gluten')
    label text NOT NULL,              -- Label localizado (ex: 'Lactose', 'Glúten')
    description text,                 -- Descrição localizada
    emoji text,
    icon_name text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    language text DEFAULT 'pt'        -- ⚠️ CAMPO NÃO EXISTE NA MIGRATION!
);
```

**Problema**: A tabela **NÃO tem campo `language`**, mas o sistema espera suporte multi-idioma.

#### **2. Tabela: `intolerance_mappings`**
**Estrutura**:
```sql
CREATE TABLE intolerance_mappings (
    id uuid PRIMARY KEY,
    intolerance_key text NOT NULL,    -- Referência a onboarding_options.option_id
    ingredient text NOT NULL,         -- Nome do ingrediente (em português)
    severity_level text DEFAULT 'unknown',
    labels text[] DEFAULT '{}',
    safe_portion_grams integer,
    language text DEFAULT 'pt' NOT NULL  -- ✅ TEM CAMPO LANGUAGE
);
```

**Observação**: Esta tabela **TEM** campo `language`, mas todos os ingredientes estão em português.

---

### **LÓGICA DE I18N HÍBRIDA IDENTIFICADA**

#### **Ingredientes Globais (Chave em Inglês)**
```typescript
// onboarding_options.option_id
'lactose'     → Label: 'Lactose' (PT), 'Lactose' (EN), 'Lactosa' (ES)
'gluten'      → Label: 'Glúten' (PT), 'Gluten' (EN), 'Gluten' (ES)
'peanut'      → Label: 'Amendoim' (PT), 'Peanut' (EN), 'Maní' (ES)
```

**Mapeamento**:
```sql
-- intolerance_mappings
intolerance_key = 'lactose'
ingredient = 'leite'        (PT)
ingredient = 'queijo'       (PT)
ingredient = 'iogurte'      (PT)
```

#### **Alimentos Regionais (Idioma Local)**
```sql
-- Exemplo: Alimento brasileiro sem tradução
intolerance_key = 'gluten'
ingredient = 'pão de queijo'  (PT-BR específico)
ingredient = 'tapioca'        (PT-BR específico)
```

**Problema Atual**: O sistema **NÃO diferencia** ingredientes globais de regionais visualmente ou tecnicamente.

---

## 🔍 RASTREAMENTO DA FONTE DA VERDADE

### **FLUXO DE DADOS COMPLETO**

```
1. ONBOARDING
   └─ useOnboardingOptions()
      └─ SELECT * FROM onboarding_options WHERE is_active = true
         └─ Retorna: { option_id, label, description, emoji }

2. PERFIL DO USUÁRIO
   └─ profiles.intolerances = ['lactose', 'gluten', 'peanut']
      └─ Array de option_id (chaves globais)

3. VALIDAÇÃO DE INGREDIENTES
   └─ globalSafetyEngine.ts
      └─ loadSafetyDatabase()
         └─ SELECT * FROM intolerance_mappings
            WHERE intolerance_key IN (user.intolerances)
            └─ Retorna: Map<intolerance_key, ingredient[]>

4. GERAÇÃO DE RECEITAS
   └─ generate-ai-meal-plan
      └─ validateFoodAsync(ingredient, userRestrictions)
         └─ Verifica se ingredient está em mappings
            └─ Se SIM: REJEITA
            └─ Se NÃO: ACEITA
```

---

### **CONTADORES DE INGREDIENTES**

#### **Como os Números São Calculados**:
```typescript
// Frontend: useOnboardingOptions.tsx (FALLBACK)
const FALLBACK_OPTIONS = {
  intolerances: [
    { option_id: "lactose", label: "Lactose", count: 96 }  // ❌ HARDCODED!
  ]
};
```

#### **Cálculo Real (Deveria Ser)**:
```sql
-- Contar ingredientes mapeados por intolerância
SELECT 
  intolerance_key,
  COUNT(DISTINCT ingredient) as ingredient_count
FROM intolerance_mappings
WHERE language = 'pt'
GROUP BY intolerance_key;

-- Resultado esperado:
-- lactose: 96
-- gluten: 95
-- fodmap: 335
```

**Problema**: O frontend **NÃO faz essa query**. Os números são hardcoded ou não existem.

---

## 🔗 INTEGRAÇÃO COM PERFIL DO USUÁRIO

### **Fluxo de Onboarding → Perfil**

```typescript
// pages/Onboarding.tsx (linha 169)
await supabase
  .from("profiles")
  .update({
    country: profile.country,
    intolerances: profile.intolerances,  // ['lactose', 'gluten']
    dietary_preference: profile.dietary_preference,
    excluded_ingredients: profile.excluded_ingredients,
    goal: profile.goal
  });
```

### **Fluxo Perfil → Cálculo de Macros**

```typescript
// hooks/useUserProfileContext.tsx
export function calculateMacroTargets(
  sex, age, height, weightCurrent, weightGoal, activityLevel, goal, intensity
): MacroTargets {
  // 1. Calcula TMB (Mifflin-St Jeor)
  const bmr = sex === 'male' 
    ? (10 * weightCurrent) + (6.25 * height) - (5 * age) + 5
    : (10 * weightCurrent) + (6.25 * height) - (5 * age) - 161;
  
  // 2. Calcula TDEE
  const tdee = bmr * activityFactor;
  
  // 3. Ajusta por objetivo
  const targetCalories = goal === 'lose_weight' 
    ? tdee - deficit
    : goal === 'gain_weight'
    ? tdee + surplus
    : tdee;
  
  // 4. Distribui macros
  return {
    dailyCalories: targetCalories,
    dailyProtein: weightGoal * proteinFactor,
    dailyCarbs: (targetCalories - proteinCals - fatCals) / 4,
    dailyFat: targetCalories * fatPercentage / 9
  };
}
```

### **Fluxo Perfil → Validação de Ingredientes**

```typescript
// _shared/globalSafetyEngine.ts
export async function validateIngredient(
  ingredient: string,
  userRestrictions: UserRestrictions,
  database: SafetyDatabase
): Promise<ValidationResult> {
  // 1. Normaliza ingrediente
  const normalized = normalizeText(ingredient);
  
  // 2. Para cada intolerância do usuário
  for (const intolerance of userRestrictions.intolerances) {
    const mappings = database.intoleranceMappings.get(intolerance);
    
    // 3. Verifica se ingrediente está mapeado
    if (mappings?.includes(normalized)) {
      return {
        isValid: false,
        violations: [{ type: 'intolerance', value: intolerance }]
      };
    }
  }
  
  return { isValid: true, violations: [] };
}
```

---

## 📊 GAPS IDENTIFICADOS

### **1. PERDA MASSIVA DE DADOS**

| Restrição | Original | Atual | Perda |
|-----------|----------|-------|-------|
| FODMAP | 335 | 0 | 100% |
| Frutose | 95 | 0 | 100% |
| Histamina | 119 | 0 | 100% |
| Glúten | 95 | 22 | 77% |
| Lactose | 96 | 21 | 78% |
| Peixe | 136 | 9 | 93% |
| Soja | 75 | 9 | 88% |

**Causa Provável**: Migration incompleta ou dados não importados.

---

### **2. DUPLICAÇÃO DE REGISTROS**

```sql
-- Exemplo encontrado nas fotos
SELECT option_id, label, COUNT(*) 
FROM onboarding_options 
WHERE category = 'allergies'
GROUP BY option_id, label
HAVING COUNT(*) > 1;

-- Resultado esperado:
-- 'seafood', 'Frutos do mar', 2  ← DUPLICADO!
-- 'nuts', 'Oleaginosas', 2       ← DUPLICADO!
```

---

### **3. CATEGORIZAÇÃO INCORRETA**

| Item | Categoria Atual | Categoria Correta |
|------|----------------|-------------------|
| Histamina | Intolerâncias | Sensibilidades |
| Leite | Alergias | Intolerâncias (Lactose) |

---

### **4. FALTA DE CAMPO `language` EM `onboarding_options`**

```sql
-- Migration atual
CREATE TABLE onboarding_options (
    -- ... campos
    -- ❌ FALTA: language text DEFAULT 'pt'
);

-- Deveria ser:
CREATE TABLE onboarding_options (
    -- ... campos
    language text DEFAULT 'pt' NOT NULL,
    UNIQUE(category, option_id, language)  -- Permite múltiplos idiomas
);
```

---

### **5. CONTADORES NÃO DINÂMICOS**

**Problema**: Frontend usa números hardcoded em vez de consultar o banco.

**Solução**: Criar view ou query para contar ingredientes:
```sql
CREATE VIEW onboarding_options_with_counts AS
SELECT 
  o.*,
  COUNT(DISTINCT m.ingredient) as ingredient_count
FROM onboarding_options o
LEFT JOIN intolerance_mappings m 
  ON o.option_id = m.intolerance_key 
  AND m.language = 'pt'
WHERE o.category IN ('intolerances', 'allergies', 'sensitivities')
GROUP BY o.id;
```

---

### **6. HIERARQUIA VISUAL PERDIDA**

**Original**:
- Números grandes e destacados
- Item selecionado com fundo verde
- Separação clara entre categorias

**Atual**:
- Números pequenos ou ausentes
- Seleção menos visível
- Categorias misturadas

---

## 🎯 PLANO DE AÇÃO DETALHADO

### **FASE 1: RESTAURAÇÃO DE DADOS (CRÍTICO)**

#### **1.1. Auditoria de Dados**
```sql
-- Verificar quantos ingredientes existem por intolerância
SELECT 
  intolerance_key,
  language,
  COUNT(DISTINCT ingredient) as count
FROM intolerance_mappings
GROUP BY intolerance_key, language
ORDER BY count DESC;
```

#### **1.2. Importar Dados Faltantes**
- [ ] Verificar backup ou fonte original dos dados
- [ ] Importar 335 ingredientes FODMAP
- [ ] Importar 95 ingredientes Frutose
- [ ] Importar 119 ingredientes Histamina
- [ ] Validar integridade referencial

#### **1.3. Remover Duplicatas**
```sql
-- Identificar duplicatas
WITH duplicates AS (
  SELECT 
    category, 
    option_id, 
    MIN(id) as keep_id
  FROM onboarding_options
  GROUP BY category, option_id
  HAVING COUNT(*) > 1
)
-- Deletar duplicatas (manter apenas o primeiro)
DELETE FROM onboarding_options
WHERE id NOT IN (SELECT keep_id FROM duplicates)
  AND (category, option_id) IN (
    SELECT category, option_id FROM duplicates
  );
```

---

### **FASE 2: CORREÇÃO DE CATEGORIZAÇÃO**

#### **2.1. Mover Histamina para Sensibilidades**
```sql
UPDATE onboarding_options
SET category = 'sensitivities'
WHERE option_id = 'histamine' 
  AND category = 'intolerances';
```

#### **2.2. Padronizar Nomenclatura**
```sql
-- Substituir "Leite" por "Lactose" em alergias
UPDATE onboarding_options
SET 
  option_id = 'lactose',
  label = 'Lactose',
  category = 'intolerances'
WHERE option_id = 'milk' 
  AND category = 'allergies';
```

---

### **FASE 3: IMPLEMENTAR I18N HÍBRIDA**

#### **3.1. Adicionar Campo `language`**
```sql
-- Migration
ALTER TABLE onboarding_options 
ADD COLUMN language text DEFAULT 'pt' NOT NULL;

-- Atualizar constraint
ALTER TABLE onboarding_options
DROP CONSTRAINT onboarding_options_category_option_id_key;

ALTER TABLE onboarding_options
ADD CONSTRAINT onboarding_options_category_option_id_language_key 
UNIQUE (category, option_id, language);
```

#### **3.2. Criar Registros Multi-Idioma**
```sql
-- Exemplo: Lactose em 3 idiomas
INSERT INTO onboarding_options (category, option_id, label, language) VALUES
('intolerances', 'lactose', 'Lactose', 'pt'),
('intolerances', 'lactose', 'Lactose', 'en'),
('intolerances', 'lactose', 'Lactosa', 'es');
```

#### **3.3. Atualizar Hook Frontend**
```typescript
// hooks/useOnboardingOptions.tsx
export function useOnboardingOptions(language: string = 'pt') {
  return useQuery({
    queryKey: ["onboarding-options", language],
    queryFn: async () => {
      const { data } = await supabase
        .from("onboarding_options")
        .select("*")
        .eq("is_active", true)
        .eq("language", language)  // ← NOVO FILTRO
        .order("sort_order");
      
      return organizeByCategory(data);
    }
  });
}
```

---

### **FASE 4: IMPLEMENTAR CONTADORES DINÂMICOS**

#### **4.1. Criar View com Contadores**
```sql
CREATE OR REPLACE VIEW onboarding_options_with_counts AS
SELECT 
  o.id,
  o.category,
  o.option_id,
  o.label,
  o.description,
  o.emoji,
  o.icon_name,
  o.is_active,
  o.sort_order,
  o.language,
  COALESCE(COUNT(DISTINCT m.ingredient), 0) as ingredient_count
FROM onboarding_options o
LEFT JOIN intolerance_mappings m 
  ON o.option_id = m.intolerance_key 
  AND o.language = m.language
WHERE o.category IN ('intolerances', 'allergies', 'sensitivities')
GROUP BY o.id;
```

#### **4.2. Atualizar Frontend para Usar View**
```typescript
// hooks/useOnboardingOptions.tsx
export function useOnboardingOptionsWithCounts(language: string = 'pt') {
  return useQuery({
    queryKey: ["onboarding-options-counts", language],
    queryFn: async () => {
      const { data } = await supabase
        .from("onboarding_options_with_counts")
        .select("*")
        .eq("is_active", true)
        .eq("language", language)
        .order("sort_order");
      
      return organizeByCategory(data);
    }
  });
}
```

#### **4.3. Exibir Contadores no UI**
```typescript
// components/onboarding/RestrictionCategoryStep.tsx
<button className="...">
  <span className="font-medium">{item.label}</span>
  <span className="text-xs text-muted-foreground">
    {item.ingredient_count} ingredientes
  </span>
</button>
```

---

### **FASE 5: RESTAURAR HIERARQUIA VISUAL**

#### **5.1. Melhorar Tipografia dos Contadores**
```tsx
// Antes
<span className="text-xs">{item.ingredient_count}</span>

// Depois
<div className="flex items-center justify-between">
  <span className="font-medium text-sm">{item.label}</span>
  <span className="text-lg font-bold text-primary">
    {item.ingredient_count}
  </span>
</div>
```

#### **5.2. Destacar Item Selecionado**
```tsx
// Adicionar fundo verde mais forte
className={cn(
  "p-4 rounded-xl border transition-all",
  isSelected
    ? "bg-green-500/20 border-green-500 shadow-md"  // ← MAIS DESTAQUE
    : "border-border/80 bg-card"
)}
```

#### **5.3. Separar Categorias Visualmente**
```tsx
// Adicionar separador entre categorias
<div className="border-t-2 border-primary/20 my-6" />
```

---

## 📈 MÉTRICAS DE SUCESSO

### **Antes da Restauração**:
- ❌ FODMAP: 0 ingredientes
- ❌ Duplicatas: 4+ registros
- ❌ Categorização: 2+ erros
- ❌ Contadores: Hardcoded
- ❌ I18N: Não suportado

### **Após Restauração**:
- ✅ FODMAP: 335 ingredientes
- ✅ Duplicatas: 0 registros
- ✅ Categorização: 100% correta
- ✅ Contadores: Dinâmicos (query real)
- ✅ I18N: Suporte a PT, EN, ES

---

## 🚨 RISCOS E MITIGAÇÕES

### **Risco 1: Perda Permanente de Dados**
**Mitigação**: Verificar backups antes de qualquer alteração.

### **Risco 2: Breaking Changes no Frontend**
**Mitigação**: Manter fallbacks durante transição.

### **Risco 3: Performance com Contadores**
**Mitigação**: Usar view materializada ou cache.

---

## 📝 CONCLUSÃO

O sistema atual sofreu **perda massiva de dados** (77-100% em algumas categorias) e apresenta **problemas estruturais** de categorização, duplicação e falta de suporte multi-idioma.

A restauração requer:
1. **Importação de dados** faltantes (335+ ingredientes)
2. **Correção de categorização** (Histamina, Leite)
3. **Remoção de duplicatas** (Frutos do mar, Oleaginosas)
4. **Implementação de I18N** (campo language)
5. **Contadores dinâmicos** (view com COUNT)
6. **Restauração visual** (hierarquia, destaque)

**Tempo Estimado**: 2-3 dias de desenvolvimento + 1 dia de testes

**Prioridade**: 🔴 **CRÍTICA** - Sistema core comprometido
