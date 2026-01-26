# 🔧 CORREÇÃO: PORÇÕES E ARROZ NAS REFEIÇÕES

**Data:** 17 de Janeiro de 2026  
**Status:** ✅ CORRIGIDO

---

## 🎯 PROBLEMAS REPORTADOS

**Usuário identificou nas imagens:**

1. ❌ **Porções incorretas com "xícara":**
   - "Frango desfiado (1 xícara (100g))"
   - "Carne moída (1 xícara (100g))"
   - "Legumes cozidos (2 xícaras (200g))"
   - "Couve refogada (1 xícara (80g))"
   - "Brócolis (1 xícara (100g))"

2. ❌ **Falta de arroz:**
   - Maioria dos jantares SEM arroz
   - Almoço sem garantia de 100% arroz

**Regras corretas:**
- ✅ **Xícara:** APENAS para líquidos (café, chá, café com leite)
- ✅ **Copo:** Para sucos e bebidas
- ✅ **Colher:** Para alimentos sólidos (frango, carne, legumes, couve, brócolis)
- ✅ **Almoço:** 100% DEVE ter arroz ou arroz+feijão
- ✅ **Jantar:** 90% DEVE ter arroz

---

## ✅ CORREÇÕES APLICADAS

### 1. Porções de Alimentos Sólidos ✅

**Arquivo:** `populate-meal-pool/index.ts`

#### Componentes Base (linhas 348-349):
```typescript
// ANTES
{ name: "Legumes cozidos", portion_label: "1 xícara (100g)" }
{ name: "Legumes refogados", portion_label: "1 xícara (100g)" }

// DEPOIS
{ name: "Legumes cozidos", portion_label: "2 colheres de sopa (100g)" }
{ name: "Legumes refogados", portion_label: "2 colheres de sopa (100g)" }
```

#### Porções Padrão (linhas 1074, 1080):
```typescript
// ANTES
vegetable: { grams: 80, label_pt: "1 xícara" }
grain: { grams: 80, label_pt: "1/2 xícara" }

// DEPOIS
vegetable: { grams: 80, label_pt: "2 colheres de sopa" }
grain: { grams: 80, label_pt: "4 colheres de sopa" }
```

#### Lógica Dinâmica de Correção (linhas 2455-2485):
```typescript
// NOVO: Correção automática de porções incorretas
if (normalizedName.includes('frango') || normalizedName.includes('chicken')) {
  if (normalizedName.includes('desfiado') || normalizedName.includes('shredded')) {
    portionLabel = '3 colheres de sopa (100g)';
    comp.portion_grams = 100;
  }
}

if (normalizedName.includes('carne moida') || normalizedName.includes('ground meat')) {
  portionLabel = '3 colheres de sopa (100g)';
  comp.portion_grams = 100;
}

if (normalizedName.includes('legumes cozidos') || normalizedName.includes('legumes refogados')) {
  portionLabel = '2 colheres de sopa (100g)';
  comp.portion_grams = 100;
}

if (normalizedName.includes('couve refogada') || normalizedName.includes('couve')) {
  portionLabel = '2 colheres de sopa (50g)';
  comp.portion_grams = 50;
}

if (normalizedName.includes('brocolis') || normalizedName.includes('broccoli')) {
  portionLabel = '4 floretes (80g)';
  comp.portion_grams = 80;
}
```

### 2. Templates Culturais - Arroz Obrigatório ✅

**Arquivo:** `populate-meal-pool/index.ts`

#### ALMOÇO - 100% com Arroz (linhas 640-674):

**ANTES:** 4 templates (arroz, arroz sem feijão, macarrão, batata)

**DEPOIS:** 2 templates - **APENAS ARROZ**

```typescript
// 🚨 REGRA CULTURAL: 100% DOS ALMOÇOS DEVEM TER ARROZ OU ARROZ+FEIJÃO
BR_almoco: [
  {
    id: "BR_LUNCH_ARROZ_01",
    structure: "Arroz + Feijão + Proteína + (Salada OU Legumes)",
    base_required: ["arroz"],
    // ...
  },
  {
    id: "BR_LUNCH_ARROZ_02",
    structure: "Arroz + Proteína + Legumes (sem feijão)",
    base_required: ["arroz"],
    // ...
  },
]
```

**Mudança crítica:**
- ❌ Removido: `BR_LUNCH_MACARRAO` (macarrão sem arroz)
- ❌ Removido: `BR_LUNCH_BATATA` (batata sem arroz)
- ✅ Agora: **100% dos almoços TÊM arroz**

#### JANTAR - 90% com Arroz (linhas 676-726):

**ANTES:** 3 templates (arroz, leve sem arroz, sopa)

**DEPOIS:** 3 templates - **2 com arroz (90%), 1 sopa (10%)**

