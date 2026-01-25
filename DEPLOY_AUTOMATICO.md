# 🚀 DEPLOY AUTOMÁTICO - CONFIGURAÇÃO

**Criado em:** 13/01/2026  
**Sistema:** GitHub Actions → Supabase Edge Functions

---

## ✅ **O QUE FOI CONFIGURADO**

Criei um workflow do GitHub Actions que faz deploy automático das Edge Functions sempre que você:
- Fizer commit na branch `main` ou `master`
- Modificar arquivos em `supabase/functions/**`
- Ou clicar em "Run workflow" manualmente

**Arquivo criado:** `.github/workflows/deploy-functions.yml`

---

## 🔧 **CONFIGURAÇÃO NECESSÁRIA (PASSO A PASSO)**

### **1. Obter Access Token do Supabase**

1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em **"Generate new token"**
3. Nome: `GitHub Actions Deploy`
4. Copie o token (guarde bem, só aparece uma vez!)

### **2. Obter Project ID**

Seu Project ID já é conhecido: `onzdkpqtzfxzcdyxczkn`

### **3. Adicionar Secrets no GitHub**

1. Vá no seu repositório GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Clique em **"New repository secret"**

**Adicione 2 secrets:**

**Secret 1:**
- Name: `SUPABASE_ACCESS_TOKEN`
- Value: `[cole o token que você copiou no passo 1]`

**Secret 2:**
- Name: `SUPABASE_PROJECT_ID`
- Value: `onzdkpqtzfxzcdyxczkn`

---

## 🎯 **COMO USAR**

### **Deploy Automático (Recomendado)**

Simplesmente faça commit e push:

```bash
git add .
git commit -m "fix: corrigir chat-assistant para usar Gemini"
git push origin main
```

O GitHub Actions vai:
1. Detectar mudanças em `supabase/functions/`
2. Instalar Supabase CLI
3. Fazer deploy de todas as funções
4. Notificar sucesso/erro

### **Deploy Manual (Via GitHub)**

1. Vá em: **Actions** → **Deploy Supabase Functions**
2. Clique em **"Run workflow"**
3. Selecione a branch
4. Clique em **"Run workflow"**

---

## 📊 **MONITORAR DEPLOYS**

### **Ver Status do Deploy:**
1. Vá em: **Actions** no seu repositório GitHub
2. Clique no workflow mais recente
3. Veja os logs em tempo real

### **Ver Logs das Functions:**
```bash
# Se tiver Supabase CLI instalado
supabase functions logs chat-assistant --tail
```

Ou no Dashboard:
https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/functions/chat-assistant/logs

---

## 🔍 **TROUBLESHOOTING**

### **Erro: "SUPABASE_ACCESS_TOKEN not found"**
- Verifique se adicionou o secret corretamente no GitHub
- Nome deve ser EXATAMENTE: `SUPABASE_ACCESS_TOKEN`

### **Erro: "Project not found"**
- Verifique se o `SUPABASE_PROJECT_ID` está correto: `onzdkpqtzfxzcdyxczkn`

### **Erro: "Permission denied"**
- O Access Token precisa ter permissões de deploy
- Gere um novo token com permissões completas

### **Deploy não está rodando automaticamente**
- Verifique se o arquivo está em `.github/workflows/deploy-functions.yml`
- Verifique se você fez push para `main` ou `master`
- Verifique se modificou arquivos em `supabase/functions/`

---

## 🎨 **PERSONALIZAR O WORKFLOW**

### **Fazer deploy apenas de funções específicas:**

Edite `.github/workflows/deploy-functions.yml`:

```yaml
- name: Deploy Functions
  run: |
    supabase link --project-ref $SUPABASE_PROJECT_ID
    supabase functions deploy chat-assistant
    supabase functions deploy analyze-food-photo
```

### **Deploy em branches diferentes:**

```yaml
on:
  push:
    branches:
      - main
      - develop  # Adicione outras branches
      - production
```

### **Deploy apenas em horários específicos:**

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Todo dia às 2h da manhã
```

---

## 📝 **EXEMPLO DE WORKFLOW COMPLETO**

```yaml
name: Deploy Supabase Functions

on:
  push:
    branches: [main]
    paths: ['supabase/functions/**']
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Supabase CLI
        run: npm install -g supabase
      
      - name: Deploy Functions
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
        run: |
          supabase link --project-ref $SUPABASE_PROJECT_ID
          supabase functions deploy --no-verify-jwt
```

---

## ✅ **CHECKLIST DE CONFIGURAÇÃO**

- [ ] Access Token gerado no Supabase
- [ ] Secret `SUPABASE_ACCESS_TOKEN` adicionado no GitHub
- [ ] Secret `SUPABASE_PROJECT_ID` adicionado no GitHub
- [ ] Arquivo `.github/workflows/deploy-functions.yml` commitado
- [ ] Primeiro deploy manual testado
- [ ] Deploy automático funcionando

---

## 🚀 **DEPLOY IMEDIATO DO CHAT-ASSISTANT**

Para fazer deploy da correção do chat-assistant agora:

### **Opção 1: Via GitHub Actions (se já configurou)**
```bash
git add supabase/functions/chat-assistant/index.ts
git commit -m "fix: chat-assistant usar Gemini API diretamente"
git push origin main
```

### **Opção 2: Via Supabase Dashboard**
1. Acesse: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/functions
2. Clique em **chat-assistant**
3. Clique em **Deploy new version**
4. Faça upload do arquivo corrigido

### **Opção 3: Via CLI (se instalado)**
```bash
supabase functions deploy chat-assistant
```

---

## 📚 **RECURSOS ADICIONAIS**

- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Supabase CLI Docs:** https://supabase.com/docs/guides/cli
- **Supabase Functions:** https://supabase.com/docs/guides/functions

---

## 🎉 **BENEFÍCIOS DO DEPLOY AUTOMÁTICO**

✅ **Sem comandos manuais** - Só commit e push  
✅ **Histórico completo** - Todos os deploys registrados no GitHub  
✅ **Rollback fácil** - Voltar para commit anterior  
✅ **CI/CD profissional** - Workflow automatizado  
✅ **Notificações** - Saber se deploy funcionou ou falhou  

---

**Última atualização:** 13/01/2026  
**Status:** ✅ Configurado e pronto para uso
