# 🍽️ ROADMAP - NutriTrack v2.0

> **Visão:** Transformar o app de um gerador de receitas para um **acompanhamento alimentar completo**, flexível para usuários com ou sem plano alimentar.

---

## 📊 Status Geral

| Fase | Status | Progresso |
|------|--------|-----------|
| FASE 1: Preparação Banco | ⏳ Pendente | 0% |
| FASE 2: Features Principais | ⏳ Pendente | 0% |
| FASE 3: Reorganização UI | ⏳ Pendente | 0% |

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

## 📦 FASE 1: Preparação do Banco de Dados

**Objetivo:** Preparar a estrutura do banco antes de desenvolver features

### 1.1 Adicionar campos em `meal_consumption`
- [ ] Campo `source_type` (enum: 'plan', 'photo', 'manual', 'extra')
- [ ] Campo `custom_meal_name` (text, nullable) - para refeições personalizadas
- [ ] Campo `meal_time` (time, nullable) - horário escolhido pelo usuário

**SQL Preview:**
```sql
ALTER TABLE meal_consumption 
ADD COLUMN source_type text DEFAULT 'plan',
ADD COLUMN custom_meal_name text,
ADD COLUMN meal_time time;
```

### 1.2 Criar tabela `user_meal_time_preferences` (opcional)
- [ ] Tabela para horários personalizados por usuário
- [ ] Fallback para `meal_time_settings` global se não existir

**Notas técnicas:**
- Campos são opcionais (nullable) para não quebrar registros existentes
- `source_type` diferencia origem do registro para analytics

**Status:** ⏳ Pendente  
**Estimativa:** 15 minutos  
**Data conclusão:** -

---

## 📦 FASE 2: Features Principais

### 2.1 Módulo "Registro Livre de Refeições"
**Objetivo:** Substituir posição do "Surpreenda-me" por registro manual

#### Sub-tarefas:
- [ ] Criar componente `FreeFormMealLogger.tsx`
- [ ] Interface para buscar/selecionar alimentos
- [ ] Seletor de tipo de refeição (café, almoço, etc.)
- [ ] Seletor de horário
- [ ] Salvar em `meal_consumption` com `source_type = 'manual'`
- [ ] Integrar com `FoodSearchDrawer` existente
- [ ] Adicionar ao menu principal / Dashboard

**Fluxo do usuário:**
```
Dashboard → "Registrar Refeição" → Buscar alimento → 
Selecionar tipo → Confirmar horário → Salvo ✓
```

**Status:** ⏳ Pendente  
**Estimativa:** 1-2 sessões  
**Data conclusão:** -

---

### 2.2 Foto do Prato → Registrar Refeição
**Objetivo:** Após analisar foto, perguntar se quer registrar como refeição

#### Sub-tarefas:
- [ ] Adicionar botão fixo no `FoodPhotoAnalyzer` após análise
- [ ] Modal/Dialog "Registrar esta refeição?"
- [ ] Seletor de tipo de refeição
- [ ] Seletor de horário (default: agora)
- [ ] Salvar em `meal_consumption` com `source_type = 'photo'`
- [ ] Vincular dados nutricionais da análise

**Fluxo do usuário:**
```
Tirar foto → Análise IA → "Registrar como refeição?" → 
Sim → Qual refeição? → Horário → Salvo ✓
```

**Status:** ⏳ Pendente  
**Estimativa:** 30-45 minutos  
**Data conclusão:** -

---

### 2.3 Trocar Refeição Completa (Home)
**Objetivo:** Substituir "trocar ingrediente" por "trocar refeição" no card da Home

#### Sub-tarefas:
- [ ] Remover botão/funcionalidade de substituir ingrediente do `NextMealCard`
- [ ] Adicionar botão "Trocar Refeição"
- [ ] Abrir drawer/sheet com opções de refeições alternativas
- [ ] Usar refeições do mesmo `meal_type` do plano
- [ ] Atualizar `meal_plan_items` com nova refeição

**Notas:**
- Lógica similar já existe em `MealPlanCalendar`
- Reutilizar componentes existentes

**Status:** ⏳ Pendente  
**Estimativa:** 30 minutos  
**Data conclusão:** -

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

## 📝 Changelog

### [Não lançado]
- Roadmap criado e estruturado

### [v1.x - Atual]
- Sistema de planos alimentares
- Análise de foto por IA
- Rastreamento de sintomas
- Modo Kids
- Surpreenda-me
- PWA com notificações

---

## 🚀 Próximos Passos

### Imediato (próxima sessão)
1. [ ] Executar migração FASE 1 (preparar banco)
2. [ ] Iniciar FASE 2.1 (Registro Livre)

### Curto prazo (1-2 semanas)
- Completar todas as features da FASE 2
- Testes de usabilidade internos

### Médio prazo (1 mês)
- Beta fechado com 10-20 usuários
- Coletar feedback
- Iterar baseado em dados reais

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

### Componentes Reutilizáveis
- `FoodSearchDrawer` - busca de alimentos
- `MealDetailSheet` - detalhes da refeição
- `useMealConsumption` - hook de salvamento

---

**Mantido por:** Lovable AI  
**Projeto:** NutriTrack / Acompanhamento Alimentar
