# DIAGNÓSTICO: GERA APENAS UMA VEZ POR TIPO DE REFEIÇÃO

## 🔴 PROBLEMA REPORTADO

**Sintoma:** Sistema gera refeições apenas uma vez por tipo (almoço, jantar, etc) e depois retorna erro "Edge Function returned a non-2xx status code".

**Evidência:** Pool tem 80 refeições ativas, mas ao tentar gerar 20 café da manhã novamente, falha.

---

## 🔍 HIPÓTESES DO PROBLEMA

### **HIPÓTESE 1: Constraint de UNIQUE bloqueando inserção**

**Possível causa:** Tabela `meal_combinations` pode ter constraint UNIQUE em `name` ou `(name, meal_type)` que impede inserir refeições com nomes duplicados.

**Verificação:**
```sql
-- Execute no Supabase SQL Editor
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'meal_combinations'::regclass
  AND contype = 'u'; -- unique constraints
```

**Se houver constraint UNIQUE em `name`:**
- Primeira geração: Insere "Pão integral com ovo mexido e banana" ✅
- Segunda geração: Tenta inserir "Pão integral com ovo mexido e banana" novamente ❌ ERRO

**Solução:** Remover constraint UNIQUE ou adicionar lógica para verificar duplicatas antes de inserir.

---

### **HIPÓTESE 2: Código filtra duplicatas mas não verifica banco**

**Código atual:**
```typescript
// populate-meal-pool/index.ts linha 395-398
const uniqueMeals = mealsWithMacros.filter((meal, index, self) => 
  index === self.findIndex(m => m.name === meal.name)
);
```

**Problema:** Este código remove duplicatas **dentro do batch atual**, mas não verifica se o nome já existe no banco de dados!

**Exemplo:**
- Primeira geração: Insere "Pão com ovo e banana" no banco ✅
- Segunda geração: Gera "Pão com ovo e banana" novamente, passa pelo filtro (não há duplicata no batch), tenta inserir no banco ❌ ERRO (constraint UNIQUE)

**Solução:** Verificar nomes existentes no banco antes de inserir.

---

### **HIPÓTESE 3: Gerador cria sempre as mesmas combinações**

**Possível causa:** O gerador de templates não tem aleatoriedade suficiente e sempre gera as mesmas combinações na mesma ordem.

**Verificação:**
```typescript
// advanced-meal-generator.ts linha 215
const template = selectRandom(templates);
```

**Se `selectRandom` não for aleatório o suficiente:**
- Primeira geração: Sempre gera as mesmas 20 combinações
- Segunda geração: Tenta gerar as mesmas 20 combinações novamente ❌ ERRO

---

## 🎯 SOLUÇÃO RECOMENDADA

### **SOLUÇÃO 1: Verificar e remover duplicatas do banco antes de inserir**

```typescript
// populate-meal-pool/index.ts - ADICIONAR ANTES DA INSERÇÃO

// Buscar nomes já existentes no banco
const { data: existingMeals } = await supabase
  .from("meal_combinations")
  .select("name")
  .eq("meal_type", meal_type)
  .contains("country_codes", [country_code]);

const existingNames = new Set(existingMeals?.map(m => m.name) || []);

// Filtrar refeições que já existem
const newMeals = uniqueMeals.filter(meal => !existingNames.has(meal.name));

logStep("Meals after filtering existing", {
  total: uniqueMeals.length,
  existing: uniqueMeals.length - newMeals.length,
  new: newMeals.length
});

// Se não há refeições novas, retornar sucesso com mensagem
if (newMeals.length === 0) {
  return new Response(
    JSON.stringify({
      success: true,
      inserted: 0,
      message: "All generated meals already exist in the pool",
      skipped: uniqueMeals.length
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}

// Inserir apenas refeições novas
const { data: inserted, error } = await supabase
  .from("meal_combinations")
  .insert(newMeals)
  .select();
```

---

### **SOLUÇÃO 2: Remover constraint UNIQUE se existir**

```sql
-- Execute no Supabase SQL Editor
-- Primeiro, verificar se existe
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'meal_combinations'::regclass 
  AND contype = 'u'
  AND conname LIKE '%name%';

-- Se existir, remover
ALTER TABLE meal_combinations 
DROP CONSTRAINT IF EXISTS meal_combinations_name_key;

-- OU se for constraint composta
ALTER TABLE meal_combinations 
DROP CONSTRAINT IF EXISTS meal_combinations_name_meal_type_key;
```

---

### **SOLUÇÃO 3: Aumentar aleatoriedade do gerador**

```typescript
// advanced-meal-generator.ts - Adicionar timestamp ao seed
function selectRandom<T>(array: T[]): T {
  const seed = Date.now() + Math.random(); // Adicionar timestamp
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}
```

---

## 📋 PASSOS PARA DIAGNÓSTICO

1. **Execute o SQL de verificação** (`VERIFICAR_PROBLEMA_GERACAO_UNICA.sql`)
2. **Verifique se há constraint UNIQUE** na coluna `name`
3. **Verifique quantas refeições duplicadas existem**
4. **Implemente SOLUÇÃO 1** (verificar duplicatas antes de inserir)
5. **Teste gerando 20 refeições novamente**

---

## ✅ IMPLEMENTAÇÃO RECOMENDADA

**Prioridade:** ALTA

**Implementar SOLUÇÃO 1** (verificar duplicatas do banco) é a mais segura e resolve o problema sem alterar a estrutura do banco.

---

**Aguardando aprovação para implementar a solução.**
