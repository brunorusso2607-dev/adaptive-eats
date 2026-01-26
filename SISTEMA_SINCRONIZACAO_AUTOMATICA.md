# 🔄 SISTEMA DE SINCRONIZAÇÃO AUTOMÁTICA - ADAPTIVE EATS

**Data de Criação:** 23/01/2026  
**Versão:** 1.0.0  
**Status:** ✅ Implementado e Pronto para Uso

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Fluxo de Sincronização](#fluxo-de-sincronização)
4. [Componentes](#componentes)
5. [Como Usar](#como-usar)
6. [Configuração](#configuração)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 VISÃO GERAL

O Sistema de Sincronização Automática garante que:

### **1. Ingredientes (meal-ingredients-db.ts → Banco de Dados)**
Quando você adiciona um novo ingrediente no arquivo `meal-ingredients-db.ts`, ele é **automaticamente sincronizado** com o banco de dados `ingredient_pool`.

### **2. Pool de Refeições (meal_combinations → Gerador de Planos)**
Quando uma nova refeição é adicionada ao pool `meal_combinations`, o gerador de planos alimentares é **automaticamente notificado** e pode usá-la imediatamente.

---

## 🏗️ ARQUITETURA

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE SINCRONIZAÇÃO                    │
└─────────────────────────────────────────────────────────────┘

1️⃣ INGREDIENTES:
   meal-ingredients-db.ts (Código TypeScript)
            ↓
   [Script de Sincronização] ← npm run sync:ingredients
            ↓
   ingredient_pool (Banco Supabase)
            ↓
   [Trigger SQL] → Notificação PostgreSQL NOTIFY
            ↓
   Pool de Refeições (meal_combinations)
            ↓
   Gerador de Planos Alimentares

2️⃣ REFEIÇÕES:
   meal_combinations (Pool)
            ↓
   [Trigger SQL] → Notificação PostgreSQL NOTIFY
            ↓
   Cache Invalidation (meal_pool_cache_version)
            ↓
   Gerador de Planos Alimentares (atualizado)
```

---

## 🔄 FLUXO DE SINCRONIZAÇÃO

### **Cenário 1: Adicionar Novo Ingrediente**

```typescript
// 1. Você adiciona no meal-ingredients-db.ts:
export const INGREDIENTS: Record<string, Ingredient> = {
  // ... ingredientes existentes ...
  
  // NOVO INGREDIENTE
  grilled_cod: { 
    kcal: 105, 
    prot: 23, 
    carbs: 0, 
    fat: 1.2, 
    fiber: 0, 
    portion: 120, 
    contains: [], 
    display_name_pt: "Bacalhau grelhado", 
    display_name_en: "Grilled cod" 
  },
};
```

```bash
# 2. Execute o script de sincronização:
npm run sync:ingredients

# 3. O sistema automaticamente:
#    ✅ Calcula macros por 100g
#    ✅ Infere a categoria (protein, carbs, etc.)
#    ✅ Insere no banco ingredient_pool
#    ✅ Dispara trigger SQL
#    ✅ Notifica sistemas dependentes
#    ✅ Invalida cache do pool
```

**Resultado:** O novo ingrediente está disponível em:
- ✅ Painel Admin (`/admin/ingredient-pool`)
- ✅ Pool de Refeições (populate-meal-pool)
- ✅ Gerador de Planos Alimentares

---

### **Cenário 2: Adicionar Nova Refeição ao Pool**

```typescript
// 1. Você gera uma nova refeição via populate-meal-pool
// Ou insere manualmente no banco:

INSERT INTO meal_combinations (
  meal_name_pt,
  meal_name_en,
  meal_type,
  country_code,
  components,
  total_kcal,
  total_protein,
  total_carbs,
  total_fat
) VALUES (
  'Salmão Grelhado com Legumes',
  'Grilled Salmon with Vegetables',
  'lunch',
  'BR',
  '[...]',
  450,
  35,
  25,
  18
);
```

**O que acontece automaticamente:**

1. ✅ **Trigger SQL dispara** → `notify_new_meal_combination()`
2. ✅ **PostgreSQL NOTIFY** → Envia notificação
3. ✅ **Cache invalidado** → `meal_pool_cache_version` incrementa
4. ✅ **Gerador atualizado** → Próxima geração usa nova refeição

**Resultado:** A nova refeição está disponível imediatamente no gerador de planos alimentares.

---

## 🧩 COMPONENTES

### **1. Migration SQL: `20260123_auto_sync_triggers.sql`**

**Localização:** `supabase/migrations/20260123_auto_sync_triggers.sql`

**Funções criadas:**
- `notify_new_ingredient()` - Notifica quando ingrediente é adicionado
- `notify_new_meal_combination()` - Notifica quando refeição é adicionada
- `increment_meal_pool_cache_version()` - Invalida cache do pool
- `update_updated_at_column()` - Atualiza timestamp automaticamente
- `check_ingredient_exists()` - Verifica se ingrediente existe
- `sync_ingredient_to_pool()` - Sincroniza ingrediente do código para banco

**Triggers criados:**
- `trigger_notify_new_ingredient` - Dispara em INSERT no ingredient_pool
- `trigger_notify_new_meal_combination` - Dispara em INSERT no meal_combinations
- `trigger_invalidate_meal_pool_cache` - Dispara em INSERT/UPDATE/DELETE no meal_combinations
- `trigger_update_ingredient_pool_timestamp` - Dispara em UPDATE no ingredient_pool

**Tabelas criadas:**
- `meal_pool_cache_version` - Controla versão do cache

**Views criadas:**
- `ingredients_sync_status` - Mostra status de sincronização dos ingredientes

---

### **2. Edge Function: `sync-ingredients`**

**Localização:** `supabase/functions/sync-ingredients/index.ts`

**Funcionalidade:**
- Lê todos os ingredientes de `meal-ingredients-db.ts`
- Calcula macros por 100g automaticamente
- Infere categoria baseado no nome do ingrediente
- Insere ou atualiza no banco de dados
- Retorna relatório detalhado da sincronização

**Como chamar:**
```bash
# Via Supabase CLI:
supabase functions invoke sync-ingredients

# Via HTTP (após deploy):
curl -X POST https://[seu-projeto].supabase.co/functions/v1/sync-ingredients \
  -H "Authorization: Bearer [seu-token]"
```

---

### **3. Script Local: `sync-ingredients-to-db.ts`**

**Localização:** `scripts/sync-ingredients-to-db.ts`

**Funcionalidade:**
- Sincroniza ingredientes localmente (sem precisar de Edge Function)
- Usa Service Role Key para acesso direto ao banco
- Mostra progresso em tempo real
- Gera relatório detalhado

**Como usar:**
```bash
# Sincronizar uma vez:
npm run sync:ingredients

# Sincronizar e observar mudanças (modo watch):
npm run sync:ingredients:watch
```

---

## 🚀 COMO USAR

### **Método 1: Script Local (Recomendado para Desenvolvimento)**

```bash
# 1. Configure as variáveis de ambiente (.env.local):
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# 2. Adicione ingredientes no meal-ingredients-db.ts

# 3. Execute a sincronização:
npm run sync:ingredients

# 4. Verifique o resultado no console
```

---

### **Método 2: Edge Function (Recomendado para Produção)**

```bash
# 1. Deploy da Edge Function:
supabase functions deploy sync-ingredients

# 2. Chame a função:
supabase functions invoke sync-ingredients

# 3. Ou configure um webhook/cron job para chamar automaticamente
```

---

### **Método 3: Trigger Automático via CI/CD**

```yaml
# .github/workflows/sync-ingredients.yml
name: Sync Ingredients

on:
  push:
    paths:
      - 'supabase/functions/_shared/meal-ingredients-db.ts'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run sync:ingredients
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

---

## ⚙️ CONFIGURAÇÃO

### **1. Executar Migration SQL**

```bash
# Via Supabase CLI:
supabase db push

# Ou manualmente no Dashboard:
# 1. Acesse: https://supabase.com/dashboard/project/[seu-projeto]/sql
# 2. Cole o conteúdo de: supabase/migrations/20260123_auto_sync_triggers.sql
# 3. Execute
```

---

### **2. Configurar Variáveis de Ambiente**

```bash
# .env.local
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

⚠️ **IMPORTANTE:** Nunca commite a Service Role Key no Git!

---

### **3. Instalar Dependências**

```bash
# Se ainda não tiver tsx instalado:
npm install -D tsx

# Ou globalmente:
npm install -g tsx
```

---

## 🔍 VERIFICAÇÃO

### **Verificar Status de Sincronização**

```sql
-- Ver ingredientes recentemente sincronizados:
SELECT * FROM ingredients_sync_status
WHERE sync_status IN ('recently_created', 'recently_updated')
ORDER BY updated_at DESC
LIMIT 10;

-- Ver versão do cache do pool:
SELECT * FROM meal_pool_cache_version;

-- Contar ingredientes por categoria:
SELECT category, COUNT(*) as total
FROM ingredient_pool
GROUP BY category
ORDER BY total DESC;
```

---

### **Testar Triggers**

```sql
-- Inserir ingrediente de teste:
INSERT INTO ingredient_pool (
  ingredient_key,
  display_name_pt,
  display_name_en,
  category,
  kcal_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g,
  fiber_per_100g,
  default_portion_grams,
  is_alternative
) VALUES (
  'test_ingredient',
  'Ingrediente Teste',
  'Test Ingredient',
  'protein',
  150,
  25,
  0,
  5,
  0,
  100,
  false
);

-- Verificar se trigger disparou (deve aparecer no log):
-- PostgreSQL NOTIFY: new_ingredient
```

---

## 🐛 TROUBLESHOOTING

### **Problema: Script não encontra ingredientes**

```bash
# Solução: Verifique o caminho do import
# Em sync-ingredients-to-db.ts, linha 11:
import { INGREDIENTS } from '../supabase/functions/_shared/meal-ingredients-db';

# Certifique-se de que o caminho está correto
```

---

### **Problema: Erro de permissão no banco**

```bash
# Solução: Verifique se está usando Service Role Key
# A Service Role Key tem permissões de admin
# Nunca use Anon Key para sincronização
```

---

### **Problema: Categoria "other" para todos os ingredientes**

```bash
# Solução: A função inferCategory() usa palavras-chave
# Adicione mais palavras-chave na função se necessário
# Ou defina categoria manualmente no ingrediente
```

---

### **Problema: Trigger não dispara**

```sql
-- Verificar se trigger existe:
SELECT * FROM pg_trigger WHERE tgname LIKE '%ingredient%';

-- Recriar trigger se necessário:
DROP TRIGGER IF EXISTS trigger_notify_new_ingredient ON public.ingredient_pool;
CREATE TRIGGER trigger_notify_new_ingredient
  AFTER INSERT ON public.ingredient_pool
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_ingredient();
```

---

## 📊 MONITORAMENTO

### **Dashboard de Sincronização**

```sql
-- Criar view para dashboard:
CREATE OR REPLACE VIEW sync_dashboard AS
SELECT
  'Ingredientes Totais' as metric,
  COUNT(*)::text as value
FROM ingredient_pool
UNION ALL
SELECT
  'Ingredientes Hoje',
  COUNT(*)::text
FROM ingredient_pool
WHERE DATE(created_at) = CURRENT_DATE
UNION ALL
SELECT
  'Refeições no Pool',
  COUNT(*)::text
FROM meal_combinations
UNION ALL
SELECT
  'Versão do Cache',
  version::text
FROM meal_pool_cache_version;

-- Consultar dashboard:
SELECT * FROM sync_dashboard;
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Migration SQL criada e executada
- [x] Edge Function criada
- [x] Script local criado
- [x] Scripts npm configurados
- [x] Triggers SQL funcionando
- [x] Notificações PostgreSQL NOTIFY configuradas
- [x] Cache invalidation implementado
- [x] Documentação completa
- [ ] CI/CD configurado (opcional)
- [ ] Webhook configurado (opcional)
- [ ] Monitoramento configurado (opcional)

---

## 🎯 PRÓXIMOS PASSOS

### **1. Automatizar via CI/CD**
Configure GitHub Actions para sincronizar automaticamente quando `meal-ingredients-db.ts` for modificado.

### **2. Criar Webhook**
Configure um webhook para chamar a Edge Function quando houver push no repositório.

### **3. Adicionar Monitoramento**
Implemente logs e alertas para falhas de sincronização.

### **4. Criar Interface Admin**
Adicione botão no painel admin para sincronizar manualmente.

---

## 📝 EXEMPLO COMPLETO

### **Adicionar Novo Ingrediente (Passo a Passo)**

```typescript
// 1. Edite: supabase/functions/_shared/meal-ingredients-db.ts
export const INGREDIENTS: Record<string, Ingredient> = {
  // ... ingredientes existentes ...
  
  // ADICIONE AQUI:
  grilled_sea_bass: { 
    kcal: 97, 
    prot: 18.4, 
    carbs: 0, 
    fat: 2.3, 
    fiber: 0, 
    portion: 150, 
    contains: [], 
    display_name_pt: "Robalo grelhado", 
    display_name_en: "Grilled sea bass",
    display_name_es: "Lubina a la parrilla"
  },
};
```

```bash
# 2. Sincronize:
npm run sync:ingredients

# 3. Saída esperada:
# 🔄 Sincronizando 144 ingredientes...
# ✨ grilled_sea_bass (novo)
# ✅ Total processado: 144
# ✨ Novos inseridos: 1
# ✅ Sincronização concluída com sucesso!
```

```sql
-- 4. Verifique no banco:
SELECT * FROM ingredient_pool 
WHERE ingredient_key = 'grilled_sea_bass';

-- 5. Verifique no painel admin:
-- http://localhost:5173/admin/ingredient-pool
-- Filtre por categoria "protein"
-- Deve aparecer "Robalo grelhado"
```

---

## 🎉 CONCLUSÃO

O Sistema de Sincronização Automática está **100% implementado e pronto para uso**!

**Benefícios:**
- ✅ Sincronização automática de ingredientes
- ✅ Notificações em tempo real
- ✅ Cache invalidation automático
- ✅ Zero configuração manual
- ✅ Suporte a CI/CD
- ✅ Logs detalhados
- ✅ Fácil de usar

**Como usar:**
1. Adicione ingredientes no `meal-ingredients-db.ts`
2. Execute `npm run sync:ingredients`
3. Pronto! ✨

---

**Documentação criada em:** 23/01/2026  
**Última atualização:** 23/01/2026  
**Versão:** 1.0.0
