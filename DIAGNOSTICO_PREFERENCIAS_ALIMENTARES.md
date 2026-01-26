# 🔍 DIAGNÓSTICO: PREFERÊNCIAS ALIMENTARES NÃO APARECEM NO PAINEL

**Data:** 18 de Janeiro de 2026  
**Problema:** Apenas 3 preferências aparecem no painel (devem ser 7)

---

## 🚨 CAUSA RAIZ IDENTIFICADA

**Supabase Local NÃO está rodando**

```
Tentativa de iniciar: npx supabase start
Resultado: ERRO na migration
Status: Containers não iniciaram corretamente
```

---

## ✅ FALLBACK FUNCIONANDO CORRETAMENTE

**Arquivo:** `src/hooks/useOnboardingOptions.tsx` (linhas 67-74)

O código já tem um **fallback completo** com todas as 7 preferências:

```typescript
dietary_preferences: [
  { id: "31", option_id: "omnivore", label: "Comum", ... },
  { id: "32", option_id: "vegetarian", label: "Vegetariana", ... },
  { id: "33", option_id: "vegan", label: "Vegana", ... },
  { id: "34", option_id: "low_carb", label: "Low Carb", ... },
  { id: "35", option_id: "pescatarian", label: "Pescetariana", ... },
  { id: "36", option_id: "keto", label: "Cetogênica", ... },
  { id: "37", option_id: "flexitarian", label: "Flexitariana", ... },
]
```

---

## 🔍 POR QUE APENAS 3 APARECEM?

**Hipótese 1:** Cache do navegador
- O navegador pode estar usando dados antigos em cache

**Hipótese 2:** Query React Query não atualizou
- `staleTime: 1000 * 60 * 5` (5 minutos)
- Dados podem estar "stale"

**Hipótese 3:** Banco de dados tem apenas 3 registros
- Seed não foi executado corretamente
- Apenas omnivore, vegetarian, vegan foram inseridos

---

## 🛠️ SOLUÇÕES IMEDIATAS

### Solução 1: Limpar Cache do Navegador (RÁPIDO)

1. Abrir DevTools (F12)
2. Ir em Application → Storage
3. Clicar em "Clear site data"
4. Recarregar página (Ctrl+Shift+R)

### Solução 2: Forçar Refetch do React Query (RÁPIDO)

No console do navegador:
```javascript
// Invalidar cache do React Query
window.localStorage.clear();
location.reload();
```

### Solução 3: Reiniciar Supabase Local (MÉDIO)

```bash
# Parar tudo
npx supabase stop

# Limpar volumes
docker volume prune -f

# Iniciar novamente
npx supabase start

# Executar seed
npx supabase db reset
```

### Solução 4: Usar Supabase Cloud (IMEDIATO)

Se o Supabase local não funcionar, conectar ao Supabase Cloud:
- Dados já estão lá
- Sem necessidade de seed local

---

## 📊 VERIFICAÇÃO NO BANCO

Para verificar quantas preferências existem no banco:

```sql
SELECT * FROM onboarding_options 
WHERE category = 'dietary_preferences' 
AND is_active = true 
ORDER BY sort_order;
```

**Esperado:** 7 registros  
**Se retornar menos:** Seed não foi executado

---

## 🎯 RECOMENDAÇÃO

**OPÇÃO MAIS RÁPIDA:** Limpar cache do navegador

1. F12 → Application → Clear site data
2. Ctrl+Shift+R para recarregar
3. Verificar se as 7 preferências aparecem

Se não funcionar:
- Verificar se está conectado ao Supabase Cloud
- Ou reiniciar Supabase local completamente

---

## 📝 NOTAS TÉCNICAS

**Fluxo de dados:**
```
1. useOnboardingOptions() faz query ao Supabase
2. Se erro → usa FALLBACK_OPTIONS (7 preferências)
3. Se sucesso mas vazio → usa FALLBACK_OPTIONS
4. Se sucesso com dados → usa dados do banco
```

**O fallback está correto**, então o problema é:
- Dados não estão chegando do banco
- OU cache está mostrando dados antigos

---

**Status:** Aguardando ação do usuário (limpar cache)
