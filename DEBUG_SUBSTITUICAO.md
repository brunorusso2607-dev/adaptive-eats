# 🐛 Debug - Erro ao Buscar Substituições

## Erro Atual
"Erro ao buscar substituições - Edge Function returned a non-2xx status code"

## Como Debugar

### 1. Abrir Console do Navegador
- Pressione `F12` no navegador
- Vá na aba "Console"

### 2. Clicar no Botão [🔄]
- Abra uma refeição
- Clique no botão [🔄] ao lado de qualquer ingrediente
- Observe os logs no console

### 3. Logs Esperados

```javascript
// ✅ Logs de sucesso:
🔍 Fetching substitutes with request: {
  ingredientId: "arroz_integral",
  ingredientName: "Arroz integral",
  currentGrams: 100,
  currentCaloriesPer100g: 112,
  ...
}

📦 Response: {
  data: {
    substitutes: [...],
    originalCategory: "carbohydrate"
  },
  error: null
}

✅ Substitutes found: 5

// ❌ Logs de erro:
❌ Edge Function error: { ... }
Error details: {
  message: "...",
  status: 401/500/etc,
  statusText: "...",
  context: "..."
}
```

## Possíveis Causas do Erro

### 1. Edge Function não deployada
**Solução:**
```bash
cd c:\adaptive-eats-main
supabase functions deploy get-ingredient-substitutes --no-verify-jwt
```

### 2. Tabela `canonical_ingredients` vazia
**Verificar:**
```sql
SELECT COUNT(*) FROM canonical_ingredients;
```

Se retornar 0, a tabela está vazia e precisa ser populada.

### 3. Erro de autenticação (401)
**Causa:** Edge Function exige JWT mas não deveria
**Solução:** Re-deploy com `--no-verify-jwt`

### 4. Erro interno da função (500)
**Causa:** Bug no código da Edge Function
**Solução:** Ver logs da função:
```bash
supabase functions logs get-ingredient-substitutes
```

### 5. Dados inválidos sendo enviados
**Verificar no console:**
- `ingredientId` não pode ser vazio
- `currentGrams` deve ser > 0
- `currentCaloriesPer100g` deve ser > 0

## Próximos Passos

1. **Abra o console** e clique no botão [🔄]
2. **Copie os logs** que aparecem
3. **Me envie** os logs para eu analisar
4. Vou identificar o problema exato e corrigir

## Comandos Úteis

### Ver logs da Edge Function
```bash
supabase functions logs get-ingredient-substitutes --limit 50
```

### Testar Edge Function diretamente
```bash
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/get-ingredient-substitutes \
  -H "Content-Type: application/json" \
  -d '{
    "ingredientId": "arroz_integral",
    "ingredientName": "Arroz integral",
    "currentGrams": 100,
    "currentCaloriesPer100g": 112,
    "currentProteinPer100g": 2.6,
    "currentCarbsPer100g": 23.5,
    "currentFatPer100g": 0.9,
    "userIntolerances": [],
    "maxResults": 10
  }'
```

### Verificar se tabela existe
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'canonical_ingredients';
```

### Ver estrutura da tabela
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'canonical_ingredients';
```
