# 🔍 ANÁLISE DE DISPONIBILIDADE DE DADOS - CORE DE INGREDIENTES

## 📊 RESUMO EXECUTIVO

**Data**: 2026-01-15  
**Análise**: Verificação de dados existentes nas 4 tabelas críticas  
**Resultado**: 🚨 **TODAS AS TABELAS ESTÃO VAZIAS**

---

## 🗄️ TABELAS ANALISADAS

### **1. intolerance_mappings**
**Função**: Mapeia ingredientes proibidos para cada intolerância/alergia

**Status**: ❌ **0 REGISTROS**

**Estrutura Esperada**:
```sql
intolerance_key | ingredient | severity_level | language
----------------|------------|----------------|----------
lactose         | leite      | high           | pt
lactose         | queijo     | high           | pt
gluten          | trigo      | high           | pt
fodmap          | cebola     | medium         | pt
```

**Dados Esperados (baseado no sistema original)**:
- FODMAP: 335 ingredientes
- Frutose: 95 ingredientes
- Histamina: 119 ingredientes
- Glúten: 95 ingredientes
- Lactose: 96 ingredientes
- Peixe: 136 ingredientes
- Soja: 75 ingredientes
- Amendoim: 38 ingredientes
- Frutos do Mar: 92 ingredientes
- Oleaginosas: 89 ingredientes
- Ovo: 69 ingredientes
- Gergelim: 18 ingredientes
- Sorbitol: 52 ingredientes
- Cafeína: 43 ingredientes
- Níquel: 83 ingredientes
- Salicilato: 99 ingredientes
- Sulfitos: 72 ingredientes

**Total Esperado**: ~1.500+ registros

---

### **2. onboarding_options**
**Função**: Define opções de onboarding (intolerâncias, alergias, sensibilidades, preferências)

**Status**: ❌ **0 REGISTROS**

**Estrutura Esperada**:
```sql
category      | option_id  | label      | emoji | icon_name
--------------|------------|------------|-------|----------
intolerances  | lactose    | Lactose    | 🥛    | milk
intolerances  | gluten     | Glúten     | 🌾    | wheat
allergies     | peanut     | Amendoim   | 🥜    | nut
sensitivities | histamine  | Histamina  | 🧪    | flask
```

**Dados Esperados**:
- **Intolerâncias**: 8 opções (FODMAP, Frutose, Glúten, Lactose, Sorbitol, Histamina, Nenhuma, Ovos)
- **Alergias**: 8 opções (Amendoim, Frutos do Mar, Gergelim, Oleaginosas, Ovo, Peixe, Soja, Leite)
- **Sensibilidades**: 6 opções (Cafeína, Histamina, Milho, Níquel, Salicilato, Sulfitos)
- **Preferências Dietéticas**: 7 opções (Comum, Vegetariana, Vegana, Low Carb, Pescetariana, Cetogênica, Flexitariana)
- **Objetivos**: 3 opções (Emagrecer, Manter peso, Ganhar peso)
- **Ingredientes Excluídos**: 9+ opções

**Total Esperado**: ~40-50 registros

---

### **3. intolerance_safe_keywords**
**Função**: Define palavras-chave seguras que NÃO devem ser bloqueadas mesmo contendo termos suspeitos

**Status**: ❌ **0 REGISTROS**

**Estrutura Esperada**:
```sql
intolerance_key | keyword
----------------|------------------
lactose         | lactose-free
lactose         | sem lactose
gluten          | gluten-free
gluten          | sem glúten
```

**Dados Esperados**:
- Palavras-chave de isenção (ex: "sem lactose", "lactose-free")
- Termos técnicos seguros
- Variações regionais

**Total Esperado**: ~50-100 registros

---

### **4. dietary_forbidden_ingredients**
**Função**: Mapeia ingredientes proibidos por preferência dietética

**Status**: ❌ **0 REGISTROS**

**Estrutura Esperada**:
```sql
dietary_preference | ingredient
-------------------|------------------
vegetarian         | carne bovina
vegetarian         | frango
vegetarian         | peixe
vegan              | leite
vegan              | ovo
vegan              | mel
```

**Dados Esperados**:
- **Vegetariana**: ~20-30 ingredientes (todas as carnes)
- **Vegana**: ~40-50 ingredientes (carnes + laticínios + ovos + mel)
- **Pescetariana**: ~15-20 ingredientes (carnes exceto peixes)
- **Low Carb**: ~10-15 ingredientes (carboidratos refinados)
- **Cetogênica**: ~20-30 ingredientes (carboidratos em geral)

