# 📋 MELHORIAS PENDENTES DO PROMPT CHEF IA

## 🎯 **O QUE JÁ FOI IMPLEMENTADO ✅**

### **Core Funcionalidades:**
- ✅ Detecção de remoção de intolerâncias
- ✅ Marcadores `[PERGUNTAR_REMOCAO]` e `[CONFIRMAR_REMOCAO]`
- ✅ Validação de peso_meta corrigida (< ao invés de <=)
- ✅ Mudança de objetivo primeiro, validação depois
- ✅ Estado persistente entre mensagens (tabela pendências)

---

## 🚀 **MELHORIAS PENDENTES (NÃO IMPLEMENTADAS)**

### **1. Detecção Avançada de Intenções**

**O que falta:**
- Detectar mudanças implícitas sem usuário dizer explicitamente
- Ex: "Pesei 75kg hoje" → Detectar mudança de peso automaticamente
- Ex: "Comecei a malhar 5x por semana" → Detectar mudança de atividade

**Implementação:**
```typescript
// Adicionar ao prompt:
"Quando o usuário mencionar peso atual sem pedir para atualizar,
verifique se é diferente do perfil. Se for diferente, ofereça atualização.

Exemplos:
Usuário: 'Pesei 75kg hoje' → Perfil tem 70kg
→ 'Notei que você mencionou pesar 75kg, mas seu perfil está com 70kg. Quer atualizar?'

Usuário: 'Comecei a correr todo dia' → Perfil tem 'sedentary'
→ 'Ótimo! Notei que você mencionou correr todo dia, mas seu perfil está 'Sedentário'. Quer atualizar para 'Ativo'?'"
```

---

### **2. Detecção de Meta Atingida**

**O que falta:**
- Detectar automaticamente quando usuário atinge peso_meta
- Parabenizar e sugerir próximos passos
- Oferecer opções: manter peso, definir nova meta, etc.

**Implementação:**
```typescript
// Adicionar ao prompt:
"Quando o usuário mencionar peso que é igual ou muito próximo da meta,
celebre e ofereça próximos passos.

Exemplos:
Usuário: 'Pesei 70kg hoje' → Meta era 70kg
→ '🎉 Parabéns! Você atingiu sua meta de 70kg! 
O que gostaria de fazer agora?
[PERGUNTAR_ATUALIZACAO:objetivo:manter] Manter este peso
[PERGUNTAR_ATUALIZACAO:objetivo:ganhar] Definir nova meta para ganhar peso
[PERGUNTAR_ATUALIZACAO:objetivo:perder] Definir nova meta para perder peso'"
```

---

### **3. Sugestões Inteligentes de Peso Meta**

**O que falta:**
- Calcular peso_meta ideal baseado em IMC
- Considerar altura, idade, sexo, atividade
- Dar sugestões personalizadas em vez de genéricas

**Implementação:**
```typescript
// Adicionar ao prompt:
"Ao sugerir peso_meta, use cálculos inteligentes:

Para perder peso: 
- IMC ideal: 18.5-24.9
- Peso saudável: 18.5 × altura² até 24.9 × altura²
- Sugira peso no meio da faixa saudável

Para ganhar peso:
- IMC até 24.9 (máximo saudável)
- Sugira gradual: +2kg a +8kg do peso atual

Exemplo:
Usuário: Altura 1.70m, quer perder peso
→ 'Para sua altura de 1.70m, o peso saudável é entre 53kg e 72kg.
Sugiro meta de 62kg (meio da faixa). Quer definir [PERGUNTAR_ATUALIZACAO:peso_meta:62]?'"
```

---

### **4. Contexto de Saúde e Bem-Estar**

**O que falta:**
- Detectar menções a sintomas, energia, disposição
- Oferecer sugestões baseadas em perfil atual
- Alertar sobre possíveis deficiências

**Implementação:**
```typescript
// Adicionar ao prompt:
"Esteja atento a menções de saúde e bem-estar:

Sintomas que podem indicar deficiências:
- 'Cansaço', 'sem energia' → Possível deficiência de ferro/B12
- 'Dores musculares' → Possível deficiência de magnésio
- 'Cabelo caindo' → Possível deficiência de zinco/biotina
- 'Dificuldade dormir' → Possível deficiência de magnésio

Responda com sugestões:
'Notei que você mencionou [sintoma]. Isso pode estar relacionado a [nutriente].
Alimentos ricos em [nutriente]: [lista 3-5 alimentos].
Quer que eu adicione estes alimentos ao seu plano?'
```

---

### **5. Detecção de Mudanças de Dieta**

**O que falta:**
- Detectar quando usuário menciona mudanças alimentares
- "Virei vegano", "Estou fazendo low carb", etc.
- Oferecer atualização automática do perfil

**Implementação:**
```typescript
// Adicionar ao prompt:
"Detecte mudanças de estilo alimentar:

Palavras-chave:
- 'vegano', 'vegetariano', 'plant-based' → Dieta: vegetarian/vegan
- 'low carb', 'sem carboidrato', 'cetogênico' → Dieta: low-carb
- 'sem glúten', 'gluten free' → Restrição: gluten
- 'sem lactose', 'lactose free' → Restrição: lactose

Exemplos:
Usuário: 'Virei vegano semana passada'
→ 'Ótimo! Notei que você mencionou ser vegano. Quer atualizar sua dieta?
[PERGUNTAR_ATUALIZACAO:dieta:vegan]'
```

---

### **6. Validações de Saúde Proativas**

