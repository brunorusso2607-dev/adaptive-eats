# 🚀 DEPLOY MANUAL VIA SUPABASE CLI

---

## 📋 PASSO 1: INSTALAR SUPABASE CLI VIA SCOOP

### 1.1 Instalar Scoop (gerenciador de pacotes)
```powershell
# Abra PowerShell como Administrador
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### 1.2 Instalar Supabase CLI
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 1.3 Verificar instalação
```powershell
supabase --version
```

---

## 📋 PASSO 2: FAZER LOGIN NO SUPABASE

### 2.1 Login
```powershell
supabase login
```

### 2.2 Vai abrir navegador
- Autorize o acesso
- Volte para o terminal

---

## 📋 PASSO 3: LINKAR AO PROJETO

### 3.1 Obter Project ID
1. Supabase Dashboard → Settings → General
2. Copie o **Project ID** (ex: `onzdkpqtzfxzcdyxczkn`)

### 3.2 Linkar projeto
```powershell
cd c:\adaptive-eats-main
supabase link --project-ref SEU_PROJECT_ID
```

---

## 📋 PASSO 4: FAZER DEPLOY

### 4.1 Deploy da função
```powershell
supabase functions deploy populate-meal-pool
```

### 4.2 Deploy do módulo compartilhado
```powershell
supabase functions deploy populate-meal-pool --no-verify-jwt
```

---

## 📋 PASSO 5: VERIFICAR

1. Supabase Dashboard → Edge Functions
2. Deve ver função atualizada
3. Gere novas refeições para testar

---

## 🚨 SE DER ERRO

### Erro: "Project not found"
- Verifique o Project ID
- Tente novamente com ID correto

### Erro: "Authentication failed"
- Faça `supabase login` novamente
- Autorize no navegador

---

**Siga os passos acima! 🚀**
