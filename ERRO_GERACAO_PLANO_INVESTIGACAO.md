# INVESTIGAÇÃO: ERRO AO GERAR PLANO ALIMENTAR

## 🔴 PROBLEMA
- **Erro:** "Edge Function returned a non-2xx status code"
- **Quando:** Ao tentar gerar plano alimentar
- **Status:** Persiste mesmo após reversão do código

## 📊 CRONOLOGIA

1. **22/01/2026 22:36** - Modifiquei `expandGenericMealName` para incluir todos os componentes no nome
2. **22/01/2026 22:42** - Usuário reportou erro ao gerar plano
3. **22/01/2026 22:45** - Reverti mudança, mas erro persiste
4. **22/01/2026 22:47** - Investigando causa real

## 🔍 HIPÓTESES

### Hipótese 1: Problema com API do Gemini
- Chave API expirada ou inválida
- Limite de requisições excedido
- Mudança na API do Gemini

### Hipótese 2: Problema com Banco de Dados
- Erro ao buscar perfil do usuário
- Erro ao salvar meal_plan_items
- Problema com constraints ou validações

### Hipótese 3: Problema com Código (não relacionado à minha mudança)
- Erro em outra parte do código
- Problema com imports ou dependências
- Timeout na função

### Hipótese 4: Problema de Configuração
- Variáveis de ambiente faltando
- Permissões do Supabase
- Configuração da edge function

## 🧪 PRÓXIMOS PASSOS

1. **Acessar logs da edge function:**
   - Dashboard: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/functions
   - Verificar logs de erro específicos
   - Identificar linha exata que está falhando

2. **Verificar variáveis de ambiente:**
   - GEMINI_API_KEY
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY

3. **Testar edge function localmente:**
   - `supabase functions serve`
   - Chamar função com payload de teste
   - Ver erro detalhado no terminal

4. **Verificar banco de dados:**
   - Estrutura da tabela `profiles`
   - Estrutura da tabela `meal_plans`
   - Constraints e validações

## 📝 LOGS PARA VERIFICAR

```
[AI-MEAL-PLAN] AI Meal Plan Generator - Hybrid Mode (Simple + Smart)
[AI-MEAL-PLAN] User authenticated - { userId: "..." }
[AI-MEAL-PLAN] Request params - { ... }
[AI-MEAL-PLAN] Profile error: ... ← POSSÍVEL ERRO AQUI
```

## 🎯 AÇÃO IMEDIATA

**USUÁRIO:** Por favor, acesse o Supabase Dashboard e verifique os logs:
1. Vá para: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/functions
2. Clique em "generate-ai-meal-plan"
3. Vá na aba "Logs"
4. Procure pelo erro mais recente
5. Me envie um screenshot ou copie a mensagem de erro completa

Isso vai me permitir identificar exatamente onde e por que a função está falhando.

---

**Última atualização:** 22/01/2026 22:47
