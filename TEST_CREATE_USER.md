# 🧪 TESTE DE CRIAÇÃO DE USUÁRIO

Criei uma função de teste simplificada para identificar o erro exato na criação de usuários.

## 📋 Como Testar

Execute no console do navegador (F12):

```javascript
const response = await fetch('https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/test-create-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'test.novo.usuario@gmail.com'
  })
});

const data = await response.json();
console.log(data);
```

## 🔍 O que verificar

1. Se retornar **sucesso**: O problema está em outra parte da função `activate-account`
2. Se retornar **erro**: O erro exato será mostrado no console e nos logs

## 📊 Logs

Acesse os logs em:
https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/functions

Clique em `test-create-user` e veja os logs detalhados.

## ✅ Próximos Passos

Após executar o teste, me mostre:
1. O resultado no console do navegador
2. Os logs da função no Supabase

Com isso vou identificar o erro exato e corrigir de uma vez.
