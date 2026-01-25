# REGRAS DE ARQUITETURA DO PROJETO - ADAPTIVE EATS

## 📋 PROPÓSITO DESTE DOCUMENTO

Este documento contém **regras fundamentais de arquitetura** que devem ser seguidas em todo o projeto. Estas regras foram estabelecidas através de análises críticas e correções de bugs, e devem ser respeitadas para manter a qualidade, escalabilidade e manutenibilidade do código.

---

## 🌍 REGRA 1: INTERNACIONALIZAÇÃO - CÓDIGO EM INGLÊS UNIVERSAL

### **REGRA:**
**TODO o código interno deve usar INGLÊS como idioma universal.** Nunca usar português, espanhol ou outros idiomas em:
- Nomes de variáveis
- Nomes de funções
- Chaves de objetos
- Tipos de dados
- Constantes
- Enums

### **JUSTIFICATIVA:**
- ✅ Escalabilidade internacional
- ✅ Código universal para todos os países
- ✅ Sem necessidade de mapeamentos manuais
- ✅ Menos bugs de tradução
- ✅ Padrão da indústria

### **EXEMPLOS:**

#### ✅ CORRETO:
```typescript
const SMART_TEMPLATES = {
  breakfast: [...],
  morning_snack: [...],
  lunch: [...],
  afternoon_snack: [...],
  dinner: [...],
  supper: [...]
}

meal_type: "breakfast"
meal_type: "lunch"
```

#### ❌ INCORRETO:
```typescript
const SMART_TEMPLATES = {
  cafe_manha: [...],      // ❌ Português
  almoco: [...],          // ❌ Português
  jantar: [...]           // ❌ Português
}

meal_type: "desayuno"     // ❌ Espanhol
meal_type: "petit_dejeuner" // ❌ Francês
```

### **ONDE APLICAR:**
- ✅ Banco de dados (campos, tabelas)
- ✅ Backend (TypeScript, Edge Functions)
- ✅ Frontend (código interno)
- ✅ APIs (endpoints, parâmetros)
- ✅ Configurações (JSON, YAML)

### **EXCEÇÃO:**
- ✅ UI/UX: Traduções para exibição ao usuário (usando i18n)
- ✅ Conteúdo: Textos visíveis ao usuário

### **IMPLEMENTAÇÃO:**
```typescript
// Código interno: inglês
const mealType = "breakfast";

// Exibição ao usuário: traduzido
const MEAL_LABELS = {
  BR: { breakfast: "Café da Manhã" },
  US: { breakfast: "Breakfast" },
  MX: { breakfast: "Desayuno" }
};

const displayLabel = MEAL_LABELS[userCountry][mealType];
```

---

## 🔄 REGRA 2: FALLBACK EM 3 NÍVEIS

### **REGRA:**
Sistema de geração de refeições deve seguir **fallback em 3 níveis obrigatórios**:

```
NÍVEL 1: POOL (meal_combinations)
    ↓ (se não encontrar)
NÍVEL 2: GERAÇÃO DIRETA (advanced-meal-generator.ts)
    ↓ (se falhar)
NÍVEL 3: IA (Gemini)
```

### **JUSTIFICATIVA:**
- ✅ Performance (pool é mais rápido)
- ✅ Qualidade (geração direta é melhor que IA)
- ✅ Custo (IA é cara)
- ✅ Confiabilidade (3 camadas de segurança)

### **IMPLEMENTAÇÃO:**
- Arquivo: `supabase/functions/generate-ai-meal-plan/index.ts`
- Função: `generateSingleDay()`
- Nunca pular níveis
- Sempre tentar próximo nível se anterior falhar

---

## 🍚 REGRA 3: ARROZ E FEIJÃO SEMPRE SEPARADOS

### **REGRA:**
**Arroz e feijão devem SEMPRE aparecer como componentes SEPARADOS**, nunca agrupados em um único item.

### **JUSTIFICATIVA:**
- ✅ Padrão cultural brasileiro
- ✅ Usuário espera ver separado
- ✅ Facilita substituições individuais
- ✅ Macros mais precisos

### **EXEMPLOS:**

