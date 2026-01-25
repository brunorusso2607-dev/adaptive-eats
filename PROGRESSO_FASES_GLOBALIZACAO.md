# 🌍 PROGRESSO - IMPLEMENTAÇÃO DAS 4 FASES DE GLOBALIZAÇÃO

**Data de Início:** 18/01/2026  
**Status Geral:** 🟡 EM ANDAMENTO

---

## ✅ FASE 1: REFATORAÇÃO DE INGREDIENTES (5-7 dias)

### **1.1 Criar Estrutura de Ingredientes Universais com i18n** ✅ COMPLETO

**Arquivo:** `universal-ingredients-db.ts`

**Implementado:**
- ✅ Interface `UniversalIngredient` com suporte a múltiplos idiomas
- ✅ 30+ ingredientes universais (existem em todos os países)
- ✅ Suporte para 6 idiomas: PT-BR, EN-US, ES-ES, FR-FR, DE-DE, IT-IT
- ✅ Macros TACO/TBCA validados
- ✅ Alérgenos dinâmicos (integração com Safety Engine preparada)
- ✅ Helper functions: `getIngredientName()`, `getIngredientsByCountry()`, `getIngredientMacros()`

**Ingredientes Universais Adicionados:**
- Proteínas: chicken_breast, chicken_thigh, shredded_chicken, sirloin_steak, ground_beef, filet_mignon, tilapia, salmon, scrambled_eggs, boiled_egg
- Carboidratos: white_rice, brown_rice, sweet_potato
- Vegetais: broccoli, lettuce, tomato
- Frutas: banana, apple
- Laticínios: plain_yogurt, skim_milk
- Bebidas: black_coffee, green_tea
- Gorduras: olive_oil

---

### **1.2 Criar Tabela de Ingredientes Específicos por País** ✅ COMPLETO

**Arquivo:** `country-specific-ingredients.ts`

**Implementado:**
- ✅ Interface `CountrySpecificIngredient` com sistema de substituição
- ✅ Ingredientes específicos do Brasil (6 ingredientes)
- ✅ Ingredientes específicos dos EUA (3 ingredientes)
- ✅ Sistema de mapeamento de substitutos por país
- ✅ Helper functions: `getCountrySpecificIngredient()`, `getSubstituteIngredient()`, `isIngredientAvailableInCountry()`

**Ingredientes Específicos do Brasil:**
1. **requeijao** → Substitutos: cream_cheese (US), fromage_frais (FR), queso_crema (ES)
2. **farofa** → Substitutos: breadcrumbs (US), chapelure (FR), pan_rallado (ES)
3. **acai** → Substitutos: blueberry (US), myrtille (FR), arandano (ES)
4. **pao_queijo** → Substitutos: cheese_bread (US), gougere (FR), pan_queso (ES)
5. **cuscuz_nordestino** → Substitutos: polenta (todos os países)
6. **mandioca** → Substitutos: potato (US/GB), papa (ES/MX/AR), yuca (PE)

**Ingredientes Específicos dos EUA:**
1. **cream_cheese** → Substitutos: requeijao (BR), fromage_frais (FR)
2. **bagel** → Substitutos: pao_frances (BR), panecillo (ES), petit_pain (FR)
3. **pancakes** → Substitutos: panqueca (BR), crepe (FR), hotcake (MX)

---

### **1.3 Implementar Sistema de i18n** ✅ COMPLETO

**Arquivo:** `i18n-service.ts`

**Implementado:**
- ✅ Classe `I18nService` completa
- ✅ Detecção de idioma por IP (geolocalização)
- ✅ Detecção de idioma por Accept-Language header
- ✅ Mapeamento automático: País → Locale → Idioma
- ✅ Tradução de ingredientes universais
- ✅ Tradução de ingredientes específicos
- ✅ Sistema de substituição automática de ingredientes
- ✅ Traduções de interface (UI) para 6 idiomas
- ✅ Helper function: `createI18nService()` para criar instância a partir de Request

