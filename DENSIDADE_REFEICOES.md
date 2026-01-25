# 📊 SISTEMA DE DENSIDADE DE REFEIÇÕES

**Status:** ✅ IMPLEMENTADO E ATIVO

---

## 🎯 O QUE É DENSIDADE?

Densidade é um indicador que classifica a refeição em três categorias baseado no **total de calorias** e **tipo de refeição**:

- 🍃 **LEVE** - Refeições com menos calorias
- ⚖️ **MODERADA** - Refeições com calorias médias
- 💪 **PESADA** - Refeições com mais calorias

---

## 🔧 COMO FUNCIONA?

### **Cálculo Automático**

O sistema calcula automaticamente a densidade baseado em:

1. **Total de calorias da refeição**
2. **Tipo de refeição** (café, almoço, jantar, etc)

### **Limites por Tipo de Refeição**

| Tipo de Refeição | 🍃 Leve | ⚖️ Moderada | 💪 Pesada |
|------------------|---------|-------------|-----------|
| **Café da Manhã** | ≤ 300 kcal | 301-450 kcal | > 450 kcal |
| **Lanche Manhã** | ≤ 150 kcal | 151-250 kcal | > 250 kcal |
| **Almoço** | ≤ 400 kcal | 401-600 kcal | > 600 kcal |
| **Lanche Tarde** | ≤ 150 kcal | 151-250 kcal | > 250 kcal |
| **Jantar** | ≤ 350 kcal | 351-550 kcal | > 550 kcal |
| **Ceia** | ≤ 100 kcal | 101-200 kcal | > 200 kcal |

---

## 💡 PARA QUE SERVE?

### **1. Personalização do Plano Alimentar**

O sistema usa a densidade para:

- ✅ Gerar planos para usuários que querem **perder peso** (mais refeições leves)
- ✅ Gerar planos para usuários que querem **ganhar massa** (mais refeições pesadas)
- ✅ Gerar planos para usuários em **manutenção** (refeições moderadas)

### **2. Perfil do Usuário**

Durante o onboarding, o usuário informa:
- **Objetivo:** Perder peso, ganhar massa, manutenção
- **Nível de atividade:** Sedentário, ativo, muito ativo

O sistema então:
1. Calcula o **gasto calórico diário** do usuário
2. Define o **objetivo calórico** (déficit, superávit, manutenção)
3. **Filtra refeições** do pool baseado na densidade adequada

---

## 📋 EXEMPLOS PRÁTICOS

### **🍃 Refeições LEVES**

```
Café da Manhã Leve (250 kcal)
- Tapioca (50g)
- Queijo cottage (50g)
Densidade: LEVE

Almoço Leve (380 kcal)
- Arroz integral (80g)
- Feijão (80g)
- Pescada grelhada (120g)
- Salada
Densidade: LEVE
```

### **⚖️ Refeições MODERADAS**

```
Café da Manhã Moderado (400 kcal)
- Pão integral (50g)
- Ovo mexido (100g)
- Maçã (130g)
- Café com leite (200ml)
Densidade: MODERADA

Almoço Moderado (535 kcal)
- Arroz integral (100g)
- Feijão (100g)
- Coxa de frango assada (120g)
- Salada
- Azeite (10g)
Densidade: MODERADA
```

### **💪 Refeições PESADAS**

```
Café da Manhã Pesado (550 kcal)
- Pão francês (50g)
- Ovo mexido (100g)
- Queijo minas (30g)
- Banana (100g)
- Café com leite (200ml)
- Mel (20g)
Densidade: PESADA

Almoço Pesado (720 kcal)
- Arroz branco (150g)
- Feijão (100g)
- Picanha grelhada (120g)
- Farofa (50g)
- Salada
- Azeite (10g)
Densidade: PESADA
```

---

## 🎯 LÓGICA DE SELEÇÃO NO PLANO

### **Usuário: Perder Peso (Déficit Calórico)**

```
Objetivo: 1.800 kcal/dia

Distribuição:
- Café da Manhã: 300 kcal → LEVE
- Lanche Manhã: 150 kcal → LEVE
- Almoço: 600 kcal → MODERADA
- Lanche Tarde: 150 kcal → LEVE
- Jantar: 500 kcal → MODERADA
- Ceia: 100 kcal → LEVE

Sistema filtra: 70% LEVES + 30% MODERADAS
```

### **Usuário: Ganhar Massa (Superávit Calórico)**

```
Objetivo: 3.000 kcal/dia

Distribuição:
- Café da Manhã: 550 kcal → PESADA
- Lanche Manhã: 300 kcal → PESADA
- Almoço: 800 kcal → PESADA
- Lanche Tarde: 300 kcal → PESADA
- Jantar: 700 kcal → PESADA
- Ceia: 350 kcal → PESADA

Sistema filtra: 80% PESADAS + 20% MODERADAS
```