**Total Esperado**: ~150-200 registros

---

## 📈 ANÁLISE COMPARATIVA

### **Sistema Original (Fotos 1, 2, 3)**
```
Intolerâncias:
├─ FODMAP: 335 ingredientes ✅
├─ Frutose: 95 ingredientes ✅
├─ Glúten: 95 ingredientes ✅
├─ Lactose: 96 ingredientes ✅
└─ Sorbitol: 52 ingredientes ✅

Alergias:
├─ Amendoim: 38 ingredientes ✅
├─ Frutos do Mar: 92 ingredientes ✅
├─ Peixe: 136 ingredientes ✅
└─ Soja: 75 ingredientes ✅

Sensibilidades:
├─ Cafeína: 43 ingredientes ✅
├─ Histamina: 119 ingredientes ✅
└─ Milho: 63 ingredientes ✅
```

### **Sistema Atual (Banco de Dados)**
```
intolerance_mappings: 0 registros ❌
onboarding_options: 0 registros ❌
intolerance_safe_keywords: 0 registros ❌
dietary_forbidden_ingredients: 0 registros ❌

TOTAL: 0 registros em todas as tabelas
```

---

## 🚨 CONCLUSÃO CRÍTICA

### **SITUAÇÃO ATUAL**

**TODAS AS 4 TABELAS CRÍTICAS ESTÃO COMPLETAMENTE VAZIAS**

Isso significa que:
1. ❌ **Não há dados para importar** - Não existe backup ou fonte de dados
2. ❌ **Sistema não funcional** - Validação de ingredientes não opera
3. ❌ **Onboarding quebrado** - Não há opções para usuário selecionar
4. ❌ **Segurança comprometida** - Não há proteção contra alimentos proibidos

---

## 🎯 DECISÃO NECESSÁRIA

### **OPÇÃO 1: CRIAR DADOS DO ZERO (RECOMENDADO)**

**Vantagens**:
- ✅ Controle total sobre qualidade dos dados
- ✅ Oportunidade de melhorar estrutura
- ✅ Dados limpos e organizados desde o início

**Desvantagens**:
- ⏱️ Tempo de desenvolvimento: 3-5 dias
- 📊 Requer pesquisa nutricional extensiva
- 🧪 Necessita validação médica/nutricional

**Escopo de Trabalho**:
1. **Pesquisa**: Coletar listas de ingredientes por intolerância (fontes médicas)
2. **Estruturação**: Organizar dados em formato SQL
3. **Tradução**: Criar versões PT, EN, ES
4. **Validação**: Testar com casos reais
5. **Importação**: Inserir no banco via migration

---

### **OPÇÃO 2: BUSCAR FONTES EXTERNAS**

**Fontes Possíveis**:
- 🔍 APIs públicas de alergias/intolerâncias
- 📚 Bases de dados médicas (USDA, FDA, ANVISA)
- 🌐 Projetos open-source similares
- 📖 Literatura científica

**Desafio**: Adaptar dados externos para estrutura do sistema

---

### **OPÇÃO 3: USAR FALLBACKS HARDCODED (TEMPORÁRIO)**

**Implementação**:
```typescript
// hooks/useOnboardingOptions.tsx (JÁ EXISTE)
const FALLBACK_OPTIONS = {
  intolerances: [
    { option_id: "lactose", label: "Lactose", ... },
    { option_id: "gluten", label: "Glúten", ... }
  ]
};
```

**Status**: ✅ **JÁ IMPLEMENTADO NO FRONTEND**

**Problema**: Não resolve validação de ingredientes no backend

---

## 📋 PLANO DE AÇÃO RECOMENDADO

### **FASE 1: DADOS MÍNIMOS VIÁVEIS (1-2 dias)**

Criar conjunto mínimo de dados para sistema funcionar:

#### **1.1. onboarding_options (40 registros)**
```sql
-- Intolerâncias (8)
INSERT INTO onboarding_options (category, option_id, label, emoji, icon_name) VALUES
('intolerances', 'lactose', 'Lactose', '🥛', 'milk'),
('intolerances', 'gluten', 'Glúten', '🌾', 'wheat'),
('intolerances', 'fodmap', 'FODMAP', '🫘', 'bean'),
('intolerances', 'fructose', 'Frutose', '🍯', 'honey'),
('intolerances', 'sorbitol', 'Sorbitol', '🍬', 'candy'),
('intolerances', 'histamine', 'Histamina', '🧪', 'flask'),
('intolerances', 'eggs', 'Ovos', '🥚', 'egg'),
('intolerances', 'none', 'Nenhuma', '✅', 'check');

-- Alergias (8)
-- Sensibilidades (6)
-- Preferências (7)
-- Objetivos (3)
-- Excluídos (9)
```

