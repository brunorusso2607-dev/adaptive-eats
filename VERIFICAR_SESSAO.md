# 🔍 Verificar Sessão do Usuário

## Faça o seguinte no navegador (porta 8080):

1. Abra o **DevTools** (F12)
2. Vá para a aba **Console**
3. Cole e execute este código:

```javascript
// Verificar se está logado
const { data: { session } } = await window.supabase.auth.getSession();
console.log('Session:', session);
console.log('User:', session?.user);
console.log('Token válido até:', new Date(session?.expires_at * 1000));
```

## O que verificar:

- **Se `session` for `null`**: Você não está logado → Faça login novamente
- **Se `expires_at` já passou**: Token expirou → Faça logout e login novamente
- **Se `session` existe e token válido**: O problema é na função

**Me envie o resultado do console!**
