# ReceitAI - Módulos Protegidos

## ⚠️ ATENÇÃO: Este arquivo lista módulos CRÍTICOS que NÃO devem ser alterados sem:
1. Motivo explícito do usuário
2. Execução de `run-regression-tests` após a mudança
3. Validação manual das funcionalidades afetadas

---

## 🔒 Módulos Protegidos

### 1. Pool de Alimentos (`foods` table)
**Funcionalidades dependentes:**
- Busca de alimentos no FoodSearchPanel
- Registro de refeições via foto
- Cálculo de macros
- Sugestões de ingredientes

**Regras:**
- ❌ NUNCA remover alimentos sem backup
- ❌ NUNCA alterar estrutura de colunas sem migração
- ✅ Apenas ADICIONAR novos alimentos

---

### 2. Criação de Plano Alimentar
**Arquivos críticos:**
- `supabase/functions/generate-ai-meal-plan/index.ts`
- `supabase/functions/_shared/mealGenerationConfig.ts`
- `src/components/MealPlanGenerator.tsx`

**Funcionalidades dependentes:**
- Geração de cardápio semanal
- Cálculo de calorias por estratégia
- Respeito a intolerâncias

**Regras:**
- ❌ NUNCA alterar lógica de criação sem testar fluxo completo
- ❌ NUNCA modificar estrutura de `meal_plans` ou `meal_plan_items`
- ✅ Mudanças em prompts devem preservar formato de saída

---

### 3. Sistema de Segurança Alimentar
**Arquivos críticos:**
- `supabase/functions/_shared/globalSafetyEngine.ts`
- `supabase/functions/_shared/mealGenerationConfig.ts` (validateFood)
- Tabelas: `intolerance_mappings`, `dietary_forbidden_ingredients`

**Regras:**
- ❌ NUNCA adicionar listas hardcoded
- ❌ NUNCA reduzir limite de query abaixo de 5000
- ✅ Sempre usar banco de dados como fonte
- ✅ Executar `test-security-validation` após mudanças

---

### 4. Filtros e Busca de Alimentos
**Arquivos críticos:**
- `src/components/FoodSearchPanel.tsx`
- `src/components/FoodSearchDrawer.tsx`
- `src/hooks/useFoodsSearch.tsx`

**Funcionalidades dependentes:**
- Busca por nome
- Filtro por categoria
- Autocomplete

**Regras:**
- ❌ NUNCA alterar query de busca sem testar
- ❌ NUNCA remover campos de filtro existentes
- ✅ Mudanças de UI não devem afetar lógica de query

---

### 5. Onboarding Options
**Tabela:** `onboarding_options`
**Hook:** `src/hooks/useOnboardingOptions.tsx`

**Funcionalidades dependentes:**
- Seleção de intolerâncias no onboarding
- Seleção de objetivos
- Exibição no perfil do usuário

**Regras:**
- ❌ NUNCA remover opções ativas sem desativar primeiro
- ❌ NUNCA alterar `option_id` de opções existentes
- ✅ Novas opções devem seguir padrão existente

---

### 6. Horários de Refeição
**Tabela:** `meal_time_settings`
**Hook:** `src/hooks/useMealTimeSettings.tsx`

**Funcionalidades dependentes:**
- Determinação de refeição atual
- Próxima refeição no dashboard
- Lembretes de refeição

**Regras:**
- ❌ NUNCA remover tipos de refeição padrão
- ❌ NUNCA alterar `meal_type` keys existentes
- ✅ Mudanças de horário são seguras

---

### 7. Registro de Consumo
**Tabelas:** `meal_consumption`, `consumption_items`
**Componentes:** `MealRegistrationFlow`, `FreeFormMealLogger`

**Funcionalidades dependentes:**
- Histórico de refeições
- Cálculo de calorias diárias
- Gráficos de progresso

**Regras:**
- ❌ NUNCA alterar estrutura sem migração
- ❌ NUNCA remover campos usados em cálculos
- ✅ Novos campos devem ser nullable

---

## 🧪 Comando de Validação

Antes de fazer deploy de mudanças em módulos protegidos:

```bash
# Executar testes de regressão
curl -X POST https://upnqkxrvtimtlqsuuvci.supabase.co/functions/v1/run-regression-tests

# Executar testes de segurança
curl -X POST https://upnqkxrvtimtlqsuuvci.supabase.co/functions/v1/test-security-validation
```

---

## 📋 Checklist Antes de Alterar Módulo Protegido

- [ ] Usuário pediu explicitamente a mudança?
- [ ] Entendo quais funcionalidades dependem deste módulo?
- [ ] Fiz backup/snapshot do estado atual?
- [ ] Executei testes de regressão antes da mudança?
- [ ] Executei testes de regressão depois da mudança?
- [ ] Testei manualmente as funcionalidades afetadas?

---

## 🔄 Histórico de Regressões (Para Referência)

### 2024-12-30: Query Limit Bug
- **Módulo afetado:** Food Safety
- **Causa:** Query com limit padrão de 1000 não carregava todos os ingredientes
- **Solução:** Aumentar limit para 5000
- **Prevenção:** Documentado em ARCHITECTURE.md

### 2024-12-30: False Positive "feijao"
- **Módulo afetado:** Vegan validation
- **Causa:** Termo genérico "ei" em lista de ovos bloqueava "feijao"
- **Solução:** Remover termos muito curtos das listas hardcoded
- **Prevenção:** Usar apenas banco de dados, não listas hardcoded
