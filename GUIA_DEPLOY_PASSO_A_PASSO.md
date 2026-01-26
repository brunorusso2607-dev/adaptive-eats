# 🚀 GUIA DEPLOY - PASSO A PASSO ULTRA DETALHADO

---

## 📋 PARTE 1: ABRIR SOURCE CONTROL NO VS CODE

### PASSO 1.1: Olhe para a barra lateral esquerda do VS Code
```
┌─────────────────────────────────────┐
│  📄 Explorer (ícone de arquivo)      │ ← NÃO É AQUI
│  🔍 Search (ícone de lupa)           │ ← NÃO É AQUI
│  🌿 Source Control (ícone de branch) │ ← CLIQUE AQUI! 👈
│  🐛 Run and Debug                    │ ← NÃO É AQUI
│  📦 Extensions                       │ ← NÃO É AQUI
└─────────────────────────────────────┘
```

### PASSO 1.2: Clique no ícone 🌿 (parece um galho de árvore)
- **Onde:** Terceiro ícone de cima para baixo
- **Ou aperte:** `Ctrl + Shift + G`

### PASSO 1.3: Deve abrir um painel com "Source Control"
- **Se abriu:** ✅ Vá para PARTE 2
- **Se não abriu:** Aperte `Ctrl + Shift + G` novamente

---

## 📋 PARTE 2: ADICIONAR ARQUIVOS (STAGE)

### PASSO 2.1: Procure a seção "Changes"
```
Source Control
├─ Changes (12) ← VOCÊ DEVE VER ISSO
│  ├─ 📄 index.ts
│  ├─ 📄 portionValidation.ts
│  └─ 📄 outros arquivos...
```

### PASSO 2.2: Adicionar TODOS os arquivos de uma vez
**OPÇÃO A - Botão direito (MAIS FÁCIL):**
1. **Clique com botão direito** em "Changes (12)"
2. **Escolha:** "Stage All Changes"
3. **Pronto!** Vá para PARTE 3

**OPÇÃO B - Atalho de teclado:**
1. **Clique** em qualquer arquivo da lista
2. **Aperte:** `Ctrl + A` (seleciona tudo)
3. **Aperte:** `Ctrl + Enter` (adiciona tudo)
4. **Pronto!** Vá para PARTE 3

**OPÇÃO C - Comando:**
1. **Aperte:** `F1`
2. **Digite:** `stage all`
3. **Escolha:** "Git: Stage All Changes"
4. **Enter**
5. **Pronto!** Vá para PARTE 3

### PASSO 2.3: Verificar se funcionou
```
ANTES:
├─ Changes (12)

DEPOIS:
├─ Staged Changes (12) ← DEVE APARECER ISSO
```

---

## 📋 PARTE 3: FAZER COMMIT

### PASSO 3.1: Procure a caixa de texto "Message"
```
┌─────────────────────────────────────┐
│  Message                             │
│  ┌─────────────────────────────────┐ │
│  │ [Digite aqui]                   │ │ ← CLIQUE AQUI
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### PASSO 3.2: Digite EXATAMENTE isso:
```
fix: correções de porções, molhos e proteínas
```

### PASSO 3.3: Fazer o Commit
**OPÇÃO A - Botão (MAIS FÁCIL):**
1. **Procure o botão azul** "Commit" ou ícone ✅
2. **Clique nele**
3. **Pronto!** Vá para PARTE 4

**OPÇÃO B - Atalho:**
1. **Aperte:** `Ctrl + Enter`
2. **Pronto!** Vá para PARTE 4

---

## 📋 PARTE 4: FAZER PUSH (ENVIAR PARA GITHUB)

### PASSO 4.1: Procure o menu de três pontinhos (...)
```
┌─────────────────────────────────────┐
│  [✅ Commit]  [... ⋮]                │ ← CLIQUE NOS 3 PONTINHOS
└─────────────────────────────────────┘
```

### PASSO 4.2: Clique nos três pontinhos (...)

### PASSO 4.3: Escolha "Push"
```
Menu:
├─ Pull
├─ Push ← CLIQUE AQUI! 👈
├─ Sync
└─ ...
```

### PASSO 4.4: Espere terminar
- **Vai aparecer:** "Pushing to origin/main..."
- **Quando terminar:** ✅ "Successfully pushed"

---

## 📋 PARTE 5: VERIFICAR DEPLOY NO SUPABASE

### PASSO 5.1: Abrir navegador
1. **Abra:** Chrome, Edge, ou Firefox
2. **Vá para:** https://supabase.com/dashboard

### PASSO 5.2: Entrar no projeto
1. **Faça login** (se necessário)
2. **Clique no seu projeto** "adaptive-eats" ou similar

### PASSO 5.3: Ir para Edge Functions
```
Menu lateral:
├─ Database
├─ Authentication
├─ Storage
├─ Edge Functions ← CLIQUE AQUI! 👈
└─ Settings
```

### PASSO 5.4: Verificar status
1. **Procure:** "populate-meal-pool"
2. **Status deve ser:**
   - "Deploying..." (aguarde)
   - "Active" com data recente (✅ sucesso!)

---

## 📋 PARTE 6: LIMPAR REFEIÇÕES ANTIGAS

### PASSO 6.1: Ir para SQL Editor
```
Menu lateral:
├─ Table Editor
├─ SQL Editor ← CLIQUE AQUI! 👈
├─ Database
```

### PASSO 6.2: Criar nova query
1. **Clique em:** "+ New query"

### PASSO 6.3: Copiar e colar SQL
1. **Abra o arquivo:** `CORRECAO_URGENTE_CLOUD.sql`
2. **Copie TODO o conteúdo** (Ctrl + A, Ctrl + C)
3. **Cole no SQL Editor** (Ctrl + V)

### PASSO 6.4: Executar
1. **Clique em:** "Run" ou aperte `Ctrl + Enter`
2. **Aguarde terminar**
3. **Deve mostrar:** "X rows deleted"

---

## 📋 PARTE 7: GERAR NOVAS REFEIÇÕES

### PASSO 7.1: Ir para o seu app
1. **Abra nova aba**
2. **Vá para:** seu domínio do app (ex: adaptive-eats.vercel.app)

### PASSO 7.2: Ir para Admin
1. **Login** como admin
2. **Vá para:** Admin → Meal Pool

### PASSO 7.3: Gerar refeições
1. **País:** BR
2. **Tipo:** almoco
3. **Quantidade:** 10
4. **Clique em:** "Gerar Novas Refeições"

### PASSO 7.4: Verificar resultado
As novas refeições devem ter:
- ✅ "1 filé médio (120g)" em vez de "1 xícara (120g)"
- ✅ "Macarrão com Carne e Molho" (molho integrado)
- ✅ Variedade de proteínas (frango, carne, peixe)

---

## 🚨 SE ALGO DER ERRADO

### Erro no PASSO 2: "Não consigo adicionar arquivos"
- **Solução:** Use OPÇÃO C (comando F1)

### Erro no PASSO 3: "Commit falhou"
- **Solução:** Verifique se digitou a mensagem corretamente

### Erro no PASSO 4: "Push falhou"
- **Solução:** Tente "Pull" primeiro, depois "Push" novamente

### Erro no PASSO 5: "Deploy não aparece"
- **Solução:** Aguarde 2-3 minutos e atualize a página

---

## 📞 ME AVISE EM QUAL PASSO ESTÁ

Quando chegar em cada parte, me diga:
- ✅ "PARTE 1 concluída"
- ✅ "PARTE 2 concluída"
- ✅ etc...

**Assim eu sei onde você está e posso ajudar melhor! 🚀**