#### ✅ CORRETO:
```
• Arroz branco (120g) — 156 kcal
• Feijão carioca (100g) — 76 kcal
• Frango grelhado (150g) — 165 kcal
```

#### ❌ INCORRETO:
```
• Arroz com feijão (220g) — 232 kcal
• Frango grelhado (150g) — 165 kcal
```

### **IMPLEMENTAÇÃO:**
- Arquivo: `supabase/functions/_shared/mealGenerationConfig.ts`
- Função: `groupArrozFeijao()` - DESABILITADA
- Nunca agrupar automaticamente

---

## 💧 REGRA 4: ÁGUA SEMPRE 0 KCAL

### **REGRA:**
**Água deve SEMPRE retornar 0 kcal**, independente de dados no banco.

### **JUSTIFICATIVA:**
- ✅ Fato nutricional
- ✅ Evita dados incorretos
- ✅ Proteção contra erros no banco

### **IMPLEMENTAÇÃO:**
- Arquivo: `supabase/functions/_shared/calculateRealMacros.ts`
- Proteção sintética para água
- Sempre retornar 0 kcal, 0 proteína, 0 carbs, 0 gordura

```typescript
if (normalized.includes('agua') || normalized.includes('water')) {
  return {
    food: {
      calories_per_100g: 0,
      protein_per_100g: 0,
      carbs_per_100g: 0,
      fat_per_100g: 0,
      // ...
    }
  };
}
```

---

## 📊 REGRA 5: FONTE ÚNICA DE VERDADE PARA MACROS

### **REGRA:**
**Macros devem vir de UMA ÚNICA fonte confiável**, nunca de múltiplas fontes conflitantes.

### **HIERARQUIA DE FONTES:**
```
1. canonical_ingredients (prioridade máxima)
2. foods (TBCA/TACO/USDA)
3. Fallback sintético (água, chás)
4. IA (último recurso, apenas se necessário)
```

### **JUSTIFICATIVA:**
- ✅ Consistência de dados
- ✅ Confiabilidade nutricional
- ✅ Evita valores absurdos
- ✅ Rastreabilidade

### **IMPLEMENTAÇÃO:**
- Arquivo: `supabase/functions/_shared/calculateRealMacros.ts`
- Nunca usar fallback de IA para macros individuais
- Validar dados do banco antes de usar

---

## 🚫 REGRA 6: NUNCA USAR FALLBACK DE IA PARA MACROS INDIVIDUAIS

### **REGRA:**
**Nunca usar `ing.calories` da IA como fallback para macros de ingredientes individuais.**

### **JUSTIFICATIVA:**
- ❌ IA retorna macros TOTAIS da refeição, não individuais
- ❌ Causa valores absurdos (café preto com 491 kcal)
- ❌ Melhor mostrar 0 do que mostrar errado

### **IMPLEMENTAÇÃO:**
- Arquivo: `src/hooks/useIngredientCalories.tsx`
- Remover fallback para `ing.calories`
- Se não encontrar no banco, retornar 0

```typescript
// ❌ INCORRETO:
if (ing.calories && ing.calories > 0) {
  return ing.calories; // Macros TOTAIS da refeição!
}

// ✅ CORRETO:
if (!dbMatch) {
  return 0; // Melhor que mostrar errado
}
```

---

## 🎨 REGRA 7: SEPARAÇÃO DE RESPONSABILIDADES - CÓDIGO vs UI

### **REGRA:**
**Separar claramente código interno (inglês) de exibição ao usuário (traduzido).**

### **CAMADAS:**

```
┌─────────────────────────────────────┐
│  CÓDIGO INTERNO (INGLÊS)            │
│  - Variáveis                        │
│  - Funções                          │
│  - Banco de dados                   │
│  - APIs                             │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  CAMADA DE TRADUÇÃO (i18n)          │
│  - Mapeia inglês → idioma local     │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  UI/UX (IDIOMA DO USUÁRIO)          │
│  - Textos visíveis                  │
│  - Labels                           │
│  - Mensagens                        │
└─────────────────────────────────────┘
```

### **IMPLEMENTAÇÃO:**
```typescript
// Código interno
const mealType = "breakfast";

// Tradução
const translations = {
  BR: { breakfast: "Café da Manhã" },
  US: { breakfast: "Breakfast" }
};

// UI
<Text>{translations[userCountry][mealType]}</Text>
```