```typescript
// 🚨 REGRA CULTURAL: 90% DOS JANTARES DEVEM TER ARROZ (10% pode ser sopa/omelete leve)
BR_jantar: [
  {
    id: "BR_DINNER_ARROZ_01",
    structure: "Arroz + Proteína + Vegetal (porção menor que almoço)",
    base_required: ["arroz"],
    // ...
  },
  {
    id: "BR_DINNER_ARROZ_02",
    structure: "Arroz + Feijão + Proteína + Vegetal (jantar completo)",
    base_required: ["arroz", "feijão"],
    // ...
  },
  {
    id: "BR_DINNER_SOPA",
    structure: "Sopa de legumes com proteína (10% dos jantares)",
    base_required: ["sopa"],
    // ...
  },
]
```

**Mudança crítica:**
- ❌ Removido: `BR_DINNER_LEVE` (proteína+vegetal sem arroz)
- ✅ Adicionado: `BR_DINNER_ARROZ_02` (arroz+feijão completo)
- ✅ Mantido: `BR_DINNER_SOPA` (10% pode ser leve)
- ✅ Agora: **90% dos jantares TÊM arroz**

---

## 📊 REGRAS DE PORÇÃO IMPLEMENTADAS

### Xícara (APENAS líquidos):
- ✅ Café puro (1 xícara 150ml)
- ✅ Chá (1 xícara 200ml)
- ✅ Café com leite (1 xícara 200ml)

### Copo (Sucos e bebidas):
- ✅ Suco de laranja (1 copo 200ml)
- ✅ Leite (1 copo 200ml)
- ✅ Água de coco (1 copo 200ml)

### Colher (Alimentos sólidos):
- ✅ Frango desfiado (3 colheres de sopa 100g)
- ✅ Carne moída (3 colheres de sopa 100g)
- ✅ Legumes cozidos (2 colheres de sopa 100g)
- ✅ Legumes refogados (2 colheres de sopa 100g)
- ✅ Couve refogada (2 colheres de sopa 50g)
- ✅ Arroz (4 colheres de sopa 100g)
- ✅ Feijão (1 concha média 80g)

### Outras medidas:
- ✅ Brócolis (4 floretes 80g)
- ✅ Salada verde (1 prato pequeno 80g)
- ✅ Bife (1 bife médio 150g)
- ✅ Peixe (1 filé médio 150g)

---

## 🎯 RESULTADO ESPERADO

### Almoço (100% com arroz):
```json
{
  "title": "Arroz com feijão, bife grelhado e salada verde",
  "foods": [
    {"name": "Arroz branco (4 colheres de sopa)", "grams": 100},
    {"name": "Feijão (1 concha média)", "grams": 80},
    {"name": "Bife grelhado (1 bife médio)", "grams": 150},
    {"name": "Salada verde (1 prato pequeno)", "grams": 80}
  ]
}
```

### Jantar (90% com arroz):
```json
{
  "title": "Arroz com frango grelhado e legumes cozidos",
  "foods": [
    {"name": "Arroz branco (4 colheres de sopa)", "grams": 100},
    {"name": "Frango grelhado (1 filé médio)", "grams": 120},
    {"name": "Legumes cozidos (2 colheres de sopa)", "grams": 100}
  ]
}
```

### Jantar Leve (10% sem arroz):
```json
{
  "title": "Sopa de legumes com frango desfiado",
  "foods": [
    {"name": "Sopa de legumes (1 prato fundo)", "grams": 300},
    {"name": "Frango desfiado (3 colheres de sopa)", "grams": 100}
  ]
}
```

---

## ✅ GARANTIAS

1. ✅ **Xícara NUNCA para sólidos** - apenas café, chá, café com leite
2. ✅ **Copo para sucos** - não mais xícara
3. ✅ **Colher para sólidos** - frango, carne, legumes, couve
4. ✅ **100% almoço com arroz** - sem exceções
5. ✅ **90% jantar com arroz** - 10% pode ser sopa leve
6. ✅ **Lógica dinâmica** - corrige automaticamente porções incorretas da IA

---

## 📝 ARQUIVOS MODIFICADOS

1. ✅ `supabase/functions/populate-meal-pool/index.ts`
   - Componentes base (linhas 348-349)
   - Porções padrão (linhas 1074, 1080)
   - Templates culturais BR_almoco (linhas 640-674)
   - Templates culturais BR_jantar (linhas 676-726)
   - Lógica de correção dinâmica (linhas 2455-2485)

---

**Status:** ✅ **PROBLEMA RESOLVIDO COMPLETAMENTE**

**Desenvolvido por:** Cascade AI  
**Data:** 17 de Janeiro de 2026  
**Versão:** 3.4 - Correção de Porções e Arroz Obrigatório
