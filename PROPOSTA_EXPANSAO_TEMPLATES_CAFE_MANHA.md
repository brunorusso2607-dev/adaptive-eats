# PROPOSTA: EXPANSÃO DE TEMPLATES PARA CAFÉ DA MANHÃ

## 📊 **ANÁLISE DO BANCO DE INGREDIENTES (meal-ingredients-db.ts)**

### **INGREDIENTES DISPONÍVEIS E VALIDADOS (TACO/TBCA):**

#### **CARBOIDRATOS para Café da Manhã:**
- ✅ pao_integral (253 kcal/50g)
- ✅ pao_frances (300 kcal/50g)
- ✅ pao_forma_integral (240 kcal/50g)
- ✅ tapioca (357 kcal/50g)
- ✅ aveia (394 kcal/30g)
- ✅ granola (471 kcal/30g)
- ✅ cuscuz_milho (112 kcal/100g)

**Total: 7 opções (templates atuais usam apenas 4)**

#### **PROTEÍNAS para Café da Manhã:**
- ✅ ovo_mexido (143 kcal/100g)
- ✅ ovo_cozido (155 kcal/100g)
- ✅ omelete_simples (154 kcal/100g)
- ✅ queijo_minas (264 kcal/30g)
- ✅ queijo_cottage (98 kcal/50g)
- ✅ queijo_prato (360 kcal/30g)
- ✅ queijo_mussarela (280 kcal/30g)
- ✅ ricota (138 kcal/50g)
- ✅ requeijao_light (180 kcal/30g)
- ✅ peito_peru_fatiado (104 kcal/50g)
- ✅ presunto_magro (145 kcal/30g)

**Total: 11 opções (templates atuais usam apenas 4)**

#### **FRUTAS para Café da Manhã:**
- ✅ banana_prata (89 kcal/100g)
- ✅ maca_vermelha (52 kcal/130g)
- ✅ morango (32 kcal/100g)
- ✅ mamao_papaia (43 kcal/150g)
- ✅ manga (60 kcal/150g)
- ✅ pera (57 kcal/150g)
- ✅ laranja (47 kcal/180g)
- ✅ melancia (30 kcal/200g)
- ✅ melao (29 kcal/200g)
- ✅ abacaxi (48 kcal/150g)
- ✅ goiaba (54 kcal/150g)
- ✅ uva (69 kcal/100g)
- ✅ kiwi (61 kcal/100g)
- ✅ tangerina (53 kcal/130g)
- ✅ abacate (160 kcal/100g)

**Total: 15 opções (templates atuais usam apenas 4)**

#### **LATICÍNIOS para Café da Manhã:**
- ✅ iogurte_natural (61 kcal/150g)
- ✅ iogurte_grego (97 kcal/150g)
- ✅ iogurte_desnatado (43 kcal/150g)
- ✅ iogurte_frutas (90 kcal/150g)
- ✅ leite_desnatado (35 kcal/200ml)
- ✅ leite_semidesnatado (49 kcal/200ml)
- ✅ leite_integral (61 kcal/200ml)

**Total: 7 opções (templates atuais usam apenas 2)**

#### **BEBIDAS para Café da Manhã:**
- ✅ cafe_com_leite (35 kcal/200ml)
- ✅ cafe_preto (2 kcal/200ml)
- ✅ cha_verde (1 kcal/200ml)
- ✅ cha_camomila (1 kcal/200ml)
- ✅ cha_preto (1 kcal/200ml)
- ✅ cha_erva_doce (2 kcal/200ml)
- ✅ suco_laranja_natural (45 kcal/200ml)
- ✅ agua_coco (19 kcal/200ml)

**Total: 8 opções (templates atuais usam apenas 2)**

#### **OLEAGINOSAS para Café da Manhã:**
- ✅ castanha_para (656 kcal/20g)
- ✅ castanha_caju (553 kcal/20g)
- ✅ amendoim (544 kcal/20g)
- ✅ nozes (654 kcal/20g)

**Total: 4 opções (templates atuais usam todas)**

#### **ADOÇANTES/COMPLEMENTOS:**
- ✅ mel (304 kcal/20g)
- ✅ coco_ralado (354 kcal/20g)
- ✅ chia (486 kcal/10g)
- ✅ linhaca (495 kcal/10g)

**Total: 4 opções**

---

## 🎯 **PROPOSTA DE EXPANSÃO DOS TEMPLATES EXISTENTES**

### **TEMPLATE 1: Pão com Proteína e Fruta**

**ANTES:**
```typescript
carb: ["pao_integral", "pao_frances", "pao_forma_integral"] // 3 opções
protein: ["ovo_mexido", "ovo_cozido", "queijo_minas", "peito_peru_fatiado"] // 4 opções
fruit: ["banana_prata", "maca_vermelha", "mamao_papaia", "morango"] // 4 opções
beverage: ["cafe_com_leite", "cafe_preto"] // 2 opções
```

