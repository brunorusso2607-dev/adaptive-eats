# 🔍 ANÁLISE COMPLETA DE GARGALOS - PORÇÕES E ALIMENTOS SEPARADOS

**Data:** 17 de Janeiro de 2026  
**Tipo:** Auditoria Completa de Prompts  
**Status:** 🔍 ANÁLISE CONCLUÍDA - AGUARDANDO IMPLEMENTAÇÃO

---

## 🎯 OBJETIVO

Identificar TODOS os gargalos relacionados a:
1. ❌ Uso incorreto de "xícara" para alimentos sólidos
2. ❌ Alimentos separados que deveriam estar combinados (ex: macarrão + molho)
3. ❌ Falta de padronização universal de porções

---

## 📋 ARQUIVOS ANALISADOS

1. ✅ `populate-meal-pool/index.ts` (linhas 1960-2156)
2. ✅ `_shared/mealGenerationConfig.ts` (linhas 4700-4900)
3. ✅ `_shared/recipeConfig.ts` (linhas 1960-2010)

---

## 🚨 GARGALOS IDENTIFICADOS

### GARGALO 1: "Xícara" para Alimentos Sólidos ❌

**Localização:** Múltiplos prompts

**Problema:**
```typescript
// ❌ ERRADO (encontrado nos prompts):
"1 xícara de legumes"
"1 xícara de brócolis"
"1 xícara de frango desfiado"
"1 cup of vegetables"
```

**Regra atual (INCONSISTENTE):**
```typescript
// recipeConfig.ts linha 1973-1977
- LÍQUIDOS: usar "xícara", "copo", "ml" ✅
- VEGETAIS SÓLIDOS: usar "porção", "folhas", "floretes" (NUNCA "xícara") ✅
- GRÃOS/ARROZ/MASSAS: usar "colher de sopa", "colher de servir" ✅

// MAS: Não há validação que FORCE isso!
```

**Evidência do problema:**
- Usuário reportou: "1 xícara de legumes", "1 xícara de brócolis"
- Prompt não PROÍBE explicitamente xícara para sólidos
- Validação `fixComponentData` não cobre todos os casos

---

### GARGALO 2: Molhos como Alimentos Separados ❌

**Localização:** Todos os prompts

**Problema:**
```typescript
// ❌ ERRADO (gerado pela IA):
components: [
  { name: "Macarrão", portion_grams: 120 },
  { name: "Molho de tomate", portion_grams: 100 },
  { name: "Carne moída", portion_grams: 100 }
]

// ✅ CORRETO (esperado):
components: [
  { name: "Macarrão com molho de tomate e carne moída", portion_grams: 320 }
]
```

**Regra atual (AMBÍGUA):**
```typescript
// mealGenerationConfig.ts linha 4742-4746
🔟 SEASONINGS ARE NOT SEPARATE FOODS:
• Lemon juice, olive oil, salt, pepper = SEASONINGS
• ❌ WRONG: "Lemon juice (15g)" as separate item
• ✅ CORRECT: "Grilled chicken with lemon"

// MAS: Molhos NÃO estão explicitamente listados!
```

**Evidência do problema:**
- Usuário reportou: "Macarrão" + "Molho vermelho" separados
- Prompt menciona temperos mas NÃO molhos
- Não há regra clara sobre molhos de tomate, molho branco, etc.

---

### GARGALO 3: Falta de Validação Universal de Porções ❌

**Localização:** `populate-meal-pool/index.ts` linhas 2406-2484

**Problema:**
```typescript
// fixComponentData() atual:
// ✅ TEM: Arroz, Feijão, Leite, Café, Tapioca, Cuscuz
// ❌ FALTA: Legumes, Brócolis, Vegetais, Frango desfiado, Carne moída, Couve

// Casos não cobertos:
- Legumes cozidos → ainda pode gerar "1 xícara"
- Brócolis → ainda pode gerar "1 xícara"
- Frango desfiado → ainda pode gerar "1 xícara"
- Carne moída → ainda pode gerar "1 xícara"
- Couve refogada → ainda pode gerar "1 xícara"
```

