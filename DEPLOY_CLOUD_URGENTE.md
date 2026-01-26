# 🚨 DEPLOY URGENTE PARA SUPABASE CLOUD

## 📊 PROBLEMA IDENTIFICADO

**Você está usando Supabase NA NUVEM, não local!**

Por isso as correções locais não aparecem. Precisamos fazer deploy para a nuvem.

---

## ✅ SOLUÇÃO: DEPLOY VIA GITHUB

### OPÇÃO 1: Deploy Automático via GitHub (RECOMENDADO)

#### PASSO 1: Commit e Push
```bash
git add .
git commit -m "fix: correções de porções, molhos e proteínas"
git push origin main
```

#### PASSO 2: Conectar Supabase ao GitHub
1. Acesse: https://supabase.com/dashboard/project/SEU_PROJECT/settings/integrations
2. **GitHub Integration** → **Connect**
3. Autorize o repositório
4. **Deploy automaticamente** quando fizer push

---

### OPÇÃO 2: Deploy Manual via CLI (Windows)

#### PASSO 1: Instalar Supabase CLI via Scoop
```powershell
# Instalar Scoop (se não tiver)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Instalar Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### PASSO 2: Login e Deploy
```bash
supabase login
supabase link --project-ref SEU_PROJECT_ID
supabase functions deploy populate-meal-pool
```

---

### OPÇÃO 3: Copiar Código Manualmente (TEMPORÁRIO)

Como o painel web não permite editar, você precisa:

1. **Deletar a função antiga**
2. **Criar nova função** com o código atualizado
3. **Copiar módulos compartilhados**

**Mas isso é trabalhoso e não recomendado!**

---

## 🎯 RECOMENDAÇÃO FINAL

**Use OPÇÃO 1 (GitHub Integration):**
- ✅ Automático
- ✅ Versionado
- ✅ Fácil de reverter
- ✅ Deploy em segundos

---

## 📋 PASSOS IMEDIATOS

### 1. LIMPAR REFEIÇÕES PROBLEMÁTICAS
Execute `CORRECAO_URGENTE_CLOUD.sql` no SQL Editor

### 2. FAZER DEPLOY
Escolha uma das opções acima

### 3. GERAR NOVAS REFEIÇÕES
Após deploy, gere novas refeições no painel admin

---

## ⚠️ IMPORTANTE

**Enquanto não fizer deploy:**
- As correções só existem localmente
- O sistema na nuvem continua com código antigo
- Refeições problemáticas continuarão sendo geradas

**Faça o deploy AGORA!** 🚀
