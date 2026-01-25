# INSTRUÇÕES PARA DEBUG URGENTE

## 🔴 PROBLEMA
Edge function retorna "non-2xx status code" mas não consigo ver o erro real nos logs do Supabase.

## 🎯 AÇÃO NECESSÁRIA - AGORA

**Abra o Console do Navegador (F12) e siga estes passos:**

### 1. Abra o Console
- Pressione **F12** no navegador
- Vá na aba **Console**
- Limpe o console (ícone 🚫 ou Ctrl+L)

### 2. Abra a aba Network
- Vá na aba **Network** (Rede)
- Marque a opção **Preserve log** (Preservar log)

### 3. Tente Gerar o Plano
- Clique em "Gerar Plano Alimentar"
- Aguarde o erro aparecer

### 4. Capture as Informações
No **Console**, procure por:
- Mensagens de erro em vermelho
- Stack traces
- Logs que começam com `[MealPlanGenerator]`

Na aba **Network**, procure por:
- Requisição para `generate-ai-meal-plan`
- Clique nela
- Vá na aba **Response** (Resposta)
- **COPIE TODO O CONTEÚDO DA RESPOSTA**

### 5. Me Envie
- Screenshot do Console com os erros
- Screenshot da aba Network > Response
- Ou copie e cole o texto completo dos erros

---

## 🔍 O QUE ESTOU PROCURANDO

Preciso ver:
1. **Status code exato** (500? 400? 401? 403?)
2. **Mensagem de erro completa** da edge function
3. **Stack trace** se houver
4. **Corpo da resposta** (response body)

Sem essas informações, estou trabalhando às cegas e não consigo corrigir o problema.

---

## ⏰ URGENTE

Isso vai levar 2 minutos e vai me permitir identificar e corrigir o problema imediatamente.

**Por favor, faça isso agora e me envie os resultados.**
