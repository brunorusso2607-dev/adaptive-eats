# 🧪 Teste do Template Builder

## Teste Rápido

Abra o console do navegador na página do Adaptive Eats e execute:

```javascript
// Testar se buildMealFromTemplate funciona
const testTemplate = async () => {
  const { data, error } = await supabase.functions.invoke('lookup-ingredient', {
    body: {
      query: 'pão',
      searchByCategory: false,
      limit: 5,
      country: 'BR'
    }
  });
  
  console.log('Teste lookup-ingredient:', { data, error });
};

testTemplate();
```

## Se Der Erro

Copie e cole aqui o erro completo para eu analisar.

## Verificação Crítica

O problema pode ser que os ingredientes do mapeamento não existem no UNIVERSAL_INGREDIENTS.

Verifique se estes ingredientes existem:
- `whole_wheat_bread` (pão integral)
- `scrambled_eggs` (ovo mexido)
- `banana` (banana)
- `natural_yogurt` (iogurte natural)

Se NÃO existirem, o `buildMealFromTemplate` vai retornar `null`.

## Solução Temporária

Enquanto isso, vou verificar quais ingredientes realmente existem no UNIVERSAL_INGREDIENTS e ajustar o mapeamento.
