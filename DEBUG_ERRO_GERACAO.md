# DEBUG: ERRO REAL NA GERAÇÃO

## 🔴 ERRO MOSTRADO NA TELA:
**"Failed to send a request to the Edge Function"**

## 🔍 POSSÍVEIS CAUSAS:

### **1. Timeout da função (mais provável)**
- Função está demorando mais de 60 segundos
- Supabase Edge Functions têm timeout de 60s
- Com 1000 tentativas (quantity * 50), pode estar demorando muito

### **2. Erro de memória**
- Gerando muitas combinações na memória
- Pode estar excedendo limite de memória da Edge Function

### **3. Erro não tratado no código**
- Alguma exception não está sendo capturada
- Função crashando sem retornar erro

---

## 🎯 SOLUÇÃO IMEDIATA:

Vou adicionar **timeout protection** e **logs detalhados** para identificar onde trava:

```typescript
// Adicionar timeout máximo de 50 segundos
const startTime = Date.now();
const MAX_EXECUTION_TIME = 50000; // 50 segundos

while (meals.length < quantity && attempts < maxAttempts) {
  // Verificar timeout
  if (Date.now() - startTime > MAX_EXECUTION_TIME) {
    console.warn(`Timeout: Geradas ${meals.length} de ${quantity} refeições`);
    break; // Parar e retornar o que conseguiu
  }
  
  attempts++;
  // ... resto do código
}
```

---

## 📊 DIAGNÓSTICO:

**Problema:** Com `maxAttempts = quantity * 50 = 1000`, o loop pode demorar muito se as validações rejeitarem muitas refeições.

**Exemplo:**
- Tentativas: 1000
- Taxa de rejeição: 95%
- Refeições geradas: 50
- Tempo: ~60+ segundos ❌ TIMEOUT

---

Vou implementar a correção agora.
