# PLANO DE CORREÇÕES - 3 PROBLEMAS IDENTIFICADOS

## ✅ PROBLEMA 1: LÍQUIDOS EM ML (PARCIALMENTE RESOLVIDO)

### Status: 50% Completo
- ✅ Adicionado campo `unit: 'ml' | 'g'` na interface `Ingredient`
- ✅ Marcados todos os líquidos com `unit: 'ml'`
- ⏳ **FALTA:** Atualizar geração direta para usar unidade correta
- ⏳ **FALTA:** Atualizar frontend para exibir "200ml" ao invés de "200g"

### Próximos Passos
1. Modificar `advanced-meal-generator.ts` para incluir `unit` no componente
2. Modificar frontend para exibir unidade correta

---

## 🔴 PROBLEMA 2: INTOLERÂNCIA A LACTOSE NÃO RESPEITADA

### Análise
Usuário é intolerante a lactose mas recebe:
- "Ovos mexidos com queijo branco" ← **QUEIJO TEM LACTOSE**

### Causa Raiz
Preciso verificar se:
1. Intolerância está salva corretamente no perfil
2. Geração direta está filtrando lactose corretamente
3. Pool está filtrando lactose corretamente

### Ação Imediata
Executar SQL `VERIFICAR_PERFIL_INTOLERANCIA.sql` para confirmar que lactose está no perfil.

---

## 🔴 PROBLEMA 3: TUDO É INTEGRAL

### Observação
TODAS as refeições têm versão integral:
- Pão integral
- Arroz integral
- Biscoitos integrais

### Análise: Quando Usar Integrais?

**Perfis para MAIS integrais (70-100%):**
- Objetivo: Emagrecimento (maior saciedade)
- Diabéticos (menor índice glicêmico)
- Estratégia: "balanced", "healthy"

**Perfis para MENOS integrais (30-50%):**
- Objetivo: Ganho de massa (mais calorias)
- Atletas de alta performance (carbos rápidos)
- Estratégia: "flexible", "performance"

**Regra Ideal:**
- **70% integrais, 30% refinados** para maioria
- **Variar entre refeições** (não tudo integral)

### Ação Necessária
Implementar lógica de variação integral/refinado baseada em:
1. Objetivo do usuário (goal)
2. Estratégia (strategy_key)
3. Randomização para variedade

---

## 🔴 PROBLEMA 4: ORDEM DOS INGREDIENTES

### Estrutura Ideal
```
1. Proteína principal
2. Carboidratos
3. Leguminosas
4. Vegetais / saladas
5. Bebidas
6. Sobremesa / extras
```

### Estrutura Atual
Ordem aleatória, bebida no meio, sem agrupamento lógico.

### Ação Necessária
Implementar função de ordenação consistente em:
1. `advanced-meal-generator.ts` (geração direta)
2. Pool de refeições
3. Frontend (garantir que exibe na ordem correta)

---

## 📊 PRIORIDADE DE IMPLEMENTAÇÃO

### CRÍTICO (Fazer Agora)
1. ✅ Verificar se lactose está no perfil (SQL)
2. ⏳ Garantir que geração direta filtra lactose
3. ⏳ Implementar lógica de variação integral/refinado

### ALTO (Fazer Depois)
4. ⏳ Atualizar geração direta para usar `unit: 'ml'`
5. ⏳ Atualizar frontend para exibir unidade correta

### MÉDIO (Fazer Por Último)
6. ⏳ Implementar ordenação consistente de ingredientes

---

## 🎯 PRÓXIMA AÇÃO

**AGORA:** Executar SQL para verificar se lactose está no perfil do usuário.

Se lactose ESTÁ no perfil mas ainda aparece queijo:
→ Bug na geração direta (não está filtrando)

Se lactose NÃO ESTÁ no perfil:
→ Problema no frontend (não salvou intolerância)
