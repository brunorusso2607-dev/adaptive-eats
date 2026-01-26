# 🚀 DEPLOY VIA WEB - INSTRUÇÕES

## 📋 PASSOS RÁPIDOS

### 1. ACESSAR PAINEL SUPABASE
- Vá para: https://supabase.com/dashboard
- Entre no seu projeto

### 2. IR PARA EDGE FUNCTIONS
- Menu lateral → **Edge Functions**
- Clique na função **populate-meal-pool**

### 3. FAZER DEPLOY
- Clique em **"Edit"** ou **"Update"**
- Copie TODO o conteúdo do arquivo `index.ts`
- Cole no editor web
- Clique em **"Deploy"**

---

## ⚠️ IMPORTANTE

**Você PRECISA fazer deploy de 2 arquivos:**

1. **populate-meal-pool/index.ts** (função principal)
2. **_shared/portionValidation.ts** (módulo novo)

---

## 📁 ARQUIVOS PARA DEPLOY

### Arquivo 1: populate-meal-pool/index.ts
- Caminho: `c:\adaptive-eats-main\supabase\functions\populate-meal-pool\index.ts`
- Copie TODO o conteúdo (2903 linhas)

### Arquivo 2: _shared/portionValidation.ts
- Caminho: `c:\adaptive-eats-main\supabase\functions\_shared\portionValidation.ts`
- Copie TODO o conteúdo

---

## 🔄 ORDEM DO DEPLOY

1. **PRIMEIRO:** Deploy do `portionValidation.ts`
2. **DEPOIS:** Deploy do `index.ts` (que depende do primeiro)

---

## 📱 ALTERNATIVA: USAR CLI

Se preferir usar CLI (após instalar):

```bash
# 1. Login no Supabase
supabase login

# 2. Linkar ao projeto
supabase link --project-ref SEU_PROJECT_ID

# 3. Deploy da função
supabase functions deploy populate-meal-pool
```

---

## ✅ VERIFICAÇÃO APÓS DEPLOY

1. Teste a função:
```bash
curl -X POST https://SEU_PROJECT_ID.supabase.co/functions/v1/populate-meal-pool \
  -H "Content-Type: application/json" \
  -d '{"country_code":"BR","meal_type":"almoco","quantity":5}'
```

2. Verifique logs no painel do Supabase

---

## 🚨 SE TIVER ERRO

Se der erro de import do `portionValidation.ts`:
- Verifique se deployou o módulo compartilhado primeiro
- Os arquivos `_shared/` precisam ser deployados separadamente

---

**Quer que eu te ajude com algum passo específico?**
