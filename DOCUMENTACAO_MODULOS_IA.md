# 🤖 DOCUMENTAÇÃO COMPLETA - MÓDULOS DE IA DO SISTEMA

**Data:** 13/01/2026  
**Modelo:** Gemini 2.5 Flash Lite (todos os módulos)  
**Localização dos Prompts:** `supabase/functions/get-hardcoded-prompts/index.ts`

---

## 📋 **OS 7 MÓDULOS DE IA**

### **1. analyze-food-photo** 📸
**Edge Function:** `supabase/functions/analyze-food-photo/index.ts`

**Função:**
- Analisa fotos de alimentos
- Identifica ingredientes visíveis e ocultos
- Calcula macronutrientes (calorias, proteína, carboidratos, gordura)
- Valida segurança contra intolerâncias do usuário
- Detecta se é comida vs produto embalado vs rótulo

**Features Especiais:**
- Detecção de ingredientes ocultos por padrões culinários
- Classificação de imagem (food, partial_food, not_food, packaged_product, label)
- Safety validation ANTES de estimativa nutricional
- Suporte multi-regional (TACO, USDA, BAM, TBCA)

**Variáveis Dinâmicas:**
```typescript
{{userLocale}}          // pt-BR, en-US, es-ES
{{userCountry}}         // BR, US, ES, etc.
{{userIntolerances}}    // Array de intolerâncias
{{excludedIngredients}} // Ingredientes excluídos manualmente
{{dietaryPreference}}   // comum, vegetariana, vegana, etc.
{{dailyCalorieGoal}}    // Meta calórica diária
{{nutritionalSource}}   // TACO, USDA, etc.
```

**Output JSON:**
```json
{
  "type": "food",
  "meal_name": "Frango grelhado com arroz e salada",
  "items": [...],
  "is_safe": true,
  "safety_score": 5,
  "intolerance_alerts": [],
  "total_calories": 650
}
```

---

### **2. analyze-label-photo** 🏷️
**Edge Function:** `supabase/functions/analyze-label-photo/index.ts`

**Função:**
- Analisa rótulos de produtos alimentícios
- Extrai lista de ingredientes
- Detecta alérgenos e intolerâncias
- Identifica certificações (Zero Lactose, Gluten Free, etc.)

**Features Especiais:**
- Suporte multi-regional (ANVISA, FDA, EU, Japan)
- Detecção expandida de sinônimos de alérgenos
- Regra pessimista: ingrediente incompleto = UNSAFE
- Detecção de contaminação cruzada ("Pode conter...")

**Banco de Sinônimos:**
- **Lactose:** milk, cream, butter, cheese, whey, casein, lactalbumin, etc.
- **Glúten:** wheat, barley, rye, malt, seitan, triticale, etc.
- **Ovos:** egg, albumin, globulin, lysozyme, mayonnaise, etc.
- **Soja:** soy, soybean, TVP, miso, tempeh, tofu, etc.

**Output JSON:**
```json
{
  "type": "label",
  "product_name": "Chocolate ao Leite",
  "ingredients": ["leite", "cacau", "açúcar"],
  "is_safe": false,
  "verdict": "UNSAFE",
  "alerts": [
    {
      "type": "direct",
      "ingredient": "leite",
      "intolerance": "lactose",
      "severity": "high"
    }
  ]
}
```

---

### **3. analyze-fridge-photo** 🧊
**Edge Function:** `supabase/functions/analyze-fridge-photo/index.ts`

**Função:**
- Identifica ingredientes disponíveis na geladeira/despensa
- Classifica por categoria (proteína, dairy, vegetable, fruit, etc.)
- Avalia frescor (fresh, good, use_soon, questionable)
- Sugere receitas seguras baseadas nos ingredientes

**Output JSON:**
```json
{
  "ingredients_detected": [
    {
      "name": "Frango",
      "category": "protein",
      "quantity": "full",
      "freshness": "fresh",
      "is_safe": true
    }
  ],
  "recipe_suggestions": [
    {
      "name": "Frango xadrez",
      "uses_ingredients": ["frango", "pimentão"],
      "missing_ingredients": ["molho de soja"],
      "complexity": "medium",
      "is_safe": true
    }
  ],
  "shopping_suggestions": ["molho de soja"],
  "warnings": ["Use o tomate em breve"]
}
```

---

### **4. generate-recipe** 👨‍🍳
**Edge Function:** `supabase/functions/generate-recipe/index.ts`

**Função:**
- Gera receitas personalizadas com ingredientes fornecidos
- Respeita TODAS as restrições alimentares
- Fornece instruções passo a passo
- Calcula informações nutricionais precisas

**Regras de Segurança:**
- NUNCA incluir ingredientes restritos
- NUNCA sugerir substituições que contenham restrições
- Validar CADA ingrediente antes de incluir

