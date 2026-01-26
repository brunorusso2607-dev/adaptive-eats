# 🧪 Teste Direto da Edge Function

## Execute no Console do Navegador

Abra o console do navegador (F12) na página do Adaptive Eats e execute:

```javascript
// Teste simples: gerar 1 dia
const testeSimples = async () => {
  console.log('🚀 Iniciando teste...');
  
  const { data, error } = await supabase.functions.invoke('generate-ai-meal-plan', {
    body: {
      daysCount: 3,
      planName: 'Teste Debug',
      startDate: '2026-01-20',
      optionsPerMeal: 1
    }
  });
  
  console.log('✅ Resultado:', { data, error });
  
  if (error) {
    console.error('❌ Erro:', error);
  }
  
  if (data) {
    console.log('📊 Dados recebidos:', data);
  }
};

testeSimples();
```

## O Que Verificar

1. **Se der erro de timeout:**
   - Edge Function está demorando muito
   - Pode estar travando em algum ponto

2. **Se der erro 401/403:**
   - Problema de autenticação
   - Verificar se usuário está logado

3. **Se der erro 500:**
   - Erro interno na Edge Function
   - Verificar logs do Supabase

4. **Se retornar sucesso:**
   - Verificar quantos `meal_plan_items` foram criados
   - Deveria criar 18 items (3 dias × 6 refeições)

## Depois de Executar

Me envie:
1. Screenshot do console mostrando o resultado
2. Screenshot dos logs do Supabase mostrando as últimas linhas
