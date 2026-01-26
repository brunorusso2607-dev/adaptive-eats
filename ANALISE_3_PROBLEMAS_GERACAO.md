# ANÁLISE DOS 3 PROBLEMAS NA GERAÇÃO DE REFEIÇÕES

## 🔴 PROBLEMA 1: LÍQUIDOS EM GRAMAS (DEVEM SER ML)

### Observação
Na imagem: "1 copo de suco de laranja natural (200g)"
- **Esperado:** 200ml
- **Atual:** 200g

### Causa Raiz
O sistema de geração direta usa `portion_grams` para todos os ingredientes, incluindo líquidos.

### Onde Corrigir
1. `meal-ingredients-db.ts` - Adicionar campo `unit` para cada ingrediente
2. `advanced-meal-generator.ts` - Usar unidade correta ao gerar componentes
3. Frontend - Exibir unidade correta (ml para líquidos, g para sólidos)

### Ingredientes Afetados (Líquidos)
- Sucos (laranja, limão, etc.)
- Chás (camomila, verde, preto, etc.)
- Água de coco
- Leite
- Vitaminas/smoothies
- Café

---

## 🔴 PROBLEMA 2: INTOLERÂNCIA A LACTOSE NÃO RESPEITADA + INTEGRAIS

### Observação
Usuário é intolerante a lactose, mas recebe:
- "Ovos mexidos com queijo branco, pão integral e mamão"
- "Filé de tilápia grelhado com arroz integral, feijão preto e salada colorida"
- "Chá de camomila com biscoitos integrais"

**Problemas:**
1. Queijo branco contém lactose (não deveria ser oferecido)
2. TUDO é integral (pão integral, arroz integral, biscoitos integrais)

### Análise: Por que TUDO é integral?

#### Investigação no Código
Vou verificar onde a escolha de integral vs. refinado é feita:

**Hipóteses:**
1. Sistema sempre prioriza integrais por padrão
2. Não há lógica para alternar entre integral e refinado
3. Falta critério de quando usar cada tipo

#### Quando Oferecer Integrais?

**Perfis Adequados para Integrais:**
- ✅ Usuários com objetivo de emagrecimento (maior saciedade)
- ✅ Diabéticos ou pré-diabéticos (menor índice glicêmico)
- ✅ Usuários com constipação intestinal (mais fibras)
- ✅ Estratégia "balanced" ou "healthy"

**Perfis que PODEM Receber Refinados:**
- ✅ Usuários em ganho de massa (mais calorias, menos saciedade)
- ✅ Atletas em alta performance (carboidratos de rápida absorção)
- ✅ Usuários sem restrições específicas (variedade)
- ✅ Estratégia "flexible" ou "performance"

**Regra Ideal:**
- **70% integrais, 30% refinados** para maioria dos usuários
- **100% integrais** apenas para diabéticos ou estratégia muito restritiva
- **Variar** entre refeições (café integral, almoço refinado, jantar integral, etc.)

### Causa Raiz - Lactose
Sistema não está filtrando ingredientes com `contains: ["lactose"]` quando usuário tem intolerância.

### Onde Corrigir
1. `advanced-meal-generator.ts` - Filtrar ingredientes com lactose
2. `meal-ingredients-db.ts` - Garantir que TODOS os laticínios têm `contains: ["lactose"]`
3. Adicionar lógica de variação integral/refinado baseada em perfil

---

## 🔴 PROBLEMA 3: ESTRUTURA/ORDEM DOS INGREDIENTES

### Estrutura Ideal
```
1. Proteína principal
2. Carboidratos
3. Leguminosas
4. Vegetais / saladas
5. Bebidas
6. Sobremesa / extras
```

### Estrutura Atual (Exemplo)
```
- 3 ovos mexidos com tomate picado (180g) — 652 kcal
- 1 copo de suco de laranja natural (200g) — 56 kcal
- 2 fatias de pão integral (70g) — 183 kcal
```

**Problemas:**
- Ordem aleatória
- Bebida no meio
- Não agrupa por categoria

### Onde Corrigir
1. `advanced-meal-generator.ts` - Função `sortComponents()` já existe mas não está sendo usada corretamente
2. Garantir que ordem seja sempre: proteína → carbs → leguminosas → vegetais → bebidas → sobremesa

---

## 📊 RESUMO DAS CORREÇÕES NECESSÁRIAS

### 1. Líquidos em ML
- [ ] Adicionar campo `unit: 'ml' | 'g'` em `Ingredient`
- [ ] Marcar todos os líquidos com `unit: 'ml'`
- [ ] Atualizar geração direta para usar unidade correta
- [ ] Atualizar frontend para exibir unidade correta

### 2. Lactose + Integrais
- [ ] Filtrar ingredientes com lactose quando usuário é intolerante
- [ ] Adicionar lógica de variação integral/refinado (70/30)
- [ ] Basear escolha no objetivo do usuário (emagrecimento = mais integral, ganho = mais refinado)
- [ ] Garantir variedade entre refeições

### 3. Ordem dos Ingredientes
- [ ] Implementar ordenação consistente: proteína → carbs → leguminosas → vegetais → bebidas → sobremesa
- [ ] Aplicar tanto no pool quanto na geração direta
- [ ] Garantir que frontend exibe na ordem correta

---

## 🎯 PRIORIDADE DE IMPLEMENTAÇÃO

1. **CRÍTICO:** Lactose (problema de saúde)
2. **ALTO:** Líquidos em ml (UX/clareza)
3. **MÉDIO:** Ordem dos ingredientes (organização)
4. **MÉDIO:** Lógica de integrais (variedade/adequação)
