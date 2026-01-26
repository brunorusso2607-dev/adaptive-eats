# 🍽️ ROADMAP - NutriTrack v2.0

> **Visão:** Transformar o app de um gerador de receitas para um **acompanhamento alimentar completo**, flexível para usuários com ou sem plano alimentar.

---

## 📊 Status Geral

| Fase | Status | Progresso |
|------|--------|-----------|
| FASE 1: Preparação Banco | ✅ Concluída | 100% |
| FASE 2: Features Principais | 🔄 Em andamento | 85% |
| FASE 3: Reorganização UI | ⏳ Pendente | 0% |
| FASE 4: Reestruturação Planos | ✅ Concluída | 100% |

**Última atualização:** 27/12/2024

---

## 🎯 Visão Geral do Projeto

### Problema Identificado
- Usuários que não seguem o plano alimentar tendem a abandonar o app
- O app era focado em receitas, mas deveria ser focado em **acompanhamento alimentar**
- Faltava flexibilidade para registrar refeições "livres"

### Solução Proposta
1. **Registro Livre**: Permitir que usuários registrem o que comeram sem precisar de plano
2. **Foto → Refeição**: Integrar análise de foto com registro de consumo
3. **Flexibilidade**: Usuário decide horários e pode adicionar refeições extras
4. **Simplificação**: Trocar refeição completa ao invés de ingredientes individuais

### Princípios de Desenvolvimento
- ✅ **Centralizado**: Usar `meal_consumption` como tabela central
- ✅ **Sem duplicação**: Campos opcionais, não tabelas novas desnecessárias
- ✅ **Retrocompatível**: Não quebrar funcionalidades existentes

---

## 📦 FASE 1: Preparação do Banco de Dados ✅

**Objetivo:** Preparar a estrutura do banco antes de desenvolver features

### 1.1 Adicionar campos em `meal_consumption`
- [x] Campo `source_type` (text, default: 'plan') - origem: plan, photo, manual, extra
- [x] Campo `custom_meal_name` (text, nullable) - para refeições personalizadas
- [x] Campo `meal_time` (time, nullable) - horário escolhido pelo usuário

**SQL Executado:**
```sql
ALTER TABLE public.meal_consumption 
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'plan',
ADD COLUMN IF NOT EXISTS custom_meal_name text,
ADD COLUMN IF NOT EXISTS meal_time time;
```

### 1.2 Criar tabela `user_meal_time_preferences` (opcional)
- [ ] Tabela para horários personalizados por usuário (será feito na FASE 2.4 se necessário)

**Notas técnicas:**
- Campos são opcionais (nullable) para não quebrar registros existentes
- `source_type` diferencia origem do registro para analytics

**Status:** ✅ Concluída  
**Data conclusão:** 27/12/2024

---

## 📦 FASE 2: Features Principais

### 2.1 Módulo "Registro Livre de Refeições" ✅
**Objetivo:** Permitir registro manual de refeições sem depender de plano alimentar

#### Sub-tarefas:
- [x] Criar componente `FreeFormMealLogger.tsx`
- [x] Interface para buscar/selecionar alimentos (reutiliza lógica do FoodSearchDrawer)
- [x] Seletor de tipo de refeição (café, almoço, etc.)
- [x] Seletor de horário
- [x] Salvar em `meal_consumption` com `source_type = 'manual'`
- [x] Suporte a sugestões de IA quando alimento não encontrado
- [x] Adicionar card "Registrar Refeição" no Dashboard

**Fluxo do usuário:**
```
Dashboard → "Registrar Refeição" → Buscar alimento → 
Selecionar tipo → Confirmar horário → Salvo ✓
```

**Componente criado:** `src/components/FreeFormMealLogger.tsx`
- Fluxo em 3 passos: alimentos → tipo → horário
- Integração com busca de alimentos e IA
- Validação de intolerâncias
- Nome personalizado opcional

**Status:** ✅ Concluída  
**Data conclusão:** 27/12/2024

---

### 2.2 Foto do Prato → Registrar Refeição ✅
**Objetivo:** Após analisar foto, perguntar se quer registrar como refeição

