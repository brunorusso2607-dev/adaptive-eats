# 🚨 DIAGNÓSTICO URGENTE - POOL NÃO FUNCIONA

**Data:** 21 de Janeiro de 2026, 20:37 BRT
**Status:** CRÍTICO - Versão segura v95 estava 100% funcional, agora voltou a gerar com IA

---

## 🔴 SITUAÇÃO ATUAL

**Usuário reporta:**
- Salvamos versão segura v95 (tag: `versao-segura-v95`, commit: `5de9373`)
- Essa versão estava **100% funcional** com pool
- Agora voltou a gerar com IA (regressão)
- Mesmo problema que já tínhamos corrigido antes

---

## 🔍 INVESTIGAÇÃO NECESSÁRIA

### **1. VERIFICAR POOL NO BANCO DE DADOS**

Execute este SQL no Supabase:

```sql
-- Verificar se tem refeições aprovadas
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN is_active = true AND approval_status = 'approved' THEN 1 END) as aprovadas_ativas
FROM meal_combinations;

-- Por tipo de refeição
SELECT 
  meal_type,
  COUNT(*) as quantidade
FROM meal_combinations
WHERE is_active = true 
  AND approval_status = 'approved'
  AND country_codes @> ARRAY['BR']
GROUP BY meal_type;
```

**Arquivo criado:** `VERIFICAR_POOL_APROVADAS.sql`

---

### **2. VERIFICAR LOGS DO SUPABASE**

Quando você gerar um plano, verificar nos logs:

**Procurar por:**
- `"Loading approved meal combinations from pool"`
- `"from POOL"` ou `"from AI"`
- `"totalApproved"`, `"compatibleWithUser"`

**Perguntas:**
- Quantas refeições foram carregadas do pool?
- Quantas são compatíveis com o usuário?
- Por que está fazendo fallback para IA?

---

### **3. POSSÍVEIS CAUSAS**

| Causa | Como Verificar |
|-------|----------------|
| Pool vazio ou sem aprovadas | SQL acima |
| Filtros muito rigorosos | Logs: `compatibleWithUser: 0` |
| Campo `approval_status` não existe | Erro no SQL |
| Campo `is_active` não existe | Erro no SQL |
| País não bate | Verificar `country_codes` |
| Calorias fora do range | Logs: `targetCalories` vs pool |

---

### **4. HIPÓTESE PRINCIPAL**

**Suspeita:** As refeições no pool **NÃO estão aprovadas** (`approval_status != 'approved'`)

**Por quê:**
- Código busca: `WHERE approval_status = 'approved'`
- Se nenhuma refeição tem `approval_status = 'approved'`, pool retorna vazio
- Sistema faz fallback para IA

**Solução se for isso:**
```sql
-- Aprovar todas as refeições ativas
UPDATE meal_combinations
SET approval_status = 'approved'
WHERE is_active = true;
```

---

### **5. COMPARAÇÃO COM VERSÃO QUE FUNCIONAVA**

**Commit que funcionava:** `b81a07a` ou anterior

**Verificar:**
- Esse commit tinha campo `approval_status`?
- Ou usava apenas `is_active = true`?
- Mudou a query de busca do pool?

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

1. **VOCÊ:** Execute `VERIFICAR_POOL_APROVADAS.sql` no Supabase
2. **VOCÊ:** Me diga quantas refeições aprovadas existem
3. **EU:** Vou analisar e corrigir baseado nos dados reais

---

## 📊 DADOS QUE PRECISO

Por favor, me envie:

1. **Resultado do SQL** `VERIFICAR_POOL_APROVADAS.sql`
2. **Logs do Supabase** da última geração de plano
3. **Screenshot** ou texto dos logs mostrando:
   - `"Loading approved meal combinations from pool"`
   - `"totalApproved"`, `"compatibleWithUser"`

---

## ⚠️ IMPORTANTE

**NÃO vou mais especular.** Preciso de **dados reais** do banco e dos logs para diagnosticar corretamente.

Sem esses dados, estou "atirando no escuro" e perdendo seu tempo.

---

*Aguardando dados do banco e logs para diagnóstico preciso*