**O que falta:**
- Alertar sobre metas muito extremas
- Validar combinações perigosas
- Sugerir consulta profissional quando necessário

**Implementação:**
```typescript
// Adicionar ao prompt:
"Valide metas e combinações por saúde:

Alertas:
- Meta < 18.5 IMC: '⚠️ Esta meta pode ser perigosa. Considere consultar um profissional.'
- Perder > 1kg/semana: '⚠️ Perder muito rápido pode ser prejudicial. Recomendo até 1kg/semana.'
- Ganhar peso + restrições severas: '⚠️ Ganhar peso com muitas restrições pode ser difícil. Considere revisar.'

Combinações perigosas:
- Objetivo 'perder peso' + dieta 'vegan' sem planejamento
- Objetivo 'ganhar peso' + muitas restrições
- Atividade 'very_active' + ingestão muito baixa
```

---

### **7. Personalização Baseada em Contexto**

**O que falta:**
- Lembrar preferências do usuário
- Adaptar linguagem e exemplos
- Considerar histórico de conversas

**Implementação:**
```typescript
// Adicionar ao prompt:
"Personalize respostas baseado no perfil:

Adapte exemplos:
- Se usuário é atleta: Use exemplos relacionados a performance
- Se usuário é sedentário: Use exemplos de iniciantes
- Se usuário tem muitas restrições: Foque no que PODE comer

Linguagem:
- Se jovem: Use linguagem mais informal
- Se adulto: Use linguagem mais profissional
- Se idoso: Use linguagem mais respeitosa

Histórico:
- Se mencionou mesmo tópico antes: 'Como conversamos antes...'
- Se atingiu meta antes: 'Lembrando que você já atingiu X antes...'"
```

---

### **8. Detecção de Emoção e Motivação**

**O que falta:**
- Detectar frustração, desânimo, celebração
- Adaptar tom e oferecer suporte emocional
- Celebrar conquistas e manter motivação

**Implementação:**
```typescript
// Adicionar ao prompt:
"Detecte emoções e motive:

Frustração:
- 'Não consigo', 'estou difícil', 'não funciona'
→ 'Entendo sua frustração! Vamos rever juntos. O que está mais difícil?'

Desânimo:
- 'Pensei em desistir', 'não está valendo'
→ 'Não desista! Todo progresso é válido. Que tal ajustarmos algo?'

Celebração:
- 'Consegui!', 'finalmente', 'cheguei lá'
→ '🎉 Parabéns! Seu esforço valeu a pena! Como se sente?'

Motivação:
- 'Estou animado', 'vai dar certo'
→ 'Adoro sua energia! Vamos juntos nessa jornada!'"
```

---

### **9. Integração com Plano Alimentar**

**O que falta:**
- Sugerir ajustes no plano atual baseado em mudanças
- Oferecer substitutos compatíveis
- Ajustar calorias/macros para novos objetivos

**Implementação:**
```typescript
// Adicionar ao prompt:
"Integre com plano alimentar atual:

Ao mudar perfil:
- 'Seu plano atual tem X calorias. Com novo objetivo, sugiro Y calorias.'
- 'Receitas atuais podem precisar ajuste. Quer que eu sugira substitutos?'

Ao adicionar restrição:
- 'Notei que seu plano atual tem [alimento]. Quer que eu substitua por [alternativa]?'

Ao mudar objetivo:
- 'Seu plano atual é para [objetivo antigo]. Quer que eu gere novo plano para [novo objetivo]?'
```

---

### **10. Validações de Consistência**

**O que falta:**
- Detectar contradições no perfil
- Validar combinações lógicas
- Sugerir ajustes para consistência

**Implementação:**
```typescript
// Adicionar ao prompt:
"Valide consistência do perfil:

Inconsistências:
- Altura 1.90m + Peso 50kg: '⚠️ IMC muito baixo. Considere ganhar peso.'
- Idade 65 anos + Atividade very_active: '⚠️ Reduza intensidade ou consulte médico.'
- Objetivo lose_weight + Peso meta < peso atual - 20kg: '⚠️ Meta muito agressiva. Considere metas menores.'

Combinações estranhas:
- Dieta vegan + Objetivo gain_weight: 'Desafiador! Precisará de planejamento cuidadoso.'
- Muitas restrições + Baixa ingestão: '⚠️ Risco de deficiências. Considere suplementação.'"
```

---

## 📊 **PRIORIDADE DE IMPLEMENTAÇÃO**

### **Alta Prioridade (Core Experience):**
1. **Detecção de Meta Atingida** - Melhora significativa UX
2. **Sugestões Inteligentes de Peso Meta** - Mais útil que genéricas
3. **Detecção de Mudanças de Dieta** - Comum e importante

### **Média Prioridade (Enhancement):**
4. **Detecção Avançada de Intenções** - Conveniência
5. **Contexto de Saúde e Bem-Estar** - Valor agregado
6. **Validações de Saúde Proativas** - Segurança

### **Baixa Prioridade (Nice-to-have):**
7. **Personalização Baseada em Contexto** - Sutil mas bom
8. **Detecção de Emoção e Motivação** - Experiência premium
9. **Integração com Plano Alimentar** - Complexo mas poderoso
10. **Validações de Consistência** - Prevenção de problemas

---

## 🎯 **PRÓXIMOS PASSOS SUGERIDOS**

1. **Implementar Top 3** (Meta Atingida, Sugestões Inteligentes, Mudanças de Dieta)
2. **Testar com usuários reais**
3. **Coletar feedback**
4. **Implementar restante baseado no feedback**

---

**Qual melhoria você quer que eu implemente primeiro?**
