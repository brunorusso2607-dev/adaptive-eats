# ANÁLISE: ALIMENTOS FALTANTES DA TACO NOS TEMPLATES

## 📊 **COMPARAÇÃO: meal-ingredients-db.ts vs Templates**

### **ALIMENTOS DISPONÍVEIS NO BANCO (meal-ingredients-db.ts):**

#### **✅ PROTEÍNAS JÁ NO BANCO (27 opções):**
**Aves:**
- frango_peito_grelhado ✅ (usado)
- frango_coxa_assada ✅ (usado)
- frango_desfiado ✅ (usado)
- sobrecoxa_assada ✅ (usado)
- frango_passarinho ❌ (NÃO usado)

**Carnes Bovinas:**
- bife_alcatra_grelhado ✅ (usado)
- bife_patinho_grelhado ✅ (usado)
- bife_alcatra_acebolado ✅ (usado)
- carne_moida_refogada ✅ (usado)
- file_mignon_grelhado ✅ (usado)
- picanha_grelhada ✅ (usado)
- costela_assada ❌ (NÃO usado - muito calórico)
- carne_panela ✅ (usado)
- figado_bovino ❌ (NÃO usado - controverso)

**Peixes:**
- tilapia_grelhada ✅ (usado)
- salmao_grelhado ✅ (usado)
- pescada_grelhada ✅ (usado)
- merluza_assada ✅ (usado)
- atum_lata ✅ (usado)
- sardinha_lata ✅ (usado)
- bacalhau_cozido ❌ (NÃO usado)
- camarao_grelhado ❌ (NÃO usado)

**Ovos:**
- ovo_mexido ✅ (usado)
- ovo_cozido ✅ (usado)
- omelete_simples ✅ (usado)

**Embutidos:**
- peito_peru_fatiado ✅ (usado)
- presunto_magro ✅ (usado)

**Leguminosas:**
- lentilha_cozida ❌ (NÃO usado)

---

#### **✅ CARBOIDRATOS JÁ NO BANCO (16 opções):**
**Arroz:**
- arroz_branco ✅ (usado)
- arroz_integral ✅ (usado)
- arroz_parboilizado ✅ (usado)

**Batatas:**
- batata_doce_cozida ✅ (usado)
- batata_doce_assada ✅ (usado)
- batata_inglesa_cozida ✅ (usado)
- batata_inglesa_assada ✅ (usado)
- pure_batata ❌ (NÃO usado)
- mandioca_cozida ✅ (usado)

**Pães:**
- pao_integral ✅ (usado)
- pao_frances ✅ (usado)
- pao_forma_integral ✅ (usado)

**Outros:**
- tapioca ✅ (usado)
- aveia ✅ (usado)
- granola ✅ (usado)
- cuscuz_milho ✅ (usado)
- macarrao_integral ✅ (usado)
- macarrao_comum ✅ (usado)
- farofa ❌ (NÃO usado)
- polenta ❌ (NÃO usado)
- nhoque ❌ (NÃO usado)

---

#### **✅ VEGETAIS JÁ NO BANCO (30 opções):**
**Folhas:**
- alface_americana ✅ (usado)
- alface_crespa ✅ (usado)
- rucula ✅ (usado)
- agriao ✅ (usado)
- espinafre_refogado ✅ (usado)
- couve_refogada ✅ (usado)

**Legumes Cozidos:**
- brocolis_cozido ✅ (usado)
- couve_flor_cozida ✅ (usado)
- cenoura_cozida ✅ (usado)
- abobrinha_refogada ✅ (usado)
- vagem_cozida ✅ (usado)
- abobora_cozida ✅ (usado)
- chuchu_cozido ✅ (usado)
- quiabo_refogado ✅ (usado)
- berinjela_refogada ✅ (usado)
- beterraba_cozida ✅ (usado)
- maxixe_refogado ❌ (NÃO usado)
- jilo_refogado ❌ (NÃO usado)
- repolho_refogado ✅ (usado)
- acelga_refogada ❌ (NÃO usado)

**Salada Crua:**
- tomate ✅ (usado)
- pepino ✅ (usado)
- pimentao_verde ✅ (usado)
- pimentao_vermelho ✅ (usado)
- pimentao_amarelo ✅ (usado)
- cenoura_ralada ❌ (NÃO usado - marcado como garnish)

**Temperos:**
- cebola_refogada ❌ (NÃO usado - marcado como seasoning)
- alho_refogado ❌ (NÃO usado - marcado como seasoning)
- cheiro_verde ❌ (NÃO usado - marcado como seasoning)

---

#### **✅ FRUTAS JÁ NO BANCO (17 opções):**
- banana_prata ✅ (usado)
- maca_vermelha ✅ (usado)
- morango ✅ (usado)
- mamao_papaia ✅ (usado)
- manga ✅ (usado)
- pera ✅ (usado)
- laranja ✅ (usado)
- melancia ❌ (NÃO usado)
- melao ✅ (usado)
- abacaxi ✅ (usado)
- goiaba ❌ (NÃO usado)
- uva ✅ (usado)
- kiwi ✅ (usado)
- tangerina ✅ (usado)
- abacate ❌ (NÃO usado - muito calórico)
- acai_polpa ❌ (NÃO usado)

---