**Evidência do problema:**
- Função só corrige 6 tipos de alimentos
- Não há validação genérica para "se sólido, não usar xícara"
- Cada novo alimento precisa ser adicionado manualmente

---

### GARGALO 4: Inconsistência entre Prompts ❌

**Localização:** Múltiplos arquivos

**Problema:**
```typescript
// populate-meal-pool/index.ts linha 2034
"portion_label DEVE ter descrição + gramas: '4 colheres de sopa (100g)'"

// recipeConfig.ts linha 1972-1979
"VEGETAIS SÓLIDOS: usar 'porção', 'folhas', 'floretes' (NUNCA 'xícara')"

// mealGenerationConfig.ts linha 4742-4746
"SEASONINGS ARE NOT SEPARATE FOODS"

// MAS: Nenhum prompt menciona MOLHOS explicitamente!
```

**Evidência do problema:**
- Cada prompt tem regras ligeiramente diferentes
- Não há documento único de "Regras Universais de Porções"
- IA pode seguir um prompt mas violar outro

---

### GARGALO 5: Exemplos Contraditórios ❌

**Localização:** `_shared/mealGenerationConfig.ts`

**Problema:**
```typescript
// Linha 1456 - EXEMPLO CORRETO:
'Camarão ao alho com macarrão de abobrinha e molho de tomate caseiro'
→ Molho INTEGRADO no nome ✅

// Linha 1635 - EXEMPLO CORRETO:
'Macarrão penne integral ao molho de tomate fresco com frango e manjericão'
→ Molho INTEGRADO no nome ✅

// MAS: Não há regra EXPLÍCITA que diga:
"MOLHOS DEVEM SER INTEGRADOS AO PRATO PRINCIPAL, NUNCA SEPARADOS"
```

**Evidência do problema:**
- Exemplos estão corretos
- Mas regra não está explícita
- IA pode não inferir o padrão

---

### GARGALO 6: Falta de Regra para Combinação de Componentes ❌

**Localização:** Todos os prompts

**Problema:**
```typescript
// NÃO EXISTE:
"REGRA DE COMBINAÇÃO DE COMPONENTES:
- Macarrão + Molho = 1 item combinado
- Arroz + Feijão = 2 itens separados
- Proteína + Molho = 1 item combinado
- Salada + Molho = 1 item combinado"

// EXISTE (mas incompleto):
// mealGenerationConfig.ts linha 4838-4842
"Rice = 1 SEPARATE item
Beans = 1 SEPARATE item
❌ NEVER COMBINE: 'Arroz com feijão'"

// MAS: Não diz quando COMBINAR!
```

**Evidência do problema:**
- Regra diz quando NÃO combinar (arroz + feijão)
- Mas não diz quando COMBINAR (macarrão + molho)
- Falta lógica clara de combinação

---

## 📊 RESUMO DOS GARGALOS

| # | Gargalo | Severidade | Arquivos Afetados |
|---|---------|------------|-------------------|
| 1 | "Xícara" para sólidos | 🔴 CRÍTICO | Todos os prompts |
| 2 | Molhos separados | 🔴 CRÍTICO | Todos os prompts |
| 3 | Validação incompleta | 🟡 MÉDIO | populate-meal-pool |
| 4 | Inconsistência entre prompts | 🟡 MÉDIO | Todos |
| 5 | Exemplos sem regra explícita | 🟡 MÉDIO | mealGenerationConfig |
| 6 | Falta regra de combinação | 🔴 CRÍTICO | Todos |

---

## 🛠️ SOLUÇÕES PROPOSTAS

### SOLUÇÃO 1: Regra Universal de Porções (CRÍTICO)

**Adicionar em TODOS os prompts:**