### **Usuário: Manutenção**

```
Objetivo: 2.200 kcal/dia

Distribuição:
- Café da Manhã: 400 kcal → MODERADA
- Lanche Manhã: 200 kcal → MODERADA
- Almoço: 700 kcal → MODERADA/PESADA
- Lanche Tarde: 200 kcal → MODERADA
- Jantar: 600 kcal → MODERADA
- Ceia: 100 kcal → LEVE

Sistema filtra: 70% MODERADAS + 15% LEVES + 15% PESADAS
```

---

## 🔍 ONDE APARECE?

### **1. Admin - Pool de Refeições**

Na tabela de refeições, a coluna "Densidade" mostra:

- 🍃 **Leve** - Badge verde
- ⚖️ **Moderada** - Badge azul
- 💪 **Pesada** - Badge laranja
- ⚙️ **Auto** - Calculado automaticamente (se não foi definido manualmente)

### **2. Geração de Planos**

Quando o sistema gera um plano alimentar:

1. Calcula objetivo calórico do usuário
2. Define distribuição de densidade ideal
3. **Filtra refeições** do pool pela densidade
4. Monta o plano com refeições adequadas

---

## ⚙️ IMPLEMENTAÇÃO TÉCNICA

### **Função de Cálculo**

```typescript
function calculateMealDensity(
  calories: number, 
  mealType: string
): "light" | "moderate" | "heavy" {
  
  const thresholds = {
    cafe_manha: { light: 300, moderate: 450 },
    lanche_manha: { light: 150, moderate: 250 },
    almoco: { light: 400, moderate: 600 },
    lanche_tarde: { light: 150, moderate: 250 },
    jantar: { light: 350, moderate: 550 },
    ceia: { light: 100, moderate: 200 },
  };

  const threshold = thresholds[mealType];

  if (calories <= threshold.light) return "light";
  if (calories <= threshold.moderate) return "moderate";
  return "heavy";
}
```

### **Aplicação no Gerador**

```typescript
// Calcular densidade automaticamente
const density = calculateMealDensity(totalCalories, mealType);

// Adicionar ao objeto de refeição
const meal = {
  name: "Arroz com Feijão e Frango",
  meal_type: "almoco",
  meal_density: density,  // ← CALCULADO AUTOMATICAMENTE
  total_calories: 535,
  // ... outros campos
};
```

---

## 📊 ESTATÍSTICAS DO POOL

### **Distribuição Ideal**

Para um pool balanceado, recomenda-se:

- 🍃 **30% Leves** - Para usuários em déficit
- ⚖️ **50% Moderadas** - Para maioria dos usuários
- 💪 **20% Pesadas** - Para usuários em superávit

### **Exemplo de Pool Balanceado (100 refeições)**

```
Café da Manhã (15 refeições):
- 5 Leves (250-300 kcal)
- 7 Moderadas (350-450 kcal)
- 3 Pesadas (500+ kcal)

Almoço (25 refeições):
- 8 Leves (350-400 kcal)
- 12 Moderadas (450-600 kcal)
- 5 Pesadas (650+ kcal)

Jantar (25 refeições):
- 8 Leves (300-350 kcal)
- 12 Moderadas (400-550 kcal)
- 5 Pesadas (600+ kcal)

Lanches (30 refeições):
- 15 Leves (100-150 kcal)
- 12 Moderadas (180-250 kcal)
- 3 Pesadas (280+ kcal)

Ceia (5 refeições):
- 3 Leves (50-100 kcal)
- 2 Moderadas (120-200 kcal)
```

---

## ✅ BENEFÍCIOS DO SISTEMA

### **1. Personalização Precisa**
- ✅ Planos adaptados ao objetivo do usuário
- ✅ Controle calórico automático
- ✅ Variedade mantida

### **2. Facilidade de Gestão**
- ✅ Cálculo automático (não precisa definir manualmente)
- ✅ Visualização clara no admin
- ✅ Filtro eficiente na geração de planos

### **3. Escalabilidade**
- ✅ Funciona com qualquer quantidade de refeições
- ✅ Adapta-se a novos ingredientes automaticamente
- ✅ Suporta múltiplos países e culturas

---

## 🎯 CONCLUSÃO

O campo **densidade** é **essencial** para:

1. ✅ **Personalizar planos** baseado no objetivo do usuário
2. ✅ **Controlar calorias** de forma inteligente
3. ✅ **Filtrar refeições** adequadas para cada perfil
4. ✅ **Garantir variedade** dentro do objetivo calórico

**Status:** ✅ IMPLEMENTADO, CALCULADO AUTOMATICAMENTE E FUNCIONANDO