#### Sub-tarefas:
- [x] Adicionar botão fixo no `FoodPhotoAnalyzer` após análise
- [x] Modal/Dialog "Registrar esta refeição?"
- [x] Seletor de tipo de refeição
- [x] Seletor de horário (default: agora)
- [x] Salvar em `meal_consumption` com `source_type = 'photo'`
- [x] Vincular dados nutricionais da análise

**Fluxo do usuário:**
```
Tirar foto → Análise IA → "Registrar como refeição?" → 
Sim → Qual refeição? → Horário → Salvo ✓
```

**Componente criado:** `src/components/RegisterMealFromPhotoSheet.tsx`
- Sheet com 2 passos: tipo de refeição → horário
- Exibe resumo dos macros da foto analisada
- Salva em `meal_consumption` com `source_type = 'photo'`
- Salva itens individuais em `consumption_items`

**Status:** ✅ Concluída  
**Data conclusão:** 27/12/2024

---

### 2.6 Unificação do Fluxo de Registro ✅ (NOVO)
**Objetivo:** Padronizar comportamento entre módulo de foto e módulo manual

#### Problema identificado:
- Módulo de foto e módulo manual tinham comportamentos inconsistentes nos passos finais
- Código duplicado para seleção de tipo de refeição e horário
- UX inconsistente para o usuário

#### Solução implementada:
- [x] Criar componente reutilizável `MealRegistrationFlow.tsx`
- [x] Centralizar lógica de "Qual refeição?" + "Que horas foi?" + detecção de duplicatas
- [x] Refatorar `RegisterMealFromPhotoSheet.tsx` para usar o componente
- [x] Refatorar `FreeFormMealLogger.tsx` para usar o componente

**Componente criado:** `src/components/MealRegistrationFlow.tsx`

**Arquitetura:**
```
MealRegistrationFlow (reutilizável)
├── Props: mealData, items, sourceType, onSuccess, onBack
├── Passo 1: "Qual refeição?" (5 tipos + refeição personalizada)
├── Passo 2: "Que horas foi?" (input de horário)
├── Detecção de duplicatas (alertDialog)
└── Salvamento unificado em meal_consumption

Módulo Foto (RegisterMealFromPhotoSheet)
└── Converte FoodAnalysis → MealData + Items
    └── Passa para MealRegistrationFlow

Módulo Manual (FreeFormMealLogger)
└── Passo 1: Busca e seleção de alimentos
    └── Passa para MealRegistrationFlow
```

