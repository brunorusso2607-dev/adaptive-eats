# INVESTIGAÇÃO: POR QUE APENAS 4 DE 20 ALMOÇOS?

## 🔴 SITUAÇÃO ATUAL

- Solicitado: 20 almoços
- Gerado: 4 almoços
- Taxa de sucesso: 20%

## 🐛 BUG CORRIGIDO

✅ Conflito de variável `attempts` foi corrigido (renomeado para `retries`)

## ❓ POR QUE AINDA NÃO FUNCIONA?

Possíveis causas restantes:

### 1. **Duplicatas no banco**
- O gerador pode estar criando refeições, mas elas já existem no banco
- Precisamos verificar quantas tentativas foram feitas vs quantas foram duplicatas

### 2. **Validações muito rigorosas**
- `validateAndFixMeal` pode estar rejeitando muitas refeições
- Precisamos ver nos logs quais validações estão falhando

### 3. **Pool já saturado para almoço**
- Apesar de ter apenas 197 refeições no total, pode ter muitas de almoço
- Precisamos verificar quantas refeições de almoço já existem

### 4. **Erro no cálculo de avgOptionsPerSlot**
- O multiplier pode não estar sendo calculado corretamente
- Pode estar usando 100x ao invés de 500x

## 🔍 PRÓXIMA AÇÃO

Verificar nos logs do Supabase:
1. Quantas tentativas foram feitas (deve ser ~10,000)
2. Quantas foram duplicatas
3. Quantas foram rejeitadas por validação
4. Qual multiplier foi usado

## 📊 DADOS NECESSÁRIOS

Execute no Supabase Dashboard SQL Editor:

```sql
-- Verificar quantas refeições de almoço existem
SELECT COUNT(*) as total_almoco
FROM meal_combinations
WHERE meal_type = 'almoco'
  AND country_codes @> ARRAY['BR']
  AND is_active = true;
```

Se tiver mais de 200 almoços, o pool pode estar saturando.