**DEPOIS (PROPOSTA):**
```typescript
carb: [
  "pao_integral", "pao_frances", "pao_forma_integral"
] // Manter 3 (suficiente)

protein: [
  "ovo_mexido", "ovo_cozido", "omelete_simples",
  "queijo_minas", "queijo_cottage", "ricota", "requeijao_light",
  "peito_peru_fatiado", "presunto_magro"
] // 9 opções (de 11 disponíveis)

fruit: [
  "banana_prata", "maca_vermelha", "mamao_papaia", "morango",
  "pera", "laranja", "tangerina", "kiwi"
] // 8 opções (de 15 disponíveis)

beverage: [
  "cafe_com_leite", "cafe_preto", "cha_verde", "suco_laranja_natural"
] // 4 opções (de 8 disponíveis)
```

**Combinações:**
- ANTES: 3 × 4 × 4 × 2 = 96 combinações
- DEPOIS: 3 × 9 × 8 × 4 = **864 combinações** (9x mais!)

---

### **TEMPLATE 2: Tapioca com Recheio**

**ANTES:**
```typescript
carb: ["tapioca"] // 1 opção
filling: ["queijo_minas", "queijo_cottage", "peito_peru_fatiado"] // 3 opções
beverage: ["cafe_com_leite", "cafe_preto"] // 2 opções
```

**DEPOIS (PROPOSTA):**
```typescript
carb: ["tapioca"] // Manter 1

filling: [
  "queijo_minas", "queijo_cottage", "ricota",
  "peito_peru_fatiado", "presunto_magro",
  "ovo_mexido", "queijo_mussarela"
] // 7 opções (de 11 disponíveis)

beverage: [
  "cafe_com_leite", "cafe_preto", "cha_verde", "suco_laranja_natural"
] // 4 opções
```

**Combinações:**
- ANTES: 1 × 3 × 2 = 6 combinações
- DEPOIS: 1 × 7 × 4 = **28 combinações** (4.6x mais!)

---

### **TEMPLATE 3: Iogurte com Fruta e Topping**

**ANTES:**
```typescript
dairy: ["iogurte_natural", "iogurte_grego"] // 2 opções
fruit: ["banana_prata", "morango", "mamao_papaia", "manga"] // 4 opções
topping: ["aveia", "granola"] // 2 opções
```

**DEPOIS (PROPOSTA):**
```typescript
dairy: [
  "iogurte_natural", "iogurte_grego", "iogurte_desnatado"
] // 3 opções (de 4 disponíveis)

fruit: [
  "banana_prata", "morango", "mamao_papaia", "manga",
  "pera", "kiwi", "uva", "abacaxi"
] // 8 opções (de 15 disponíveis)

topping: [
  "aveia", "granola", "mel", "castanha_para", "castanha_caju",
  "amendoim", "nozes", "coco_ralado", "chia"
] // 9 opções (de 8 disponíveis)
```

**Combinações:**
- ANTES: 2 × 4 × 2 = 16 combinações
- DEPOIS: 3 × 8 × 9 = **216 combinações** (13.5x mais!)

---

### **TEMPLATE 4: Cuscuz com Proteína**

**ANTES:**
```typescript
carb: ["cuscuz_milho"] // 1 opção
protein: ["ovo_mexido", "ovo_cozido", "queijo_minas"] // 3 opções
beverage: ["cafe_com_leite", "cafe_preto"] // 2 opções
```

**DEPOIS (PROPOSTA):**
```typescript
carb: ["cuscuz_milho"] // Manter 1

protein: [
  "ovo_mexido", "ovo_cozido", "omelete_simples",
  "queijo_minas", "queijo_cottage", "ricota",
  "peito_peru_fatiado", "presunto_magro"
] // 8 opções (de 11 disponíveis)

beverage: [
  "cafe_com_leite", "cafe_preto", "cha_verde", "suco_laranja_natural"
] // 4 opções
```

**Combinações:**
- ANTES: 1 × 3 × 2 = 6 combinações
- DEPOIS: 1 × 8 × 4 = **32 combinações** (5.3x mais!)

---

## 📊 **RESUMO DA EXPANSÃO**

| Template | Combinações ANTES | Combinações DEPOIS | Aumento |
|----------|-------------------|---------------------|---------|
| Pão + Proteína + Fruta | 96 | 864 | 9x |
| Tapioca | 6 | 28 | 4.6x |
| Iogurte + Fruta | 16 | 216 | 13.5x |
| Cuscuz | 6 | 32 | 5.3x |
| **TOTAL** | **124** | **1.140** | **9.2x** |

---

## ✅ **VALIDAÇÃO CULTURAL**

Todas as combinações propostas são **culturalmente comuns no Brasil**:

✅ Pão com ovo e fruta (comum)
✅ Pão com queijo e fruta (comum)
✅ Pão com peru e fruta (comum)
✅ Tapioca com queijo (comum)
✅ Tapioca com ovo (comum)
✅ Iogurte com frutas e granola (comum)
✅ Iogurte com mel (comum)
✅ Cuscuz com ovo (comum - Nordeste)
✅ Cuscuz com queijo (comum - Nordeste)

---

## 🎯 **RESULTADO ESPERADO**

Com 1.140 combinações válidas e validações rejeitando 90%:
```
1.140 × 10% = ~114 combinações aprovadas
```

**Para gerar 20 refeições: SUFICIENTE! ✅**

---

## 📋 **PRÓXIMOS PASSOS**

1. **Você revisa esta proposta**
2. **Aprova ou sugere ajustes**
3. **Eu implemento as mudanças**
4. **Testamos geração de 20 refeições**

---

**Aguardando sua aprovação para implementar esta expansão!**