**Output JSON:**
```json
{
  "recipe_name": "Frango Grelhado com Legumes",
  "servings": 2,
  "prep_time_minutes": 15,
  "cook_time_minutes": 20,
  "difficulty": "easy",
  "ingredients": [
    {
      "name": "Peito de frango",
      "quantity": 300,
      "unit": "g"
    }
  ],
  "instructions": [
    "Tempere o frango com sal e limão",
    "Grelhe por 8 minutos de cada lado"
  ],
  "nutrition_per_serving": {
    "calories": 325,
    "protein": 42,
    "carbs": 15,
    "fat": 10
  },
  "is_safe": true
}
```

---

### **5. regenerate-meal** 🔄
**Edge Function:** `supabase/functions/regenerate-meal/index.ts`

**Função:**
- Gera alternativas para refeições do plano alimentar
- Mantém mesmo slot de refeição (café, almoço, jantar, etc.)
- Respeita restrições e target calórico
- Cria opções DIFERENTES da original

**Output JSON:**
```json
{
  "title": "Omelete de Claras com Espinafre",
  "foods": [
    {
      "name": "Omelete de claras",
      "grams": 180
    },
    {
      "name": "Pão integral",
      "grams": 50
    }
  ],
  "calories_kcal": 320,
  "protein_g": 28,
  "carbs_g": 35,
  "fat_g": 8,
  "is_safe": true
}
```

---

### **6. chat-assistant** 💬 (Chef IA)
**Edge Function:** `supabase/functions/chat-assistant/index.ts`

**Função:**
- Assistente de chat conversacional sobre alimentação
- Responde dúvidas sobre receitas, nutrição, substituições
- Acessa contexto completo do usuário (perfil, plano, métricas)
- Detecta contradições no perfil e oferece atualização

**Personalidade:**
- Amigável e encorajador
- Baseado em evidências mas acessível
- Culturalmente consciente
- Respeita escolhas dietéticas

**Contexto Disponível:**
- Perfil completo (idade, peso, altura, sexo, atividade)
- Intolerâncias e restrições
- Plano alimentar ativo
- Métricas do dia (água, calorias, macros)
- Gamificação (XP, level, streak)
- Sintomas recentes
- Página atual do app

**Capacidades Especiais:**
- Detecta contradições (ex: usuário diz "quero emagrecer" mas perfil está em "ganhar peso")
- Oferece atualizar perfil via chat
- Calcula riscos de saúde baseado em IMC
- Análise inteligente de imagens enviadas no chat

**Regras de Brevidade:**
- Perguntas simples: 1-2 frases
- Perguntas complexas: Máximo 3-4 frases
- NUNCA repetir saudação após primeira mensagem
- Linguagem natural (não robótica)

---

### **7. generate-ai-meal-plan** 📅
**Edge Function:** `supabase/functions/generate-ai-meal-plan/index.ts`

**Função:**
- Gera planos alimentares completos personalizados
- Cria refeições para cada horário do dia
- Respeita limites calóricos por tipo de refeição
- Garante variedade de proteínas ao longo do dia

**Regras Culinárias Críticas:**

**1. Coerência Culinária:**
- Sopa = prato único (NÃO adicionar arroz separado)
- Pratos de uma panela = completos
- Grelhados podem ter salada crua

**2. Variedade de Proteína:**
- Almoço: frango → Jantar: peixe OU carne
- Café: ovos → Almoço: proteína diferente
- Ceia: SEM proteína pesada

**3. Ordem do Array Foods (OBRIGATÓRIA):**
```
1ª POSIÇÃO: Prato principal/Proteína
2ª POSIÇÃO: Acompanhamentos (arroz, feijão, salada)
3ª POSIÇÃO: Condimentos (azeite)
4ª POSIÇÃO: Fruta/Sobremesa
5ª POSIÇÃO (ÚLTIMA): Bebida (SEMPRE última!)
```

**4. Bebidas Obrigatórias:**
- Almoço/Jantar: SEMPRE incluir bebida ZERO como último item
- NUNCA usar suco como fonte de calorias

**5. Limites Calóricos por Refeição:**
- Café da manhã: 300-450 kcal (máx 500)
- Lanche manhã: 80-200 kcal (máx 250)
- Almoço: 450-700 kcal
- Lanche tarde: 80-200 kcal (máx 250)
- Jantar: 400-650 kcal
- Ceia: 50-180 kcal (máx 200)

**6. Lanches Apetitosos:**
- ❌ PROIBIDO: Apenas vegetais crus sem proteína/gordura
- ✅ CORRETO: Fruta/Vegetal + Proteína OU Gordura saudável

**7. Pratos Únicos vs Compostos:**
- **Prato único:** Consolidar em 1 item (sopas, omeletes, saladas completas)
- **Refeição composta:** Listar separado (proteína + arroz + feijão + salada)

**Output JSON:**
```json
{
  "day": 1,
  "day_name": "Segunda-feira",
  "meals": [
    {
      "meal_type": "breakfast",
      "title": "Omelete de Claras com Espinafre",
      "foods": [
        {"name": "Omelete de claras com espinafre", "grams": 180},
        {"name": "Pão integral", "grams": 50},
        {"name": "Café com leite desnatado", "grams": 200}
      ],
      "calories_kcal": 320,
      "instructions": [
        "Bata 4 claras com sal e pimenta",
        "Adicione espinafre picado",
        "Cozinhe em frigideira antiaderente"
      ]
    }
  ],
  "total_calories": 2000
}
```

