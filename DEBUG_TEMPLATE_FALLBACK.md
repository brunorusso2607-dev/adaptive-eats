# 🔍 DEBUG: Template Fallback Não Funciona

## Problema
Sexta-feira (23/01) ainda mostra "Nenhuma receita definida" para todas as refeições.

## O Que Deveria Acontecer

```
1. Pool não tem refeições suficientes
   ↓
2. Sistema tenta Template Builder
   ↓
3. buildMealFromTemplate() gera refeições
   ↓
4. Dia completo com POOL + TEMPLATES
```

## O Que Pode Estar Errado

### Hipótese 1: Templates Não Estão Sendo Chamados
**Verificar logs:**
- Procurar por: `🏗️ Using Template Builder`
- Se NÃO aparecer → Pool está retornando antes

### Hipótese 2: buildMealFromTemplate() Retorna Null
**Possíveis causas:**
- `getCulturalTemplates()` retorna vazio
- Mapeamento de `meal_type` errado
- Ingredientes não encontrados no UNIVERSAL_INGREDIENTS

**Verificar logs:**
- Procurar por: `No templates found for`
- Procurar por: `Template meal generated`

### Hipótese 3: Erro Silencioso no Try/Catch
**Verificar logs:**
- Procurar por: `⚠️ Template builder failed`
- Ver mensagem de erro

### Hipótese 4: Conversão de TemplateMeal para SimpleMeal Falha
**Possíveis causas:**
- Divisão por zero (ing.grams = 0)
- Campos faltando

## Como Debugar

### Passo 1: Abrir Logs do Supabase
1. Ir para: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/logs/edge-functions
2. Filtrar por: `generate-ai-meal-plan`
3. Procurar logs da última execução

### Passo 2: Procurar Mensagens Chave

**Se encontrar:**
```
✅ Day 5 100% from POOL
```
→ Pool está retornando dias completos (improvável)

**Se encontrar:**
```
🔄 Day 5: Pool=2, Missing=3
```
→ Sistema detectou refeições faltantes ✅

**Se encontrar:**
```
🏗️ Using Template Builder for missing meals on day 5
```
→ Template Builder foi chamado ✅

**Se encontrar:**
```
✅ Template meal generated: Pão Integral com Ovo
```
→ Template gerou refeição ✅

**Se encontrar:**
```
✅ Day 5 completed with POOL + TEMPLATES
```
→ Dia foi completado com sucesso ✅

**Se NÃO encontrar nenhuma dessas:**
→ Sistema está falhando silenciosamente

### Passo 3: Verificar Erros

**Procurar por:**
- `⚠️ Template builder failed`
- `No templates found for`
- `Error`
- `undefined`
- `null`

## Soluções Possíveis

### Se: "No templates found for BR_breakfast"
**Causa:** Mapeamento de meal_type errado
**Solução:** Verificar se MEAL_TYPE_MAP está correto

### Se: "Cannot read property 'name' of undefined"
**Causa:** Ingrediente não existe no UNIVERSAL_INGREDIENTS
**Solução:** Adicionar ingredientes faltantes ao mapeamento

### Se: "Division by zero"
**Causa:** ing.grams = 0
**Solução:** Adicionar validação antes da divisão

### Se: Nenhum log aparece
**Causa:** Edge Function não está sendo chamada ou falha antes
**Solução:** Verificar se função foi deployada corretamente

## Teste Manual

Execute este código no console do navegador:
```javascript
// Testar buildMealFromTemplate diretamente
const { data, error } = await supabase.functions.invoke('generate-ai-meal-plan', {
  body: {
    dailyCalories: 2000,
    daysCount: 1,
    saveToDatabase: false
  }
});

console.log('Result:', data);
console.log('Error:', error);
```

## Próximos Passos

1. **Verificar logs do Supabase** (mais importante)
2. Se logs mostram erro específico → corrigir
3. Se logs não mostram nada → adicionar mais logs
4. Se logs mostram sucesso mas UI não mostra → problema no frontend

## Informações Necessárias

Por favor, forneça:
1. Screenshot dos logs do Supabase Edge Functions
2. Mensagem de erro específica (se houver)
3. Última linha de log que aparece antes de falhar
