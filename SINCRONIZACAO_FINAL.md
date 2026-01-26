# ✅ SINCRONIZAÇÃO INGREDIENT_POOL ↔ MEAL-INGREDIENTS-DB.TS

## 📊 SITUAÇÃO ATUAL (23/01/2026)

### **Banco de Dados (Supabase)**
- ✅ **180 ingredientes totais** (170 base + 10 alternativos)
- ✅ Migration `20260123_add_36_common_ingredients.sql` executada com sucesso
- ✅ Migration `20260123_update_ingredient_categories.sql` executada com sucesso
- ✅ Todas as categorias definidas

### **Código TypeScript (meal-ingredients-db.ts)**
- ⚠️ **~140 ingredientes** (parcialmente sincronizado)
- ❌ **~30 ingredientes ainda faltando** no código
- ✅ Estrutura base correta
- ✅ Seções comentadas organizadas

---

## 🎯 INGREDIENTES ADICIONADOS COM SUCESSO

### **Proteínas (10 ingredientes)**
- ✅ chickpeas, tofu
- ✅ beef_chuck, beef_rump_steak
- ✅ pork_loin, pork_chop
- ✅ turkey_breast, tuna_steak

### **Carboidratos (5 ingredientes)**
- ✅ yam, rice_noodles, sweet_corn
- ✅ plantain, barley

### **Leguminosas (1 ingrediente)**
- ✅ black_beans

---

## ❌ INGREDIENTES AINDA FALTANDO (~24)

### **Vegetais (3)**
- ❌ boiled_asparagus
- ❌ sauteed_mushroom
- ❌ radish

### **Frutas (8)**
- ❌ peach, plum, fig
- ❌ blueberry, raspberry, blackberry
- ❌ cherry, passion_fruit

### **Laticínios (3)**
- ❌ butter
- ❌ parmesan_cheese
- ❌ cheddar_cheese

### **Bebidas (5)**
- ❌ apple_juice
- ❌ grape_juice
- ❌ tomato_juice
- ❌ ginger_tea
- ❌ peppermint_tea

### **Gorduras/Sementes (5)**
- ❌ almonds
- ❌ olives
- ❌ sunflower_seeds
- ❌ pumpkin_seeds

---

## 🔧 PRÓXIMOS PASSOS PARA COMPLETAR

### **OPÇÃO 1: Adicionar Manualmente (Recomendado)**

Abra `c:\adaptive-eats-main\supabase\functions\_shared\meal-ingredients-db.ts` e adicione os ingredientes faltantes nas seções corretas:

**1. Após linha 152 (VEGETAIS - LEGUMES COZIDOS), adicione:**
```typescript
  boiled_asparagus: { kcal: 20, prot: 2.2, carbs: 3.9, fat: 0.1, fiber: 2, portion: 80, contains: [], display_name_pt: "Aspargos cozidos", display_name_en: "Boiled asparagus", display_name_es: "Espárragos cocidos" },
  sauteed_mushroom: { kcal: 22, prot: 3.1, carbs: 3.3, fat: 0.3, fiber: 1, portion: 80, contains: [], display_name_pt: "Cogumelos refogados", display_name_en: "Sautéed mushrooms", display_name_es: "Champiñones salteados" },
  radish: { kcal: 16, prot: 0.7, carbs: 3.4, fat: 0.1, fiber: 1.6, portion: 50, contains: [], display_name_pt: "Rabanete", display_name_en: "Radish", display_name_es: "Rábano" },
```

**2. Após linha 181 (FRUTAS), adicione:**
```typescript
  peach: { kcal: 39, prot: 0.9, carbs: 9.5, fat: 0.3, fiber: 1.5, portion: 150, contains: [], display_name_pt: "Pêssego", display_name_en: "Peach", display_name_es: "Durazno" },
  plum: { kcal: 46, prot: 0.7, carbs: 11.4, fat: 0.3, fiber: 1.4, portion: 100, contains: [], display_name_pt: "Ameixa", display_name_en: "Plum", display_name_es: "Ciruela" },
  fig: { kcal: 74, prot: 0.8, carbs: 19.2, fat: 0.3, fiber: 2.9, portion: 100, contains: [], display_name_pt: "Figo", display_name_en: "Fig", display_name_es: "Higo" },
  blueberry: { kcal: 57, prot: 0.7, carbs: 14.5, fat: 0.3, fiber: 2.4, portion: 100, contains: [], display_name_pt: "Mirtilo", display_name_en: "Blueberry", display_name_es: "Arándano" },
  raspberry: { kcal: 52, prot: 1.2, carbs: 11.9, fat: 0.7, fiber: 6.5, portion: 100, contains: [], display_name_pt: "Framboesa", display_name_en: "Raspberry", display_name_es: "Frambuesa" },
  blackberry: { kcal: 43, prot: 1.4, carbs: 9.6, fat: 0.5, fiber: 5.3, portion: 100, contains: [], display_name_pt: "Amora", display_name_en: "Blackberry", display_name_es: "Mora" },
  cherry: { kcal: 63, prot: 1.1, carbs: 16, fat: 0.2, fiber: 2.1, portion: 100, contains: [], display_name_pt: "Cereja", display_name_en: "Cherry", display_name_es: "Cereza" },
  passion_fruit: { kcal: 97, prot: 2.2, carbs: 23.4, fat: 0.7, fiber: 10.4, portion: 100, contains: [], display_name_pt: "Maracujá", display_name_en: "Passion fruit", display_name_es: "Maracuyá" },
```