#### **✅ LATICÍNIOS JÁ NO BANCO (13 opções):**
- iogurte_natural ✅ (usado)
- iogurte_grego ✅ (usado)
- iogurte_desnatado ✅ (usado)
- iogurte_frutas ❌ (NÃO usado)
- queijo_minas ✅ (usado)
- queijo_cottage ✅ (usado)
- queijo_prato ❌ (NÃO usado - muito calórico)
- queijo_mussarela ✅ (usado)
- ricota ✅ (usado)
- requeijao_light ✅ (usado)
- leite_desnatado ✅ (usado)
- leite_semidesnatado ✅ (usado)
- leite_integral ❌ (NÃO usado - preferir desnatado)

---

#### **✅ BEBIDAS JÁ NO BANCO (9 opções):**
- cafe_com_leite ✅ (usado)
- cafe_preto ✅ (usado)
- cha_verde ✅ (usado)
- cha_camomila ✅ (usado)
- cha_preto ✅ (usado)
- cha_erva_doce ✅ (usado)
- suco_laranja_natural ✅ (usado)
- suco_limao ❌ (NÃO usado)
- agua_coco ❌ (NÃO usado)
- vitamina_banana ❌ (NÃO usado - já temos iogurte com fruta)

---

#### **✅ OLEAGINOSAS JÁ NO BANCO (4 opções):**
- castanha_para ✅ (usado)
- castanha_caju ✅ (usado)
- amendoim ✅ (usado)
- nozes ✅ (usado)

---

#### **✅ COMPLEMENTOS JÁ NO BANCO (7 opções):**
- mel ✅ (usado)
- coco_ralado ✅ (usado)
- chia ✅ (usado)
- linhaca ❌ (NÃO usado)
- gergelim ❌ (NÃO usado)
- azeite_oliva ✅ (usado)
- azeite_extra_virgem ✅ (usado)

---

## 🎯 **ALIMENTOS IMPORTANTES FALTANDO NOS TEMPLATES:**

### **ALTA PRIORIDADE (adicionar agora):**

1. **bacalhau_cozido** - Proteína importante, especialmente para jantar
2. **camarao_grelhado** - Proteína nobre, variedade
3. **lentilha_cozida** - Leguminosa importante, alternativa ao feijão
4. **pure_batata** - Carboidrato comum em jantares
5. **goiaba** - Fruta brasileira importante
6. **melancia** - Fruta refrescante, comum
7. **abacate** - Gordura boa, comum no Brasil
8. **agua_coco** - Bebida brasileira típica
9. **linhaca** - Topping saudável para iogurte
10. **gergelim** - Topping para saladas

### **MÉDIA PRIORIDADE (considerar):**

11. **frango_passarinho** - Preparação popular
12. **maxixe_refogado** - Vegetal regional (Nordeste)
13. **jilo_refogado** - Vegetal regional
14. **acelga_refogada** - Folha verde nutritiva
15. **acai_polpa** - Fruta brasileira típica
16. **farofa** - Acompanhamento brasileiro
17. **polenta** - Carboidrato alternativo
18. **iogurte_frutas** - Variação de iogurte

### **BAIXA PRIORIDADE (opcional):**

19. **costela_assada** - Muito calórico (290 kcal)
20. **figado_bovino** - Controverso (nem todos gostam)
21. **nhoque** - Massa específica
22. **cenoura_ralada** - Já temos cenoura cozida
23. **cebola_refogada** - Tempero (não prato principal)
24. **alho_refogado** - Tempero (não prato principal)
25. **cheiro_verde** - Tempero (não prato principal)

---

## 📋 **RECOMENDAÇÃO: NOVA RODADA DE EXPANSÃO**

### **Adicionar aos templates:**

#### **ALMOÇO/JANTAR:**
- bacalhau_cozido (proteína)
- camarao_grelhado (proteína)
- lentilha_cozida (leguminosa - alternativa ao feijão)
- pure_batata (carboidrato)
- maxixe_refogado (vegetal)
- jilo_refogado (vegetal)
- acelga_refogada (vegetal)

#### **CAFÉ DA MANHÃ:**
- goiaba (fruta)
- melancia (fruta)
- abacate (fruta/gordura)
- agua_coco (bebida)
- linhaca (topping)
- gergelim (topping)

#### **LANCHE DA MANHÃ/TARDE:**
- goiaba (fruta)
- melancia (fruta)
- acai_polpa (fruta)

---

## 📊 **IMPACTO DA NOVA RODADA:**

| Categoria | Atual | +Nova Rodada | Total |
|-----------|-------|--------------|-------|
| Proteínas | 17 | +3 | 20 |
| Carboidratos | 7 | +1 | 8 |
| Vegetais | 21 | +3 | 24 |
| Frutas | 10 | +4 | 14 |
| Bebidas | 4 | +1 | 5 |
| Toppings | 9 | +2 | 11 |

**Combinações totais:** 26.648 → **~45.000** (+70%)

---

## ✅ **CONCLUSÃO:**

**SIM, ainda temos alimentos importantes da TACO que não foram incluídos!**

**Recomendo adicionar 14 alimentos de ALTA/MÉDIA prioridade na nova rodada.**

---

**Aguardando aprovação para implementar a nova rodada de expansão.**