---

## 🔧 REGRA 8: VALIDAÇÃO DE DADOS DO BANCO

### **REGRA:**
**Sempre validar dados do banco antes de usar**, especialmente macros nutricionais.

### **VALIDAÇÕES OBRIGATÓRIAS:**
- ✅ Calorias não negativas
- ✅ Macros dentro de limites razoáveis
- ✅ Soma de macros coerente com calorias
- ✅ Proteção contra valores absurdos

### **IMPLEMENTAÇÃO:**
- Arquivo: `supabase/functions/_shared/calculateRealMacros.ts`
- Função: `validateDatabaseData()`
- Rejeitar dados suspeitos

---

## 📝 REGRA 9: LOGS DETALHADOS PARA DEBUG

### **REGRA:**
**Sempre incluir logs detalhados em pontos críticos do código**, especialmente em:
- Fallbacks
- Cálculos de macros
- Validações
- Erros

### **PADRÃO:**
```typescript
logStep('🔧 NÍVEL 2: Trying direct generation', {
  mealType,
  targetCalories,
  country: userCountry
});
```

### **JUSTIFICATIVA:**
- ✅ Facilita debug
- ✅ Rastreabilidade de problemas
- ✅ Monitoramento de performance

---

## 🎯 REGRA 10: GERAÇÃO DIRETA PRIORITÁRIA PARA REFEIÇÕES COMPLEXAS

### **REGRA:**
**Usar geração direta (nível 2) como prioridade para refeições complexas** (almoço, jantar).

### **JUSTIFICATIVA:**
- ✅ Qualidade superior (componentes completos)
- ✅ Variedade infinita
- ✅ Complementos automáticos (água, sobremesa)
- ✅ Melhor experiência do usuário

### **RECOMENDAÇÃO:**
```
CAFÉ DA MANHÃ & LANCHES → Pool (refeições simples)
ALMOÇO, JANTAR, CEIA → Geração Direta (refeições complexas)
FALLBACK FINAL → IA (último recurso)
```

---

## 📚 COMO USAR ESTE DOCUMENTO

### **PARA DESENVOLVEDORES:**
1. Ler antes de fazer mudanças arquiteturais
2. Consultar ao adicionar novos países
3. Validar código contra estas regras
4. Atualizar documento se criar novas regras

### **PARA IA (ASSISTENTES):**
1. Sempre verificar estas regras antes de sugerir mudanças
2. Nunca violar estas regras sem justificativa explícita
3. Citar regra relevante ao fazer sugestões
4. Propor atualização se identificar nova regra

### **PARA CODE REVIEW:**
1. Validar que código segue todas as regras
2. Rejeitar PRs que violam regras sem justificativa
3. Sugerir correções baseadas nas regras

---

## 🔄 HISTÓRICO DE MUDANÇAS

### **21/01/2026 - Criação Inicial**
- Regra 1: Internacionalização em inglês
- Regra 2: Fallback em 3 níveis
- Regra 3: Arroz e feijão separados
- Regra 4: Água 0 kcal
- Regra 5: Fonte única de verdade
- Regra 6: Sem fallback de IA para macros individuais
- Regra 7: Separação código vs UI
- Regra 8: Validação de dados
- Regra 9: Logs detalhados
- Regra 10: Geração direta prioritária

---

## 📌 COMMITS RELACIONADOS

- `656b5ff` - Remover fallback incorreto de calorias da IA
- `5b4f669` - Adicionar proteção para água (0 kcal)
- `b775941` - Remover agrupamento automático de arroz e feijão
- `219c57d` - Internacionalização: Usar inglês universal

---

## ⚠️ IMPORTANTE

**Este documento é OBRIGATÓRIO e deve ser seguido por todos os desenvolvedores e assistentes de IA.**

Violações destas regras podem causar:
- ❌ Bugs críticos
- ❌ Dados incorretos
- ❌ Problemas de escalabilidade
- ❌ Dificuldade de manutenção
- ❌ Experiência ruim do usuário

**Antes de fazer qualquer mudança arquitetural, consulte este documento!**