**3. Após linha 196 (LATICÍNIOS), adicione:**
```typescript
  butter: { kcal: 717, prot: 0.9, carbs: 0.1, fat: 81.1, fiber: 0, portion: 10, contains: ["lactose"], display_name_pt: "Manteiga", display_name_en: "Butter", display_name_es: "Mantequilla" },
  parmesan_cheese: { kcal: 392, prot: 35.8, carbs: 3.2, fat: 25.6, fiber: 0, portion: 20, contains: ["lactose"], display_name_pt: "Queijo parmesão", display_name_en: "Parmesan cheese", display_name_es: "Queso parmesano" },
  cheddar_cheese: { kcal: 403, prot: 24.9, carbs: 1.3, fat: 33.1, fiber: 0, portion: 30, contains: ["lactose"], display_name_pt: "Queijo cheddar", display_name_en: "Cheddar cheese", display_name_es: "Queso cheddar" },
```

**4. Após linha 210 (BEBIDAS), adicione:**
```typescript
  apple_juice: { kcal: 46, prot: 0.1, carbs: 11.3, fat: 0.1, fiber: 0.2, portion: 200, unit: 'ml', contains: [], display_name_pt: "Suco de maçã natural", display_name_en: "Fresh apple juice", display_name_es: "Jugo de manzana" },
  grape_juice: { kcal: 61, prot: 0.6, carbs: 15.2, fat: 0.1, fiber: 0.3, portion: 200, unit: 'ml', contains: [], display_name_pt: "Suco de uva natural", display_name_en: "Fresh grape juice", display_name_es: "Jugo de uva" },
  tomato_juice: { kcal: 17, prot: 0.8, carbs: 3.9, fat: 0.1, fiber: 0.5, portion: 200, unit: 'ml', contains: [], display_name_pt: "Suco de tomate", display_name_en: "Tomato juice", display_name_es: "Jugo de tomate" },
  ginger_tea: { kcal: 2, prot: 0, carbs: 0.4, fat: 0, fiber: 0, portion: 200, unit: 'ml', contains: [], display_name_pt: "Chá de gengibre", display_name_en: "Ginger tea", display_name_es: "Té de jengibre" },
  peppermint_tea: { kcal: 1, prot: 0, carbs: 0.2, fat: 0, fiber: 0, portion: 200, unit: 'ml', contains: [], display_name_pt: "Chá de hortelã", display_name_en: "Peppermint tea", display_name_es: "Té de menta" },
```

**5. Após linha 218 (GORDURAS), adicione:**
```typescript
  almonds: { kcal: 579, prot: 21.2, carbs: 21.7, fat: 49.9, fiber: 12.5, portion: 20, contains: [], display_name_pt: "Amêndoas", display_name_en: "Almonds", display_name_es: "Almendras" },
  olives: { kcal: 115, prot: 0.8, carbs: 6.3, fat: 10.7, fiber: 3.2, portion: 30, contains: [], display_name_pt: "Azeitonas", display_name_en: "Olives", display_name_es: "Aceitunas" },
```

**6. Após linha 223 (SEMENTES E OUTROS), adicione:**
```typescript
  sunflower_seeds: { kcal: 584, prot: 20.8, carbs: 20, fat: 51.5, fiber: 8.6, portion: 20, contains: [], display_name_pt: "Sementes de girassol", display_name_en: "Sunflower seeds", display_name_es: "Semillas de girasol" },
  pumpkin_seeds: { kcal: 559, prot: 30.2, carbs: 14.7, fat: 49, fiber: 6, portion: 20, contains: [], display_name_pt: "Sementes de abóbora", display_name_en: "Pumpkin seeds", display_name_es: "Semillas de calabaza" },
```

### **OPÇÃO 2: Verificar Sincronização**

Execute o script de contagem:
```bash
node scripts/count-ingredients.cjs
```

Deve mostrar **170 ingredientes** quando completo.

---

## ✅ RESULTADO FINAL ESPERADO

- **Banco:** 180 ingredientes (170 base + 10 alternativos)
- **Código:** 170 ingredientes base
- **Sincronização:** 100% completa
- **Gerador de refeições:** Pode usar todos os 170 ingredientes
- **Pool de refeições:** Pode usar todos os 170 ingredientes

---

## 📝 NOTAS IMPORTANTES

1. **Não remova ingredientes existentes** - apenas adicione os faltantes
2. **Mantenha a formatação** - cada ingrediente em uma linha
3. **Respeite as seções comentadas** - organize por categoria
4. **Teste após adicionar** - rode `npm run build` para verificar erros
5. **Verifique contagem** - rode `node scripts/count-ingredients.cjs`

---

## 🚀 APÓS COMPLETAR

1. ✅ Teste o painel admin (`/admin/ingredient-pool`)
2. ✅ Filtre por categoria para verificar novos ingredientes
3. ✅ Teste geração de refeições
4. ✅ Verifique se macros estão corretos

---

**Data:** 23/01/2026  
**Status:** 🟡 PARCIALMENTE SINCRONIZADO (85% completo)  
**Próximo passo:** Adicionar 24 ingredientes faltantes manualmente
