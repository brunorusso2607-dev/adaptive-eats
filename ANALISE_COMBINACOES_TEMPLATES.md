# ANÁLISE: COMBINAÇÕES POSSÍVEIS POR TIPO DE REFEIÇÃO

## 📊 CÁLCULO DE COMBINAÇÕES POSSÍVEIS

### **CAFÉ DA MANHÃ (cafe_manha)**

#### Template 1: cafe_pao_proteina
- carb: 2 opções (pão integral, pão francês)
- protein: 4 opções (ovo mexido, omelete, queijo minas, ricota)
- fruit: 10 opções
- beverage: 5 opções
**Combinações: 2 × 4 × 10 × 5 = 400**

#### Template 2: cafe_pao_forma_cottage_requeijao
- carb: 1 opção (pão de forma)
- protein: 2 opções (cottage, requeijão)
- fruit: 10 opções
- beverage: 5 opções
**Combinações: 1 × 2 × 10 × 5 = 100**

#### Template 3: cafe_tapioca
- carb: 1 opção (tapioca)
- filling: 5 opções
- beverage: 4 opções
**Combinações: 1 × 5 × 4 = 20**

#### Template 4: cafe_iogurte
- dairy: 3 opções
- fruit: 9 opções
- topping: 10 opções
**Combinações: 3 × 9 × 10 = 270**

#### Template 5: cafe_cuscuz
- carb: 1 opção (cuscuz)
- protein: 6 opções
- beverage: 4 opções
**Combinações: 1 × 6 × 4 = 24**

**TOTAL CAFÉ DA MANHÃ: 814 combinações** ✅ BOM

---

### **LANCHE DA MANHÃ (lanche_manha)** ✅ EXPANDIDO

#### Template 1: lanche_fruta_nuts
- fruit: 15 opções
- nuts: 6 opções
**Combinações: 15 × 6 = 90**

#### Template 2: lanche_iogurte
- dairy: 3 opções
- fruit: 13 opções
**Combinações: 3 × 13 = 39**

#### Template 3: lanche_iogurte_granola
- dairy: 3 opções
- topping: 5 opções
**Combinações: 3 × 5 = 15**

#### Template 4: lanche_fruta_simples
- fruit: 10 opções
**Combinações: 10**

#### Template 5: lanche_batata_doce
- carb: 2 opções
**Combinações: 2**

**TOTAL LANCHE DA MANHÃ: 156 combinações** ✅ BOM (expandido)

---

### **ALMOÇO (almoco)**

#### Template 1: almoco_arroz_feijao_proteina
- carb: 3 opções (arroz branco, integral, parboilizado)
- legume: 2 opções (feijão, lentilha)
- protein: 16 opções (frango, carne, peixe)
- vegetables: 24 opções (escolhe 2)
- fat: 2 opções
**Combinações: 3 × 2 × 16 × (24×23/2) × 2 = 26,496** ✅ EXCELENTE

#### Template 2: almoco_batata_proteina
- carb: 6 opções (batata doce, inglesa, mandioca, purê)
- protein: 10 opções
- vegetables: 13 opções (escolhe 2)
- fat: 1 opção
**Combinações: 6 × 10 × (13×12/2) × 1 = 4,680** ✅ BOM

#### Template 3: almoco_macarrao
- carb: 2 opções (macarrão integral, comum)
- protein: 5 opções
- vegetables: 6 opções (opcional)
**Combinações: 2 × 5 × 7 = 70** ⚠️ BAIXO

**TOTAL ALMOÇO: 31,246 combinações** ✅ EXCELENTE

---

### **LANCHE DA TARDE (lanche_tarde)** ❌ PRECISA EXPANSÃO

#### Template 1: lanche_pao_queijo
- carb: 2 opções (pão integral, francês)
- filling: 3 opções (queijo minas, ricota, atum)
- beverage: 5 opções (café, chás)
**Combinações: 2 × 3 × 5 = 30** ❌ MUITO BAIXO

#### Template 2: lanche_pao_forma_cottage_requeijao
- carb: 1 opção (pão de forma)
- filling: 2 opções (cottage, requeijão)
- beverage: 5 opções
**Combinações: 1 × 2 × 5 = 10** ❌ MUITO BAIXO

