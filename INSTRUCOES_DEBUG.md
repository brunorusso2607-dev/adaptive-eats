# Como Debugar o Erro

## 1. Acesse os Logs do Supabase

https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/logs/edge-functions

## 2. Filtre por "generate-ai-meal-plan"

## 3. Procure pelo erro mais recente

Você verá algo como:
- Status code: 500, 400, etc
- Mensagem de erro específica
- Stack trace

## 4. Me envie:

- O **status code** exato
- A **mensagem de erro** completa
- Qualquer **stack trace** que aparecer

---

## Alternativa: Teste Direto

Use a página de teste que criei:
http://localhost:5173/test-edge-function

Clique no botão e veja se aparece algum erro mais detalhado na tela.

---

## O Que Eu Preciso Saber:

1. Qual é a mensagem de erro EXATA?
2. Em que ponto do código está falhando?
3. Qual parâmetro está causando o problema?

**Sem essas informações, estou "atirando no escuro" e causando mais problemas.**