**Funcionalidades:**
```typescript
const i18n = await createI18nService(req);

// Traduzir ingrediente
const name = i18n.getIngredientName("chicken_breast");
// BR: "Peito de frango grelhado"
// US: "Grilled chicken breast"
// ES: "Pechuga de pollo a la plancha"

// Substituir ingrediente para outro país
const substitute = i18n.getIngredientForCountry("requeijao", "US");
// Retorna: "cream_cheese"

// Traduzir lista de ingredientes
const translated = i18n.translateIngredientList(["requeijao", "farofa"], "US");
// Retorna: ["cream_cheese", "breadcrumbs"]

// Traduzir interface
const label = i18n.t("meal.breakfast");
// BR: "Café da Manhã"
// US: "Breakfast"
// ES: "Desayuno"
```

---

### **1.4 Integrar Alérgenos Dinamicamente do Safety Engine** 🟡 EM ANDAMENTO

**Próximos Passos:**
1. Criar função `getIngredientsWithDynamicAllergens()`
2. Integrar com `loadSafetyDatabase()` do `globalSafetyEngine.ts`
3. Atualizar alérgenos em tempo real
4. Testar integração completa

---

## 🟡 FASE 2: SISTEMA i18n NO FRONTEND (3-4 dias)

### **2.1 Criar Hook useI18n para React** ⏳ PENDENTE

**Arquivo a criar:** `src/hooks/useI18n.tsx`

**Tarefas:**
- [ ] Criar contexto de i18n
- [ ] Criar provider de i18n
- [ ] Criar hook useI18n
- [ ] Detectar idioma do navegador
- [ ] Permitir seleção manual de idioma
- [ ] Persistir preferência no localStorage

---

### **2.2 Atualizar Componentes para Usar i18n** ⏳ PENDENTE

**Componentes a atualizar:**
- [ ] `AdminMealPool.tsx` - Exibir ingredientes traduzidos
- [ ] `MealCard.tsx` - Exibir nomes de refeições traduzidos
- [ ] `IngredientList.tsx` - Exibir lista de ingredientes traduzidos
- [ ] `Dashboard.tsx` - Traduzir interface

---

### **2.3 Criar Seletor de Idioma** ⏳ PENDENTE

**Componente a criar:** `LanguageSelector.tsx`

**Tarefas:**
- [ ] Dropdown com bandeiras de países
- [ ] Salvar preferência no localStorage
- [ ] Atualizar contexto global
- [ ] Recarregar dados traduzidos

---

## ⏳ FASE 3: POOL MULTI-PAÍS (4-5 dias)

### **3.1 Criar Pools Específicos por País** ⏳ PENDENTE

**Arquivos a criar:**
- [ ] `meal-pool-br.ts` - Refeições brasileiras
- [ ] `meal-pool-us.ts` - Refeições americanas
- [ ] `meal-pool-es.ts` - Refeições espanholas
- [ ] `meal-pool-fr.ts` - Refeições francesas
- [ ] `meal-pool-de.ts` - Refeições alemãs
- [ ] `meal-pool-it.ts` - Refeições italianas

**Estrutura:**
```typescript
export const BR_MEAL_POOL = {
  cafe_manha: [
    {
      id: "pao_queijo_cafe",
      ingredients: ["pao_queijo", "black_coffee"],
      i18n: {
        "pt-BR": { name: "Pão de queijo com café" },
        "en-US": { name: "Brazilian cheese bread with coffee" }
      }
    }
  ]
}
```

---

### **3.2 Implementar Sistema de Substituição Automática** ⏳ PENDENTE

**Arquivo a criar:** `ingredient-substitution-service.ts`

**Tarefas:**
- [ ] Função `substituteIngredientsForCountry()`
- [ ] Validar macros após substituição
- [ ] Manter densidade da refeição
- [ ] Avisar usuário sobre substituições

---

### **3.3 Validação Cultural por País** ⏳ PENDENTE

**Tarefas:**
- [ ] Validar combinações culturalmente apropriadas
- [ ] Bloquear combinações estranhas (ex: requeijão com sushi)
- [ ] Respeitar horários de refeições por país
- [ ] Validar porções adequadas por cultura

---

## ⏳ FASE 4: TESTES E DOCUMENTAÇÃO (2-3 dias)

### **4.1 Testes por País e Idioma** ⏳ PENDENTE

