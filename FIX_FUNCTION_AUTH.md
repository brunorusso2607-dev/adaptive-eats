# DIAGNÓSTICO DO ERRO 401

## Problema Identificado
O erro 401 (Unauthorized) está acontecendo **na chamada da Edge Function**, não dentro dela.

## Evidências
1. Logs mostram: `POST https://...functions/v1/generate-ai-meal-plan` → 401
2. NÃO aparece a mensagem "🔍 DEBUG: About to load pool"
3. Código nem está sendo executado dentro da função

## Possíveis Causas

### 1. JWT Verification
A função pode estar configurada com `--no-verify-jwt` mas o deploy não manteve essa configuração.

### 2. CORS Headers
Pode haver problema com headers CORS impedindo a autenticação.

### 3. Token Expirado
O token de autenticação pode estar expirado.

## Solução Imediata

Execute no terminal:

```bash
# Re-deploy com --no-verify-jwt explícito
supabase functions deploy generate-ai-meal-plan --no-verify-jwt

# OU verificar se precisa de JWT
supabase functions deploy generate-ai-meal-plan
```

## Teste Alternativo

Tente chamar a função diretamente via curl para isolar o problema:

```bash
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/generate-ai-meal-plan \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"daysCount": 1, "optionsPerMeal": 1}'
```