#### **1.2. intolerance_mappings (TOP 100 ingredientes)**
```sql
-- Lactose (TOP 20 mais comuns)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, severity_level, language) VALUES
('lactose', 'leite', 'high', 'pt'),
('lactose', 'queijo', 'high', 'pt'),
('lactose', 'iogurte', 'high', 'pt'),
('lactose', 'manteiga', 'medium', 'pt'),
('lactose', 'creme de leite', 'high', 'pt'),
-- ... mais 15

-- Glúten (TOP 20)
('gluten', 'trigo', 'high', 'pt'),
('gluten', 'pão', 'high', 'pt'),
('gluten', 'macarrão', 'high', 'pt'),
-- ... mais 17

-- FODMAP (TOP 30)
-- Outros (TOP 30)
```

#### **1.3. dietary_forbidden_ingredients (50 registros)**
```sql
-- Vegetariana
INSERT INTO dietary_forbidden_ingredients (dietary_preference, ingredient) VALUES
('vegetarian', 'carne bovina'),
('vegetarian', 'frango'),
('vegetarian', 'peixe'),
('vegetarian', 'porco'),
-- ... mais 6

-- Vegana
('vegan', 'leite'),
('vegan', 'ovo'),
('vegan', 'mel'),
('vegan', 'queijo'),
-- ... mais 16

-- Outras preferências
```

#### **1.4. intolerance_safe_keywords (20 registros)**
```sql
INSERT INTO intolerance_safe_keywords (intolerance_key, keyword) VALUES
('lactose', 'lactose-free'),
('lactose', 'sem lactose'),
('gluten', 'gluten-free'),
('gluten', 'sem glúten'),
-- ... mais 16
```

**Total Fase 1**: ~210 registros críticos

---

### **FASE 2: EXPANSÃO COMPLETA (2-3 dias)**

Expandir para números do sistema original:

- **intolerance_mappings**: 1.500+ registros
- **onboarding_options**: 50 registros (com i18n)
- **intolerance_safe_keywords**: 100 registros
- **dietary_forbidden_ingredients**: 200 registros

**Total Fase 2**: ~1.850 registros

---

### **FASE 3: INTERNACIONALIZAÇÃO (1 dia)**

Adicionar suporte multi-idioma:
- Português (PT)
- Inglês (EN)
- Espanhol (ES)

---

## 💰 ESTIMATIVA DE ESFORÇO

| Fase | Tempo | Registros | Prioridade |
|------|-------|-----------|------------|
| **Fase 1** | 1-2 dias | 210 | 🔴 CRÍTICA |
| **Fase 2** | 2-3 dias | 1.850 | 🟡 ALTA |
| **Fase 3** | 1 dia | +3.700 | 🟢 MÉDIA |

**Total**: 4-6 dias de desenvolvimento

---

## 🎯 RECOMENDAÇÃO FINAL

### **AÇÃO IMEDIATA**

1. ✅ **Confirmar**: Não há backup ou fonte de dados
2. ✅ **Decidir**: Criar dados do zero ou buscar fontes externas
3. ✅ **Priorizar**: Implementar Fase 1 (MVP) primeiro

### **PRÓXIMOS PASSOS**

**SE APROVADO PARA CRIAR DO ZERO**:
1. Começar com Fase 1 (210 registros críticos)
2. Validar funcionamento do sistema
3. Expandir para Fase 2 (dados completos)
4. Adicionar i18n na Fase 3

**TEMPO TOTAL**: 4-6 dias para sistema completo

---

## 📊 STATUS ATUAL

```
┌─────────────────────────────────────────────────┐
│  🚨 SISTEMA CORE COMPLETAMENTE SEM DADOS        │
│                                                 │
│  Tabelas Críticas: 4/4 VAZIAS                   │
│  Registros Totais: 0                            │
│  Funcionalidade: 0%                             │
│                                                 │
│  ⚠️  SISTEMA NÃO OPERACIONAL                    │
└─────────────────────────────────────────────────┘
```

**Decisão necessária**: Aprovar criação de dados do zero ou buscar alternativas.
