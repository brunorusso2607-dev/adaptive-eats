# 🧪 TESTES DE VALIDAÇÃO - CAFÉ DA MANHÃ

## 📋 OBJETIVO
Validar que as 4 correções implementadas estão funcionando corretamente para cafés da manhã.

---

## ✅ CORREÇÕES IMPLEMENTADAS

### **CORREÇÃO 1: Travas de Gramatura Específicas**
- Manteiga/Margarina: 5-10g (máximo)
- Pasta de Amendoim: 10-20g (máximo)
- Azeite: 5-10g (máximo)
- Queijo: 20-30g (máximo)
- Aveia: 30-40g (máximo)
- Granola: 25-30g (máximo)

### **CORREÇÃO 2: Validação de Macros Mínimos**
- Se contém OVO/FRANGO/CARNE: Proteína MÍNIMA 10g
- Se contém PÃO/TAPIOCA/AVEIA: Carboidrato MÍNIMO 20g
- Calorias: 150-500 kcal

### **CORREÇÃO 3: Regra de Pratos Compostos**
- Pão de Queijo NÃO deve ter queijo separado
- Vitamina: OU prato único OU leite + fruta separados
- Panqueca: OU prato único OU ingredientes separados

### **CORREÇÃO 4: Validação TypeScript**
- Auto-fix: Porções absurdas
- Rejeição: Macros impossíveis, ingredientes omitidos

---

## 🧪 PLANO DE TESTES

### **TESTE 1: Gerar 10 Cafés da Manhã para BR**

**Ação:** No Admin Meal Pool, gere 10 cafés da manhã para Brasil

**Validações:**

#### **1.1 Gramatura de Gorduras**
- [ ] NENHUMA refeição deve ter manteiga > 10g
- [ ] NENHUMA refeição deve ter pasta de amendoim > 20g
- [ ] NENHUMA refeição deve ter azeite > 10g

#### **1.2 Gramatura de Queijos**
- [ ] NENHUMA refeição deve ter queijo > 30g (exceto se for main_dish)
- [ ] Pão de Queijo NÃO deve ter queijo como componente separado

#### **1.3 Gramatura de Carboidratos**
- [ ] NENHUMA refeição deve ter aveia > 40g
- [ ] NENHUMA refeição deve ter granola > 30g

#### **1.4 Macros Mínimos**
- [ ] Refeições com ovo/frango DEVEM ter proteína ≥ 10g
- [ ] Refeições com pão/tapioca/aveia DEVEM ter carboidrato ≥ 20g
- [ ] TODAS as refeições DEVEM ter 150-500 kcal

#### **1.5 Pratos Compostos**
- [ ] Pão de Queijo: Queijo NÃO aparece separado
- [ ] Vitamina: OU prato único OU leite + fruta (não ambos)
- [ ] Panqueca: OU prato único OU ingredientes separados (não ambos)

#### **1.6 Ingredientes Omitidos**
- [ ] Se nome tem "Banana", banana DEVE estar nos componentes
- [ ] Se nome tem "Alface", alface DEVE estar nos componentes
- [ ] Se nome tem "Frango", frango DEVE estar nos componentes

---

### **TESTE 2: Verificar Logs de Validação**

**Ação:** Abrir Supabase Dashboard > Functions > populate-meal-pool > Logs

**Procurar por:**

```
[MEAL-POOL] Validation complete
[MEAL-POOL] Meal auto-fixed
[MEAL-POOL] Meal rejected
```

**Validações:**

- [ ] Log mostra total de refeições validadas
- [ ] Log mostra refeições rejeitadas (se houver)
- [ ] Log mostra warnings de auto-fix (ex: "Manteiga reduzida de 100g para 10g")

---

### **TESTE 3: Casos Específicos de Erro Anterior**

**Ação:** Verificar se os erros identificados anteriormente foram corrigidos

#### **3.1 Pão Francês com Manteiga**
- [ ] Manteiga DEVE estar entre 5-10g (não 100g)
- [ ] Pão DEVE estar em 50g (1 unidade, não 2)

#### **3.2 Pão com Pasta de Amendoim**
- [ ] Pasta DEVE estar entre 10-20g (não 100g)

#### **3.3 Omelete com Queijo**
- [ ] Azeite DEVE estar entre 5-10g (não 100g)
- [ ] Queijo DEVE estar entre 20-30g (não 100g)

#### **3.4 Crepioca de Frango**
- [ ] Proteína DEVE ser ≥ 10g (não 2g)
- [ ] Carboidrato DEVE ser ≥ 20g (não 2g)

#### **3.5 Sanduíche Natural de Frango**
- [ ] Proteína DEVE ser ≥ 10g (não 0g)

#### **3.6 Panqueca de Banana com Mel**
- [ ] Banana DEVE estar nos componentes (não omitida)

#### **3.7 Vitamina de Frutas**
- [ ] Leite DEVE estar nos componentes (não omitido)

---

## 📊 CRITÉRIOS DE SUCESSO

### **✅ TESTE PASSOU SE:**
- 0 refeições com manteiga/azeite > 10g
- 0 refeições com queijo > 30g (café da manhã)
- 0 refeições com aveia > 40g
- 0 refeições com proteína < 10g (quando tem ovo/frango)
- 0 refeições com carboidrato < 20g (quando tem pão/aveia)
- 0 refeições com ingredientes omitidos
- 0 refeições com Pão de Queijo + queijo separado

### **⚠️ TESTE PARCIAL SE:**
- 1-2 refeições com erros leves (ex: queijo 35g em vez de 30g)
- Logs mostram auto-fix funcionando

### **❌ TESTE FALHOU SE:**
- 3+ refeições com erros graves (manteiga 100g, proteína 0g)
- Nenhum auto-fix nos logs
- Refeições rejeitadas não aparecem nos logs

---

## 📝 TEMPLATE DE REPORTE

```markdown
## Resultado do Teste

**Data:** [DATA]
**Refeições geradas:** [NÚMERO]
**Refeições rejeitadas:** [NÚMERO]

### Erros Encontrados:
1. [Descrever erro]
2. [Descrever erro]

### Auto-fixes Aplicados:
1. [Descrever auto-fix]
2. [Descrever auto-fix]

### Status: ✅ PASSOU / ⚠️ PARCIAL / ❌ FALHOU
```

---

## 🚀 PRÓXIMOS PASSOS

**Se teste PASSOU:**
- ✅ Sistema está robusto para café da manhã
- ✅ Pode testar com almoço/jantar

**Se teste PARCIAL:**
- ⚠️ Ajustar limites específicos que falharam
- ⚠️ Testar novamente

**Se teste FALHOU:**
- ❌ Revisar prompt e validação TypeScript
- ❌ Adicionar travas mais rígidas