**Testes a criar:**
- [ ] Teste: Gerar 10 refeições BR (português)
- [ ] Teste: Gerar 10 refeições US (inglês)
- [ ] Teste: Gerar 10 refeições ES (espanhol)
- [ ] Teste: Gerar 10 refeições FR (francês)
- [ ] Teste: Validar traduções corretas
- [ ] Teste: Validar substituições corretas

---

### **4.2 Testes de Substituição** ⏳ PENDENTE

**Cenários a testar:**
- [ ] Usuário BR vê refeição com requeijão
- [ ] Usuário US vê mesma refeição com cream cheese
- [ ] Usuário ES vê mesma refeição com queso crema
- [ ] Macros permanecem similares (±10%)

---

### **4.3 Testes de Safety Engine** ⏳ PENDENTE

**Cenários a testar:**
- [ ] Adicionar novo alérgeno no banco
- [ ] Verificar se ingredientes atualizam automaticamente
- [ ] Validar integração completa
- [ ] Testar com múltiplas intolerâncias

---

### **4.4 Documentação** ⏳ PENDENTE

**Documentos a criar:**
- [ ] `GUIA_I18N.md` - Como usar o sistema de i18n
- [ ] `GUIA_ADICIONAR_PAIS.md` - Como adicionar novo país
- [ ] `GUIA_ADICIONAR_INGREDIENTE.md` - Como adicionar novo ingrediente
- [ ] `API_I18N.md` - Documentação da API de i18n

---

## 📊 PROGRESSO GERAL

### **Resumo por Fase:**

| Fase | Status | Progresso | Tempo Estimado |
|------|--------|-----------|----------------|
| **FASE 1** | 🟡 Em Andamento | 75% (3/4 tarefas) | 5-7 dias |
| **FASE 2** | ⏳ Pendente | 0% (0/3 tarefas) | 3-4 dias |
| **FASE 3** | ⏳ Pendente | 0% (0/3 tarefas) | 4-5 dias |
| **FASE 4** | ⏳ Pendente | 0% (0/4 tarefas) | 2-3 dias |
| **TOTAL** | 🟡 19% | 3/14 tarefas | 14-19 dias |

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

1. ✅ **Concluir Fase 1.4** - Integrar alérgenos dinamicamente do Safety Engine
2. ⏳ **Iniciar Fase 2.1** - Criar hook useI18n para React
3. ⏳ **Migrar ingredientes existentes** - Converter `meal-ingredients-db.ts` para nova estrutura
4. ⏳ **Atualizar populate-meal-pool** - Usar novos ingredientes universais
5. ⏳ **Testar sistema completo** - Gerar refeições em múltiplos idiomas

---

## 📝 NOTAS IMPORTANTES

### **Decisões de Arquitetura:**

1. **Ingredientes Universais vs Específicos:**
   - Universal: Existe em todos os países (ex: frango, arroz)
   - Específico: Existe apenas em alguns países (ex: requeijão, bagel)

2. **Sistema de Substituição:**
   - Automático: Sistema escolhe melhor substituto
   - Transparente: Usuário é informado sobre substituições
   - Macro-preserving: Mantém macros similares (±10%)

3. **Detecção de Idioma:**
   - Prioridade 1: IP do usuário (geolocalização)
   - Prioridade 2: Accept-Language header
   - Prioridade 3: Seleção manual
   - Fallback: Inglês (en-US)

4. **Integração com Safety Engine:**
   - Alérgenos são dinâmicos (buscados do banco)
   - Atualização automática quando banco muda
   - Cache de 2 minutos (TTL do Safety Engine)

---

## ⚠️ RISCOS E MITIGAÇÕES

### **Risco 1: Traduções Incorretas**
- **Mitigação:** Revisão por nativos de cada idioma
- **Status:** ⏳ Pendente

### **Risco 2: Substitutos Inadequados**
- **Mitigação:** Validação de macros e testes culturais
- **Status:** ⏳ Pendente

### **Risco 3: Performance**
- **Mitigação:** Cache de traduções, lazy loading
- **Status:** ⏳ Pendente

---

**Última Atualização:** 18/01/2026 - 21:00 BRT