**Benefícios:**
- ✅ Código DRY (Don't Repeat Yourself)
- ✅ UX 100% consistente entre módulos
- ✅ Manutenção simplificada
- ✅ Fácil adicionar novos módulos no futuro

**Status:** ✅ Concluída  
**Data conclusão:** 27/12/2024

---

### 2.3 Remover Edição de Ingredientes do NextMealCard ✅
**Objetivo:** Simplificar o card da Home removendo opção de trocar ingredientes

#### Justificativa:
- Com o módulo de registro manual implementado (2.1), usuários podem registrar o que realmente comeram
- Não faz mais sentido permitir edição de ingredientes diretamente no card
- Refeição do plano na Home = apenas visualização

#### Sub-tarefas:
- [x] Remover botão "Trocar" do NextMealCard
- [x] Remover FoodSearchDrawer do componente
- [x] Ajustar fluxo de "comi diferente" para orientar uso do módulo manual

**Status:** ✅ Concluída  
**Data conclusão:** 27/12/2024

---

### 2.4 Horários Personalizados por Usuário
**Objetivo:** Permitir que usuário defina seus próprios horários de refeição

#### Sub-tarefas:
- [ ] Criar tabela `user_meal_time_preferences` (se não feito na FASE 1)
- [ ] Criar componente `MealTimePreferences.tsx` em Settings/Perfil
- [ ] Interface para editar horários de cada refeição
- [ ] Lógica de fallback: user prefs → global settings
- [ ] Atualizar hooks que usam horários (`usePendingMeals`, `useNextMeal`, etc.)

**Fluxo do usuário:**
```
Perfil → Horários de Refeição → Editar → Salvar
```

**Status:** ⏳ Pendente  
**Estimativa:** 1 sessão  
**Data conclusão:** -

---

### 2.5 Adicionar Refeição Extra ao Plano
**Objetivo:** Permitir adicionar refeição "avulsa" no dia sem alterar plano global

#### Sub-tarefas:
- [ ] Botão "Nova Refeição" no calendário do plano
- [ ] Modal para nome personalizado da refeição
- [ ] Buscar/selecionar alimentos
- [ ] Salvar em `meal_consumption` com `custom_meal_name` preenchido
- [ ] Exibir na lista do dia (visual diferenciado)

**Notas:**
- Não cria novo `meal_plan_item`
- Usa `meal_consumption` direto com `meal_plan_item_id = null`

**Status:** ⏳ Pendente  
**Estimativa:** 45 minutos  
**Data conclusão:** -

---

## 📦 FASE 3: Reorganização da UI

### 3.1 Surpreenda-me → Modo Kids
**Objetivo:** Mover "Surpreenda-me" para dentro do Modo Kids ou menu secundário

#### Sub-tarefas:
- [ ] Analisar código atual do Surpreenda-me
- [ ] Identificar onde está sendo usado
- [ ] Mover para seção do Modo Kids
- [ ] OU: Criar menu "Mais opções" com Surpreenda-me
- [ ] Atualizar navegação/menu principal

**Status:** ⏳ Pendente  
**Estimativa:** 30 minutos  
**Data conclusão:** -

---

### 3.2 Reorganizar Dashboard
**Objetivo:** Priorizar "Registro Livre" e "Próxima Refeição"

#### Sub-tarefas:
- [ ] Novo layout do Dashboard priorizando registro
- [ ] Card de "Registro Rápido" em destaque
- [ ] Manter card "Próxima Refeição" para quem tem plano
- [ ] Mostrar resumo do dia (calorias, macros)

**Status:** ⏳ Pendente  
**Estimativa:** 1 sessão  
**Data conclusão:** -

---

## 📦 FASE 4: Reestruturação do Módulo de Planos 🆕

> **Objetivo:** Tornar a criação de planos mais flexível, permitindo horários personalizados por plano e suporte global a timezones.

### Visão Geral

**Situação atual:**
- Usuário cria plano → usa horários globais do admin
- Não pode personalizar horários para planos específicos
- Não há suporte explícito a timezone (funciona localmente, mas edge functions usam UTC)

**Situação desejada:**
- UI inline colapsável para configurar plano
- Horários personalizados opcionais por plano
- Timezone salvo no perfil para suporte global
- Lógica que prioriza: horários do plano → globais → fallback

---

### 4.1 Adicionar Timezone ao Perfil do Usuário ✅
**Objetivo:** Preparar sistema para suporte global

#### Sub-tarefas:
- [x] Coluna `timezone` na tabela `profiles` (default: 'America/Sao_Paulo')
- [x] Detectar timezone automaticamente no onboarding via `Intl.DateTimeFormat`
- [x] Permitir alteração manual em Configurações
- [x] Edge Functions atualizadas (ver 4.5)

**Status:** ✅ Concluída  
**Data conclusão:** 27/12/2024

---

### 4.2 Adicionar Horários Personalizados por Plano ✅
**Objetivo:** Permitir que cada plano tenha seus próprios horários

#### Sub-tarefas:
- [x] Coluna `custom_meal_times` na tabela `meal_plans` (JSONB)
- [x] Hook `usePlanMealTimes` com prioridade: custom_meal_times → global settings → defaults
- [x] Componente `CustomMealTimesEditor` com UI completa:
  - [x] Toggle para habilitar/desabilitar horários personalizados
  - [x] Inputs de horário para cada refeição
  - [x] Botão restaurar padrão
  - [x] Modo compacto (collapsible)
- [x] Funções utilitárias no hook:
  - [x] `getTimeRanges()` - retorna ranges com flag `isCustom`
  - [x] `getLabels()` - labels das refeições
  - [x] `getMealOrder()` - ordem das refeições
  - [x] `getMealTime()` - hora formatada
  - [x] `updateCustomTimes()` - salvar no banco
- [x] `useNextMeal` já suporta `customMealTimes` via `getMealStatusWithCustomTimes()`
- [x] `usePendingMeals` usa configuração global (pode ser expandido)

**Implementação:**
- `src/hooks/usePlanMealTimes.tsx` - Hook principal
- `src/components/CustomMealTimesEditor.tsx` - UI de edição
- Formato: `{ "cafe_manha": "07:00", "almoco": "12:30" }`

**Status:** ✅ Concluída  
**Data conclusão:** 27/12/2024

---

### 4.3 UI Inline Colapsável para Criação de Plano ✅
**Objetivo:** Interface unificada com configuração opcional visível

#### Sub-tarefas:
- [x] Componente `CustomMealTimesEditor` com modo `compact` (collapsible)
- [x] Integrado no `MealPlanGenerator.tsx`:
  - [x] Campo nome do plano
  - [x] Collapsible para horários personalizados
  - [x] Toggle habilitar/desabilitar horários customizados
  - [x] Inputs de horário para cada refeição
  - [x] Botão "Restaurar padrão"
- [x] Passa `customMealTimes` para edge function `generate-meal-plan`
- [x] Salva no campo `custom_meal_times` do `meal_plans`

**Implementação:**
- `src/components/CustomMealTimesEditor.tsx` - Componente reutilizável com prop `compact`
- `src/components/MealPlanGenerator.tsx` - Usa `<CustomMealTimesEditor onChange={setCustomMealTimes} compact />`
- Edge function recebe e salva no banco

**Status:** ✅ Concluída  
**Data conclusão:** 27/12/2024

---

### 4.4 Edição de Configurações do Plano Existente
**Objetivo:** Permitir editar horários de um plano já criado

#### Sub-tarefas:
- [ ] Adicionar botão "Configurações" no `MealPlanCalendar`
- [ ] Sheet para editar `custom_meal_times` do plano ativo
- [ ] Validar que mudanças só afetam refeições futuras
- [ ] Atualizar cache quando horários mudarem

**Regras de Negócio:**
- Só pode editar planos ativos
- Mudanças não afetam refeições já completadas
- Horários novos aplicam-se a partir do momento da edição

**Status:** ⏳ Pendente  
**Estimativa:** 45 minutos  
**Prioridade:** Baixa (pode ser fase seguinte)

---

### 4.5 Atualizar Edge Functions para Timezone ✅
**Objetivo:** Lembretes respeitam fuso horário do usuário

#### Sub-tarefas:
- [x] Implementar `getCurrentTimeInTimezone()` helper usando `Intl.DateTimeFormat`
- [x] `send-meal-reminder/index.ts`:
  - [x] Buscar timezone do perfil do usuário
  - [x] Converter hora atual para timezone local
  - [x] Verificar se está no horário de lembrete baseado no horário local
- [x] `send-water-reminder/index.ts`:
  - [x] Buscar timezone do perfil
  - [x] Verificar intervalo de lembretes no horário local
  - [x] Calcular consumo do dia baseado no início do dia local
- [x] `send-feedback-reminder/index.ts`:
  - [x] Buscar timezone do perfil
  - [x] Só enviar entre 8h-22h no horário local do usuário

**Implementação:**
- Usou `Intl.DateTimeFormat` nativo (não precisa de date-fns-tz)
- Cada função busca timezone da tabela `profiles`
- Default: `America/Sao_Paulo` se timezone não definido

**Status:** ✅ Concluída  
**Data conclusão:** 27/12/2024

---

### Ordem de Implementação - FASE 4 ✅ CONCLUÍDA

```
FASE 4 - Status Final
====================================

Sprint 1 (Base): ✅
├── 4.1 Timezone no Perfil ✅
└── 4.5 Edge Functions Timezone ✅

Sprint 2 (Horários por Plano): ✅
├── 4.2 Custom Meal Times no meal_plans ✅
└── 4.3 UI Inline Colapsável ✅

Sprint 3 (Polish): ⏳
└── 4.4 Edição de Plano Existente (opcional - baixa prioridade)
```

---

### Análise de Compatibilidade

| Funcionalidade | Impacto | Ação |
|---------------|---------|------|
| NextMealCard (1h antes) | Médio | Passar timeRanges do plano |
| Lembretes Push | Alto | Usar timezone do perfil |
| Status da refeição | Médio | Funções aceitam parâmetro opcional |
| Histórico existente | Nenhum | Usa horários globais como fallback |
| Planos antigos | Nenhum | `custom_meal_times = null` → global |

---

### Migrations Necessárias

```sql
-- Migration 1: Timezone no perfil
ALTER TABLE profiles 
ADD COLUMN timezone TEXT DEFAULT 'America/Sao_Paulo';

-- Migration 2: Horários personalizados por plano
ALTER TABLE meal_plans 
ADD COLUMN custom_meal_times JSONB DEFAULT NULL;

COMMENT ON COLUMN meal_plans.custom_meal_times IS 
'Horários personalizados: {"cafe_manha": {"start": 7, "end": 9}, ...}. NULL = usar globais.';
```

---

## 📝 Changelog

### [27/12/2024] - FASE 4 Concluída
- ✅ **4.1** Timezone no perfil implementado
- ✅ **4.2** Horários personalizados por plano (`custom_meal_times`)
- ✅ **4.3** UI inline colapsável no `MealPlanGenerator`
- ✅ **4.5** Edge Functions com suporte a timezone

### [27/12/2024] - Roadmap FASE 4 Criado
- 📋 Definido roadmap completo para reestruturação do módulo de planos

### [27/12/2024] - Simplificação do NextMealCard
- ✅ Removido botão "Trocar" do card de próxima refeição
- ✅ Refeições do plano na Home agora são apenas visualização
- ✅ Usuário deve usar módulo manual para registrar refeições diferentes

### [27/12/2024] - Unificação de Fluxos
- ✅ Criado `MealRegistrationFlow.tsx` - componente reutilizável
- ✅ Refatorado `RegisterMealFromPhotoSheet.tsx` para usar componente unificado
- ✅ Refatorado `FreeFormMealLogger.tsx` para usar componente unificado
- ✅ UX padronizada entre módulo de foto e módulo manual

### [27/12/2024] - Features Principais
- ✅ Implementado módulo de registro manual de refeições
- ✅ Implementado registro de refeição via foto
- ✅ Detecção de refeições duplicadas

### [v1.x - Anterior]
- Sistema de planos alimentares
- Análise de foto por IA
- Rastreamento de sintomas
- Modo Kids
- Surpreenda-me
- PWA com notificações

---

## 🚀 Próximos Passos

### Imediato (próxima sessão)
1. [ ] **2.4** - Horários Personalizados por Usuário (Settings)
2. [ ] **2.5** - Adicionar Refeição Extra ao Plano

### Curto prazo (1-2 semanas)
- [ ] **3.1** - Surpreenda-me → Modo Kids
- [ ] **3.2** - Reorganizar Dashboard
- [ ] Completar FASE 2 e FASE 3

### Médio prazo (1 mês)
- [ ] **4.4** - Edição de Plano Existente (opcional)
- [ ] Beta fechado com 10-20 usuários
- [ ] Coletar feedback

---

## 📌 Notas de Desenvolvimento

### Arquitetura de Dados
```
meal_consumption (TABELA CENTRAL)
├── source_type = 'plan'   → Veio do plano alimentar
├── source_type = 'photo'  → Veio da análise de foto
├── source_type = 'manual' → Registro livre manual
└── source_type = 'extra'  → Refeição extra adicionada

Se meal_plan_item_id = NULL → Refeição independente de plano
Se custom_meal_name != NULL → Nome personalizado pelo usuário
```

### Arquitetura de Horários (FASE 4)
```
Prioridade de Horários
======================
1. custom_meal_times (do plano) ← Se definido pelo usuário
2. meal_time_settings (global)  ← Configuração do admin
3. DEFAULT_TIME_RANGES          ← Fallback hardcoded

Função: getMealTimeRangesForPlan(planId)
├── Busca plano
├── Se custom_meal_times → retorna esses
└── Senão → retorna getMealTimeRangesSync()
```

### Componentes Reutilizáveis
- `MealRegistrationFlow` - fluxo unificado de registro (tipo + horário)
- `CustomMealTimesEditor` - editor de horários personalizados (compact/full)
- `FoodSearchDrawer` - busca de alimentos
- `MealDetailSheet` - detalhes da refeição
- `usePlanMealTimes` - hook para horários com prioridade plano → global
- `useMealConsumption` - hook de salvamento

---

**Mantido por:** Lovable AI  
**Projeto:** NutriTrack / Acompanhamento Alimentar