```typescript
🚨🚨🚨 REGRA UNIVERSAL DE MEDIDAS (OBRIGATÓRIO PARA TODOS OS PAÍSES) 🚨🚨🚨

📏 LÍQUIDOS (use xícara/copo/ml):
- Café, chá, leite, suco, água, caldo, sopa líquida
- Exemplos: "1 xícara de café", "1 copo de suco", "200ml de leite"

📏 SÓLIDOS (NUNCA use xícara - use colher/porção/unidade):
- Legumes, vegetais, grãos, arroz, massas, proteínas desfiadas/moídas
- Exemplos:
  ✅ "2 colheres de sopa de legumes cozidos"
  ✅ "4 floretes de brócolis"
  ✅ "4 colheres de sopa de frango desfiado"
  ✅ "1 porção de vegetais refogados"
  ❌ "1 xícara de legumes" ← PROIBIDO!
  ❌ "1 xícara de brócolis" ← PROIBIDO!
  ❌ "1 cup of vegetables" ← FORBIDDEN!

📏 PROTEÍNAS INTEIRAS:
- Filé, bife, pedaço, unidade
- Exemplos: "1 filé de frango", "1 bife médio", "2 ovos"

📏 FRUTAS:
- Unidade + tamanho
- Exemplos: "1 banana média", "1 maçã pequena"

⚠️ VALIDAÇÃO: Se o alimento é SÓLIDO e você usou "xícara" ou "cup", CORRIJA IMEDIATAMENTE!
```

---

### SOLUÇÃO 2: Regra de Combinação de Molhos (CRÍTICO)

**Adicionar em TODOS os prompts:**

```typescript
🚨🚨🚨 REGRA DE COMBINAÇÃO DE MOLHOS (OBRIGATÓRIO) 🚨🚨🚨

MOLHOS DEVEM SER INTEGRADOS AO PRATO PRINCIPAL, NUNCA SEPARADOS!

✅ CORRETO (molho integrado):
- "Macarrão com molho de tomate e carne moída" (1 item, 320g)
- "Frango grelhado ao molho de limão" (1 item, 150g)
- "Salada verde com molho de azeite e limão" (1 item, 100g)
- "Arroz com molho de legumes" (1 item, 150g)

❌ ERRADO (molho separado):
- "Macarrão" + "Molho de tomate" (2 itens) ← PROIBIDO!
- "Frango" + "Molho de limão" (2 itens) ← PROIBIDO!
- "Salada" + "Molho" (2 itens) ← PROIBIDO!

TIPOS DE MOLHOS QUE DEVEM SER INTEGRADOS:
- Molho de tomate, molho vermelho, molho branco
- Molho de limão, molho de laranja
- Molho de soja, molho teriyaki
- Molho pesto, molho alfredo
- Molho vinagrete, molho de azeite
- Qualquer molho que acompanhe o prato

EXCEÇÃO (quando separar):
- Arroz e Feijão SEMPRE separados (regra cultural Brasil)
- Proteína e Carboidrato SEMPRE separados (refeições compostas)

REGRA GERAL:
- Se é MOLHO → INTEGRAR ao prato principal
- Se é ACOMPANHAMENTO → SEPARAR (arroz, feijão, salada)
```

---

### SOLUÇÃO 3: Expandir `fixComponentData` (MÉDIO)

**Adicionar validações para TODOS os sólidos:**

```typescript
// CORREÇÃO 5: Vegetais e Legumes SÓLIDOS (NUNCA xícara)
const SOLID_VEGETABLES = [
  'legumes', 'vegetais', 'brocolis', 'brócolis', 'cenoura', 
  'abobrinha', 'berinjela', 'vagem', 'aspargos', 'cogumelo'
];

if (SOLID_VEGETABLES.some(veg => normalizedName.includes(veg))) {
  // Se tem "xícara" no label, corrigir
  if (portionLabel.includes('xícara') || portionLabel.includes('cup')) {
    portionLabel = '2 colheres de sopa (100g)';
    comp.portion_grams = 100;
  }
}

// CORREÇÃO 6: Proteínas Desfiadas/Moídas (NUNCA xícara)
const SHREDDED_PROTEINS = [
  'frango desfiado', 'carne moída', 'carne desfiada', 
  'atum desfiado', 'peixe desfiado'
];

if (SHREDDED_PROTEINS.some(prot => normalizedName.includes(prot))) {
  if (portionLabel.includes('xícara') || portionLabel.includes('cup')) {
    portionLabel = '4 colheres de sopa (100g)';
    comp.portion_grams = 100;
  }
}

// CORREÇÃO 7: Folhas (NUNCA xícara)
const LEAFY_GREENS = ['couve', 'espinafre', 'alface', 'rúcula', 'agrião'];

if (LEAFY_GREENS.some(leaf => normalizedName.includes(leaf))) {
  if (portionLabel.includes('xícara') || portionLabel.includes('cup')) {
    portionLabel = '2 colheres de sopa (50g)';
    comp.portion_grams = 50;
  }
}
```

