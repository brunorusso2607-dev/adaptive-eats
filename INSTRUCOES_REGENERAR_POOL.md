# INSTRUÇÕES PARA REGENERAR POOL COMPLETO

## 🎯 Objetivo
Gerar 120 refeições no pool (20 de cada tipo) para validar as novas regras implementadas.

---

## 📋 OPÇÃO 1: Via Interface Admin (RECOMENDADO)

1. Acesse: `https://seu-dominio.com/admin/meal-pool`
2. Para cada tipo de refeição, clique em "Gerar Refeições"
3. Configure:
   - **Tipo:** Café da manhã
   - **Quantidade:** 20
   - **País:** Brasil
   - **Intolerâncias:** (deixe vazio)
4. Clique em "Gerar"
5. Repita para os outros tipos:
   - Lanche da manhã (20)
   - Almoço (20)
   - Lanche da tarde (20)
   - Jantar (20)
   - Ceia (20)

---

## 📋 OPÇÃO 2: Via PowerShell (MANUAL)

### Passo 1: Definir chave do Supabase
```powershell
$env:SUPABASE_ANON_KEY = "sua-chave-anon-aqui"
```

### Passo 2: Executar script
```powershell
cd c:\adaptive-eats-main
powershell -ExecutionPolicy Bypass -File gerar_pool.ps1
```

---

## 📋 OPÇÃO 3: Via cURL (MANUAL)

### Café da manhã (20):
```bash
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/populate-meal-pool \
  -H "apikey: SUA_CHAVE_AQUI" \
  -H "Authorization: Bearer SUA_CHAVE_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"meal_type":"cafe_manha","quantity":20,"country_code":"BR","intolerances":[]}'
```

### Lanche da manhã (20):
```bash
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/populate-meal-pool \
  -H "apikey: SUA_CHAVE_AQUI" \
  -H "Authorization: Bearer SUA_CHAVE_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"meal_type":"lanche_manha","quantity":20,"country_code":"BR","intolerances":[]}'
```

### Almoço (20):
```bash
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/populate-meal-pool \
  -H "apikey: SUA_CHAVE_AQUI" \
  -H "Authorization: Bearer SUA_CHAVE_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"meal_type":"almoco","quantity":20,"country_code":"BR","intolerances":[]}'
```

### Lanche da tarde (20):
```bash
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/populate-meal-pool \
  -H "apikey: SUA_CHAVE_AQUI" \
  -H "Authorization: Bearer SUA_CHAVE_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"meal_type":"lanche_tarde","quantity":20,"country_code":"BR","intolerances":[]}'
```

### Jantar (20):
```bash
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/populate-meal-pool \
  -H "apikey: SUA_CHAVE_AQUI" \
  -H "Authorization: Bearer SUA_CHAVE_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"meal_type":"jantar","quantity":20,"country_code":"BR","intolerances":[]}'
```

### Ceia (20):
```bash
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/populate-meal-pool \
  -H "apikey: SUA_CHAVE_AQUI" \
  -H "Authorization: Bearer SUA_CHAVE_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"meal_type":"ceia","quantity":20,"country_code":"BR","intolerances":[]}'
```

---

## 🔍 VALIDAÇÃO APÓS GERAÇÃO

Execute os SQLs de diagnóstico para validar:

### 1. Verificar total de refeições:
```sql
SELECT 
  meal_type,
  COUNT(*) as total
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
GROUP BY meal_type
ORDER BY meal_type;
```

**Resultado esperado:**
- cafe_manha: 20
- lanche_manha: 20
- almoco: 20
- lanche_tarde: 20
- jantar: 20
- ceia: 20
- **TOTAL: 120 refeições**

### 2. Verificar refeições problemáticas (DEVE SER 0):
```sql
-- Refeições com apenas 1 componente (exceto pratos compostos)
SELECT id, name, meal_type, jsonb_array_length(components) as num_components
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND jsonb_array_length(components) = 1
  AND name NOT ILIKE '%lasanha%'
  AND name NOT ILIKE '%feijoada%'
  AND name NOT ILIKE '%vitamina%';
```

**Resultado esperado:** 0 linhas

### 3. Verificar refeições com azeite isolado (DEVE SER 0):
```sql
SELECT id, name, meal_type, components
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND components::text ILIKE '%azeite%'
  AND jsonb_array_length(components) = 1;
```

**Resultado esperado:** 0 linhas

### 4. Verificar refeições com calorias muito baixas (DEVE SER 0):
```sql
SELECT id, name, meal_type, total_calories
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND total_calories < 50
  AND meal_type != 'ceia';
```

**Resultado esperado:** 0 linhas

### 5. Verificar agrupamentos (DEVE TER VÁRIOS):
```sql
-- Refeições com "com" no nome (indicam agrupamento)
SELECT id, name, meal_type, total_calories
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND name ILIKE '% com %'
ORDER BY meal_type
LIMIT 20;
```

**Resultado esperado:** Várias refeições como:
- "Pão integral com ovo mexido"
- "Salada de alface e tomate com azeite"
- "Iogurte natural com mel"

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após gerar as 120 refeições, confirme:

- [ ] 120 refeições geradas (20 de cada tipo)
- [ ] 0 refeições com apenas 1 componente (exceto pratos compostos)
- [ ] 0 refeições com azeite isolado
- [ ] 0 refeições com temperos isolados
- [ ] 0 refeições com < 50 kcal (exceto ceia)
- [ ] Várias refeições agrupadas ("com" no nome)
- [ ] Nenhuma refeição com "arroz com feijão" (devem estar separados)

---

## 📊 LOGS ESPERADOS

Durante a geração, você verá nos logs do Supabase:

✅ **Logs de sucesso:**
```
[MEAL-GENERATOR] Refeição validada e agrupada: Pão integral com ovo mexido
[MEAL-GENERATOR] Refeição validada e agrupada: Salada de alface e tomate com azeite
```

⚠️ **Logs de rejeição (esperado):**
```
[MEAL-GENERATOR] Refeição rejeitada: Azeite de oliva
  errors: ["Azeite deve estar acompanhado de salada ou proteína"]
[MEAL-GENERATOR] Refeição rejeitada: Cenoura cozida
  errors: ["Refeição deve ter pelo menos 2 componentes (tem 1)"]
```

---

**Documento criado em:** 20/01/2026 21:35
**Versão do sistema:** v1.2.0-pool-validations