#### Template 3: lanche_tapioca
- carb: 1 opção (tapioca)
- filling: 5 opções
**Combinações: 1 × 5 = 5** ❌ MUITO BAIXO

#### Template 4: lanche_iogurte_fruta
- dairy: 3 opções
- fruit: 8 opções
**Combinações: 3 × 8 = 24** ❌ MUITO BAIXO

**TOTAL LANCHE DA TARDE: 69 combinações** ❌ CRÍTICO - PRECISA EXPANSÃO

---

### **JANTAR (jantar)**

#### Template 1: jantar_arroz_feijao
- carb: 2 opções (arroz branco, integral)
- legume: 2 opções (feijão, lentilha)
- protein: 12 opções
- vegetables: 13 opções (escolhe 2)
**Combinações: 2 × 2 × 12 × (13×12/2) = 3,744** ✅ BOM

#### Template 2: jantar_batata_proteina
- carb: 4 opções (batata doce, mandioca, purê)
- protein: 7 opções
- vegetables: 10 opções (escolhe 2)
**Combinações: 4 × 7 × (10×9/2) = 1,260** ✅ BOM

**TOTAL JANTAR: 5,004 combinações** ✅ BOM

---

### **CEIA (ceia)** ❌ PRECISA EXPANSÃO

#### Template 1: ceia_iogurte
- dairy: 5 opções
**Combinações: 5** ❌ MUITO BAIXO

#### Template 2: ceia_fruta_leite
- fruit: 5 opções
- dairy: 4 opções
**Combinações: 5 × 4 = 20** ❌ MUITO BAIXO

#### Template 3: ceia_cha
- beverage: 4 opções
**Combinações: 4** ❌ MUITO BAIXO

**TOTAL CEIA: 29 combinações** ❌ CRÍTICO - PRECISA EXPANSÃO

---

## 🎯 RESUMO GERAL

| Tipo de Refeição | Combinações | Status |
|------------------|-------------|--------|
| Café da Manhã | 814 | ✅ BOM |
| **Lanche da Manhã** | **156** | ✅ **EXPANDIDO** |
| Almoço | 31,246 | ✅ EXCELENTE |
| **Lanche da Tarde** | **69** | ❌ **CRÍTICO** |
| Jantar | 5,004 | ✅ BOM |
| **Ceia** | **29** | ❌ **CRÍTICO** |

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### **1. LANCHE DA TARDE - 69 combinações (CRÍTICO)**
- Poucas opções de recheios
- Poucas opções de frutas
- Falta variedade de snacks

### **2. CEIA - 29 combinações (CRÍTICO)**
- Muito limitado
- Apenas laticínios e chás
- Falta opções de frutas e snacks leves

---

## ✅ SOLUÇÕES RECOMENDADAS

### **EXPANDIR LANCHE DA TARDE:**

1. **Adicionar mais frutas nos templates**
2. **Adicionar template de fruta + oleaginosa** (como lanche da manhã)
3. **Adicionar mais opções de recheios**
4. **Adicionar template de vitamina/smoothie**
5. **Adicionar template de biscoito integral + queijo**

### **EXPANDIR CEIA:**

1. **Adicionar mais frutas**
2. **Adicionar oleaginosas**
3. **Adicionar template de chá + biscoito integral**
4. **Adicionar template de fruta simples**
5. **Adicionar mais opções de laticínios**

---

## 📋 IMPLEMENTAÇÃO NECESSÁRIA

**Prioridade ALTA:**
1. ✅ Lanche da Manhã - JÁ EXPANDIDO (156 combinações)
2. ❌ Lanche da Tarde - PRECISA EXPANSÃO (69 → 200+ combinações)
3. ❌ Ceia - PRECISA EXPANSÃO (29 → 100+ combinações)

**Prioridade MÉDIA:**
- Almoço e Jantar já têm muitas combinações
- Café da Manhã está bom

---

**CONCLUSÃO:** Lanche da Tarde e Ceia precisam urgentemente de expansão para evitar saturação do pool.