---

## 🔧 **CONFIGURAÇÃO TÉCNICA**

### **Variáveis de Ambiente Necessárias:**

```bash
# .env ou Supabase Edge Function Secrets
LOVABLE_API_KEY=your_lovable_api_key_here
VITE_SUPABASE_URL=https://onzdkpqtzfxzcdyxczkn.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### **Modelo Usado:**
- **Nome:** `google/gemini-2.5-flash-lite`
- **Via:** Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`)
- **Max Tokens:** 2000 (chat-assistant), variável (outros módulos)
- **Temperature:** 0.7 (chat), 0.3-0.5 (análises)

### **Logs de Uso:**
Todos os módulos registram uso na tabela `ai_usage_logs`:
```sql
- user_id
- function_name
- model_used
- prompt_tokens
- completion_tokens
- total_tokens
- execution_time_ms
- metadata (JSON)
```

---

## 🐛 **TROUBLESHOOTING - CHEF IA**

### **Erro: "Desculpe, ocorreu um erro. Tente novamente."**

**Causas Possíveis:**

#### **1. LOVABLE_API_KEY não configurada**
```bash
# Verificar no Supabase Dashboard:
# Settings → Edge Functions → Secrets
# Deve ter: LOVABLE_API_KEY

# Ou via CLI:
supabase secrets list
```

**Solução:**
```bash
supabase secrets set LOVABLE_API_KEY=your_key_here
```

#### **2. Rate Limit (429 Too Many Requests)**
- Muitas requisições em pouco tempo
- Aguardar 1-2 minutos
- Verificar logs: `supabase functions logs chat-assistant`

#### **3. Erro na API do Gemini**
- Status 500, 503: Gemini temporariamente indisponível
- Status 400: Payload inválido (imagem muito grande, etc.)

#### **4. Timeout**
- Prompt muito longo
- Imagem muito grande (>4MB)
- Reduzir histórico de mensagens

### **Como Debugar:**

**1. Ver logs em tempo real:**
```bash
supabase functions logs chat-assistant --tail
```

**2. Testar diretamente:**
```bash
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/chat-assistant \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Oi",
    "isFirstMessage": true
  }'
```

**3. Verificar no código:**
```typescript
// supabase/functions/chat-assistant/index.ts
// Linha 2369-2372: Verifica LOVABLE_API_KEY
// Linha 2390-2405: Trata erros da API
// Linha 2408: Mensagem de fallback
```

**4. Verificar contexto do usuário:**
- Perfil completo carregado? (linha 2209-2223)
- Safety database carregado? (linha 2228)
- Meal plan context? (linha 2250-2263)
- Dashboard context? (linha 2266-2274)

---

## 📊 **ESTATÍSTICAS DE USO**

Para ver estatísticas de uso dos módulos:

```sql
-- Total de chamadas por módulo
SELECT 
  function_name,
  COUNT(*) as total_calls,
  AVG(execution_time_ms) as avg_time_ms,
  SUM(total_tokens) as total_tokens
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY function_name
ORDER BY total_calls DESC;

-- Usuários mais ativos
SELECT 
  user_id,
  COUNT(*) as calls,
  SUM(total_tokens) as tokens
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY calls DESC
LIMIT 10;
```

---

## 🔐 **SEGURANÇA**

### **Validação de Ingredientes:**
Todos os módulos usam o **Global Safety Engine** (`_shared/globalSafetyEngine.ts`):

```typescript
import { validateIngredient } from "../_shared/globalSafetyEngine.ts";

const result = await validateIngredient(
  "queijo",
  userRestrictions,
  safetyDatabase
);

if (!result.is_safe) {
  // Alertar usuário
}
```

### **Cascata de Validação:**
1. Banco de dados (`intolerance_mappings`)
2. Decomposição (`food_decomposition_mappings`)
3. Fallback crítico (hardcoded no código)
4. IA (último recurso)

---

## 📚 **RECURSOS ADICIONAIS**

- **Prompts completos:** `supabase/functions/get-hardcoded-prompts/index.ts`
- **Safety Engine:** `supabase/functions/_shared/globalSafetyEngine.ts`
- **Logs de IA:** Tabela `ai_usage_logs`
- **Documentação Gemini:** https://ai.google.dev/gemini-api/docs

---

## ✅ **CHECKLIST DE FUNCIONAMENTO**

Para garantir que todos os módulos estão funcionando:

- [ ] LOVABLE_API_KEY configurada
- [ ] Safety database populado (intolerance_mappings, food_decomposition_mappings)
- [ ] Onboarding options completo (24+ opções)
- [ ] Intolerance key normalization (22 registros)
- [ ] Edge functions deployadas
- [ ] Usuário com perfil completo (intolerâncias, dieta, peso, altura)
- [ ] Logs de AI usage sendo registrados

---

**Última atualização:** 13/01/2026  
**Versão dos Prompts:** v7.0 (meal plan), v1.0 (outros módulos)
