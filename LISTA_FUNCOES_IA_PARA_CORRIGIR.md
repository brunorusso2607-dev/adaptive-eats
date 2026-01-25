# 🔍 FUNÇÕES DE IA QUE PRECISAM DE CORREÇÃO

## 📋 **FUNÇÕES QUE USAM IA (22 TOTAL)**

### **✅ JÁ CORRIGIDAS (3)**
1. ✅ `generate-ai-meal-plan` - Adicionado verify_jwt = false
2. ✅ `populate-meal-pool` - Já tinha verify_jwt = false
3. ✅ `import-usda-bulk` - Já tinha verify_jwt = false

### **❌ PRECISAM DE CORREÇÃO (19)**

#### **Geração de Refeições/Receitas:**
4. ❌ `generate-recipe` - Gera receitas com IA
5. ❌ `regenerate-meal` - Regenera refeições
6. ❌ `regenerate-ai-meal-alternatives` - Regenera alternativas
7. ❌ `suggest-meal-alternatives` - Sugere alternativas de refeição
8. ❌ `suggest-smart-substitutes` - Sugere substituições inteligentes

#### **Análise de Imagens:**
9. ❌ `analyze-food-photo` - Analisa foto de comida
10. ❌ `analyze-fridge-photo` - Analisa foto de geladeira
11. ❌ `analyze-label-photo` - Analisa rótulos
12. ❌ `analyze-symptom-patterns` - Analisa padrões de sintomas

#### **Validação e Decomposição:**
13. ❌ `validate-ingredients` - Valida ingredientes
14. ❌ `validate-food-ai` - Valida alimentos com IA
15. ❌ `decompose-food-for-safety` - Decompõe alimentos
16. ❌ `review-blocked-ingredients` - Revisa ingredientes bloqueados

#### **Tradução e Expansão:**
17. ❌ `translate-intolerance-mappings` - Traduz mapeamentos
18. ❌ `translate-food-decomposition` - Traduz decomposição
19. ❌ `expand-all-intolerances` - Expande intolerâncias

#### **Geração de Conteúdo:**
20. ❌ `generate-description` - Gera descrições
21. ❌ `generate-emoji` - Gera emojis
22. ❌ `chat-assistant` - Assistente de chat

#### **Testes:**
23. ❌ `test-prompt-validation` - Testa validação de prompts
24. ❌ `test-all-prompts-validation` - Testa todos os prompts

---

## 🎯 **AÇÃO NECESSÁRIA**

Adicionar no `supabase/config.toml`:

```toml
[functions.generate-recipe]
verify_jwt = false

[functions.regenerate-meal]
verify_jwt = false

[functions.regenerate-ai-meal-alternatives]
verify_jwt = false

[functions.suggest-meal-alternatives]
verify_jwt = false

[functions.suggest-smart-substitutes]
verify_jwt = false

[functions.analyze-food-photo]
verify_jwt = false

[functions.analyze-fridge-photo]
verify_jwt = false

[functions.analyze-label-photo]
verify_jwt = false

[functions.analyze-symptom-patterns]
verify_jwt = false

[functions.validate-ingredients]
verify_jwt = false

[functions.validate-food-ai]
verify_jwt = false

[functions.decompose-food-for-safety]
verify_jwt = false

[functions.review-blocked-ingredients]
verify_jwt = false

[functions.translate-intolerance-mappings]
verify_jwt = false

[functions.translate-food-decomposition]
verify_jwt = false

[functions.expand-all-intolerances]
verify_jwt = false

[functions.generate-description]
verify_jwt = false

[functions.generate-emoji]
verify_jwt = false

[functions.chat-assistant]
verify_jwt = false

[functions.test-prompt-validation]
verify_jwt = false

[functions.test-all-prompts-validation]
verify_jwt = false
```