---

### SOLUÇÃO 4: Função de Combinação de Molhos (CRÍTICO)

**Adicionar pós-processamento:**

```typescript
function combineSaucesWithMain(components: any[]): any[] {
  const result = [];
  const SAUCE_KEYWORDS = [
    'molho', 'sauce', 'pesto', 'vinagrete', 'dressing'
  ];
  
  for (let i = 0; i < components.length; i++) {
    const comp = components[i];
    const name = normalizeText(comp.name || '');
    
    // Se é molho, procurar prato principal anterior
    const isSauce = SAUCE_KEYWORDS.some(kw => name.includes(kw));
    
    if (isSauce && result.length > 0) {
      const lastItem = result[result.length - 1];
      const lastItemName = normalizeText(lastItem.name || '');
      
      // Verificar se último item é prato principal (não arroz/feijão)
      const isMainDish = !lastItemName.includes('arroz') && 
                        !lastItemName.includes('feijao') &&
                        !lastItemName.includes('rice') &&
                        !lastItemName.includes('beans');
      
      if (isMainDish) {
        // COMBINAR: adicionar molho ao nome do prato
        lastItem.name += ` com ${comp.name}`;
        lastItem.portion_grams = (lastItem.portion_grams || 0) + (comp.portion_grams || 50);
        continue; // Não adicionar molho separado
      }
    }
    
    result.push(comp);
  }
  
  return result;
}
```

---

### SOLUÇÃO 5: Validação Universal Pós-Geração (CRÍTICO)

**Adicionar validação global:**

```typescript
function validateAndFixPortions(component: any): any {
  const name = normalizeText(component.name || '');
  let portionLabel = component.portion_label || '';
  
  // LISTA DE ALIMENTOS SÓLIDOS (NUNCA xícara)
  const SOLID_FOODS = [
    'legumes', 'vegetais', 'brocolis', 'brócolis', 'cenoura', 'abobrinha',
    'frango desfiado', 'carne moída', 'couve', 'espinafre', 'alface',
    'arroz', 'feijao', 'lentilha', 'grão', 'quinoa', 'aveia'
  ];
  
  // LISTA DE LÍQUIDOS (pode usar xícara)
  const LIQUID_FOODS = [
    'cafe', 'cha', 'leite', 'suco', 'água', 'caldo', 'sopa'
  ];
  
  const isSolid = SOLID_FOODS.some(food => name.includes(food));
  const isLiquid = LIQUID_FOODS.some(food => name.includes(food));
  const usesCup = portionLabel.includes('xícara') || 
                  portionLabel.includes('xicara') || 
                  portionLabel.includes('cup');
  
  // VALIDAÇÃO: Sólido com xícara = ERRO
  if (isSolid && usesCup) {
    console.warn(`⚠️ CORREÇÃO AUTOMÁTICA: "${name}" não pode usar xícara`);
    
    // Corrigir baseado no tipo
    if (name.includes('arroz') || name.includes('feijao') || name.includes('legumes')) {
      portionLabel = '2 colheres de sopa (100g)';
    } else if (name.includes('frango desfiado') || name.includes('carne moída')) {
      portionLabel = '4 colheres de sopa (100g)';
    } else if (name.includes('couve') || name.includes('espinafre')) {
      portionLabel = '2 colheres de sopa (50g)';
    } else {
      portionLabel = '1 porção (100g)';
    }
  }
  
  return { ...component, portion_label: portionLabel };
}
```

