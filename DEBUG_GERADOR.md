# DEBUG: GERADOR DE REFEIÇÕES

## 🔍 ANÁLISE DO PROBLEMA

### **Sintomas:**
- Solicitado: 20 almoços
- Gerado: 4 almoços
- Log mostrou: "duplicates": 16 de 18 tentativas

### **Hipóteses:**

#### **Hipótese 1: Loop não está fazendo 10,000 tentativas**
- O gerador deveria fazer `quantity * multiplier` tentativas
- Para almoço: 20 * 500 = 10,000 tentativas
- Mas parece estar gerando apenas ~18 refeições e parando

**Possíveis causas:**
- Timeout sendo atingido (45 segundos)
- Erro silencioso parando o loop
- Condição de parada incorreta

#### **Hipótese 2: Gerador está criando muitas duplicatas**
- Das 18 criadas, 16 eram duplicatas
- Isso sugere baixa variação nas combinações
- Pode ser problema na função `selectRandom`

#### **Hipótese 3: Validações muito rigorosas**
- `validateCulturalRules` pode estar rejeitando muitas
- `hasIntolerance` pode estar rejeitando muitas
- `validateAndFixMeal` pode estar rejeitando muitas

### **Dados dos templates de almoço:**

**Template 1: arroz_feijao_proteina**
- carb: 3 opções (arroz branco, integral, parboilizado)
- legume: 2 opções (feijão, lentilha)
- protein: 16 opções (frangos, carnes, peixes)
- vegetables: 24 opções (2 por refeição)
- fat: 2 opções (azeites)

**Combinações possíveis:**
- 3 * 2 * 16 * C(24,2) * 2 = 3 * 2 * 16 * 276 * 2 = **53,184 combinações**

**Template 2: batata_proteina**
- carb: 6 opções
- protein: 10 opções
- vegetables: 13 opções (2 por refeição)
- fat: 1 opção

**Combinações possíveis:**
- 6 * 10 * C(13,2) * 1 = 6 * 10 * 78 * 1 = **4,680 combinações**

**Template 3: macarrao**
- Preciso verificar

**TOTAL TEÓRICO: ~60,000+ combinações para almoço**

Com 60,000 combinações possíveis e apenas 197 refeições no pool total, deveria ser FÁCIL gerar 20 novas.

---

## 🎯 PLANO DE DEBUG

### **Passo 1: Adicionar logs detalhados**

Adicionar logs para rastrear:
1. Quantas tentativas foram feitas
2. Quantas foram rejeitadas por validação cultural
3. Quantas foram rejeitadas por intolerância
4. Quantas foram rejeitadas por blacklist
5. Quantas foram duplicatas
6. Quantas passaram por todas validações mas falharam em `validateAndFixMeal`

### **Passo 2: Verificar se timeout está sendo atingido**

O timeout é de 45 segundos. Preciso verificar se o loop está parando por timeout.

### **Passo 3: Verificar função selectRandom**

A função `selectRandom` pode estar gerando pouca variação se não estiver realmente aleatória.

### **Passo 4: Verificar se há erro silencioso**

Pode haver um `try-catch` capturando erro e parando o loop silenciosamente.

---

## 💡 SOLUÇÃO PROPOSTA

Vou adicionar contadores detalhados para cada tipo de rejeição:

```typescript
let attempts = 0;
let rejectedCultural = 0;
let rejectedIntolerance = 0;
let rejectedBlacklist = 0;
let rejectedDuplicate = 0;
let rejectedValidation = 0;
let successfulMeals = 0;

// No final:
console.log({
  attempts,
  successfulMeals,
  rejectedCultural,
  rejectedIntolerance,
  rejectedBlacklist,
  rejectedDuplicate,
  rejectedValidation,
  timeElapsed: (Date.now() - startTime) / 1000
});
```

Isso vai revelar exatamente onde as refeições estão sendo rejeitadas.