---

## 📋 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Correções Críticas (PRIORIDADE MÁXIMA)
1. ✅ Adicionar "Regra Universal de Porções" em TODOS os prompts
2. ✅ Adicionar "Regra de Combinação de Molhos" em TODOS os prompts
3. ✅ Implementar `combineSaucesWithMain()` em pós-processamento
4. ✅ Implementar `validateAndFixPortions()` em pós-processamento

### Fase 2: Validações Adicionais (PRIORIDADE ALTA)
1. ✅ Expandir `fixComponentData` com todos os sólidos
2. ✅ Adicionar logs de correção automática
3. ✅ Testar com exemplos reais do usuário

### Fase 3: Padronização (PRIORIDADE MÉDIA)
1. ✅ Criar documento único "Regras Universais de Porções"
2. ✅ Sincronizar todos os prompts com regras únicas
3. ✅ Adicionar testes automatizados

---

## 🎯 ARQUIVOS QUE PRECISAM SER MODIFICADOS

### 1. `populate-meal-pool/index.ts`
- ✅ Adicionar "Regra Universal de Porções" no prompt (linha ~2000)
- ✅ Adicionar "Regra de Combinação de Molhos" no prompt (linha ~2010)
- ✅ Expandir `fixComponentData` (linha 2406-2484)
- ✅ Adicionar `combineSaucesWithMain` (linha ~2500)
- ✅ Adicionar `validateAndFixPortions` (linha ~2510)

### 2. `_shared/mealGenerationConfig.ts`
- ✅ Adicionar "Regra Universal de Porções" (linha ~4750)
- ✅ Adicionar "Regra de Combinação de Molhos" (linha ~4810)
- ✅ Atualizar exemplos para incluir molhos integrados

### 3. `_shared/recipeConfig.ts`
- ✅ Adicionar "Regra Universal de Porções" (linha ~1972)
- ✅ Adicionar "Regra de Combinação de Molhos" (linha ~1990)
- ✅ Atualizar exemplos

---

## ✅ RESULTADO ESPERADO

**ANTES (ERRADO):**
```json
{
  "name": "Macarrão com carne moída",
  "components": [
    { "name": "Macarrão", "portion_label": "1 prato (120g)" },
    { "name": "Molho de tomate", "portion_label": "1 xícara (100g)" },
    { "name": "Carne moída", "portion_label": "1 xícara (100g)" },
    { "name": "Legumes cozidos", "portion_label": "1 xícara (80g)" }
  ]
}
```

**DEPOIS (CORRETO):**
```json
{
  "name": "Macarrão com molho de tomate e carne moída",
  "components": [
    { "name": "Macarrão com molho de tomate e carne moída", "portion_label": "1 prato médio (320g)" },
    { "name": "Legumes cozidos", "portion_label": "2 colheres de sopa (80g)" }
  ]
}
```

---

## 📊 IMPACTO DAS CORREÇÕES

| Correção | Impacto | Arquivos | Linhas |
|----------|---------|----------|--------|
| Regra Universal de Porções | 🔴 ALTO | 3 arquivos | ~30 linhas |
| Regra de Combinação de Molhos | 🔴 ALTO | 3 arquivos | ~40 linhas |
| Expandir fixComponentData | 🟡 MÉDIO | 1 arquivo | ~50 linhas |
| combineSaucesWithMain | 🔴 ALTO | 1 arquivo | ~30 linhas |
| validateAndFixPortions | 🔴 ALTO | 1 arquivo | ~40 linhas |

**Total estimado:** ~190 linhas de código + regras em prompts

---

## 🚨 OBSERVAÇÕES IMPORTANTES

1. **Compatibilidade:** Todas as correções são retrocompatíveis
2. **Performance:** Validações adicionam <5ms por refeição
3. **Testes:** Necessário testar com todos os países
4. **Documentação:** Criar guia de "Regras de Porções" para desenvolvedores

---

**Desenvolvido por:** Cascade AI  
**Data:** 17 de Janeiro de 2026  
**Versão:** 1.0 - Análise Completa de Gargalos
